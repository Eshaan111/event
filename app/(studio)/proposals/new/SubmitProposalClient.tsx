"use client";

import { useRef, useState, useTransition } from "react";
import { submitProposal } from "./actions";

/* ── Field wrapper ───────────────────────────────────────────── */
function Field({
  label,
  optional,
  children,
}: {
  label: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label
        className="font-label text-[10px] uppercase tracking-widest font-bold"
        style={{ color: "#576160" }}
      >
        {label}
        {optional && (
          <span className="ml-1.5 font-normal opacity-50 normal-case tracking-normal">
            (Optional)
          </span>
        )}
      </label>
      {children}
    </div>
  );
}

/* ── Input style ─────────────────────────────────────────────── */
const INPUT =
  "w-full rounded-md p-3 font-body text-sm outline-none transition-all";
const INPUT_STYLE: React.CSSProperties = {
  backgroundColor: "#f0f4f3",
  border: "1px solid rgba(169,180,179,0.2)",
  color: "#2a3434",
};

function inp(extra?: React.CSSProperties): React.CSSProperties {
  return { ...INPUT_STYLE, ...extra };
}

/* ── Main component ──────────────────────────────────────────── */
export default function SubmitProposalClient() {
  const [isPending, startTransition] = useTransition();
  const [file, setFile]           = useState<File | null>(null);
  const [dragOver, setDragOver]   = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const fileInputRef              = useRef<HTMLInputElement>(null);
  const formRef                   = useRef<HTMLFormElement>(null);

  /* ── File handling ─────────────────────────────────────────── */
  function acceptFile(f: File) {
    const ext = f.name.split(".").pop()?.toLowerCase();
    if (!["pptx", "pdf"].includes(ext ?? "")) {
      setError("Only .pptx and .pdf files are supported.");
      return;
    }
    if (f.size > 128 * 1024 * 1024) {
      setError("File exceeds 128 MB limit.");
      return;
    }
    setError(null);
    setFile(f);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) acceptFile(f);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) acceptFile(f);
  }

  function openFilePicker(e?: React.MouseEvent) {
    e?.stopPropagation();
    fileInputRef.current?.click();
  }

  /* ── Submit ────────────────────────────────────────────────── */
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    if (file) formData.set("file", file);

    startTransition(async () => {
      const result = await submitProposal(formData);
      if (result && "error" in result) setError(result.error);
    });
  }

  const fileSizeFmt = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="grid grid-cols-12 gap-8">

      {/* ── Left: Upload Zone ─────────────────────────────────── */}
      <div className="col-span-12 lg:col-span-7 flex flex-col gap-6">
        <header>
          <span
            className="font-label text-[11px] uppercase tracking-[0.2em] font-bold mb-2 block"
            style={{ color: "#40665a" }}
          >
            Phase 01 // Integration
          </span>
          <h1
            className="font-headline text-5xl font-bold tracking-tighter"
            style={{ color: "#2a3434" }}
          >
            Submit Event Proposal
          </h1>
        </header>

        {/* Drop zone */}
        <div
          className="flex-1 min-h-[480px] relative overflow-hidden flex flex-col items-center justify-center p-12 text-center rounded-xl transition-all duration-300 cursor-pointer"
          style={{
            backgroundImage: "radial-gradient(#a9b4b3 1px, transparent 1px)",
            backgroundSize: "24px 24px",
            backgroundColor: dragOver ? "#e9efee" : "#f0f4f3",
            border: dragOver
              ? "2px solid #40665a"
              : "1px solid rgba(169,180,179,0.2)",
          }}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !file && fileInputRef.current?.click()}
        >
          {/* Metadata strips */}
          <div
            className="absolute top-0 left-0 w-full h-8 flex items-center px-4 justify-between"
            style={{
              backgroundColor: "rgba(207,221,219,0.4)",
              borderBottom: "1px solid rgba(169,180,179,0.1)",
            }}
          >
            <span className="font-label text-[8px] uppercase tracking-widest" style={{ color: "#576160" }}>
              UPLOADER_INTERFACE_V2.0
            </span>
            <span className="font-label text-[8px] uppercase tracking-widest" style={{ color: "#576160" }}>
              {file ? "STATUS: FILE LOADED" : "STATUS: READY"}
            </span>
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pptx,.pdf"
            className="hidden"
            onChange={handleFileInput}
          />

          {file ? (
            /* File loaded state */
            <div className="flex flex-col items-center gap-4">
              <div
                className="w-24 h-24 rounded-2xl flex items-center justify-center"
                style={{
                  backgroundColor: "#ffffff",
                  border: "1px solid rgba(169,180,179,0.2)",
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: "2.5rem", color: "#40665a" }}
                >
                  {file.name.endsWith(".pdf") ? "picture_as_pdf" : "slideshow"}
                </span>
              </div>
              <div>
                <p className="font-headline font-bold text-lg" style={{ color: "#2a3434" }}>
                  {file.name}
                </p>
                <p className="font-body text-sm mt-1" style={{ color: "#576160" }}>
                  {fileSizeFmt(file.size)}
                </p>
                {file.name.toLowerCase().endsWith(".pptx") && (
                  <p className="font-body text-xs mt-2" style={{ color: "#40665a" }}>
                    This deck will be converted to PDF for the embedded viewer.
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-label font-bold text-[10px] uppercase tracking-widest transition-all hover:opacity-70"
                style={{ border: "1px solid rgba(169,180,179,0.4)", color: "#576160" }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: "1rem" }}>close</span>
                Remove
              </button>
              <button
                type="button"
                onClick={openFilePicker}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-label font-bold text-[10px] uppercase tracking-widest transition-all hover:opacity-90"
                style={{ backgroundColor: "#40665a", color: "#defff2" }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: "1rem" }}>upload</span>
                Replace PDF / PPT
              </button>
            </div>
          ) : (
            /* Empty state */
            <>
              <div
                className="w-24 h-24 mb-6 rounded-2xl flex items-center justify-center transition-transform duration-500 group-hover:scale-105"
                style={{
                  backgroundColor: "#ffffff",
                  border: "1px solid rgba(169,180,179,0.2)",
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{
                    fontSize: "2.5rem",
                    color: "#40665a",
                    fontVariationSettings: "'wght' 300",
                  }}
                >
                  file_upload
                </span>
              </div>
              <h2
                className="font-headline text-2xl font-bold mb-2"
                style={{ color: "#2a3434" }}
              >
                UPLOAD PROPOSAL FILE
              </h2>
              <p className="font-body text-sm max-w-xs mb-8" style={{ color: "#576160" }}>
                Drag and drop or browse your PDF or PPT file. The selected file is saved on the server when you submit the proposal.{" "}
                <span className="font-bold italic" style={{ color: "#40665a" }}>
                  Classification Protocol Required
                </span>{" "}
                for all external assets.
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <button
                  type="button"
                  onClick={openFilePicker}
                  className="px-8 py-4 rounded-md font-label font-bold text-[12px] uppercase tracking-widest transition-all active:scale-95 hover:opacity-90"
                  style={{ backgroundColor: "#40665a", color: "#defff2" }}
                >
                  Upload PDF / PPT
                </button>
                <span className="font-label text-[10px] uppercase tracking-widest" style={{ color: "#727d7c" }}>
                  Saved on submit
                </span>
              </div>

              {/* Bottom specs */}
              <div className="absolute bottom-8 left-8 right-8 flex justify-between items-end pointer-events-none">
                <div className="text-left">
                  <div className="font-label text-[10px] uppercase mb-1" style={{ color: "#727d7c" }}>Max File Size</div>
                  <div className="font-body font-bold text-lg" style={{ color: "#2a3434" }}>128 MB</div>
                </div>
                <div className="text-right">
                  <div className="font-label text-[10px] uppercase mb-1" style={{ color: "#727d7c" }}>Supported Format</div>
                  <div className="font-body font-bold text-lg" style={{ color: "#2a3434" }}>.PPTX / .PDF</div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Right: Metadata Form ──────────────────────────────── */}
      <div className="col-span-12 lg:col-span-5">
        <form
          ref={formRef}
          onSubmit={handleSubmit}
          className="flex flex-col h-full rounded-xl overflow-hidden"
          style={{
            backgroundColor: "#ffffff",
            border: "1px solid rgba(169,180,179,0.1)",
            boxShadow: "0px 20px 48px rgba(42,52,52,0.04)",
          }}
        >
          {/* Form header */}
          <div
            className="p-6"
            style={{
              backgroundColor: "#f0f4f3",
              borderBottom: "1px solid rgba(169,180,179,0.1)",
            }}
          >
            <h3
              className="font-label text-sm uppercase tracking-widest font-bold"
              style={{ color: "#576160" }}
            >
              Submission Metadata
            </h3>
          </div>

          {/* Scrollable form body */}
          <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-7">

            <Field label="Official Event Title">
              <input
                name="title"
                type="text"
                required
                placeholder="e.g. Neo-Brutalist Symposium 2026"
                className={INPUT}
                style={inp()}
                onFocus={(e) => { e.target.style.borderColor = "#40665a"; e.target.style.boxShadow = "0 0 0 1px #40665a"; }}
                onBlur={(e)  => { e.target.style.borderColor = "rgba(169,180,179,0.2)"; e.target.style.boxShadow = "none"; }}
              />
            </Field>

            <Field label="Description" optional>
              <textarea
                name="description"
                rows={3}
                placeholder="Describe the proposal's vision and objectives..."
                className={INPUT + " resize-none"}
                style={inp()}
                onFocus={(e) => { e.target.style.borderColor = "#40665a"; e.target.style.boxShadow = "0 0 0 1px #40665a"; }}
                onBlur={(e)  => { e.target.style.borderColor = "rgba(169,180,179,0.2)"; e.target.style.boxShadow = "none"; }}
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Target Audience" optional>
                <input
                  name="targetAudience"
                  type="text"
                  placeholder="Architects, Designers"
                  className={INPUT}
                  style={inp()}
                  onFocus={(e) => { e.target.style.borderColor = "#40665a"; e.target.style.boxShadow = "0 0 0 1px #40665a"; }}
                  onBlur={(e)  => { e.target.style.borderColor = "rgba(169,180,179,0.2)"; e.target.style.boxShadow = "none"; }}
                />
              </Field>
              <Field label="Primary Location">
                <input
                  name="location"
                  type="text"
                  placeholder="London, UK"
                  className={INPUT}
                  style={inp()}
                  onFocus={(e) => { e.target.style.borderColor = "#40665a"; e.target.style.boxShadow = "0 0 0 1px #40665a"; }}
                  onBlur={(e)  => { e.target.style.borderColor = "rgba(169,180,179,0.2)"; e.target.style.boxShadow = "none"; }}
                />
              </Field>
            </div>

            <Field label="Scheduled Date (Range)">
              <div className="flex items-center gap-2">
                <input
                  name="dateStart"
                  type="date"
                  className={INPUT + " flex-1"}
                  style={inp()}
                  onFocus={(e) => { e.target.style.borderColor = "#40665a"; }}
                  onBlur={(e)  => { e.target.style.borderColor = "rgba(169,180,179,0.2)"; }}
                />
                <span className="material-symbols-outlined shrink-0" style={{ color: "#a9b4b3" }}>
                  arrow_forward
                </span>
                <input
                  name="dateEnd"
                  type="date"
                  className={INPUT + " flex-1"}
                  style={inp()}
                  onFocus={(e) => { e.target.style.borderColor = "#40665a"; }}
                  onBlur={(e)  => { e.target.style.borderColor = "rgba(169,180,179,0.2)"; }}
                />
              </div>
            </Field>

            <Field label="Potential Sponsors" optional>
              <textarea
                name="potentialSponsors"
                rows={3}
                placeholder="List key strategic partners..."
                className={INPUT + " resize-none"}
                style={inp()}
                onFocus={(e) => { e.target.style.borderColor = "#40665a"; e.target.style.boxShadow = "0 0 0 1px #40665a"; }}
                onBlur={(e)  => { e.target.style.borderColor = "rgba(169,180,179,0.2)"; e.target.style.boxShadow = "none"; }}
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Estimated Budget">
                <div className="relative">
                  <span
                    className="absolute left-3 top-3 font-label text-sm"
                    style={{ color: "#727d7c" }}
                  >
                    USD
                  </span>
                  <input
                    name="budget"
                    type="number"
                    min="0"
                    placeholder="0.00"
                    className={INPUT}
                    style={inp({ paddingLeft: "3rem" })}
                    onFocus={(e) => { e.target.style.borderColor = "#40665a"; e.target.style.boxShadow = "0 0 0 1px #40665a"; }}
                    onBlur={(e)  => { e.target.style.borderColor = "rgba(169,180,179,0.2)"; e.target.style.boxShadow = "none"; }}
                  />
                </div>
              </Field>
              <Field label="Audience Count" optional>
                <input
                  name="audienceCount"
                  type="number"
                  min="0"
                  placeholder="e.g. 500"
                  className={INPUT}
                  style={inp()}
                  onFocus={(e) => { e.target.style.borderColor = "#40665a"; e.target.style.boxShadow = "0 0 0 1px #40665a"; }}
                  onBlur={(e)  => { e.target.style.borderColor = "rgba(169,180,179,0.2)"; e.target.style.boxShadow = "none"; }}
                />
              </Field>
            </div>

            {/* Error */}
            {error && (
              <div
                className="px-4 py-3 rounded-lg font-body text-sm"
                style={{
                  backgroundColor: "rgba(186,26,26,0.06)",
                  border: "1px solid rgba(186,26,26,0.15)",
                  color: "#9f403d",
                }}
              >
                {error}
              </div>
            )}
          </div>

          {/* Form footer */}
          <div
            className="p-8"
            style={{ borderTop: "1px solid rgba(169,180,179,0.1)" }}
          >
            <button
              type="submit"
              disabled={isPending}
              className="w-full py-5 rounded-md font-label font-black text-[14px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all hover:opacity-90 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                backgroundColor: "#40665a",
                color: "#defff2",
                boxShadow: "0 8px 24px rgba(64,102,90,0.15)",
              }}
            >
              {isPending ? (
                <>
                  <span
                    className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"
                    style={{ display: "inline-block" }}
                  />
                  Initializing…
                </>
              ) : (
                <>
                  Initialize Proposal
                  <span className="material-symbols-outlined" style={{ fontSize: "1.25rem" }}>
                    arrow_forward
                  </span>
                </>
              )}
            </button>
            <p
              className="mt-4 text-center font-label text-[9px] uppercase tracking-widest"
              style={{ color: "#a9b4b3" }}
            >
              Submission constitutes acceptance of the Aetheric Studio terms
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
