"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState, useTransition } from "react";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist/build/pdf.mjs";
import { useRouter } from "next/navigation";
import {
  approveChainStep,
  flagChainStep,
  rejectChainStep,
  activateProposal,
  submitForReview,
  transferToAdditionalDepartment,
  replaceAttachment,
  replaceBannerImage,
  updateProposalDetails,
  restoreVersion,
  deleteProposal,
  scheduleMeeting,
  deleteMeeting,
  addComment,
} from "./actions";
import { completeProposal } from "@/app/(studio)/proposals/archived/actions";
import type { ChainStep } from "./actions";

GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

/* ── Exported types (consumed by page.tsx) ───────────────────── */

export type SerializedProposal = {
  id: string;
  type: string;
  status: string;
  title: string;
  description: string | null;
  imageGradient: string | null;
  coverImageUrl: string | null;
  dateEst: string | null;
  budget: number | null;
  location: string | null;
  metadata: Record<string, unknown> | null;
  flowState: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  authors: {
    id: string;
    name: string;
    role: string;
    initial: string | null;
    iconName: string | null;
    isPrimary: boolean;
    userId: string | null;
  }[];
  tags: { id: string; label: string }[];
};

export type SerializedChain = {
  id: string;
  departmentId: string;
  departmentName: string;
  currentStep: number;
  status: string; // ApprovalChainStatus
  steps: ChainStep[];
  transferredFrom: string | null;
};

export type VersionChanges = {
  action: "SUBMITTED" | "APPROVED" | "FLAGGED" | "REJECTED";
  chainDeptName?: string;
  fields?: Record<string, { from: unknown; to: unknown }>;
  pdfChanged?: boolean;
  prevPdfName?: string | null;
  newPdfName?: string | null;
};

export type SerializedVersion = {
  id: string;
  versionNumber: number;
  title: string;
  description: string | null;
  type: string;
  budget: number | null;
  dateEst: string | null;
  location: string | null;
  metadata: Record<string, unknown> | null;
  coverImageUrl: string | null;
  imageGradient: string | null;
  editorId: string | null;
  editorName: string;
  changes: VersionChanges | null;
  createdAt: string;
};

export type SerializedMeeting = {
  id:            string;
  title:         string;
  description:   string | null;
  scheduledAt:   string; // ISO string
  location:      string | null;
  organizerId:   string | null;
  organizerName: string;
  createdAt:     string;
};

export type SerializedComment = {
  id:            string;
  authorName:    string;
  authorInitial: string | null;
  content:       string;
  createdAt:     string;
};

/* ── Helpers ─────────────────────────────────────────────────── */

function fmtBudget(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(n);
}

function shortId(id: string): string {
  return "PR-" + id.slice(-8).toUpperCase();
}

/* ── Status Badge ────────────────────────────────────────────── */

const STATUS_BADGE: Record<string, { label: string; bg: string; text: string; border: string; glow?: string }> = {
  APPROVED:      { label: "Approved",        bg: "#d3dbd6",               text: "#0f1d19", border: "transparent" },
  FLAGGED:       { label: "Flagged",         bg: "rgba(186,26,26,0.1)",  text: "#ba1a1a", border: "rgba(186,26,26,0.2)" },
  ACTIVE:        { label: "Active",          bg: "#c2ebdc",               text: "#0f2e22", border: "transparent" },
  DRAFT:         { label: "Draft",           bg: "rgba(112,121,119,0.1)", text: "#3d4a47", border: "rgba(112,121,119,0.2)" },
  REJECTED:      { label: "Rejected",        bg: "rgba(159,64,61,0.1)",   text: "#9f403d", border: "rgba(159,64,61,0.2)" },
  COMPLETED:     { label: "Completed",       bg: "rgba(45,83,73,0.12)",   text: "#2d5349", border: "rgba(45,83,73,0.25)" },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_BADGE[status] ?? STATUS_BADGE.DRAFT;
  return (
    <span
      className="px-4 py-1.5 rounded-full font-label font-black text-[10px] uppercase tracking-[0.15em]"
      style={{
        backgroundColor: cfg.bg,
        color: cfg.text,
        border: `1px solid ${cfg.border}`,
        boxShadow: cfg.glow ? `0 0 12px ${cfg.glow}` : "none",
      }}
    >
      {cfg.label}
    </span>
  );
}

/* ── Author Avatar ───────────────────────────────────────────── */

function AuthorAvatar({
  name,
  initial,
  iconName,
  size = 10,
  ring = false,
}: {
  name: string;
  initial: string | null;
  iconName: string | null;
  size?: number;
  ring?: boolean;
}) {
  const dim = `${size * 4}px`;
  return (
    <div
      title={name}
      className="rounded-full flex items-center justify-center shrink-0 overflow-hidden"
      style={{
        width: dim,
        height: dim,
        backgroundColor: "#c2ebdc",
        color: "#2d5349",
        border: ring ? "2px solid #f0f4f3" : "none",
        fontFamily: "Space Grotesk, sans-serif",
        fontWeight: 700,
        fontSize: "0.7rem",
      }}
    >
      {iconName ? (
        <span className="material-symbols-outlined" style={{ fontSize: "1rem", color: "#2d5349" }}>
          {iconName}
        </span>
      ) : (
        <span>{initial ?? name.charAt(0).toUpperCase()}</span>
      )}
    </div>
  );
}

/* ── Department chain avatar bar ─────────────────────────────── */
// One horizontal strip per department chain.
// Each member slot corresponds to a step; the slot state is derived from
// that step's current status: approved / active / pending.

function ChainAvatar({
  name,
  initial,
  stepStatus,
  isApprovedByUser,
}: {
  name: string;
  initial: string;
  stepStatus: ChainStep["status"];
  isApprovedByUser: boolean;
}) {
  const approved = stepStatus === "APPROVED";
  const active   = stepStatus === "ACTIVE" || stepStatus === "FLAGGED";
  const flagged  = stepStatus === "FLAGGED";

  const bg     = approved ? "#c2ebdc" : active ? "#40665a" : "#e9efee";
  const color  = approved ? "#0f2e22" : active ? "#ffffff" : "#a9b4b3";
  const border = approved || active ? "#40665a" : "rgba(169,180,179,0.35)";
  const opacity = (!approved && !active) ? 0.45 : 1;

  return (
    <div
      className="relative shrink-0"
      style={{ opacity }}
    >
      <div
        title={`${name}${approved ? " · Approved" : active ? " · Awaiting review" : " · Pending"}`}
        className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold border-2"
        style={{ backgroundColor: bg, color, borderColor: border }}
      >
        {active && !flagged ? (
          /* pulsing dot for the active reviewer */
          <span className="relative flex h-full w-full items-center justify-center">
            <span
              className="absolute inline-flex h-full w-full rounded-full opacity-30 animate-ping"
              style={{ backgroundColor: "#c2ebdc" }}
            />
            <span className="relative">{initial}</span>
          </span>
        ) : (
          initial
        )}
      </div>

      {/* Checkmark badge for approved */}
      {approved && (
        <div
          className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center"
          style={{ backgroundColor: "#40665a", border: "1.5px solid #f0f4f3" }}
        >
          <span className="material-symbols-outlined text-white" style={{ fontSize: "8px" }}>
            check
          </span>
        </div>
      )}

      {/* Flag badge */}
      {flagged && (
        <div
          className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center"
          style={{ backgroundColor: "#ba1a1a", border: "1.5px solid #f0f4f3" }}
        >
          <span className="material-symbols-outlined text-white" style={{ fontSize: "8px" }}>
            flag
          </span>
        </div>
      )}

      {/* Subtle "you" indicator for the current user */}
      {isApprovedByUser && (
        <div
          className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full"
          style={{ backgroundColor: "#40665a", border: "1.5px solid #f0f4f3" }}
        />
      )}
    </div>
  );
}

