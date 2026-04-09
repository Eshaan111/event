"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { useState } from "react";

export type SeedUser = {
  id:        string;
  name:      string;
  email:     string;
  orgRole:   string;
  deptName?: string;
  deptRole?: string;
  isStudent?: boolean;
};

export type OrgSection = {
  orgName: string;
  groups:  { groupName: string; users: SeedUser[] }[];
};

const ORG_ROLE_LABEL: Record<string, string> = {
  PRESIDENT:      "President",
  VICE_PRESIDENT: "Vice President",
  SECRETARY:      "Secretary",
  HEAD_LOGISTICS: "Head of Logistics",
  HEAD_FINANCE:   "Head of Finance",
  HEAD_MARKETING: "Head of Marketing",
  HEAD_CREATIVES: "Head of Creatives",
  PROJECT_LEAD:   "Project Lead",
  ASSOCIATE:      "Associate",
  VOLUNTEER:      "Volunteer",
};

const DEPT_ROLE_LABEL: Record<string, string> = {
  HEAD:     "Department Head",
  LEAD:     "Team Lead",
  MEMBER:   "Member",
  OBSERVER: "Observer",
};

// Seed org role tier colours
const SEED_GROUP_COLOR: Record<string, { bg: string; text: string }> = {
  Executive:          { bg: "#2d5349", text: "#ffffff" },
  "Department Heads": { bg: "#40665a", text: "#ffffff" },
  "Core Members":     { bg: "#c2ebdc", text: "#0f2e22" },
  Associates:         { bg: "#dae5e3", text: "#2a3434" },
  General:            { bg: "#e9efee", text: "#576160" },
};

// DEMO dept colours
const DEMO_DEPT_COLOR: Record<string, { bg: string; text: string }> = {
  "Creative Direction":       { bg: "#3d1a5c", text: "#ffffff" },
  "Production & Logistics":   { bg: "#1a3a5c", text: "#ffffff" },
  "Finance & Strategy":       { bg: "#1a4a1a", text: "#ffffff" },
  "Technology & Innovation":  { bg: "#3a1a1a", text: "#ffffff" },
};

const DEMO_DEPT_LIGHT: Record<string, { bg: string; text: string }> = {
  "Creative Direction":       { bg: "#ede0f8", text: "#2a0f40" },
  "Production & Logistics":   { bg: "#dceeff", text: "#0a2040" },
  "Finance & Strategy":       { bg: "#d8f0d8", text: "#0a2a0a" },
  "Technology & Innovation":  { bg: "#f8dede", text: "#2a0a0a" },
};

