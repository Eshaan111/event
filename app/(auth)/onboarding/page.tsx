"use client";

import { useActionState } from "react";
import { createOrganization } from "./actions";
import { useSession } from "next-auth/react";

export default function OnboardingPage() {
  const { data: session } = useSession();
  const [state, formAction, pending] = useActionState(createOrganization, null);

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
            Create your organisation
          </h1>
          <p style={{ fontSize: "0.875rem", color: "#576160", margin: 0, lineHeight: 1.6 }}>
            {session?.user?.name ? `Welcome, ${session.user.name.split(" ")[0]}. ` : ""}
            Give your studio a name to get started.
          </p>
        </div>

        {/* Form */}
        <form action={formAction}>
          <div style={{ marginBottom: "1.5rem" }}>
            <label style={{ display: "block", fontSize: "0.7rem", letterSpacing: "0.15em", textTransform: "uppercase", fontWeight: 700, color: "#576160", marginBottom: "0.5rem" }}>
              Organisation Name
            </label>
            <input
              name="name"
              type="text"
              required
              autoFocus
              placeholder="e.g. Meridian Creative Studio"
              style={{ width: "100%", borderRadius: "0.75rem", padding: "1rem 1.25rem", fontSize: "0.9rem", fontFamily: "inherit", outline: "none", backgroundColor: "#ffffff", border: "1px solid rgba(169,180,179,0.3)", color: "#2a3434", boxSizing: "border-box" }}
            />
          </div>

          {state?.error && (
            <p style={{ fontSize: "0.8rem", color: "#9f403d", marginBottom: "1rem" }}>{state.error}</p>
          )}

          <button
            type="submit"
            disabled={pending}
            style={{ width: "100%", padding: "1rem", borderRadius: "0.75rem", border: "none", background: "linear-gradient(135deg, #40665a, #345a4e)", color: "#defff2", fontSize: "0.75rem", letterSpacing: "0.15em", textTransform: "uppercase", fontWeight: 700, cursor: pending ? "not-allowed" : "pointer", opacity: pending ? 0.6 : 1, fontFamily: "inherit" }}
          >
            {pending ? "Creating…" : "Initialize Studio"}
          </button>
        </form>

      </div>
    </div>
  );
}
