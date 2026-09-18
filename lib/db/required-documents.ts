import "server-only";

import { AppError } from "@/lib/errors";
import { log } from "@/lib/logging";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { RequiredDocumentRow } from "@/lib/types/database";

export async function requireRequiredDocument(
  id: string,
  userId: string,
): Promise<RequiredDocumentRow> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("required_documents")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!data || data.user_id !== userId) throw new AppError("not_found");
  return data;
}

/**
 * Markiert eine benoetigte Unterlage als vorhanden - optional verknuepft mit
 * dem hochgeladenen Dokument, das sie abdeckt.
 */
export async function setRequiredDocumentFulfilled(
  id: string,
  documentId: string | null,
): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("required_documents")
    .update({
      fulfilled_by_document_id: documentId,
      fulfilled_at: documentId ? new Date().toISOString() : null,
    })
    .eq("id", id);

  if (error) {
    log.error("required_document_update_failed", { id, message: error.message });
    throw new AppError("database_failed", undefined, { cause: error });
  }
}
