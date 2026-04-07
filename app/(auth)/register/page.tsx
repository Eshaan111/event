"use client";

import { useState, useEffect, Suspense } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

type Provider = "google" | "github" | "linkedin";

const ERROR_MESSAGES: Record<string, string> = {
  OAuthSignin:        "Could not start the sign-in flow. Try again.",
  OAuthCallback:      "Something went wrong during sign-in. Try again.",
  OAuthCreateAccount: "Could not create your account. Try again.",
  Callback:           "Sign-in callback failed. Try again.",
  Default:            "An unexpected error occurred.",
};

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterContent />
    </Suspense>
  );
}

function RegisterContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState<Provider | null>(null);
  const error = searchParams.get("error");
  const errorMessage = error ? (ERROR_MESSAGES[error] ?? ERROR_MESSAGES.Default) : null;

  // Already logged in → go to studio
  useEffect(() => {
    if (status === "authenticated") router.replace("/");
  }, [status, router]);

  async function handleOAuth(provider: Provider) {
    setLoading(provider);
    try {
      await signIn(provider, { callbackUrl: "/" });
    } catch {
      setLoading(null);
    }
  }

  if (status === "loading" || status === "authenticated") {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#faf9f8" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
          <Spinner color="#000" />
          <span style={{ fontFamily: "'Work Sans', sans-serif", fontSize: "0.75rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "#777777" }}>
            {status === "authenticated" ? "Redirecting…" : "Loading…"}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "'Work Sans', sans-serif", backgroundColor: "#faf9f8", color: "#1a1c1c", minHeight: "100vh" }}>

      {/* Glazing background */}
      <div style={{ position: "fixed", inset: 0, overflow: "hidden", zIndex: 0, pointerEvents: "none", userSelect: "none" }}>
        <span style={{ fontFamily: "'Newsreader', serif", fontStyle: "italic", fontWeight: 900, fontSize: "clamp(16rem,28vw,28rem)", lineHeight: 0.8, color: "#1a1c1c", opacity: 0.03, position: "absolute", top: "-4rem", left: "-5rem", letterSpacing: "-0.04em", whiteSpace: "nowrap" }}>Society</span>
        <span style={{ fontFamily: "'Newsreader', serif", fontWeight: 900, fontSize: "clamp(12rem,22vw,22rem)", lineHeight: 0.8, color: "#1a1c1c", opacity: 0.03, position: "absolute", bottom: "-4rem", right: "-4rem", letterSpacing: "-0.04em", whiteSpace: "nowrap" }}>Legacy</span>
      </div>
      <div style={{ position: "fixed", top: 0, right: 0, width: "33vw", height: "100vh", backgroundColor: "#f4f3f2", opacity: 0.5, zIndex: 0 }} />
      <div style={{ position: "fixed", top: "25%", right: "3rem", width: 1, height: "8rem", backgroundColor: "rgba(198,198,198,0.2)", zIndex: 0 }} />

      <main style={{ position: "relative", zIndex: 10, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "3rem 1.5rem" }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: "2rem", width: "100%", maxWidth: 1200 }}>

          {/* Left editorial */}
          <div style={{ flex: "1 1 380px", maxWidth: 560, display: "flex", flexDirection: "column", gap: "2rem", paddingRight: "3rem" }}>
            <header>
              <span style={{ fontFamily: "'Work Sans', sans-serif", fontSize: "0.7rem", letterSpacing: "0.3em", textTransform: "uppercase", color: "#777777", display: "block", marginBottom: "1rem" }}>Introduction</span>
              <h1 style={{ fontFamily: "'Newsreader', serif", fontStyle: "italic", fontSize: "clamp(3.5rem,7vw,6rem)", fontWeight: 500, lineHeight: 0.95, letterSpacing: "-0.03em", color: "#000000", margin: 0 }}>
                The Modern<br />Monograph.
              </h1>
            </header>
            <div style={{ maxWidth: 420, display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <p style={{ fontFamily: "'Newsreader', serif", fontSize: "1.35rem", lineHeight: 1.6, color: "#474747", margin: 0 }}>
                We believe that institutional success is an art form. ORGANIZATION provides the architectural foundation for visionary founders to build lasting structures of influence.
              </p>
              <p style={{ fontSize: "0.95rem", lineHeight: 1.8, color: "rgba(71,71,71,0.75)", margin: 0 }}>
                Our society serves as an editorial frame for your operations — providing a pristine space where strategy meets execution with quiet authority.
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginTop: "0.5rem" }}>
                <div style={{ height: 1, width: "3rem", backgroundColor: "#c6c6c6" }} />
                <span style={{ fontFamily: "'Newsreader', serif", fontStyle: "italic", fontSize: "0.875rem", color: "#777777" }}>Est. MMXXIV</span>
              </div>
            </div>
          </div>

          {/* Right: card */}
          <div style={{ flex: "0 0 auto", width: "100%", maxWidth: 480, display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div style={{ backgroundColor: "#ffffff", padding: "clamp(2rem,5vw,3.5rem)", borderRadius: "0.25rem", boxShadow: "0 40px 80px -20px rgba(26,28,28,0.08)" }}>

              <div style={{ marginBottom: "2.5rem" }}>
                <h2 style={{ fontFamily: "'Newsreader', serif", fontSize: "1.875rem", fontWeight: 700, marginBottom: "0.5rem", color: "#1a1c1c" }}>Create Account</h2>
                <p style={{ fontSize: "0.875rem", color: "#474747", margin: 0 }}>Begin your journey into the curated workspace.</p>
              </div>

              {/* Error banner */}
              {errorMessage && (
                <div style={{ backgroundColor: "rgba(186,26,26,0.06)", border: "1px solid rgba(186,26,26,0.2)", borderRadius: "0.25rem", padding: "0.875rem 1rem", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: "1.125rem", color: "#ba1a1a", flexShrink: 0 }}>error</span>
                  <span style={{ fontSize: "0.8rem", color: "#ba1a1a", fontWeight: 500 }}>{errorMessage}</span>
                </div>
              )}

              {/* OAuth buttons */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "2rem" }}>
                <OAuthButton provider="google" label="Continue with Google" loading={loading === "google"} onClick={() => handleOAuth("google")}>
                  <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuD-nF-hm84kn_OjGvrLnqQnHKBEt69e4d11CWvB9XfOHFhMZ1v95OLoOkGUTCogLgzzF2gmkZrYWRaZM47PZMspyhsUQ2tZsQTE2vpr2OPluIEulieGTQ3yNGzIcrjPXQtgS9oh89y0nOQkz342zY9lRqPrz3ru_r1HURePVNPP0NS3s3xEWbqOJu-VDlGcF9oRLFy2OsDy5z7hya0wGw-nFtQk5IqUZ6EllE-I8YzAWiTk6gJZkHzXkfxS__7o7_EMemkVVGDwJQ" alt="Google" style={{ width: 18, height: 18, opacity: 0.85 }} />
                </OAuthButton>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                  <OAuthButton provider="github" label="GitHub" loading={loading === "github"} onClick={() => handleOAuth("github")} small>
                    <GitHubIcon />
                  </OAuthButton>
                  <OAuthButton provider="linkedin" label="LinkedIn" loading={loading === "linkedin"} onClick={() => handleOAuth("linkedin")} small>
                    <LinkedInIcon />
                  </OAuthButton>
                </div>
              </div>

              {/* Divider */}
              <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "2rem" }}>
                <div style={{ flex: 1, height: 1, backgroundColor: "rgba(198,198,198,0.25)" }} />
                <span style={{ fontSize: "0.625rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "#777777", whiteSpace: "nowrap" }}>Or register manually</span>
                <div style={{ flex: 1, height: 1, backgroundColor: "rgba(198,198,198,0.25)" }} />
              </div>

              {/* Manual form — fields only, submit via primary OAuth */}
              <form style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }} onSubmit={(e) => e.preventDefault()}>
                {[
                  { id: "name",    label: "Full Name",     placeholder: "E.g. Alexander Hamilton", type: "text" },
                  { id: "email",   label: "Email Address", placeholder: "name@organization.com",   type: "email" },
                  { id: "phone",   label: "Phone Number",  placeholder: "+1 (555) 000-0000",        type: "tel" },
                  { id: "company", label: "Company Name",  placeholder: "The Monograph Agency",     type: "text" },
                  { id: "size",    label: "Company Size",  placeholder: "E.g. 11–50 employees",     type: "text" },
                ].map((f) => (
                  <div key={f.id} style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                    <label htmlFor={f.id} style={labelStyle}>{f.label}</label>
                    <input id={f.id} name={f.id} type={f.type} placeholder={f.placeholder} style={inputStyle}
                      onFocus={(e) => { e.currentTarget.style.borderBottomColor = "#000000"; }}
                      onBlur={(e)  => { e.currentTarget.style.borderBottomColor = "rgba(198,198,198,0.5)"; }}
                    />
                  </div>
                ))}

                <div style={{ paddingTop: "0.5rem" }}>
                  <button
                    type="button"
                    onClick={() => handleOAuth("google")}
                    disabled={!!loading}
                    style={{ width: "100%", backgroundColor: "#000000", color: "#e2e2e2", padding: "1rem", border: "none", borderRadius: "0.375rem", fontFamily: "'Work Sans', sans-serif", fontSize: "0.875rem", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.75rem" }}
                    onMouseEnter={(e) => { if (!loading) e.currentTarget.style.backgroundColor = "#3b3b3b"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#000000"; }}
                  >
                    {loading ? <Spinner color="#e2e2e2" /> : null}
                    Apply for Access
                  </button>
                </div>
              </form>

              <p style={{ marginTop: "2rem", textAlign: "center", fontSize: "0.75rem", color: "#777777", lineHeight: 1.6 }}>
                By proceeding, you agree to the{" "}
                <a href="#" style={{ textDecoration: "underline", color: "#777777" }}>Charter of Conduct</a> and our{" "}
                <a href="#" style={{ textDecoration: "underline", color: "#777777" }}>Privacy Governance</a>.
              </p>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 1rem" }}>
              <a href="/" style={{ fontSize: "0.75rem", color: "#777777", display: "flex", alignItems: "center", gap: "0.5rem", textDecoration: "none" }}>
                <span className="material-symbols-outlined" style={{ fontSize: "1rem" }}>arrow_back</span>
                Return to Lobby
              </a>
              <span style={{ fontSize: "0.75rem", color: "rgba(119,119,119,0.5)" }}>Version 2.0.4 — Alpha</span>
            </div>
          </div>
        </div>
      </main>

      <aside style={{ position: "fixed", bottom: "3rem", left: "3rem", maxWidth: "18rem", pointerEvents: "none", zIndex: 1 }}>
        <blockquote style={{ fontFamily: "'Newsreader', serif", fontStyle: "italic", color: "rgba(71,71,71,0.35)", fontSize: "1.05rem", lineHeight: 1.5, margin: 0 }}>
          "Design is not just what it looks like and feels like. Design is how it works."
        </blockquote>
      </aside>
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────────── */

function OAuthButton({ provider, label, loading, onClick, children, small }: {
  provider: string; label: string; loading: boolean; onClick: () => void; children: React.ReactNode; small?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      style={{
        display: "flex", alignItems: "center", justifyContent: "center", gap: "0.625rem",
        padding: small ? "0.625rem 0.75rem" : "0.75rem 1rem",
        backgroundColor: loading ? "#f4f3f2" : "transparent",
        border: "1px solid rgba(198,198,198,0.45)",
        borderRadius: "0.375rem", cursor: loading ? "not-allowed" : "pointer",
        fontFamily: "'Work Sans', sans-serif", color: "#1a1c1c",
        fontSize: "0.875rem", fontWeight: 500, width: "100%",
        transition: "background-color 0.15s", opacity: loading ? 0.8 : 1,
      }}
      onMouseEnter={(e) => { if (!loading) e.currentTarget.style.backgroundColor = "#f4f3f2"; }}
      onMouseLeave={(e) => { if (!loading) e.currentTarget.style.backgroundColor = "transparent"; }}
    >
      {loading ? <Spinner color="#474747" /> : children}
      {label}
    </button>
  );
}

function Spinner({ color }: { color: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ animation: "spin 0.8s linear infinite", flexShrink: 0 }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <circle cx="8" cy="8" r="6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeDasharray="28" strokeDashoffset="10" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12c0-6.63-5.37-12-12-12"/>
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#0A66C2">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: "0.625rem", letterSpacing: "0.2em", textTransform: "uppercase", fontWeight: 700, color: "#777777",
};

const inputStyle: React.CSSProperties = {
  width: "100%", backgroundColor: "transparent", border: "none",
  borderBottom: "1px solid rgba(198,198,198,0.5)", padding: "0.25rem 0",
  fontSize: "1rem", color: "#1a1c1c", outline: "none",
  fontFamily: "'Work Sans', sans-serif", transition: "border-bottom-color 0.2s",
};
