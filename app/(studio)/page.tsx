import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getOrgId } from "@/lib/org";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Dashboard — Aetheric Studio",
  description: "Live operations dashboard with project feeds, meeting hub, and studio insights.",
};

const TYPE_ICON: Record<string, string> = {
  EVENT:       "event",
  SUMMIT:      "groups",
  EXHIBITION:  "museum",
  WEDDING:     "favorite",
  PERFORMANCE: "theater_comedy",
  INTERNAL:    "home_work",
};

const TYPE_GRADIENT: Record<string, string> = {
  EVENT:       "linear-gradient(135deg, #1a2a40 0%, #2d4a70 100%)",
  SUMMIT:      "linear-gradient(135deg, #1a3a28 0%, #2d6048 100%)",
  EXHIBITION:  "linear-gradient(135deg, #3a1a2e 0%, #6a2a50 100%)",
  WEDDING:     "linear-gradient(135deg, #2d0a3e 0%, #5c1a6e 100%)",
  PERFORMANCE: "linear-gradient(135deg, #1c1c2e 0%, #2d2d44 100%)",
  INTERNAL:    "linear-gradient(135deg, #1a1f1e 0%, #2d3434 100%)",
};

const STATUS_BADGE: Record<string, { label: string; color: string; bg: string; border: string }> = {
  DRAFT:     { label: "Draft",          color: "#59615d", bg: "rgba(89,97,93,0.07)",   border: "rgba(89,97,93,0.12)"   },
  APPROVED:  { label: "Approved",       color: "#1a6b3c", bg: "rgba(26,107,60,0.07)",  border: "rgba(26,107,60,0.12)"  },
  FLAGGED:   { label: "Action Required",color: "#9f403d", bg: "rgba(159,64,61,0.07)", border: "rgba(159,64,61,0.12)"  },
  REJECTED:  { label: "Rejected",       color: "#9f403d", bg: "rgba(159,64,61,0.07)", border: "rgba(159,64,61,0.12)"  },
  ACTIVE:    { label: "Active",         color: "#40665a", bg: "rgba(64,102,90,0.07)",  border: "rgba(64,102,90,0.12)"  },
  COMPLETED: { label: "Completed",      color: "#40665a", bg: "rgba(64,102,90,0.07)",  border: "rgba(64,102,90,0.12)"  },
};

