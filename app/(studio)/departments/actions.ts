"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { getOrgId } from "@/lib/org";
import { revalidatePath } from "next/cache";
import type { MemberRole, Clearance, OrgRole } from "@prisma/client";

const VALID_ROLES:     MemberRole[] = ["HEAD", "LEAD", "MEMBER", "OBSERVER"];
const VALID_CLEARANCE: Clearance[]  = ["OMEGA", "ALPHA", "BETA", "GAMMA", "DELTA"];
const INVITE_TTL_DAYS = 7;

const EXEC_ORG_ROLES: OrgRole[] = ["PRESIDENT", "VICE_PRESIDENT", "SECRETARY"];

// Ordered from highest (0) to lowest rank
const ORG_ROLE_ORDER: OrgRole[] = [
  "PRESIDENT", "VICE_PRESIDENT", "SECRETARY",
  "HEAD_LOGISTICS", "HEAD_FINANCE", "HEAD_MARKETING", "HEAD_CREATIVES",
  "PROJECT_LEAD", "ASSOCIATE", "VOLUNTEER",
];

function safeRole(v: string | null): MemberRole {
  return VALID_ROLES.includes(v as MemberRole) ? (v as MemberRole) : "MEMBER";
}
function safeClearance(v: string | null): Clearance {
  return VALID_CLEARANCE.includes(v as Clearance) ? (v as Clearance) : "GAMMA";
}
function safeOrgRole(v: string | null | undefined): OrgRole | null {
  if (!v || !ORG_ROLE_ORDER.includes(v as OrgRole)) return null;
  return v as OrgRole;
}

/* ── Auth helpers ────────────────────────────────────────────── */

type Permission = "org-admin" | "dept-admin";

/**
 * Returns the current user's context, or throws if not signed in.
 * "org-admin"  — exec org role OR OMEGA/ALPHA clearance in any dept → can do anything
 * "dept-admin" — HEAD or LEAD of a specific dept → can manage that dept
 */
async function requirePermission(
  permission: Permission,
  departmentId?: string,
): Promise<{ userId: string; orgId: string }> {
  const session = await auth();
  const userId  = session?.user?.id ?? null;
  if (!userId) throw new Error("Not authenticated.");

  const orgId = await getOrgId(userId);
  if (!orgId) throw new Error("You are not a member of any organisation.");

  if (permission === "org-admin") {
    // Check exec org role
    const orgMember = await prisma.orgMember.findUnique({
      where:  { userId },
      select: { orgRole: true },
    });
    if (orgMember && EXEC_ORG_ROLES.includes(orgMember.orgRole)) {
      return { userId, orgId };
    }
    // Check OMEGA/ALPHA clearance in any dept of this org
    const highClearance = await prisma.departmentMember.findFirst({
      where: {
        userId,
        clearance: { in: ["OMEGA", "ALPHA"] },
        department: { orgId },
      },
    });
    if (highClearance) return { userId, orgId };
    throw new Error("You don't have permission to manage departments.");
  }

  if (permission === "dept-admin" && departmentId) {
    // Org admins can always manage any dept
    try { return await requirePermission("org-admin"); } catch { /* fall through */ }

    // HEAD or LEAD of this specific department
    const membership = await prisma.departmentMember.findFirst({
      where: { userId, departmentId, role: { in: ["HEAD", "LEAD"] } },
    });
    if (membership) return { userId, orgId };
    throw new Error("You don't have permission to manage this department.");
  }

  throw new Error("Insufficient permissions.");
}

/* ── Create department ──────────────────────────────────────── */

export async function createDepartment(formData: FormData) {
  try {
    await requirePermission("org-admin");
  } catch (e) {
    return { error: (e as Error).message };
  }

  const session  = await auth();
  const orgId    = await getOrgId(session?.user?.id);
  const name     = (formData.get("name") as string)?.trim();
  const protocol = (formData.get("protocol") as string) ?? "STANDARD";
  const parentId = (formData.get("parentId") as string) || null;

  if (!name) return { error: "Department name is required" };

  await prisma.department.create({
    data: {
      name,
      protocol: protocol === "RESTRICTED" ? "RESTRICTED" : "STANDARD",
      parentId: parentId || null,
      orgId:    orgId ?? undefined,
    },
  });

  revalidatePath("/departments");
}

