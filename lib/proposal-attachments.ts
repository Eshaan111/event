import fs from "fs/promises";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

const VALID_EXTENSIONS = new Set([".pdf", ".pptx"]);
const VALID_IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);

type AttachmentMeta = {
  attachmentUrl?: string;
  attachmentName?: string;
  sourceAttachmentUrl?: string;
  sourceAttachmentName?: string;
};

function randomName(ext: string) {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
}

function publicUrlFromName(fileName: string) {
  return `/uploads/${fileName}`;
}

function toPublicPath(publicUrl: string) {
  return path.join(process.cwd(), "public", publicUrl.replace(/^\//, ""));
}

async function deleteIfLocal(publicUrl: string | undefined) {
  if (!publicUrl?.startsWith("/uploads/")) return;
  await fs.unlink(toPublicPath(publicUrl)).catch(() => {});
}

async function convertPptxToPdf(inputPath: string, outputPath: string) {
  const script = `
$ErrorActionPreference = 'Stop'
$inputPath = $args[0]
$outputPath = $args[1]
$powerpoint = $null
$presentation = $null
try {
  $powerpoint = New-Object -ComObject PowerPoint.Application
  $presentation = $powerpoint.Presentations.Open($inputPath, $false, $false, $false)
  $presentation.SaveAs($outputPath, 32)
}
finally {
  if ($presentation) { $presentation.Close() }
  if ($powerpoint) { $powerpoint.Quit() }
}
`;

  await execFileAsync(
    "powershell.exe",
    [
      "-NoProfile",
      "-NonInteractive",
      "-ExecutionPolicy",
      "Bypass",
      "-Command",
      script,
      inputPath,
      outputPath,
    ],
    { windowsHide: true }
  );
}

export async function saveProposalAttachment(file: File): Promise<Required<AttachmentMeta>> {
  const ext = path.extname(file.name).toLowerCase();
  if (!VALID_EXTENSIONS.has(ext)) {
    throw new Error("Only .pptx and .pdf files are supported.");
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await fs.mkdir(uploadDir, { recursive: true });

  const bytes = await file.arrayBuffer();
  const sourceFileName = randomName(ext);
  const sourcePath = path.join(uploadDir, sourceFileName);
  await fs.writeFile(sourcePath, Buffer.from(bytes));

  if (ext === ".pdf") {
    return {
      attachmentUrl: publicUrlFromName(sourceFileName),
      attachmentName: file.name,
      sourceAttachmentUrl: publicUrlFromName(sourceFileName),
      sourceAttachmentName: file.name,
    };
  }

  const pdfFileName = randomName(".pdf");
  const pdfPath = path.join(uploadDir, pdfFileName);

  try {
    await convertPptxToPdf(sourcePath, pdfPath);
  } catch {
    await fs.unlink(sourcePath).catch(() => {});
    await fs.unlink(pdfPath).catch(() => {});
    throw new Error("PowerPoint conversion failed. Please try again with a PDF or another PPTX.");
  }

  return {
    attachmentUrl: publicUrlFromName(pdfFileName),
    attachmentName: `${path.parse(file.name).name}.pdf`,
    sourceAttachmentUrl: publicUrlFromName(sourceFileName),
    sourceAttachmentName: file.name,
  };
}

export async function saveBannerImage(file: File): Promise<{ bannerUrl: string }> {
  const ext = path.extname(file.name).toLowerCase();
  if (!VALID_IMAGE_EXTENSIONS.has(ext)) {
    throw new Error("Only JPG, PNG, WebP, or GIF files are supported for the banner.");
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await fs.mkdir(uploadDir, { recursive: true });

  const fileName = randomName(ext);
  const filePath = path.join(uploadDir, fileName);
  const bytes = await file.arrayBuffer();
  await fs.writeFile(filePath, Buffer.from(bytes));

  return { bannerUrl: publicUrlFromName(fileName) };
}

export async function removeProposalAttachments(meta: AttachmentMeta | null | undefined) {
  await Promise.all([
    deleteIfLocal(meta?.attachmentUrl),
    deleteIfLocal(meta?.sourceAttachmentUrl),
  ]);
}
