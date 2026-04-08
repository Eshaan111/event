export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import ProposalsClient from "@/app/(studio)/proposals/ProposalsClient";
import type { ProposalWithRelations } from "@/app/(studio)/proposals/ProposalsClient";
import type { ChainStep } from "@/app/(studio)/proposals/[id]/actions";

export default async function ArchivedProposalsPage() {
  const [proposals, session] = await Promise.all([
    prisma.proposal.findMany({
      where: {
        status: {
          in: ["APPROVED", "REJECTED"],
        },
      },
      include: { authors: true, tags: true },
      orderBy: { createdAt: "desc" },
    }),
    auth(),
  ]);

  const currentUserId = session?.user?.id ?? null;

  // Find which proposals need THIS user's review (maintaining parity with the main dashboard)
  const actionNeededIds: string[] = [];
  if (currentUserId) {
    const activeChains = await prisma.proposalApprovalChain.findMany({
      where: { status: "ACTIVE" },
      select: { proposalId: true, currentStep: true, steps: true },
    });

    for (const chain of activeChains) {
      const steps = chain.steps as ChainStep[];
      const step = steps[chain.currentStep];
      if (!step) continue;
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