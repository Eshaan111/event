"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getOrgId } from "@/lib/org";

export async function createOrganization(
  _prevState: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  const session = await auth();
  if (!session?.user?.email) redirect("/register");

  // Resolve the real DB user by email — more reliable than the JWT id which can go stale after re-seeding
  const dbUser = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!dbUser) redirect("/register");
  const userId = dbUser.id;

  // Don't create a second org if user already has one
  const existingOrgId = await getOrgId(userId);
  if (existingOrgId) redirect("/");

  const name = (formData.get("name") as string)?.trim();
  if (!name) return { error: "Organisation name is required." };

  const org = await prisma.organization.create({ data: { name } });

  // Check if user already has an OrgMember (without orgId)
  const existing = await prisma.orgMember.findUnique({ where: { userId } });
  if (existing) {
    await prisma.orgMember.update({
      where: { id: existing.id },
      data:  { orgId: org.id },
    });
  } else {
    await prisma.orgMember.create({
      data: {
        userId,
        name:    dbUser.name ?? dbUser.email ?? "Member",
        email:   dbUser.email,
        orgRole: "PRESIDENT",
        orgId:   org.id,
      },
    });
  }

  redirect("/");
}
