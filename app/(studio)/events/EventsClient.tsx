"use client";

import Link from "next/link";
import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { completeProposal, saveEventReport } from "@/app/(studio)/proposals/archived/actions";
import type { SerializedEventReport, EventReportData } from "@/app/(studio)/proposals/archived/actions";

/* ── Types ─────────────────────────────────────────────────────── */

export type ActiveEvent = {
  id: string;
  title: string;
  type: string;
  status: string;
  dateEst: string | null;
  budget: number | null;
  location: string | null;
  coverImageUrl: string | null;
  imageGradient: string | null;
  description: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  authors:     { name: string; initial: string | null; isPrimary: boolean; role: string }[];
  tags:        { label: string }[];
  departments: { id: string; name: string }[];
};

/* ── Formatters ────────────────────────────────────────────────── */

function fmtCurrency(n: number | null | undefined) {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD", maximumFractionDigits: 0,
  }).format(n);
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

/* ── Type chip ─────────────────────────────────────────────────── */

const TYPE_COLOR: Record<string, { bg: string; text: string }> = {
  EVENT:       { bg: "rgba(45,83,73,0.12)",   text: "#2d5349" },
  SUMMIT:      { bg: "rgba(62,82,125,0.12)",  text: "#3e527d" },
  EXHIBITION:  { bg: "rgba(120,72,30,0.12)",  text: "#78481e" },
  WEDDING:     { bg: "rgba(140,50,100,0.12)", text: "#8c3264" },
  PERFORMANCE: { bg: "rgba(30,110,100,0.12)", text: "#1e6e64" },
  INTERNAL:    { bg: "rgba(100,100,100,0.12)",text: "#606060" },
};

function TypeChip({ type }: { type: string }) {
  const c = TYPE_COLOR[type] ?? TYPE_COLOR.INTERNAL;
  return (
    <span
      className="px-2.5 py-1 rounded-full font-label font-black text-[9px] uppercase tracking-[0.15em]"
      style={{ backgroundColor: c.bg, color: c.text }}
    >
      {type.charAt(0) + type.slice(1).toLowerCase()}
    </span>
  );
}

/* ── Star rating ───────────────────────────────────────────────── */

function StarRating({ value, onChange }: { value: number | null; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState<number | null>(null);
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((s) => {
        const filled = (hovered ?? value ?? 0) >= s;
        return (
          <button key={s} type="button"
            onMouseEnter={() => setHovered(s)} onMouseLeave={() => setHovered(null)}
            onClick={() => onChange(s)} className="transition-transform hover:scale-110"
          >
            <span className="material-symbols-outlined" style={{
              fontSize: "1.4rem", color: filled ? "#2d5349" : "#c8d5d3",
              fontVariationSettings: filled ? "'FILL' 1" : "'FILL' 0",
            }}>star</span>
          </button>
        );
      })}
    </div>
  );
}

/* ── Log + Close Panel ─────────────────────────────────────────── */
// Combined "close event" panel — fills in report data, then on confirm
// calls completeProposal + saveEventReport together.

