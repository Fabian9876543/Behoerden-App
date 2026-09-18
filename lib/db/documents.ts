import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/errors";
import { log } from "@/lib/logging";
import type { DocumentRow, DocumentStatus, DocumentListItem } from "@/lib/db/types";
import type { SupportedMimeType } from "@/lib/documents/mime";

export async function createDocumentRecord(params: {
  id: string;
  userId: string;
  caseId: string;
  fileName: string;
  mimeType: SupportedMimeType;
  sizeBytes: number;
  storagePath: string;
  isDemo?: boolean;
}): Promise<DocumentRow> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("documents")
    .insert({
      id: params.id,
      user_id: params.userId,
      case_id: params.caseId,
      file_name: params.fileName,
      mime_type: params.mimeType,
      size_bytes: params.sizeBytes,
      storage_path: params.storagePath,
      status: "uploaded",
      source: params.isDemo ? "demo" : "upload",
      is_demo: params.isDemo ?? false,
    })
    .select("*")
    .single();

  if (error || !data) {
    log.error("document_insert_failed", { message: error?.message ?? "no data" });
    throw new AppError("database_failed", undefined, { cause: error });
  }
  return data;
}

export async function updateDocument(
  documentId: string,
  patch: Partial<
    Pick<
      DocumentRow,
      | "status"
      | "extracted_text"
      | "extraction_method"
      | "page_count"
      | "document_date"
      | "error_message"
      | "case_id"
    >
  >,
): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("documents").update(patch).eq("id", documentId);
  if (error) {
    log.error("document_update_failed", { documentId, message: error.message });
    throw new AppError("database_failed", undefined, { cause: error });
  }
}

export async function setDocumentStatus(
  documentId: string,
  status: DocumentStatus,
  errorMessage?: string,
): Promise<void> {
  await updateDocument(documentId, {
    status,
    error_message: errorMessage ?? null,
  });
}

export async function getDocument(documentId: string): Promise<DocumentRow | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("documents").select("*").eq("id", documentId).maybeSingle();
  return data ?? null;
}

export async function requireDocument(documentId: string, userId: string): Promise<DocumentRow> {
  const document = await getDocument(documentId);
  if (!document || document.user_id !== userId) throw new AppError("not_found");
  return document;
}

export async function listDocuments(userId: string): Promise<DocumentListItem[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("documents")
    .select("*, cases(id, title, authority_name)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    log.error("documents_list_failed", { message: error.message });
    throw new AppError("database_failed", undefined, { cause: error });
  }
  return (data ?? []) as unknown as DocumentListItem[];
}

export async function deleteDocumentRecord(documentId: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("documents").delete().eq("id", documentId);
  if (error) {
    log.error("document_delete_failed", { documentId, message: error.message });
    throw new AppError("database_failed", undefined, { cause: error });
  }
}

/** Alle Storage-Pfade eines Vorgangs - wird vor dem Löschen gebraucht. */
export async function listStoragePathsForCase(caseId: string): Promise<string[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("documents").select("storage_path").eq("case_id", caseId);
  return (data ?? []).map((row) => row.storage_path);
}
