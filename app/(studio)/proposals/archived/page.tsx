export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import ArchiveClient from "./ArchiveClient";
import { fetchEventReports } from "./actions";
import type { ArchivedProposal } from "./ArchiveClient";

export default async function ArchivedProposalsPage() {
  const session = await auth();
  if (!session) redirect("/register");

  // Fetch all completed + rejected proposals
  const proposals = await prisma.proposal.findMany({
    where: {
      status: {
        in: ["COMPLETED", "REJECTED"] as never[],
      },
    },
    include: {
      authors: { orderBy: { isPrimary: "desc" } },
      tags: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  const serialized: ArchivedProposal[] = proposals.map((p) => ({
    id:            p.id,
    title:         p.title,
    type:          p.type,
    status:        p.status,
    dateEst:       p.dateEst,
    budget:        p.budget,
    location:      p.location,
    coverImageUrl: p.coverImageUrl,
    imageGradient: p.imageGradient,
    description:   p.description,
    metadata:      p.metadata as Record<string, unknown> | null,
    createdAt:     p.createdAt.toISOString(),
    authors:       p.authors.map((a) => ({
      name:      a.name,
      initial:   a.initial,
      isPrimary: a.isPrimary,
    })),
    tags: p.tags.map((t) => ({ label: t.label })),
  }));

  // Fetch event reports for all completed proposals
  const completedIds = proposals
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .filter((p) => (p.status as any) === "COMPLETED")
    .map((p) => p.id);

  const reports = await fetchEventReports(completedIds);

  return <ArchiveClient proposals={serialized} reports={reports} />;
}
