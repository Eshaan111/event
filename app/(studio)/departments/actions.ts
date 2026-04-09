"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { getOrgId } from "@/lib/org";
import { revalidatePath } from "next/cache";
import type { MemberRole, Clearance, OrgRole } from "@prisma/client";

const VALID_ROLES:     MemberRole[] = ["HEAD", "LEAD", "MEMBER", "OBSERVER"];
const VALID_CLEARANCE: Clearance[]  = ["OMEGA", "ALPHA", "BETA", "GAMMA", "DELTA"];
const INVITE_TTL_DAYS = 7;

// Ordered from highest (0) to lowest rank — used for rank comparisons
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

/* ── Create department ──────────────────────────────────────── */

export async function createDepartment(formData: FormData) {
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
  const email   = (formData.get("email") as string)?.trim().toLowerCase();
  const name    = (formData.get("name")  as string)?.trim() || null;
  const role      = safeRole(formData.get("role")      as string);
  const clearance = safeClearance(formData.get("clearance") as string);
  const orgRole   = safeOrgRole(formData.get("orgRole") as string | null);

  if (!email) return { error: "Email is required for an invite link" };

  // ── Rank enforcement: inviter cannot assign a role above their own ──
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
  await prisma.departmentInvite.delete({ where: { id: inviteId } });
  revalidatePath("/departments");
}

/* ── Remove a member ────────────────────────────────────────── */

export async function removeMember(memberId: string) {
  await prisma.departmentMember.delete({ where: { id: memberId } });
  revalidatePath("/departments");
}

/* ── Delete a department ────────────────────────────────────── */

export async function deleteDepartment(departmentId: string) {
  await prisma.department.delete({ where: { id: departmentId } });
  revalidatePath("/departments");
}
