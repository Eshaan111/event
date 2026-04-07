"use client";

import { useState, useMemo, useEffect, useRef, useTransition } from "react";
import { addOrgMember } from "./actions";

/* ── Types ───────────────────────────────────────────────────── */

export type OrgRole =
  | "PRESIDENT" | "VICE_PRESIDENT" | "SECRETARY"
  | "HEAD_LOGISTICS" | "HEAD_FINANCE" | "HEAD_MARKETING" | "HEAD_CREATIVES"
  | "PROJECT_LEAD" | "ASSOCIATE" | "VOLUNTEER";

export type MemberCardData = {
  id:          string;
  name:        string;
  email:       string;
  image:       string | null;
  bio:         string | null;
  specialty:   string | null;
  joinedAt:    string;
  orgRole:     OrgRole | null;
  orgMemberId: string | null;
  memberships: {
    departmentName: string;
    role:      "HEAD" | "LEAD" | "MEMBER" | "OBSERVER";
    clearance: "OMEGA" | "ALPHA" | "BETA" | "GAMMA" | "DELTA";
  }[];
  proposals: {
    id:    string;
    title: string;
    type:  string;
    role:  string;
  }[];
};

/* ── Org hierarchy config ────────────────────────────────────── */

type OrgLevel = "Executive" | "Department Head" | "Core Member" | "Member" | "General";

const ORG_HIERARCHY: {
  level:          OrgLevel;
  role:           OrgRole;
  label:          string;
  responsibility: string;
  focus:          string;
}[] = [
  { level: "Executive",       role: "PRESIDENT",      label: "President",         responsibility: "Strategic Vision & External Representation", focus: "Leadership"    },
  { level: "Executive",       role: "VICE_PRESIDENT", label: "Vice President",    responsibility: "Internal Operations & Department Synergy",   focus: "Management"   },
  { level: "Executive",       role: "SECRETARY",      label: "Secretary",         responsibility: "Documentation & Membership Records",          focus: "Organization" },
  { level: "Department Head", role: "HEAD_LOGISTICS", label: "Head of Logistics", responsibility: "Venue & Technical Execution",                 focus: "Operations"   },
  { level: "Department Head", role: "HEAD_FINANCE",   label: "Head of Finance",   responsibility: "Budgeting & Sponsorships",                    focus: "Fiscal Health"},
  { level: "Department Head", role: "HEAD_MARKETING", label: "Head of Marketing", responsibility: "Branding & Public Relations",                 focus: "Outreach"     },
  { level: "Department Head", role: "HEAD_CREATIVES", label: "Head of Creatives", responsibility: "Design & Event Aesthetics",                   focus: "Innovation"   },
  { level: "Core Member",     role: "PROJECT_LEAD",   label: "Project Lead",      responsibility: "Managing specific event segments",            focus: "Ownership"    },
  { level: "Member",          role: "ASSOCIATE",      label: "Associate",         responsibility: "Execution of assigned tasks",                 focus: "Support"      },
  { level: "General",         role: "VOLUNTEER",      label: "Volunteer",         responsibility: "Day-of-event assistance",                     focus: "Execution"    },
];

const LEVEL_COLOR: Record<OrgLevel, { color: string; bg: string }> = {
  "Executive":       { color: "#1a1f1e", bg: "rgba(45,83,73,0.14)"    },
  "Department Head": { color: "#2d5349", bg: "rgba(64,102,90,0.10)"   },
  "Core Member":     { color: "#40665a", bg: "rgba(64,102,90,0.07)"   },
  "Member":          { color: "#576160", bg: "rgba(87,97,96,0.07)"    },
  "General":         { color: "#8a9796", bg: "rgba(169,180,179,0.09)" },
};

function orgRoleInfo(role: OrgRole | null) {
  if (!role) return null;
  const h = ORG_HIERARCHY.find((x) => x.role === role);
  if (!h) return null;
  return { ...h, ...LEVEL_COLOR[h.level] };
}

