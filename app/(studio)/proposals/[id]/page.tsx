import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import ProposalDetailClient from "./ProposalDetailClient";
import type { SerializedProposal, SerializedChain, SerializedVersion } from "./ProposalDetailClient";
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

  const [proposal, session, rawChains, departments, rawVersions] = await Promise.all([
    prisma.proposal.findUnique({
      where:   { id },
      include: { authors: { orderBy: { isPrimary: "desc" } }, tags: true },
    }),
    auth(),
    prisma.proposalApprovalChain.findMany({
      where:   { proposalId: id },
      include: { department: { select: { id: true, name: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.department.findMany({
      select:  { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.proposalVersion.findMany({
      where:   { proposalId: id },
      orderBy: { versionNumber: "desc" },
    }),
  ]);

  if (!proposal) notFound();

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
      chains={chains}
      departments={departments}
      versions={versions}
    />
  );
}
