"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { getOrgId } from "@/lib/org";
import { saveProposalAttachment } from "@/lib/proposal-attachments";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getNextStudentDept } from "@/lib/student-flow";

export async function submitProposal(formData: FormData): Promise<{ error: string } | never> {
  const session = await auth();
  const userId  = session?.user?.id ?? null;

  const title       = (formData.get("title") as string | null)?.trim();
  const description = (formData.get("description") as string | null)?.trim() || null;
  const location    = (formData.get("location") as string | null)?.trim() || null;
  const dateStart   = formData.get("dateStart") as string | null;
  const dateEnd     = formData.get("dateEnd") as string | null;
  const budgetRaw   = formData.get("budget") as string | null;
  const audience    = formData.get("targetAudience") as string | null;
  const sponsors    = formData.get("potentialSponsors") as string | null;
  const countRaw    = formData.get("audienceCount") as string | null;
  const file        = formData.get("file") as File | null;

  if (!title) return { error: "Title is required." };

  // Detect if the submitter is a student — drives author name, org, and redirect
  const student = userId
    ? await prisma.student.findUnique({ where: { userId } })
    : null;

  let attachmentUrl: string | null = null;
  let attachmentName: string | null = null;
  let sourceAttachmentUrl: string | null = null;
  let sourceAttachmentName: string | null = null;

  if (file && file.size > 0) {
    try {
      const saved = await saveProposalAttachment(file);
      attachmentUrl        = saved.attachmentUrl;
      attachmentName       = saved.attachmentName;
      sourceAttachmentUrl  = saved.sourceAttachmentUrl;
      sourceAttachmentName = saved.sourceAttachmentName;
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Attachment processing failed." };
    }
  }

  let dateEst: string | null = null;
  if (dateStart) {
    const fmt = (s: string) =>
      new Date(s).toLocaleDateString("en-US", { month: "short", year: "numeric" });
    dateEst = dateEnd ? `${fmt(dateStart)} — ${fmt(dateEnd)}` : fmt(dateStart);
  }

  const metadata: Record<string, unknown> = {};
  if (audience)            metadata.targetAudience     = audience;
  if (sponsors)            metadata.potentialSponsors  = sponsors;
  if (countRaw)            metadata.expectedAttendance = parseInt(countRaw, 10);
  if (attachmentUrl)       metadata.attachmentUrl      = attachmentUrl;
  if (attachmentName)      metadata.attachmentName     = attachmentName;
  if (sourceAttachmentUrl) metadata.sourceAttachmentUrl  = sourceAttachmentUrl;
  if (sourceAttachmentName) metadata.sourceAttachmentName = sourceAttachmentName;

  const authorName = student?.name ?? session?.user?.name ?? "Unknown";
  const orgId      = student ? student.orgId : await getOrgId(userId);

  const proposal = await prisma.proposal.create({
    data: {
      type:   "EVENT",
      status: "DRAFT",
      title,
      description,
      location,
      dateEst,
      budget:    budgetRaw ? Math.round(parseFloat(budgetRaw)) : null,
      metadata:  Object.keys(metadata).length > 0 ? (metadata as never) : undefined,
      orgId:     orgId ?? undefined,
      ...(student ? { studentId: student.id } : {}),
      authors: {
        create: {
          name:      authorName,
          role:      student ? "Student Proposer" : "Proposer",
          initial:   authorName.charAt(0).toUpperCase(),
          isPrimary: true,
          ...(userId ? { userId } : {}),
        },
      },
    },
  });

  if (student) {
    // Kick off the sequential department approval chain starting at Finance
    if (student.orgId) {
      const firstChain = await getNextStudentDept(student.orgId, null);
      if (firstChain) {
        await prisma.proposalApprovalChain.create({
          data: {
            proposalId:   proposal.id,
            departmentId: firstChain.dept.id,
            currentStep:  0,
            status:       "ACTIVE",
            steps:        firstChain.steps as never,
          },
        });
      }
    }

    revalidatePath("/student");
    redirect(`/student/proposals/${proposal.id}`);
  }

  revalidatePath("/proposals");
  redirect(`/proposals/${proposal.id}`);
}
