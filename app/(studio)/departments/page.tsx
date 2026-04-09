import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { getOrgId } from "@/lib/org";
import DepartmentsClient, { type SerializedDepartment } from "./DepartmentsClient";

export const metadata: Metadata = {
  title: "Departments — Aetheric Studio",
  description: "Manage the structural integrity of your organization through node-based hierarchy.",
};

export default async function DepartmentsPage() {
  const session = await auth();
  const orgId   = await getOrgId(session?.user?.id);

  const all = await prisma.department.findMany({
    where: { orgId: orgId ?? "__none__" },
    include: {
      members: { orderBy: { role: "asc" } },
      invites: {
        where:   { usedAt: null, expiresAt: { gt: new Date() } },
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  // ── Current user context ─────────────────────────────────────
  const currentUserId = session?.user?.id ?? null;

  let editableDeptIds:    string[] | "ALL" = [];
  let currentUserOrgRole: string | null    = null;
  let canCreateDept = false;

  // Org roles that can manage all departments regardless of dept membership
  const EXEC_ORG_ROLES = ["PRESIDENT", "VICE_PRESIDENT", "SECRETARY"];

  if (currentUserId) {
    canCreateDept = true; // any signed-in user can create departments

    const [myMemberships, orgMembership] = await Promise.all([
      // Use already-fetched members to avoid extra query
      Promise.resolve(all.flatMap((d) => d.members).filter((m) => m.userId === currentUserId)),
      prisma.orgMember.findUnique({
        where:  { userId: currentUserId },
        select: { orgRole: true },
      }),
    ]);

    currentUserOrgRole = orgMembership?.orgRole ?? null;

    if (
      (currentUserOrgRole && EXEC_ORG_ROLES.includes(currentUserOrgRole)) ||
      myMemberships.some((m) => m.clearance === "OMEGA" || m.clearance === "ALPHA")
    ) {
      editableDeptIds = "ALL";
    } else {
      const managedRootIds = myMemberships
        .filter((m) => m.role === "HEAD" || m.role === "LEAD")
        .map((m) => m.departmentId);

      function descendants(deptId: string): string[] {
        const children = all.filter((d) => d.parentId === deptId);
        return [deptId, ...children.flatMap((c) => descendants(c.id))];
      }

      const editable = new Set<string>();
      for (const id of managedRootIds) descendants(id).forEach((x) => editable.add(x));
      editableDeptIds = [...editable];
    }
  }

  // ── Serialize ────────────────────────────────────────────────
  type RawDept = (typeof all)[number];

  function serialize(dept: RawDept, allDepts: RawDept[]): SerializedDepartment {
    return {
      id:        dept.id,
      name:      dept.name,
      protocol:  dept.protocol,
      parentId:  dept.parentId,
      createdAt: dept.createdAt.toISOString(),
      members: dept.members.map((m) => ({
        id:        m.id,
        name:      m.name,
        email:     m.email,
        role:      m.role,
        clearance: m.clearance,
        joinedAt:  m.joinedAt.toISOString(),
        userId:    m.userId,
      })),
      invites: dept.invites.map((inv) => ({
        id:        inv.id,
        email:     inv.email,
        name:      inv.name,
        role:      inv.role,
        clearance: inv.clearance,
        expiresAt: inv.expiresAt.toISOString(),
        orgRole:   inv.orgRole ?? null,
      })),
      children: allDepts
        .filter((d) => d.parentId === dept.id)
        .map((child) => serialize(child, allDepts)),
    };
  }

  const rootDepts = all
    .filter((d) => d.parentId === null)
    .map((d) => serialize(d, all));

  return (
    <DepartmentsClient
      rootDepts={rootDepts}
      editableDeptIds={editableDeptIds}
      currentUserOrgRole={currentUserOrgRole}
      canCreateDept={canCreateDept}
    />
  );
}
