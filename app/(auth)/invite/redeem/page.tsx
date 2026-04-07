import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

interface Props {
  searchParams: Promise<{ token?: string }>;
}

export default async function RedeemInvitePage({ searchParams }: Props) {
  const { token } = await searchParams;
  if (!token) redirect("/");

  const session = await auth();
  if (!session?.user?.email) redirect(`/register?callbackUrl=/invite/redeem?token=${token}`);

  const invite = await prisma.departmentInvite.findUnique({
    where:   { token },
    include: { department: { select: { name: true } } },
  });

  if (!invite || invite.usedAt || invite.expiresAt < new Date()) redirect("/departments");

  // Resolve the signed-in user's DB record (created by PrismaAdapter on OAuth sign-in)
  const user = await prisma.user.findUnique({
    where:  { email: session.user.email },
    select: { id: true, name: true, email: true },
  });

  // Guard: user record must exist (it's created automatically on sign-in via the adapter)
  if (!user) redirect("/register");

  // Check not already a member
  const alreadyMember = await prisma.departmentMember.findFirst({
    where: { departmentId: invite.departmentId, userId: user.id },
  });

  if (!alreadyMember) {
    if (invite.role === "HEAD") {
      await prisma.departmentMember.updateMany({
        where: { departmentId: invite.departmentId, role: "HEAD" },
        data:  { role: "LEAD" },
      });
    }

    await prisma.departmentMember.create({
      data: {
        departmentId: invite.departmentId,
        userId:    user.id,
        name:      user.name ?? user.email,
        email:     user.email,
        role:      invite.role,
        clearance: invite.clearance,
      },
    });
  }

  // If the invite carried an org role assignment, create OrgMember (skip if they already have one)
  if (invite.orgRole) {
    const existingOrgMember = await prisma.orgMember.findUnique({ where: { userId: user.id } });
    if (!existingOrgMember) {
      await prisma.orgMember.create({
        data: {
          userId:  user.id,
          name:    user.name ?? user.email,
          email:   user.email,
          orgRole: invite.orgRole,
        },
      });
    }
  }

  await prisma.departmentInvite.update({
    where: { id: invite.id },
    data:  { usedAt: new Date() },
  });

  redirect("/departments");
}
