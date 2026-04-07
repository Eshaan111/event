export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import ProposalsClient from "./ProposalsClient";
import type { ProposalWithRelations } from "./ProposalsClient";
import type { ChainStep } from "@/app/(studio)/proposals/[id]/actions";

export default async function ProposalsPage() {
  const [proposals, session] = await Promise.all([
    prisma.proposal.findMany({
      include: { authors: true, tags: true },
      orderBy: { createdAt: "desc" },
    }),
    auth(),
  ]);

  const currentUserId = session?.user?.id ?? null;

  // Find which proposals need THIS user's review right now
  const actionNeededIds: string[] = [];
  if (currentUserId) {
    const activeChains = await prisma.proposalApprovalChain.findMany({
      where: { status: "ACTIVE" },
      select: { proposalId: true, currentStep: true, steps: true },
    });

    for (const chain of activeChains) {
      const steps = chain.steps as ChainStep[];
      const step  = steps[chain.currentStep];
      if (!step) continue;
      // ACTIVE or FLAGGED step where this user is listed as a reviewer
      if (
        (step.status === "ACTIVE" || step.status === "FLAGGED") &&
        step.members.some((m) => m.userId === currentUserId)
      ) {
        actionNeededIds.push(chain.proposalId);
      }
    }
  }

  const serialized: ProposalWithRelations[] = proposals.map((p) => ({
    ...p,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }));

  return (
    <ProposalsClient
      proposals={serialized}
      actionNeededIds={actionNeededIds}
    />
  );
}