/* ── Clearance / role config ─────────────────────────────────── */

const CLEARANCE_ORDER = ["OMEGA", "ALPHA", "BETA", "GAMMA", "DELTA"] as const;
type Clearance = typeof CLEARANCE_ORDER[number];

const clearanceConfig: Record<Clearance, { label: string; color: string; bg: string }> = {
  OMEGA: { label: "Ω Omega", color: "#1a3a33", bg: "rgba(64,102,90,0.15)"  },
  ALPHA: { label: "α Alpha", color: "#2d5349", bg: "rgba(45,83,73,0.12)"   },
  BETA:  { label: "β Beta",  color: "#40665a", bg: "rgba(64,102,90,0.08)"  },
  GAMMA: { label: "γ Gamma", color: "#576160", bg: "rgba(87,97,96,0.08)"   },
  DELTA: { label: "δ Delta", color: "#a9b4b3", bg: "rgba(169,180,179,0.1)" },
};

const roleConfig: Record<string, { label: string; color: string; bg: string }> = {
  HEAD:     { label: "Head",     color: "#40665a", bg: "rgba(64,102,90,0.1)"   },
  LEAD:     { label: "Lead",     color: "#2d5349", bg: "rgba(45,83,73,0.1)"    },
  MEMBER:   { label: "Member",   color: "#576160", bg: "rgba(87,97,96,0.08)"   },
  OBSERVER: { label: "Observer", color: "#a9b4b3", bg: "rgba(169,180,179,0.1)" },
};

const proposalTypeColor: Record<string, string> = {
  EVENT:       "#3a618c",
  SUMMIT:      "#426b51",
  EXHIBITION:  "#5a4a7a",
  WEDDING:     "#7a4a4a",
  PERFORMANCE: "#4a6b7a",
  INTERNAL:    "#576160",
};

/* ── Sort / helpers ──────────────────────────────────────────── */

function topClearance(m: MemberCardData): Clearance {
  if (!m.memberships.length) return "DELTA";
  const idx = Math.min(...m.memberships.map((ms) => CLEARANCE_ORDER.indexOf(ms.clearance as Clearance)));
  return CLEARANCE_ORDER[idx];
}

function topRole(m: MemberCardData) {
  const order = ["HEAD", "LEAD", "MEMBER", "OBSERVER"];
  if (!m.memberships.length) return null;
  return m.memberships.reduce((a, b) => order.indexOf(a.role) < order.indexOf(b.role) ? a : b);
}

function sortPriority(m: MemberCardData): number {
  if (m.orgRole) {
    const idx = ORG_HIERARCHY.findIndex((h) => h.role === m.orgRole);
    return idx >= 0 ? idx : 99;
  }
  return 100 + CLEARANCE_ORDER.indexOf(topClearance(m));
}

/* ── Avatar ──────────────────────────────────────────────────── */

