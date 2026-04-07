import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard — Aetheric Studio",
  description: "Live operations dashboard with project feeds, meeting hub, and studio insights.",
};

/* ── Static data ─────────────────────────────────────────────── */

const metrics = [
  {
    label: "Total Proposals",
    value: "52",
    sub: [
      { key: "DRAFTS",  val: "32", accent: false },
      { key: "FLAGGED", val: "12", accent: true  },
      { key: "REVIEW",  val: "8",  accent: false },
    ],
    // mini bar chart heights
    bars: ["20%", "40%", "30%", "60%", "90%"],
  },
  {
    label: "Engagement Rate",
    value: "84%",
    icon: "trending_up",
    progress: 84,
    delta: "+4.2% from last quarter",
  },
  {
    label: "Studio Capacity",
    value: "92%",
    icon: "bolt",
    iconColor: "#59615d",
    iconBg: "rgba(89,97,93,0.1)",
    blocks: [true, true, true, false],
    note: "Critical load threshold",
  },
];

const projects = [
  {
    id: 1,
    gradient: "linear-gradient(135deg, #4b265c 0%, #7c3aed 100%)",
    icon: "event",
    badge: "Active",
    badgeColor: "#40665a",
    badgeBg: "rgba(64,102,90,0.07)",
    badgeBorder: "rgba(64,102,90,0.12)",
    title: "Met Gala 2026: Neo-Baroque",
    lead: "Julian Vane",
    time: "14 Days Remaining",
    progress: 72,
    progressColor: "#40665a",
    timeColor: "#576160",
    warningIcon: "edit",
    warningStyle: "normal",
  },
  {
    id: 2,
    gradient: "linear-gradient(135deg, #1e3a5f 0%, #0ea5e9 100%)",
    icon: "groups",
    badge: "Discussion",
    badgeColor: "#59615d",
    badgeBg: "rgba(89,97,93,0.07)",
    badgeBorder: "rgba(89,97,93,0.12)",
    title: "Aetheric Summit 2.0",
    lead: "Elena Thorne",
    time: "2 Month Lead",
    progress: 15,
    progressColor: "#59615d",
    timeColor: "#576160",
    warningIcon: "edit",
    warningStyle: "normal",
  },
  {
    id: 3,
    gradient: "linear-gradient(135deg, #14532d 0%, #15803d 100%)",
    icon: "celebration",
    badge: "Action Required",
    badgeColor: "#9f403d",
    badgeBg: "rgba(159,64,61,0.07)",
    badgeBorder: "rgba(159,64,61,0.12)",
    title: "Verdant Estate Wedding",
    lead: "Marcus Wei",
    time: "Budget Overrun",
    progress: 95,
    progressColor: "#9f403d",
    timeColor: "#9f403d",
    warningIcon: "warning",
    warningStyle: "error",
  },
];

const insightBars = [
  { label: "3D Rendering Load", pct: 94 },
  { label: "Curation Bandwidth", pct: 42 },
];

/* ── Component ───────────────────────────────────────────────── */

