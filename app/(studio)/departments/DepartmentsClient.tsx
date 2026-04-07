"use client";

import { useTransition, useState, useRef, useEffect, useCallback } from "react";
import {
  createDepartment,
  addExistingUser,
  createInviteLink,
  removeMember,
  deleteDepartment,
  revokeInvite,
} from "./actions";

/* ── Types ───────────────────────────────────────────────────── */

export type Clearance = "OMEGA" | "ALPHA" | "BETA" | "GAMMA" | "DELTA";
type Role = "HEAD" | "LEAD" | "MEMBER" | "OBSERVER";

export type SerializedMember = {
  id:        string;
  name:      string;
  email:     string | null;
  role:      Role;
  clearance: Clearance;
  joinedAt:  string;
  userId:    string | null;
};

export type SerializedInvite = {
  id:        string;
  email:     string;
  name:      string | null;
  role:      Role;
  clearance: Clearance;
  expiresAt: string;
  orgRole:   string | null;
};

export type SerializedDepartment = {
  id:        string;
  name:      string;
  protocol:  "STANDARD" | "RESTRICTED";
  parentId:  string | null;
  createdAt: string;
  members:   SerializedMember[];
  invites:   SerializedInvite[];
  children:  SerializedDepartment[];
};

type UserResult = { id: string; name: string | null; email: string; image: string | null };

/* ── Config ──────────────────────────────────────────────────── */

const roleConfig: Record<Role, { label: string; color: string; bg: string }> = {
  HEAD:     { label: "Head",     color: "#40665a", bg: "rgba(64,102,90,0.1)"   },
  LEAD:     { label: "Lead",     color: "#2d5349", bg: "rgba(45,83,73,0.1)"    },
  MEMBER:   { label: "Member",   color: "#576160", bg: "rgba(87,97,96,0.08)"   },
  OBSERVER: { label: "Observer", color: "#a9b4b3", bg: "rgba(169,180,179,0.1)" },
};

const clearanceConfig: Record<Clearance, { label: string; color: string; bg: string; desc: string }> = {
  OMEGA: { label: "Ω Omega", color: "#1a3a33", bg: "rgba(64,102,90,0.15)",  desc: "Full system access"         },
  ALPHA: { label: "α Alpha", color: "#2d5349", bg: "rgba(45,83,73,0.12)",   desc: "Department admin"           },
  BETA:  { label: "β Beta",  color: "#40665a", bg: "rgba(64,102,90,0.08)",  desc: "Creator"                    },
  GAMMA: { label: "γ Gamma", color: "#576160", bg: "rgba(87,97,96,0.08)",   desc: "Contributor"                },
  DELTA: { label: "δ Delta", color: "#a9b4b3", bg: "rgba(169,180,179,0.1)", desc: "Read-only"                  },
};

/* ── Org role config (for invite assignment) ─────────────────── */

// Ordered from highest (0) to lowest rank
const ORG_ROLE_ORDER = [
  "PRESIDENT", "VICE_PRESIDENT", "SECRETARY",
  "HEAD_LOGISTICS", "HEAD_FINANCE", "HEAD_MARKETING", "HEAD_CREATIVES",
  "PROJECT_LEAD", "ASSOCIATE", "VOLUNTEER",
] as const;

type InviteOrgRole = typeof ORG_ROLE_ORDER[number];

const ORG_ROLE_META: Record<InviteOrgRole, { label: string; level: string }> = {
  PRESIDENT:      { label: "President",         level: "Executive"       },
  VICE_PRESIDENT: { label: "Vice President",    level: "Executive"       },
  SECRETARY:      { label: "Secretary",         level: "Executive"       },
  HEAD_LOGISTICS: { label: "Head of Logistics", level: "Department Head" },
  HEAD_FINANCE:   { label: "Head of Finance",   level: "Department Head" },
  HEAD_MARKETING: { label: "Head of Marketing", level: "Department Head" },
  HEAD_CREATIVES: { label: "Head of Creatives", level: "Department Head" },
  PROJECT_LEAD:   { label: "Project Lead",      level: "Core Member"     },
  ASSOCIATE:      { label: "Associate",         level: "Member"          },
  VOLUNTEER:      { label: "Volunteer",         level: "General"         },
};

/* ── Shared small components ─────────────────────────────────── */

function RoleBadge({ role }: { role: Role }) {
  const c = roleConfig[role];
  return (
    <span className="px-2 py-0.5 rounded font-label text-[9px] font-black uppercase tracking-wider" style={{ backgroundColor: c.bg, color: c.color }}>
      {c.label}
    </span>
  );
}

function ClearanceBadge({ clearance }: { clearance: Clearance }) {
  const c = clearanceConfig[clearance];
  return (
    <span className="px-2 py-0.5 rounded font-label text-[9px] font-black tracking-wider" style={{ backgroundColor: c.bg, color: c.color }} title={c.desc}>
      {c.label}
    </span>
  );
}

