"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { saveEventReport } from "./actions";
import type { SerializedEventReport, EventReportData } from "./actions";

/* ── Shared types ─────────────────────────────────────────────── */

export type ArchivedProposal = {
  id: string;
  title: string;
  type: string;
  status: string;            // "COMPLETED" | "REJECTED"
  dateEst: string | null;
  budget: number | null;
  location: string | null;
  coverImageUrl: string | null;
  imageGradient: string | null;
  description: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  authors: { name: string; initial: string | null; isPrimary: boolean }[];
  tags: { label: string }[];
};

/* ── Formatters ───────────────────────────────────────────────── */

function fmtCurrency(n: number | null | undefined): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD", maximumFractionDigits: 0,
  }).format(n);
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function fmtPct(actual: number | null | undefined, total: number | null | undefined): string {
  if (actual == null || total == null || total === 0) return "—";
  return Math.round((actual / total) * 100) + "%";
}

function variance(actual: number | null | undefined, estimated: number | null | undefined): {
  pct: string; positive: boolean; zero: boolean;
} {
  if (actual == null || estimated == null || estimated === 0) {
    return { pct: "—", positive: false, zero: true };
  }
  const diff = actual - estimated;
  const pct  = Math.abs(Math.round((diff / estimated) * 100));
  return { pct: `${pct}%`, positive: diff <= 0, zero: false };
}

/* ── Type badge ───────────────────────────────────────────────── */

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  EVENT:       { bg: "rgba(45,83,73,0.1)",   text: "#2d5349" },
  SUMMIT:      { bg: "rgba(62,82,125,0.1)",  text: "#3e527d" },
  EXHIBITION:  { bg: "rgba(120,72,30,0.1)",  text: "#78481e" },
  WEDDING:     { bg: "rgba(140,50,100,0.1)", text: "#8c3264" },
  PERFORMANCE: { bg: "rgba(30,110,100,0.1)", text: "#1e6e64" },
  INTERNAL:    { bg: "rgba(100,100,100,0.1)",text: "#606060" },
};

function TypeBadge({ type }: { type: string }) {
  const cfg = TYPE_COLORS[type] ?? TYPE_COLORS.INTERNAL;
  return (
    <span
      className="px-2.5 py-1 rounded-full font-label font-black text-[9px] uppercase tracking-[0.15em]"
      style={{ backgroundColor: cfg.bg, color: cfg.text }}
    >
      {type.charAt(0) + type.slice(1).toLowerCase()}
    </span>
  );
}

/* ── Star rating selector ─────────────────────────────────────── */

function StarRating({ value, onChange }: { value: number | null; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState<number | null>(null);
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = (hovered ?? value ?? 0) >= star;
        return (
          <button
            key={star}
            type="button"
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => onChange(star)}
            className="transition-transform hover:scale-110"
          >
            <span
              className="material-symbols-outlined"
              style={{
                fontSize: "1.5rem",
                color: filled ? "#2d5349" : "#c8d5d3",
                fontVariationSettings: filled ? "'FILL' 1" : "'FILL' 0",
              }}
            >
              star
            </span>
          </button>
        );
      })}
      {value && (
        <span className="ml-1 font-label text-[10px] font-bold" style={{ color: "#576160" }}>
          {value}/5
        </span>
      )}
    </div>
  );
}

/* ── Metric tile ─────────────────────────────────────────────── */

function MetricTile({
  label, value, sub, highlight,
}: { label: string; value: string; sub?: string; highlight?: "good" | "warn" | "neutral" }) {
  const color = highlight === "good" ? "#2d5349"
    : highlight === "warn" ? "#9f403d"
    : "#1a1f1f";
  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-1"
      style={{ backgroundColor: "#f0f4f3", border: "1px solid rgba(155,168,167,0.25)" }}
    >
      <span className="font-label text-[9px] uppercase tracking-widest font-bold" style={{ color: "#707977" }}>
        {label}
      </span>
      <span className="font-headline text-xl font-black tracking-tight" style={{ color }}>
        {value}
      </span>
      {sub && (
        <span className="font-label text-[10px]" style={{ color: "#a9b4b3" }}>{sub}</span>
      )}
    </div>
  );
}

/* ── Log Event Panel ─────────────────────────────────────────── */