function DepartmentChainBar({
  chain,
  currentUserId,
  compact = false,
}: {
  chain: SerializedChain;
  currentUserId: string | null;
  compact?: boolean;
}) {
  // Flatten all member slots in step order
  type MemberSlot = {
    key: string;
    userId: string | null;
    name: string;
    initial: string;
    stepStatus: ChainStep["status"];
    approvedByThisUser: boolean;
  };

  const slots: MemberSlot[] = chain.steps.flatMap((step, si) =>
    step.members.map((m, mi) => ({
      key: `${si}-${mi}`,
      userId: m.userId,
      name: m.name,
      initial: m.initial,
      stepStatus: step.status,
      approvedByThisUser:
        !!currentUserId &&
        step.approvals.some((a) => a.userId === currentUserId),
    }))
  );

  const chainDone   = chain.status === "APPROVED";
  const chainFailed = chain.status === "REJECTED";

  return (
    <div className="flex flex-col gap-1.5">
      {/* Label row */}
      <div className="flex items-center gap-2">
        <span
          className="font-label text-[9px] uppercase tracking-[0.12em] font-bold truncate max-w-[120px]"
          style={{ color: "#576160" }}
        >
          {chain.departmentName}
        </span>
        {chain.transferredFrom && (
          <span
            className="font-label text-[8px] uppercase tracking-widest px-1.5 py-0.5 rounded"
            style={{ backgroundColor: "rgba(45,83,73,0.1)", color: "#40665a" }}
          >
            transferred
          </span>
        )}
        {chainDone && (
          <span className="material-symbols-outlined text-[14px]" style={{ color: "#40665a" }}>
            verified
          </span>
        )}
        {chainFailed && (
          <span className="material-symbols-outlined text-[14px]" style={{ color: "#ba1a1a" }}>
            cancel
          </span>
        )}
      </div>

      {/* Avatar strip */}
      {slots.length > 0 ? (
        <div className="flex items-center" style={{ gap: "-4px" }}>
          {slots.map((slot, idx) => (
            <div key={slot.key} style={{ marginLeft: idx === 0 ? 0 : "-8px", zIndex: slots.length - idx }}>
              <ChainAvatar
                name={slot.name}
                initial={slot.initial}
                stepStatus={slot.stepStatus}
                isApprovedByUser={slot.approvedByThisUser}
              />
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[10px]" style={{ color: "#a9b4b3" }}>No reviewers assigned</p>
      )}

      {/* Step label for active step */}
      {!compact && (() => {
        const activeStep = chain.steps[Math.min(chain.currentStep, chain.steps.length - 1)];
        if (!activeStep) return null;
        const label =
          chain.status === "APPROVED" ? "All steps approved" :
          chain.status === "REJECTED" ? "Rejected" :
          activeStep.status === "FLAGGED" ? `${activeStep.label} · Flagged` :
          `Awaiting ${activeStep.label}`;
        return (
          <p
            className="font-label text-[9px] tracking-wide"
            style={{ color: chain.status === "APPROVED" ? "#40665a" : chain.status === "REJECTED" ? "#ba1a1a" : "#576160" }}
          >
            {label}
          </p>
        );
      })()}
    </div>
  );
}

/* ── All department chain bars (header area) ─────────────────── */

function ApprovalChainBars({
  chains,
  currentUserId,
  proposal,
}: {
  chains: SerializedChain[];
  currentUserId: string | null;
  proposal: SerializedProposal;
}) {
  if (chains.length === 0) return null;

  return (
    <div className="flex flex-col gap-3 items-end">
      {chains.map((chain) => (
        <DepartmentChainBar
          key={chain.id}
          chain={chain}
          currentUserId={currentUserId}
          compact={chains.length > 2}
        />
      ))}
    </div>
  );
}

/* ── Transfer to department section ──────────────────────────── */

function TransferSection({
  proposalId,
  departments,
  existingChains,
  isPending,
  startTransition,
}: {
  proposalId: string;
  departments: { id: string; name: string; members: { userId: string | null; name: string; role: string }[] }[];
  existingChains: SerializedChain[];
  isPending: boolean;
  startTransition: (fn: () => void) => void;
}) {
  const existingDeptIds = new Set(existingChains.map((c) => c.departmentId));
  const available = departments.filter((d) => !existingDeptIds.has(d.id));
  const [selectedId, setSelectedId] = useState("");

  if (available.length === 0) return null;

  return (
    <div
      className="flex flex-col gap-3 pt-4"
      style={{ borderTop: "1px solid rgba(169,180,179,0.15)" }}
    >
      <p
        className="font-label text-[10px] uppercase tracking-widest font-bold"
        style={{ color: "#576160" }}
      >
        Transfer to Department
      </p>

      <select
        value={selectedId}
        onChange={(e) => setSelectedId(e.target.value)}
        className="w-full px-3 py-2 rounded-lg text-xs font-body"
        style={{
          backgroundColor: "#f0f4f3",
          border: "1px solid rgba(169,180,179,0.25)",
          color: "#2a3434",
          outline: "none",
        }}
      >
        <option value="">Select department…</option>
        {available.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name}
          </option>
        ))}
      </select>

      <button
        disabled={!selectedId || isPending}
        onClick={() =>
          startTransition(() => {
            void transferToAdditionalDepartment(proposalId, selectedId).then(
              () => setSelectedId(""),
            );
          })
        }
        className="flex items-center justify-center gap-2 py-3 rounded-lg text-xs font-label uppercase font-bold transition-all hover:opacity-80 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ backgroundColor: "#40665a", color: "#defff2", border: "none" }}
      >
        <span className="material-symbols-outlined text-sm">share</span>
        Transfer
      </button>
    </div>
  );
}