function Avatar({
  name, image, size = 96, featured = false,
}: {
  name: string; image: string | null; size?: number; featured?: boolean;
}) {
  const initial = name.charAt(0).toUpperCase();
  const ring    = featured ? "rgba(255,255,255,0.2)" : "rgba(194,235,220,0.5)";
  const padBg   = featured ? "rgba(52,90,78,1)" : "#f8faf9";
  const innerBg = featured ? "rgba(255,255,255,0.1)" : "#e9efee";
  const textClr = featured ? "#defff2" : "#40665a";

  return (
    <div style={{ width: size, height: size, borderRadius: "50%", overflow: image ? "hidden" : "visible", border: `2px solid ${ring}`, padding: 3, backgroundColor: padBg, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
      {image ? (
        <img src={image} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
      ) : (
        <div style={{ width: "100%", height: "100%", borderRadius: "50%", backgroundColor: innerBg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: size * 0.35, color: textClr }}>
          {initial}
        </div>
      )}
    </div>
  );
}

/* ── Hierarchy hover panel ───────────────────────────────────── */

function HierarchyPanel() {
  const [show, setShow] = useState(false);

  return (
    <div
      className="relative"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <button
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-label font-bold text-[10px] uppercase tracking-widest transition-all"
        style={{
          backgroundColor: show ? "#f0f4f3" : "transparent",
          color: show ? "#2d5349" : "rgba(87,97,96,0.75)",
          border: "1px solid rgba(169,180,179,0.25)",
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: "0.9rem" }}>account_tree</span>
        Structure
      </button>

      {show && (
        <div
          className="absolute right-0 top-full mt-2 z-50 rounded-2xl overflow-hidden"
          style={{
            backgroundColor: "#ffffff",
            border: "1px solid rgba(169,180,179,0.2)",
            boxShadow: "0 24px 64px rgba(42,52,52,0.12)",
            width: 540,
          }}
        >
          {/* Panel header */}
          <div className="px-6 py-4" style={{ borderBottom: "1px solid rgba(169,180,179,0.12)", backgroundColor: "#f8faf9" }}>
            <p className="font-headline font-bold text-sm" style={{ color: "#1a1f1e" }}>Organisational Structure</p>
            <p className="font-body text-[11px] mt-0.5" style={{ color: "#727d7c" }}>Role hierarchy and primary responsibilities</p>
          </div>

          {/* Rows */}
          <div>
            {ORG_HIERARCHY.map((h, i) => {
              const lc = LEVEL_COLOR[h.level];
              const isFirst = i === 0 || ORG_HIERARCHY[i - 1].level !== h.level;
              return (
                <div
                  key={h.role}
                  className="flex items-center gap-4 px-6 py-3"
                  style={{ borderBottom: i < ORG_HIERARCHY.length - 1 ? "1px solid rgba(169,180,179,0.08)" : "none" }}
                >
                  {/* Level label — only on first of each group */}
                  <div className="w-32 shrink-0">
                    {isFirst && (
                      <span
                        className="font-headline text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-wider"
                        style={{ backgroundColor: lc.bg, color: lc.color }}
                      >
                        {h.level}
                      </span>
                    )}
                  </div>

                  {/* Role + responsibility */}
                  <div className="flex-1 min-w-0">
                    <p className="font-headline font-bold text-[12px]" style={{ color: "#1a1f1e" }}>{h.label}</p>
                    <p className="font-body text-[10px] truncate" style={{ color: "#727d7c" }}>{h.responsibility}</p>
                  </div>

                  {/* Focus pill */}
                  <span
                    className="font-headline text-[9px] px-2 py-0.5 rounded uppercase tracking-wider shrink-0 font-bold"
                    style={{ backgroundColor: "rgba(169,180,179,0.1)", color: "#576160" }}
                  >
                    {h.focus}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── User search ─────────────────────────────────────────────── */

type UserSearchResult = { id: string; name: string | null; email: string; image: string | null };

function UserSearch({ onSelect }: { onSelect: (u: UserSearchResult) => void }) {
  const [query,   setQuery]   = useState("");
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [open,    setOpen]    = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (query.length < 2) { setResults([]); setOpen(false); return; }
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data);
        setOpen(data.length > 0);
      }
    }, 300);
  }, [query]);

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by name or email…"
        className="w-full px-4 py-2.5 rounded-xl font-body text-sm outline-none"
        style={{ border: "1px solid rgba(169,180,179,0.25)", backgroundColor: "#fafcfb", color: "#1a1f1e" }}
      />
      {open && results.length > 0 && (
        <div
          className="absolute top-full left-0 right-0 mt-1 z-50 rounded-xl overflow-hidden"
          style={{ backgroundColor: "#fff", border: "1px solid rgba(169,180,179,0.2)", boxShadow: "0 12px 32px rgba(42,52,52,0.10)" }}
        >
          {results.map((u) => (
            <button
              key={u.id}
              type="button"
              className="flex items-center gap-3 w-full px-4 py-2.5 text-left transition-colors hover:bg-[#f0f4f3]"
              onClick={() => { onSelect(u); setQuery(u.name ?? u.email); setOpen(false); }}
            >
              <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 overflow-hidden" style={{ backgroundColor: "#e9efee" }}>
                {u.image
                  ? <img src={u.image} alt="" className="w-full h-full object-cover" />
                  : <span className="font-headline font-bold text-[10px]" style={{ color: "#40665a" }}>{(u.name ?? u.email).charAt(0).toUpperCase()}</span>
                }
              </div>
              <div className="min-w-0">
                <p className="font-headline font-bold text-xs truncate" style={{ color: "#1a1f1e" }}>{u.name ?? "(no name)"}</p>
                <p className="font-body text-[10px] truncate" style={{ color: "#727d7c" }}>{u.email}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Add member panel ────────────────────────────────────────── */

function AddMemberPanel({ onClose }: { onClose: () => void }) {
  const [tab,          setTab]          = useState<"existing" | "new">("existing");
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);
  const [name,         setName]         = useState("");
  const [email,        setEmail]        = useState("");
  const [orgRole,      setOrgRole]      = useState<OrgRole>("ASSOCIATE");
  const [error,        setError]        = useState<string | null>(null);
  const [isPending,    startTransition] = useTransition();

  const roleInfo = orgRoleInfo(orgRole);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const fd = new FormData();
    fd.set("orgRole", orgRole);

    if (tab === "existing") {
      if (!selectedUser) { setError("Select a user from the search results."); return; }
      fd.set("userId", selectedUser.id);
      fd.set("name",   selectedUser.name ?? selectedUser.email);
      if (selectedUser.email) fd.set("email", selectedUser.email);
    } else {
      if (!name.trim()) { setError("Name is required."); return; }
      fd.set("name", name.trim());
      if (email.trim()) fd.set("email", email.trim());
    }

    startTransition(async () => {
      const res = await addOrgMember(fd);
      if (res?.error) { setError(res.error); }
      else { onClose(); }
    });
  }

  return (
    <div
      className="rounded-2xl overflow-hidden mb-8"
      style={{ backgroundColor: "#ffffff", border: "1px solid rgba(169,180,179,0.15)", boxShadow: "0 8px 32px rgba(42,52,52,0.06)" }}
    >
      {/* Panel header */}
      <div className="flex items-center justify-between px-8 py-5" style={{ borderBottom: "1px solid rgba(169,180,179,0.1)", backgroundColor: "#f8faf9" }}>
        <div>
          <h3 className="font-headline font-bold text-base" style={{ color: "#1a1f1e" }}>Add Organisation Member</h3>
          <p className="font-body text-[11px] mt-0.5" style={{ color: "#727d7c" }}>
            Assign an org role to an existing signed-in user, or add a new contact manually.
          </p>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-[#e9efee]"
          style={{ color: "#576160" }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: "1rem" }}>close</span>
        </button>
      </div>

      <div className="px-8 py-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {(["existing", "new"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className="px-4 py-2 rounded-xl font-label font-bold text-[10px] uppercase tracking-widest transition-all"
              style={
                tab === t
                  ? { backgroundColor: "#2d5349", color: "#defff2" }
                  : { backgroundColor: "transparent", color: "#576160", border: "1px solid rgba(169,180,179,0.22)" }
              }
            >
              {t === "existing" ? "Existing User" : "New Contact"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Input fields */}
          {tab === "existing" ? (
            <div>
              <label className="font-headline font-bold text-[10px] uppercase tracking-wider block mb-2" style={{ color: "#727d7c" }}>
                Search by name or email
              </label>
              <UserSearch onSelect={(u) => setSelectedUser(u)} />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="font-headline font-bold text-[10px] uppercase tracking-wider block mb-2" style={{ color: "#727d7c" }}>
                  Full Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Aryan Mehta"
                  className="w-full px-4 py-2.5 rounded-xl font-body text-sm outline-none"
                  style={{ border: "1px solid rgba(169,180,179,0.25)", backgroundColor: "#fafcfb", color: "#1a1f1e" }}
                />
              </div>
              <div>
                <label className="font-headline font-bold text-[10px] uppercase tracking-wider block mb-2" style={{ color: "#727d7c" }}>
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="member@example.com"
                  className="w-full px-4 py-2.5 rounded-xl font-body text-sm outline-none"
                  style={{ border: "1px solid rgba(169,180,179,0.25)", backgroundColor: "#fafcfb", color: "#1a1f1e" }}
                />
              </div>
            </div>
          )}

          {/* Role selector + live preview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
            <div>
              <label className="font-headline font-bold text-[10px] uppercase tracking-wider block mb-2" style={{ color: "#727d7c" }}>
                Org Role *
              </label>
              <select
                value={orgRole}
                onChange={(e) => setOrgRole(e.target.value as OrgRole)}
                className="w-full px-4 py-2.5 rounded-xl font-body text-sm outline-none"
                style={{ border: "1px solid rgba(169,180,179,0.25)", backgroundColor: "#fafcfb", color: "#1a1f1e" }}
              >
                {ORG_HIERARCHY.map((h) => (
                  <option key={h.role} value={h.role}>
                    {h.level} — {h.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Preview card */}
            {roleInfo && (
              <div
                className="rounded-xl px-5 py-4"
                style={{ backgroundColor: roleInfo.bg, border: `1px solid ${roleInfo.bg}` }}
              >
                <span
                  className="font-headline font-bold text-[9px] px-2 py-0.5 rounded uppercase tracking-wider"
                  style={{ backgroundColor: roleInfo.bg, color: roleInfo.color, border: `1px solid ${roleInfo.color}20` }}
                >
                  {roleInfo.level}
                </span>
                <p className="font-headline font-bold text-sm mt-2" style={{ color: roleInfo.color }}>{roleInfo.label}</p>
                <p className="font-body text-[10px] mt-0.5" style={{ color: "#727d7c" }}>{roleInfo.responsibility}</p>
              </div>
            )}
          </div>

          {error && (
            <p className="font-body text-xs px-4 py-2.5 rounded-xl" style={{ backgroundColor: "rgba(186,26,26,0.07)", color: "#ba1a1a" }}>
              {error}
            </p>
          )}

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={isPending}
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-label font-bold text-[11px] uppercase tracking-widest transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
              style={{ backgroundColor: "#2d5349", color: "#defff2", boxShadow: "0 4px 12px rgba(45,83,73,0.2)" }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: "1rem" }}>person_add</span>
              {isPending ? "Adding…" : "Add to Organisation"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Member card ─────────────────────────────────────────────── */

function MemberCard({ member, featured = false }: { member: MemberCardData; featured?: boolean }) {
  const best      = topRole(member);
  const clearance = topClearance(member);
  const clrCfg    = clearanceConfig[clearance];
  const orgInfo   = orgRoleInfo(member.orgRole);
  const shortId   = `AES-${member.id.slice(-4).toUpperCase()}`;

  const bg    = featured ? "#40665a"              : "#ffffff";
  const border = featured ? "none"                : "1px solid rgba(169,180,179,0.1)";
  const clr   = featured ? "#defff2"              : "#2a3434";
  const muted = featured ? "rgba(222,255,242,0.6)": "#576160";
  const divBg = featured ? "rgba(255,255,255,0.1)": "rgba(169,180,179,0.1)";

  return (
    <div
      className="group flex flex-col justify-between p-8 rounded-xl transition-all duration-300 hover:-translate-y-1"
      style={{
        backgroundColor: bg,
        border,
        boxShadow: featured ? "0 20px 48px rgba(64,102,90,0.2)" : "0 0 0 rgba(0,0,0,0)",
      }}
      onMouseEnter={(e) => { if (!featured) (e.currentTarget as HTMLDivElement).style.boxShadow = "0 20px 48px rgba(42,52,52,0.06)"; }}
      onMouseLeave={(e) => { if (!featured) (e.currentTarget as HTMLDivElement).style.boxShadow = "0 0 0 rgba(0,0,0,0)"; }}
    >
      <div>
        {/* Top row */}
        <div className="flex justify-between items-start mb-8">
          <Avatar name={member.name} image={member.image} size={96} featured={featured} />
          <span
            className="font-headline text-[10px] tracking-widest uppercase"
            style={{ color: featured ? "rgba(222,255,242,0.5)" : "#a9b4b3" }}
          >
            {best?.role === "HEAD" || best?.role === "LEAD" ? "Senior Council" : shortId}
          </span>
        </div>

        {/* Name */}
        <h3 className="font-headline text-2xl font-bold mb-2" style={{ color: clr }}>{member.name}</h3>

        {/* Org role badge */}
        {orgInfo && (
          <div className="mb-3">
            <span
              className="font-headline text-[10px] px-2.5 py-1 rounded font-bold uppercase tracking-wider"
              style={
                featured
                  ? { backgroundColor: "rgba(255,255,255,0.15)", color: "#fff", border: "1px solid rgba(255,255,255,0.2)" }
                  : { backgroundColor: orgInfo.bg, color: orgInfo.color }
              }
            >
              {orgInfo.label}
            </span>
          </div>
        )}

        {/* Dept role / specialty badges */}
        <div className="flex flex-wrap gap-2 mb-6">
          {best && (
            <span
              className="font-headline text-[9px] px-2 py-0.5 rounded uppercase tracking-wider"
              style={
                featured
                  ? { backgroundColor: "rgba(255,255,255,0.1)", color: "#fff", border: "1px solid rgba(255,255,255,0.2)" }
                  : { backgroundColor: roleConfig[best.role]?.bg, color: roleConfig[best.role]?.color }
              }
            >
              {roleConfig[best.role]?.label ?? best.role}
            </span>
          )}
          {member.specialty && (
            <span
              className="font-headline text-[9px] px-2 py-0.5 rounded uppercase tracking-wider"
              style={
                featured
                  ? { backgroundColor: "rgba(255,255,255,0.1)", color: "#fff", border: "1px solid rgba(255,255,255,0.2)" }
                  : { backgroundColor: "#e9efee", color: "#576160" }
              }
            >
              {member.specialty}
            </span>
          )}
          {!member.specialty && member.memberships[0] && (
            <span
              className="font-headline text-[9px] px-2 py-0.5 rounded uppercase tracking-wider"
              style={{ backgroundColor: featured ? "rgba(255,255,255,0.1)" : "#e9efee", color: featured ? "#fff" : "#576160" }}
            >
              {member.memberships[0].departmentName}
            </span>
          )}
        </div>

        {/* Projects / departments */}
        {member.memberships.length > 0 && (
          <div>
            <h4
              className="font-headline text-[10px] uppercase tracking-[0.1em] mb-3"
              style={{ color: featured ? "rgba(222,255,242,0.6)" : "#727d7c" }}
            >
              {member.proposals.length > 0 ? "Current Projects" : "Departments"}
            </h4>
            <div className="flex flex-wrap gap-2">
              {member.proposals.length > 0
                ? member.proposals.slice(0, 3).map((p) => (
                    <span
                      key={p.id}
                      className="px-3 py-1.5 font-headline font-bold text-[11px] uppercase tracking-wider rounded"
                      style={{ backgroundColor: featured ? "rgba(255,255,255,0.2)" : proposalTypeColor[p.type] ?? "#40665a", color: "#fff", border: featured ? "1px solid rgba(255,255,255,0.1)" : "none" }}
                    >
                      {p.title.length > 24 ? p.title.slice(0, 22) + "…" : p.title}
                    </span>
                  ))
                : member.memberships.slice(0, 3).map((ms) => (
                    <span
                      key={ms.departmentName}
                      className="px-3 py-1.5 font-headline font-bold text-[11px] uppercase tracking-wider rounded"
                      style={{ backgroundColor: featured ? "rgba(255,255,255,0.15)" : "rgba(64,102,90,0.08)", color: featured ? "#defff2" : "#40665a" }}
                    >
                      {ms.departmentName}
                    </span>
                  ))
              }
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        className="mt-8 pt-6 flex items-end justify-between"
        style={{ borderTop: `1px solid ${divBg}` }}
      >
        <div>
          <h4 className="font-headline text-[10px] uppercase tracking-[0.1em] mb-2" style={{ color: muted }}>Clearance</h4>
          <span
            className="font-headline text-[9px] px-2 py-0.5 rounded uppercase tracking-wider font-bold"
            style={
              featured
                ? { backgroundColor: "rgba(255,255,255,0.12)", color: "#defff2", border: "1px solid rgba(255,255,255,0.15)" }
                : { backgroundColor: clrCfg.bg, color: clrCfg.color }
            }
          >
            {clrCfg.label}
          </span>
        </div>
        {member.bio ? (
          <p className="text-[10px] leading-relaxed italic max-w-[60%] text-right" style={{ color: muted }}>
            {member.bio.length > 80 ? member.bio.slice(0, 78) + "…" : member.bio}
          </p>
        ) : (
          <p className="text-[10px] leading-relaxed italic" style={{ color: featured ? "rgba(222,255,242,0.4)" : "rgba(87,97,96,0.4)" }}>
            Joined {new Date(member.joinedAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
          </p>
        )}
      </div>
    </div>
  );
}

/* ── Main client component ───────────────────────────────────── */

export default function MembersClient({ members }: { members: MemberCardData[] }) {
  const [query,   setQuery]   = useState("");
  const [page,    setPage]    = useState(1);
  const [showAdd, setShowAdd] = useState(false);
  const PER_PAGE = 9;

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    if (!q) return members;
    return members.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.specialty?.toLowerCase().includes(q) ||
        m.memberships.some((ms) => ms.departmentName.toLowerCase().includes(q)) ||
        (m.orgRole && orgRoleInfo(m.orgRole)?.label.toLowerCase().includes(q))
    );
  }, [members, query]);

  const sorted = useMemo(() =>
    [...filtered].sort((a, b) => sortPriority(a) - sortPriority(b)),
  [filtered]);

  const totalPages = Math.ceil(sorted.length / PER_PAGE);
  const paged      = sorted.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  // Featured card: first executive-level org member, or highest clearance
  const featuredId =
    sorted.find((m) => m.orgRole && ["PRESIDENT", "VICE_PRESIDENT", "SECRETARY"].includes(m.orgRole))?.id ??
    sorted.find((m) => ["OMEGA", "ALPHA"].includes(topClearance(m)))?.id ??
    null;

  return (
    <div className="space-y-16">

      {/* ── Header ── */}
      <section>
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-0.5 bg-primary" />
          <span className="font-headline text-sm uppercase tracking-[0.2em] text-primary">Member Directory</span>
        </div>
        <h1
          className="font-headline font-bold tracking-tighter text-on-surface leading-none mb-6"
          style={{ fontSize: "clamp(3rem,7vw,5rem)" }}
        >
          Architectural<br />
          <span className="text-primary italic">Curators</span>
        </h1>

        <div className="flex flex-wrap gap-3 items-center justify-between">
          {/* Search + count */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="bg-surface-container-lowest ghost-border px-4 py-2 rounded-xl flex items-center gap-3">
              <span className="material-symbols-outlined text-primary" style={{ fontSize: "1rem" }}>search</span>
              <input
                type="text"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setPage(1); }}
                placeholder="Filter by name, role, or specialty…"
                className="bg-transparent border-none outline-none font-body text-sm w-56 text-on-surface placeholder:text-on-surface-variant/40"
              />
            </div>
            <div className="px-4 py-2 rounded-xl font-headline text-[10px] uppercase tracking-wider text-on-surface-variant cursor-default bg-surface-container-low ghost-border">
              {sorted.length} of {members.length} members
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <HierarchyPanel />
            <button
              onClick={() => setShowAdd((v) => !v)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-label font-bold text-[11px] uppercase tracking-widest transition-all hover:opacity-90 active:scale-95"
              style={
                showAdd
                  ? { backgroundColor: "#576160", color: "#ffffff" }
                  : { backgroundColor: "#2d5349", color: "#defff2", boxShadow: "0 4px 12px rgba(45,83,73,0.2)" }
              }
            >
              <span className="material-symbols-outlined" style={{ fontSize: "1rem" }}>
                {showAdd ? "close" : "person_add"}
              </span>
              {showAdd ? "Cancel" : "Add Member"}
            </button>
          </div>
        </div>
      </section>

      {/* ── Add member panel ── */}
      {showAdd && <AddMemberPanel onClose={() => setShowAdd(false)} />}

      {/* ── Grid ── */}
      {paged.length === 0 ? (
        <div
          className="rounded-2xl p-16 flex flex-col items-center gap-4 text-center"
          style={{ border: "2px dashed rgba(169,180,179,0.3)" }}
        >
          <span className="material-symbols-outlined text-outline-variant" style={{ fontSize: "3rem" }}>group_off</span>
          <p className="font-headline text-xl font-bold text-on-surface">No members found</p>
          <p className="font-body text-sm text-on-surface-variant">
            {members.length === 0
              ? "No one has signed in yet. Share the app URL and invite people to join."
              : "Try a different search term."}
          </p>
        </div>
      ) : (
        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {paged.map((m) => (
            <MemberCard key={m.id} member={m} featured={m.id === featuredId} />
          ))}
        </section>
      )}

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="font-body text-xs text-on-surface-variant">
            Showing {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, sorted.length)} of {sorted.length} members
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 rounded-xl font-label font-black text-[10px] uppercase tracking-widest bg-surface-container text-on-surface-variant hover:bg-surface-container-high transition-all disabled:opacity-30"
            >
              Prev
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                onClick={() => setPage(n)}
                className="w-9 h-9 rounded-xl font-label font-black text-[11px] transition-all"
                style={{
                  backgroundColor: n === page ? "#40665a" : "transparent",
                  color:           n === page ? "#defff2" : "#576160",
                  border:          n === page ? "none"    : "1px solid rgba(169,180,179,0.2)",
                }}
              >
                {n}
              </button>
            ))}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 rounded-xl font-label font-black text-[10px] uppercase tracking-widest bg-surface-container text-on-surface-variant hover:bg-surface-container-high transition-all disabled:opacity-30"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* ── Background glazing ── */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden" style={{ opacity: 0.04 }}>
        <div
          className="absolute -left-8 top-1/4 font-headline font-bold select-none"
          style={{ fontSize: "22vw", lineHeight: 0.8, letterSpacing: "-0.04em", WebkitTextStroke: "1px rgba(169,180,179,0.3)", color: "transparent" }}
        >
          SOCIETY
        </div>
        <div
          className="absolute -right-8 bottom-1/4 font-headline font-bold select-none text-right"
          style={{ fontSize: "22vw", lineHeight: 0.8, letterSpacing: "-0.04em", WebkitTextStroke: "1px rgba(169,180,179,0.3)", color: "transparent" }}
        >
          ARCHIVE
        </div>
      </div>
    </div>
  );
}
