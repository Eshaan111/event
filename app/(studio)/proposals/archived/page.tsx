export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import ProposalsClient from "@/app/(studio)/proposals/ProposalsClient";
import type { ProposalWithRelations } from "@/app/(studio)/proposals/ProposalsClient";

export default async function ArchivedProposalsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const proposals = await prisma.proposal.findMany({
    where: {
      status: {
        in: ["APPROVED", "REJECTED"],
      },
    },
    include: { authors: true, tags: true },
    orderBy: {
      createdAt: "desc",
    },
  });

  const serialized: ProposalWithRelations[] = proposals.map((p) => ({
    ...p,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }));

  return (
    <div className="pt-10 px-8">
      <div className="mb-10 flex flex-col gap-2">
        <h1 className="font-headline text-4xl font-black tracking-tighter text-[#1a1f1f]">
          Archived <span className="text-[#2d5349]">Proposals</span>
        </h1>
        <p className="font-label font-bold text-[11px] uppercase tracking-[0.2em] text-[#707977]">
          Historical records and finalized governance decisions
        </p>
      </div>
      <ProposalsClient proposals={serialized} actionNeededIds={[]} />
    </div>
  );
}