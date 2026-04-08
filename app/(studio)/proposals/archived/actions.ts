"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { saveReportFile, type ReportFile, type ReportFileCategory } from "@/lib/report-attachments";

/* ── Types ──────────────────────────────────────────────────── */

export type EventReportData = {
  actualDate?: string | null;       // ISO date string
  actualLocation?: string | null;
  actualSpend?: number | null;
  signedUpCount?: number | null;
  actualAttendance?: number | null;
  summary?: string | null;
  highlights?: string | null;
  challenges?: string | null;
  internalRating?: number | null;   // 1–5
  receipts?: ReportFile[] | null;   // uploaded bills / invoices
  media?: ReportFile[] | null;      // uploaded photos / videos / docs
};

export type SerializedEventReport = {
  id: string;
  proposalId: string;
  actualDate: string | null;
  actualLocation: string | null;
  actualSpend: number | null;
  signedUpCount: number | null;
  actualAttendance: number | null;
  summary: string | null;
  highlights: string | null;
  challenges: string | null;
  internalRating: number | null;
  receipts: ReportFile[];
  media: ReportFile[];
  reportedById: string | null;
  reportedByName: string;
  createdAt: string;
  updatedAt: string;
};

/* ── Permission helper ──────────────────────────────────────── */

async function assertCanManage(userId: string): Promise<boolean> {
  const m = await prisma.departmentMember.findFirst({
    where: {
      userId,
      OR: [
        { clearance: { in: ["OMEGA", "ALPHA"] } },
        { role: "HEAD" },
      ],
    },
  });
  return !!m;
}

/* ── Complete a proposal ────────────────────────────────────── */
// Transitions an ACTIVE proposal to COMPLETED and adds a flowState node.

export async function completeProposal(
  id: string,
): Promise<{ error: string } | void> {
  const session = await auth();
  const userId   = session?.user?.id   ?? null;
  const userName = session?.user?.name ?? "Unknown";

  if (!userId) return { error: "Not authenticated." };
  if (!(await assertCanManage(userId))) return { error: "Not authorized." };

  const proposal = await prisma.proposal.findUnique({
    where:  { id },
    select: { status: true, flowState: true, versions: { orderBy: { versionNumber: "desc" }, take: 1 } },
  });

  if (!proposal) return { error: "Proposal not found." };
  if (proposal.status !== "ACTIVE") return { error: "Only ACTIVE proposals can be completed." };

  const oldFlow      = (proposal.flowState as { nodes?: Record<string, unknown>[] } | null) ?? { nodes: [] };
  const existingNodes = oldFlow.nodes ?? [];
  const lastVersion  = proposal.versions[0]?.versionNumber ?? 0;

  const node = {
    id:            `fn-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    type:          "COMPLETED",
    userId,
    userName,
    userInitial:   userName.charAt(0).toUpperCase(),
    versionNumber: lastVersion,
    timestamp:     new Date().toISOString(),
  };

  await prisma.proposal.update({
    where: { id },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: {
      status:    "COMPLETED" as never,
      flowState: { nodes: [...existingNodes, node] } as never,
    },
  });

  revalidatePath(`/proposals/${id}`);
  revalidatePath("/proposals");
  revalidatePath("/proposals/archived");
}

/* ── Save / update an event report ─────────────────────────── */
// Creates the EventReport row if it doesn't exist, or updates it.
// Uses raw SQL so it works before `prisma generate` is re-run.

export async function saveEventReport(
  proposalId: string,
  data: EventReportData,
): Promise<{ error: string } | { ok: true }> {
  const session = await auth();
  const userId   = session?.user?.id   ?? null;
  const userName = session?.user?.name ?? "Unknown";

  if (!userId) return { error: "Not authenticated." };

  // Validate rating range
  if (data.internalRating !== null && data.internalRating !== undefined) {
    if (data.internalRating < 1 || data.internalRating > 5) {
      return { error: "Rating must be between 1 and 5." };
    }
  }

  const actualDate = data.actualDate ? new Date(data.actualDate) : null;

  // Use raw SQL (upsert via INSERT … ON CONFLICT)
  await prisma.$executeRaw`
    INSERT INTO "EventReport" (
      "id", "proposalId", "actualDate", "actualLocation",
      "actualSpend", "signedUpCount", "actualAttendance",
      "summary", "highlights", "challenges", "internalRating",
      "reportedById", "reportedByName", "createdAt", "updatedAt"
    ) VALUES (
      gen_random_uuid(),
      ${proposalId},
      ${actualDate},
      ${data.actualLocation ?? null},
      ${data.actualSpend ?? null},
      ${data.signedUpCount ?? null},
      ${data.actualAttendance ?? null},
      ${data.summary ?? null},
      ${data.highlights ?? null},
      ${data.challenges ?? null},
      ${data.internalRating ?? null},
      ${userId},
      ${userName},
      NOW(), NOW()
    )
    ON CONFLICT ("proposalId") DO UPDATE SET
      "actualDate"       = EXCLUDED."actualDate",
      "actualLocation"   = EXCLUDED."actualLocation",
      "actualSpend"      = EXCLUDED."actualSpend",
      "signedUpCount"    = EXCLUDED."signedUpCount",
      "actualAttendance" = EXCLUDED."actualAttendance",
      "summary"          = EXCLUDED."summary",
      "highlights"       = EXCLUDED."highlights",
      "challenges"       = EXCLUDED."challenges",
      "internalRating"   = EXCLUDED."internalRating",
      "reportedById"     = EXCLUDED."reportedById",
      "reportedByName"   = EXCLUDED."reportedByName",
      "updatedAt"        = NOW()
  `;

  revalidatePath("/proposals/archived");
  revalidatePath(`/proposals/${proposalId}`);

  return { ok: true };
}

/* ── Fetch event reports for a list of proposals ─────────────── */
// Returns a map of proposalId → SerializedEventReport.

export async function fetchEventReports(
  proposalIds: string[],
): Promise<Record<string, SerializedEventReport>> {
  if (proposalIds.length === 0) return {};

  const rows = await prisma.$queryRaw<Array<{
    id: string;
    proposalId: string;
    actualDate: Date | null;
    actualLocation: string | null;
    actualSpend: number | null;
    signedUpCount: number | null;
    actualAttendance: number | null;
    summary: string | null;
    highlights: string | null;
    challenges: string | null;
    internalRating: number | null;
    reportedById: string | null;
    reportedByName: string;
    createdAt: Date;
    updatedAt: Date;
  }>>`
    SELECT * FROM "EventReport"
    WHERE "proposalId" = ANY(${proposalIds})
  `;

  const map: Record<string, SerializedEventReport> = {};
  for (const r of rows) {
    map[r.proposalId] = {
      id:               r.id,
      proposalId:       r.proposalId,
      actualDate:       r.actualDate?.toISOString() ?? null,
      actualLocation:   r.actualLocation,
      actualSpend:      r.actualSpend,
      signedUpCount:    r.signedUpCount,
      actualAttendance: r.actualAttendance,
      summary:          r.summary,
      highlights:       r.highlights,
      challenges:       r.challenges,
      internalRating:   r.internalRating,
      reportedById:     r.reportedById,
      reportedByName:   r.reportedByName,
      createdAt:        r.createdAt.toISOString(),
      updatedAt:        r.updatedAt.toISOString(),
    };
  }
  return map;
}
