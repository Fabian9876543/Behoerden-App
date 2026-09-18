"use server";

import { revalidatePath } from "next/cache";
import { getProfile, requireUser } from "@/lib/auth";
import { AppError, fail, ok, type ActionResult } from "@/lib/errors";
import { generateLetterDraft, isLetterIntent } from "@/lib/ai/letter-generation";
import { createLetter, deleteLetter, requireLetter, updateLetter } from "@/lib/db/letters";
import { getCaseDetail } from "@/lib/db/cases";
import { recordCaseEvent } from "@/lib/db/events";
import {
  emptyToNull,
  firstIssueMessage,
  generateLetterSchema,
  updateLetterSchema,
} from "@/lib/validation/schemas";

export interface LetterDraftResult {
  letterId: string;
  subject: string;
  body: string;
  openPoints: string[];
}

export async function generateLetterAction(
  formData: FormData,
): Promise<ActionResult<LetterDraftResult>> {
  try {
    const user = await requireUser();
    const parsed = generateLetterSchema.safeParse({
      caseId: formData.get("caseId"),
      intent: formData.get("intent"),
      note: formData.get("note") ?? "",
    });
    if (!parsed.success) {
      throw new AppError("validation_failed", firstIssueMessage(parsed.error));
    }
    if (!isLetterIntent(parsed.data.intent)) {
      throw new AppError("validation_failed", "Unbekanntes Anliegen.");
    }

    const detail = await getCaseDetail(parsed.data.caseId, user.id);
    const profile = await getProfile(user.id);

    const { draft, model } = await generateLetterDraft({
      intent: parsed.data.intent,
      userNote: emptyToNull(parsed.data.note),
      context: {
        caseRow: detail.caseRow,
        tasks: detail.tasks,
        deadlines: detail.deadlines,
        profile,
      },
    });

    const letter = await createLetter({
      userId: user.id,
      caseId: detail.caseRow.id,
      subject: draft.subject,
      body: draft.body,
      intent: parsed.data.intent,
      model,
    });

    await recordCaseEvent({
      userId: user.id,
      caseId: detail.caseRow.id,
      type: "letter_drafted",
      title: "Antwortentwurf erstellt",
      description: draft.subject,
      metadata: { letterId: letter.id },
    });

    revalidatePath(`/cases/${detail.caseRow.id}`);
    return ok({
      letterId: letter.id,
      subject: letter.subject,
      body: letter.body,
      openPoints: draft.openPoints,
    });
  } catch (error) {
    return fail(error);
  }
}

/** Speichert die vom Nutzer bearbeitete Fassung. Setzt den Status zurück auf Entwurf. */
export async function updateLetterAction(formData: FormData): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = updateLetterSchema.safeParse({
      letterId: formData.get("letterId"),
      subject: formData.get("subject"),
      body: formData.get("body"),
    });
    if (!parsed.success) {
      throw new AppError("validation_failed", firstIssueMessage(parsed.error));
    }

    const letter = await requireLetter(parsed.data.letterId, user.id);
    await updateLetter(letter.id, {
      subject: parsed.data.subject,
      body: parsed.data.body,
      status: "draft",
    });

    revalidatePath(`/cases/${letter.case_id}`);
    return ok();
  } catch (error) {
    return fail(error);
  }
}

/**
 * Ausdrückliche Freigabe durch den Nutzer.
 * Es wird dabei nichts versendet - die Freigabe dokumentiert nur, dass der
 * Entwurf geprüft wurde.
 */
export async function approveLetterAction(letterId: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const letter = await requireLetter(letterId, user.id);
    await updateLetter(letter.id, { status: "approved" });

    await recordCaseEvent({
      userId: user.id,
      caseId: letter.case_id,
      type: "letter_approved",
      title: "Antwortentwurf freigegeben",
      description: letter.subject,
      metadata: { letterId: letter.id },
    });

    revalidatePath(`/cases/${letter.case_id}`);
    return ok();
  } catch (error) {
    return fail(error);
  }
}

export async function deleteLetterAction(letterId: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const letter = await requireLetter(letterId, user.id);
    await deleteLetter(letter.id);
    revalidatePath(`/cases/${letter.case_id}`);
    return ok();
  } catch (error) {
    return fail(error);
  }
}
