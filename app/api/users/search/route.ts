import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json([], { status: 401 });

  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json([]);

  const users = await prisma.user.findMany({
    where: {
      OR: [
        { name:  { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
      ],
    },
    select: { id: true, name: true, email: true, image: true },
    take: 8,
    orderBy: { name: "asc" },
  });

  return NextResponse.json(users);
}
