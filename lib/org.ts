import { prisma } from "@/lib/prisma";

/**
 * Returns the orgId for a signed-in user.
 * Checks OrgMember first, falls back to a DepartmentMember's dept orgId
 * (covers invite-redeemed users who didn't receive an explicit orgRole).
 */
export async function getOrgId(userId: string | null | undefined): Promise<string | null> {
  if (!userId) return null;

  const orgMember = await prisma.orgMember.findUnique({
    where:  { userId },
    select: { orgId: true },
  });
  if (orgMember?.orgId) return orgMember.orgId;

  const deptMember = await prisma.departmentMember.findFirst({
    where:  { userId },
    select: { department: { select: { orgId: true } } },
  });
  return deptMember?.department?.orgId ?? null;
}
