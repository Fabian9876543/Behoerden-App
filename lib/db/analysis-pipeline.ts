import "server-only";

import { analyzeDocument } from "@/lib/ai/document-analysis";
import { resolveForms } from "@/lib/ai/form-assistance";
import { generateCaseShape } from "@/lib/ai/task-generation";
import {
  DOCUMENT_ANALYSIS_SCHEMA_VERSION,
  type DocumentAnalysis,
} from "@/lib/ai/schemas";
import { matchAuthorityKey } from "@/lib/authorities/registry";
import { extractText } from "@/lib/documents/extract-text";
import { AppError, toUserMessage } from "@/lib/errors";
import { log } from "@/lib/logging";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { downloadDocument } from "@/lib/storage/documents";
import { recordCaseEvent, recordCaseEvents, type RecordEventInput } from "@/lib/db/events";
import { setDocumentStatus, updateDocument } from "@/lib/db/documents";
import { updateCase } from "@/lib/db/cases";
import type { DocumentRow } from "@/lib/types/database";
import type { SupportedMimeType } from "@/lib/documents/mime";

/**
 * Der zentrale Produkt-Loop:
 *
 *   Datei lesen -> Text extrahieren -> Claude-Analyse -> Vorgang aktualisieren
 *   -> Fristen -> Aufgaben -> benötigte Unterlagen -> Formulare -> Timeline
 *
 * Jeder Schritt schreibt seinen Status ans Dokument, damit die UI den
 * Fortschritt nachvollziehbar anzeigen kann.
 */

export interface AnalysisOutcome {
  documentId: string;
  caseId: string;
  analysis: DocumentAnalysis;
  createdTaskCount: number;
  createdDeadlineCount: number;
  createdRequiredDocumentCount: number;
  createdFormCount: number;
}

