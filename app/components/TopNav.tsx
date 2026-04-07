"use client";

import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import Image from "next/image";
import { useState } from "react";

const pageTitles: Record<string, string> = {
  "/":          "Dashboard",
  "/proposals": "Proposal Gallery",
  "/queue":     "Judge's Queue",
  "/events":    "Active Events",
  "/archive":   "Archive",
  "/meetings":  "Meeting Hub",
  "/calendar":  "Calendar",
  "/settings":  "Settings",
};

export default function TopNav() {
  const pathname  = usePathname();
  const title     = pageTitles[pathname] ?? "Proposal Gallery";
  const { data: session, status } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  const user    = session?.user;
  const initial = user?.name?.charAt(0).toUpperCase() ?? user?.email?.charAt(0).toUpperCase() ?? "?";

  return (
    <header
      className="fixed top-0 right-0 left-0 md:left-64 h-20 px-10 flex justify-between items-center z-40"
      style={{ backgroundColor: "rgba(242,245,244,0.9)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", borderBottom: "1px solid rgba(155,168,167,0.3)" }}
    >
      {/* Page title */}
      <h2 className="font-headline text-2xl font-bold tracking-tighter" style={{ color: "#1a1f1f" }}>
        {title}
      </h2>

      {/* Right */}
      <div className="flex items-center gap-8">
        {/* Search */}
        <div className="relative hidden lg:block">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2" style={{ color: "rgba(112,121,119,0.8)", fontSize: "1.125rem" }}>search</span>
          <input
            type="text"
            placeholder="Search architectural projects..."
            className="rounded-full pl-12 pr-6 py-2.5 text-sm w-72 outline-none"
            style={{ backgroundColor: "#e9efee", border: "1px solid rgba(155,168,167,0.25)", color: "#1a1f1f" }}
          />
        </div>

        <div className="flex items-center gap-4">
          {/* Notifications */}
          <button className="w-10 h-10 flex items-center justify-center rounded-full relative" style={{ color: "#2d5349" }} aria-label="Notifications">
            <span className="material-symbols-outlined">notifications</span>
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full" style={{ backgroundColor: "#ba1a1a", border: "2px solid #f2f5f4" }} />
          </button>

          {/* Avatar + dropdown */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="w-10 h-10 rounded-full overflow-hidden focus:outline-none"
              style={{ border: "2px solid #2d5349", boxShadow: "0 0 0 4px rgba(45,83,73,0.1)" }}
              aria-label="User menu"
            >
              {status === "loading" ? (
                <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: "#e9efee" }}>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ animation: "spin 0.8s linear infinite" }}>
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                    <circle cx="8" cy="8" r="6" stroke="#9ba8a7" strokeWidth="2" strokeDasharray="28" strokeDashoffset="10" />
                  </svg>
                </div>
              ) : user?.image ? (
                <Image src={user.image} alt={user.name ?? "User"} width={40} height={40} className="object-cover w-full h-full" />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-headline font-bold text-sm" style={{ backgroundColor: "#c2ebdc", color: "#2d5349" }}>
                  {initial}
                </div>
              )}
            </button>

            {/* Dropdown */}
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                <div
                  className="absolute right-0 mt-2 z-50 rounded-2xl overflow-hidden"
                  style={{ minWidth: 220, backgroundColor: "#ffffff", border: "1px solid rgba(155,168,167,0.25)", boxShadow: "0 16px 48px rgba(0,0,0,0.08)" }}
                >
                  {user && (
                    <div className="px-5 py-4" style={{ borderBottom: "1px solid rgba(155,168,167,0.15)" }}>
                      <p className="font-headline font-bold text-sm truncate" style={{ color: "#1a1f1f" }}>{user.name ?? "Member"}</p>
                      <p className="font-label text-[10px] uppercase tracking-wider truncate mt-0.5" style={{ color: "#707977" }}>{user.email}</p>
                    </div>
                  )}
                  <div className="py-2">
                    <DropdownItem icon="person" label="Profile" onClick={() => setMenuOpen(false)} />
                    <DropdownItem icon="settings" label="Settings" onClick={() => setMenuOpen(false)} />
                    <DropdownItem icon="help" label="Help Center" onClick={() => setMenuOpen(false)} />
                  </div>
                  <div className="py-2" style={{ borderTop: "1px solid rgba(155,168,167,0.15)" }}>
                    <button
                      onClick={() => { setMenuOpen(false); signOut({ callbackUrl: "/register" }); }}
                      className="w-full flex items-center gap-3 px-5 py-2.5 text-left transition-colors hover:bg-red-50"
                      style={{ color: "#ba1a1a" }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: "1.125rem" }}>logout</span>
                      <span className="font-label font-bold text-[11px] uppercase tracking-widest">Sign Out</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

function DropdownItem({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-5 py-2.5 text-left transition-colors"
      style={{ color: "#1a1f1f" }}
      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#f2f5f4"; }}
      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: "1.125rem", color: "#707977" }}>{icon}</span>
      <span className="font-label font-bold text-[11px] uppercase tracking-widest">{icon === "settings" || icon === "help" ? label : label}</span>
    </button>
  );
}
