"use client";

import { useState, useEffect, Suspense } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

type Provider = "google" | "github" | "linkedin";

const CLEARANCE_LABELS: Record<string, { label: string; desc: string }> = {
  OMEGA: { label: "Omega",  desc: "Full system access"         },
  ALPHA: { label: "Alpha",  desc: "Department admin"           },
  BETA:  { label: "Beta",   desc: "Creator — proposals/events" },
  GAMMA: { label: "Gamma",  desc: "Contributor"                },
  DELTA: { label: "Delta",  desc: "Read-only"                  },
};

const ROLE_LABELS: Record<string, string> = {
  HEAD: "Department Head", LEAD: "Lead", MEMBER: "Member", OBSERVER: "Observer",
};

type InviteInfo = {
  departmentName: string;
  role: string;
  clearance: string;
  inviteeName: string | null;
  expiresAt: string;
  valid: boolean;
  reason?: "expired" | "used" | "notfound";
};

export default function InvitePage() {
  return (
    <Suspense>
      <InviteContent />
    </Suspense>
  );
}

function InviteContent() {
  const { status } = useSession();
  const router     = useRouter();
  const params     = useSearchParams();
  const token      = params.get("token");

  const [loading, setLoading] = useState<Provider | null>(null);
  const [invite, setInvite]   = useState<InviteInfo | null>(null);
  const [fetching, setFetching] = useState(!!token);

  // Fetch invite details
  useEffect(() => {
    if (!token) return;
    fetch(`/api/invite/${token}`)
      .then((r) => r.json())
      .then((data) => setInvite(data))
      .catch(() => setInvite({ valid: false, reason: "notfound", departmentName: "", role: "", clearance: "", inviteeName: null, expiresAt: "" }))
      .finally(() => setFetching(false));
  }, [token]);

  async function handleOAuth(provider: Provider) {
    setLoading(provider);
    const callbackUrl = token ? `/invite/redeem?token=${token}` : "/";
    try {
      await signIn(provider, { callbackUrl });
    } catch {
      setLoading(null);
    }
  }

  if (status === "loading" || fetching) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#f8faf9" }}>
        <Spinner color="#40665a" size={28} />
      </div>
    );
  }

  const clearanceInfo = invite ? CLEARANCE_LABELS[invite.clearance] : null;
  const roleLabel     = invite ? (ROLE_LABELS[invite.role] ?? invite.role) : null;
  const isInvalid     = invite && !invite.valid;

  return (
    <div style={{ fontFamily: "'Manrope', sans-serif", backgroundColor: "#f8faf9", color: "#2a3434", minHeight: "100vh" }}>
      {/* Glazing */}
      <div style={{ position: "fixed", inset: 0, overflow: "hidden", zIndex: 0, pointerEvents: "none" }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(#a9b4b3 1px, transparent 1px)", backgroundSize: "24px 24px", opacity: 0.1 }} />
        <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: "clamp(14rem,28vw,28rem)", lineHeight: 0.85, color: "#2a3434", opacity: 0.02, position: "absolute", top: "-3rem", left: "-6rem", letterSpacing: "-0.05em", userSelect: "none" }}>INVITE</span>
        <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: "clamp(10rem,20vw,20rem)", lineHeight: 0.85, color: "#2a3434", opacity: 0.015, position: "absolute", bottom: "-2rem", right: "-4rem", letterSpacing: "-0.05em", userSelect: "none" }}>SOCIETY</span>
      </div>

      <main style={{ position: "relative", zIndex: 10, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "4rem 1.5rem" }}>
        <div style={{ width: "100%", maxWidth: 540 }}>

          {/* Brand */}
          <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
            <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: "1.25rem", letterSpacing: "-0.02em", color: "#40665a", margin: "0 0 0.25rem" }}>EVENT SOCIETY</h1>
            <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "0.625rem", letterSpacing: "0.25em", textTransform: "uppercase", color: "rgba(87,97,96,0.6)", margin: 0 }}>New Member Affiliation</p>
          </div>

          <div style={{ backgroundColor: "#ffffff", borderRadius: "24px", border: "1px solid rgba(169,180,179,0.2)", overflow: "hidden", boxShadow: "0 20px 48px rgba(42,52,52,0.06)" }}>

            {/* Invalid invite */}
            {isInvalid ? (
              <div style={{ padding: "3rem", textAlign: "center" }}>
                <span className="material-symbols-outlined" style={{ fontSize: "3rem", color: "#9f403d", display: "block", marginBottom: "1rem" }}>
                  {invite.reason === "used" ? "check_circle" : "link_off"}
                </span>
                <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "1.5rem", fontWeight: 700, margin: "0 0 0.75rem" }}>
                  {invite.reason === "used" ? "Already Redeemed" : invite.reason === "expired" ? "Invitation Expired" : "Invalid Invitation"}
                </h2>
                <p style={{ fontSize: "0.875rem", color: "#576160", margin: "0 0 2rem", lineHeight: 1.7 }}>
                  {invite.reason === "used"
                    ? "This invitation has already been used."
                    : invite.reason === "expired"
                    ? "This invitation link has expired. Please ask to be re-invited."
                    : "This invitation link is not valid. It may have been revoked."}
                </p>
                <a href="/register" style={{ display: "inline-block", padding: "0.875rem 2rem", borderRadius: "12px", backgroundColor: "#40665a", color: "#defff2", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: "0.75rem", letterSpacing: "0.1em", textTransform: "uppercase", textDecoration: "none" }}>
                  Go to Sign In
                </a>
              </div>
            ) : (
              <>
                {/* Header strip */}
                <div style={{ background: "linear-gradient(135deg, #40665a, #2d5349)", padding: "2rem 2.5rem" }}>
                  <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "0.625rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(222,255,242,0.6)", margin: "0 0 0.5rem" }}>
                    You have been invited to join
                  </p>
                  <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: "1.75rem", letterSpacing: "-0.02em", color: "#defff2", margin: 0 }}>
                    {invite?.departmentName ?? "Event Society"}
                  </h2>
                </div>

                <div style={{ padding: "2rem 2.5rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>

                  {/* Permissions card */}
                  {invite && (
                    <div style={{ backgroundColor: "#f0f4f3", borderRadius: "16px", padding: "1.25rem 1.5rem", display: "flex", flexDirection: "column", gap: "0.875rem" }}>
                      <InfoRow label="Role" value={roleLabel!} />
                      <InfoRow
                        label="Clearance"
                        value={
                          <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "2px" }}>
                            <span style={{ fontWeight: 700 }}>{clearanceInfo?.label}</span>
                            <span style={{ fontSize: "11px", color: "#576160" }}>{clearanceInfo?.desc}</span>
                          </span>
                        }
                      />
                      <InfoRow label="Expires" value={new Date(invite.expiresAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} />
                    </div>
                  )}

                  {/* Sign-in CTAs */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "0.625rem", letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(87,97,96,0.6)", margin: 0 }}>
                      Sign in to accept
                    </p>
                    <OAuthButton provider="google"   label="Continue with Google"   loading={loading === "google"}   onClick={() => handleOAuth("google")}>
                      <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuD-nF-hm84kn_OjGvrLnqQnHKBEt69e4d11CWvB9XfOHFhMZ1v95OLoOkGUTCogLgzzF2gmkZrYWRaZM47PZMspyhsUQ2tZsQTE2vpr2OPluIEulieGTQ3yNGzIcrjPXQtgS9oh89y0nOQkz342zY9lRqPrz3ru_r1HURePVNPP0NS3s3xEWbqOJu-VDlGcF9oRLFy2OsDy5z7hya0wGw-nFtQk5IqUZ6EllE-I8YzAWiTk6gJZkHzXkfxS__7o7_EMemkVVGDwJQ" alt="Google" style={{ width: 16, height: 16, opacity: 0.85 }} />
                    </OAuthButton>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                      <OAuthButton provider="github"   label="GitHub"   loading={loading === "github"}   onClick={() => handleOAuth("github")}   small><GitHubIcon /></OAuthButton>
                      <OAuthButton provider="linkedin" label="LinkedIn" loading={loading === "linkedin"} onClick={() => handleOAuth("linkedin")} small><LinkedInIcon /></OAuthButton>
                    </div>
                  </div>

                  <p style={{ margin: 0, textAlign: "center", fontSize: "11px", color: "rgba(87,97,96,0.5)", lineHeight: 1.6 }}>
                    By accepting, you agree to the{" "}
                    <a href="#" style={{ color: "#40665a", textDecoration: "underline" }}>Code of Conduct</a>.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

/* ── Sub-components ──────────────────────────────────────────── */

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "0.875rem", borderBottom: "1px solid rgba(169,180,179,0.12)" }}>
      <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.15em", fontWeight: 700, color: "#576160" }}>{label}</span>
      <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "13px", fontWeight: 600, color: "#2a3434" }}>{value}</span>
    </div>
  );
}

function OAuthButton({ provider, label, loading, onClick, children, small }: {
  provider: string; label: string; loading: boolean; onClick: () => void; children: React.ReactNode; small?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.625rem", padding: small ? "0.625rem" : "0.75rem 1rem", backgroundColor: loading ? "#f0f4f3" : "transparent", border: "1px solid rgba(169,180,179,0.3)", borderRadius: "12px", cursor: loading ? "not-allowed" : "pointer", fontFamily: "'Space Grotesk', sans-serif", color: "#2a3434", fontSize: "0.8rem", fontWeight: 600, width: "100%", transition: "background-color 0.15s", opacity: loading ? 0.8 : 1 }}
    >
      {loading ? <Spinner color="#576160" size={14} /> : children}
      {label}
    </button>
  );
}

function Spinner({ color, size = 16 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ animation: "spin 0.8s linear infinite", flexShrink: 0 }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <circle cx="8" cy="8" r="6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeDasharray="28" strokeDashoffset="10" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12c0-6.63-5.37-12-12-12"/>
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="#0A66C2">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  );
}
