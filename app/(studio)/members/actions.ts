"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import type { OrgRole } from "./MembersClient";

export async function addOrgMember(
  formData: FormData,
): Promise<{ error?: string; success?: boolean }> {
  const userId  = (formData.get("userId") as string | null) || null;
  const name    = (formData.get("name") as string)?.trim();
  const email   = (formData.get("email") as string | null)?.trim() || null;
  const orgRole = formData.get("orgRole") as OrgRole;

  if (!name) return { error: "Name is required." };
  if (!orgRole) return { error: "Org role is required." };

  if (userId) {
    const existing = await prisma.orgMember.findUnique({ where: { userId } });
    if (existing) return { error: "This user already has an org role assigned." };
  }

  await prisma.orgMember.create({
    data: { userId, name, email, orgRole },
  });

  revalidatePath("/members");
  return { success: true };
}

export async function removeOrgMember(
  memberId: string,
): Promise<void> {
  await prisma.orgMember.delete({ where: { id: memberId } });
  revalidatePath("/members");
}

export async function updateOrgRole(
  memberId: string,
  orgRole: OrgRole,
): Promise<void> {
  await prisma.orgMember.update({ where: { id: memberId }, data: { orgRole } });
  revalidatePath("/members");
}
