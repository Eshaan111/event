"use client";

import { useActionState, useState } from "react";
import { createOrganization, joinOrganization } from "./actions";
import { useSession } from "next-auth/react";

const inputStyle: React.CSSProperties = {
  width: "100%",
  borderRadius: "0.75rem",
  padding: "1rem 1.25rem",
  fontSize: "0.9rem",
  fontFamily: "inherit",
  outline: "none",
  backgroundColor: "#ffffff",
  border: "1px solid rgba(169,180,179,0.3)",
  color: "#2a3434",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.7rem",
  letterSpacing: "0.15em",
  textTransform: "uppercase",
  fontWeight: 700,
  color: "#576160",
  marginBottom: "0.5rem",
};

export default function OnboardingPage() {
  const { data: session } = useSession();
  const [mode, setMode] = useState<"create" | "join">("join");

  const [createState, createAction, createPending] = useActionState(createOrganization, null);
  const [joinState,   joinAction,   joinPending]   = useActionState(joinOrganization,   null);

  const pending = createPending || joinPending;

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#f0f4f3", fontFamily: "'Space Grotesk', sans-serif", padding: "2rem" }}>
      <div style={{ width: "100%", maxWidth: 480 }}>

        {/* Header */}
        <div style={{ marginBottom: "2.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#40665a" }} />
            <span style={{ fontSize: "0.65rem", letterSpacing: "0.2em", textTransform: "uppercase", fontWeight: 700, color: "#576160" }}>
              Aetheric Studio
            </span>
          </div>
          <h1 style={{ fontSize: "2rem", fontWeight: 700, color: "#2a3434", margin: "0 0 0.5rem" }}>
            {mode === "join" ? "Join your organisation" : "Create an organisation"}
          </h1>
          <p style={{ fontSize: "0.875rem", color: "#576160", margin: 0, lineHeight: 1.6 }}>
            {session?.user?.name ? `Welcome, ${session.user.name.split(" ")[0]}. ` : ""}
            {mode === "join"
              ? "Enter the token provided by your administrator."
              : "Set up a new organisation. You'll be the president."}
          </p>
        </div>

        {/* Mode toggle */}
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "2rem", backgroundColor: "#e9efee", borderRadius: "0.75rem", padding: "0.25rem" }}>
          {(["join", "create"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              style={{
                flex: 1,
                padding: "0.6rem",
                borderRadius: "0.6rem",
                border: "none",
                fontFamily: "inherit",
                fontSize: "0.7rem",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.15s",
                backgroundColor: mode === m ? "#ffffff" : "transparent",
                color: mode === m ? "#2a3434" : "#576160",
                boxShadow: mode === m ? "0 1px 4px rgba(42,52,52,0.08)" : "none",
              }}
            >
              {m === "join" ? "Join Existing" : "Create New"}
            </button>
          ))}
        </div>

        {/* Join form */}
        {mode === "join" && (
          <form action={joinAction}>
            <div style={{ marginBottom: "1.5rem" }}>
              <label style={labelStyle}>Organisation Token</label>
              <input
                name="token"
                type="text"
                required
                autoFocus
                placeholder="Paste your organisation token here"
                style={inputStyle}
              />
            </div>
            {joinState?.error && (
              <p style={{ fontSize: "0.8rem", color: "#9f403d", marginBottom: "1rem" }}>{joinState.error}</p>
            )}
            <button
              type="submit"
              disabled={pending}
              style={{ width: "100%", padding: "1rem", borderRadius: "0.75rem", border: "none", background: "linear-gradient(135deg, #40665a, #345a4e)", color: "#defff2", fontSize: "0.75rem", letterSpacing: "0.15em", textTransform: "uppercase", fontWeight: 700, cursor: pending ? "not-allowed" : "pointer", opacity: pending ? 0.6 : 1, fontFamily: "inherit" }}
            >
              {joinPending ? "Joining…" : "Join Organisation"}
            </button>
          </form>
        )}

        {/* Create form */}
        {mode === "create" && (
          <form action={createAction}>
            <div style={{ marginBottom: "1.5rem" }}>
              <label style={labelStyle}>Organisation Name</label>
              <input
                name="name"
                type="text"
                required
                autoFocus
                placeholder="e.g. Meridian Creative Studio"
                style={inputStyle}
              />
            </div>
            {createState?.error && (
              <p style={{ fontSize: "0.8rem", color: "#9f403d", marginBottom: "1rem" }}>{createState.error}</p>
            )}
            <button
              type="submit"
              disabled={pending}
              style={{ width: "100%", padding: "1rem", borderRadius: "0.75rem", border: "none", background: "linear-gradient(135deg, #40665a, #345a4e)", color: "#defff2", fontSize: "0.75rem", letterSpacing: "0.15em", textTransform: "uppercase", fontWeight: 700, cursor: pending ? "not-allowed" : "pointer", opacity: pending ? 0.6 : 1, fontFamily: "inherit" }}
            >
              {createPending ? "Creating…" : "Initialize Studio"}
            </button>
          </form>
        )}

        {/* Student portal entry */}
        <div style={{ marginTop: "2rem", paddingTop: "2rem", borderTop: "1px solid rgba(169,180,179,0.2)", textAlign: "center" }}>
          <p style={{ fontSize: "0.8rem", color: "#576160", marginBottom: "0.75rem" }}>
            Are you a student submitting an event proposal?
          </p>
          <a
            href="/onboarding/student"
            style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#40665a", textDecoration: "none" }}
          >
            Go to Student Portal →
          </a>
        </div>

      </div>
    </div>
  );
}
