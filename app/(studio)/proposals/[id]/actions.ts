"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import {
  removeProposalAttachments,
  saveProposalAttachment,
  saveBannerImage,
} from "@/lib/proposal-attachments";
import { revalidatePath } from "next/cache";

/* ── Flow state shape ─────────────────────────────────────────── */

export type FlowNode = {
  id:             string;
  type:           "SUBMITTED" | "APPROVED" | "FLAGGED" | "REJECTED" | "ACTIVATED";
  userId:         string | null;
  userName:       string;
  userInitial:    string;
  chainDeptName?: string;
  stepRole?:      "MEMBER" | "LEAD" | "HEAD";
  versionNumber:  number;
  changedFields?: string[];
  pdfChanged?:    boolean;
  bannerChanged?: boolean;
  timestamp:      string; // ISO
};

/* ── Chain step shape (mirrored in ProposalDetailClient.tsx) ── */

export type ChainMember = {
  userId: string | null;
  name: string;
  initial: string;
};

export type ChainApproval = {
  userId: string;
  name: string;
  approvedAt: string; // ISO string
};

export type ChainStep = {
  role: "MEMBER" | "LEAD" | "HEAD";
  label: string;
  members: ChainMember[];
  approvals: ChainApproval[];
  // PENDING → ACTIVE (currently being reviewed) → APPROVED | REJECTED | FLAGGED
  status: "PENDING" | "ACTIVE" | "APPROVED" | "REJECTED" | "FLAGGED";
};

/* ── Internal helpers ─────────────────────────────────────────── */

const ROLE_ORDER = ["MEMBER", "LEAD", "HEAD"] as const;

