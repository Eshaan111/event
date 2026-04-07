import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  const invite = await prisma.departmentInvite.findUnique({
    where:   { token },
    include: { department: { select: { name: true } } },
  });

  if (!invite) {
    return NextResponse.json({ valid: false, reason: "notfound" });
  }

  if (invite.usedAt) {
    return NextResponse.json({ valid: false, reason: "used" });
  }

  if (invite.expiresAt < new Date()) {
    return NextResponse.json({ valid: false, reason: "expired" });
  }

  return NextResponse.json({
    valid:          true,
    departmentName: invite.department.name,
    role:           invite.role,
    clearance:      invite.clearance,
    inviteeName:    invite.name,
    expiresAt:      invite.expiresAt.toISOString(),
  });
}