export default function DevSwitcher({
  orgs,
  currentUserId,
  currentUserName,
}: {
  orgs:            OrgSection[];
  currentUserId:   string | null;
  currentUserName: string | null;
}) {
  const { status } = useSession();
  const [loading, setLoading] = useState<string | null>(null);

  async function handleSignIn(email: string, userId: string, isStudent?: boolean) {
    setLoading(userId);
    await signIn("dev-seed", { email, callbackUrl: isStudent ? "/student" : "/" });
    setLoading(null);
  }

  async function handleSignOut() {
    setLoading("__out");
    await signOut({ callbackUrl: "/dev" });
  }

  const totalUsers = orgs.reduce((s, o) => s + o.groups.reduce((gs, g) => gs + g.users.length, 0), 0);
  const isDemoOrg  = (orgName: string) => orgName === "DEMO";
  const isDummyOrg = (orgName: string) => orgName === "Dummy";

  const DUMMY_GROUP_HEADER: Record<string, { bg: string; text: string }> = {
    "Finance":           { bg: "#14532d", text: "#ffffff" },
    "On-site Execution": { bg: "#1e3a5f", text: "#ffffff" },
    "Creative Design":   { bg: "#4c1d95", text: "#ffffff" },
    "Marketing":         { bg: "#7c2d12", text: "#ffffff" },
    "Council":           { bg: "#1c1917", text: "#ffffff" },
    "Technology":        { bg: "#0c4a6e", text: "#ffffff" },
    "Media Relations":   { bg: "#831843", text: "#ffffff" },
    "Students":          { bg: "#064e3b", text: "#ffffff" },
  };
  const DUMMY_GROUP_LIGHT: Record<string, { bg: string; text: string }> = {
    "Finance":           { bg: "#dcfce7", text: "#14532d" },
    "On-site Execution": { bg: "#dbeafe", text: "#1e3a5f" },
    "Creative Design":   { bg: "#ede9fe", text: "#4c1d95" },
    "Marketing":         { bg: "#ffedd5", text: "#7c2d12" },
    "Council":           { bg: "#e7e5e4", text: "#1c1917" },
    "Technology":        { bg: "#e0f2fe", text: "#0c4a6e" },
    "Media Relations":   { bg: "#fce7f3", text: "#831843" },
    "Students":          { bg: "#d1fae5", text: "#064e3b" },
  };

  function groupColor(orgName: string, groupName: string): { bg: string; text: string } {
    if (isDemoOrg(orgName))  return DEMO_DEPT_LIGHT[groupName]  ?? { bg: "#f0f0f0", text: "#333" };
    if (isDummyOrg(orgName)) return DUMMY_GROUP_LIGHT[groupName] ?? { bg: "#f0f0f0", text: "#333" };
    return SEED_GROUP_COLOR[groupName] ?? SEED_GROUP_COLOR.General;
  }

  function groupHeaderColor(orgName: string, groupName: string): { bg: string; text: string } {
    if (isDemoOrg(orgName))  return DEMO_DEPT_COLOR[groupName]   ?? { bg: "#333", text: "#fff" };
    if (isDummyOrg(orgName)) return DUMMY_GROUP_HEADER[groupName] ?? { bg: "#333", text: "#fff" };
    return { bg: "transparent", text: "#40665a" };
  }

  function userSubLabel(user: SeedUser, orgName: string): string {
    if (user.isStudent) return user.orgRole; // orgRole holds extra info for students
    if ((isDemoOrg(orgName) || isDummyOrg(orgName)) && user.deptRole) {
      return DEPT_ROLE_LABEL[user.deptRole] ?? user.deptRole;
    }
    return ORG_ROLE_LABEL[user.orgRole] ?? user.orgRole;
  }

  return (
    <div style={{ fontFamily: "'Space Grotesk', sans-serif", minHeight: "100vh", backgroundColor: "#f0f4f3", padding: "2rem" }}>

      <div style={{ maxWidth: 960, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "2.5rem", gap: "1rem", flexWrap: "wrap" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#40665a" }} />
              <span style={{ fontSize: "0.65rem", letterSpacing: "0.2em", textTransform: "uppercase", fontWeight: 700, color: "#576160" }}>
                Development Only
              </span>
            </div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#2a3434", margin: 0 }}>
              Account Switcher
            </h1>
            <p style={{ fontSize: "0.8rem", color: "#576160", marginTop: "0.25rem" }}>
              Sign in as any member to test the system from their perspective. {totalUsers} accounts across {orgs.length} orgs.
            </p>
          </div>

          {/* Current session */}
          <div style={{ backgroundColor: "#ffffff", borderRadius: "0.75rem", padding: "0.875rem 1.25rem", border: "1px solid rgba(169,180,179,0.2)", minWidth: 240, boxShadow: "0 2px 8px rgba(42,52,52,0.04)" }}>
            <p style={{ fontSize: "0.625rem", letterSpacing: "0.15em", textTransform: "uppercase", fontWeight: 700, color: "#576160", marginBottom: "0.375rem" }}>
              Signed in as
            </p>
            {status === "authenticated" && currentUserName ? (
              <>
                <p style={{ fontSize: "0.8rem", fontWeight: 600, color: "#2a3434", marginBottom: "0.625rem", lineHeight: 1.3 }}>
                  {currentUserName}
                </p>
                <button
                  onClick={handleSignOut}
                  disabled={loading === "__out"}
                  style={{ fontSize: "0.65rem", letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 700, color: "#9f403d", background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex", alignItems: "center", gap: "0.25rem", opacity: loading === "__out" ? 0.5 : 1 }}
                >
                  {loading === "__out" ? "Signing out…" : "↩ Sign out"}
                </button>
              </>
            ) : (
              <p style={{ fontSize: "0.8rem", color: "#a9b4b3" }}>Not signed in</p>
            )}
          </div>
        </div>

        {/* Org sections */}
        <div style={{ display: "flex", flexDirection: "column", gap: "3rem" }}>
          {orgs.map((org) => (
            <div key={org.orgName}>

              {/* Org header */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem" }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: isDemoOrg(org.orgName) ? "#9c59d1" : isDummyOrg(org.orgName) ? "#d97706" : "#40665a" }} />
                <h2 style={{ fontSize: "0.85rem", letterSpacing: "0.15em", textTransform: "uppercase", fontWeight: 700, color: "#2a3434", margin: 0 }}>
                  {org.orgName}
                </h2>
                <div style={{ flex: 1, height: 1, backgroundColor: "rgba(169,180,179,0.25)" }} />
                <span style={{ fontSize: "0.65rem", color: "#a9b4b3" }}>
                  {org.groups.reduce((s, g) => s + g.users.length, 0)} members
                </span>
              </div>

              {/* Groups within org */}
              <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                {org.groups.map(({ groupName, users }) => {
                  const headerClr = groupHeaderColor(org.orgName, groupName);
                  const cardClr   = groupColor(org.orgName, groupName);
                  const isDemo    = isDemoOrg(org.orgName);

                  return (
                    <div key={groupName}>
                      {/* Group label */}
                      <div style={{
                        display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem",
                        ...(isDemo ? { backgroundColor: headerClr.bg, borderRadius: "0.5rem", padding: "0.375rem 0.75rem" } : {}),
                      }}>
                        <span style={{ fontSize: "0.7rem", letterSpacing: "0.15em", textTransform: "uppercase", fontWeight: 700, color: isDemo ? headerClr.text : "#40665a" }}>
                          {groupName}
                        </span>
                        {!isDemo && <div style={{ flex: 1, height: 1, backgroundColor: "rgba(169,180,179,0.2)" }} />}
                      </div>

                      {/* Members grid */}
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "0.625rem" }}>
                        {users.map((user) => {
                          const isActive    = user.id === currentUserId;
                          const isLoading   = loading === user.id;
                          const displayName = user.name.split(" - ").pop() ?? user.name;
                          const subLabel    = userSubLabel(user, org.orgName);

                          return (
                            <button
                              key={user.id}
                              onClick={() => handleSignIn(user.email, user.id, user.isStudent)}
                              disabled={!!loading || isActive}
                              style={{
                                display: "flex", alignItems: "center", gap: "0.75rem",
                                padding: "0.75rem 1rem",
                                backgroundColor: isActive ? cardClr.bg : "#ffffff",
                                border: isActive ? `1.5px solid ${cardClr.bg}` : "1px solid rgba(169,180,179,0.2)",
                                borderRadius: "0.625rem",
                                cursor: isActive || !!loading ? "default" : "pointer",
                                textAlign: "left",
                                transition: "all 0.15s",
                                boxShadow: isActive ? `0 0 0 2px ${cardClr.bg}33` : "0 1px 3px rgba(42,52,52,0.04)",
                                opacity: loading && !isLoading && !isActive ? 0.5 : 1,
                              }}
                              onMouseEnter={(e) => {
                                if (!isActive && !loading) {
                                  e.currentTarget.style.backgroundColor = "#f8faf9";
                                  e.currentTarget.style.boxShadow = "0 2px 8px rgba(42,52,52,0.08)";
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!isActive) {
                                  e.currentTarget.style.backgroundColor = "#ffffff";
                                  e.currentTarget.style.boxShadow = "0 1px 3px rgba(42,52,52,0.04)";
                                }
                              }}
                            >
                              {/* Avatar */}
                              <div style={{
                                width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                                backgroundColor: isActive ? cardClr.bg : (isDemo ? DEMO_DEPT_COLOR[groupName]?.bg : isDummyOrg(org.orgName) ? DUMMY_GROUP_HEADER[groupName]?.bg : SEED_GROUP_COLOR[groupName]?.bg) ?? "#576160",
                                color: isActive ? cardClr.text : (isDemo ? DEMO_DEPT_COLOR[groupName]?.text : isDummyOrg(org.orgName) ? DUMMY_GROUP_HEADER[groupName]?.text : SEED_GROUP_COLOR[groupName]?.text) ?? "#fff",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: "0.75rem", fontWeight: 700,
                                border: `2px solid ${isActive ? cardClr.bg : "rgba(169,180,179,0.25)"}`,
                              }}>
                                {isLoading
                                  ? <span style={{ display: "block", width: 14, height: 14, border: "2px solid currentColor", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                                  : displayName.charAt(0).toUpperCase()
                                }
                              </div>

                              {/* Info */}
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <div style={{ fontSize: "0.75rem", fontWeight: 600, color: isActive ? "#0f2e22" : "#2a3434", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                  {displayName}
                                </div>
                                <div style={{ fontSize: "0.65rem", color: isActive ? "#40665a" : "#576160", marginTop: "0.125rem" }}>
                                  {subLabel}
                                </div>
                              </div>

                              {isActive && (
                                <span style={{ fontSize: "1rem", color: "#40665a", flexShrink: 0 }}>✓</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <p style={{ marginTop: "2.5rem", textAlign: "center", fontSize: "0.65rem", letterSpacing: "0.1em", color: "rgba(87,97,96,0.4)", textTransform: "uppercase" }}>
          This page is only accessible in NODE_ENV=development
        </p>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