// Captures the current proposal state as a new version record.
// Triggered at review-boundary actions only (submit / approve / flag / reject).
// Computes a field-level diff vs the previous version and stores it in `changes`.
async function snapshotProposal(
  proposalId: string,
  editorId: string | null,
  editorName: string,
  action: "SUBMITTED" | "APPROVED" | "FLAGGED" | "REJECTED",
  chainDeptName?: string,
  stepRole?: "MEMBER" | "LEAD" | "HEAD",
) {
  const proposal = await prisma.proposal.findUnique({ where: { id: proposalId } });
  if (!proposal) return;

  // Get the last snapshot for diffing
  const prev = await prisma.proposalVersion.findFirst({
    where: { proposalId },
    orderBy: { versionNumber: "desc" },
  });

  const nextVersion = (prev?.versionNumber ?? 0) + 1;

  // Field-level diff vs previous version
  const FIELDS = [
    "title", "description", "type", "budget", "dateEst", "location",
    "coverImageUrl", "imageGradient",
  ] as const;

  const changedFields: Record<string, { from: unknown; to: unknown }> = {};
  if (prev) {
    for (const f of FIELDS) {
      const before = (prev as Record<string, unknown>)[f] ?? null;
      const after  = (proposal as Record<string, unknown>)[f] ?? null;
      if (JSON.stringify(before) !== JSON.stringify(after)) {
        changedFields[f] = { from: before, to: after };
      }
    }
  }

  // PDF diff — compare attachmentName in metadata
  const prevMeta = prev?.metadata as Record<string, unknown> | null;
  const currMeta = proposal.metadata as Record<string, unknown> | null;
  const prevPdf    = (prevMeta?.attachmentName as string | null) ?? null;
  const currPdf    = (currMeta?.attachmentName as string | null) ?? null;
  const pdfChanged = prev !== null && prevPdf !== currPdf;

  // Banner diff — compare bannerName in metadata
  const prevBanner    = (prevMeta?.bannerName as string | null) ?? null;
  const currBanner    = (currMeta?.bannerName as string | null) ?? null;
  const bannerChanged = prev !== null && prevBanner !== currBanner;

  const changes: Record<string, unknown> = { action };
  if (chainDeptName)                         changes.chainDeptName = chainDeptName;
  if (Object.keys(changedFields).length > 0) changes.fields        = changedFields;
  if (pdfChanged) {
    changes.pdfChanged   = true;
    changes.prevPdfName  = prevPdf;
    changes.newPdfName   = currPdf;
  }
  if (bannerChanged) {
    changes.bannerChanged = true;
  }

  await prisma.proposalVersion.create({
    data: {
      proposalId,
      versionNumber: nextVersion,
      title:         proposal.title,
      description:   proposal.description,
      type:          proposal.type,
      budget:        proposal.budget,
      dateEst:       proposal.dateEst,
      location:      proposal.location,
      metadata:      proposal.metadata ?? undefined,
      coverImageUrl: proposal.coverImageUrl,
      imageGradient: proposal.imageGradient,
      editorId:      editorId ?? undefined,
      editorName,
      changes:       changes as never,
    },
  });

  // Push a node to the proposal's flowState so the flow map stays in sync
  const oldFlow = (proposal.flowState as { nodes?: FlowNode[] } | null) ?? { nodes: [] };
  const existingNodes: FlowNode[] = oldFlow.nodes ?? [];

  const node: FlowNode = {
    id:            `fn-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    type:          action,
    userId:        editorId,
    userName:      editorName,
    userInitial:   editorName.charAt(0).toUpperCase(),
    versionNumber: nextVersion,
    timestamp:     new Date().toISOString(),
  };
  if (chainDeptName)                         node.chainDeptName = chainDeptName;
  if (stepRole)                              node.stepRole      = stepRole;
  if (Object.keys(changedFields).length > 0) node.changedFields = Object.keys(changedFields);
  if (pdfChanged)                            node.pdfChanged    = true;
  if (bannerChanged)                         node.bannerChanged = true;

  await prisma.proposal.update({
    where: { id: proposalId },
    data:  { flowState: { nodes: [...existingNodes, node] } as never },
  });
}

function stepLabel(role: string): string {
  if (role === "HEAD") return "Department Head";
  if (role === "LEAD") return "Lead Review";
  return "Member Review";
}

function revalidate(proposalId: string) {
  revalidatePath(`/proposals/${proposalId}`);
  revalidatePath("/proposals");
}

/* ── Replace attachment ──────────────────────────────────────── */

export async function replaceAttachment(
  id: string,
  formData: FormData,
): Promise<{ error: string } | void> {
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { error: "No file provided." };

  const proposal = await prisma.proposal.findUnique({
    where: { id },
    select: { metadata: true },
  });
  const oldMeta = proposal?.metadata as Record<string, unknown> | null;

  let saved;
  try {
    saved = await saveProposalAttachment(file);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Attachment processing failed.",
    };
  }

  // Do NOT delete the old file — it may be referenced by a past version snapshot.
  // All historical files are cleaned up only when the proposal itself is deleted.

  const newMeta = {
    ...(oldMeta ?? {}),
    attachmentUrl: saved.attachmentUrl,
    attachmentName: saved.attachmentName,
    sourceAttachmentUrl: saved.sourceAttachmentUrl,
    sourceAttachmentName: saved.sourceAttachmentName,
  };

  await prisma.proposal.update({
    where: { id },
    data: { metadata: newMeta as never },
  });

  revalidatePath(`/proposals/${id}`);
}

/* ── Replace banner image ────────────────────────────────────── */
// Stores the new image without deleting the old one, so past version snapshots
// that captured the previous coverImageUrl remain valid.

export async function replaceBannerImage(
  id: string,
  formData: FormData,
): Promise<{ error: string } | void> {
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { error: "No file provided." };

  let saved;
  try {
    saved = await saveBannerImage(file);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Image upload failed." };
  }

  // Store the banner URL inside metadata JSON so it can be referenced by any
  // version snapshot without going through next/image optimization.
  // Also mirror to coverImageUrl for the proposal card gallery.
  const proposal = await prisma.proposal.findUnique({
    where: { id },
    select: { metadata: true },
  });
  const oldMeta = (proposal?.metadata as Record<string, unknown> | null) ?? {};

  await prisma.proposal.update({
    where: { id },
    data: {
      coverImageUrl: saved.bannerUrl,
      metadata: {
        ...oldMeta,
        bannerUrl:  saved.bannerUrl,
        bannerName: file.name,
      } as never,
    },
  });

  revalidatePath(`/proposals/${id}`);
  revalidatePath("/proposals");
}

/* ── Submit for review ───────────────────────────────────────── */
// Computes the approval chain from the current user's department membership,
// then creates a ProposalApprovalChain record and keeps the proposal in DRAFT.

export async function submitForReview(id: string) {
  const session = await auth();
  const userId     = session?.user?.id   ?? null;
  const editorName = session?.user?.name ?? "Unknown";

  if (userId) {
    // Find user's first non-observer department membership
    const membership = await prisma.departmentMember.findFirst({
      where: {
        userId,
        role: { in: ["MEMBER", "LEAD", "HEAD"] },
      },
      include: {
        department: {
          include: { members: true },
        },
      },
      orderBy: { joinedAt: "asc" },
    });

    if (membership) {
      const dept = membership.department;
      const submitterRoleIdx = ROLE_ORDER.indexOf(membership.role as never);

      // Build steps for every role tier above the submitter
      const steps: ChainStep[] = ROLE_ORDER.slice(submitterRoleIdx + 1)
        .map((role) => {
          const roleMembers: ChainMember[] = dept.members
            .filter((m) => m.role === role)
            .map((m) => ({
              userId: m.userId,
              name: m.name,
              initial: m.name.charAt(0).toUpperCase(),
            }));
          return {
            role,
            label: stepLabel(role),
            members: roleMembers,
            approvals: [],
            status: "PENDING" as const,
          };
        })
        // Skip tiers that have no members in this department
        .filter((s) => s.members.length > 0);

      if (steps.length > 0) {
        steps[0].status = "ACTIVE";

        await prisma.proposalApprovalChain.upsert({
          where: {
            proposalId_departmentId: { proposalId: id, departmentId: dept.id },
          },
          create: {
            proposalId: id,
            departmentId: dept.id,
            currentStep: 0,
            status: "ACTIVE",
            steps: steps as never,
          },
          update: {
            currentStep: 0,
            status: "ACTIVE",
            steps: steps as never,
          },
        });
      }
    }
  }

  await prisma.proposal.update({
    where: { id },
    data: { status: "DRAFT" },
  });

  await snapshotProposal(id, userId, editorName, "SUBMITTED");

  revalidate(id);
}

/* ── Approve a chain step ────────────────────────────────────── */
// Records the current user's approval, advances the chain, and — once all
// active chains for the proposal are APPROVED — marks the proposal APPROVED.

export async function approveChainStep(proposalId: string, chainId: string) {
  const session = await auth();
  const userId = session?.user?.id;
  const userName = session?.user?.name ?? "Unknown";
  if (!userId) return;

  const chain = await prisma.proposalApprovalChain.findUnique({
    where: { id: chainId },
    include: { department: { select: { name: true } } },
  });
  if (!chain || chain.status !== "ACTIVE") return;

  const steps = chain.steps as ChainStep[];
  const currentStep = steps[chain.currentStep];
  if (!currentStep) return;

  // FLAGGED steps can still be approved (reviewer reviewed and decided to pass)
  const canApprove =
    (currentStep.status === "ACTIVE" || currentStep.status === "FLAGGED") &&
    currentStep.members.some((m) => m.userId === userId);
  if (!canApprove) return;

  // Record approval
  currentStep.approvals.push({
    userId,
    name: userName,
    approvedAt: new Date().toISOString(),
  });
  currentStep.status = "APPROVED";

  const nextIdx = chain.currentStep + 1;
  let newChainStatus: "ACTIVE" | "APPROVED" = "ACTIVE";

  if (nextIdx < steps.length) {
    steps[nextIdx].status = "ACTIVE";
  } else {
    newChainStatus = "APPROVED";
  }

  await prisma.proposalApprovalChain.update({
    where: { id: chainId },
    data: {
      steps: steps as never,
      currentStep: nextIdx,
      status: newChainStatus,
    },
  });

  if (newChainStatus === "APPROVED") {
    // If no other chain is still active, approve the proposal
    const activeCount = await prisma.proposalApprovalChain.count({
      where: { proposalId, status: "ACTIVE" },
    });
    if (activeCount === 0) {
      await prisma.proposal.update({
        where: { id: proposalId },
        data: { status: "APPROVED" },
      });
    }
  } else {
    // Ensure proposal is back in review (e.g. after a flag was cleared)
    await prisma.proposal.update({
      where: { id: proposalId },
      data: { status: "DRAFT" },
    });
  }

  await snapshotProposal(proposalId, userId, userName, "APPROVED", chain.department.name, currentStep.role as "MEMBER" | "LEAD" | "HEAD");

  revalidate(proposalId);
}

/* ── Flag a chain step ───────────────────────────────────────── */
// Marks the current step FLAGGED without advancing it.
// The reviewer can later approve or reject the same step.

export async function flagChainStep(proposalId: string, chainId: string) {
  const session = await auth();
  const userId   = session?.user?.id;
  const userName = session?.user?.name ?? "Unknown";
  if (!userId) return;

  const chain = await prisma.proposalApprovalChain.findUnique({
    where: { id: chainId },
    include: { department: { select: { name: true } } },
  });
  if (!chain || chain.status !== "ACTIVE") return;

  const steps = chain.steps as ChainStep[];
  const currentStep = steps[chain.currentStep];
  if (!currentStep || currentStep.status !== "ACTIVE") return;

  if (!currentStep.members.some((m) => m.userId === userId)) return;

  currentStep.status = "FLAGGED";

  await prisma.proposalApprovalChain.update({
    where: { id: chainId },
    data: { steps: steps as never },
  });

  await prisma.proposal.update({
    where: { id: proposalId },
    data: { status: "FLAGGED" },
  });

  await snapshotProposal(proposalId, userId, userName, "FLAGGED", chain.department.name, currentStep.role as "MEMBER" | "LEAD" | "HEAD");

  revalidate(proposalId);
}

/* ── Reject a chain step ─────────────────────────────────────── */
// Marks the chain REJECTED and the proposal REJECTED.

export async function rejectChainStep(proposalId: string, chainId: string) {
  const session = await auth();
  const userId   = session?.user?.id;
  const userName = session?.user?.name ?? "Unknown";
  if (!userId) return;

  const chain = await prisma.proposalApprovalChain.findUnique({
    where: { id: chainId },
    include: { department: { select: { name: true } } },
  });
  if (!chain || chain.status !== "ACTIVE") return;

  const steps = chain.steps as ChainStep[];
  const currentStep = steps[chain.currentStep];
  if (!currentStep) return;

  const canAct =
    (currentStep.status === "ACTIVE" || currentStep.status === "FLAGGED") &&
    currentStep.members.some((m) => m.userId === userId);
  if (!canAct) return;

  currentStep.status = "REJECTED";

  await prisma.proposalApprovalChain.update({
    where: { id: chainId },
    data: { steps: steps as never, status: "REJECTED" },
  });

  await prisma.proposal.update({
    where: { id: proposalId },
    data: { status: "REJECTED" },
  });

  await snapshotProposal(proposalId, userId, userName, "REJECTED", chain.department.name, currentStep.role as "MEMBER" | "LEAD" | "HEAD");

  revalidate(proposalId);
}

/* ── Transfer to an additional department ────────────────────── */
// Called by a Department Head after their chain is APPROVED.
// Creates a new approval chain for the target department starting at HEAD.
// If the proposal was already APPROVED, this resets it to DRAFT.

export async function transferToAdditionalDepartment(
  proposalId: string,
  targetDeptId: string,
) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return;

  // Verify the caller is a HEAD in at least one APPROVED chain for this proposal
  const approvedChains = await prisma.proposalApprovalChain.findMany({
    where: { proposalId, status: "APPROVED" },
  });

  const isAuthorizedHead = approvedChains.some((c) => {
    const steps = c.steps as ChainStep[];
    const lastStep = steps[steps.length - 1];
    return (
      lastStep?.role === "HEAD" &&
      lastStep.members.some((m) => m.userId === userId)
    );
  });

  if (!isAuthorizedHead) return;

  const targetDept = await prisma.department.findUnique({
    where: { id: targetDeptId },
    include: { members: true },
  });
  if (!targetDept) return;

  // Build the full MEMBER → LEAD → HEAD chain for the target department,
  // skipping tiers that have no members assigned.
  const steps: ChainStep[] = ROLE_ORDER
    .map((role) => {
      const roleMembers: ChainMember[] = targetDept.members
        .filter((m) => m.role === role)
        .map((m) => ({
          userId: m.userId,
          name:    m.name,
          initial: m.name.charAt(0).toUpperCase(),
        }));
      return {
        role,
        label:    stepLabel(role),
        members:  roleMembers,
        approvals: [],
        status:   "PENDING" as const,
      };
    })
    .filter((s) => s.members.length > 0);

  if (steps.length === 0) return;

  // Activate the first (lowest) step so it is immediately actionable
  steps[0].status = "ACTIVE";

  // Use the first approved chain's department as the "source"
  const sourceDeptId = approvedChains[0]?.departmentId ?? null;

  await prisma.proposalApprovalChain.upsert({
    where: {
      proposalId_departmentId: { proposalId, departmentId: targetDeptId },
    },
    create: {
      proposalId,
      departmentId: targetDeptId,
      currentStep: 0,
      status: "ACTIVE",
      steps: steps as never,
      transferredFrom: sourceDeptId,
    },
    update: {
      currentStep: 0,
      status: "ACTIVE",
      steps: steps as never,
      transferredFrom: sourceDeptId,
    },
  });

  // Ensure proposal is back in review
  await prisma.proposal.update({
    where: { id: proposalId },
    data: { status: "DRAFT" },
  });

  revalidate(proposalId);
}

/* ── Activate ────────────────────────────────────────────────── */

export async function activateProposal(id: string) {
  const session  = await auth();
  const userId   = session?.user?.id   ?? null;
  const userName = session?.user?.name ?? "Unknown";

  const proposal = await prisma.proposal.findUnique({
    where: { id },
    select: { flowState: true, versions: { orderBy: { versionNumber: "desc" }, take: 1 } },
  });

  const oldFlow      = (proposal?.flowState as { nodes?: FlowNode[] } | null) ?? { nodes: [] };
  const existingNodes: FlowNode[] = oldFlow.nodes ?? [];
  const lastVersion  = proposal?.versions[0]?.versionNumber ?? 0;

  const node: FlowNode = {
    id:            `fn-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    type:          "ACTIVATED",
    userId,
    userName,
    userInitial:   userName.charAt(0).toUpperCase(),
    versionNumber: lastVersion,
    timestamp:     new Date().toISOString(),
  };

  await prisma.proposal.update({
    where: { id },
    data: {
      status:    "ACTIVE",
      flowState: { nodes: [...existingNodes, node] } as never,
    },
  });
  revalidate(id);
}

