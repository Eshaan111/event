"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const mainNav = [
  { href: "/", label: "Dashboard", icon: "grid_view" },
  { href: "/proposals", label: "All Proposals", icon: "description" },
  { href: "/events", label: "Active Events", icon: "event_available" },
  { href: "/departments", label: "Departments", icon: "account_tree" },
  { href: "/members", label: "Members", icon: "group" },
  { href: "/proposals/archived", label: "Archive", icon: "inventory_2" },
];

export default function SideNav() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/"
      ? pathname === "/"
      : pathname === href || pathname.startsWith(href + "/");

  return (
    <aside
      className="fixed left-0 top-0 h-screen w-64 hidden md:flex flex-col p-6 gap-2 z-50"
      style={{
        backgroundColor: "#e9efee",
        borderRight: "1px solid rgba(155,168,167,0.3)",
      }}
    >
      {/* Brand */}
      <div className="mb-8 px-2 flex flex-col gap-3">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{
            backgroundColor: "#2d5349",
            boxShadow: "0 4px 16px rgba(45,83,73,0.25)",
          }}
        >
          <span
            className="material-symbols-outlined"
            style={{ color: "#ffffff", fontSize: "1.5rem" }}
          >
            architecture
          </span>
        </div>
        <div>
          <h1
            className="font-headline text-xl font-bold tracking-tight leading-none"
            style={{ color: "#1a1f1f" }}
          >
            Event Society
          </h1>
          <p
            className="font-label text-[10px] font-bold uppercase tracking-[0.1em] mt-1"
            style={{ color: "rgba(45,83,73,0.7)" }}
          >
            Structural Interface
          </p>
        </div>
      </div>

      {/* Main nav */}
      <nav className="flex-1 flex flex-col gap-1.5">
        {mainNav.map(({ href, label, icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-4 py-3 rounded-lg font-label text-[11px] font-bold uppercase tracking-widest transition-all duration-150"
              style={
                active
                  ? {
                    backgroundColor: "#ffffff",
                    color: "#2d5349",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                    border: "1px solid rgba(155,168,167,0.2)",
                  }
                  : { color: "rgba(64,73,72,0.7)" }
              }
            >
              <span
                className="material-symbols-outlined"
                style={{
                  fontSize: "1.125rem",
                  color: active ? "#2d5349" : "rgba(64,73,72,0.6)",
                }}
              >
                {icon}
              </span>
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div
        className="mt-auto flex flex-col gap-2 pt-6"
        style={{ borderTop: "1px solid rgba(155,168,167,0.3)" }}
      >
        <Link
          href="/proposals/new"
          className="flex items-center justify-center gap-3 w-full py-3.5 mb-2 rounded-xl font-label font-bold text-xs uppercase tracking-widest transition-all hover:opacity-90 active:scale-95"
          style={{
            backgroundColor: "#2d5349",
            color: "#ffffff",
            boxShadow: "0 4px 12px rgba(45,83,73,0.25)",
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: "1.125rem" }}>
            add
          </span>
          New Proposal
        </Link>
        <Link
          href="/help"
          className="flex items-center gap-3 px-4 py-2 font-label text-[10px] font-bold uppercase tracking-widest transition-all hover:opacity-60"
          style={{ color: "rgba(64,73,72,0.8)" }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: "1.125rem" }}>
            help_outline
          </span>
          Help Center
        </Link>
        <Link
          href="/signout"
          className="flex items-center gap-3 px-4 py-2 rounded-lg font-label text-[10px] font-bold uppercase tracking-widest transition-all hover:bg-red-50"
          style={{ color: "#ba1a1a" }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: "1.125rem" }}>
            logout
          </span>
          Sign Out
        </Link>
      </div>
    </aside>
  );
}
