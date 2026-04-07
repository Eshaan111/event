"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { useState } from "react";

export type SeedUser = {
  id: string;
  name: string;
  email: string;
  deptName: string;
  deptRole: string;
  clearance: string;
};

const ROLE_COLOR: Record<string, string> = {
  HEAD:     "#c2ebdc",
  LEAD:     "#dae5e3",
  MEMBER:   "#e9efee",
  OBSERVER: "#f0f4f3",
};

const CLEARANCE_COLOR: Record<string, { bg: string; text: string }> = {
  OMEGA: { bg: "#2d5349", text: "#ffffff" },
  ALPHA: { bg: "#40665a", text: "#ffffff" },
  BETA:  { bg: "#c2ebdc", text: "#0f2e22" },
  GAMMA: { bg: "#dae5e3", text: "#2a3434" },
  DELTA: { bg: "#e9efee", text: "#576160" },
};

export default function DevSwitcher({
  usersByDept,
  currentUserId,
  currentUserName,
}: {
  usersByDept: { deptName: string; users: SeedUser[] }[];
  currentUserId: string | null;
  currentUserName: string | null;
}) {
  const { status } = useSession();
  const [loading, setLoading] = useState<string | null>(null);

  async function handleSignIn(email: string, userId: string) {
    setLoading(userId);
    await signIn("dev-seed", { email, callbackUrl: "/" });
    setLoading(null);
  }

  async function handleSignOut() {
    setLoading("__out");
    await signOut({ callbackUrl: "/dev" });
  }

  return (
    <div style={{ fontFamily: "'Space Grotesk', sans-serif", minHeight: "100vh", backgroundColor: "#f0f4f3", padding: "2rem" }}>

      {/* Header */}
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
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
              Sign in as any seed member to test the approval flow from their perspective.
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

        {/* Legend */}
        <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", marginBottom: "2rem", flexWrap: "wrap" }}>
          {Object.entries(CLEARANCE_COLOR).map(([k, v]) => (
            <div key={k} style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: v.bg, border: "1px solid rgba(0,0,0,0.1)" }} />
              <span style={{ fontSize: "0.65rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "#576160" }}>{k}</span>
            </div>
          ))}
          <span style={{ fontSize: "0.65rem", color: "#a9b4b3", marginLeft: "auto" }}>
            {usersByDept.reduce((s, d) => s + d.users.length, 0)} members across {usersByDept.length} departments
          </span>
        </div>

        {/* Departments */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {usersByDept.map(({ deptName, users }) => (
            <div key={deptName}>
              {/* Dept label */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
                <span style={{ fontSize: "0.7rem", letterSpacing: "0.15em", textTransform: "uppercase", fontWeight: 700, color: "#40665a" }}>
                  {deptName}
                </span>
                <div style={{ flex: 1, height: 1, backgroundColor: "rgba(169,180,179,0.2)" }} />
              </div>

              {/* Members grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "0.625rem" }}>
                {users.map((user) => {
                  const clr = CLEARANCE_COLOR[user.clearance] ?? CLEARANCE_COLOR.GAMMA;
                  const isActive = user.id === currentUserId;
                  const isLoading = loading === user.id;

                  return (
                    <button
                      key={user.id}
                      onClick={() => handleSignIn(user.email, user.id)}
                      disabled={!!loading || isActive}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                        padding: "0.75rem 1rem",
                        backgroundColor: isActive ? "#c2ebdc" : "#ffffff",
                        border: isActive ? "1.5px solid #40665a" : "1px solid rgba(169,180,179,0.2)",
                        borderRadius: "0.625rem",
                        cursor: isActive || !!loading ? "default" : "pointer",
                        textAlign: "left",
                        transition: "all 0.15s",
                        boxShadow: isActive ? "0 0 0 2px rgba(64,102,90,0.15)" : "0 1px 3px rgba(42,52,52,0.04)",
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
                        backgroundColor: clr.bg, color: clr.text,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "0.75rem", fontWeight: 700,
                        border: `2px solid ${isActive ? "#40665a" : "rgba(169,180,179,0.25)"}`,
                      }}>
                        {isLoading
                          ? <span style={{ display: "block", width: 14, height: 14, border: "2px solid currentColor", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                          : user.name.split(" - ").pop()?.charAt(0).toUpperCase()
                        }
                      </div>

                      {/* Info */}
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: "0.75rem", fontWeight: 600, color: isActive ? "#0f2e22" : "#2a3434", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {/* Show just "First Last" */}
                          {user.name.split(" - ").pop()}
                        </div>
                        <div style={{ fontSize: "0.65rem", color: isActive ? "#40665a" : "#576160", display: "flex", alignItems: "center", gap: "0.375rem", marginTop: "0.125rem" }}>
                          <span style={{
                            display: "inline-block", padding: "0.1rem 0.35rem", borderRadius: "0.25rem",
                            backgroundColor: ROLE_COLOR[user.deptRole] ?? "#e9efee",
                            fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
                            color: "#40665a",
                          }}>
                            {user.deptRole}
                          </span>
                          <span style={{ opacity: 0.6 }}>{user.clearance}</span>
                        </div>
                      </div>

                      {/* Active checkmark */}
                      {isActive && (
                        <span style={{ fontSize: "1rem", color: "#40665a", flexShrink: 0 }}>✓</span>
                      )}
                    </button>
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
