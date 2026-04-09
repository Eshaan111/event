import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import DevSwitcher from "./DevSwitcher";
import type { SeedUser, OrgSection } from "./DevSwitcher";

export const metadata = { title: "Dev Account Switcher" };

const ORG_ROLE_ORDER = [
  "PRESIDENT", "VICE_PRESIDENT", "SECRETARY",
  "HEAD_LOGISTICS", "HEAD_FINANCE", "HEAD_MARKETING", "HEAD_CREATIVES",
  "PROJECT_LEAD", "ASSOCIATE", "VOLUNTEER",
] as const;

export default async function DevPage() {
  if (process.env.NODE_ENV !== "development") redirect("/");

  const session = await auth();

  /* ── Seed Org — grouped by role tier ─────────────────────── */
  const seedOrgMembers = await prisma.orgMember.findMany({
    where: { user: { email: { endsWith: "@aetheric.seed" } } },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { orgRole: "asc" },
  });

  function roleGroup(role: string): string {
    if (["PRESIDENT", "VICE_PRESIDENT", "SECRETARY"].includes(role)) return "Executive";
    if (["HEAD_LOGISTICS", "HEAD_FINANCE", "HEAD_MARKETING", "HEAD_CREATIVES"].includes(role)) return "Department Heads";
    if (role === "PROJECT_LEAD") return "Core Members";
    if (role === "ASSOCIATE")    return "Associates";
    return "General";
  }

  const seedGroupMap = new Map<string, SeedUser[]>();
  for (const m of seedOrgMembers) {
    if (!m.user) continue;
    const group = roleGroup(m.orgRole);
    if (!seedGroupMap.has(group)) seedGroupMap.set(group, []);
    seedGroupMap.get(group)!.push({
      id:      m.user.id,
      name:    m.user.name ?? m.name,
      email:   m.user.email ?? m.email ?? "",
      orgRole: m.orgRole,
    });
  }

  const SEED_GROUP_ORDER = ["Executive", "Department Heads", "Core Members", "Associates", "General"];
  const seedOrg: OrgSection = {
    orgName: "Aetheric Studio (Seed)",
    groups: SEED_GROUP_ORDER
      .filter((g) => seedGroupMap.has(g))
      .map((groupName) => ({
        groupName,
        users: seedGroupMap.get(groupName)!.sort((a, b) =>
          ORG_ROLE_ORDER.indexOf(a.orgRole as (typeof ORG_ROLE_ORDER)[number]) -
          ORG_ROLE_ORDER.indexOf(b.orgRole as (typeof ORG_ROLE_ORDER)[number])
        ),
      })),
  };

  /* ── DEMO Org — grouped by department ────────────────────── */
  const demoOrgMembers = await prisma.departmentMember.findMany({
    where: { user: { email: { endsWith: "@aetheric.demo" } } },
    include: {
      user:       { select: { id: true, name: true, email: true } },
      department: { select: { name: true } },
    },
    orderBy: [{ department: { name: "asc" } }, { role: "asc" }],
  });

  const demoGroupMap = new Map<string, SeedUser[]>();
  for (const m of demoOrgMembers) {
    if (!m.user) continue;
    const deptName = m.department.name;
    if (!demoGroupMap.has(deptName)) demoGroupMap.set(deptName, []);
    demoGroupMap.get(deptName)!.push({
      id:       m.user.id,
      name:     m.user.name ?? "",
      email:    m.user.email ?? "",
      orgRole:  "", // not used for display in DEMO
      deptName: deptName,
      deptRole: m.role,
    });
  }

  const DEMO_DEPT_ORDER = [
    "Creative Direction",
    "Production & Logistics",
    "Finance & Strategy",
    "Technology & Innovation",
  ];

  const demoOrg: OrgSection = {
    orgName: "DEMO",
    groups: DEMO_DEPT_ORDER
      .filter((d) => demoGroupMap.has(d))
      .map((groupName) => ({
        groupName,
        users: demoGroupMap.get(groupName)!,
      })),
  };

  /* ── DUMMY Org — grouped by department + students ────────── */
  const dummyDeptOrder = [
    "Finance", "On-site Execution", "Creative Design",
    "Marketing", "Council", "Technology", "Media Relations",
  ];

  const dummyStaffMembers = await prisma.departmentMember.findMany({
    where: { user: { email: { endsWith: "@dummy.seed" } } },
    include: {
      user:       { select: { id: true, name: true, email: true } },
      department: { select: { name: true } },
    },
    orderBy: [{ department: { name: "asc" } }, { role: "asc" }],
  });

  const dummyGroupMap = new Map<string, SeedUser[]>();
  for (const m of dummyStaffMembers) {
    if (!m.user) continue;
    const deptName = m.department.name;
    if (!dummyGroupMap.has(deptName)) dummyGroupMap.set(deptName, []);
    dummyGroupMap.get(deptName)!.push({
      id:       m.user.id,
      name:     m.user.name ?? "",
      email:    m.user.email ?? "",
      orgRole:  "",
      deptName: deptName,
      deptRole: m.role,
    });
  }

  // Students
  const dummyStudents = await prisma.student.findMany({
    where:   { org: { name: "Dummy" } },
    include: { user: { select: { id: true } } },
  });
  if (dummyStudents.length > 0) {
    dummyGroupMap.set("Students", dummyStudents.map((s) => ({
      id:        s.user.id,
      name:      s.name,
      email:     s.email,
      orgRole:   s.branch ?? "Student",
      isStudent: true,
    })));
  }

  const dummyOrg: OrgSection = {
    orgName: "Dummy",
    groups: [...dummyDeptOrder, "Students"]
      .filter((d) => dummyGroupMap.has(d))
      .map((groupName) => ({
        groupName,
        users: dummyGroupMap.get(groupName)!,
      })),
  };

  return (
    <DevSwitcher
      orgs={[seedOrg, demoOrg, dummyOrg]}
      currentUserId={session?.user?.id ?? null}
      currentUserName={session?.user?.name ?? null}
    />
  );
}