/* ── Add an existing (signed-in) user directly ──────────────── */

export async function addExistingUser(
  departmentId: string,
  formData: FormData,
): Promise<{ error?: string }> {
  try {
    await requirePermission("dept-admin", departmentId);
  } catch (e) {
    return { error: (e as Error).message };
  }

  const userId    = (formData.get("userId")    as string)?.trim();
  const role      = safeRole(formData.get("role")      as string);
  const clearance = safeClearance(formData.get("clearance") as string);

  if (!userId) return { error: "No user selected" };

  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { id: true, name: true, email: true },
  });
  if (!user) return { error: "User not found" };

  const existing = await prisma.departmentMember.findFirst({
    where: { departmentId, userId },
  });
  if (existing) return { error: "User is already a member" };

  if (role === "HEAD") {
    await prisma.departmentMember.updateMany({
      where: { departmentId, role: "HEAD" },
      data:  { role: "LEAD" },
    });
  }

  await prisma.departmentMember.create({
    data: {
      departmentId,
      userId,
      name:      user.name ?? user.email ?? "Member",
      email:     user.email,
      role,
      clearance,
    },
  });

  revalidatePath("/departments");
  return {};
}

/* ── Create an invite link ──────────────────────────────────── */

export async function createInviteLink(
  departmentId: string,
  formData: FormData,
): Promise<{ token?: string; error?: string }> {
  try {
    await requirePermission("dept-admin", departmentId);
  } catch (e) {
    return { error: (e as Error).message };
  }

  const email     = (formData.get("email") as string)?.trim().toLowerCase();
  const name      = (formData.get("name")  as string)?.trim() || null;
  const role      = safeRole(formData.get("role")      as string);
  const clearance = safeClearance(formData.get("clearance") as string);
  const orgRole   = safeOrgRole(formData.get("orgRole") as string | null);

  if (!email) return { error: "Email is required for an invite link" };

  // Rank enforcement: inviter cannot assign an org role above their own
  if (orgRole) {
    const session = await auth();
    const userId  = session?.user?.id ?? null;
    if (userId) {
      const inviterMember = await prisma.orgMember.findUnique({
        where:  { userId },
        select: { orgRole: true },
      });
      const inviterRole = inviterMember?.orgRole ?? null;
      if (inviterRole) {
        const inviterIdx = ORG_ROLE_ORDER.indexOf(inviterRole);
        const targetIdx  = ORG_ROLE_ORDER.indexOf(orgRole);
        if (targetIdx < inviterIdx) {
          const inviterLabel = inviterRole.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
          return { error: `You can only assign roles at or below your own (${inviterLabel}).` };
        }
      }
    }
  }

  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 864e5);

  if (role === "HEAD") {
    await prisma.departmentMember.updateMany({
      where: { departmentId, role: "HEAD" },
      data:  { role: "LEAD" },
    });
  }

  const invite = await prisma.departmentInvite.create({
    data: { departmentId, email, name, role, clearance, expiresAt, orgRole },
  });

  revalidatePath("/departments");
  return { token: invite.token };
}

/* ── Revoke a pending invite ────────────────────────────────── */

export async function revokeInvite(inviteId: string) {
  const invite = await prisma.departmentInvite.findUnique({
    where:  { id: inviteId },
    select: { departmentId: true },
  });
  if (!invite) return;

  try {
    await requirePermission("dept-admin", invite.departmentId);
  } catch {
    return;
  }

  await prisma.departmentInvite.delete({ where: { id: inviteId } });
  revalidatePath("/departments");
}

/* ── Remove a member ────────────────────────────────────────── */

export async function removeMember(memberId: string) {
  const member = await prisma.departmentMember.findUnique({
    where:  { id: memberId },
    select: { departmentId: true },
  });
  if (!member) return;

  try {
    await requirePermission("dept-admin", member.departmentId);
  } catch {
    return;
  }

  await prisma.departmentMember.delete({ where: { id: memberId } });
  revalidatePath("/departments");
}

/* ── Delete a department ────────────────────────────────────── */

export async function deleteDepartment(departmentId: string) {
  try {
    await requirePermission("org-admin");
  } catch {
    return;
  }

  await prisma.department.delete({ where: { id: departmentId } });
  revalidatePath("/departments");
}
