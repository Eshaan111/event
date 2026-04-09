export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { getOrgId } from "@/lib/org";
import { redirect } from "next/navigation";
import EventsClient from "./EventsClient";
import { fetchEventReports } from "@/app/(studio)/proposals/archived/actions";
import type { ActiveEvent } from "./EventsClient";

export default async function EventsPage() {
  const session = await auth();
  if (!session) redirect("/register");

  const userId = session.user?.id ?? null;
  const orgId  = await getOrgId(userId);

  const proposals = await prisma.proposal.findMany({
    where: { status: "ACTIVE", orgId: orgId ?? "__none__" },
    include: {
      authors:       { orderBy: { isPrimary: "desc" } },
      tags:          true,
      approvalChains: {
        include: { department: { select: { id: true, name: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  // Resolve canManage for the current user
  const canManage = userId
    ? !!(await prisma.departmentMember.findFirst({
        where: {
          userId,
          OR: [
            { clearance: { in: ["OMEGA", "ALPHA"] } },
            { role: "HEAD" },
          ],
        },
      }))
    : false;

  const serialized: ActiveEvent[] = proposals.map((p) => ({
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
    updatedAt:     p.updatedAt.toISOString(),
    authors: p.authors.map((a) => ({
      name: a.name, initial: a.initial, isPrimary: a.isPrimary, role: a.role,
    })),
    tags: p.tags.map((t) => ({ label: t.label })),
    departments: p.approvalChains.map((c) => ({
      id: c.departmentId, name: c.department.name,
    })),
  }));

  // Pre-fetch any already-existing event reports so users can see them
  const reports = await fetchEventReports(proposals.map((p) => p.id));

  return (
    <EventsClient
      events={serialized}
      reports={reports}
      canManage={canManage}
    />
  );
}
