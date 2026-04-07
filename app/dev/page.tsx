import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import DevSwitcher from "./DevSwitcher";
import type { SeedUser } from "./DevSwitcher";

export const metadata = { title: "Dev Account Switcher" };

export default async function DevPage() {
  // Hard-block in production — this page must never be accessible outside dev
  if (process.env.NODE_ENV !== "development") {
    redirect("/");
  }

  const session = await auth();

  // Fetch all seed users with their department membership
  const members = await prisma.departmentMember.findMany({
    where: { user: { email: { endsWith: "@aetheric.seed" } } },
    include: {
      user:       { select: { id: true, name: true, email: true } },
      department: { select: { name: true } },
    },
    orderBy: [
      { department: { name: "asc" } },
      // HEAD first, then LEAD, MEMBER, OBSERVER
      { role: "asc" },
    ],
  });

  // Group by department, preserving HEAD→LEAD→MEMBER→OBSERVER order
  const ROLE_ORDER = ["HEAD", "LEAD", "MEMBER", "OBSERVER"];
  const deptMap = new Map<string, SeedUser[]>();

  for (const m of members) {
    if (!m.user) continue;
    const dept = m.department.name;
    if (!deptMap.has(dept)) deptMap.set(dept, []);
    deptMap.get(dept)!.push({
      id:        m.user.id,
      name:      m.user.name ?? m.name,
      email:     m.user.email ?? m.email ?? "",
      deptName:  dept,
      deptRole:  m.role,
      clearance: m.clearance,
    });
  }

  // Sort each dept's members by role hierarchy
  const usersByDept = Array.from(deptMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([deptName, users]) => ({
      deptName,
      users: users.sort(
        (a, b) => ROLE_ORDER.indexOf(a.deptRole) - ROLE_ORDER.indexOf(b.deptRole),
      ),
    }));

  return (
    <DevSwitcher
      usersByDept={usersByDept}
      currentUserId={session?.user?.id ?? null}
      currentUserName={session?.user?.name ?? null}
    />
  );
}
