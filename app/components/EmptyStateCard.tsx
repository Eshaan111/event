"use client";

export default function EmptyStateCard() {
  return (
    <div
      className="group min-h-[24rem] rounded-xl flex flex-col items-center justify-center p-8 text-center transition-all cursor-pointer"
      style={{ border: "2px dashed rgba(64,102,90,0.15)" }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(64,102,90,0.4)";
        (e.currentTarget as HTMLDivElement).style.backgroundColor = "rgba(64,102,90,0.02)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(64,102,90,0.15)";
        (e.currentTarget as HTMLDivElement).style.backgroundColor = "";
      }}
    >
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center mb-6 transition-transform group-hover:scale-110"
        style={{ backgroundColor: "#e1eae9", color: "#40665a" }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: "2rem" }}>
          add_business
        </span>
      </div>
      <h3
        className="font-headline text-xl font-bold mb-2"
        style={{ color: "#2a3434" }}
      >
        Initiate New Blueprint
      </h3>
      <p
        className="text-sm font-body max-w-[200px] mb-8"
        style={{ color: "#576160" }}
      >
        Start from a template or a clean architectural slate.
      </p>
      <button
        className="px-8 py-3 rounded-md font-label text-xs tracking-widest uppercase transition-all hover:opacity-90"
        style={{
          border: "1px solid rgba(64,102,90,0.4)",
          color: "#40665a",
          backgroundColor: "#f8faf9",
        }}
      >
        Create Proposal
      </button>
    </div>
  );
}
