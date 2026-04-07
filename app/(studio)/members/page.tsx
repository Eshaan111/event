import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import MembersClient, { type MemberCardData } from "./MembersClient";

export const metadata: Metadata = {
  title: "Members — Aetheric Studio",
  description: "Directory of all signed-in members across the organisation.",
};

export default async function MembersPage() {
  const [users, manualOrgMembers] = await Promise.all([
    prisma.user.findMany({
      include: {
        memberships: {
          include: { department: { select: { name: true } } },
          orderBy:  { joinedAt: "asc" },
        },
        authoredProposals: {
          include: { proposal: { select: { id: true, title: true, type: true } } },
          orderBy:  { proposal: { createdAt: "desc" } },
        },
        orgMembership: true,
      },
      orderBy: { createdAt: "asc" },
    }),
    // OrgMembers that haven't signed in yet (no User account linked)
    prisma.orgMember.findMany({
      where:   { userId: null },
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
