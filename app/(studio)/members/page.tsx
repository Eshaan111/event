import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { getOrgId } from "@/lib/org";
import MembersClient, { type MemberCardData } from "./MembersClient";

export const metadata: Metadata = {
  title: "Members — Aetheric Studio",
  description: "Directory of all signed-in members across the organisation.",
};

export default async function MembersPage() {
  const session = await auth();
  const orgId   = await getOrgId(session?.user?.id);

  const [users, manualOrgMembers] = await Promise.all([
    // Only fetch users who belong to this org (via OrgMember or a dept in this org)
    prisma.user.findMany({
      where: {
        OR: [
          { orgMembership: { orgId: orgId ?? "__none__" } },
          { memberships:   { some: { department: { orgId: orgId ?? "__none__" } } } },
        ],
      },
      include: {
        memberships: {
          where:   { department: { orgId: orgId ?? "__none__" } },
          include: { department: { select: { name: true } } },
          orderBy: { joinedAt: "asc" },
        },
        authoredProposals: {
          where:   { proposal: { orgId: orgId ?? "__none__" } },
          include: { proposal: { select: { id: true, title: true, type: true } } },
          orderBy: { proposal: { createdAt: "desc" } },
        },
        orgMembership: true,
      },
      orderBy: { createdAt: "asc" },
    }),
    // Manual contacts in this org that haven't signed in yet
    prisma.orgMember.findMany({
      where:   { userId: null, orgId: orgId ?? "__none__" },
      orderBy: { joinedAt: "asc" },
    }),
  ]);

  const members: MemberCardData[] = [
    ...users.map((u) => ({
      id:          u.id,
      name:        u.name ?? u.email,
      email:       u.email,
      image:       u.image,
      bio:         u.bio,
      specialty:   u.specialty,
      joinedAt:    u.createdAt.toISOString(),
      orgRole:     (u.orgMembership?.orgRole ?? null) as MemberCardData["orgRole"],
      orgMemberId: u.orgMembership?.id ?? null,
      memberships: u.memberships.map((m) => ({
        departmentName: m.department.name,
        role:           m.role,
        clearance:      m.clearance,
      })),
      proposals: u.authoredProposals.map((a) => ({
        id:    a.proposal.id,
        title: a.proposal.title,
        type:  a.proposal.type,
        role:  a.role,
      })),
    })),
    // Manual (external) contacts
    ...manualOrgMembers.map((om) => ({
      id:          om.id,
      name:        om.name,
      email:       om.email ?? "",
      image:       null,
      bio:         null,
      specialty:   null,
      joinedAt:    om.joinedAt.toISOString(),
      orgRole:     om.orgRole as MemberCardData["orgRole"],
      orgMemberId: om.id,
      memberships: [],
      proposals:   [],
    })),
  ];

  return <MembersClient members={members} />;
}
