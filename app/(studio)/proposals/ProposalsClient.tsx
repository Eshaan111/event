"use client";

import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Proposal, ProposalAuthor, ProposalTag } from "@prisma/client";

export type ProposalWithRelations = Omit<Proposal, "createdAt" | "updatedAt"> & {
  createdAt: string;
  updatedAt: string;
  authors: ProposalAuthor[];
  tags: ProposalTag[];
};

/* ── Helpers ────────────────────────────────────────────────── */

function statusToBadgeType(status: string): BadgeType {
  if (status === "APPROVED") return "approved";
  if (status === "FLAGGED")  return "flagged";
  if (status === "ACTIVE")   return "active";
  if (status === "DRAFT")    return "draft";
  if (status === "REJECTED") return "rejected";
  return "draft";
}

/** Parse strings like "May 2026" → Date(2026-05-01) */
function parseDateEst(s: string | null): Date | null {
  if (!s) return null;
  const d = new Date(`1 ${s}`);
  return isNaN(d.getTime()) ? null : d;
}

function fmtMonthYear(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}
function fmtDate(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/* ── Badge ──────────────────────────────────────────────────── */
type BadgeType = "approved" | "flagged" | "active" | "draft" | "rejected";

const badgeConfig: Record<BadgeType, { label: string; bg: string; text: string; border: string; glow?: string }> = {
  approved:        { label: "Approved",        bg: "#d3dbd6",             text: "#0f1d19",  border: "transparent" },
  flagged:         { label: "Flagged",         bg: "rgba(186,26,26,0.1)", text: "#ba1a1a",  border: "rgba(186,26,26,0.2)" },
  active:          { label: "Active",          bg: "#c2ebdc",             text: "#0f2e22",  border: "transparent" },
  draft:           { label: "Draft",           bg: "rgba(112,121,119,0.1)", text: "#3d4a47", border: "rgba(112,121,119,0.2)" },
  rejected:        { label: "Rejected",        bg: "rgba(159,64,61,0.1)", text: "#9f403d",  border: "rgba(159,64,61,0.2)" },
};

function Badge({ type }: { type: BadgeType }) {
  const cfg = badgeConfig[type];
  return (
    <span
      className="px-4 py-1.5 rounded-full font-label font-black text-[10px] uppercase tracking-[0.15em]"
      style={{
        backgroundColor: cfg.bg, color: cfg.text,
        border: `1px solid ${cfg.border}`,
        boxShadow: cfg.glow ? `0 0 12px ${cfg.glow}` : "none",
      }}
    >
      {cfg.label}
    </span>
  );
}

/* ── Action Button ──────────────────────────────────────────── */
type ActionVariant = "primary" | "outline" | "neutral";

const actionStyles: Record<ActionVariant, React.CSSProperties> = {
  primary: { backgroundColor: "#2d5349", color: "#ffffff", border: "none", boxShadow: "0 4px 12px rgba(45,83,73,0.2)" },
  outline: { backgroundColor: "transparent", color: "#2d5349", border: "2px solid #2d5349" },
  neutral: { backgroundColor: "#dce5e3", color: "#1a1f1f", border: "none" },
};

function ActionButton({ label, variant, onClick }: { label: string; variant: ActionVariant; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="px-6 py-2.5 rounded-xl font-label font-black text-[11px] uppercase tracking-widest transition-all hover:opacity-80 active:scale-95" style={actionStyles[variant]}>
      {label}
    </button>
  );
}

/* ── Calendar Range Picker ──────────────────────────────────── */
interface DateRange { start: Date | null; end: Date | null }

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function CalendarPicker({
  value,
  onChange,
  onClose,
}: {
  value: DateRange;
  onChange: (r: DateRange) => void;
  onClose: () => void;
}) {
  const today = new Date();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [hovered, setHovered] = useState<Date | null>(null);
  const [selecting, setSelecting] = useState<"start" | "end">("start");

  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const firstDow = new Date(cursor.getFullYear(), cursor.getMonth(), 1).getDay();

  function isSame(a: Date, b: Date) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }
  function isInRange(d: Date) {
    const lo = value.start;
    const hi = value.end ?? hovered;
    if (!lo || !hi) return false;
    const [a, b] = lo <= hi ? [lo, hi] : [hi, lo];
    return d >= a && d <= b;
  }
  function isStart(d: Date) { return !!value.start && isSame(d, value.start); }
  function isEnd(d: Date)   { return !!value.end   && isSame(d, value.end);   }

  function handleDay(d: Date) {
    if (selecting === "start") {
      onChange({ start: d, end: null });
      setSelecting("end");
    } else {
      if (value.start && d < value.start) {
        onChange({ start: d, end: value.start });
      } else {
        onChange({ start: value.start, end: d });
      }
      setSelecting("start");
    }
  }

  const cells: (Date | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(cursor.getFullYear(), cursor.getMonth(), i + 1)),
  ];

  return (
    <div
      className="absolute z-30 mt-2 rounded-2xl overflow-hidden"
      style={{ background: "#fff", border: "1px solid rgba(155,168,167,0.3)", boxShadow: "0 16px 48px rgba(0,0,0,0.1)", minWidth: 300 }}
    >
      {/* Month nav */}
      <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid rgba(155,168,167,0.15)" }}>
        <button
          onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
          className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-[#f0f4f3]"
          style={{ color: "#2d5349" }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: "1.1rem" }}>chevron_left</span>
        </button>
        <span className="font-headline font-bold text-sm" style={{ color: "#1a1f1f" }}>
          {MONTHS[cursor.getMonth()]} {cursor.getFullYear()}
        </span>
        <button
          onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
          className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-[#f0f4f3]"
          style={{ color: "#2d5349" }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: "1.1rem" }}>chevron_right</span>
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 px-4 pt-3 pb-1">
        {DAYS.map((d) => (
          <div key={d} className="text-center font-label font-bold text-[9px] uppercase tracking-widest" style={{ color: "#9ba8a7" }}>
            {d}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 px-4 pb-4 gap-y-1">
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const start = isStart(d), end = isEnd(d), inRange = isInRange(d);
          const isToday = isSame(d, today);
          return (
            <button
              key={i}
              onClick={() => handleDay(d)}
              onMouseEnter={() => setHovered(d)}
              onMouseLeave={() => setHovered(null)}
              className="h-8 w-full flex items-center justify-center text-xs font-bold transition-all"
              style={{
                borderRadius: start || end ? "50%" : inRange ? "0" : "50%",
                backgroundColor: start || end ? "#2d5349" : inRange ? "rgba(45,83,73,0.08)" : "transparent",
                color: start || end ? "#fff" : isToday ? "#2d5349" : "#1a1f1f",
                fontWeight: isToday ? 800 : 600,
              }}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>

      {/* Label */}
      <div className="px-5 pb-3">
        <p className="font-label text-[10px] uppercase tracking-widest" style={{ color: "#9ba8a7" }}>
          {selecting === "start" ? "Select start date" : "Select end date"}
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-2 px-5 pb-4">
        <button
          onClick={() => { onChange({ start: null, end: null }); setSelecting("start"); }}
          className="flex-1 py-2 rounded-xl font-label font-bold text-[10px] uppercase tracking-widest transition-all"
          style={{ border: "1px solid rgba(155,168,167,0.4)", color: "#707977", background: "transparent" }}
        >
          Clear
        </button>
        <button
          onClick={onClose}
          className="flex-1 py-2 rounded-xl font-label font-bold text-[10px] uppercase tracking-widest transition-all"
          style={{ background: "#2d5349", color: "#fff", border: "none" }}
        >
          Apply
        </button>
      </div>
    </div>
  );
}

/* ── Image Card ─────────────────────────────────────────────── */
function ImageCard({ p, onOpen }: { p: ProposalWithRelations; onOpen: () => void }) {
  const primaryAuthor = p.authors.find((a) => a.isPrimary) ?? p.authors[0];
  const badge = statusToBadgeType(p.status);
  const action = p.status === "APPROVED" ? "Vote" : p.status === "FLAGGED" ? "Resolve" : "Review";
  const variant: ActionVariant = p.status === "APPROVED" ? "outline" : p.status === "FLAGGED" ? "neutral" : "primary";

  return (
    <div
      className="cursor-pointer bg-white overflow-hidden transition-all duration-500 hover:-translate-y-1"
      style={{ borderRadius: "2rem", border: "1px solid rgba(155,168,167,0.4)", boxShadow: "0 20px 64px rgba(0,0,0,0.03)", minHeight: "26rem" }}
      onClick={onOpen}
    >
      <div className="relative h-64 overflow-hidden">
        {p.coverImageUrl ? (
          <Image src={p.coverImageUrl} alt={p.title} fill sizes="(max-width: 768px) 100vw, 400px" className="object-cover" style={{ borderRadius: "2rem 2rem 0 0" }} />
        ) : (
          <div className="absolute inset-0" style={{ background: p.imageGradient ?? "#1a1f1f" }} />
        )}
        <div
          className="absolute inset-0"
          style={{
            background: p.coverImageUrl
              ? "linear-gradient(to bottom, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.05) 60%, rgba(0,0,0,0.35) 100%)"
              : "radial-gradient(circle at 30% 50%, rgba(255,255,255,0.05) 0%, transparent 60%)",
            borderRadius: "2rem 2rem 0 0",
          }}
        />
        <div className="absolute top-6 left-6"><Badge type={badge} /></div>
      </div>

      <div className="p-8">
        <h3 className="font-headline text-xl font-bold mb-5 leading-tight" style={{ color: "#1a1f1f" }}>{p.title}</h3>

        {primaryAuthor && (
          <div className="flex items-center gap-4 mb-8">
            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: "#c2ebdc", border: "2px solid rgba(45,83,73,0.15)" }}>
              {primaryAuthor.iconName ? (
                <span className="material-symbols-outlined" style={{ color: "#2d5349", fontSize: "1.25rem" }}>{primaryAuthor.iconName}</span>
              ) : (
                <span className="font-headline font-bold text-xs" style={{ color: "#2d5349" }}>{primaryAuthor.initial ?? primaryAuthor.name.charAt(0)}</span>
              )}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold font-headline" style={{ color: "#1a1f1f" }}>{primaryAuthor.name}</span>
              <span className="font-label text-[10px] uppercase tracking-wider font-bold" style={{ color: "#707977" }}>{primaryAuthor.role}</span>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-6" style={{ borderTop: "1px solid rgba(155,168,167,0.2)" }}>
          <div className="flex flex-col">
            <span className="font-label font-black text-[9px] uppercase tracking-[0.15em]" style={{ color: "#707977" }}>Date Est.</span>
            <span className="text-xs font-bold" style={{ color: "#1a1f1f" }}>{p.dateEst ?? "TBD"}</span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/proposals/${p.id}`}
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-label font-black text-[11px] uppercase tracking-widest transition-all hover:opacity-80 active:scale-95"
              style={{ border: "1px solid rgba(155,168,167,0.5)", color: "#576160", backgroundColor: "transparent" }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: "0.875rem" }}>open_in_new</span>
              Inspect
            </Link>
            <ActionButton label={action} variant={variant} onClick={onOpen} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Text Card ──────────────────────────────────────────────── */
function TextCard({ p, onOpen }: { p: ProposalWithRelations; onOpen: () => void }) {
  const primaryAuthor = p.authors.find((a) => a.isPrimary) ?? p.authors[0];
  const badge = statusToBadgeType(p.status);
  const action = p.status === "APPROVED" ? "Vote" : p.status === "FLAGGED" ? "Resolve" : "Review";
  const variant: ActionVariant = p.status === "APPROVED" ? "outline" : p.status === "FLAGGED" ? "neutral" : "primary";

  return (
    <div
      className="cursor-pointer bg-white overflow-hidden transition-all duration-500 hover:-translate-y-1"
      style={{ borderRadius: "2rem", border: "1px solid rgba(155,168,167,0.4)", boxShadow: "0 20px 64px rgba(0,0,0,0.03)", minHeight: "26rem" }}
      onClick={onOpen}
    >
      <div className="p-8">
        <div className="flex justify-between items-start mb-6">
          <Badge type={badge} />
          <button className="w-8 h-8 flex items-center justify-center rounded-full" style={{ color: "#707977" }} onClick={(e) => e.stopPropagation()}>
            <span className="material-symbols-outlined" style={{ fontSize: "1.25rem" }}>more_horiz</span>
          </button>
        </div>
        <h3 className="font-headline text-xl font-bold mb-4 leading-tight" style={{ color: "#1a1f1f" }}>{p.title}</h3>
        <p className="text-sm font-body font-medium leading-relaxed mb-10" style={{ color: "rgba(64,73,72,0.8)" }}>{p.description}</p>
        <div className="flex items-center justify-between pt-6" style={{ borderTop: "1px solid rgba(155,168,167,0.2)" }}>
          <div className="flex flex-col">
            <span className="font-label font-black text-[9px] uppercase tracking-[0.15em]" style={{ color: "#707977" }}>Proposer</span>
            <span className="text-xs font-bold" style={{ color: "#1a1f1f" }}>{primaryAuthor?.name ?? "—"}</span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/proposals/${p.id}`}
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-label font-black text-[11px] uppercase tracking-widest transition-all hover:opacity-80 active:scale-95"
              style={{ border: "1px solid rgba(155,168,167,0.5)", color: "#576160", backgroundColor: "transparent" }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: "0.875rem" }}>open_in_new</span>
              Inspect
            </Link>
            <ActionButton label={action} variant={variant} onClick={onOpen} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Flow State Drawer ──────────────────────────────────────── */
function FlowDrawer({ proposal, onClose }: { proposal: ProposalWithRelations | null; onClose: () => void }) {
  const open = proposal !== null;
  const flowState = proposal?.flowState as any;

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-50" style={{ backgroundColor: "rgba(26,31,31,0.1)", backdropFilter: "blur(4px)" }} onClick={onClose} />
      )}
      <div className={`drawer-panel fixed inset-y-0 right-0 z-50 flex flex-col${open ? " open" : ""}`} style={{ width: "min(40%, 36rem)", borderLeft: "1px solid rgba(155,168,167,0.3)", boxShadow: "-8px 0 48px rgba(0,0,0,0.07)" }}>
        <div className="absolute inset-0 dotted-bg" style={{ zIndex: 0 }} />

        <div className="relative z-10 p-8 flex justify-between items-center" style={{ backgroundColor: "rgba(255,255,255,0.6)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", borderBottom: "1px solid rgba(155,168,167,0.15)" }}>
          <div>
            <h2 className="font-headline text-2xl font-bold tracking-tighter" style={{ color: "#1a1f1f" }}>Flow State</h2>
            <p className="font-label font-bold text-[10px] uppercase tracking-[0.2em] mt-1" style={{ color: "rgba(45,83,73,0.7)" }}>Proposal Architecture Lifecycle</p>
          </div>
          <button className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:opacity-70" style={{ border: "1px solid rgba(155,168,167,0.2)", color: "#707977", backgroundColor: "rgba(255,255,255,0.8)" }} onClick={onClose}>
            <span className="material-symbols-outlined" style={{ fontSize: "1.125rem" }}>close</span>
          </button>
        </div>

        <div className="relative z-10 flex-1 overflow-hidden cursor-grab active:cursor-grabbing">
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 500 800" preserveAspectRatio="none">
            {flowState?.connections?.map((conn: any, i: number) => (
              <path key={i} d={conn.path} stroke="#9ba8a7" strokeWidth="1" fill="none" strokeDasharray="4" opacity="0.5" />
            ))}
            {flowState?.junctionDots?.map((dot: any, i: number) => (
              <circle key={i} cx={dot.cx} cy={dot.cy} r="2.5" fill="#9ba8a7" />
            ))}
          </svg>
          <div className="relative h-full w-full">
            {flowState?.nodes?.map((node: any) => (
              <div key={node.id} className={`absolute ${node.animationClass} group`} style={{ top: node.position.y, left: node.position.x }}>
                <div className="px-6 py-2 rounded-full flex items-center gap-2 cursor-pointer" style={{ border: "1px solid rgba(155,168,167,0.6)", backgroundColor: node.pillStyle === "solid-primary" ? "#2d5349" : "#ffffff", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
                  {node.iconName ? (
                    <span className="material-symbols-outlined" style={{ color: node.pillStyle === "solid-primary" ? "#ffffff" : "#2d5349", fontSize: "14px" }}>{node.iconName}</span>
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: node.dotColor }} />
                  )}
                  <span className="font-label font-bold text-[11px] uppercase tracking-widest" style={{ color: node.pillStyle === "solid-primary" ? "#ffffff" : "#1a1f1f" }}>{node.label}</span>
                </div>
                {node.actor && (
                  <div className="absolute pointer-events-none opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0 bg-white p-2.5 rounded-xl flex items-center gap-3 z-20" style={{ bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)", minWidth: 180, border: "1px solid rgba(155,168,167,0.2)", boxShadow: "0 8px 24px rgba(0,0,0,0.1)" }}>
                    <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 font-headline font-bold text-[10px]" style={{ backgroundColor: "#c2ebdc", border: "1px solid rgba(45,83,73,0.2)", color: "#2d5349" }}>{node.actor.initial}</div>
                    <div className="flex flex-col">
                      <span className="font-bold text-[10px]" style={{ color: "#1a1f1f" }}>{node.actor.name}</span>
                      <span className="font-label font-bold text-[9px]" style={{ color: "#707977" }}>{node.actor.timestamp}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 p-8 flex flex-col gap-4" style={{ backgroundColor: "rgba(255,255,255,0.4)", borderTop: "1px solid rgba(155,168,167,0.15)" }}>
          <button
            className="w-full py-3 rounded-lg font-label font-bold text-[10px] uppercase tracking-[0.25em] transition-all"
            style={{ border: "1px solid #1a1f1f", backgroundColor: "transparent", color: "#1a1f1f" }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#1a1f1f"; e.currentTarget.style.color = "#ffffff"; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "#1a1f1f"; }}
          >
            Download Audit Export
          </button>
          <p className="font-label font-bold text-[9px] uppercase tracking-widest text-center" style={{ color: "rgba(112,121,119,0.6)" }}>Version 2.4.1 (Decoupled Sync)</p>
        </div>
      </div>
    </>
  );
}

/* ── Status Pills Config ────────────────────────────────────── */
const STATUS_OPTIONS: { value: string; label: string; activeBg: string; activeText: string }[] = [
  { value: "DRAFT",     label: "Draft",    activeBg: "rgba(112,121,119,0.15)", activeText: "#3d4a47" },
  { value: "APPROVED",  label: "Approved", activeBg: "#d3dbd6",                activeText: "#0f1d19" },
  { value: "FLAGGED",       label: "Flagged",        activeBg: "rgba(186,26,26,0.12)",   activeText: "#ba1a1a" },
  { value: "ACTIVE",        label: "Active",         activeBg: "#c2ebdc",                activeText: "#0f2e22" },
  { value: "REJECTED",      label: "Rejected",       activeBg: "rgba(159,64,61,0.12)",   activeText: "#9f403d" },
];

/* ── Action Needed Card ─────────────────────────────────────── */
// Rendered only for proposals where it's currently THIS user's turn to review.
// Matches the wide high-priority card treatment from the design reference.

function ActionNeededCard({ p }: { p: ProposalWithRelations }) {
  const primaryAuthor = p.authors.find((a) => a.isPrimary) ?? p.authors[0];

  return (
    <div
      className="group relative flex flex-row"
      style={{
        gridColumn: "span 2",
        backgroundColor: "#e9efee",
        borderRadius: "2rem",
        padding: "0.25rem",
        gap: "1rem",
        border: "3px solid #40665a",
        boxShadow: "0 0 25px -5px rgba(64,102,90,0.22), 0 20px 48px rgba(0,0,0,0.04)",
        transition: "transform 0.5s ease",
        cursor: "pointer",
        minHeight: "26rem",
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.transform = "scale(1.005)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.transform = "scale(1)"; }}
    >
      {/* Image — stretches to card height via flexbox */}
      <div
        className="relative shrink-0 overflow-hidden"
        style={{ width: "45%", borderRadius: "1.75rem" }}
      >
        {p.coverImageUrl ? (
          <Image
            src={p.coverImageUrl}
            alt={p.title}
            fill
            sizes="500px"
            className="object-cover transition-transform duration-700 group-hover:scale-110"
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{ background: p.imageGradient ?? "#1a1f1f", borderRadius: "1.75rem" }}
          />
        )}
      </div>

      {/* Content */}
      <div
        className="flex-1 flex flex-col justify-between"
        style={{ padding: "2rem 2rem 1.75rem 0.75rem" }}
      >
        <div>
          <div className="flex items-center gap-3 mb-5">
            <span
              className="flex items-center gap-1.5 px-3 py-1 rounded-full font-label font-black text-[10px] uppercase tracking-[0.15em]"
              style={{
                backgroundColor: "rgba(64,102,90,0.12)",
                color: "#2d5349",
                border: "1px solid rgba(64,102,90,0.3)",
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: "0.75rem" }}>
                pending_actions
              </span>
              Your Review
            </span>
            <Badge type={statusToBadgeType(p.status)} />
          </div>

          <p
            className="font-label font-black uppercase tracking-[0.18em] mb-3"
            style={{ fontSize: "0.6rem", color: "#40665a", letterSpacing: "0.18em" }}
          >
            This needs review from you — Urgent review needed
          </p>

          <h3
            className="font-headline font-black leading-tight mb-4"
            style={{ fontSize: "1.75rem", color: "#1a1f1f", letterSpacing: "-0.02em" }}
          >
            {p.title}
          </h3>

          {p.description && (
            <p
              className="font-body leading-relaxed"
              style={{ fontSize: "0.9rem", color: "rgba(64,73,72,0.75)", maxWidth: "52ch" }}
            >
              {p.description.length > 160
                ? p.description.slice(0, 160).trimEnd() + "…"
                : p.description}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between mt-auto">
          {primaryAuthor && (
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: "#c2ebdc", border: "2px solid rgba(45,83,73,0.15)" }}
              >
                {primaryAuthor.iconName ? (
                  <span className="material-symbols-outlined" style={{ color: "#2d5349", fontSize: "1.1rem" }}>
                    {primaryAuthor.iconName}
                  </span>
                ) : (
                  <span className="font-headline font-bold text-xs" style={{ color: "#2d5349" }}>
                    {primaryAuthor.initial ?? primaryAuthor.name.charAt(0)}
                  </span>
                )}
              </div>
              <div>
                <p className="text-sm font-bold font-headline" style={{ color: "#1a1f1f" }}>
                  {primaryAuthor.name}
                </p>
                <p className="font-label text-[10px] uppercase tracking-wider font-bold" style={{ color: "#707977" }}>
                  {primaryAuthor.role}
                </p>
              </div>
            </div>
          )}
          <Link
            href={`/proposals/${p.id}`}
            className="w-12 h-12 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95"
            style={{ backgroundColor: "#40665a", color: "#defff2", boxShadow: "0 8px 24px rgba(64,102,90,0.35)" }}
            aria-label="Open proposal"
          >
            <span className="material-symbols-outlined" style={{ fontSize: "1.4rem" }}>
              arrow_forward
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ── Main Client Component ──────────────────────────────────── */
export default function ProposalsClient({
  proposals,
  actionNeededIds = [],
}: {
  proposals: ProposalWithRelations[];
  actionNeededIds?: string[];
}) {
  const actionNeededSet = new Set(actionNeededIds);
  const [activeProposal, setActiveProposal] = useState<ProposalWithRelations | null>(null);

  /* Filter state */
  const [authorFilter,     setAuthorFilter]     = useState("all");
  const [statusFilters,    setStatusFilters]    = useState<Set<string>>(new Set());
  const [submissionRange,  setSubmissionRange]  = useState<DateRange>({ start: null, end: null });
  const [eventRange,       setEventRange]       = useState<DateRange>({ start: null, end: null });

  /* Calendar popover state */
  const [subCalOpen,   setSubCalOpen]   = useState(false);
  const [eventCalOpen, setEventCalOpen] = useState(false);

  /* Refs for click-outside */
  const subCalRef   = useRef<HTMLDivElement>(null);
  const eventCalRef = useRef<HTMLDivElement>(null);

  const handleOutside = useCallback((e: MouseEvent) => {
    if (subCalRef.current   && !subCalRef.current.contains(e.target as Node))   setSubCalOpen(false);
    if (eventCalRef.current && !eventCalRef.current.contains(e.target as Node)) setEventCalOpen(false);
  }, []);

  useEffect(() => {
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [handleOutside]);

  /* Unique authors from data */
  const allAuthors = useMemo(
    () => Array.from(new Set(proposals.flatMap((p) => p.authors.map((a) => a.name)))).sort(),
    [proposals]
  );

  /* Toggle status pill */
  function toggleStatus(v: string) {
    setStatusFilters((prev) => {
      const next = new Set(prev);
      next.has(v) ? next.delete(v) : next.add(v);
      return next;
    });
  }

  /* Active filter count */
  const activeFilterCount =
    (authorFilter !== "all" ? 1 : 0) +
    statusFilters.size +
    (submissionRange.start ? 1 : 0) +
    (eventRange.start      ? 1 : 0);

  function clearAll() {
    setAuthorFilter("all");
    setStatusFilters(new Set());
    setSubmissionRange({ start: null, end: null });
    setEventRange({ start: null, end: null });
  }

  /* Filtered proposals */
  const filtered = useMemo(() => {
    return proposals.filter((p) => {
      // Author
      if (authorFilter !== "all" && !p.authors.some((a) => a.name === authorFilter)) return false;
      // Status
      if (statusFilters.size > 0 && !statusFilters.has(p.status)) return false;
      // Submission date range
      if (submissionRange.start || submissionRange.end) {
        const sub = new Date(p.createdAt);
        if (submissionRange.start && sub < submissionRange.start) return false;
        if (submissionRange.end) {
          const endOfDay = new Date(submissionRange.end);
          endOfDay.setHours(23, 59, 59, 999);
          if (sub > endOfDay) return false;
        }
      }
      // Event target range
      if (eventRange.start || eventRange.end) {
        const est = parseDateEst(p.dateEst);
        if (!est) return false;
        if (eventRange.start && est < eventRange.start) return false;
        if (eventRange.end   && est > eventRange.end)   return false;
      }
      return true;
    });
  }, [proposals, authorFilter, statusFilters, submissionRange, eventRange]);

  /* Date range label helpers */
  function rangeLabel(r: DateRange, placeholder: string) {
    if (r.start && r.end)   return `${fmtMonthYear(r.start)} — ${fmtMonthYear(r.end)}`;
    if (r.start)            return `From ${fmtDate(r.start)}`;
    return placeholder;
  }

  const SELECT_STYLE: React.CSSProperties = {
    backgroundColor: "#ffffff",
    border: "1px solid rgba(155,168,167,0.4)",
    color: "#1a1f1f",
    minWidth: 180,
    appearance: "none",
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ba8a7' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 12px center",
    paddingRight: 36,
  };

  return (
    <>
      <style>{`
        .dotted-bg {
          background-image: radial-gradient(#9ba8a7 0.5px, transparent 0.5px);
          background-size: 24px 24px;
          background-color: #f2f5f4;
        }
        @keyframes float {
          0%   { transform: translateY(0px) rotate(0deg); }
          33%  { transform: translateY(-3px) rotate(0.5deg); }
          66%  { transform: translateY(2px) rotate(-0.5deg); }
          100% { transform: translateY(0px) rotate(0deg); }
        }
        .animate-float         { animation: float 6s ease-in-out infinite; }
        .animate-float-delayed { animation: float 7s ease-in-out infinite; animation-delay: 1s; }
        .animate-float-slow    { animation: float 8s ease-in-out infinite; animation-delay: 2s; }
        .drawer-panel {
          transform: translateX(100%);
          transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .drawer-panel.open { transform: translateX(0); }
      `}</style>

      {/* ── Filters Bar ─────────────────────────────────────────── */}
      <section
        className="mb-10 p-8 rounded-3xl flex flex-col gap-6"
        style={{ backgroundColor: "#ffffff", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", border: "1px solid rgba(155,168,167,0.3)" }}
      >
        {/* Row 1: dropdowns + date pickers */}
        <div className="flex flex-wrap items-end gap-5">

          {/* Author */}
          <div className="flex flex-col gap-2">
            <label className="font-label font-bold text-[10px] uppercase tracking-[0.15em]" style={{ color: "#707977" }}>Author</label>
            <select
              value={authorFilter}
              onChange={(e) => setAuthorFilter(e.target.value)}
              className="rounded-xl px-4 py-3 text-sm font-body font-medium outline-none"
              style={SELECT_STYLE}
            >
              <option value="all">All Authors</option>
              {allAuthors.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>

          {/* Submission Date */}
          <div className="flex flex-col gap-2 relative" ref={subCalRef}>
            <label className="font-label font-bold text-[10px] uppercase tracking-[0.15em]" style={{ color: "#707977" }}>Submission Date</label>
            <button
              onClick={() => { setSubCalOpen((v) => !v); setEventCalOpen(false); }}
              className="flex items-center gap-3 rounded-xl px-5 py-3 text-sm font-body font-semibold transition-all"
              style={{
                backgroundColor: submissionRange.start ? "rgba(45,83,73,0.06)" : "#ffffff",
                border: submissionRange.start ? "1px solid rgba(45,83,73,0.3)" : "1px solid rgba(155,168,167,0.4)",
                color: "#1a1f1f",
                minWidth: 200,
              }}
            >
              <span className="material-symbols-outlined" style={{ color: "#2d5349", fontSize: "1.1rem" }}>calendar_month</span>
              <span className="truncate">{rangeLabel(submissionRange, "Select Range")}</span>
              {submissionRange.start && (
                <span
                  className="ml-auto material-symbols-outlined"
                  style={{ fontSize: "0.9rem", color: "#9ba8a7" }}
                  onClick={(e) => { e.stopPropagation(); setSubmissionRange({ start: null, end: null }); }}
                >close</span>
              )}
            </button>
            {subCalOpen && (
              <CalendarPicker value={submissionRange} onChange={setSubmissionRange} onClose={() => setSubCalOpen(false)} />
            )}
          </div>

          {/* Event Target */}
          <div className="flex flex-col gap-2 relative" ref={eventCalRef}>
            <label className="font-label font-bold text-[10px] uppercase tracking-[0.15em]" style={{ color: "#707977" }}>Event Target</label>
            <button
              onClick={() => { setEventCalOpen((v) => !v); setSubCalOpen(false); }}
              className="flex items-center gap-3 rounded-xl px-5 py-3 text-sm font-body font-semibold transition-all"
              style={{
                backgroundColor: eventRange.start ? "rgba(45,83,73,0.06)" : "#ffffff",
                border: eventRange.start ? "1px solid rgba(45,83,73,0.3)" : "1px solid rgba(155,168,167,0.4)",
                color: "#1a1f1f",
                minWidth: 200,
              }}
            >
              <span className="material-symbols-outlined" style={{ color: "#2d5349", fontSize: "1.1rem" }}>event_note</span>
              <span className="truncate">{rangeLabel(eventRange, "Select Range")}</span>
              {eventRange.start && (
                <span
                  className="ml-auto material-symbols-outlined"
                  style={{ fontSize: "0.9rem", color: "#9ba8a7" }}
                  onClick={(e) => { e.stopPropagation(); setEventRange({ start: null, end: null }); }}
                >close</span>
              )}
            </button>
            {eventCalOpen && (
              <CalendarPicker value={eventRange} onChange={setEventRange} onClose={() => setEventCalOpen(false)} />
            )}
          </div>

          {/* Clear All */}
          <button
            onClick={clearAll}
            className="ml-auto px-7 py-3 rounded-xl font-label font-black text-[11px] uppercase tracking-[0.2em] transition-all flex items-center gap-2"
            style={{
              backgroundColor: activeFilterCount > 0 ? "rgba(45,83,73,0.08)" : "rgba(155,168,167,0.08)",
              color: activeFilterCount > 0 ? "#2d5349" : "#9ba8a7",
              border: `1px solid ${activeFilterCount > 0 ? "rgba(45,83,73,0.25)" : "rgba(155,168,167,0.2)"}`,
            }}
          >
            {activeFilterCount > 0 && (
              <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black" style={{ backgroundColor: "#2d5349", color: "#fff" }}>
                {activeFilterCount}
              </span>
            )}
            Clear All
          </button>
        </div>

        {/* Row 2: Status pills */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-label font-bold text-[10px] uppercase tracking-[0.15em] mr-2" style={{ color: "#707977" }}>Status</span>
          {STATUS_OPTIONS.map((s) => {
            const active = statusFilters.has(s.value);
            return (
              <button
                key={s.value}
                onClick={() => toggleStatus(s.value)}
                className="px-4 py-1.5 rounded-full font-label font-black text-[10px] uppercase tracking-[0.12em] transition-all"
                style={{
                  backgroundColor: active ? s.activeBg : "transparent",
                  color:           active ? s.activeText : "#9ba8a7",
                  border:          active ? "1px solid transparent" : "1px solid rgba(155,168,167,0.35)",
                  boxShadow:       active ? "0 2px 8px rgba(0,0,0,0.06)" : "none",
                }}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Result count */}
      {activeFilterCount > 0 && (
        <div className="mb-6 flex items-center gap-3">
          <span className="font-label font-bold text-[11px] uppercase tracking-widest" style={{ color: "#9ba8a7" }}>
            Showing {filtered.length} of {proposals.length} proposals
          </span>
          <div className="flex-1 h-px" style={{ backgroundColor: "rgba(155,168,167,0.2)" }} />
        </div>
      )}

      {/* ── Masonry Grid ────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 24, alignItems: "start" }}>
        {filtered.length === 0 ? (
          <div
            className="col-span-full py-24 flex flex-col items-center gap-4 rounded-3xl"
            style={{ border: "1px dashed rgba(155,168,167,0.4)", color: "#9ba8a7" }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "2.5rem" }}>filter_list_off</span>
            <p className="font-headline font-bold text-lg" style={{ color: "#707977" }}>No proposals match your filters</p>
            <button onClick={clearAll} className="font-label font-bold text-[11px] uppercase tracking-widest px-6 py-2.5 rounded-xl" style={{ backgroundColor: "#2d5349", color: "#fff" }}>
              Clear Filters
            </button>
          </div>
        ) : (
          // Action-needed proposals float to the top; each renders as the wide 2-col card
          [
            ...filtered.filter((p) => actionNeededSet.has(p.id)),
            ...filtered.filter((p) => !actionNeededSet.has(p.id)),
          ].map((p) =>
            actionNeededSet.has(p.id) ? (
              <ActionNeededCard key={p.id} p={p} />
            ) : p.type === "PERFORMANCE" ? (
              <TextCard key={p.id} p={p} onOpen={() => setActiveProposal(p)} />
            ) : (
              <ImageCard key={p.id} p={p} onOpen={() => setActiveProposal(p)} />
            )
          )
        )}
      </div>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer className="mt-16 py-6 px-10 flex justify-between items-center" style={{ borderTop: "1px solid rgba(155,168,167,0.3)", backgroundColor: "rgba(255,255,255,0.8)", backdropFilter: "blur(4px)" }}>
        <div className="flex items-center gap-10">
          <div className="flex flex-col">
            <span className="font-label font-black text-[9px] uppercase tracking-[0.25em] mb-1" style={{ color: "#707977" }}>System Status</span>
            <span className="text-xs font-bold flex items-center gap-2" style={{ color: "#2d5349" }}>
              <span className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ backgroundColor: "#2d5349" }} />
              Fully Operational
            </span>
          </div>
          <div className="flex flex-col pl-10" style={{ borderLeft: "1px solid rgba(155,168,167,0.3)" }}>
            <span className="font-label font-black text-[9px] uppercase tracking-[0.25em] mb-1" style={{ color: "#707977" }}>Total Proposals</span>
            <span className="text-xs font-extrabold font-headline" style={{ color: "#1a1f1f" }}>
              {filtered.length === proposals.length ? `${proposals.length} Proposals` : `${filtered.length} / ${proposals.length} Proposals`}
            </span>
          </div>
        </div>
        <span className="font-label font-bold text-[10px] uppercase tracking-[0.2em]" style={{ color: "rgba(112,121,119,0.6)" }}>
          © 2024 Event Society Structural Interface
        </span>
      </footer>

      {/* Flow State Drawer */}
      <FlowDrawer proposal={activeProposal} onClose={() => setActiveProposal(null)} />
    </>
  );
}