/* ── Update proposal details ─────────────────────────────────── */
// Applies field changes. No snapshot — versions are only created at review boundaries.

export async function updateProposalDetails(
  id: string,
  fields: {
    title?: string;
    description?: string;
    budget?: number | null;
    dateEst?: string | null;
    location?: string | null;
    type?: string;
  },
): Promise<{ error: string } | void> {
  await prisma.proposal.update({
    where: { id },
    data: {
      ...(fields.title       !== undefined && { title: fields.title }),
      ...(fields.description !== undefined && { description: fields.description || null }),
      ...(fields.budget      !== undefined && { budget: fields.budget }),
      ...(fields.dateEst     !== undefined && { dateEst: fields.dateEst || null }),
      ...(fields.location    !== undefined && { location: fields.location || null }),
      ...(fields.type        !== undefined && { type: fields.type as never }),
    },
  });

  revalidate(id);
}

/* ── Permission helper ───────────────────────────────────────── */

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

/* ── Delete proposal ─────────────────────────────────────────── */

export async function deleteProposal(
  id: string,
): Promise<{ error: string } | { deleted: true }> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { error: "Not authenticated." };
  if (!(await assertCanManage(userId))) return { error: "Not authorized." };

  // Collect all stored file URLs from the proposal and every version snapshot,
  // then delete every unique local file before removing the DB record.
  const [proposal, allVersions] = await Promise.all([
    prisma.proposal.findUnique({
      where: { id },
      select: { metadata: true, coverImageUrl: true },
    }),
    prisma.proposalVersion.findMany({
      where: { proposalId: id },
      select: { metadata: true, coverImageUrl: true },
    }),
  ]);

  const seen = new Set<string>();
  const allUrls: string[] = [];

  function collect(url: string | null | undefined) {
    if (typeof url === "string" && url.startsWith("/uploads/") && !seen.has(url)) {
      seen.add(url);
      allUrls.push(url);
    }
  }

  // PDF / PPTX attachments (stored in metadata JSON)
  const metaList = [
    proposal?.metadata as Record<string, unknown> | null,
    ...allVersions.map((v) => v.metadata as Record<string, unknown> | null),
  ].filter(Boolean) as Record<string, unknown>[];

  for (const m of metaList) {
    collect(m.attachmentUrl as string | null);
    collect(m.sourceAttachmentUrl as string | null);
  }

  // Banner images (stored in coverImageUrl column)
  collect(proposal?.coverImageUrl);
  for (const v of allVersions) collect(v.coverImageUrl);

  await Promise.all(allUrls.map((u) => removeProposalAttachments({ attachmentUrl: u })));

  await prisma.proposal.delete({ where: { id } });
  revalidatePath("/proposals");
  return { deleted: true };
}

