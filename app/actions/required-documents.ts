"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { AppError, fail, ok, type ActionResult } from "@/lib/errors";
import {
  requireRequiredDocument,
  setRequiredDocumentFulfilled,
} from "@/lib/db/required-documents";
import { requireDocument } from "@/lib/db/documents";
import { recordCaseEvent } from "@/lib/db/events";

/**
 * Hakt eine benoetigte Unterlage ab. `documentId` verknuepft sie mit einem
 * hochgeladenen Dokument; null nimmt die Markierung zurueck.
 */
export async function setRequiredDocumentAction(
  requiredDocumentId: string,
  documentId: string | null,
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const required = await requireRequiredDocument(requiredDocumentId, user.id);

    if (documentId) {
      // Nur eigene Dokumente aus demselben Vorgang duerfen verknuepft werden.
      const document = await requireDocument(documentId, user.id);
      if (document.case_id !== required.case_id) {
        throw new AppError(
          "validation_failed",
          "Das Dokument gehört zu einem anderen Vorgang.",
        );
      }
    }

    await setRequiredDocumentFulfilled(required.id, documentId);

    if (documentId && !required.fulfilled_by_document_id) {
      await recordCaseEvent({
        userId: user.id,
        caseId: required.case_id,
        type: "documents_required",
        title: "Unterlage bereitgestellt",
        description: required.name,
        metadata: { requiredDocumentId: required.id },
      });
    }

    revalidatePath(`/cases/${required.case_id}`);
    return ok();
  } catch (error) {
    return fail(error);
  }
}
