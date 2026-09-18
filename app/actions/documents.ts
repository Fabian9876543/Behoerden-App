"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { serverEnv } from "@/lib/env";
import { AppError, fail, ok, type ActionResult } from "@/lib/errors";
import { log } from "@/lib/logging";
import {
  assertMimeMatchesContent,
  assertUploadable,
  DEFAULT_MAX_UPLOAD_BYTES,
} from "@/lib/documents/mime";
import { buildStoragePath, deleteDocuments, uploadDocument } from "@/lib/storage/documents";
import { createCase, requireCase, refreshCaseStatus } from "@/lib/db/cases";
import {
  createDocumentRecord,
  deleteDocumentRecord,
  requireDocument,
} from "@/lib/db/documents";
import { recordCaseEvent } from "@/lib/db/events";
import { runDocumentAnalysis, type AnalysisOutcome } from "@/lib/db/analysis-pipeline";

export interface UploadResult {
  documentId: string;
  caseId: string;
}

/**
 * Nimmt eine Datei entgegen, legt bei Bedarf einen Vorgang an und speichert
 * das Dokument. Die Analyse läuft als separater Schritt, damit die UI den
 * Fortschritt anzeigen kann und ein Analysefehler den Upload nicht verwirft.
 */
export async function uploadDocumentAction(
  formData: FormData,
): Promise<ActionResult<UploadResult>> {
  try {
    const user = await requireUser();

    const file = formData.get("file");
    if (!(file instanceof File)) {
      throw new AppError("validation_failed", "Es wurde keine Datei übermittelt.");
    }

    const maxBytes = safeMaxUploadBytes();
    assertUploadable({ mimeType: file.type, sizeBytes: file.size, maxBytes });

    const bytes = new Uint8Array(await file.arrayBuffer());
    // Der gemeldete MIME-Typ ist nicht vertrauenswürdig - Magic Bytes entscheiden.
    const mimeType = assertMimeMatchesContent(file.type, bytes);

    const rawCaseId = formData.get("caseId");
    const caseId =
      typeof rawCaseId === "string" && rawCaseId.length > 0
        ? (await requireCase(rawCaseId, user.id)).id
        : (
            await createCase({
              userId: user.id,
              title: "Neues Dokument wird analysiert",
              status: "in_progress",
            })
          ).id;

    const documentId = randomUUID();
    const storagePath = buildStoragePath({
      userId: user.id,
      caseId,
      documentId,
      mimeType,
    });

    await uploadDocument({ path: storagePath, bytes, mimeType });

    try {
      await createDocumentRecord({
        id: documentId,
        userId: user.id,
        caseId,
        fileName: sanitizeFileName(file.name),
        mimeType,
        sizeBytes: bytes.byteLength,
        storagePath,
      });
    } catch (error) {
      // Keine verwaisten Dateien im Storage zurücklassen.
      await deleteDocuments([storagePath]);
      throw error;
    }

    await recordCaseEvent({
      userId: user.id,
      caseId,
      type: "document_uploaded",
      title: "Dokument hochgeladen",
      description: sanitizeFileName(file.name),
      metadata: { documentId, sizeBytes: bytes.byteLength },
    });

    log.info("document_uploaded", { documentId, caseId, sizeBytes: bytes.byteLength });
    revalidatePath("/documents");
    revalidatePath(`/cases/${caseId}`);

    return ok({ documentId, caseId });
  } catch (error) {
    return fail(error);
  }
}

export interface AnalyzeResult {
  caseId: string;
  taskCount: number;
  deadlineCount: number;
  requiredDocumentCount: number;
  summary: string;
  authorityName: string | null;
  uncertaintyNotes: string[];
}

export async function analyzeDocumentAction(
  documentId: string,
): Promise<ActionResult<AnalyzeResult>> {
  try {
    const user = await requireUser();
    const document = await requireDocument(documentId, user.id);

    const outcome: AnalysisOutcome = await runDocumentAnalysis({
      document,
      userId: user.id,
    });

    revalidatePath("/dashboard");
    revalidatePath("/documents");
    revalidatePath("/tasks");
    revalidatePath("/deadlines");
    revalidatePath(`/cases/${outcome.caseId}`);

    return ok({
      caseId: outcome.caseId,
      taskCount: outcome.createdTaskCount,
      deadlineCount: outcome.createdDeadlineCount,
      requiredDocumentCount: outcome.createdRequiredDocumentCount,
      summary: outcome.analysis.summary,
      authorityName: outcome.analysis.authority?.name ?? null,
      uncertaintyNotes: outcome.analysis.uncertaintyNotes,
    });
  } catch (error) {
    return fail(error);
  }
}

export async function deleteDocumentAction(documentId: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const document = await requireDocument(documentId, user.id);

    await deleteDocumentRecord(document.id);
    await deleteDocuments([document.storage_path]);

    if (document.case_id) {
      await recordCaseEvent({
        userId: user.id,
        caseId: document.case_id,
        type: "document_deleted",
        title: "Dokument gelöscht",
        description: document.file_name,
        metadata: { documentId: document.id },
      });
      await refreshCaseStatus(document.case_id);
      revalidatePath(`/cases/${document.case_id}`);
    }

    revalidatePath("/documents");
    return ok();
  } catch (error) {
    return fail(error);
  }
}

function safeMaxUploadBytes(): number {
  try {
    const value = serverEnv().maxUploadBytes;
    return Number.isFinite(value) && value > 0 ? value : DEFAULT_MAX_UPLOAD_BYTES;
  } catch {
    return DEFAULT_MAX_UPLOAD_BYTES;
  }
}

/** Entfernt Pfadanteile, Steuerzeichen und riskante Zeichen aus dem Dateinamen. */
function sanitizeFileName(name: string): string {
  const base = name.split(/[/\\]/).pop() ?? "dokument";
  const cleaned = [...base]
    .filter((char) => {
      const code = char.codePointAt(0) ?? 0;
      if (code < 0x20 || code === 0x7f) return false;
      return !'<>:"|?*'.includes(char);
    })
    .join("")
    .trim()
    .slice(0, 160);
  return cleaned || "dokument";
}