/* ── Schedule a meeting ──────────────────────────────────────── */

export async function scheduleMeeting(
  proposalId: string,
  data: { title: string; description?: string; scheduledAt: string; location?: string },
): Promise<{ error: string } | void> {
  const session = await auth();
  const userId   = session?.user?.id;
  const userName = session?.user?.name ?? "Unknown";
  if (!userId) return { error: "Not authenticated." };
  if (!(await assertCanManage(userId))) return { error: "Not authorized." };

  if (!data.title.trim()) return { error: "Title is required." };
  if (!data.scheduledAt)  return { error: "Date & time are required." };

  await prisma.meeting.create({
    data: {
      proposalId,
      title:        data.title.trim(),
      description:  data.description?.trim() || null,
      scheduledAt:  new Date(data.scheduledAt),
      location:     data.location?.trim() || null,
      organizerId:  userId,
      organizerName: userName,
    },
  });

  revalidatePath(`/proposals/${proposalId}`);
}

/* ── Delete a meeting ────────────────────────────────────────── */

export async function deleteMeeting(
  meetingId: string,
  proposalId: string,
): Promise<{ error: string } | void> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { error: "Not authenticated." };
  if (!(await assertCanManage(userId))) return { error: "Not authorized." };

  await prisma.meeting.delete({ where: { id: meetingId } });
  revalidatePath(`/proposals/${proposalId}`);
}

