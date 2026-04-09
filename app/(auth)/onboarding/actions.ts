"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getOrgId } from "@/lib/org";

const DEFAULT_DEPARTMENTS: { name: string; protocol: "STANDARD" | "RESTRICTED" }[] = [
  { name: "Marketing",         protocol: "STANDARD"   },
  { name: "Creative Design",   protocol: "STANDARD"   },
  { name: "Finance",           protocol: "STANDARD"   },
  { name: "On-site Execution", protocol: "STANDARD"   },
  { name: "Council",           protocol: "RESTRICTED" },
];

async function resolveUser() {
  const session = await auth();
  if (!session?.user?.email) redirect("/register");
  const dbUser = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!dbUser) redirect("/register");
  return dbUser;
}

export async function createOrganization(
  _prevState: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  const dbUser = await resolveUser();
  const userId = dbUser.id;

  const existingOrgId = await getOrgId(userId);
  if (existingOrgId) redirect("/");

  const name = (formData.get("name") as string)?.trim();
  if (!name) return { error: "Organisation name is required." };

  const org = await prisma.organization.create({ data: { name } });

  await prisma.department.createMany({
    data: DEFAULT_DEPARTMENTS.map((d) => ({ ...d, orgId: org.id })),
  });

  const existing = await prisma.orgMember.findUnique({ where: { userId } });
  if (existing) {
    await prisma.orgMember.update({
      where: { id: existing.id },
      data:  { orgId: org.id, orgRole: "PRESIDENT" },
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

export async function joinOrganization(
  _prevState: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  const dbUser = await resolveUser();
  const userId = dbUser.id;

  const existingOrgId = await getOrgId(userId);
  if (existingOrgId) redirect("/");

  const token = (formData.get("token") as string)?.trim();
  if (!token) return { error: "Organisation token is required." };

  const org = await prisma.organization.findUnique({ where: { joinToken: token } });
  if (!org) return { error: "Invalid organisation token. Please check with your administrator." };

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
        orgRole: "ASSOCIATE",
        orgId:   org.id,
      },
    });
  }

  redirect("/");
}