/* ── Metadata Row ────────────────────────────────────────────── */

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label
        className="font-label text-[10px] uppercase tracking-widest mb-1.5 block"
        style={{ color: "#576160" }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

/* ── Action Button ───────────────────────────────────────────── */

function ActionButton({
  label,
  icon,
  variant,
  onClick,
  disabled,
}: {
  label: string;
  icon: string;
  variant: "primary" | "outline" | "danger";
  onClick: () => void;
  disabled?: boolean;
}) {
  const styles: Record<string, React.CSSProperties> = {
    primary: { backgroundColor: "#40665a", color: "#defff2", border: "none" },
    outline: { backgroundColor: "transparent", color: "#2a3434", border: "1px solid #727d7c" },
    danger:  { backgroundColor: "transparent", color: "#9f403d", border: "1px solid rgba(159,64,61,0.3)" },
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center justify-center gap-2 py-3 rounded-lg text-xs font-label uppercase font-bold transition-all hover:opacity-80 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
      style={styles[variant]}
    >
      <span className="material-symbols-outlined text-sm">{icon}</span>
      {label}
    </button>
  );
}


/* ── Main Component ──────────────────────────────────────────── */

export default function ProposalDetailClient({
  proposal,
  currentUserId,
  currentUserName: _currentUserName,
  canManageProposal,
  chains,
  departments,
  versions,
  meetings,
  comments: initialComments,
}: {
  proposal: SerializedProposal;
  currentUserId: string | null;
  currentUserName: string | null;
  canManageProposal: boolean;
  chains: SerializedChain[];
  departments: { id: string; name: string; members: { userId: string | null; name: string; role: string }[] }[];
  versions: SerializedVersion[];
  meetings: SerializedMeeting[];
  comments: SerializedComment[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isReplacing, startReplaceTransition] = useTransition();
  const [isBannerUploading, startBannerTransition] = useTransition();
  const [isRestoring, startRestoreTransition] = useTransition();
  const [isSavingEdit, startSaveEditTransition] = useTransition();
  const [isDeletingProposal, startDeleteTransition] = useTransition();
  const [isMeetingPending, startMeetingTransition] = useTransition();
  const [isCommentPending, startCommentTransition] = useTransition();

  // Comment discussion state
  const [comments, setComments] = useState<SerializedComment[]>(initialComments);
  const [commentText, setCommentText] = useState("");
  const [commentError, setCommentError] = useState<string | null>(null);
  const [briefTab, setBriefTab] = useState<"brief" | "discussion">("brief");
  const commentsEndRef = useRef<HTMLDivElement>(null);

  const [pdfPage, setPdfPage] = useState(1);
  const [pdfPageCount, setPdfPageCount] = useState<number | null>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const bannerUploadRef = useRef<HTMLInputElement>(null);

  // Version history state
  const [viewingVersion, setViewingVersion] = useState<SerializedVersion | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Meetings state
  const [meetingsOpen, setMeetingsOpen] = useState(false);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [meetTitle, setMeetTitle]       = useState("");
  const [meetDesc, setMeetDesc]         = useState("");
  const [meetDate, setMeetDate]         = useState("");
  const [meetLocation, setMeetLocation] = useState("");
  const [meetError, setMeetError]       = useState<string | null>(null);

  // Inline edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle]       = useState(proposal.title);
  const [editDesc, setEditDesc]         = useState(proposal.description ?? "");
  const [editBudget, setEditBudget]     = useState(proposal.budget?.toString() ?? "");
  const [editDateEst, setEditDateEst]   = useState(proposal.dateEst ?? "");
  const [editLocation, setEditLocation] = useState(proposal.location ?? "");
  const [editType, setEditType]         = useState(proposal.type);

  // The data currently displayed — either the live proposal or a past version
  const display = viewingVersion ?? {
    title:         proposal.title,
    description:   proposal.description,
    type:          proposal.type,
    budget:        proposal.budget,
    dateEst:       proposal.dateEst,
    location:      proposal.location,
    metadata:      proposal.metadata,
    coverImageUrl: proposal.coverImageUrl,
    imageGradient: proposal.imageGradient,
  };

  const pid = shortId(proposal.id);
  const primaryAuthor = proposal.authors.find((a) => a.isPrimary) ?? proposal.authors[0];
  // When viewing a past version, prefer that version's stored attachment URL.
  // Fall back to the live proposal's file for versions snapshotted before per-version
  // storage was introduced (those old URLs were deleted on replacement).
  const liveMeta = proposal.metadata as Record<string, unknown> | null;
  const displayMeta = display.metadata as Record<string, unknown> | null;
  const attachmentUrl =
    (displayMeta?.attachmentUrl as string | null) ??
    (liveMeta?.attachmentUrl as string | null) ??
    null;
  const attachmentName =
    (displayMeta?.attachmentName as string | null) ??
    (liveMeta?.attachmentName as string | null) ??
    null;
  const isPdfAttachment = attachmentName?.toLowerCase().endsWith(".pdf") ?? false;
  // meta alias kept for non-attachment metadata fields
  const meta = displayMeta;

  useEffect(() => { setPdfPage(1); }, [proposal.id, proposal.updatedAt]);

  useEffect(() => {
    if (briefTab === "discussion") {
      commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [briefTab, comments.length]);

  useEffect(() => {
    setPdfPageCount(null);
    if (!isPdfAttachment || !attachmentUrl) return;
    const loadingTask = getDocument(attachmentUrl);
    let cancelled = false;
    loadingTask.promise
      .then(async (pdf) => {
        if (!cancelled) setPdfPageCount(pdf.numPages);
        await pdf.destroy();
      })
      .catch(() => { if (!cancelled) setPdfPageCount(null); });
    return () => {
      cancelled = true;
      void loadingTask.destroy();
    };
  }, [attachmentUrl, isPdfAttachment]);

  /* ── Approval chain helpers ─────────────────────────────────── */

  // Chains where the current user sits in the active step
  const chainsAwaitingMe = chains.filter((chain) => {
    if (chain.status !== "ACTIVE") return false;
    const step = chain.steps[chain.currentStep];
    return (
      (step?.status === "ACTIVE" || step?.status === "FLAGGED") &&
      step.members.some((m) => m.userId === currentUserId)
    );
  });

  // Approved chains where the current user is in the HEAD step (can transfer)
  const approvedHeadChains = chains.filter((chain) => {
    if (chain.status !== "APPROVED") return false;
    const lastStep = chain.steps[chain.steps.length - 1];
    return (
      lastStep?.role === "HEAD" &&
      lastStep.members.some((m) => m.userId === currentUserId)
    );
  });

  const hasChains = chains.length > 0;

  /* ── Action buttons ─────────────────────────────────────────── */

  function ActionButtons() {
    // DRAFT with no chains: allow submission
    if (proposal.status === "DRAFT" && !hasChains) {
      return (
        <div className="grid grid-cols-1 gap-3">
          <ActionButton
            label="Submit for Review"
            icon="send"
            variant="primary"
            onClick={() => startTransition(() => { void submitForReview(proposal.id); })}
            disabled={isPending}
          />
        </div>
      );
    }

    // ACTIVE — show "Complete Event" for managers
    if (proposal.status === "ACTIVE") {
      return (
        <div className="flex flex-col gap-3">
          <p className="font-label text-[10px] uppercase tracking-widest text-center" style={{ color: "#a9b4b3" }}>
            Proposal is live
          </p>
          {canManageProposal && (
            <ActionButton
              label="Mark as Completed"
              icon="task_alt"
              variant="outline"
              onClick={() => {
                if (confirm("Mark this event as completed? It will move to the archive.")) {
                  startTransition(() => { void completeProposal(proposal.id); });
                }
              }}
              disabled={isPending}
            />
          )}
        </div>
      );
    }

    if (proposal.status === "COMPLETED") {
      return (
        <div className="flex flex-col gap-3">
          <p className="font-label text-[10px] uppercase tracking-widest text-center" style={{ color: "#2d5349" }}>
            Event completed
          </p>
          <Link
            href="/proposals/archived"
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-label font-black text-[11px] uppercase tracking-widest transition-all hover:opacity-80"
            style={{ backgroundColor: "#dce5e3", color: "#1a1f1f" }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "1rem" }}>inventory_2</span>
            View in Archive
          </Link>
        </div>
      );
    }

    if (proposal.status === "REJECTED") {
      return (
        <p className="font-label text-[10px] uppercase tracking-widest text-center py-2" style={{ color: "#9f403d" }}>
          Proposal rejected
        </p>
      );
    }

    // Department-chain-driven flow
    if (hasChains) {
      return (
        <div className="flex flex-col gap-4">

          {/* ── Per-chain review actions ── */}
          {chainsAwaitingMe.map((chain) => {
            const step = chain.steps[chain.currentStep];
            const isFlagged = step?.status === "FLAGGED";
            return (
              <div key={chain.id} className="flex flex-col gap-2">
                {/* Department label */}
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="font-label text-[9px] uppercase tracking-widest font-bold"
                    style={{ color: "#576160" }}
                  >
                    {chain.departmentName}
                  </span>
                  {isFlagged && (
                    <span
                      className="font-label text-[8px] uppercase tracking-widest px-1.5 py-0.5 rounded font-bold"
                      style={{ backgroundColor: "rgba(186,26,26,0.1)", color: "#ba1a1a" }}
                    >
                      Flagged
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <ActionButton
                    label="Approve"
                    icon="check_circle"
                    variant="primary"
                    onClick={() =>
                      startTransition(() => { void approveChainStep(proposal.id, chain.id); })
                    }
                    disabled={isPending}
                  />
                  {!isFlagged && (
                    <ActionButton
                      label="Flag"
                      icon="flag"
                      variant="outline"
                      onClick={() =>
                        startTransition(() => { void flagChainStep(proposal.id, chain.id); })
                      }
                      disabled={isPending}
                    />
                  )}
                  <ActionButton
                    label="Reject"
                    icon="cancel"
                    variant="danger"
                    onClick={() =>
                      startTransition(() => { void rejectChainStep(proposal.id, chain.id); })
                    }
                    disabled={isPending}
                  />
                </div>
              </div>
            );
          })}

          {/* ── No actions for current user ── */}
          {chainsAwaitingMe.length === 0 && proposal.status !== "APPROVED" && (
            <p
              className="font-label text-[10px] uppercase tracking-widest text-center py-2"
              style={{ color: "#a9b4b3" }}
            >
              Awaiting other reviewers
            </p>
          )}

          {/* ── Activate once fully approved ── */}
          {proposal.status === "APPROVED" && (
            <ActionButton
              label="Activate"
              icon="bolt"
              variant="primary"
              onClick={() => startTransition(() => { void activateProposal(proposal.id); })}
              disabled={isPending}
            />
          )}

          {/* ── Head transfer section ── */}
          {approvedHeadChains.length > 0 && (
            <TransferSection
              proposalId={proposal.id}
              departments={departments}
              existingChains={chains}
              isPending={isPending}
              startTransition={startTransition}
            />
          )}
        </div>
      );
    }

    // ── Legacy fallback (no chains — proposals created before this feature) ──
    if (proposal.status === "APPROVED") {
      return (
        <div className="grid grid-cols-1 gap-3">
          <ActionButton
            label="Activate"
            icon="bolt"
            variant="primary"
            onClick={() => startTransition(() => { void activateProposal(proposal.id); })}
            disabled={isPending}
          />
        </div>
      );
    }
    return (
      <p className="font-label text-[10px] uppercase tracking-widest text-center py-2" style={{ color: "#a9b4b3" }}>
        No actions available
      </p>
    );
  }

  /* ── Render ─────────────────────────────────────────────────── */

  return (
    <div className="flex flex-col gap-8">

      {/* ── Breadcrumb ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/proposals"
            className="flex items-center gap-2 font-label text-[10px] uppercase tracking-widest font-bold transition-opacity hover:opacity-60"
            style={{ color: "#576160" }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "1rem" }}>arrow_back</span>
            All Proposals
          </Link>
          <span style={{ color: "rgba(169,180,179,0.5)" }}>·</span>
          <span className="font-label text-[10px] uppercase tracking-widest font-bold" style={{ color: "#40665a" }}>
            {pid}
          </span>
        </div>

        {/* Version navigator */}
        {versions.length > 0 && (
          <div className="flex items-center gap-2">
            {viewingVersion && (
              <button
                onClick={() => setViewingVersion(null)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-label font-bold text-[10px] uppercase tracking-widest transition-all hover:opacity-80"
                style={{ backgroundColor: "#40665a", color: "#defff2" }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: "0.9rem" }}>undo</span>
                Current
              </button>
            )}
            <div
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg"
              style={{ backgroundColor: "#f0f4f3", border: "1px solid rgba(169,180,179,0.2)" }}
            >
              {/* Prev version (older) */}
              <button
                onClick={() => {
                  const curIdx = viewingVersion
                    ? versions.findIndex((v) => v.id === viewingVersion.id)
                    : -1;
                  const nextIdx = curIdx === -1 ? 0 : curIdx + 1;
                  if (nextIdx < versions.length) setViewingVersion(versions[nextIdx]);
                }}
                disabled={viewingVersion ? versions.findIndex((v) => v.id === viewingVersion.id) >= versions.length - 1 : false}
                className="p-1 rounded transition-all hover:opacity-70 disabled:opacity-30"
                title="Older version"
              >
                <span className="material-symbols-outlined" style={{ fontSize: "1rem", color: "#576160" }}>chevron_left</span>
              </button>

              <span className="font-label font-bold text-[10px] px-1" style={{ color: "#2a3434", minWidth: "4rem", textAlign: "center" }}>
                {viewingVersion
                  ? `V${viewingVersion.versionNumber} of ${versions.length}`
                  : `Current · ${versions.length}v`}
              </span>

              {/* Next version (newer) */}
              <button
                onClick={() => {
                  if (!viewingVersion) return;
                  const curIdx = versions.findIndex((v) => v.id === viewingVersion.id);
                  if (curIdx > 0) setViewingVersion(versions[curIdx - 1]);
                  else setViewingVersion(null);
                }}
                disabled={!viewingVersion}
                className="p-1 rounded transition-all hover:opacity-70 disabled:opacity-30"
                title="Newer version"
              >
                <span className="material-symbols-outlined" style={{ fontSize: "1rem", color: "#576160" }}>chevron_right</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Viewing past version banner ──────────────────────────── */}
      {viewingVersion && (
        <div
          className="flex items-center justify-between px-5 py-3 rounded-xl"
          style={{ backgroundColor: "rgba(45,83,73,0.08)", border: "1px solid rgba(64,102,90,0.2)" }}
        >
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-base" style={{ color: "#40665a" }}>history</span>
            <div>
              <p className="font-label font-black text-[10px] uppercase tracking-widest" style={{ color: "#40665a" }}>
                Viewing Version {viewingVersion.versionNumber}
              </p>
              <p className="font-body text-xs mt-0.5" style={{ color: "#576160" }}>
                Saved by <strong>{viewingVersion.editorName}</strong> on{" "}
                {new Date(viewingVersion.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}{" "}
                at {new Date(viewingVersion.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>
          <button
            onClick={() =>
              startRestoreTransition(async () => {
                await restoreVersion(proposal.id, viewingVersion.id);
                setViewingVersion(null);
              })
            }
            disabled={isRestoring}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-label font-bold text-[10px] uppercase tracking-widest transition-all hover:opacity-80 disabled:opacity-40"
            style={{ backgroundColor: "#40665a", color: "#defff2" }}
          >
            <span className="material-symbols-outlined text-sm">restore</span>
            {isRestoring ? "Restoring…" : "Restore this version"}
          </button>
        </div>
      )}

      {/* ── Header Bar ──────────────────────────────────────────── */}
      <div
        className="flex justify-between items-start gap-6 p-4 rounded-xl"
        style={{
          backgroundColor: "#f0f4f3",
          border: "1px solid rgba(169,180,179,0.1)",
        }}
      >
        {/* Left: ID + title + status */}
        <div className="flex items-center gap-4 min-w-0 py-1">
          <h3
            className="font-headline font-bold text-lg shrink-0"
            style={{ color: "#40665a" }}
          >
            {pid}
          </h3>
          <div className="h-8 w-[1px]" style={{ backgroundColor: "rgba(169,180,179,0.2)" }} />
          <span
            className="font-label text-xs uppercase tracking-widest font-medium truncate"
            style={{ color: "#576160" }}
          >
            {display.title}
          </span>
          <StatusBadge status={proposal.status} />
        </div>

      </div>

      {/* ── Chain legend (full detail, below header) ─────────────── */}
      {hasChains && (() => {
        const activeDeptIds = new Set(chains.map((c) => c.departmentId));
        const ghostDepts = departments.filter((d) => !activeDeptIds.has(d.id));
        const ROLE_TIERS: { role: string; label: string }[] = [
          { role: "MEMBER", label: "Member" },
          { role: "LEAD",   label: "Lead"   },
          { role: "HEAD",   label: "Head"   },
        ];

        return (
          <div
            className="px-6 py-4 rounded-2xl flex flex-col gap-4"
            style={{
              backgroundColor: "#f0f4f3",
              border: "1px solid rgba(169,180,179,0.08)",
            }}
          >
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-base" style={{ color: "#40665a" }}>
                account_tree
              </span>
              <h4
                className="font-label text-[10px] uppercase tracking-widest font-bold"
                style={{ color: "#40665a" }}
              >
                Approval Chains
              </h4>
            </div>

            <div className="flex flex-wrap gap-8 items-start">
              {/* ── Active chains ── */}
              {chains.map((chain) => (
                <div key={chain.id} className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="font-label text-[10px] uppercase tracking-widest font-bold"
                      style={{ color: "#2a3434" }}
                    >
                      {chain.departmentName}
                    </span>
                    {chain.transferredFrom && (
                      <span
                        className="font-label text-[8px] uppercase tracking-widest px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: "rgba(45,83,73,0.1)", color: "#40665a" }}
                      >
                        transferred
                      </span>
                    )}
                  </div>

                  <div className="relative flex items-center gap-0">
                    {chain.steps.map((step, si) => {
                      const approved = step.status === "APPROVED";
                      const active   = step.status === "ACTIVE" || step.status === "FLAGGED";
                      const flagged  = step.status === "FLAGGED";

                      return (
                        <div key={si} className="flex items-center">
                          {si > 0 && (
                            <div
                              className="w-6 h-[2px] shrink-0"
                              style={{
                                backgroundColor: approved || active ? "#40665a" : "rgba(169,180,179,0.3)",
                                opacity: step.status === "PENDING" ? 0.4 : 1,
                              }}
                            />
                          )}
                          <div className="flex flex-col items-center gap-1">
                            <span
                              className="font-label text-[8px] uppercase tracking-widest"
                              style={{ color: approved ? "#40665a" : active ? "#40665a" : "#a9b4b3" }}
                            >
                              {step.role === "HEAD" ? "Head" : step.role === "LEAD" ? "Lead" : "Member"}
                              {flagged && " · ⚑"}
                            </span>
                            <div className="flex items-center">
                              {step.members.map((m, mi) => (
                                <div
                                  key={mi}
                                  style={{ marginLeft: mi === 0 ? 0 : "-6px", zIndex: step.members.length - mi }}
                                >
                                  <ChainAvatar
                                    name={m.name}
                                    initial={m.initial}
                                    stepStatus={step.status}
                                    isApprovedByUser={
                                      !!currentUserId &&
                                      step.approvals.some((a) => a.userId === currentUserId)
                                    }
                                  />
                                </div>
                              ))}
                            </div>
                            {step.approvals.length > 0 && (
                              <span className="font-label text-[8px] tracking-wide" style={{ color: "#40665a" }}>
                                {new Date(step.approvals[0].approvedAt).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                })}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* ── Divider between active and ghost ── */}
              {ghostDepts.length > 0 && (
                <div className="self-stretch w-[1px]" style={{ backgroundColor: "rgba(169,180,179,0.2)" }} />
              )}

              {/* ── Ghost departments (not yet transferred) ── */}
              {ghostDepts.map((dept) => {
                const tiers = ROLE_TIERS.filter((t) =>
                  dept.members.some((m) => m.role === t.role)
                );
                // Always show at least HEAD
                const visibleTiers = tiers.length > 0 ? tiers : [{ role: "HEAD", label: "Head" }];

                return (
                  <div key={dept.id} className="flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="font-label text-[10px] uppercase tracking-widest font-bold"
                        style={{ color: "#2a3434" }}
                      >
                        {dept.name}
                      </span>
                      <span
                        className="font-label text-[8px] uppercase tracking-widest px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: "rgba(169,180,179,0.18)", color: "#707e7c", border: "1px dashed rgba(169,180,179,0.5)" }}
                      >
                        not transferred
                      </span>
                    </div>

                    <div className="flex items-center gap-0">
                      {visibleTiers.map((tier, ti) => {
                        const members = dept.members.filter((m) => m.role === tier.role);
                        return (
                          <div key={tier.role} className="flex items-center">
                            {ti > 0 && (
                              <div
                                className="w-6 h-[2px] shrink-0"
                                style={{ backgroundColor: "rgba(169,180,179,0.45)" }}
                              />
                            )}
                            <div className="flex flex-col items-center gap-1">
                              <span
                                className="font-label text-[8px] uppercase tracking-widest"
                                style={{ color: "#707e7c" }}
                              >
                                {tier.label}
                              </span>
                              <div className="flex items-center">
                                {members.length > 0 ? members.map((m, mi) => (
                                  <div
                                    key={mi}
                                    title={m.name}
                                    className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold border-2 shrink-0"
                                    style={{
                                      marginLeft: mi === 0 ? 0 : "-6px",
                                      zIndex: members.length - mi,
                                      backgroundColor: "#dde5e3",
                                      color: "#576160",
                                      borderColor: "rgba(169,180,179,0.55)",
                                      borderStyle: "dashed",
                                    }}
                                  >
                                    {m.name.charAt(0).toUpperCase()}
                                  </div>
                                )) : (
                                  /* Placeholder if no members in this tier */
                                  <div
                                    className="w-8 h-8 rounded-full flex items-center justify-center border-2 shrink-0"
                                    style={{
                                      backgroundColor: "#dde5e3",
                                      borderColor: "rgba(169,180,179,0.55)",
                                      borderStyle: "dashed",
                                    }}
                                  />
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 pt-1">
              {[
                { dot: "#c2ebdc", border: "#40665a", label: "Approved" },
                { dot: "#40665a", border: "#40665a", label: "Awaiting" },
                { dot: "#e9efee", border: "rgba(169,180,179,0.35)", label: "Pending" },
              ].map(({ dot, border, label }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <div
                    className="w-3 h-3 rounded-full border"
                    style={{ backgroundColor: dot, borderColor: border }}
                  />
                  <span className="font-label text-[9px] tracking-wide" style={{ color: "#576160" }}>
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* ── Central Layout: Bento ──────────────────────────────── */}
      <div className="grid grid-cols-12 gap-6 relative">

        {/* Background glazing text */}
        <div
          className="absolute -right-4 top-0 select-none pointer-events-none overflow-hidden"
          style={{ opacity: 0.025 }}
        >
          <h1
            className="font-headline font-extrabold leading-none"
            style={{ fontSize: "10rem", color: "#40665a", writingMode: "vertical-rl", letterSpacing: "-0.02em" }}
          >
            {display.type}
          </h1>
        </div>

        {/* ── Left Column ─────────────────────────────────────── */}
        <div className="col-span-12 xl:col-span-8 flex flex-col gap-6">

          {/* Asset Viewer */}
          {(() => {
            const sourceAttachmentUrl = (meta?.sourceAttachmentUrl as string | null) ?? null;
            const sourceAttachmentName = (meta?.sourceAttachmentName as string | null) ?? null;
            const sourceIsPPTX = sourceAttachmentName?.toLowerCase().endsWith(".pptx") ?? false;
            const hasAttachment = !!attachmentUrl;
            const pdfViewerUrl = isPdfAttachment && attachmentUrl
              ? `${attachmentUrl}?viewerPage=${pdfPage}#page=${pdfPage}&view=FitH`
              : attachmentUrl;

            function handleUploadChange(e: React.ChangeEvent<HTMLInputElement>) {
              const f = e.target.files?.[0];
              if (!f) return;
              const fd = new FormData();
              fd.set("file", f);
              startReplaceTransition(async () => { await replaceAttachment(proposal.id, fd); });
              e.target.value = "";
            }

            const ctrlBtn = "flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-label font-bold text-[10px] uppercase tracking-widest";
            const ctrlStyle = { backgroundColor: "rgba(42,52,52,0.9)", color: "#f8faf9", border: "1px solid rgba(255,255,255,0.15)" };

            function handleBannerChange(e: React.ChangeEvent<HTMLInputElement>) {
              const f = e.target.files?.[0];
              if (!f) return;
              const fd = new FormData();
              fd.set("file", f);
              startBannerTransition(async () => { await replaceBannerImage(proposal.id, fd); });
              e.target.value = "";
            }

            return (
              <div className="group relative rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(169,180,179,0.1)" }}>
                <input ref={uploadRef} type="file" accept=".pptx,.pdf" className="hidden" onChange={handleUploadChange} />
                <input ref={bannerUploadRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={handleBannerChange} />

                {(() => {
                  // Banner stored in metadata.bannerUrl — use plain <img> to avoid
                  // next/image optimization issues with locally-written files.
                  const bannerUrl = (displayMeta?.bannerUrl as string | null) ?? null;
                  if (isPdfAttachment && attachmentUrl) {
                    return (
                      <div style={{ height: "520px" }}>
                        <iframe
                          key={pdfViewerUrl ?? "proposal-viewer"}
                          src={pdfViewerUrl ?? undefined}
                          className="w-full h-full"
                          style={{ border: "none", display: "block" }}
                          title={attachmentName ?? "Proposal PDF"}
                        />
                      </div>
                    );
                  }
                  if (bannerUrl) {
                    return (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={bannerUrl}
                        alt={display.title}
                        className="w-full aspect-video object-cover transition-transform duration-500 group-hover:scale-[1.01]"
                        style={{ display: "block" }}
                      />
                    );
                  }
                  if (display.coverImageUrl) {
                    return (
                      <div className="relative aspect-video">
                        <Image
                          src={display.coverImageUrl}
                          alt={display.title}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-[1.01]"
                          sizes="(max-width: 1280px) 100vw, 66vw"
                        />
                      </div>
                    );
                  }
                  return (
                    <div
                      className="aspect-video"
                      style={{ background: display.imageGradient ?? "#e9efee" }}
                    />
                  );
                })()}

                {/* Top-right controls */}
                <div className="absolute top-4 right-4 flex gap-2 z-40">
                  {hasAttachment && (
                    <a href={attachmentUrl!} download={attachmentName ?? true} className={ctrlBtn} style={ctrlStyle}>
                      <span className="material-symbols-outlined text-sm">download</span>
                      Download PDF
                    </a>
                  )}
                  {sourceIsPPTX && sourceAttachmentUrl && (
                    <a href={sourceAttachmentUrl} download={sourceAttachmentName ?? true} className={ctrlBtn} style={ctrlStyle}>
                      <span className="material-symbols-outlined text-sm">slideshow</span>
                      Original PPTX
                    </a>
                  )}
                  {/* Banner image upload — always visible, separate from the PDF slot */}
                  {(() => {
                    const hasBanner = !!(liveMeta?.bannerUrl as string | null);
                    return (
                      <button
                        onClick={() => bannerUploadRef.current?.click()}
                        disabled={isBannerUploading}
                        className={ctrlBtn}
                        style={ctrlStyle}
                        title={hasBanner ? "Replace banner image" : "Upload banner image"}
                      >
                        {isBannerUploading ? (
                          <span className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin inline-block" />
                        ) : (
                          <span className="material-symbols-outlined text-sm">image</span>
                        )}
                        {isBannerUploading ? "Uploading…" : hasBanner ? "Banner" : "Add Banner"}
                      </button>
                    );
                  })()}
                  {/* PDF / PPTX upload */}
                  <button
                    onClick={() => uploadRef.current?.click()}
                    disabled={isReplacing}
                    className={ctrlBtn}
                    style={ctrlStyle}
                  >
                    {isReplacing ? (
                      <span className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin inline-block" />
                    ) : (
                      <span className="material-symbols-outlined text-sm">upload</span>
                    )}
                    {isReplacing ? "Uploading…" : hasAttachment ? "Replace" : "Upload"}
                  </button>
                </div>

                {/* Bottom-right navigation */}
                <div className="absolute bottom-4 right-4 flex items-center gap-2 z-40">
                  <div
                    className="px-4 py-2 rounded-lg"
                    style={{ backgroundColor: "rgba(42,52,52,0.85)", backdropFilter: "blur(4px)" }}
                  >
                    <p className="font-label text-[10px] uppercase tracking-[0.2em] whitespace-nowrap" style={{ color: "#f0f4f3" }}>
                      {hasAttachment ? "PDF PREVIEW" : "VIEW"} · {display.type.replace(/_/g, " ")}
                    </p>
                  </div>
                  {isPdfAttachment && (
                    <div className="flex gap-1">
                      <div
                        className="px-3 py-2 rounded-lg font-label font-bold text-[10px] uppercase tracking-widest"
                        style={{ backgroundColor: "rgba(42,52,52,0.85)", color: "#f8faf9" }}
                      >
                        Page {pdfPage}{pdfPageCount ? ` / ${pdfPageCount}` : ""}
                      </div>
                      <button
                        disabled={pdfPage <= 1}
                        className="p-2 rounded-lg transition-all"
                        style={{ backgroundColor: "rgba(42,52,52,0.85)", color: "#f8faf9", opacity: pdfPage <= 1 ? 0.4 : 1 }}
                        onClick={() => setPdfPage((p) => Math.max(1, p - 1))}
                      >
                        <span className="material-symbols-outlined text-base">chevron_left</span>
                      </button>
                      <button
                        disabled={pdfPageCount != null && pdfPage >= pdfPageCount}
                        className="p-2 rounded-lg transition-all"
                        style={{
                          backgroundColor: "rgba(42,52,52,0.85)",
                          color: "#f8faf9",
                          opacity: pdfPageCount != null && pdfPage >= pdfPageCount ? 0.4 : 1,
                        }}
                        onClick={() => setPdfPage((p) => pdfPageCount != null ? Math.min(pdfPageCount, p + 1) : p + 1)}
                      >
                        <span className="material-symbols-outlined text-base">chevron_right</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Brief & Context + Peer Discussion tabs */}
          <div
            className="rounded-2xl overflow-hidden flex flex-col"
            style={{ backgroundColor: "#f0f4f3", border: "1px solid rgba(169,180,179,0.1)", minHeight: "500px" }}
          >
            {/* Tab bar */}
            <div
              className="flex border-b"
              style={{ borderColor: "rgba(169,180,179,0.1)", backgroundColor: "rgba(248,250,249,0.5)" }}
            >
              <button
                onClick={() => setBriefTab("brief")}
                className="px-6 py-4 font-headline font-bold text-xs uppercase tracking-widest transition-colors"
                style={{
                  color: briefTab === "brief" ? "#40665a" : "rgba(87,97,96,0.6)",
                  borderBottom: briefTab === "brief" ? "2px solid #40665a" : "2px solid transparent",
                  backgroundColor: briefTab === "brief" ? "#f8faf9" : "transparent",
                }}
              >
                Brief &amp; Context
              </button>
              <button
                onClick={() => setBriefTab("discussion")}
                className="px-6 py-4 font-headline font-bold text-xs uppercase tracking-widest transition-colors flex items-center gap-2"
                style={{
                  color: briefTab === "discussion" ? "#40665a" : "rgba(87,97,96,0.6)",
                  borderBottom: briefTab === "discussion" ? "2px solid #40665a" : "2px solid transparent",
                  backgroundColor: briefTab === "discussion" ? "#f8faf9" : "transparent",
                }}
              >
                Peer Discussion
                {comments.length > 0 && (
                  <span
                    className="px-2 py-0.5 rounded-full font-label text-[10px]"
                    style={{ backgroundColor: "rgba(64,102,90,0.1)", color: "#40665a" }}
                  >
                    {comments.length}
                  </span>
                )}
              </button>

              {/* Right-side edit button — only visible on brief tab */}
              {briefTab === "brief" && (
                <div className="ml-auto flex items-center gap-3 px-4">
                  {proposal.tags.length > 0 && (
                    <div className="hidden md:flex flex-wrap gap-2">
                      {proposal.tags.map((t) => (
                        <span
                          key={t.id}
                          className="px-2 py-1 text-[10px] font-bold uppercase tracking-tight rounded"
                          style={{ backgroundColor: "#dae5e3", color: "#40665a" }}
                        >
                          {t.label}
                        </span>
                      ))}
                    </div>
                  )}
                  {!viewingVersion && (
                    <button
                      onClick={() => {
                        setEditTitle(proposal.title);
                        setEditDesc(proposal.description ?? "");
                        setEditBudget(proposal.budget?.toString() ?? "");
                        setEditDateEst(proposal.dateEst ?? "");
                        setEditLocation(proposal.location ?? "");
                        setEditType(proposal.type);
                        setIsEditing((v) => !v);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-label font-bold text-[10px] uppercase tracking-widest transition-all hover:opacity-80"
                      style={isEditing
                        ? { backgroundColor: "rgba(186,26,26,0.08)", color: "#ba1a1a", border: "1px solid rgba(186,26,26,0.2)" }
                        : { backgroundColor: "#e9efee", color: "#576160", border: "1px solid rgba(169,180,179,0.2)" }
                      }
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: "0.85rem" }}>
                        {isEditing ? "close" : "edit"}
                      </span>
                      {isEditing ? "Cancel" : "Edit"}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* ── Discussion tab content ── */}
            {briefTab === "discussion" ? (
              <div className="flex flex-col flex-1" style={{ minHeight: "420px" }}>
                {/* Comment stream */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6" style={{ maxHeight: "360px" }}>
                  {comments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-2 opacity-50">
                      <span className="material-symbols-outlined text-3xl" style={{ color: "#9ba8a7" }}>forum</span>
                      <p className="font-label text-[10px] uppercase tracking-widest" style={{ color: "#9ba8a7" }}>
                        No discussion yet — be the first
                      </p>
                    </div>
                  ) : (
                    comments.map((c) => (
                      <div key={c.id} className="flex gap-4">
                        {/* Avatar */}
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-headline font-bold text-[11px]"
                          style={{ backgroundColor: "#c2ebdc", color: "#2d5349" }}
                        >
                          {c.authorInitial ?? c.authorName.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span
                              className="font-headline font-bold text-[10px] uppercase tracking-tight"
                              style={{ color: "#2a3434" }}
                            >
                              {c.authorName}
                            </span>
                            <span
                              className="text-[9px] uppercase tracking-widest font-medium"
                              style={{ color: "#9ba8a7" }}
                            >
                              {(() => {
                                const diff = Date.now() - new Date(c.createdAt).getTime();
                                if (diff < 60000)  return "just now";
                                if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
                                if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
                                return new Date(c.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" });
                              })()}
                            </span>
                          </div>
                          <div
                            className="p-3 rounded-xl rounded-tl-none"
                            style={{ backgroundColor: "#ffffff", border: "1px solid rgba(169,180,179,0.1)" }}
                          >
                            <p className="text-[11px] font-body leading-relaxed" style={{ color: "#2a3434" }}>
                              {c.content}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={commentsEndRef} />
                </div>

                {/* Comment input */}
                <div
                  className="p-5 pt-0"
                  style={{ borderTop: "1px solid rgba(169,180,179,0.08)" }}
                >
                  {commentError && (
                    <p className="font-body text-[10px] mb-2" style={{ color: "#9f403d" }}>{commentError}</p>
                  )}
                  <div className="relative mt-4">
                    <textarea
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          if (!commentText.trim() || isCommentPending) return;
                          startCommentTransition(async () => {
                            setCommentError(null);
                            const res = await addComment(proposal.id, commentText);
                            if ("error" in res) {
                              setCommentError(res.error);
                            } else {
                              setComments((prev) => [...prev, res]);
                              setCommentText("");
                            }
                          });
                        }
                      }}
                      placeholder="Type a message… (Enter to send, Shift+Enter for newline)"
                      rows={2}
                      className="w-full rounded-xl px-4 py-3 pr-12 text-xs font-body resize-none outline-none transition-all"
                      style={{
                        backgroundColor: "rgba(64,102,90,0.04)",
                        border: "1.5px solid rgba(169,180,179,0.2)",
                        color: "#2a3434",
                      }}
                      onFocus={(e) => { (e.target as HTMLTextAreaElement).style.borderColor = "rgba(64,102,90,0.4)"; }}
                      onBlur={(e)  => { (e.target as HTMLTextAreaElement).style.borderColor = "rgba(169,180,179,0.2)"; }}
                    />
                    <button
                      disabled={!commentText.trim() || isCommentPending}
                      onClick={() => {
                        if (!commentText.trim() || isCommentPending) return;
                        startCommentTransition(async () => {
                          setCommentError(null);
                          const res = await addComment(proposal.id, commentText);
                          if ("error" in res) {
                            setCommentError(res.error);
                          } else {
                            setComments((prev) => [...prev, res]);
                            setCommentText("");
                          }
                        });
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-all disabled:opacity-40"
                      style={{ backgroundColor: "#40665a", color: "#defff2" }}
                    >
                      <span className="material-symbols-outlined text-base">
                        {isCommentPending ? "hourglass_top" : "send"}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            ) : isEditing && !viewingVersion ? (
              /* ── Edit form ── */
              <div className="p-6 flex flex-col gap-5">
                <div className="flex flex-col gap-1.5">
                  <label className="font-label text-[10px] uppercase tracking-widest font-bold" style={{ color: "#576160" }}>Title</label>
                  <input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl font-body text-sm"
                    style={{ backgroundColor: "#ffffff", border: "1px solid rgba(169,180,179,0.3)", color: "#2a3434", outline: "none" }}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-label text-[10px] uppercase tracking-widest font-bold" style={{ color: "#576160" }}>Description</label>
                  <textarea
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    rows={5}
                    className="w-full px-4 py-2.5 rounded-xl font-body text-sm resize-none"
                    style={{ backgroundColor: "#ffffff", border: "1px solid rgba(169,180,179,0.3)", color: "#2a3434", outline: "none" }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="font-label text-[10px] uppercase tracking-widest font-bold" style={{ color: "#576160" }}>Budget (USD)</label>
                    <input
                      type="number"
                      value={editBudget}
                      onChange={(e) => setEditBudget(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl font-body text-sm"
                      style={{ backgroundColor: "#ffffff", border: "1px solid rgba(169,180,179,0.3)", color: "#2a3434", outline: "none" }}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="font-label text-[10px] uppercase tracking-widest font-bold" style={{ color: "#576160" }}>Date Est.</label>
                    <input
                      value={editDateEst}
                      onChange={(e) => setEditDateEst(e.target.value)}
                      placeholder="e.g. May 2026"
                      className="w-full px-4 py-2.5 rounded-xl font-body text-sm"
                      style={{ backgroundColor: "#ffffff", border: "1px solid rgba(169,180,179,0.3)", color: "#2a3434", outline: "none" }}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="font-label text-[10px] uppercase tracking-widest font-bold" style={{ color: "#576160" }}>Location</label>
                    <input
                      value={editLocation}
                      onChange={(e) => setEditLocation(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl font-body text-sm"
                      style={{ backgroundColor: "#ffffff", border: "1px solid rgba(169,180,179,0.3)", color: "#2a3434", outline: "none" }}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="font-label text-[10px] uppercase tracking-widest font-bold" style={{ color: "#576160" }}>Type</label>
                    <select
                      value={editType}
                      onChange={(e) => setEditType(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl font-body text-sm"
                      style={{ backgroundColor: "#ffffff", border: "1px solid rgba(169,180,179,0.3)", color: "#2a3434", outline: "none" }}
                    >
                      {["EVENT","SUMMIT","EXHIBITION","WEDDING","PERFORMANCE","INTERNAL"].map((t) => (
                        <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => {
                      startSaveEditTransition(async () => {
                        await updateProposalDetails(proposal.id, {
                          title:       editTitle,
                          description: editDesc,
                          budget:      editBudget ? parseInt(editBudget, 10) : null,
                          dateEst:     editDateEst,
                          location:    editLocation,
                          type:        editType,
                        });
                        setIsEditing(false);
                      });
                    }}
                    disabled={isSavingEdit}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-label font-bold text-[10px] uppercase tracking-widest transition-all hover:opacity-80 disabled:opacity-40"
                    style={{ backgroundColor: "#40665a", color: "#defff2" }}
                  >
                    <span className="material-symbols-outlined text-sm">save</span>
                    {isSavingEdit ? "Saving…" : "Save & version"}
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-5 py-2.5 rounded-xl font-label font-bold text-[10px] uppercase tracking-widest transition-all hover:opacity-80"
                    style={{ backgroundColor: "#e9efee", color: "#576160" }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2">
                  <p className="font-body text-sm leading-relaxed" style={{ color: "#2a3434" }}>
                    {display.description ?? "No description provided."}
                  </p>

                  {meta && (
                    <div className="mt-4 flex flex-wrap gap-3">
                      {Object.entries(meta)
                        .filter(([k]) => !["riskLevel", "lastUpdatedBy", "flagReason", "attachmentUrl", "attachmentName", "sourceAttachmentUrl", "sourceAttachmentName"].includes(k))
                        .slice(0, 4)
                        .map(([k, v]) => (
                          <div
                            key={k}
                            className="px-3 py-1.5 rounded-lg"
                            style={{ backgroundColor: "#e9efee", border: "1px solid rgba(169,180,179,0.15)" }}
                          >
                            <span className="font-label text-[9px] uppercase tracking-widest block" style={{ color: "#576160" }}>
                              {k.replace(/([A-Z])/g, " $1").trim()}
                            </span>
                            <span className="font-body text-xs font-medium" style={{ color: "#2a3434" }}>
                              {Array.isArray(v) ? v.join(", ") : String(v)}
                            </span>
                          </div>
                        ))}
                    </div>
                  )}

                  {!!meta?.flagReason && (
                    <div
                      className="mt-4 px-4 py-3 rounded-xl"
                      style={{ backgroundColor: "rgba(186,26,26,0.05)", border: "1px solid rgba(186,26,26,0.15)" }}
                    >
                      <span className="font-label text-[10px] uppercase tracking-widest font-bold block mb-1" style={{ color: "#ba1a1a" }}>
                        Flag Reason
                      </span>
                      <p className="font-body text-xs" style={{ color: "#9f403d" }}>
                        {String(meta.flagReason)}
                      </p>
                    </div>
                  )}
                </div>

                {/* Authors */}
                <div className="flex flex-col gap-3">
                  <span className="font-label text-[10px] uppercase tracking-widest font-bold" style={{ color: "#576160" }}>
                    Authors
                  </span>
                  {proposal.authors.map((a) => (
                    <div key={a.id} className="flex items-start gap-3">
                      <AuthorAvatar name={a.name} initial={a.initial} iconName={a.iconName} size={8} />
                      <div className="min-w-0">
                        <p className="font-headline font-bold text-[10px] uppercase tracking-tight truncate" style={{ color: "#2a3434" }}>
                          {a.name}
                          {a.isPrimary && (
                            <span className="ml-1.5 text-[8px] tracking-widest" style={{ color: "#40665a" }}>★ LEAD</span>
                          )}
                        </p>
                        <div
                          className="rounded-xl rounded-tl-none p-2.5 mt-1"
                          style={{ backgroundColor: "#ffffff", border: "1px solid rgba(169,180,179,0.1)" }}
                        >
                          <p className="text-[11px] font-body" style={{ color: "#2a3434" }}>{a.role}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Right Column ────────────────────────────────────── */}
        <div className="col-span-12 xl:col-span-4 flex flex-col gap-4">

          {/* Submission Data */}
          <div
            className="rounded-2xl flex flex-col"
            style={{ backgroundColor: "#f0f4f3", border: "1px solid rgba(169,180,179,0.1)" }}
          >
            <div className="p-6 pb-4 shrink-0" style={{ borderBottom: "1px solid rgba(169,180,179,0.1)" }}>
              <h4 className="font-headline font-bold text-sm flex items-center gap-2" style={{ color: "#40665a" }}>
                <span className="material-symbols-outlined text-lg">info</span>
                SUBMISSION DATA
              </h4>
            </div>

            <div className="p-6 pt-4 flex flex-col gap-6">
              <MetaRow label="Project Name">
                <p className="font-body font-medium text-base" style={{ color: "#2a3434" }}>{display.title}</p>
              </MetaRow>

              <div className="grid grid-cols-2 gap-4">
                <MetaRow label="Scheduled Date">
                  <p className="font-body font-medium" style={{ color: "#2a3434" }}>{display.dateEst ?? "—"}</p>
                </MetaRow>
                {!!meta?.expectedAttendance && (
                  <MetaRow label="Expected Flux">
                    <p className="font-body font-medium" style={{ color: "#2a3434" }}>{String(meta.expectedAttendance)} PAX</p>
                  </MetaRow>
                )}
                {!!meta?.guestCount && !meta?.expectedAttendance && (
                  <MetaRow label="Guest Count">
                    <p className="font-body font-medium" style={{ color: "#2a3434" }}>{String(meta.guestCount)} PAX</p>
                  </MetaRow>
                )}
              </div>

              {display.location && (
                <MetaRow label="Primary Location">
                  <div className="flex items-center gap-2" style={{ color: "#2a3434" }}>
                    <span className="material-symbols-outlined text-base" style={{ color: "#40665a" }}>location_on</span>
                    <p className="font-body font-medium">{display.location}</p>
                  </div>
                </MetaRow>
              )}

              {!!meta?.riskLevel && (
                <MetaRow label="Risk Level">
                  <span
                    className="px-2 py-1 text-[10px] font-bold uppercase tracking-tight rounded inline-block"
                    style={{
                      backgroundColor:
                        meta.riskLevel === "high" ? "rgba(186,26,26,0.1)" :
                        meta.riskLevel === "medium" ? "rgba(255,160,0,0.1)" : "#c2ebdc",
                      color:
                        meta.riskLevel === "high" ? "#ba1a1a" :
                        meta.riskLevel === "medium" ? "#7a5200" : "#0f2e22",
                    }}
                  >
                    {String(meta.riskLevel)}
                  </span>
                </MetaRow>
              )}

              {display.budget != null && (
                <div className="pt-6" style={{ borderTop: "1px solid rgba(169,180,179,0.1)" }}>
                  <label className="font-label text-[10px] uppercase tracking-widest mb-2 block" style={{ color: "#576160" }}>
                    Allocated Budget
                  </label>
                  <div className="p-4 rounded-xl" style={{ backgroundColor: "#ffffff", border: "1px solid rgba(169,180,179,0.1)" }}>
                    <p className="text-3xl font-headline font-bold tracking-tight" style={{ color: "#40665a" }}>
                      {fmtBudget(display.budget)}
                    </p>
                    {primaryAuthor && (
                      <span className="text-[10px] font-bold uppercase tracking-widest mt-1 inline-block" style={{ color: "#576160" }}>
                        Lead: {primaryAuthor.name}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div
            className="p-6 rounded-2xl"
            style={{ backgroundColor: "#ffffff", border: "1px solid rgba(169,180,179,0.2)", boxShadow: "0px 4px 16px rgba(42,52,52,0.04)" }}
          >
            <h4
              className="font-label text-[10px] uppercase tracking-widest font-bold mb-4"
              style={{ color: "#576160" }}
            >
              Actions
              {isPending && (
                <span className="ml-2 inline-block" style={{ color: "#40665a" }}>···</span>
              )}
            </h4>
            <ActionButtons />
          </div>

          {/* Last updated */}
          <div
            className="px-4 py-3 rounded-xl flex items-center justify-between"
            style={{ backgroundColor: "rgba(248,250,249,0.8)", border: "1px solid rgba(169,180,179,0.15)" }}
          >
            <span className="font-label text-[10px] uppercase tracking-widest" style={{ color: "#576160" }}>
              Last Updated
            </span>
            <span className="font-label text-[10px] font-bold" style={{ color: "#2a3434" }}>
              {new Date(proposal.updatedAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>

          {/* Version History */}
          {versions.length > 0 && (
            <div
              className="rounded-2xl overflow-hidden"
              style={{ backgroundColor: "#f0f4f3", border: "1px solid rgba(169,180,179,0.1)" }}
            >
              <button
                onClick={() => setHistoryOpen((v) => !v)}
                className="w-full px-5 py-4 flex items-center justify-between transition-all hover:opacity-80"
              >
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-base" style={{ color: "#40665a" }}>history</span>
                  <h4 className="font-label text-[10px] uppercase tracking-widest font-bold" style={{ color: "#40665a" }}>
                    Version History
                  </h4>
                  <span
                    className="font-label text-[9px] font-bold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: "#40665a", color: "#defff2" }}
                  >
                    {versions.length}
                  </span>
                </div>
                <span className="material-symbols-outlined text-base" style={{ color: "#576160" }}>
                  {historyOpen ? "expand_less" : "expand_more"}
                </span>
              </button>

              {historyOpen && (
                <div
                  className="flex flex-col divide-y"
                  style={{ borderTop: "1px solid rgba(169,180,179,0.1)", divideColor: "rgba(169,180,179,0.08)" } as React.CSSProperties}
                >
                  {/* Current version entry */}
                  <button
                    onClick={() => setViewingVersion(null)}
                    className="w-full px-5 py-3.5 flex items-center gap-3 text-left transition-all hover:bg-white/50"
                    style={!viewingVersion ? { backgroundColor: "rgba(64,102,90,0.06)" } : {}}
                  >
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 font-label font-black text-[9px]"
                      style={{ backgroundColor: !viewingVersion ? "#40665a" : "#e9efee", color: !viewingVersion ? "#defff2" : "#576160" }}
                    >
                      ★
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-label font-bold text-[10px] uppercase tracking-widest" style={{ color: "#2a3434" }}>
                        Current
                      </p>
                      <p className="font-body text-[10px] truncate mt-0.5" style={{ color: "#576160" }}>
                        {new Date(proposal.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    </div>
                    {!viewingVersion && (
                      <span className="material-symbols-outlined text-sm shrink-0" style={{ color: "#40665a" }}>visibility</span>
                    )}
                  </button>

                  {versions.map((v) => {
                    const isViewing = viewingVersion?.id === v.id;
                    const ch = v.changes;
                    const actionColor: Record<string, string> = {
                      SUBMITTED: "#3b82f6",
                      APPROVED:  "#40665a",
                      FLAGGED:   "#d97706",
                      REJECTED:  "#dc2626",
                    };
                    const actionLabel: Record<string, string> = {
                      SUBMITTED: "Submitted",
                      APPROVED:  "Approved",
                      FLAGGED:   "Flagged",
                      REJECTED:  "Rejected",
                    };
                    const changedFields = ch?.fields ? Object.keys(ch.fields) : [];
                    return (
                      <button
                        key={v.id}
                        onClick={() => setViewingVersion(v)}
                        className="w-full px-5 py-3.5 flex items-start gap-3 text-left transition-all hover:bg-white/50"
                        style={isViewing ? { backgroundColor: "rgba(64,102,90,0.06)" } : {}}
                      >
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 font-label font-black text-[9px] mt-0.5"
                          style={{ backgroundColor: isViewing ? "#40665a" : "#e9efee", color: isViewing ? "#defff2" : "#576160" }}
                        >
                          V{v.versionNumber}
                        </div>
                        <div className="flex-1 min-w-0">
                          {/* Action badge */}
                          {ch?.action && (
                            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                              <span
                                className="font-label font-bold text-[8px] uppercase tracking-widest px-1.5 py-0.5 rounded-full"
                                style={{ backgroundColor: `${actionColor[ch.action]}18`, color: actionColor[ch.action] }}
                              >
                                {actionLabel[ch.action]}
                              </span>
                              {ch.chainDeptName && (
                                <span className="font-body text-[8px] truncate" style={{ color: "#576160" }}>
                                  {ch.chainDeptName}
                                </span>
                              )}
                            </div>
                          )}
                          <p className="font-body text-[10px] font-semibold truncate" style={{ color: "#2a3434" }}>
                            {v.title}
                          </p>
                          <p className="font-body text-[10px] truncate mt-0.5" style={{ color: "#576160" }}>
                            {v.editorName} · {new Date(v.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </p>
                          {/* Changes summary */}
                          {(changedFields.length > 0 || ch?.pdfChanged) && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {ch?.pdfChanged && (
                                <span className="flex items-center gap-0.5 font-body text-[8px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: "#f0f4f8", color: "#576160" }}>
                                  <span className="material-symbols-outlined" style={{ fontSize: "9px" }}>description</span>
                                  PDF
                                </span>
                              )}
                              {changedFields.slice(0, 3).map((f) => (
                                <span key={f} className="font-body text-[8px] px-1.5 py-0.5 rounded-full capitalize" style={{ backgroundColor: "#f0f4f8", color: "#576160" }}>
                                  {f}
                                </span>
                              ))}
                              {changedFields.length > 3 && (
                                <span className="font-body text-[8px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: "#f0f4f8", color: "#576160" }}>
                                  +{changedFields.length - 3}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        {isViewing && (
                          <span className="material-symbols-outlined text-sm shrink-0 mt-0.5" style={{ color: "#40665a" }}>visibility</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Meetings ─────────────────────────────────────────── */}
          {canManageProposal && (
            <div
              className="rounded-2xl overflow-hidden"
              style={{ backgroundColor: "#f0f4f3", border: "1px solid rgba(169,180,179,0.1)" }}
            >
              <button
                onClick={() => setMeetingsOpen((v) => !v)}
                className="w-full px-5 py-4 flex items-center justify-between transition-all hover:opacity-80"
              >
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-base" style={{ color: "#40665a" }}>calendar_month</span>
                  <h4 className="font-label text-[10px] uppercase tracking-widest font-bold" style={{ color: "#40665a" }}>
                    Meetings
                  </h4>
                  {meetings.length > 0 && (
                    <span
                      className="font-label text-[9px] font-bold px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: "#40665a", color: "#defff2" }}
                    >
                      {meetings.length}
                    </span>
                  )}
                </div>
                <span className="material-symbols-outlined text-base" style={{ color: "#576160" }}>
                  {meetingsOpen ? "expand_less" : "expand_more"}
                </span>
              </button>

              {meetingsOpen && (
                <div
                  className="flex flex-col"
                  style={{ borderTop: "1px solid rgba(169,180,179,0.1)" }}
                >
                  {/* Meeting list */}
                  {meetings.length === 0 && !showScheduleForm && (
                    <p className="px-5 py-4 font-body text-[10px]" style={{ color: "#a9b4b3" }}>
                      No meetings scheduled yet.
                    </p>
                  )}

                  {meetings.map((m) => {
                    const dt = new Date(m.scheduledAt);
                    const isPast = dt < new Date();
                    return (
                      <div
                        key={m.id}
                        className="flex items-start gap-3 px-5 py-3.5"
                        style={{ borderBottom: "1px solid rgba(169,180,179,0.08)" }}
                      >
                        {/* Date block */}
                        <div
                          className="shrink-0 flex flex-col items-center justify-center w-10 h-10 rounded-xl"
                          style={{ backgroundColor: isPast ? "#e9efee" : "#defff2", color: isPast ? "#576160" : "#40665a" }}
                        >
                          <span className="font-label font-black text-[11px] leading-none">
                            {dt.toLocaleDateString("en-US", { day: "numeric" })}
                          </span>
                          <span className="font-label text-[8px] uppercase tracking-widest">
                            {dt.toLocaleDateString("en-US", { month: "short" })}
                          </span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="font-body text-[10px] font-semibold truncate" style={{ color: "#2a3434" }}>
                              {m.title}
                            </p>
                            {isPast && (
                              <span className="font-label text-[8px] uppercase tracking-widest px-1 py-0.5 rounded shrink-0" style={{ backgroundColor: "#e9efee", color: "#a9b4b3" }}>
                                Past
                              </span>
                            )}
                          </div>
                          <p className="font-body text-[9px] mt-0.5" style={{ color: "#576160" }}>
                            {dt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                            {m.location && ` · ${m.location}`}
                          </p>
                          {m.description && (
                            <p className="font-body text-[9px] mt-0.5 truncate" style={{ color: "#a9b4b3" }}>
                              {m.description}
                            </p>
                          )}
                          <p className="font-body text-[9px] mt-0.5" style={{ color: "#a9b4b3" }}>
                            {m.organizerName}
                          </p>
                        </div>

                        <button
                          onClick={() =>
                            startMeetingTransition(async () => {
                              await deleteMeeting(m.id, proposal.id);
                            })
                          }
                          disabled={isMeetingPending}
                          className="shrink-0 p-1 rounded-lg transition-all hover:opacity-70 disabled:opacity-30"
                          title="Delete meeting"
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: "14px", color: "#9f403d" }}>delete</span>
                        </button>
                      </div>
                    );
                  })}

                  {/* Schedule form */}
                  {showScheduleForm ? (
                    <div className="px-5 py-4 flex flex-col gap-3" style={{ borderTop: meetings.length > 0 ? "1px solid rgba(169,180,179,0.08)" : undefined }}>
                      <p className="font-label text-[9px] uppercase tracking-widest font-bold" style={{ color: "#576160" }}>
                        Schedule Meeting
                      </p>
                      <input
                        type="text"
                        placeholder="Title"
                        value={meetTitle}
                        onChange={(e) => setMeetTitle(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg font-body text-[11px] outline-none"
                        style={{ backgroundColor: "#fff", border: "1px solid rgba(169,180,179,0.3)", color: "#2a3434" }}
                      />
                      <input
                        type="datetime-local"
                        value={meetDate}
                        onChange={(e) => setMeetDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg font-body text-[11px] outline-none"
                        style={{ backgroundColor: "#fff", border: "1px solid rgba(169,180,179,0.3)", color: "#2a3434" }}
                      />
                      <input
                        type="text"
                        placeholder="Location (optional)"
                        value={meetLocation}
                        onChange={(e) => setMeetLocation(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg font-body text-[11px] outline-none"
                        style={{ backgroundColor: "#fff", border: "1px solid rgba(169,180,179,0.3)", color: "#2a3434" }}
                      />
                      <textarea
                        placeholder="Description (optional)"
                        value={meetDesc}
                        onChange={(e) => setMeetDesc(e.target.value)}
                        rows={2}
                        className="w-full px-3 py-2 rounded-lg font-body text-[11px] outline-none resize-none"
                        style={{ backgroundColor: "#fff", border: "1px solid rgba(169,180,179,0.3)", color: "#2a3434" }}
                      />
                      {meetError && (
                        <p className="font-body text-[10px]" style={{ color: "#9f403d" }}>{meetError}</p>
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            startMeetingTransition(async () => {
                              setMeetError(null);
                              const res = await scheduleMeeting(proposal.id, {
                                title:       meetTitle,
                                description: meetDesc,
                                scheduledAt: meetDate,
                                location:    meetLocation,
                              });
                              if (res && "error" in res) {
                                setMeetError(res.error);
                              } else {
                                setMeetTitle(""); setMeetDesc(""); setMeetDate(""); setMeetLocation("");
                                setShowScheduleForm(false);
                              }
                            })
                          }
                          disabled={isMeetingPending}
                          className="flex-1 px-3 py-2 rounded-lg font-label font-bold text-[10px] uppercase tracking-widest transition-all hover:opacity-80 disabled:opacity-50"
                          style={{ backgroundColor: "#40665a", color: "#defff2" }}
                        >
                          {isMeetingPending ? "Saving…" : "Save"}
                        </button>
                        <button
                          onClick={() => { setShowScheduleForm(false); setMeetError(null); }}
                          className="px-3 py-2 rounded-lg font-label font-bold text-[10px] uppercase tracking-widest transition-all hover:opacity-70"
                          style={{ backgroundColor: "#e9efee", color: "#576160" }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowScheduleForm(true)}
                      className="mx-5 my-3 flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-label font-bold text-[10px] uppercase tracking-widest transition-all hover:opacity-80"
                      style={{ backgroundColor: "#defff2", color: "#40665a", border: "1px dashed rgba(64,102,90,0.3)" }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>add</span>
                      Schedule Meeting
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Delete proposal ───────────────────────────────────── */}
          {canManageProposal && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-label font-bold text-[10px] uppercase tracking-widest transition-all hover:opacity-80"
              style={{ backgroundColor: "rgba(159,64,61,0.06)", color: "#9f403d", border: "1px solid rgba(159,64,61,0.15)" }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>delete_forever</span>
              Delete Proposal
            </button>
          )}
        </div>
      </div>

      {/* ── Delete confirm modal ──────────────────────────────────── */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            className="relative w-full max-w-sm mx-4 rounded-2xl p-6 flex flex-col gap-4"
            style={{ backgroundColor: "#fff", boxShadow: "0 20px 60px rgba(0,0,0,0.18)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: "rgba(159,64,61,0.1)" }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: "20px", color: "#9f403d" }}>delete_forever</span>
              </div>
              <div>
                <h3 className="font-headline text-[15px] font-bold" style={{ color: "#2a3434" }}>Delete Proposal</h3>
                <p className="font-body text-[11px] mt-1" style={{ color: "#576160" }}>
                  This will permanently delete <span className="font-semibold" style={{ color: "#2a3434" }}>{proposal.title}</span> and all its versions, approval chains, and attachments. This cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => {
                  startDeleteTransition(async () => {
                    const res = await deleteProposal(proposal.id);
                    if ("deleted" in res) {
                      router.push("/proposals");
                    }
                  });
                }}
                disabled={isDeletingProposal}
                className="flex-1 px-4 py-2.5 rounded-xl font-label font-bold text-[11px] uppercase tracking-widest transition-all hover:opacity-80 disabled:opacity-50"
                style={{ backgroundColor: "#9f403d", color: "#fff" }}
              >
                {isDeletingProposal ? "Deleting…" : "Delete"}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2.5 rounded-xl font-label font-bold text-[11px] uppercase tracking-widest transition-all hover:opacity-70"
                style={{ backgroundColor: "#e9efee", color: "#576160" }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