export async function runDocumentAnalysis(params: {
  document: DocumentRow;
  userId: string;
  /** Optional bereits geladene Bytes, um einen erneuten Download zu sparen. */
  bytes?: Uint8Array;
  now?: Date;
}): Promise<AnalysisOutcome> {
  const { document, userId } = params;
  const caseId = document.case_id;
  const now = params.now ?? new Date();

  if (!caseId) throw new AppError("validation_failed", "Dem Dokument ist kein Vorgang zugeordnet.");

  try {
    // --- 1. Text extrahieren ------------------------------------------------
    await setDocumentStatus(document.id, "extracting");
    const bytes = params.bytes ?? (await downloadDocument(document.storage_path));

    const extraction = await extractText({
      bytes,
      mimeType: document.mime_type as SupportedMimeType,
      fileName: document.file_name,
    });

    await updateDocument(document.id, {
      status: "analyzing",
      extracted_text: extraction.text,
      extraction_method: extraction.method,
      page_count: extraction.pageCount,
    });

    await recordCaseEvent({
      userId,
      caseId,
      type: "text_extracted",
      title: "Text extrahiert",
      description: `${extraction.pageCount} Seite(n), Methode: ${extraction.method}`,
      metadata: { documentId: document.id, pageCount: extraction.pageCount },
    });

    // --- 2. Claude-Analyse --------------------------------------------------
    const { analysis, model, inputTokens, outputTokens } = await analyzeDocument({
      fileName: document.file_name,
      mimeType: document.mime_type as SupportedMimeType,
      text: extraction.text,
      bytes,
      now,
    });

    const supabase = await createSupabaseServerClient();
    await supabase.from("document_analysis").upsert(
      {
        user_id: userId,
        document_id: document.id,
        case_id: caseId,
        model,
        schema_version: DOCUMENT_ANALYSIS_SCHEMA_VERSION,
        result: analysis,
        document_type: analysis.documentType,
        authority_name: analysis.authority?.name ?? null,
        authority_confidence: analysis.authority?.confidence ?? null,
        summary: analysis.summary,
        uncertainty_notes: analysis.uncertaintyNotes,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
      },
      { onConflict: "document_id" },
    );

    // --- 3. Vorgang aktualisieren ------------------------------------------
    const shape = generateCaseShape(analysis, now);
    const authorityKey = matchAuthorityKey(analysis.authority?.name);

    await updateCase(caseId, {
      title: analysis.suggestedCaseTitle,
      authority_name: analysis.authority?.name ?? null,
      authority_key: authorityKey,
      case_type: analysis.caseType,
      reference_number: analysis.referenceNumber,
      summary: analysis.summary,
      status: shape.status,
      priority: shape.priority,
    });

    await updateDocument(document.id, {
      status: "analyzed",
      document_date: analysis.documentDate,
      error_message: null,
    });

    const events: RecordEventInput[] = [];

    if (analysis.authority) {
      events.push({
        userId,
        caseId,
        type: "authority_detected",
        title: `Behörde erkannt: ${analysis.authority.name}`,
        description:
          analysis.authority.confidence < 0.6
            ? "Nicht eindeutig erkannt. Bitte überprüfe diese Angabe."
            : null,
        metadata: { confidence: analysis.authority.confidence },
      });
    }

    // --- 4. Fristen ---------------------------------------------------------
    const deadlineIdByIndex = new Map<number, string>();
    if (shape.deadlines.length > 0) {
      const { data: insertedDeadlines, error } = await supabase
        .from("deadlines")
        .insert(
          shape.deadlines.map((deadline) => ({
            user_id: userId,
            case_id: caseId,
            source_document_id: document.id,
            title: deadline.title,
            description: deadline.description,
            due_date: deadline.dueDate,
            source_text: deadline.sourceText,
            source_page: deadline.sourcePage,
            confidence: deadline.confidence,
            extracted_at: now.toISOString(),
          })),
        )
        .select("id");

      if (error) {
        log.error("deadlines_insert_failed", { caseId, message: error.message });
        throw new AppError("database_failed", undefined, { cause: error });
      }

      (insertedDeadlines ?? []).forEach((row, index) => deadlineIdByIndex.set(index, row.id));

      events.push({
        userId,
        caseId,
        type: "deadline_detected",
        title:
          shape.deadlines.length === 1
            ? `Frist erkannt: ${formatGermanDate(shape.deadlines[0]!.dueDate)}`
            : `${shape.deadlines.length} Fristen erkannt`,
        metadata: { count: shape.deadlines.length, documentId: document.id },
      });
    }

    // --- 5. Aufgaben --------------------------------------------------------
    if (shape.tasks.length > 0) {
      const { error } = await supabase.from("tasks").insert(
        shape.tasks.map((task) => ({
          user_id: userId,
          case_id: caseId,
          source_document_id: document.id,
          deadline_id:
            task.deadlineIndex !== null
              ? (deadlineIdByIndex.get(task.deadlineIndex) ?? null)
              : null,
          title: task.title,
          description: task.description,
          is_required: task.isRequired,
          due_date: task.dueDate,
          position: task.position,
          source_text: task.sourceText,
          source_page: task.sourcePage,
          confidence: task.confidence,
          generated_by: "ai",
        })),
      );

      if (error) {
        log.error("tasks_insert_failed", { caseId, message: error.message });
        throw new AppError("database_failed", undefined, { cause: error });
      }

      events.push({
        userId,
        caseId,
        type: "tasks_created",
        title: `${shape.tasks.length} Aufgabe(n) erstellt`,
        metadata: { count: shape.tasks.length, documentId: document.id },
      });
    }

    // --- 6. Benötigte Unterlagen ------------------------------------------
    if (analysis.requiredDocuments.length > 0) {
      const { error } = await supabase.from("required_documents").insert(
        analysis.requiredDocuments.map((required) => ({
          user_id: userId,
          case_id: caseId,
          source_document_id: document.id,
          name: required.name,
          description: required.description,
          is_required: required.required,
        })),
      );
      if (error) {
        log.warn("required_documents_insert_failed", { caseId, message: error.message });
      } else {
        events.push({
          userId,
          caseId,
          type: "documents_required",
          title: `${analysis.requiredDocuments.length} benötigte Unterlage(n) erkannt`,
          metadata: { count: analysis.requiredDocuments.length },
        });
      }
    }

    // --- 7. Formulare -------------------------------------------------------
    const resolvedForms = resolveForms(analysis.mentionedForms, authorityKey);
    if (resolvedForms.length > 0) {
      const { error } = await supabase.from("forms").insert(
        resolvedForms.map((form) => ({
          user_id: userId,
          case_id: caseId,
          name: form.name,
          form_number: form.formNumber,
          description: form.description,
          official_url: form.officialUrl,
          source_kind: form.sourceKind,
          source_label: form.sourceLabel,
          authority_key: form.authorityKey,
        })),
      );
      if (error) {
        log.warn("forms_insert_failed", { caseId, message: error.message });
      } else {
        events.push({
          userId,
          caseId,
          type: "forms_detected",
          title: `${resolvedForms.length} Formular(e) zugeordnet`,
          metadata: { count: resolvedForms.length },
        });
      }
    }

    await recordCaseEvents(events);

    log.info("document_analysis_completed", {
      documentId: document.id,
      caseId,
      taskCount: shape.tasks.length,
      deadlineCount: shape.deadlines.length,
    });

    return {
      documentId: document.id,
      caseId,
      analysis,
      createdTaskCount: shape.tasks.length,
      createdDeadlineCount: shape.deadlines.length,
      createdRequiredDocumentCount: analysis.requiredDocuments.length,
      createdFormCount: resolvedForms.length,
    };
  } catch (error) {
    const message = toUserMessage(error);
    // Das Dokument bleibt gespeichert; der Nutzer kann die Analyse wiederholen.
    await setDocumentStatus(document.id, "failed", message).catch(() => {
      /* Statusupdate darf den Originalfehler nicht verdecken. */
    });
    await recordCaseEvent({
      userId,
      caseId,
      type: "analysis_failed",
      title: "Analyse fehlgeschlagen",
      description: message,
      metadata: { documentId: document.id },
    }).catch(() => {});

    log.error("document_analysis_failed", {
      documentId: document.id,
      caseId,
      code: error instanceof AppError ? error.code : "unknown",
    });
    throw error;
  }
}

function formatGermanDate(iso: string): string {
  const [year, month, day] = iso.split("-");
  return `${day}.${month}.${year}`;
}