function CloseEventPanel({
  event,
  existingReport,
  onClose,
  canManage,
}: {
  event: ActiveEvent;
  existingReport: SerializedEventReport | null;
  onClose: () => void;
  canManage: boolean;
}) {
  const router  = useRouter();
  const [isPending, start] = useTransition();
  const [step, setStep]    = useState<"form" | "confirm" | "done">("form");
  const [err, setErr]      = useState<string | null>(null);

  const ea = event.metadata?.expectedAttendance as number | undefined;

  const [form, setForm] = useState({
    actualDate:       existingReport?.actualDate
      ? new Date(existingReport.actualDate).toISOString().split("T")[0] : "",
    actualLocation:   existingReport?.actualLocation   ?? event.location ?? "",
    actualSpend:      existingReport?.actualSpend      != null ? String(existingReport.actualSpend) : "",
    signedUpCount:    existingReport?.signedUpCount    != null ? String(existingReport.signedUpCount) : "",
    actualAttendance: existingReport?.actualAttendance != null ? String(existingReport.actualAttendance) : "",
    summary:          existingReport?.summary    ?? "",
    highlights:       existingReport?.highlights ?? "",
    challenges:       existingReport?.challenges ?? "",
    internalRating:   existingReport?.internalRating ?? null as number | null,
  });

  const f = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((v) => ({ ...v, [k]: e.target.value }));

  const inputCls: React.CSSProperties = {
    width: "100%", padding: "10px 14px", borderRadius: "10px",
    border: "1.5px solid rgba(155,168,167,0.4)", backgroundColor: "#f8fafa",
    fontFamily: "Space Grotesk, sans-serif", fontSize: "13px", color: "#1a1f1f", outline: "none",
  };
  const lbl: React.CSSProperties = {
    display: "block", fontFamily: "Space Grotesk, sans-serif", fontSize: "10px",
    fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em",
    color: "#576160", marginBottom: "5px",
  };
  const sec = "py-5 border-b border-[rgba(155,168,167,0.18)]";
  const secHead: React.CSSProperties = {
    fontFamily: "Space Grotesk, sans-serif", fontSize: "10px", fontWeight: 800,
    textTransform: "uppercase", letterSpacing: "0.18em", color: "#2d5349", marginBottom: "12px",
  };

  function handleClose() {
    if (!canManage) return;
    const data: EventReportData = {
      actualDate:       form.actualDate || null,
      actualLocation:   form.actualLocation || null,
      actualSpend:      form.actualSpend       ? Number(form.actualSpend) : null,
      signedUpCount:    form.signedUpCount     ? Number(form.signedUpCount) : null,
      actualAttendance: form.actualAttendance  ? Number(form.actualAttendance) : null,
      summary:          form.summary    || null,
      highlights:       form.highlights || null,
      challenges:       form.challenges || null,
      internalRating:   form.internalRating,
    };

    start(async () => {
      // Save report first (ok if event isn't closed yet)
      const rRes = await saveEventReport(event.id, data);
      if ("error" in rRes) { setErr(rRes.error); return; }

      // Then complete the proposal
      const cRes = await completeProposal(event.id);
      if (cRes && "error" in cRes) { setErr(cRes.error); return; }

      setStep("done");
      setTimeout(() => { router.refresh(); router.push("/proposals/archived"); }, 1200);
    });
  }

  if (step === "done") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center"
        style={{ backgroundColor: "rgba(20,28,27,0.55)", backdropFilter: "blur(6px)" }}>
        <div className="flex flex-col items-center gap-4 p-12 rounded-3xl"
          style={{ backgroundColor: "#ffffff", boxShadow: "0 32px 80px rgba(0,0,0,0.15)" }}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ backgroundColor: "#c2ebdc" }}>
            <span className="material-symbols-outlined" style={{ fontSize: "2rem", color: "#2d5349" }}>task_alt</span>
          </div>
          <p className="font-headline text-xl font-black" style={{ color: "#1a1f1f" }}>Event Closed</p>
          <p className="font-label text-[11px] uppercase tracking-widest" style={{ color: "#707977" }}>
            Moving to archive…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end"
      style={{ backgroundColor: "rgba(20,28,27,0.45)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="flex flex-col h-full overflow-hidden"
        style={{ width: "min(580px, 100vw)", backgroundColor: "#ffffff", boxShadow: "-8px 0 40px rgba(0,0,0,0.12)" }}>

        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-8 py-5 shrink-0"
          style={{ borderBottom: "1px solid rgba(155,168,167,0.2)", backgroundColor: "#f8fafa" }}>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: "#40665a" }} />
              <span className="font-label text-[9px] font-black uppercase tracking-widest" style={{ color: "#40665a" }}>Live Event</span>
            </div>
            <h2 className="font-headline text-lg font-black tracking-tight" style={{ color: "#1a1f1f" }}>
              Close & Log Event
            </h2>
            <p className="font-label text-[11px] mt-0.5" style={{ color: "#707977" }}>{event.title}</p>
          </div>
          <button onClick={onClose} className="mt-1 rounded-lg p-1.5 hover:bg-gray-100 transition-colors">
            <span className="material-symbols-outlined" style={{ fontSize: "1.2rem", color: "#576160" }}>close</span>
          </button>
        </div>

        {/* Scrollable form */}
        <div className="flex-1 overflow-y-auto px-8">

          {/* Info banner */}
          <div className="flex items-start gap-3 my-5 px-4 py-3 rounded-xl"
            style={{ backgroundColor: "rgba(45,83,73,0.07)", border: "1px solid rgba(45,83,73,0.2)" }}>
            <span className="material-symbols-outlined shrink-0" style={{ fontSize: "1rem", color: "#2d5349", marginTop: "1px" }}>info</span>
            <p className="font-label text-[11px] leading-relaxed" style={{ color: "#2d5349" }}>
              Fill in the actuals below (all optional). Clicking <strong>Close Event</strong> will
              save the report and move this project to Archive.
            </p>
          </div>

          {/* Section 1 — Outcome */}
          <div className={sec}>
            <p style={secHead}>Outcome</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label style={lbl}>Actual Date</label>
                <input type="date" value={form.actualDate} onChange={f("actualDate")} style={inputCls} />
              </div>
              <div>
                <label style={lbl}>Actual Location</label>
                <input type="text" placeholder={event.location ?? "Venue"} value={form.actualLocation} onChange={f("actualLocation")} style={inputCls} />
              </div>
            </div>
          </div>

          {/* Section 2 — Finance */}
          <div className={sec}>
            <p style={secHead}>Financial</p>
            {event.budget != null && (
              <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg"
                style={{ backgroundColor: "#f0f4f3", border: "1px solid rgba(45,83,73,0.12)" }}>
                <span className="material-symbols-outlined" style={{ fontSize: "0.9rem", color: "#2d5349" }}>payments</span>
                <p className="font-label text-[11px]" style={{ color: "#576160" }}>
                  Estimated budget: <strong>{fmtCurrency(event.budget)}</strong>
                </p>
              </div>
            )}
            <div>
              <label style={lbl}>Actual Spend (USD)</label>
              <input type="number" min={0} placeholder="0" value={form.actualSpend} onChange={f("actualSpend")} style={inputCls} />
            </div>
            {form.actualSpend && event.budget != null && (() => {
              const diff = Number(form.actualSpend) - event.budget;
              const pct  = Math.abs(Math.round((diff / event.budget) * 100));
              const under = diff <= 0;
              return (
                <div className="mt-2 flex items-center gap-2 px-3 py-1.5 rounded-lg"
                  style={{ backgroundColor: under ? "rgba(45,83,73,0.07)" : "rgba(159,64,61,0.07)",
                    border: `1px solid ${under ? "rgba(45,83,73,0.2)" : "rgba(159,64,61,0.2)"}` }}>
                  <span className="material-symbols-outlined" style={{ fontSize: "0.9rem", color: under ? "#2d5349" : "#9f403d" }}>
                    {under ? "trending_down" : "trending_up"}
                  </span>
                  <span className="font-label text-[11px] font-bold" style={{ color: under ? "#2d5349" : "#9f403d" }}>
                    {pct}% {under ? "under budget" : "over budget"}
                  </span>
                </div>
              );
            })()}
          </div>

          {/* Section 3 — Attendance */}
          <div className={sec}>
            <p style={secHead}>Attendance</p>
            {ea != null && (
              <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg"
                style={{ backgroundColor: "#f0f4f3", border: "1px solid rgba(45,83,73,0.12)" }}>
                <span className="material-symbols-outlined" style={{ fontSize: "0.9rem", color: "#2d5349" }}>groups</span>
                <p className="font-label text-[11px]" style={{ color: "#576160" }}>
                  Estimated: <strong>{ea.toLocaleString()}</strong>
                </p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label style={lbl}>Signed Up</label>
                <input type="number" min={0} placeholder="0" value={form.signedUpCount} onChange={f("signedUpCount")} style={inputCls} />
                <p className="font-label text-[9px] mt-1" style={{ color: "#a9b4b3" }}>RSVPs / registrations</p>
              </div>
              <div>
                <label style={lbl}>Showed Up</label>
                <input type="number" min={0} placeholder="0" value={form.actualAttendance} onChange={f("actualAttendance")} style={inputCls} />
                <p className="font-label text-[9px] mt-1" style={{ color: "#a9b4b3" }}>Physical attendance</p>
              </div>
            </div>
            {form.signedUpCount && form.actualAttendance && (() => {
              const rate = Math.round(Number(form.actualAttendance) / Number(form.signedUpCount) * 100);
              const color = rate >= 80 ? "#2d5349" : rate >= 60 ? "#78481e" : "#9f403d";
              return (
                <div className="mt-2 flex items-center gap-2 px-3 py-1.5 rounded-lg"
                  style={{ backgroundColor: "rgba(45,83,73,0.06)", border: "1px solid rgba(45,83,73,0.15)" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: "0.9rem", color }}>
                    {rate >= 80 ? "check_circle" : rate >= 60 ? "info" : "warning"}
                  </span>
                  <span className="font-label text-[11px] font-bold" style={{ color }}>
                    {rate}% show-up rate
                  </span>
                </div>
              );
            })()}
          </div>

          {/* Section 4 — Reflection */}
          <div className={sec}>
            <p style={secHead}>Reflection</p>
            <div className="flex flex-col gap-3">
              {[
                { key: "summary"    as const, lbl: "Summary",    ph: "How did the event go overall?" },
                { key: "highlights" as const, lbl: "Highlights", ph: "Key wins and memorable moments…" },
                { key: "challenges" as const, lbl: "Challenges", ph: "What could be improved next time?" },
              ].map(({ key, lbl: l, ph }) => (
                <div key={key}>
                  <label style={lbl}>{l}</label>
                  <textarea rows={2} placeholder={ph} value={form[key]} onChange={f(key)}
                    style={{ ...inputCls, resize: "vertical", lineHeight: 1.6 } as React.CSSProperties} />
                </div>
              ))}
            </div>
          </div>

          {/* Section 5 — Rating */}
          <div className="py-5 pb-8">
            <p style={secHead}>Internal Rating</p>
            <StarRating value={form.internalRating}
              onChange={(v) => setForm((s) => ({ ...s, internalRating: v }))} />
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 px-8 py-5 flex items-center justify-between gap-4"
          style={{ borderTop: "1px solid rgba(155,168,167,0.2)", backgroundColor: "#f8fafa" }}>
          {err
            ? <p className="font-label text-[11px] font-bold" style={{ color: "#ba1a1a" }}>{err}</p>
            : <p className="font-label text-[11px]" style={{ color: "#a9b4b3" }}>All fields are optional</p>
          }
          <div className="flex items-center gap-3 shrink-0">
            <button type="button" onClick={onClose}
              className="px-4 py-2.5 rounded-xl font-label font-black text-[11px] uppercase tracking-widest transition-all hover:opacity-80"
              style={{ backgroundColor: "#dce5e3", color: "#1a1f1f" }}>
              Cancel
            </button>
            {canManage && (
              <button type="button" onClick={handleClose} disabled={isPending}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-label font-black text-[11px] uppercase tracking-widest transition-all hover:opacity-80 disabled:opacity-50"
                style={{ backgroundColor: "#1a1f1f", color: "#ffffff" }}>
                <span className="material-symbols-outlined" style={{ fontSize: "1rem" }}>
                  {isPending ? "hourglass_empty" : "task_alt"}
                </span>
                {isPending ? "Closing…" : "Close Event"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Stats Panel ───────────────────────────────────────────────── */

function StatsPanel({
  event,
  report,
  onClose,
  onLog,
}: {
  event: ActiveEvent;
  report: SerializedEventReport;
  onClose: () => void;
  onLog: () => void;
}) {
  const ea = event.metadata?.expectedAttendance as number | null | undefined;

  function fmt(n: number | null | undefined) { return n != null ? n.toLocaleString() : "—"; }
  function fmtDate(iso: string | null | undefined) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  const showUpRate = report.actualAttendance != null && report.signedUpCount != null && report.signedUpCount > 0
    ? Math.round(report.actualAttendance / report.signedUpCount * 100) : null;

  const budgetDiff = report.actualSpend != null && event.budget != null
    ? { pct: Math.abs(Math.round((report.actualSpend - event.budget) / event.budget * 100)), under: report.actualSpend <= event.budget }
    : null;

  const tile = (label: string, value: string, sub?: string, color?: string) => (
    <div className="rounded-xl p-4 flex flex-col gap-1"
      style={{ backgroundColor: "#f0f4f3", border: "1px solid rgba(155,168,167,0.2)" }}>
      <span className="font-label text-[8px] uppercase tracking-widest font-bold" style={{ color: "#707977" }}>{label}</span>
      <span className="font-headline text-xl font-black tracking-tight" style={{ color: color ?? "#1a1f1f" }}>{value}</span>
      {sub && <span className="font-label text-[10px]" style={{ color: "#a9b4b3" }}>{sub}</span>}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end"
      style={{ backgroundColor: "rgba(20,28,27,0.45)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="flex flex-col h-full overflow-hidden"
        style={{ width: "min(520px, 100vw)", backgroundColor: "#ffffff", boxShadow: "-8px 0 40px rgba(0,0,0,0.12)" }}>

        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-8 py-5 shrink-0"
          style={{ borderBottom: "1px solid rgba(155,168,167,0.2)", backgroundColor: "#f8fafa" }}>
          <div>
            <h2 className="font-headline text-lg font-black tracking-tight" style={{ color: "#1a1f1f" }}>
              Event Statistics
            </h2>
            <p className="font-label text-[11px] mt-0.5" style={{ color: "#707977" }}>{event.title}</p>
            <p className="font-label text-[10px] mt-1" style={{ color: "#a9b4b3" }}>
              Filed by {report.reportedByName} · {fmtDate(report.updatedAt)}
            </p>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <button onClick={onLog}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-label font-black text-[10px] uppercase tracking-widest transition-all hover:opacity-80"
              style={{ backgroundColor: "#dce5e3", color: "#1a1f1f" }}>
              <span className="material-symbols-outlined" style={{ fontSize: "0.85rem" }}>edit</span>
              Edit
            </button>
            <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-gray-100 transition-colors">
              <span className="material-symbols-outlined" style={{ fontSize: "1.2rem", color: "#576160" }}>close</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-8 py-6 flex flex-col gap-6">

          {/* Outcome */}
          <div>
            <p className="font-label text-[10px] font-black uppercase tracking-[0.18em] mb-3" style={{ color: "#2d5349" }}>Outcome</p>
            <div className="grid grid-cols-2 gap-3">
              {tile("Actual Date",     fmtDate(report.actualDate))}
              {tile("Actual Location", report.actualLocation ?? "—")}
            </div>
          </div>

          {/* Finance */}
          <div>
            <p className="font-label text-[10px] font-black uppercase tracking-[0.18em] mb-3" style={{ color: "#2d5349" }}>Financial</p>
            <div className="grid grid-cols-3 gap-3">
              {tile("Est. Budget",  fmtCurrency(event.budget))}
              {tile("Actual Spend", fmtCurrency(report.actualSpend))}
              {tile("Variance",
                budgetDiff ? `${budgetDiff.pct}% ${budgetDiff.under ? "under" : "over"}` : "—",
                undefined,
                budgetDiff ? (budgetDiff.under ? "#2d5349" : "#9f403d") : undefined,
              )}
            </div>
          </div>

          {/* Attendance */}
          <div>
            <p className="font-label text-[10px] font-black uppercase tracking-[0.18em] mb-3" style={{ color: "#2d5349" }}>Attendance</p>
            <div className="grid grid-cols-2 gap-3">
              {ea != null && tile("Estimated",   fmt(ea),                     "Expected")}
              {tile("Signed Up",   fmt(report.signedUpCount),    "RSVPs")}
              {tile("Showed Up",   fmt(report.actualAttendance), "Attended")}
              {tile("Show-up Rate",
                showUpRate != null ? `${showUpRate}%` : "—",
                "of sign-ups",
                showUpRate == null ? undefined : showUpRate >= 80 ? "#2d5349" : showUpRate >= 60 ? "#78481e" : "#9f403d",
              )}
            </div>
          </div>

          {/* Reflection */}
          {(report.summary || report.highlights || report.challenges) && (
            <div>
              <p className="font-label text-[10px] font-black uppercase tracking-[0.18em] mb-3" style={{ color: "#2d5349" }}>Reflection</p>
              <div className="flex flex-col gap-4">
                {[
                  { key: "summary",    label: "Summary",    icon: "edit_note" },
                  { key: "highlights", label: "Highlights", icon: "star" },
                  { key: "challenges", label: "Challenges", icon: "warning" },
                ].map(({ key, label, icon }) => {
                  const val = report[key as keyof SerializedEventReport] as string | null;
                  if (!val) return null;
                  return (
                    <div key={key} className="rounded-xl p-4"
                      style={{ backgroundColor: "#f0f4f3", border: "1px solid rgba(155,168,167,0.2)" }}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="material-symbols-outlined" style={{ fontSize: "0.9rem", color: "#2d5349" }}>{icon}</span>
                        <span className="font-label text-[9px] uppercase tracking-widest font-bold" style={{ color: "#707977" }}>{label}</span>
                      </div>
                      <p className="text-sm leading-relaxed" style={{ color: "#2d3a38" }}>{val}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Rating */}
          {report.internalRating != null && (
            <div>
              <p className="font-label text-[10px] font-black uppercase tracking-[0.18em] mb-3" style={{ color: "#2d5349" }}>Internal Rating</p>
              <div className="flex items-center gap-2">
                {[1,2,3,4,5].map((s) => (
                  <span key={s} className="material-symbols-outlined" style={{
                    fontSize: "1.5rem",
                    color: s <= report.internalRating! ? "#2d5349" : "#c8d5d3",
                    fontVariationSettings: s <= report.internalRating! ? "'FILL' 1" : "'FILL' 0",
                  }}>star</span>
                ))}
                <span className="font-headline text-lg font-black ml-1" style={{ color: "#2d5349" }}>
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

/* ── Event Card ─────────────────────────────────────────────────── */

function EventCard({
  event,
  report,
  canManage,
}: {
  event: ActiveEvent;
  report: SerializedEventReport | null;
  canManage: boolean;
}) {
  const [panel, setPanel] = useState<"close" | "stats" | null>(null);
  const ea = event.metadata?.expectedAttendance as number | null | undefined;

  return (
    <>
      <div className="flex flex-col rounded-2xl overflow-hidden transition-shadow hover:shadow-lg"
        style={{ backgroundColor: "#ffffff", border: "1px solid rgba(155,168,167,0.25)",
          boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>

        {/* Live indicator bar */}
        <div className="flex items-center gap-2 px-5 py-2.5"
          style={{ backgroundColor: "#2d5349" }}>
          <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          <span className="font-label text-[9px] font-black uppercase tracking-[0.2em] text-white">Active</span>
          <span className="ml-auto font-label text-[9px] uppercase tracking-widest text-white/60">
            {timeAgo(event.updatedAt)}
          </span>
        </div>

        {/* Cover */}
        <div className="relative h-36 overflow-hidden"
          style={{
            background: event.coverImageUrl ? undefined
              : (event.imageGradient ?? "linear-gradient(135deg, #c2ebdc 0%, #e9efee 100%)"),
          }}>
          {event.coverImageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={event.coverImageUrl} alt="" className="w-full h-full object-cover" />
          )}
          <div className="absolute top-3 right-3">
            <TypeChip type={event.type} />
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-col flex-1 p-5 gap-4">
          {/* Title + meta */}
          <div>
            <h3 className="font-headline text-base font-black tracking-tight leading-tight"
              style={{ color: "#1a1f1f" }}>
              {event.title}
            </h3>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
              {event.dateEst && (
                <span className="flex items-center gap-1 font-label text-[10px]" style={{ color: "#707977" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: "0.75rem" }}>calendar_today</span>
                  {event.dateEst}
                </span>
              )}
              {event.location && (
                <span className="flex items-center gap-1 font-label text-[10px]" style={{ color: "#707977" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: "0.75rem" }}>location_on</span>
                  {event.location}
                </span>
              )}
            </div>
          </div>

          {/* Key metrics row */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl p-3 flex flex-col gap-0.5" style={{ backgroundColor: "#f0f4f3" }}>
              <span className="font-label text-[8px] uppercase tracking-widest font-bold" style={{ color: "#707977" }}>Budget</span>
              <span className="font-headline text-sm font-black" style={{ color: "#1a1f1f" }}>
                {fmtCurrency(event.budget)}
              </span>
            </div>
            <div className="rounded-xl p-3 flex flex-col gap-0.5" style={{ backgroundColor: "#f0f4f3" }}>
              <span className="font-label text-[8px] uppercase tracking-widest font-bold" style={{ color: "#707977" }}>Expected</span>
              <span className="font-headline text-sm font-black" style={{ color: "#1a1f1f" }}>
                {ea != null ? ea.toLocaleString() : "—"}
              </span>
            </div>
            <div className="rounded-xl p-3 flex flex-col gap-0.5" style={{ backgroundColor: "#f0f4f3" }}>
              <span className="font-label text-[8px] uppercase tracking-widest font-bold" style={{ color: "#707977" }}>Depts</span>
              <span className="font-headline text-sm font-black" style={{ color: "#1a1f1f" }}>
                {event.departments.length}
              </span>
            </div>
          </div>

          {/* Authors */}
          {event.authors.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {event.authors.slice(0, 4).map((a, i) => (
                  <div key={i}
                    title={a.name}
                    className="w-7 h-7 rounded-full flex items-center justify-center font-label font-black text-[10px]"
                    style={{ backgroundColor: "#c2ebdc", color: "#2d5349",
                      border: "2px solid #ffffff", zIndex: 10 - i }}>
                    {a.initial ?? a.name.charAt(0)}
                  </div>
                ))}
              </div>
              <span className="font-label text-[10px]" style={{ color: "#707977" }}>
                {event.authors[0]?.name}
                {event.authors.length > 1 && ` +${event.authors.length - 1}`}
              </span>
            </div>
          )}

          {/* Tags */}
          {event.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {event.tags.slice(0, 4).map((t) => (
                <span key={t.label}
                  className="px-2 py-0.5 rounded-full font-label text-[9px] font-bold uppercase tracking-wider"
                  style={{ backgroundColor: "#f0f4f3", color: "#576160" }}>
                  {t.label}
                </span>
              ))}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-2 mt-auto pt-1">
            {canManage && (
              <button onClick={() => setPanel("close")}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-label font-black text-[10px] uppercase tracking-widest transition-all hover:opacity-80"
                style={{ backgroundColor: "#1a1f1f", color: "#ffffff", flex: 1 }}>
                <span className="material-symbols-outlined" style={{ fontSize: "0.9rem" }}>task_alt</span>
                Close & Log
              </button>
            )}
            {report && (
              <button onClick={() => setPanel("stats")}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-label font-black text-[10px] uppercase tracking-widest transition-all hover:opacity-80"
                style={{ backgroundColor: "#dce5e3", color: "#1a1f1f" }}>
                <span className="material-symbols-outlined" style={{ fontSize: "0.9rem" }}>bar_chart</span>
                Stats
              </button>
            )}
            <Link href={`/proposals/${event.id}`}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-label font-black text-[10px] uppercase tracking-widest transition-all hover:opacity-80"
              style={{ backgroundColor: "#dce5e3", color: "#1a1f1f" }}>
              <span className="material-symbols-outlined" style={{ fontSize: "0.9rem" }}>open_in_new</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Panels */}
      {panel === "close" && (
        <CloseEventPanel
          event={event} existingReport={report}
          canManage={canManage} onClose={() => setPanel(null)}
        />
      )}
      {panel === "stats" && report && (
        <StatsPanel
          event={event} report={report}
          onClose={() => setPanel(null)} onLog={() => setPanel("close")}
        />
      )}
    </>
  );
}

/* ── Empty State ────────────────────────────────────────────────── */

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-5 py-32 rounded-3xl"
      style={{ backgroundColor: "#f0f4f3", border: "1px dashed rgba(155,168,167,0.5)" }}>
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
        style={{ backgroundColor: "#e0eae7" }}>
        <span className="material-symbols-outlined" style={{ fontSize: "2rem", color: "#9ba8a7" }}>
          event_available
        </span>
      </div>
      <div className="flex flex-col items-center gap-1 text-center">
        <p className="font-headline text-lg font-black" style={{ color: "#3d4a47" }}>
          No active events
        </p>
        <p className="font-label text-[11px] uppercase tracking-widest" style={{ color: "#a9b4b3" }}>
          Activated proposals will appear here
        </p>
      </div>
      <Link href="/proposals"
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-label font-black text-[11px] uppercase tracking-widest transition-all hover:opacity-80"
        style={{ backgroundColor: "#2d5349", color: "#ffffff" }}>
        <span className="material-symbols-outlined" style={{ fontSize: "1rem" }}>description</span>
        View All Proposals
      </Link>
    </div>
  );
}

/* ── Main ───────────────────────────────────────────────────────── */

export default function EventsClient({
  events,
  reports,
  canManage,
}: {
  events: ActiveEvent[];
  reports: Record<string, SerializedEventReport>;
  canManage: boolean;
}) {
  return (
    <div className="pt-10 px-8 pb-16">
      {/* Header */}
      <div className="flex items-end justify-between mb-8 gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ backgroundColor: "#40665a" }} />
            <span className="font-label text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: "#40665a" }}>
              Live
            </span>
          </div>
          <h1 className="font-headline text-4xl font-black tracking-tighter" style={{ color: "#1a1f1f" }}>
            Active <span style={{ color: "#2d5349" }}>Events</span>
          </h1>
          <p className="font-label font-bold text-[11px] uppercase tracking-[0.2em] mt-2" style={{ color: "#707977" }}>
            {events.length === 0
              ? "No events currently active"
              : `${events.length} event${events.length !== 1 ? "s" : ""} in progress`}
          </p>
        </div>

        {events.length > 0 && (
          <div className="flex items-center gap-3 shrink-0">
            <div className="rounded-2xl px-5 py-3 flex flex-col gap-0.5"
              style={{ backgroundColor: "#ffffff", border: "1px solid rgba(155,168,167,0.25)" }}>
              <span className="font-label text-[9px] uppercase tracking-widest font-bold" style={{ color: "#707977" }}>Total Budget</span>
              <span className="font-headline text-lg font-black" style={{ color: "#1a1f1f" }}>
                {fmtCurrency(events.reduce((s, e) => s + (e.budget ?? 0), 0))}
              </span>
            </div>
            <div className="rounded-2xl px-5 py-3 flex flex-col gap-0.5"
              style={{ backgroundColor: "#ffffff", border: "1px solid rgba(155,168,167,0.25)" }}>
              <span className="font-label text-[9px] uppercase tracking-widest font-bold" style={{ color: "#707977" }}>Est. Attendance</span>
              <span className="font-headline text-lg font-black" style={{ color: "#1a1f1f" }}>
                {(() => {
                  const total = events.reduce((s, e) =>
                    s + ((e.metadata?.expectedAttendance as number | undefined) ?? 0), 0);
                  return total > 0 ? total.toLocaleString() : "—";
                })()}
              </span>
            </div>
          </div>
        )}
      </div>

      {events.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {events.map((ev) => (
            <EventCard
              key={ev.id}
              event={ev}
              report={reports[ev.id] ?? null}
              canManage={canManage}
            />
          ))}
        </div>
      )}
    </div>
  );
}