function LogEventPanel({
  proposal,
  existingReport,
  onClose,
}: {
  proposal: ArchivedProposal;
  existingReport: SerializedEventReport | null;
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError]   = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const expectedAttendance = proposal.metadata?.expectedAttendance as number | undefined;

  // Form state — pre-populated from existing report if available
  const [form, setForm] = useState<{
    actualDate: string;
    actualLocation: string;
    actualSpend: string;
    signedUpCount: string;
    actualAttendance: string;
    summary: string;
    highlights: string;
    challenges: string;
    internalRating: number | null;
  }>({
    actualDate:       existingReport?.actualDate
      ? new Date(existingReport.actualDate).toISOString().split("T")[0]
      : "",
    actualLocation:   existingReport?.actualLocation   ?? proposal.location ?? "",
    actualSpend:      existingReport?.actualSpend      != null ? String(existingReport.actualSpend)      : "",
    signedUpCount:    existingReport?.signedUpCount    != null ? String(existingReport.signedUpCount)    : "",
    actualAttendance: existingReport?.actualAttendance != null ? String(existingReport.actualAttendance) : "",
    summary:          existingReport?.summary     ?? "",
    highlights:       existingReport?.highlights  ?? "",
    challenges:       existingReport?.challenges  ?? "",
    internalRating:   existingReport?.internalRating ?? null,
  });

  function field(k: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const data: EventReportData = {
      actualDate:       form.actualDate       || null,
      actualLocation:   form.actualLocation   || null,
      actualSpend:      form.actualSpend       ? Number(form.actualSpend)       : null,
      signedUpCount:    form.signedUpCount     ? Number(form.signedUpCount)     : null,
      actualAttendance: form.actualAttendance  ? Number(form.actualAttendance)  : null,
      summary:          form.summary    || null,
      highlights:       form.highlights || null,
      challenges:       form.challenges || null,
      internalRating:   form.internalRating,
    };

    startTransition(async () => {
      const result = await saveEventReport(proposal.id, data);
      if ("error" in result) {
        setError(result.error);
      } else {
        setSuccess(true);
        setTimeout(onClose, 900);
      }
    });
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 14px",
    borderRadius: "10px",
    border: "1.5px solid rgba(155,168,167,0.4)",
    backgroundColor: "#f8fafa",
    fontFamily: "Space Grotesk, sans-serif",
    fontSize: "14px",
    color: "#1a1f1f",
    outline: "none",
  };

  const labelStyle: React.CSSProperties = {
    fontFamily: "Space Grotesk, sans-serif",
    fontSize: "10px",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.12em",
    color: "#576160",
    marginBottom: "6px",
    display: "block",
  };

  const sectionStyle: React.CSSProperties = {
    padding: "20px 0",
    borderBottom: "1px solid rgba(155,168,167,0.2)",
  };

  const sectionHeadStyle: React.CSSProperties = {
    fontFamily: "Space Grotesk, sans-serif",
    fontSize: "11px",
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "0.18em",
    color: "#2d5349",
    marginBottom: "16px",
  };

  return (
    /* overlay */
    <div
      className="fixed inset-0 z-50 flex items-stretch justify-end"
      style={{ backgroundColor: "rgba(20,28,27,0.45)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Panel */}
      <div
        className="flex flex-col h-full overflow-hidden"
        style={{
          width: "min(560px, 100vw)",
          backgroundColor: "#ffffff",
          boxShadow: "-8px 0 40px rgba(0,0,0,0.12)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-start justify-between gap-4 px-8 py-6 shrink-0"
          style={{ borderBottom: "1px solid rgba(155,168,167,0.2)", backgroundColor: "#f8fafa" }}
        >
          <div className="flex flex-col gap-1">
            <h2
              className="font-headline text-xl font-black tracking-tight"
              style={{ color: "#1a1f1f" }}
            >
              {existingReport ? "Edit Event Report" : "Log Event Report"}
            </h2>
            <p className="font-label text-[11px]" style={{ color: "#707977" }}>
              {proposal.title}
            </p>
          </div>
          <button
            onClick={onClose}
            className="mt-0.5 rounded-lg p-1.5 hover:bg-gray-100 transition-colors"
          >
            <span className="material-symbols-outlined" style={{ fontSize: "1.25rem", color: "#576160" }}>close</span>
          </button>
        </div>

        {/* Scrollable form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-8">
          {/* ── Section 1: Outcome ── */}
          <div style={sectionStyle}>
            <p style={sectionHeadStyle}>
              <span className="material-symbols-outlined" style={{ fontSize: "0.9rem", verticalAlign: "middle", marginRight: "6px" }}>event</span>
              Outcome
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label style={labelStyle}>Actual Date</label>
                <input
                  type="date"
                  value={form.actualDate}
                  onChange={field("actualDate")}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Actual Location</label>
                <input
                  type="text"
                  placeholder={proposal.location ?? "e.g. Main Hall"}
                  value={form.actualLocation}
                  onChange={field("actualLocation")}
                  style={inputStyle}
                />
              </div>
            </div>
          </div>

          {/* ── Section 2: Budget ── */}
          <div style={sectionStyle}>
            <p style={sectionHeadStyle}>
              <span className="material-symbols-outlined" style={{ fontSize: "0.9rem", verticalAlign: "middle", marginRight: "6px" }}>payments</span>
              Financial Reconciliation
            </p>
            {/* Reference row */}
            {proposal.budget != null && (
              <div
                className="flex items-center gap-3 mb-4 px-4 py-3 rounded-xl"
                style={{ backgroundColor: "#f0f4f3", border: "1px solid rgba(45,83,73,0.15)" }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: "1rem", color: "#2d5349" }}>info</span>
                <p className="font-label text-[11px]" style={{ color: "#576160" }}>
                  Estimated budget: <strong>{fmtCurrency(proposal.budget)}</strong>
                </p>
              </div>
            )}
            <div>
              <label style={labelStyle}>Actual Spend (USD)</label>
              <input
                type="number"
                min={0}
                placeholder="0"
                value={form.actualSpend}
                onChange={field("actualSpend")}
                style={inputStyle}
              />
            </div>
            {/* Live variance preview */}
            {form.actualSpend && proposal.budget != null && (() => {
              const v = variance(Number(form.actualSpend), proposal.budget);
              if (v.zero) return null;
              return (
                <div
                  className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg"
                  style={{
                    backgroundColor: v.positive ? "rgba(45,83,73,0.08)" : "rgba(159,64,61,0.08)",
                    border: `1px solid ${v.positive ? "rgba(45,83,73,0.2)" : "rgba(159,64,61,0.2)"}`,
                  }}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: "1rem", color: v.positive ? "#2d5349" : "#9f403d" }}
                  >
                    {v.positive ? "trending_down" : "trending_up"}
                  </span>
                  <span
                    className="font-label text-[11px] font-bold"
                    style={{ color: v.positive ? "#2d5349" : "#9f403d" }}
                  >
                    {v.positive ? `${v.pct} under budget` : `${v.pct} over budget`}
                  </span>
                </div>
              );
            })()}
          </div>

          {/* ── Section 3: Attendance ── */}
          <div style={sectionStyle}>
            <p style={sectionHeadStyle}>
              <span className="material-symbols-outlined" style={{ fontSize: "0.9rem", verticalAlign: "middle", marginRight: "6px" }}>groups</span>
              Attendance
            </p>
            {/* Reference row */}
            {expectedAttendance != null && (
              <div
                className="flex items-center gap-3 mb-4 px-4 py-3 rounded-xl"
                style={{ backgroundColor: "#f0f4f3", border: "1px solid rgba(45,83,73,0.15)" }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: "1rem", color: "#2d5349" }}>info</span>
                <p className="font-label text-[11px]" style={{ color: "#576160" }}>
                  Estimated attendance: <strong>{expectedAttendance.toLocaleString()}</strong>
                </p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label style={labelStyle}>Signed Up</label>
                <input
                  type="number"
                  min={0}
                  placeholder="0"
                  value={form.signedUpCount}
                  onChange={field("signedUpCount")}
                  style={inputStyle}
                />
                <p className="font-label text-[9px] mt-1.5" style={{ color: "#a9b4b3" }}>
                  Registrations / RSVPs
                </p>
              </div>
              <div>
                <label style={labelStyle}>Showed Up</label>
                <input
                  type="number"
                  min={0}
                  placeholder="0"
                  value={form.actualAttendance}
                  onChange={field("actualAttendance")}
                  style={inputStyle}
                />
                <p className="font-label text-[9px] mt-1.5" style={{ color: "#a9b4b3" }}>
                  Physically attended
                </p>
              </div>
            </div>
            {/* Live attendance rate */}
            {form.signedUpCount && form.actualAttendance && (() => {
              const rate = Math.round(
                (Number(form.actualAttendance) / Number(form.signedUpCount)) * 100,
              );
              const color = rate >= 80 ? "#2d5349" : rate >= 60 ? "#78481e" : "#9f403d";
              return (
                <div
                  className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg"
                  style={{ backgroundColor: "rgba(45,83,73,0.06)", border: "1px solid rgba(45,83,73,0.15)" }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: "1rem", color }}>
                    {rate >= 80 ? "check_circle" : rate >= 60 ? "info" : "warning"}
                  </span>
                  <span className="font-label text-[11px] font-bold" style={{ color }}>
                    {rate}% show-up rate
                  </span>
                </div>
              );
            })()}
          </div>

          {/* ── Section 4: Reflection ── */}
          <div style={sectionStyle}>
            <p style={sectionHeadStyle}>
              <span className="material-symbols-outlined" style={{ fontSize: "0.9rem", verticalAlign: "middle", marginRight: "6px" }}>edit_note</span>
              Post-Event Reflection
            </p>
            <div className="flex flex-col gap-4">
              <div>
                <label style={labelStyle}>Summary</label>
                <textarea
                  rows={3}
                  placeholder="Brief overview of how the event went overall…"
                  value={form.summary}
                  onChange={field("summary")}
                  style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
                />
              </div>
              <div>
                <label style={labelStyle}>Highlights</label>
                <textarea
                  rows={3}
                  placeholder="What went well? Key wins and memorable moments…"
                  value={form.highlights}
                  onChange={field("highlights")}
                  style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
                />
              </div>
              <div>
                <label style={labelStyle}>Challenges</label>
                <textarea
                  rows={3}
                  placeholder="What could be improved? Issues encountered…"
                  value={form.challenges}
                  onChange={field("challenges")}
                  style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
                />
              </div>
            </div>
          </div>

          {/* ── Section 5: Rating ── */}
          <div style={{ ...sectionStyle, borderBottom: "none", paddingBottom: "32px" }}>
            <p style={sectionHeadStyle}>
              <span className="material-symbols-outlined" style={{ fontSize: "0.9rem", verticalAlign: "middle", marginRight: "6px" }}>star</span>
              Internal Rating
            </p>
            <p className="font-label text-[11px] mb-4" style={{ color: "#707977" }}>
              Private team score — not visible publicly.
            </p>
            <StarRating
              value={form.internalRating}
              onChange={(v) => setForm((f) => ({ ...f, internalRating: v }))}
            />
          </div>
        </form>

        {/* Footer */}
        <div
          className="shrink-0 flex items-center justify-between gap-4 px-8 py-5"
          style={{ borderTop: "1px solid rgba(155,168,167,0.2)", backgroundColor: "#f8fafa" }}
        >
          {error && (
            <p className="font-label text-[11px] font-bold" style={{ color: "#ba1a1a" }}>{error}</p>
          )}
          {!error && (
            <p className="font-label text-[11px]" style={{ color: "#a9b4b3" }}>
              All fields are optional
            </p>
          )}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl font-label font-black text-[11px] uppercase tracking-widest transition-all hover:opacity-80"
              style={{ backgroundColor: "#dce5e3", color: "#1a1f1f" }}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isPending || success}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-label font-black text-[11px] uppercase tracking-widest transition-all hover:opacity-80 disabled:opacity-50"
              style={{ backgroundColor: "#2d5349", color: "#ffffff" }}
            >
              {success ? (
                <>
                  <span className="material-symbols-outlined" style={{ fontSize: "1rem" }}>check</span>
                  Saved
                </>
              ) : isPending ? (
                "Saving…"
              ) : (
                <>
                  <span className="material-symbols-outlined" style={{ fontSize: "1rem" }}>save</span>
                  {existingReport ? "Update Report" : "Save Report"}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── View Report Panel ───────────────────────────────────────── */

function ViewReportPanel({
  proposal,
  report,
  onClose,
  onEdit,
}: {
  proposal: ArchivedProposal;
  report: SerializedEventReport;
  onClose: () => void;
  onEdit: () => void;
}) {
  const expectedAttendance = proposal.metadata?.expectedAttendance as number | null | undefined;
  const budgetVar = variance(report.actualSpend, proposal.budget);
  const showUpRate = report.actualAttendance != null && report.signedUpCount != null && report.signedUpCount > 0
    ? Math.round((report.actualAttendance / report.signedUpCount) * 100)
    : null;

  const sectionStyle: React.CSSProperties = {
    padding: "20px 0",
    borderBottom: "1px solid rgba(155,168,167,0.2)",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch justify-end"
      style={{ backgroundColor: "rgba(20,28,27,0.45)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="flex flex-col h-full overflow-hidden"
        style={{
          width: "min(580px, 100vw)",
          backgroundColor: "#ffffff",
          boxShadow: "-8px 0 40px rgba(0,0,0,0.12)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-start justify-between gap-4 px-8 py-6 shrink-0"
          style={{ borderBottom: "1px solid rgba(155,168,167,0.2)", backgroundColor: "#f8fafa" }}
        >
          <div className="flex flex-col gap-1">
            <h2
              className="font-headline text-xl font-black tracking-tight"
              style={{ color: "#1a1f1f" }}
            >
              Event Report
            </h2>
            <p className="font-label text-[11px]" style={{ color: "#707977" }}>
              {proposal.title}
            </p>
            <p className="font-label text-[10px] mt-1" style={{ color: "#a9b4b3" }}>
              Filed by {report.reportedByName} · {fmtDate(report.updatedAt)}
            </p>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <button
              onClick={onEdit}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-label font-black text-[10px] uppercase tracking-widest transition-all hover:opacity-80"
              style={{ backgroundColor: "#dce5e3", color: "#1a1f1f" }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: "0.9rem" }}>edit</span>
              Edit
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 hover:bg-gray-100 transition-colors"
            >
              <span className="material-symbols-outlined" style={{ fontSize: "1.25rem", color: "#576160" }}>close</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-8">
          {/* ── Outcome ── */}
          <div style={sectionStyle}>
            <p
              className="font-label text-[11px] font-black uppercase tracking-[0.18em] mb-4"
              style={{ color: "#2d5349" }}
            >
              Outcome
            </p>
            <div className="grid grid-cols-2 gap-3">
              <MetricTile
                label="Actual Date"
                value={fmtDate(report.actualDate)}
              />
              <MetricTile
                label="Actual Location"
                value={report.actualLocation ?? "—"}
              />
            </div>
          </div>

          {/* ── Financial ── */}
          <div style={sectionStyle}>
            <p
              className="font-label text-[11px] font-black uppercase tracking-[0.18em] mb-4"
              style={{ color: "#2d5349" }}
            >
              Financial Reconciliation
            </p>
            <div className="grid grid-cols-3 gap-3">
              <MetricTile
                label="Estimated Budget"
                value={fmtCurrency(proposal.budget)}
              />
              <MetricTile
                label="Actual Spend"
                value={fmtCurrency(report.actualSpend)}
              />
              <MetricTile
                label="Variance"
                value={budgetVar.zero ? "—" : `${budgetVar.pct} ${budgetVar.positive ? "under" : "over"}`}
                highlight={budgetVar.zero ? "neutral" : budgetVar.positive ? "good" : "warn"}
              />
            </div>
          </div>

          {/* ── Attendance ── */}
          <div style={sectionStyle}>
            <p
              className="font-label text-[11px] font-black uppercase tracking-[0.18em] mb-4"
              style={{ color: "#2d5349" }}
            >
              Attendance
            </p>
            <div className="grid grid-cols-2 gap-3 mb-3">
              {expectedAttendance != null && (
                <MetricTile
                  label="Estimated"
                  value={expectedAttendance.toLocaleString()}
                />
              )}
              <MetricTile
                label="Signed Up"
                value={report.signedUpCount?.toLocaleString() ?? "—"}
                sub="RSVPs / registrations"
              />
              <MetricTile
                label="Showed Up"
                value={report.actualAttendance?.toLocaleString() ?? "—"}
                sub="Physically attended"
              />
              <MetricTile
                label="Show-up Rate"
                value={showUpRate != null ? `${showUpRate}%` : "—"}
                sub={fmtPct(report.actualAttendance, report.signedUpCount)}
                highlight={showUpRate == null ? "neutral" : showUpRate >= 80 ? "good" : showUpRate >= 60 ? "neutral" : "warn"}
              />
            </div>
            {/* Conversion from expected */}
            {expectedAttendance != null && report.actualAttendance != null && (
              <div
                className="flex items-center gap-2 px-4 py-3 rounded-xl"
                style={{ backgroundColor: "#f0f4f3", border: "1px solid rgba(155,168,167,0.25)" }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: "1rem", color: "#576160" }}>analytics</span>
                <p className="font-label text-[11px]" style={{ color: "#576160" }}>
                  <strong>{fmtPct(report.actualAttendance, expectedAttendance)}</strong> of estimated attendance achieved
                </p>
              </div>
            )}
          </div>

          {/* ── Reflection ── */}
          {(report.summary || report.highlights || report.challenges) && (
            <div style={sectionStyle}>
              <p
                className="font-label text-[11px] font-black uppercase tracking-[0.18em] mb-4"
                style={{ color: "#2d5349" }}
              >
                Post-Event Reflection
              </p>
              <div className="flex flex-col gap-5">
                {report.summary && (
                  <div>
                    <p className="font-label text-[10px] uppercase tracking-widest font-bold mb-2" style={{ color: "#707977" }}>
                      Summary
                    </p>
                    <p className="text-sm leading-relaxed" style={{ color: "#2d3a38" }}>{report.summary}</p>
                  </div>
                )}
                {report.highlights && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="material-symbols-outlined" style={{ fontSize: "0.9rem", color: "#2d5349" }}>star</span>
                      <p className="font-label text-[10px] uppercase tracking-widest font-bold" style={{ color: "#707977" }}>Highlights</p>
                    </div>
                    <p className="text-sm leading-relaxed" style={{ color: "#2d3a38" }}>{report.highlights}</p>
                  </div>
                )}
                {report.challenges && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="material-symbols-outlined" style={{ fontSize: "0.9rem", color: "#9f403d" }}>warning</span>
                      <p className="font-label text-[10px] uppercase tracking-widest font-bold" style={{ color: "#707977" }}>Challenges</p>
                    </div>
                    <p className="text-sm leading-relaxed" style={{ color: "#2d3a38" }}>{report.challenges}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Rating ── */}
          {report.internalRating != null && (
            <div style={{ ...sectionStyle, borderBottom: "none", paddingBottom: "32px" }}>
              <p
                className="font-label text-[11px] font-black uppercase tracking-[0.18em] mb-4"
                style={{ color: "#2d5349" }}
              >
                Internal Rating
              </p>
              <div className="flex items-center gap-3">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <span
                      key={s}
                      className="material-symbols-outlined"
                      style={{
                        fontSize: "1.5rem",
                        color: s <= report.internalRating! ? "#2d5349" : "#c8d5d3",
                        fontVariationSettings: s <= report.internalRating! ? "'FILL' 1" : "'FILL' 0",
                      }}
                    >
                      star
                    </span>
                  ))}
                </div>
                <span className="font-headline text-lg font-black" style={{ color: "#2d5349" }}>
                  {report.internalRating}/5
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Archive Card ─────────────────────────────────────────────── */

function ArchiveCard({
  proposal,
  report,
}: {
  proposal: ArchivedProposal;
  report: SerializedEventReport | null;
}) {
  const [panel, setPanel] = useState<"log" | "view" | null>(null);

  const isCompleted = proposal.status === "COMPLETED";
  const isRejected  = proposal.status === "REJECTED";

  const expectedAttendance = proposal.metadata?.expectedAttendance as number | null | undefined;
  const showUpRate = report?.actualAttendance != null && report?.signedUpCount != null && report.signedUpCount > 0
    ? Math.round((report.actualAttendance / report.signedUpCount) * 100)
    : null;

  return (
    <>
      <div
        className="flex flex-col rounded-2xl overflow-hidden transition-all hover:shadow-md"
        style={{
          backgroundColor: "#ffffff",
          border: "1px solid rgba(155,168,167,0.25)",
          boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
        }}
      >
        {/* Top colour bar */}
        <div
          className="h-1.5 w-full"
          style={{
            background: isCompleted
              ? "linear-gradient(90deg, #2d5349, #40665a)"
              : "linear-gradient(90deg, #9f403d, #c05a57)",
          }}
        />

        {/* Cover / gradient */}
        <div
          className="relative h-28 w-full overflow-hidden shrink-0"
          style={{
            background: proposal.coverImageUrl
              ? undefined
              : (proposal.imageGradient ?? "linear-gradient(135deg, #c2ebdc 0%, #e9efee 100%)"),
          }}
        >
          {proposal.coverImageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={proposal.coverImageUrl}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}
          {/* Status pill */}
          <div className="absolute top-3 left-3">
            <span
              className="px-3 py-1 rounded-full font-label font-black text-[9px] uppercase tracking-[0.15em]"
              style={{
                backgroundColor: isCompleted ? "rgba(45,83,73,0.85)" : "rgba(159,64,61,0.85)",
                color: "#ffffff",
                backdropFilter: "blur(4px)",
              }}
            >
              {isCompleted ? "Completed" : "Rejected"}
            </span>
          </div>
          {/* Type badge */}
          <div className="absolute top-3 right-3">
            <TypeBadge type={proposal.type} />
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-col flex-1 p-5 gap-4">
          {/* Title + meta */}
          <div>
            <Link
              href={`/proposals/${proposal.id}`}
              className="font-headline text-base font-black tracking-tight leading-tight hover:opacity-70 transition-opacity"
              style={{ color: "#1a1f1f" }}
            >
              {proposal.title}
            </Link>
            <div className="flex items-center gap-3 mt-1.5">
              {(report?.actualDate ?? proposal.dateEst) && (
                <span className="font-label text-[10px]" style={{ color: "#a9b4b3" }}>
                  {report?.actualDate ? fmtDate(report.actualDate) : proposal.dateEst}
                </span>
              )}
              {(report?.actualLocation ?? proposal.location) && (
                <span className="flex items-center gap-1 font-label text-[10px]" style={{ color: "#a9b4b3" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: "0.75rem" }}>location_on</span>
                  {report?.actualLocation ?? proposal.location}
                </span>
              )}
            </div>
          </div>

          {/* Metrics (only for completed with a report) */}
          {isCompleted && report && (
            <div className="grid grid-cols-3 gap-2">
              {/* Budget */}
              <div
                className="rounded-xl p-3 flex flex-col gap-0.5"
                style={{ backgroundColor: "#f0f4f3" }}
              >
                <span className="font-label text-[8px] uppercase tracking-widest font-bold" style={{ color: "#707977" }}>
                  Spend
                </span>
                <span className="font-headline text-sm font-black" style={{ color: "#1a1f1f" }}>
                  {fmtCurrency(report.actualSpend)}
                </span>
                {proposal.budget != null && report.actualSpend != null && (() => {
                  const v = variance(report.actualSpend, proposal.budget);
                  if (v.zero) return null;
                  return (
                    <span
                      className="font-label text-[8px] font-bold"
                      style={{ color: v.positive ? "#2d5349" : "#9f403d" }}
                    >
                      {v.positive ? "↓" : "↑"} {v.pct}
                    </span>
                  );
                })()}
              </div>
              {/* Attendance */}
              <div
                className="rounded-xl p-3 flex flex-col gap-0.5"
                style={{ backgroundColor: "#f0f4f3" }}
              >
                <span className="font-label text-[8px] uppercase tracking-widest font-bold" style={{ color: "#707977" }}>
                  Attended
                </span>
                <span className="font-headline text-sm font-black" style={{ color: "#1a1f1f" }}>
                  {report.actualAttendance?.toLocaleString() ?? "—"}
                </span>
                {expectedAttendance != null && report.actualAttendance != null && (
                  <span className="font-label text-[8px] font-bold" style={{ color: "#707977" }}>
                    of {expectedAttendance.toLocaleString()} est.
                  </span>
                )}
              </div>
              {/* Show-up rate */}
              <div
                className="rounded-xl p-3 flex flex-col gap-0.5"
                style={{ backgroundColor: "#f0f4f3" }}
              >
                <span className="font-label text-[8px] uppercase tracking-widest font-bold" style={{ color: "#707977" }}>
                  Show-up
                </span>
                <span
                  className="font-headline text-sm font-black"
                  style={{
                    color: showUpRate == null ? "#1a1f1f"
                      : showUpRate >= 80 ? "#2d5349"
                      : showUpRate >= 60 ? "#78481e"
                      : "#9f403d",
                  }}
                >
                  {showUpRate != null ? `${showUpRate}%` : "—"}
                </span>
                {report.internalRating != null && (
                  <span className="font-label text-[8px] font-bold" style={{ color: "#707977" }}>
                    {"★".repeat(report.internalRating)}{"☆".repeat(5 - report.internalRating)}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Placeholder metrics for completed without report */}
          {isCompleted && !report && (
            <div
              className="flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{
                backgroundColor: "rgba(45,83,73,0.06)",
                border: "1px dashed rgba(45,83,73,0.3)",
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: "1rem", color: "#2d5349" }}>
                assignment
              </span>
              <p className="font-label text-[11px]" style={{ color: "#576160" }}>
                No event report filed yet
              </p>
            </div>
          )}

          {/* Rejection note */}
          {isRejected && (
            <div
              className="flex items-start gap-3 px-4 py-3 rounded-xl"
              style={{ backgroundColor: "rgba(159,64,61,0.06)", border: "1px solid rgba(159,64,61,0.15)" }}
            >
              <span className="material-symbols-outlined shrink-0" style={{ fontSize: "1rem", color: "#9f403d", marginTop: "1px" }}>
                cancel
              </span>
              <p className="font-label text-[11px]" style={{ color: "#9f403d" }}>
                {(proposal.metadata?.flagReason as string | undefined)
                  ?? "Proposal did not pass the approval process."}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 mt-auto pt-1">
            {isCompleted && !report && (
              <button
                onClick={() => setPanel("log")}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-label font-black text-[10px] uppercase tracking-widest transition-all hover:opacity-80"
                style={{ backgroundColor: "#2d5349", color: "#ffffff", flex: 1 }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: "0.9rem" }}>assignment_add</span>
                Log Event
              </button>
            )}
            {isCompleted && report && (
              <>
                <button
                  onClick={() => setPanel("view")}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-label font-black text-[10px] uppercase tracking-widest transition-all hover:opacity-80"
                  style={{ backgroundColor: "#2d5349", color: "#ffffff", flex: 1 }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: "0.9rem" }}>bar_chart</span>
                  View Report
                </button>
                <button
                  onClick={() => setPanel("log")}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-label font-black text-[10px] uppercase tracking-widest transition-all hover:opacity-80"
                  style={{ backgroundColor: "#dce5e3", color: "#1a1f1f" }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: "0.9rem" }}>edit</span>
                </button>
              </>
            )}
            <Link
              href={`/proposals/${proposal.id}`}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-label font-black text-[10px] uppercase tracking-widest transition-all hover:opacity-80"
              style={{ backgroundColor: "#dce5e3", color: "#1a1f1f" }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: "0.9rem" }}>open_in_new</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Panels */}
      {panel === "log" && (
        <LogEventPanel
          proposal={proposal}
          existingReport={report}
          onClose={() => setPanel(null)}
        />
      )}
      {panel === "view" && report && (
        <ViewReportPanel
          proposal={proposal}
          report={report}
          onClose={() => setPanel(null)}
          onEdit={() => setPanel("log")}
        />
      )}
    </>
  );
}

/* ── Stats bar ────────────────────────────────────────────────── */

function StatsBar({
  proposals,
  reports,
}: {
  proposals: ArchivedProposal[];
  reports: Record<string, SerializedEventReport>;
}) {
  const completed = proposals.filter((p) => p.status === "COMPLETED");
  const rejected  = proposals.filter((p) => p.status === "REJECTED");
  const withReport = completed.filter((p) => reports[p.id]);

  const totalActualSpend = withReport.reduce(
    (sum, p) => sum + (reports[p.id]?.actualSpend ?? 0), 0,
  );
  const totalEstimatedBudget = withReport.reduce(
    (sum, p) => sum + (p.budget ?? 0), 0,
  );
  const avgRating = (() => {
    const rated = withReport.filter((p) => reports[p.id]?.internalRating != null);
    if (rated.length === 0) return null;
    return (rated.reduce((s, p) => s + reports[p.id].internalRating!, 0) / rated.length).toFixed(1);
  })();

  const stats = [
    { label: "Completed Events",  value: completed.length.toString(),          icon: "task_alt" },
    { label: "Rejected Proposals",value: rejected.length.toString(),           icon: "cancel" },
    { label: "Reports Filed",     value: `${withReport.length}/${completed.length}`, icon: "assignment" },
    { label: "Total Actual Spend",value: withReport.length ? fmtCurrency(totalActualSpend) : "—", icon: "payments" },
    { label: "vs. Budget",        value: withReport.length && totalEstimatedBudget > 0
      ? `${Math.round(Math.abs((totalActualSpend - totalEstimatedBudget) / totalEstimatedBudget) * 100)}% ${totalActualSpend <= totalEstimatedBudget ? "under" : "over"}`
      : "—",
      icon: "trending_up" },
    { label: "Avg. Rating",       value: avgRating ? `${avgRating}/5` : "—",   icon: "star" },
  ];

  return (
    <div
      className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8"
    >
      {stats.map(({ label, value, icon }) => (
        <div
          key={label}
          className="rounded-2xl p-4 flex flex-col gap-2"
          style={{
            backgroundColor: "#ffffff",
            border: "1px solid rgba(155,168,167,0.25)",
            boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
          }}
        >
          <span
            className="material-symbols-outlined"
            style={{ fontSize: "1.1rem", color: "#2d5349" }}
          >
            {icon}
          </span>
          <p
            className="font-headline text-xl font-black tracking-tight"
            style={{ color: "#1a1f1f" }}
          >
            {value}
          </p>
          <p
            className="font-label text-[9px] uppercase tracking-widest font-bold leading-tight"
            style={{ color: "#707977" }}
          >
            {label}
          </p>
        </div>
      ))}
    </div>
  );
}

/* ── Main ArchiveClient ───────────────────────────────────────── */

type FilterTab = "all" | "completed" | "rejected";

export default function ArchiveClient({
  proposals,
  reports,
}: {
  proposals: ArchivedProposal[];
  reports: Record<string, SerializedEventReport>;
}) {
  const [filter, setFilter] = useState<FilterTab>("all");
  const [search, setSearch] = useState("");

  const filtered = proposals.filter((p) => {
    const matchFilter =
      filter === "all" ||
      (filter === "completed" && p.status === "COMPLETED") ||
      (filter === "rejected"  && p.status === "REJECTED");
    const matchSearch =
      search === "" ||
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      (p.location ?? "").toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: "8px 16px",
    borderRadius: "10px",
    fontFamily: "Space Grotesk, sans-serif",
    fontSize: "11px",
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "0.15em",
    cursor: "pointer",
    border: "none",
    transition: "all 0.15s",
    backgroundColor: active ? "#2d5349" : "transparent",
    color:           active ? "#ffffff" : "#707977",
  });

  return (
    <div className="pt-10 px-8 pb-16">
      {/* Header */}
      <div className="mb-8">
        <h1
          className="font-headline text-4xl font-black tracking-tighter"
          style={{ color: "#1a1f1f" }}
        >
          Archive
        </h1>
        <p
          className="font-label font-bold text-[11px] uppercase tracking-[0.2em] mt-2"
          style={{ color: "#707977" }}
        >
          Completed events and closed proposals
        </p>
      </div>

      {/* Stats bar */}
      <StatsBar proposals={proposals} reports={reports} />

      {/* Filter + search bar */}
      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <div
          className="flex items-center gap-1 p-1 rounded-xl"
          style={{ backgroundColor: "#f0f4f3" }}
        >
          {(["all", "completed", "rejected"] as FilterTab[]).map((tab) => (
            <button
              key={tab}
              style={tabStyle(filter === tab)}
              onClick={() => setFilter(tab)}
            >
              {tab === "all"
                ? `All (${proposals.length})`
                : tab === "completed"
                ? `Completed (${proposals.filter((p) => p.status === "COMPLETED").length})`
                : `Rejected (${proposals.filter((p) => p.status === "REJECTED").length})`}
            </button>
          ))}
        </div>

        {/* Search */}
        <div
          className="flex items-center gap-2 px-4 py-2 rounded-xl flex-1 max-w-xs"
          style={{
            backgroundColor: "#ffffff",
            border: "1.5px solid rgba(155,168,167,0.35)",
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: "1rem", color: "#a9b4b3" }}>search</span>
          <input
            type="text"
            placeholder="Search by title or location…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent outline-none font-label text-[12px]"
            style={{ color: "#1a1f1f" }}
          />
          {search && (
            <button onClick={() => setSearch("")}>
              <span className="material-symbols-outlined" style={{ fontSize: "0.9rem", color: "#a9b4b3" }}>close</span>
            </button>
          )}
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center gap-4 py-24 rounded-2xl"
          style={{ backgroundColor: "#f0f4f3", border: "1px dashed rgba(155,168,167,0.4)" }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: "3rem", color: "#c8d5d3" }}>
            inventory_2
          </span>
          <p className="font-label text-[11px] uppercase tracking-widest font-bold" style={{ color: "#a9b4b3" }}>
            {search ? "No results found" : "Nothing archived yet"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((proposal) => (
            <ArchiveCard
              key={proposal.id}
              proposal={proposal}
              report={reports[proposal.id] ?? null}
            />
          ))}
        </div>
      )}
    </div>
  );
}