export default function DashboardPage() {
  return (
    <>
      {/* ── Background Layers ─────────────────────────────────── */}
      <div
        className="pointer-events-none fixed inset-0 z-[-1] overflow-hidden"
        aria-hidden="true"
      >
        {/* Architectural grid */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(to right, rgba(64,102,90,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(64,102,90,0.05) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        {/* Ambient glows */}
        <div
          style={{
            position: "absolute",
            top: "-10%",
            right: "-5%",
            width: 600,
            height: 600,
            borderRadius: "50%",
            background: "rgba(64,102,90,0.06)",
            filter: "blur(120px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "10%",
            left: "-5%",
            width: 400,
            height: 400,
            borderRadius: "50%",
            background: "rgba(89,97,93,0.05)",
            filter: "blur(100px)",
          }}
        />
      </div>

      <div className="space-y-10">

        {/* ── Section 1: Metrics Row ──────────────────────────── */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Proposals card */}
          <div
            className="ghost-border rounded-xl p-6 transition-all hover:scale-[1.01]"
            style={{ backgroundColor: "#ffffff" }}
          >
            <div className="flex justify-between items-start mb-4">
              <div className="space-y-1">
                <span
                  className="font-label text-[10px] uppercase tracking-[0.2em]"
                  style={{ color: "#59615d" }}
                >
                  Total Proposals
                </span>
                <h3
                  className="text-3xl font-headline font-bold"
                  style={{ color: "#40665a" }}
                >
                  52
                </h3>
              </div>
              {/* Mini bar chart */}
              <div className="w-16 h-8 flex items-end gap-0.5">
                {["20%", "40%", "30%", "60%", "90%"].map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-t-sm"
                    style={{
                      height: h,
                      backgroundColor:
                        i === 4 ? "#40665a" : i === 3 ? "rgba(64,102,90,0.4)" : "rgba(64,102,90,0.2)",
                    }}
                  />
                ))}
              </div>
            </div>
            <div
              className="grid grid-cols-3 gap-2 pt-4"
              style={{ borderTop: "1px solid rgba(169,180,179,0.15)" }}
            >
              {[
                { key: "DRAFTS", val: "32", color: "#727d7c" },
                { key: "FLAGGED", val: "12", color: "#9f403d" },
                { key: "REVIEW", val: "8", color: "#727d7c" },
              ].map(({ key, val, color }, i) => (
                <div
                  key={key}
                  className={i === 1 ? "px-2" : ""}
                  style={
                    i === 1
                      ? {
                          borderLeft: "1px solid rgba(169,180,179,0.15)",
                          borderRight: "1px solid rgba(169,180,179,0.15)",
                        }
                      : {}
                  }
                >
                  <p
                    className="font-label text-[10px] uppercase"
                    style={{ color }}
                  >
                    {key}
                  </p>
                  <p
                    className="text-sm font-bold font-headline"
                    style={{ color: "#2a3434" }}
                  >
                    {val}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Engagement rate card */}
          <div
            className="ghost-border rounded-xl p-6 transition-all hover:scale-[1.01]"
            style={{ backgroundColor: "#ffffff" }}
          >
            <div className="flex justify-between items-start mb-4">
              <div className="space-y-1">
                <span
                  className="font-label text-[10px] uppercase tracking-[0.2em]"
                  style={{ color: "#59615d" }}
                >
                  Engagement Rate
                </span>
                <h3
                  className="text-3xl font-headline font-bold"
                  style={{ color: "#40665a" }}
                >
                  84%
                </h3>
              </div>
              <span
                className="material-symbols-outlined p-2 rounded-lg"
                style={{ color: "#40665a", backgroundColor: "rgba(64,102,90,0.1)" }}
              >
                trending_up
              </span>
            </div>
            {/* Progress bar */}
            <div
              className="h-1 rounded-full mt-8 relative overflow-hidden"
              style={{ backgroundColor: "#dae5e3" }}
            >
              <div
                className="absolute inset-y-0 left-0 rounded-full"
                style={{ width: "84%", backgroundColor: "#40665a" }}
              />
            </div>
            <p
              className="font-label text-[11px] uppercase tracking-wide mt-2"
              style={{ color: "#576160" }}
            >
              +4.2% from last quarter
            </p>
          </div>

          {/* Studio capacity card */}
          <div
            className="ghost-border rounded-xl p-6 transition-all hover:scale-[1.01]"
            style={{ backgroundColor: "#ffffff" }}
          >
            <div className="flex justify-between items-start mb-4">
              <div className="space-y-1">
                <span
                  className="font-label text-[10px] uppercase tracking-[0.2em]"
                  style={{ color: "#59615d" }}
                >
                  Studio Capacity
                </span>
                <h3
                  className="text-3xl font-headline font-bold"
                  style={{ color: "#40665a" }}
                >
                  92%
                </h3>
              </div>
              <span
                className="material-symbols-outlined p-2 rounded-lg"
                style={{ color: "#59615d", backgroundColor: "rgba(89,97,93,0.1)" }}
              >
                bolt
              </span>
            </div>
            {/* Block bars */}
            <div className="flex gap-1 mt-8">
              {[true, true, true, false].map((filled, i) => (
                <div
                  key={i}
                  className="flex-1 h-3 rounded-sm"
                  style={{ backgroundColor: filled ? "#40665a" : "rgba(64,102,90,0.2)" }}
                />
              ))}
            </div>
            <p
              className="font-label text-[11px] uppercase tracking-wide mt-2"
              style={{ color: "#576160" }}
            >
              Critical load threshold
            </p>
          </div>
        </section>

        {/* ── Section 2: Live Projects + Sidebar Widgets ─────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Live Projects Feed (2/3) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex justify-between items-end">
              <div>
                <h2
                  className="text-2xl font-headline font-bold tracking-tighter"
                  style={{ color: "#2a3434" }}
                >
                  Live Projects
                </h2>
                <p
                  className="text-sm font-body"
                  style={{ color: "#576160" }}
                >
                  Active execution pipelines
                </p>
              </div>
              <button
                className="font-label font-bold text-[10px] uppercase tracking-widest pb-1 transition-colors hover:opacity-70"
                style={{
                  color: "#40665a",
                  borderBottom: "1px solid rgba(64,102,90,0.25)",
                }}
              >
                View All Archive
              </button>
            </div>

            <div className="space-y-4">
              {projects.map((p) => (
                <div
                  key={p.id}
                  className="ghost-border rounded-xl p-5 flex flex-col sm:flex-row gap-6 items-center transition-all hover:translate-x-1 duration-200"
                  style={{ backgroundColor: "#ffffff" }}
                >
                  {/* Thumbnail */}
                  <div
                    className="w-16 h-16 rounded-lg flex-shrink-0 flex items-center justify-center"
                    style={{ background: p.gradient }}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ color: "rgba(255,255,255,0.7)", fontSize: "1.75rem" }}
                    >
                      {p.icon}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="px-2 py-0.5 font-label font-bold text-[9px] uppercase rounded"
                        style={{
                          color: p.badgeColor,
                          backgroundColor: p.badgeBg,
                          border: `1px solid ${p.badgeBorder}`,
                        }}
                      >
                        {p.badge}
                      </span>
                      <h4
                        className="font-headline font-bold text-lg truncate"
                        style={{ color: "#2a3434" }}
                      >
                        {p.title}
                      </h4>
                    </div>
                    <div
                      className="flex items-center gap-4 text-xs mb-4 font-body"
                      style={{ color: "#576160" }}
                    >
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined" style={{ fontSize: "1rem" }}>
                          person
                        </span>
                        {p.lead}
                      </span>
                      <span
                        className="flex items-center gap-1 font-bold"
                        style={{ color: p.timeColor }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: "1rem" }}>
                          {p.warningStyle === "error" ? "priority_high" : "schedule"}
                        </span>
                        {p.time}
                      </span>
                    </div>
                    {/* Progress bar */}
                    <div
                      className="w-full h-1 rounded-full overflow-hidden"
                      style={{ backgroundColor: "#e9efee" }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${p.progress}%`,
                          backgroundColor: p.progressColor,
                        }}
                      />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      className="px-4 py-2 rounded-md font-label font-bold text-[10px] uppercase tracking-widest transition-all hover:opacity-80"
                      style={{ backgroundColor: "#e1eae9", color: "#2a3434" }}
                    >
                      Preview
                    </button>
                    <button
                      className="p-2 rounded-md transition-all"
                      style={{
                        backgroundColor:
                          p.warningStyle === "error"
                            ? "rgba(159,64,61,0.1)"
                            : "#e1eae9",
                        color:
                          p.warningStyle === "error" ? "#9f403d" : "#2a3434",
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: "1rem" }}>
                        {p.warningIcon}
                      </span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Sidebar Widgets (1/3) ─────────────────────────── */}
          <div className="space-y-8">

            {/* Meeting Hub */}
            <div
              className="ghost-border rounded-2xl p-6 relative overflow-hidden"
              style={{ backgroundColor: "#f0f4f3" }}
            >
              {/* Live pulse */}
              <div className="absolute top-4 right-4">
                <span className="relative inline-flex h-2.5 w-2.5">
                  <span
                    className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                    style={{ backgroundColor: "#9f403d" }}
                  />
                  <span
                    className="relative inline-flex h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: "#9f403d" }}
                  />
                </span>
              </div>

              <h3
                className="font-headline font-bold text-lg mb-6 flex items-center gap-2"
                style={{ color: "#2a3434" }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ color: "#40665a" }}
                >
                  videocam
                </span>
                Meeting Hub
              </h3>

              <div className="space-y-4">
                {/* Live meeting */}
                <div
                  className="p-4 rounded-xl ghost-border transition-all hover:scale-[1.02] duration-200"
                  style={{
                    backgroundColor: "#ffffff",
                    borderLeft: "4px solid #40665a",
                  }}
                >
                  <div className="mb-3">
                    <p
                      className="font-label font-bold text-[9px] uppercase tracking-[0.1em]"
                      style={{ color: "#40665a" }}
                    >
                      Live Now
                    </p>
                    <h4
                      className="font-headline text-sm font-bold mt-1"
                      style={{ color: "#2a3434" }}
                    >
                      Creative Sync: Neo-Baroque
                    </h4>
                  </div>
                  {/* Avatars */}
                  <div className="flex items-center -space-x-2 mb-4">
                    {["A", "B", "C"].map((seed) => (
                      <div
                        key={seed}
                        className="w-8 h-8 rounded-full border-2 flex items-center justify-center font-headline font-bold text-[10px]"
                        style={{
                          borderColor: "#ffffff",
                          backgroundColor: "#c2ebdc",
                          color: "#20463b",
                        }}
                      >
                        {seed}
                      </div>
                    ))}
                    <div
                      className="w-8 h-8 rounded-full border-2 flex items-center justify-center font-headline font-bold text-[10px]"
                      style={{
                        borderColor: "#ffffff",
                        backgroundColor: "#e1eae9",
                        color: "#576160",
                      }}
                    >
                      +2
                    </div>
                  </div>
                  <button
                    className="w-full py-2 rounded-lg font-label font-bold text-xs uppercase tracking-widest transition-colors"
                    style={{ backgroundColor: "#40665a", color: "#defff2" }}
                  >
                    Join Now
                  </button>
                </div>

                {/* Upcoming meeting */}
                <div
                  className="p-4 rounded-xl ghost-border opacity-60"
                  style={{ backgroundColor: "rgba(255,255,255,0.5)" }}
                >
                  <p
                    className="font-label font-bold text-[9px] uppercase tracking-[0.1em]"
                    style={{ color: "#59615d" }}
                  >
                    In 45 Min
                  </p>
                  <h4
                    className="font-headline text-sm font-bold mt-1"
                    style={{ color: "#2a3434" }}
                  >
                    Technical Feasibility Brief
                  </h4>
                  <div
                    className="flex items-center gap-2 mt-2 font-label text-[10px] uppercase"
                    style={{ color: "#576160" }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: "0.875rem" }}>
                      groups
                    </span>
                    8 Participants
                  </div>
                </div>
              </div>
            </div>

            {/* Studio Insight */}
            <div
              className="ghost-border rounded-2xl p-6"
              style={{ backgroundColor: "rgba(194,235,220,0.3)" }}
            >
              <h3
                className="font-headline font-bold text-lg mb-6 flex items-center gap-2"
                style={{ color: "#2a3434" }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ color: "#40665a" }}
                >
                  analytics
                </span>
                Studio Insight
              </h3>

              <div className="space-y-5">
                {insightBars.map(({ label, pct }) => (
                  <div key={label} className="space-y-2">
                    <div
                      className="flex justify-between font-label font-bold text-[10px] uppercase"
                      style={{ color: "#33594d" }}
                    >
                      <span>{label}</span>
                      <span>{pct}%</span>
                    </div>
                    <div
                      className="h-1.5 w-full rounded-full"
                      style={{ backgroundColor: "rgba(32,70,59,0.1)" }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, backgroundColor: "#345a4e" }}
                      />
                    </div>
                  </div>
                ))}

                {/* AI Recommendation */}
                <div
                  className="pt-4"
                  style={{ borderTop: "1px solid rgba(64,102,90,0.12)" }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="p-2 rounded-lg flex-shrink-0"
                      style={{ backgroundColor: "#ffffff" }}
                    >
                      <span
                        className="material-symbols-outlined"
                        style={{ color: "#40665a" }}
                      >
                        lightbulb
                      </span>
                    </div>
                    <p
                      className="font-body text-[11px] leading-relaxed"
                      style={{ color: "#33594d" }}
                    >
                      Recommend moving 2 junior curators to{" "}
                      <strong>Neo-Baroque</strong> stream to balance load.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Footer Metadata Bar ────────────────────────────── */}
        <footer
          className="ghost-border rounded-xl p-4 flex flex-col md:flex-row justify-between items-center gap-4"
          style={{ backgroundColor: "rgba(207,221,219,0.4)" }}
        >
          <div className="flex items-center gap-6">
            <div className="flex flex-col">
              <span
                className="font-label font-bold text-[8px] uppercase tracking-widest"
                style={{ color: "#727d7c" }}
              >
                Instance ID
              </span>
              <span
                className="text-[10px] font-mono"
                style={{ color: "#59615d" }}
              >
                ARCH-OS-2024-X9
              </span>
            </div>
            <div
              className="w-px h-6 hidden md:block"
              style={{ backgroundColor: "rgba(169,180,179,0.25)" }}
            />
            <div className="flex flex-col">
              <span
                className="font-label font-bold text-[8px] uppercase tracking-widest"
                style={{ color: "#727d7c" }}
              >
                Global Status
              </span>
              <span
                className="text-[10px] font-bold flex items-center gap-1"
                style={{ color: "#40665a" }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full animate-pulse"
                  style={{ backgroundColor: "#40665a" }}
                />
                NOMINAL
              </span>
            </div>
          </div>
          <div
            className="font-label text-[10px] flex items-center gap-4"
            style={{ color: "#59615d" }}
          >
            <span>LAST UPDATED: 12:43:02 GMT</span>
            <div
              className="w-px h-6"
              style={{ backgroundColor: "rgba(169,180,179,0.25)" }}
            />
            <span>SYNCED TO CLOUD CLUSTER [BERLIN]</span>
          </div>
        </footer>

      </div>
    </>
  );
}
