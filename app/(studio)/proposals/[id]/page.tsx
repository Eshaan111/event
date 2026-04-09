import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { getOrgId } from "@/lib/org";
import ProposalDetailClient from "./ProposalDetailClient";
import type { SerializedProposal, SerializedChain, SerializedVersion, SerializedMeeting, SerializedComment } from "./ProposalDetailClient";
import type { ChainStep } from "./actions";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const p = await prisma.proposal.findUnique({ where: { id }, select: { title: true } });
  return { title: p ? `${p.title} — Aetheric Studio` : "Proposal — Aetheric Studio" };
}

export default async function ProposalDetailPage({ params }: Props) {
  const { id } = await params;

  const session = await auth();
  const orgId   = await getOrgId(session?.user?.id);

  const [proposal, rawChains, departments, rawVersions, rawMeetings, rawComments] = await Promise.all([
    prisma.proposal.findUnique({
      where:   { id },
      include: { authors: { orderBy: { isPrimary: "desc" } }, tags: true },
    }),
    prisma.proposalApprovalChain.findMany({
      where:   { proposalId: id },
      include: { department: { select: { id: true, name: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.department.findMany({
      where:  { orgId: orgId ?? "__none__" },
      select:  {
        id: true,
        name: true,
        members: { select: { userId: true, name: true, role: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.proposalVersion.findMany({
      where:   { proposalId: id },
      orderBy: { versionNumber: "desc" },
    }),
    prisma.meeting.findMany({
      where:   { proposalId: id },
      orderBy: { scheduledAt: "asc" },
    }),
    prisma.proposalComment.findMany({
      where:   { proposalId: id },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  // Guard: proposal must exist and belong to the current user's org
  if (!proposal || (proposal.orgId && proposal.orgId !== orgId)) notFound();

  // Resolve whether the signed-in user can manage proposals (delete / schedule meetings)
  const sessionUserId = session?.user?.id ?? null;
  const canManageProposal = sessionUserId
    ? !!(await prisma.departmentMember.findFirst({
        where: {
          userId: sessionUserId,
          OR: [
            { clearance: { in: ["OMEGA", "ALPHA"] } },
            { role: "HEAD" },
          ],
        },
      }))
    : false;

  const serialized: SerializedProposal = {
    id:            proposal.id,
    type:          proposal.type,
    status:        proposal.status,
    title:         proposal.title,
    description:   proposal.description,
    imageGradient: proposal.imageGradient,
    coverImageUrl: proposal.coverImageUrl,
    dateEst:       proposal.dateEst,
    budget:        proposal.budget,
    location:      proposal.location,
    metadata:      proposal.metadata as Record<string, unknown> | null,
    flowState:     proposal.flowState as Record<string, unknown> | null,
    createdAt:     proposal.createdAt.toISOString(),
    updatedAt:     proposal.updatedAt.toISOString(),
    authors: proposal.authors.map((a) => ({
      id:        a.id,
      name:      a.name,
      role:      a.role,
      initial:   a.initial,
      iconName:  a.iconName,
      isPrimary: a.isPrimary,
      userId:    a.userId,
    })),
    tags: proposal.tags.map((t) => ({ id: t.id, label: t.label })),
  };

  const chains: SerializedChain[] = rawChains.map((c) => ({
    id:             c.id,
    departmentId:   c.departmentId,
    departmentName: c.department.name,
    currentStep:    c.currentStep,
    status:         c.status,
    steps:          c.steps as ChainStep[],
    transferredFrom: c.transferredFrom,
  }));

  const meetings: SerializedMeeting[] = rawMeetings.map((m) => ({
    id:            m.id,
    title:         m.title,
    description:   m.description,
    scheduledAt:   m.scheduledAt.toISOString(),
    location:      m.location,
    organizerId:   m.organizerId,
    organizerName: m.organizerName,
    createdAt:     m.createdAt.toISOString(),
  }));

  const comments: SerializedComment[] = rawComments.map((c) => ({
    id:            c.id,
    authorName:    c.authorName,
    authorInitial: c.authorInitial,
    content:       c.content,
    createdAt:     c.createdAt.toISOString(),
  }));

  const versions: SerializedVersion[] = rawVersions.map((v) => ({
    id:            v.id,
    versionNumber: v.versionNumber,
    title:         v.title,
    description:   v.description,
    type:          v.type,
    budget:        v.budget,
    dateEst:       v.dateEst,
    location:      v.location,
    metadata:      v.metadata as Record<string, unknown> | null,
    coverImageUrl: v.coverImageUrl,
    imageGradient: v.imageGradient,
    editorId:      v.editorId,
    editorName:    v.editorName,
    changes:       v.changes as import("./ProposalDetailClient").VersionChanges | null,
    createdAt:     v.createdAt.toISOString(),
  }));

  return (
    <ProposalDetailClient
      proposal={serialized}
      currentUserId={session?.user?.id ?? null}
      currentUserName={session?.user?.name ?? null}
      canManageProposal={canManageProposal}
      chains={chains}
      departments={departments}
      versions={versions}
      meetings={meetings}
      comments={comments}
    />
  );
}
