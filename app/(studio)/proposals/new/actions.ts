"use server";

import { prisma } from "@/lib/prisma";
import { saveProposalAttachment } from "@/lib/proposal-attachments";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function submitProposal(formData: FormData): Promise<{ error: string } | never> {
  const title = (formData.get("title") as string | null)?.trim();
  const description = (formData.get("description") as string | null)?.trim() || null;
  const location = (formData.get("location") as string | null)?.trim() || null;
  const dateStart = formData.get("dateStart") as string | null;
  const dateEnd = formData.get("dateEnd") as string | null;
  const budgetRaw = formData.get("budget") as string | null;
  const audience = formData.get("targetAudience") as string | null;
  const sponsors = formData.get("potentialSponsors") as string | null;
  const countRaw = formData.get("audienceCount") as string | null;
  const file = formData.get("file") as File | null;

  if (!title) return { error: "Title is required." };

  let attachmentUrl: string | null = null;
  let attachmentName: string | null = null;
  let sourceAttachmentUrl: string | null = null;
  let sourceAttachmentName: string | null = null;

  if (file && file.size > 0) {
    try {
      const saved = await saveProposalAttachment(file);
      attachmentUrl = saved.attachmentUrl;
      attachmentName = saved.attachmentName;
      sourceAttachmentUrl = saved.sourceAttachmentUrl;
      sourceAttachmentName = saved.sourceAttachmentName;
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Attachment processing failed.",
      };
    }
  }

  let dateEst: string | null = null;
  if (dateStart) {
    const fmt = (s: string) =>
      new Date(s).toLocaleDateString("en-US", { month: "short", year: "numeric" });
    dateEst = dateEnd ? `${fmt(dateStart)} — ${fmt(dateEnd)}` : fmt(dateStart);
  }

  const metadata: Record<string, unknown> = {};
  if (audience) metadata.targetAudience = audience;
  if (sponsors) metadata.potentialSponsors = sponsors;
  if (countRaw) metadata.expectedAttendance = parseInt(countRaw, 10);
  if (attachmentUrl) metadata.attachmentUrl = attachmentUrl;
  if (attachmentName) metadata.attachmentName = attachmentName;
  if (sourceAttachmentUrl) metadata.sourceAttachmentUrl = sourceAttachmentUrl;
  if (sourceAttachmentName) metadata.sourceAttachmentName = sourceAttachmentName;

  const proposal = await prisma.proposal.create({
    data: {
      type: "EVENT",
      status: "DRAFT",
      title,
      description,
      location,
      dateEst,
      budget: budgetRaw ? Math.round(parseFloat(budgetRaw)) : null,
      metadata: Object.keys(metadata).length > 0 ? (metadata as never) : undefined,
    },
  });

  revalidatePath("/proposals");
  redirect(`/proposals/${proposal.id}`);
}
