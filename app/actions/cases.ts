"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { AppError, fail, ok, type ActionResult } from "@/lib/errors";
import {
  createCase,
  deleteCase,
  refreshCaseStatus,
  requireCase,
  updateCase,
} from "@/lib/db/cases";
import { listStoragePathsForCase } from "@/lib/db/documents";
import { deleteDocuments } from "@/lib/storage/documents";
import { recordCaseEvent } from "@/lib/db/events";
import { matchAuthorityKey } from "@/lib/authorities/registry";
import {
  createCaseSchema,
  emptyToNull,
  firstIssueMessage,
  updateCaseSchema,
} from "@/lib/validation/schemas";

export async function createCaseAction(
  formData: FormData,
): Promise<ActionResult<{ caseId: string }>> {
  try {
    const user = await requireUser();
    const parsed = createCaseSchema.safeParse({
      title: formData.get("title"),
      authorityName: formData.get("authorityName") ?? "",
      caseType: formData.get("caseType") ?? "",
      referenceNumber: formData.get("referenceNumber") ?? "",
      concerns: formData.get("concerns") ?? "",
    });
    if (!parsed.success) {
      throw new AppError("validation_failed", firstIssueMessage(parsed.error));
    }

    const authorityName = emptyToNull(parsed.data.authorityName);
    const caseRow = await createCase({
      userId: user.id,
      title: parsed.data.title,
      authorityName,
      authorityKey: matchAuthorityKey(authorityName),
      caseType: emptyToNull(parsed.data.caseType),
      referenceNumber: emptyToNull(parsed.data.referenceNumber),
      concerns: emptyToNull(parsed.data.concerns),
      status: "in_progress",
    });

    await recordCaseEvent({
      userId: user.id,
      caseId: caseRow.id,
      type: "case_created",
      title: "Vorgang angelegt",
      metadata: { manual: true },
    });

    revalidatePath("/dashboard");
    revalidatePath("/cases");
    return ok({ caseId: caseRow.id });
  } catch (error) {
    return fail(error);
  }
}

export async function updateCaseAction(formData: FormData): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = updateCaseSchema.safeParse({
      caseId: formData.get("caseId"),
      title: formData.get("title") ?? undefined,
      authorityName: formData.get("authorityName") ?? "",
      caseType: formData.get("caseType") ?? "",
      referenceNumber: formData.get("referenceNumber") ?? "",
      concerns: formData.get("concerns") ?? "",
      status: formData.get("status") ?? undefined,
    });
    if (!parsed.success) {
      throw new AppError("validation_failed", firstIssueMessage(parsed.error));
    }

    const existing = await requireCase(parsed.data.caseId, user.id);
    const authorityName = emptyToNull(parsed.data.authorityName);

    await updateCase(existing.id, {
      ...(parsed.data.title ? { title: parsed.data.title } : {}),
      authority_name: authorityName,
      authority_key: matchAuthorityKey(authorityName),
      case_type: emptyToNull(parsed.data.caseType),
      reference_number: emptyToNull(parsed.data.referenceNumber),
      concerns: emptyToNull(parsed.data.concerns),
      ...(parsed.data.status ? { status: parsed.data.status } : {}),
      ...(parsed.data.status === "completed"
        ? { closed_at: new Date().toISOString() }
        : parsed.data.status
          ? { closed_at: null }
          : {}),
    });

    if (parsed.data.status && parsed.data.status !== existing.status) {
      await recordCaseEvent({
        userId: user.id,
        caseId: existing.id,
        type: parsed.data.status === "completed" ? "case_closed" : "case_status_changed",
        title:
          parsed.data.status === "completed"
            ? "Vorgang abgeschlossen"
            : `Status geändert: ${parsed.data.status}`,
        metadata: { from: existing.status, to: parsed.data.status },
      });
    }

    revalidatePath("/dashboard");
    revalidatePath("/cases");
    revalidatePath(`/cases/${existing.id}`);
    return ok();
  } catch (error) {
    return fail(error);
  }
}

export async function closeCaseAction(caseId: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const caseRow = await requireCase(caseId, user.id);

    await updateCase(caseRow.id, {
      status: "completed",
      closed_at: new Date().toISOString(),
    });
    await recordCaseEvent({
      userId: user.id,
      caseId: caseRow.id,
      type: "case_closed",
      title: "Vorgang abgeschlossen",
    });

    revalidatePath("/dashboard");
    revalidatePath("/cases");
    revalidatePath(`/cases/${caseRow.id}`);
    return ok();
  } catch (error) {
    return fail(error);
  }
}

export async function reopenCaseAction(caseId: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const caseRow = await requireCase(caseId, user.id);

    await updateCase(caseRow.id, { status: "in_progress", closed_at: null });
    await refreshCaseStatus(caseRow.id);
    await recordCaseEvent({
      userId: user.id,
      caseId: caseRow.id,
      type: "case_status_changed",
      title: "Vorgang wieder geöffnet",
    });

    revalidatePath("/dashboard");
    revalidatePath(`/cases/${caseRow.id}`);
    return ok();
  } catch (error) {
    return fail(error);
  }
}

/** Löscht den Vorgang samt aller Dokumente - in der Datenbank und im Storage. */
export async function deleteCaseAction(caseId: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const caseRow = await requireCase(caseId, user.id);

    // Pfade einsammeln, BEVOR die Zeilen per Kaskade verschwinden.
    const paths = await listStoragePathsForCase(caseRow.id);
    await deleteCase(caseRow.id);
    await deleteDocuments(paths);

    revalidatePath("/dashboard");
    revalidatePath("/cases");
    revalidatePath("/documents");
    revalidatePath("/tasks");
    revalidatePath("/deadlines");
    return ok();
  } catch (error) {
    return fail(error);
  }
}