function Avatar({ name, image, size = 28 }: { name: string; image?: string | null; size?: number }) {
  const initial = name.charAt(0).toUpperCase();
  if (image) return <img src={image} alt={name} style={{ width: size, height: size, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />;
  return (
    <div style={{ width: size, height: size, borderRadius: 8, backgroundColor: "#e9efee", color: "#2a3434", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0, fontFamily: "'Space Grotesk', sans-serif" }}>
      {initial}
    </div>
  );
}

function RoleSelect({ name, defaultValue = "MEMBER" }: { name: string; defaultValue?: Role }) {
  return (
    <select name={name} defaultValue={defaultValue} className="w-full rounded-lg px-2 py-2 font-body text-xs outline-none appearance-none bg-surface-container border border-outline-variant/20 text-on-surface focus:border-primary transition-colors">
      <option value="HEAD">Head</option>
      <option value="LEAD">Lead</option>
      <option value="MEMBER">Member</option>
      <option value="OBSERVER">Observer</option>
    </select>
  );
}

function ClearanceSelect({ name, defaultValue = "GAMMA" }: { name: string; defaultValue?: Clearance }) {
  return (
    <select name={name} defaultValue={defaultValue} className="w-full rounded-lg px-2 py-2 font-body text-xs outline-none appearance-none bg-surface-container border border-outline-variant/20 text-on-surface focus:border-primary transition-colors">
      <option value="OMEGA">Ω Omega — Full access</option>
      <option value="ALPHA">α Alpha — Dept admin</option>
      <option value="BETA">β Beta — Creator</option>
      <option value="GAMMA">γ Gamma — Contributor</option>
      <option value="DELTA">δ Delta — Read-only</option>
    </select>
  );
}

/* ── Member row ──────────────────────────────────────────────── */

function MemberRow({ member, departmentId, canEdit }: { member: SerializedMember; departmentId: string; canEdit: boolean }) {
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex items-center gap-2.5 py-2 group">
      <Avatar name={member.name} size={28} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="font-body text-xs font-bold text-on-surface truncate">{member.name}</p>
          {member.userId && (
            <span className="material-symbols-outlined text-primary" style={{ fontSize: "0.75rem" }} title="Linked account">verified</span>
          )}
        </div>
        {member.email && <p className="font-body text-[10px] text-on-surface-variant truncate">{member.email}</p>}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <ClearanceBadge clearance={member.clearance} />
        <RoleBadge role={member.role} />
      </div>
      {canEdit && (
        <button
          disabled={pending}
          onClick={() => startTransition(() => removeMember(member.id))}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-error hover:text-error/70 ml-0.5"
          aria-label="Remove member"
        >
          <span className="material-symbols-outlined" style={{ fontSize: "0.9rem" }}>
            {pending ? "hourglass_empty" : "close"}
          </span>
        </button>
      )}
    </div>
  );
}

/* ── Pending invite row ──────────────────────────────────────── */

function InviteRow({ invite, canEdit }: { invite: SerializedInvite; canEdit: boolean }) {
  const [pending, startTransition] = useTransition();
  const [copied, setCopied]        = useState(false);

  const baseUrl   = typeof window !== "undefined" ? window.location.origin : "";
  const inviteUrl = `${baseUrl}/invite?token=${invite.id}`;

  function copyLink() {
    navigator.clipboard.writeText(inviteUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="flex items-center gap-2.5 py-2 group">
      <div style={{ width: 28, height: 28, borderRadius: 8, border: "1px dashed rgba(169,180,179,0.4)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <span className="material-symbols-outlined" style={{ fontSize: "0.875rem", color: "#a9b4b3" }}>schedule_send</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-body text-xs text-on-surface-variant truncate">{invite.email}</p>
        {invite.name && <p className="font-body text-[10px] text-on-surface-variant/60 truncate">{invite.name}</p>}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <ClearanceBadge clearance={invite.clearance} />
        <RoleBadge role={invite.role} />
        <span className="px-2 py-0.5 rounded font-label text-[9px] font-black uppercase tracking-wider" style={{ backgroundColor: "rgba(255,180,0,0.1)", color: "#b38a00" }}>
          Pending
        </span>
      </div>
      <button onClick={copyLink} className="opacity-0 group-hover:opacity-100 transition-opacity text-on-surface-variant hover:text-primary ml-0.5" title="Copy invite link">
        <span className="material-symbols-outlined" style={{ fontSize: "0.9rem" }}>{copied ? "check" : "content_copy"}</span>
      </button>
      {canEdit && (
        <button
          disabled={pending}
          onClick={() => startTransition(() => revokeInvite(invite.id))}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-error hover:text-error/70"
          aria-label="Revoke invite"
        >
          <span className="material-symbols-outlined" style={{ fontSize: "0.9rem" }}>
            {pending ? "hourglass_empty" : "close"}
          </span>
        </button>
      )}
    </div>
  );
}

/* ── User search input ───────────────────────────────────────── */

function UserSearch({ onSelect }: { onSelect: (user: UserResult) => void }) {
  const [q, setQ]               = useState("");
  const [results, setResults]   = useState<UserResult[]>([]);
  const [loading, setLoading]   = useState(false);
  const [open, setOpen]         = useState(false);
  const debounceRef             = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback((val: string) => {
    if (val.length < 2) { setResults([]); setOpen(false); return; }
    setLoading(true);
    fetch(`/api/users/search?q=${encodeURIComponent(val)}`)
      .then((r) => r.json())
      .then((data) => { setResults(data); setOpen(data.length > 0); })
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, []);

  function handleChange(val: string) {
    setQ(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 300);
  }

  function select(user: UserResult) {
    onSelect(user);
    setQ(user.name ?? user.email);
    setOpen(false);
  }

  return (
    <div className="relative">
      <div className="relative">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" style={{ fontSize: "1rem" }}>search</span>
        <input
          type="text"
          value={q}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Search by name or email…"
          className="w-full rounded-lg pl-9 pr-3 py-2 font-body text-xs outline-none bg-surface-container border border-outline-variant/20 text-on-surface focus:border-primary transition-colors"
          autoComplete="off"
        />
        {loading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2">
            <svg width={12} height={12} viewBox="0 0 16 16" fill="none" style={{ animation: "spin 0.8s linear infinite" }}>
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
              <circle cx="8" cy="8" r="6" stroke="#a9b4b3" strokeWidth="2" strokeDasharray="28" strokeDashoffset="10" />
            </svg>
          </span>
        )}
      </div>
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-xl overflow-hidden" style={{ backgroundColor: "#ffffff", border: "1px solid rgba(169,180,179,0.25)", boxShadow: "0 8px 24px rgba(42,52,52,0.08)" }}>
          {results.map((user) => (
            <button
              key={user.id}
              type="button"
              onClick={() => select(user)}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-surface-container-low transition-colors text-left"
            >
              <Avatar name={user.name ?? user.email} image={user.image} size={28} />
              <div className="flex-1 min-w-0">
                <p className="font-body text-xs font-bold text-on-surface truncate">{user.name ?? "—"}</p>
                <p className="font-body text-[10px] text-on-surface-variant truncate">{user.email}</p>
              </div>
              <span className="material-symbols-outlined text-primary" style={{ fontSize: "0.9rem" }}>verified_user</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Add member panel ────────────────────────────────────────── */

type PanelTab = "search" | "invite";

function AddMemberPanel({
  departmentId,
  onClose,
  currentUserOrgRole,
}: {
  departmentId:       string;
  onClose:            () => void;
  currentUserOrgRole: string | null;
}) {
  const [tab, setTab]             = useState<PanelTab>("search");
  const [selectedUser, setSelectedUser] = useState<UserResult | null>(null);
  const [inviteLink, setInviteLink]     = useState<string | null>(null);
  const [copied, setCopied]             = useState(false);
  const [pending, startTransition]      = useTransition();
  const [error, setError]               = useState<string | null>(null);

  const searchFormRef = useRef<HTMLFormElement>(null);
  const inviteFormRef = useRef<HTMLFormElement>(null);

  function handleAddUser(formData: FormData) {
    if (!selectedUser) { setError("Select a user from the search results first"); return; }
    formData.set("userId", selectedUser.id);
    setError(null);
    startTransition(async () => {
      const res = await addExistingUser(departmentId, formData);
      if (res?.error) { setError(res.error); return; }
      onClose();
    });
  }

  function handleInvite(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await createInviteLink(departmentId, formData);
      if (res?.error) { setError(res.error); return; }
      if (res?.token) {
        const url = `${window.location.origin}/invite?token=${res.token}`;
        setInviteLink(url);
      }
    });
  }

  function copyInviteLink() {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const divider = <div style={{ borderTop: "1px solid rgba(169,180,179,0.15)" }} />;

  return (
    <div className="mt-3 pt-3 space-y-4" style={{ borderTop: "1px solid rgba(169,180,179,0.15)" }}>

      {/* Tab switcher */}
      <div className="flex rounded-xl overflow-hidden" style={{ border: "1px solid rgba(169,180,179,0.2)" }}>
        {(["search", "invite"] as PanelTab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => { setTab(t); setError(null); setInviteLink(null); setSelectedUser(null); }}
            className="flex-1 py-2 font-label font-black text-[9px] uppercase tracking-widest transition-colors"
            style={{
              backgroundColor: tab === t ? "#40665a" : "transparent",
              color:           tab === t ? "#defff2" : "#576160",
            }}
          >
            {t === "search" ? "Add Existing User" : "Invite by Link"}
          </button>
        ))}
      </div>

      {/* ── Search tab ── */}
      {tab === "search" && (
        <form ref={searchFormRef} action={handleAddUser} className="space-y-3">
          <UserSearch onSelect={(u) => { setSelectedUser(u); setError(null); }} />

          {selectedUser && (
            <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl" style={{ backgroundColor: "rgba(64,102,90,0.06)", border: "1px solid rgba(64,102,90,0.15)" }}>
              <Avatar name={selectedUser.name ?? selectedUser.email} image={selectedUser.image} size={32} />
              <div className="flex-1 min-w-0">
                <p className="font-body text-xs font-bold text-on-surface truncate">{selectedUser.name}</p>
                <p className="font-body text-[10px] text-on-surface-variant truncate">{selectedUser.email}</p>
              </div>
              <span className="material-symbols-outlined text-primary" style={{ fontSize: "1rem" }}>check_circle</span>
              <input type="hidden" name="userId" value={selectedUser.id} />
            </div>
          )}

          {divider}
          <div className="grid grid-cols-2 gap-2">
            <div><label className="font-label text-[9px] uppercase tracking-wider text-on-surface-variant block mb-1">Role</label><RoleSelect name="role" /></div>
            <div><label className="font-label text-[9px] uppercase tracking-wider text-on-surface-variant block mb-1">Clearance</label><ClearanceSelect name="clearance" /></div>
          </div>

          {error && <p className="font-body text-[10px] text-error">{error}</p>}

          <div className="flex gap-2">
            <button type="submit" disabled={pending || !selectedUser} className="flex-1 py-2 rounded-lg font-label font-black text-[10px] uppercase tracking-widest bg-primary text-on-primary hover:bg-primary-dim transition-all disabled:opacity-40">
              {pending ? "Adding…" : "Add Member"}
            </button>
            <button type="button" onClick={onClose} className="px-3 py-2 rounded-lg font-label font-black text-[10px] uppercase tracking-widest bg-surface-container text-on-surface-variant hover:bg-surface-container-high transition-all">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* ── Invite tab ── */}
      {tab === "invite" && (
        <>
          {inviteLink ? (
            <div className="space-y-3">
              <p className="font-label text-[9px] uppercase tracking-widest font-black text-primary">Invite link ready</p>
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ backgroundColor: "rgba(64,102,90,0.06)", border: "1px solid rgba(64,102,90,0.15)" }}>
                <p className="font-body text-[10px] text-on-surface-variant flex-1 truncate">{inviteLink}</p>
                <button type="button" onClick={copyInviteLink} className="font-label font-black text-[9px] uppercase tracking-wider flex items-center gap-1 text-primary hover:text-primary-dim transition-colors shrink-0">
                  <span className="material-symbols-outlined" style={{ fontSize: "0.875rem" }}>{copied ? "check" : "content_copy"}</span>
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
              <p className="font-body text-[10px] text-on-surface-variant leading-relaxed">
                Share this link with the person. When they sign in, they'll be added to the department automatically. Link expires in 7 days.
              </p>
              <button type="button" onClick={onClose} className="w-full py-2 rounded-lg font-label font-black text-[10px] uppercase tracking-widest bg-surface-container text-on-surface-variant hover:bg-surface-container-high transition-all">
                Done
              </button>
            </div>
          ) : (
            <form ref={inviteFormRef} action={handleInvite} className="space-y-3">
              <div>
                <label className="font-label text-[9px] uppercase tracking-wider text-on-surface-variant block mb-1">Email *</label>
                <input name="email" type="email" required placeholder="person@example.com" className="w-full rounded-lg px-3 py-2 font-body text-xs outline-none bg-surface-container border border-outline-variant/20 text-on-surface focus:border-primary transition-colors" />
              </div>
              <div>
                <label className="font-label text-[9px] uppercase tracking-wider text-on-surface-variant block mb-1">Name (optional)</label>
                <input name="name" type="text" placeholder="Their name" className="w-full rounded-lg px-3 py-2 font-body text-xs outline-none bg-surface-container border border-outline-variant/20 text-on-surface focus:border-primary transition-colors" />
              </div>
              {divider}
              <div className="grid grid-cols-2 gap-2">
                <div><label className="font-label text-[9px] uppercase tracking-wider text-on-surface-variant block mb-1">Dept Role</label><RoleSelect name="role" /></div>
                <div><label className="font-label text-[9px] uppercase tracking-wider text-on-surface-variant block mb-1">Clearance</label><ClearanceSelect name="clearance" /></div>
              </div>

              {/* Org role assignment — only shown if the inviter has an org rank */}
              {currentUserOrgRole && (() => {
                const inviterIdx    = ORG_ROLE_ORDER.indexOf(currentUserOrgRole as InviteOrgRole);
                const availableRoles = ORG_ROLE_ORDER.filter((_, idx) => idx >= inviterIdx);
                return (
                  <div>
                    {divider}
                    <label className="font-label text-[9px] uppercase tracking-wider text-on-surface-variant block mb-1 mt-3">
                      Org Role <span style={{ color: "#a9b4b3" }}>(optional — assigned on sign-in)</span>
                    </label>
                    <select
                      name="orgRole"
                      defaultValue=""
                      className="w-full rounded-lg px-2 py-2 font-body text-xs outline-none appearance-none bg-surface-container border border-outline-variant/20 text-on-surface focus:border-primary transition-colors"
                    >
                      <option value="">— No org role —</option>
                      {availableRoles.map((role) => {
                        const meta = ORG_ROLE_META[role];
                        return (
                          <option key={role} value={role}>
                            {meta.level} — {meta.label}
                          </option>
                        );
                      })}
                    </select>
                    <p className="font-body text-[9px] mt-1" style={{ color: "#a9b4b3" }}>
                      You can assign up to your own level ({ORG_ROLE_META[currentUserOrgRole as InviteOrgRole]?.label ?? currentUserOrgRole}).
                    </p>
                  </div>
                );
              })()}

              <p className="font-body text-[10px] text-on-surface-variant/60 leading-relaxed">
                Generates a secure link to share. No email is sent — you copy and forward it yourself.
              </p>
              {error && <p className="font-body text-[10px] text-error">{error}</p>}
              <div className="flex gap-2">
                <button type="submit" disabled={pending} className="flex-1 py-2 rounded-lg font-label font-black text-[10px] uppercase tracking-widest bg-primary text-on-primary hover:bg-primary-dim transition-all disabled:opacity-50">
                  {pending ? "Generating…" : "Generate Link"}
                </button>
                <button type="button" onClick={onClose} className="px-3 py-2 rounded-lg font-label font-black text-[10px] uppercase tracking-widest bg-surface-container text-on-surface-variant hover:bg-surface-container-high transition-all">
                  Cancel
                </button>
              </div>
            </form>
          )}
        </>
      )}
    </div>
  );
}

/* ── Department Card ─────────────────────────────────────────── */

function DepartmentCard({
  dept,
  isRoot = false,
  canEdit = false,
  currentUserOrgRole = null,
}: {
  dept:               SerializedDepartment;
  isRoot?:            boolean;
  canEdit?:           boolean;
  currentUserOrgRole?: string | null;
}) {
  const [panelOpen, setPanelOpen]     = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [showInvites, setShowInvites] = useState(false);
  const [pending, startTransition]    = useTransition();

  const head         = dept.members.find((m) => m.role === "HEAD");
  const colSpan      = isRoot ? "md:col-span-8" : "md:col-span-4";
  const pendingCount = dept.invites.length;

  return (
    <div className={`${colSpan} ghost-border rounded-2xl p-6 bg-surface-container-lowest hover:bg-surface-container transition-colors group flex flex-col gap-4`}>

      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="space-y-1 flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-label text-[9px] uppercase tracking-[0.2em] font-black" style={{ color: "rgba(87,97,96,0.6)" }}>
              {dept.protocol === "RESTRICTED" ? "Restricted" : "Standard"} · {dept.members.length} member{dept.members.length !== 1 ? "s" : ""}
            </span>
            {dept.children.length > 0 && (
              <span className="font-label text-[9px] uppercase font-black text-primary">
                · {dept.children.length} sub-node{dept.children.length !== 1 ? "s" : ""}
              </span>
            )}
            {pendingCount > 0 && (
              <button onClick={() => setShowInvites((v) => !v)} className="font-label text-[9px] uppercase tracking-[0.15em] font-black px-1.5 py-0.5 rounded transition-colors" style={{ backgroundColor: "rgba(255,180,0,0.1)", color: "#b38a00" }}>
                {pendingCount} pending
              </button>
            )}
          </div>
          <h3 className="font-headline text-xl font-bold text-on-surface truncate">{dept.name}</h3>
          {head ? (
            <p className="font-body text-xs text-on-surface-variant flex items-center gap-1">
              <span className="material-symbols-outlined" style={{ fontSize: "0.875rem", color: "#40665a" }}>person</span>
              {head.name}
              {head.userId && <span className="material-symbols-outlined text-primary" style={{ fontSize: "0.75rem" }} title="Verified account">verified</span>}
            </p>
          ) : (
            <p className="font-body text-xs flex items-center gap-1" style={{ color: "#9f403d" }}>
              <span className="material-symbols-outlined" style={{ fontSize: "0.875rem" }}>person_off</span>
              No head assigned
            </p>
          )}
        </div>
        <span className="material-symbols-outlined transition-transform group-hover:scale-110" style={{ color: "#40665a", fontSize: isRoot ? "2rem" : "1.5rem" }}>
          {isRoot ? "hub" : "account_tree"}
        </span>
      </div>

      {/* Member list */}
      {dept.members.length > 0 && (
        <div className="space-y-0 rounded-xl p-3" style={{ backgroundColor: "rgba(240,244,243,0.6)" }}>
          {dept.members.map((m) => <MemberRow key={m.id} member={m} departmentId={dept.id} canEdit={canEdit} />)}
        </div>
      )}

      {/* Pending invites */}
      {showInvites && dept.invites.length > 0 && (
        <div className="space-y-0 rounded-xl p-3" style={{ backgroundColor: "rgba(255,180,0,0.04)", border: "1px dashed rgba(255,180,0,0.2)" }}>
          <p className="font-label text-[9px] uppercase tracking-widest font-black mb-2" style={{ color: "#b38a00" }}>Pending Invites</p>
          {dept.invites.map((inv) => <InviteRow key={inv.id} invite={inv} canEdit={canEdit} />)}
        </div>
      )}

      {/* Add member panel — only for users with edit rights */}
      {canEdit && (
        panelOpen ? (
          <AddMemberPanel departmentId={dept.id} onClose={() => setPanelOpen(false)} currentUserOrgRole={currentUserOrgRole} />
        ) : (
          <button onClick={() => setPanelOpen(true)} className="w-full py-2.5 rounded-xl font-label font-black text-[10px] uppercase tracking-widest bg-surface-container text-on-surface-variant hover:bg-primary hover:text-on-primary transition-all">
            + Add / Invite Member
          </button>
        )
      )}

      {/* Delete — only for users with edit rights on non-root nodes */}
      {canEdit && !isRoot && (
        <div className="mt-auto pt-2 flex justify-end" style={{ borderTop: "1px solid rgba(169,180,179,0.12)" }}>
          {deleteConfirm ? (
            <div className="flex items-center gap-2 w-full">
              <span className="font-label text-[9px] text-error uppercase tracking-wider flex-1">Delete "{dept.name}"?</span>
              <button disabled={pending} onClick={() => startTransition(() => deleteDepartment(dept.id))} className="px-3 py-1 rounded-lg font-label font-black text-[9px] uppercase bg-error text-on-error hover:opacity-80 disabled:opacity-50 transition-all">
                {pending ? "…" : "Confirm"}
              </button>
              <button onClick={() => setDeleteConfirm(false)} className="px-3 py-1 rounded-lg font-label font-black text-[9px] uppercase bg-surface-container text-on-surface-variant hover:bg-surface-container-high transition-all">
                Cancel
              </button>
            </div>
          ) : (
            <button onClick={() => setDeleteConfirm(true)} className="font-label text-[9px] uppercase tracking-wider text-on-surface-variant/40 hover:text-error transition-colors">
              Delete node
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Tree view ───────────────────────────────────────────────── */

function TreeNode({ dept, depth = 0 }: { dept: SerializedDepartment; depth?: number }) {
  const [open, setOpen] = useState(true);
  const head            = dept.members.find((m) => m.role === "HEAD");

  return (
    <div style={{ marginLeft: depth === 0 ? 0 : "1.5rem" }}>
      <div className="flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-surface-container transition-colors" style={{ borderLeft: depth > 0 ? "2px solid rgba(169,180,179,0.2)" : "none", marginLeft: depth > 0 ? "-1px" : 0 }}>
        {dept.children.length > 0 ? (
          <button onClick={() => setOpen((v) => !v)} className="text-on-surface-variant hover:text-primary transition-colors">
            <span className="material-symbols-outlined" style={{ fontSize: "1rem" }}>{open ? "expand_more" : "chevron_right"}</span>
          </button>
        ) : <span style={{ width: "1.5rem" }} />}
        <span className="material-symbols-outlined shrink-0" style={{ fontSize: "1rem", color: depth === 0 ? "#40665a" : "#576160" }}>
          {depth === 0 ? "hub" : "account_tree"}
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-headline text-sm font-bold text-on-surface truncate">{dept.name}</p>
          <p className="font-body text-[10px] text-on-surface-variant">
            {dept.members.length} member{dept.members.length !== 1 ? "s" : ""}
            {head && ` · ${head.name}`}
            {dept.invites.length > 0 && ` · ${dept.invites.length} pending`}
          </p>
        </div>
        <span className="font-label text-[9px] uppercase tracking-wider font-black shrink-0" style={{ color: dept.protocol === "RESTRICTED" ? "#9f403d" : "rgba(87,97,96,0.5)" }}>
          {dept.protocol}
        </span>
      </div>
      {dept.children.length > 0 && open && (
        <div className="mt-0.5 space-y-0.5">
          {dept.children.map((c) => <TreeNode key={c.id} dept={c} depth={depth + 1} />)}
        </div>
      )}
    </div>
  );
}

/* ── Create department form ──────────────────────────────────── */

function CreateDepartmentForm({ allDepts, onClose }: { allDepts: SerializedDepartment[]; onClose: () => void }) {
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function flat(depts: SerializedDepartment[]): SerializedDepartment[] {
    return depts.flatMap((d) => [d, ...flat(d.children)]);
  }

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await createDepartment(formData);
      formRef.current?.reset();
      onClose();
    });
  }

  return (
    <section className="ghost-border rounded-3xl overflow-hidden grid grid-cols-1 md:grid-cols-2">
      <div className="p-12 space-y-8 bg-surface-container-lowest">
        <div className="space-y-2">
          <h2 className="font-headline text-4xl font-bold tracking-tighter text-on-surface">New Department</h2>
          <p className="font-body text-sm text-on-surface-variant">Expand the organisational shell with a new structural node.</p>
        </div>
        <form ref={formRef} action={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="font-label text-[10px] uppercase font-black tracking-widest block text-on-surface-variant">Department Name</label>
            <input name="name" required type="text" placeholder="e.g. Strategic Planning" className="w-full rounded-xl px-4 py-4 font-body text-sm outline-none bg-surface-container-low border border-outline-variant/20 text-on-surface focus:border-primary transition-colors" />
          </div>
          <div className="space-y-2">
            <label className="font-label text-[10px] uppercase font-black tracking-widest block text-on-surface-variant">Parent Node</label>
            <select name="parentId" className="w-full rounded-xl px-4 py-4 font-body text-sm outline-none appearance-none bg-surface-container-low border border-outline-variant/20 text-on-surface focus:border-primary transition-colors">
              <option value="">— Root level —</option>
              {flat(allDepts).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="font-label text-[10px] uppercase font-black tracking-widest block text-on-surface-variant">Initial Protocol</label>
            <div className="grid grid-cols-2 gap-3">
              {(["STANDARD", "RESTRICTED"] as const).map((p) => (
                <label key={p} className="flex items-center gap-3 p-3 rounded-xl cursor-pointer bg-surface border border-outline-variant/15 hover:border-primary transition-colors">
                  <input type="radio" name="protocol" value={p} defaultChecked={p === "STANDARD"} className="accent-primary" />
                  <span className="font-label text-[10px] uppercase font-black tracking-wider text-on-surface">{p.charAt(0) + p.slice(1).toLowerCase()}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={pending} className="flex-1 py-5 rounded-xl font-label font-black text-[11px] uppercase tracking-widest text-on-primary hover:opacity-90 active:scale-[0.99] transition-all disabled:opacity-50" style={{ background: "linear-gradient(135deg, #40665a, #345a4e)", boxShadow: "0 8px 24px rgba(64,102,90,0.15)" }}>
              {pending ? "Initializing…" : "Initialize Node"}
            </button>
            <button type="button" onClick={onClose} className="px-6 py-5 rounded-xl font-label font-black text-[11px] uppercase tracking-widest bg-surface-container text-on-surface-variant hover:bg-surface-container-high transition-all">
              Cancel
            </button>
          </div>
        </form>
      </div>
      <div className="relative min-h-[400px] flex flex-col justify-end p-12 space-y-4" style={{ backgroundColor: "#2d5349" }}>
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.15) 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
        <div className="absolute -right-8 top-8 font-headline font-bold leading-none pointer-events-none select-none" style={{ fontSize: "10rem", color: "rgba(255,255,255,0.04)", letterSpacing: "-0.05em", writingMode: "vertical-lr" }}>NODE</div>
        <div className="relative space-y-4">
          <div className="w-12 h-0.5" style={{ backgroundColor: "rgba(255,255,255,0.3)" }} />
          <h4 className="font-headline text-2xl font-bold italic leading-tight text-white">"Structure is the foundation of creative freedom within the society."</h4>
          <p className="font-label text-[10px] uppercase tracking-[0.3em]" style={{ color: "rgba(255,255,255,0.5)" }}>— Tier 01 Mandate</p>
        </div>
      </div>
    </section>
  );
}

/* ── Page root ───────────────────────────────────────────────── */

export default function DepartmentsClient({
  rootDepts,
  editableDeptIds,
  currentUserOrgRole,
}: {
  rootDepts:          SerializedDepartment[];
  editableDeptIds:    string[] | "ALL";
  currentUserOrgRole: string | null;
}) {
  const [createOpen, setCreateOpen] = useState(false);

  // Whether the current user can manage a specific department
  function canManage(deptId: string): boolean {
    if (editableDeptIds === "ALL") return true;
    return editableDeptIds.includes(deptId);
  }

  // Whether the user can manage anything at all (gates top-level actions)
  const hasAnyAccess = editableDeptIds === "ALL" || editableDeptIds.length > 0;

  function flatAll(depts: SerializedDepartment[]): SerializedDepartment[] {
    return depts.flatMap((d) => [d, ...flatAll(d.children)]);
  }
  const allFlat      = flatAll(rootDepts);
  const totalNodes   = allFlat.length;
  const totalMembers = allFlat.reduce((n, d) => n + d.members.length, 0);
  const unassigned   = allFlat.filter((d) => !d.members.some((m) => m.role === "HEAD"));
  const totalPending = allFlat.reduce((n, d) => n + d.invites.length, 0);
  const linkedCount  = allFlat.reduce((n, d) => n + d.members.filter((m) => m.userId).length, 0);

  return (
    <div className="space-y-16">

      {/* Warning */}
      {unassigned.length > 0 && (
        <div className="-mx-6 md:-mx-8 -mt-8 flex items-center justify-between px-8 py-3 bg-error-container/10 border-b border-error/30">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-error" style={{ fontSize: "1.25rem", fontVariationSettings: "'FILL' 1" }}>warning</span>
            <span className="font-label font-black text-[11px] uppercase tracking-widest text-error">
              {unassigned.length} department{unassigned.length > 1 ? "s" : ""} without a designated head
            </span>
          </div>
          <button className="px-4 py-1.5 rounded-full font-label font-black text-[10px] uppercase tracking-widest bg-error text-on-error transition-all hover:opacity-80 active:scale-95">Review</button>
        </div>
      )}

      {/* Header */}
      <section className="space-y-4">
        <div className="flex items-center gap-4">
          <span className="font-label font-black text-[10px] uppercase tracking-[0.2em] text-primary">Structural Tier 01</span>
          <div className="h-px flex-1 bg-outline-variant/20" />
        </div>
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-headline text-7xl font-bold tracking-tighter leading-none text-on-surface">Departments</h1>
            <p className="font-body text-lg leading-relaxed max-w-xl text-on-surface-variant mt-3">
              Manage the structural hierarchy of your organisation. Add signed-in members directly or generate secure invite links for new people.
            </p>
          </div>
          {hasAnyAccess && (
            <button
              onClick={() => setCreateOpen((v) => !v)}
              className="px-6 py-3 rounded-xl font-label font-black text-[11px] uppercase tracking-widest transition-all active:scale-95 shrink-0"
              style={{ background: createOpen ? "transparent" : "linear-gradient(135deg, #40665a, #345a4e)", color: createOpen ? "#576160" : "#defff2", border: createOpen ? "1px solid rgba(169,180,179,0.3)" : "none", boxShadow: createOpen ? "none" : "0 4px 12px rgba(64,102,90,0.2)" }}
            >
              {createOpen ? "Cancel" : "+ New Department"}
            </button>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-6 px-6 py-4 rounded-2xl mt-2 flex-wrap" style={{ backgroundColor: "rgba(240,244,243,0.6)", border: "1px solid rgba(169,180,179,0.12)" }}>
          {[
            { label: "Nodes",          value: totalNodes   },
            { label: "Members",        value: totalMembers },
            { label: "Verified",       value: linkedCount, highlight: true },
            { label: "Pending Invites",value: totalPending,  warn: totalPending > 0,  warnColor: "#b38a00" },
            { label: "Unheaded",       value: unassigned.length, warn: unassigned.length > 0 },
          ].map(({ label, value, warn, highlight, warnColor }) => (
            <div key={label} className="space-y-0.5">
              <p className="font-label text-[9px] uppercase tracking-widest text-on-surface-variant">{label}</p>
              <p className="font-headline text-2xl font-bold" style={{ color: warn ? (warnColor ?? "#9f403d") : highlight ? "#40665a" : "#2a3434" }}>{value}</p>
            </div>
          ))}
          <div className="ml-auto space-y-0.5">
            <p className="font-label text-[9px] uppercase tracking-widest text-on-surface-variant">Status</p>
            <p className="font-headline text-2xl font-bold flex items-center gap-2 text-primary">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />Optimal
            </p>
          </div>
        </div>

        {/* Clearance legend */}
        <div className="flex items-center gap-3 flex-wrap px-1">
          <span className="font-label text-[9px] uppercase tracking-widest text-on-surface-variant/60">Clearance:</span>
          {(Object.entries(clearanceConfig) as [Clearance, typeof clearanceConfig[Clearance]][]).map(([key, cfg]) => (
            <span key={key} className="px-2 py-0.5 rounded font-label text-[9px] font-black tracking-wider" style={{ backgroundColor: cfg.bg, color: cfg.color }} title={cfg.desc}>{cfg.label}</span>
          ))}
        </div>
      </section>

      {createOpen && <CreateDepartmentForm allDepts={rootDepts} onClose={() => setCreateOpen(false)} />}

      {rootDepts.length === 0 ? (
        <div className="rounded-2xl p-16 flex flex-col items-center gap-4 text-center" style={{ border: "2px dashed rgba(169,180,179,0.3)" }}>
          <span className="material-symbols-outlined text-outline-variant" style={{ fontSize: "3rem" }}>account_tree</span>
          <p className="font-headline text-xl font-bold text-on-surface">No departments yet</p>
          <p className="font-body text-sm text-on-surface-variant max-w-xs">Create your first structural node to start building the hierarchy.</p>
          {hasAnyAccess && (
            <button onClick={() => setCreateOpen(true)} className="mt-2 px-6 py-3 rounded-xl font-label font-black text-[11px] uppercase tracking-widest bg-primary text-on-primary hover:bg-primary-dim transition-all">+ New Department</button>
          )}
        </div>
      ) : (
        <section className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {rootDepts.map((dept, i) => (
            <DepartmentCard key={dept.id} dept={dept} isRoot={i === 0 && rootDepts.length > 1} canEdit={canManage(dept.id)} currentUserOrgRole={currentUserOrgRole} />
          ))}
        </section>
      )}

      {rootDepts.some((d) => d.children.length > 0) && (
        <section className="space-y-6">
          {rootDepts.filter((d) => d.children.length > 0).map((parent) => (
            <div key={parent.id} className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="font-label text-[10px] uppercase tracking-widest text-primary font-black">Sub-nodes of {parent.name}</span>
                <div className="h-px flex-1 bg-outline-variant/20" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                {parent.children.map((c) => (
                  <DepartmentCard key={c.id} dept={c} canEdit={canManage(c.id)} currentUserOrgRole={currentUserOrgRole} />
                ))}
              </div>
            </div>
          ))}
        </section>
      )}

      {rootDepts.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-4">
            <span className="font-label font-black text-[10px] uppercase tracking-[0.2em] text-primary">Structural Map</span>
            <div className="h-px flex-1 bg-outline-variant/20" />
          </div>
          <div className="rounded-2xl p-6" style={{ backgroundColor: "#ffffff", border: "1px solid rgba(169,180,179,0.15)" }}>
            <div className="space-y-1">
              {rootDepts.map((d) => <TreeNode key={d.id} dept={d} depth={0} />)}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