export default async function DashboardPage() {
  const session = await auth();
  const orgId   = await getOrgId(session?.user?.id ?? null);

  if (!orgId) {
    return <div className="p-8 text-sm text-on-surface-variant">No organisation found.</div>;
  }

  /* ── Fetch all data in parallel ───────────────────────────── */
  const [proposals, memberCount, deptCount, studentCount, upcomingMeetings] = await Promise.all([
    prisma.proposal.findMany({
      where:   { orgId },
      orderBy: { updatedAt: "desc" },
      select: {
        id:            true,
        title:         true,
        type:          true,
        status:        true,
        imageGradient: true,
        dateEst:       true,
        budget:        true,
        updatedAt:     true,
        authors: {
          where:   { isPrimary: true },
          select:  { name: true },
          take:    1,
        },
        approvalChains: {
          select: { status: true },
        },
        _count: { select: { approvalChains: true } },
      },
    }),
    prisma.orgMember.count({ where: { orgId } }),
    prisma.department.count({ where: { orgId } }),
    prisma.student.count({ where: { orgId } }),
    prisma.meeting.findMany({
      where:   { proposal: { orgId }, scheduledAt: { gte: new Date() } },
      orderBy: { scheduledAt: "asc" },
      take:    3,
      select: {
        id:            true,
        title:         true,
        scheduledAt:   true,
        organizerName: true,
        proposal:      { select: { id: true, title: true } },
      },
    }),
  ]);

  /* ── Derived metrics ──────────────────────────────────────── */
  const total     = proposals.length;
  const drafts    = proposals.filter((p) => p.status === "DRAFT").length;
  const flagged   = proposals.filter((p) => p.status === "FLAGGED").length;
  const active    = proposals.filter((p) => p.status === "ACTIVE").length;
  const approved  = proposals.filter((p) => p.status === "APPROVED").length;
  const completed = proposals.filter((p) => p.status === "COMPLETED").length;

  // Bar chart: last 5 months rolling proposal counts (by updatedAt month)
  const now = new Date();
  const barCounts = Array.from({ length: 5 }, (_, i) => {
    const m = new Date(now.getFullYear(), now.getMonth() - (4 - i), 1);
    return proposals.filter((p) => {
      const d = new Date(p.updatedAt);
      return d.getFullYear() === m.getFullYear() && d.getMonth() === m.getMonth();
    }).length;
  });
  const barMax  = Math.max(...barCounts, 1);
  const barPcts = barCounts.map((n) => `${Math.round((n / barMax) * 100)}%`);

  // Live projects — ACTIVE or APPROVED, most recently updated
  const liveProposals = proposals
    .filter((p) => p.status === "ACTIVE" || p.status === "APPROVED" || p.status === "FLAGGED")
    .slice(0, 4);

  // Approval throughput: proposals with all chains approved / proposals with any chain
  const withChains   = proposals.filter((p) => p._count.approvalChains > 0);
  const fullyApproved = withChains.filter((p) =>
    p.approvalChains.length > 0 && p.approvalChains.every((c) => c.status === "APPROVED")
  );
  const throughput = withChains.length > 0
    ? Math.round((fullyApproved.length / withChains.length) * 100)
    : 0;

  // Dept utilisation: depts that have at least one ACTIVE/APPROVED proposal chain
  const activeDeptIds = new Set(
    (await prisma.proposalApprovalChain.findMany({
      where: { proposal: { orgId }, status: "ACTIVE" },
      select: { departmentId: true },
    })).map((c) => c.departmentId)
  );
  const deptUtilisation = deptCount > 0
    ? Math.round((activeDeptIds.size / deptCount) * 100)
    : 0;

  return (
    <>
      {/* ── Background Layers ───────────────────────────────────── */}
      <div className="pointer-events-none fixed inset-0 z-[-1] overflow-hidden" aria-hidden="true">
        <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(to right, rgba(64,102,90,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(64,102,90,0.05) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
        <div style={{ position: "absolute", top: "-10%", right: "-5%", width: 600, height: 600, borderRadius: "50%", background: "rgba(64,102,90,0.06)", filter: "blur(120px)" }} />
        <div style={{ position: "absolute", bottom: "10%", left: "-5%", width: 400, height: 400, borderRadius: "50%", background: "rgba(89,97,93,0.05)", filter: "blur(100px)" }} />
      </div>

      <div className="space-y-10">

        {/* ── Metrics Row ─────────────────────────────────────────── */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Proposals card */}
          <div className="ghost-border rounded-xl p-6 transition-all hover:scale-[1.01]" style={{ backgroundColor: "#ffffff" }}>
            <div className="flex justify-between items-start mb-4">
              <div className="space-y-1">
                <span className="font-label text-[10px] uppercase tracking-[0.2em]" style={{ color: "#59615d" }}>
                  Total Proposals
                </span>
                <h3 className="text-3xl font-headline font-bold" style={{ color: "#40665a" }}>{total}</h3>
              </div>
              <div className="w-16 h-8 flex items-end gap-0.5">
                {barPcts.map((h, i) => (
                  <div key={i} className="flex-1 rounded-t-sm" style={{ height: h, backgroundColor: i === 4 ? "#40665a" : i === 3 ? "rgba(64,102,90,0.4)" : "rgba(64,102,90,0.2)" }} />
                ))}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-4" style={{ borderTop: "1px solid rgba(169,180,179,0.15)" }}>
              {[
                { key: "DRAFTS",  val: drafts,  color: "#727d7c" },
                { key: "FLAGGED", val: flagged, color: "#9f403d" },
                { key: "ACTIVE",  val: active,  color: "#727d7c" },
              ].map(({ key, val, color }, i) => (
                <div key={key} className={i === 1 ? "px-2" : ""} style={i === 1 ? { borderLeft: "1px solid rgba(169,180,179,0.15)", borderRight: "1px solid rgba(169,180,179,0.15)" } : {}}>
                  <p className="font-label text-[10px] uppercase" style={{ color }}>{key}</p>
                  <p className="text-sm font-bold font-headline" style={{ color: "#2a3434" }}>{val}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Approval throughput */}
          <div className="ghost-border rounded-xl p-6 transition-all hover:scale-[1.01]" style={{ backgroundColor: "#ffffff" }}>
            <div className="flex justify-between items-start mb-4">
              <div className="space-y-1">
                <span className="font-label text-[10px] uppercase tracking-[0.2em]" style={{ color: "#59615d" }}>Approval Rate</span>
                <h3 className="text-3xl font-headline font-bold" style={{ color: "#40665a" }}>{throughput}%</h3>
              </div>
              <span className="material-symbols-outlined p-2 rounded-lg" style={{ color: "#40665a", backgroundColor: "rgba(64,102,90,0.1)" }}>trending_up</span>
            </div>
            <div className="h-1 rounded-full mt-8 relative overflow-hidden" style={{ backgroundColor: "#dae5e3" }}>
              <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${throughput}%`, backgroundColor: "#40665a" }} />
            </div>
            <p className="font-label text-[11px] uppercase tracking-wide mt-2" style={{ color: "#576160" }}>
              {fullyApproved.length} of {withChains.length} chains fully approved
            </p>
          </div>

          {/* Org overview */}
          <div className="ghost-border rounded-xl p-6 transition-all hover:scale-[1.01]" style={{ backgroundColor: "#ffffff" }}>
            <div className="flex justify-between items-start mb-4">
              <div className="space-y-1">
                <span className="font-label text-[10px] uppercase tracking-[0.2em]" style={{ color: "#59615d" }}>Organisation</span>
                <h3 className="text-3xl font-headline font-bold" style={{ color: "#40665a" }}>{memberCount}</h3>
              </div>
              <span className="material-symbols-outlined p-2 rounded-lg" style={{ color: "#59615d", backgroundColor: "rgba(89,97,93,0.1)" }}>groups</span>
            </div>
            <div className="flex gap-1 mt-6">
              {Array.from({ length: deptCount }, (_, i) => (
                <div key={i} className="flex-1 h-3 rounded-sm" style={{ backgroundColor: i < activeDeptIds.size ? "#40665a" : "rgba(64,102,90,0.2)" }} />
              ))}
            </div>
            <p className="font-label text-[11px] uppercase tracking-wide mt-2" style={{ color: "#576160" }}>
              {activeDeptIds.size}/{deptCount} depts active · {studentCount} students
            </p>
          </div>
        </section>

        {/* ── Live Projects + Sidebar ──────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Live Projects Feed (2/3) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex justify-between items-end">
              <div>
                <h2 className="text-2xl font-headline font-bold tracking-tighter" style={{ color: "#2a3434" }}>Live Projects</h2>
                <p className="text-sm font-body" style={{ color: "#576160" }}>
                  {active} active · {approved} approved · {flagged} flagged
                </p>
              </div>
              <Link
                href="/proposals"
                className="font-label font-bold text-[10px] uppercase tracking-widest pb-1 transition-colors hover:opacity-70"
                style={{ color: "#40665a", borderBottom: "1px solid rgba(64,102,90,0.25)" }}
              >
                View All
              </Link>
            </div>

            {liveProposals.length === 0 ? (
              <div className="ghost-border rounded-xl p-8 text-center" style={{ backgroundColor: "#ffffff" }}>
                <p className="font-label text-[11px] uppercase tracking-widest" style={{ color: "#a9b4b3" }}>No active proposals yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {liveProposals.map((p) => {
                  const badge   = STATUS_BADGE[p.status] ?? STATUS_BADGE.DRAFT;
                  const lead    = p.authors[0]?.name ?? "—";
                  const pending = p.approvalChains.filter((c) => c.status === "ACTIVE").length;
                  const isError = p.status === "FLAGGED";
                  return (
                    <Link
                      key={p.id}
                      href={`/proposals/${p.id}`}
                      className="ghost-border rounded-xl p-5 flex flex-col sm:flex-row gap-6 items-center transition-all hover:translate-x-1 duration-200 no-underline"
                      style={{ backgroundColor: "#ffffff", display: "flex" }}
                    >
                      <div className="w-16 h-16 rounded-lg flex-shrink-0 flex items-center justify-center" style={{ background: p.imageGradient ?? TYPE_GRADIENT[p.type] ?? TYPE_GRADIENT.EVENT }}>
                        <span className="material-symbols-outlined" style={{ color: "rgba(255,255,255,0.7)", fontSize: "1.75rem" }}>
                          {TYPE_ICON[p.type] ?? "description"}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-0.5 font-label font-bold text-[9px] uppercase rounded" style={{ color: badge.color, backgroundColor: badge.bg, border: `1px solid ${badge.border}` }}>
                            {badge.label}
                          </span>
                          <h4 className="font-headline font-bold text-lg truncate" style={{ color: "#2a3434" }}>{p.title}</h4>
                        </div>
                        <div className="flex items-center gap-4 text-xs mb-4 font-body" style={{ color: "#576160" }}>
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined" style={{ fontSize: "1rem" }}>person</span>
                            {lead}
                          </span>
                          {p.dateEst && (
                            <span className="flex items-center gap-1">
                              <span className="material-symbols-outlined" style={{ fontSize: "1rem" }}>calendar_today</span>
                              {p.dateEst}
                            </span>
                          )}
                          {pending > 0 && (
                            <span className="flex items-center gap-1 font-bold" style={{ color: isError ? "#9f403d" : "#40665a" }}>
                              <span className="material-symbols-outlined" style={{ fontSize: "1rem" }}>schedule</span>
                              {pending} chain{pending > 1 ? "s" : ""} pending
                            </span>
                          )}
                        </div>
                        <div className="w-full h-1 rounded-full overflow-hidden" style={{ backgroundColor: "#e9efee" }}>
                          <div className="h-full rounded-full" style={{ width: p.status === "COMPLETED" ? "100%" : p.status === "ACTIVE" ? "80%" : p.status === "APPROVED" ? "60%" : p.status === "FLAGGED" ? "45%" : "20%", backgroundColor: isError ? "#9f403d" : "#40665a" }} />
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sidebar (1/3) */}
          <div className="space-y-8">

            {/* Upcoming Meetings */}
            <div className="ghost-border rounded-2xl p-6 relative overflow-hidden" style={{ backgroundColor: "#f0f4f3" }}>
              <div className="absolute top-4 right-4">
                <span className="relative inline-flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: upcomingMeetings.length > 0 ? "#9f403d" : "#a9b4b3" }} />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full" style={{ backgroundColor: upcomingMeetings.length > 0 ? "#9f403d" : "#a9b4b3" }} />
                </span>
              </div>
              <h3 className="font-headline font-bold text-lg mb-6 flex items-center gap-2" style={{ color: "#2a3434" }}>
                <span className="material-symbols-outlined" style={{ color: "#40665a" }}>videocam</span>
                Upcoming Meetings
              </h3>
              {upcomingMeetings.length === 0 ? (
                <p className="font-label text-[10px] uppercase tracking-widest text-center py-4" style={{ color: "#a9b4b3" }}>No meetings scheduled</p>
              ) : (
                <div className="space-y-4">
                  {upcomingMeetings.map((m, i) => {
                    const isNext = i === 0;
                    const date   = new Date(m.scheduledAt);
                    const label  = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                    const time   = date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
                    return (
                      <Link
                        key={m.id}
                        href={`/proposals/${m.proposal.id}`}
                        className="p-4 rounded-xl ghost-border transition-all hover:scale-[1.02] duration-200 no-underline block"
                        style={{ backgroundColor: "#ffffff", ...(isNext ? { borderLeft: "4px solid #40665a" } : { opacity: 0.65 }) }}
                      >
                        <p className="font-label font-bold text-[9px] uppercase tracking-[0.1em]" style={{ color: "#40665a" }}>
                          {label} · {time}
                        </p>
                        <h4 className="font-headline text-sm font-bold mt-1" style={{ color: "#2a3434" }}>{m.title}</h4>
                        <p className="font-body text-[11px] mt-1 truncate" style={{ color: "#576160" }}>{m.proposal.title}</p>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Studio Insight */}
            <div className="ghost-border rounded-2xl p-6" style={{ backgroundColor: "rgba(194,235,220,0.3)" }}>
              <h3 className="font-headline font-bold text-lg mb-6 flex items-center gap-2" style={{ color: "#2a3434" }}>
                <span className="material-symbols-outlined" style={{ color: "#40665a" }}>analytics</span>
                Studio Insight
              </h3>
              <div className="space-y-5">
                {[
                  { label: "Approval Rate",    pct: throughput        },
                  { label: "Dept Utilisation", pct: deptUtilisation   },
                  { label: "Proposals Active", pct: total > 0 ? Math.round((active / total) * 100) : 0 },
                ].map(({ label, pct }) => (
                  <div key={label} className="space-y-2">
                    <div className="flex justify-between font-label font-bold text-[10px] uppercase" style={{ color: "#33594d" }}>
                      <span>{label}</span><span>{pct}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full" style={{ backgroundColor: "rgba(32,70,59,0.1)" }}>
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: "#345a4e" }} />
                    </div>
                  </div>
                ))}
                <div className="pt-4" style={{ borderTop: "1px solid rgba(64,102,90,0.12)" }}>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg flex-shrink-0" style={{ backgroundColor: "#ffffff" }}>
                      <span className="material-symbols-outlined" style={{ color: "#40665a" }}>lightbulb</span>
                    </div>
                    <p className="font-body text-[11px] leading-relaxed" style={{ color: "#33594d" }}>
                      {flagged > 0
                        ? `${flagged} proposal${flagged > 1 ? "s" : ""} flagged — review required before progression.`
                        : approved > 0
                        ? `${approved} proposal${approved > 1 ? "s" : ""} approved and ready to activate.`
                        : "All proposals are up to date."}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Footer Metadata Bar ──────────────────────────────────── */}
        <footer className="ghost-border rounded-xl p-4 flex flex-col md:flex-row justify-between items-center gap-4" style={{ backgroundColor: "rgba(207,221,219,0.4)" }}>
          <div className="flex items-center gap-6">
            {[
              { label: "Total",     val: String(total)     },
              { label: "Active",    val: String(active)    },
              { label: "Approved",  val: String(approved)  },
              { label: "Completed", val: String(completed) },
            ].map(({ label, val }, i) => (
              <>
                {i > 0 && <div key={`div-${i}`} className="w-px h-6 hidden md:block" style={{ backgroundColor: "rgba(169,180,179,0.25)" }} />}
                <div key={label} className="flex flex-col">
                  <span className="font-label font-bold text-[8px] uppercase tracking-widest" style={{ color: "#727d7c" }}>{label}</span>
                  <span className="text-[10px] font-bold font-mono" style={{ color: "#59615d" }}>{val}</span>
                </div>
              </>
            ))}
          </div>
          <div className="font-label text-[10px] flex items-center gap-4" style={{ color: "#59615d" }}>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: "#40665a" }} />
              LIVE DATA
            </span>
            <div className="w-px h-6" style={{ backgroundColor: "rgba(169,180,179,0.25)" }} />
            <span>{memberCount} MEMBERS · {deptCount} DEPTS</span>
          </div>
        </footer>

      </div>
    </>
  );
}
