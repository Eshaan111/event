import fs from "fs/promises";
import path from "path";

/* ── Types ─────────────────────────────────────────────────────── */

export type ReportFile = {
  url:          string;   // public URL  e.g. /uploads/reports/abc123/receipts/2026-04-08_invoice.pdf
  name:         string;   // the filename as stored on disk (without path)
  originalName: string;   // the name the user gave the file
  size:         number;   // bytes
  mimeType:     string;
};

export type ReportFileCategory = "receipts" | "media";

/* ── Allowed types ─────────────────────────────────────────────── */

const RECEIPT_MIME = new Set([
  "application/pdf",
  "image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic",
]);

const MEDIA_MIME = new Set([
  "application/pdf",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif", "image/heic",
  "video/mp4", "video/quicktime", "video/webm", "video/x-msvideo",
]);

const RECEIPT_EXT = new Set([".pdf", ".jpg", ".jpeg", ".png", ".webp", ".heic"]);
const MEDIA_EXT   = new Set([
  ".pdf", ".pptx", ".ppt", ".docx", ".doc",
  ".jpg", ".jpeg", ".png", ".webp", ".gif", ".heic",
  ".mp4", ".mov", ".webm", ".avi",
]);

const MAX_SIZE_MB = 50;

/* ── Helpers ───────────────────────────────────────────────────── */

/** Sanitise original filename → safe, readable disk name segment */
function sanitiseName(original: string): string {
  const ext  = path.extname(original).toLowerCase();
  const base = path.basename(original, ext)
    .replace(/[^a-zA-Z0-9._\-\s]/g, "")   // strip special chars
    .replace(/\s+/g, "_")                  // spaces → underscores
    .slice(0, 60)                           // cap length
    .toLowerCase();
  return `${base}${ext}`;
}

/** Build a predictable, human-readable filename:
 *  {YYYY-MM-DD}_{sanitisedOriginalName}
 *  e.g.  2026-04-08_venue_invoice.pdf
 */
function buildFileName(originalName: string): string {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const safe  = sanitiseName(originalName);
  // Disambiguate if two files share the same sanitised name by appending millis
  const ms    = Date.now().toString(36);
  return `${today}_${ms}_${safe}`;
}

function publicUrl(relativePath: string): string {
  // relativePath is relative to public/  →  /uploads/reports/…
  return "/" + relativePath.replace(/\\/g, "/");
}

function toAbsPath(relativePath: string): string {
  return path.join(process.cwd(), "public", relativePath);
}

/* ── Main export ───────────────────────────────────────────────── */

export async function saveReportFile(
  file: File,
  proposalId: string,
  category: ReportFileCategory,
): Promise<ReportFile> {
  // ── Validate size
  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    throw new Error(`File exceeds ${MAX_SIZE_MB} MB limit.`);
  }

  // ── Validate type
  const ext      = path.extname(file.name).toLowerCase();
  const mime     = file.type.toLowerCase();
  const allowed  = category === "receipts" ? RECEIPT_EXT : MEDIA_EXT;
  const allowedM = category === "receipts" ? RECEIPT_MIME : MEDIA_MIME;

  if (!allowed.has(ext) && !allowedM.has(mime)) {
    const list = category === "receipts"
      ? "PDF, JPG, PNG, WebP, HEIC"
      : "PDF, PPTX, DOCX, JPG, PNG, GIF, WebP, MP4, MOV, WebM";
    throw new Error(`Unsupported file type. Allowed: ${list}`);
  }

  // ── Build directory path
  // public/uploads/reports/{proposalId}/{category}/
  const relDir  = path.join("uploads", "reports", proposalId, category);
  const absDir  = path.join(process.cwd(), "public", relDir);
  await fs.mkdir(absDir, { recursive: true });

  // ── Build filename and write
  const fileName = buildFileName(file.name);
  const absFile  = path.join(absDir, fileName);
  const bytes    = await file.arrayBuffer();
  await fs.writeFile(absFile, Buffer.from(bytes));

  const relFile = path.join(relDir, fileName);

  return {
    url:          publicUrl(relFile),
    name:         fileName,
    originalName: file.name,
    size:         file.size,
    mimeType:     mime || `application/octet-stream`,
  };
}

/** Delete a report file from disk given its public URL. */
export async function deleteReportFile(url: string): Promise<void> {
  if (!url.startsWith("/uploads/reports/")) return;
  const absPath = path.join(process.cwd(), "public", url.slice(1));
  await fs.unlink(absPath).catch(() => {});
}