/* ── Restore a version ───────────────────────────────────────── */
// Restores field data from a past version. No snapshot on restore.

export async function restoreVersion(
  proposalId: string,
  versionId: string,
): Promise<{ error: string } | void> {
  const version = await prisma.proposalVersion.findUnique({ where: { id: versionId } });
  if (!version || version.proposalId !== proposalId) return { error: "Version not found." };

  await prisma.proposal.update({
    where: { id: proposalId },
    data: {
      title:         version.title,
      description:   version.description,
      type:          version.type,
      budget:        version.budget,
      dateEst:       version.dateEst,
      location:      version.location,
      metadata:      version.metadata ?? undefined,
      coverImageUrl: version.coverImageUrl,
      imageGradient: version.imageGradient,
    },
  });

  revalidate(proposalId);
}


/* ── Comments ─────────────────────────────────────────────────── */

export async function addComment(
  proposalId: string,
  content: string,
): Promise<{ error: string } | { id: string; authorName: string; authorInitial: string | null; content: string; createdAt: string }> {
  const session = await auth();
  const trimmed = content.trim();
  if (!trimmed) return { error: "Comment cannot be empty." };

  const authorName    = session?.user?.name ?? "Anonymous";
  const authorInitial = authorName.charAt(0).toUpperCase();
  const authorId      = session?.user?.id ?? null;

  const comment = await prisma.proposalComment.create({
    data: {
      proposalId,
      content:      trimmed,
      authorName,
      authorInitial,
      ...(authorId ? { authorId } : {}),
    },
  });

  revalidate(proposalId);

  return {
    id:            comment.id,
    authorName:    comment.authorName,
    authorInitial: comment.authorInitial,
    content:       comment.content,
    createdAt:     comment.createdAt.toISOString(),
  };
}
