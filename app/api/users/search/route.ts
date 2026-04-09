import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getOrgId } from "@/lib/org";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json([], { status: 401 });

  const q     = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  const orgId = await getOrgId(session.user.id);

  if (q.length < 2) return NextResponse.json([]);

  const users = await prisma.user.findMany({
    where: {
      // Only search within the caller's org
      OR: [
        { orgMembership: { orgId: orgId ?? "__none__" } },
        { memberships:   { some: { department: { orgId: orgId ?? "__none__" } } } },
      ],
      AND: {
        OR: [
          { name:  { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
        ],
      },
    },
    select:  { id: true, name: true, email: true, image: true },
    take:    8,
    orderBy: { name: "asc" },
  });

  return NextResponse.json(users);
}
