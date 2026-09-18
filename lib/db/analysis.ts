import "server-only";

import { documentAnalysisSchema, type DocumentAnalysis } from "@/lib/ai/schemas";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { log } from "@/lib/logging";

export interface StoredAnalysis {
  documentId: string;
  documentName: string | null;
  createdAt: string;
  analysis: DocumentAnalysis;
}

/**
 * Laedt die gespeicherten Analysen eines Vorgangs.
 *
 * Das Ergebnis wird beim Lesen erneut gegen das Schema validiert. Es ist
 * Modellausgabe aus der Vergangenheit - moeglicherweise aus einer aelteren
 * Schemaversion - und wird darum nie ungeprueft in die Oberflaeche gereicht.
 * Was nicht validiert, wird stillschweigend ausgelassen statt halb angezeigt.
 */
export async function listAnalysesForCase(caseId: string): Promise<StoredAnalysis[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("document_analysis")
    .select("document_id, created_at, result, documents(file_name)")
    .eq("case_id", caseId)
    .order("created_at", { ascending: false });

  if (error) {
    log.warn("analysis_list_failed", { caseId, message: error.message });
    return [];
  }

  const rows = (data ?? []) as unknown as {
    document_id: string;
    created_at: string;
    result: unknown;
    documents: { file_name: string } | null;
  }[];

  const analyses: StoredAnalysis[] = [];
  for (const row of rows) {
    const parsed = documentAnalysisSchema.safeParse(row.result);
    if (!parsed.success) {
      log.warn("stored_analysis_schema_mismatch", { documentId: row.document_id });
      continue;
    }
    analyses.push({
      documentId: row.document_id,
      documentName: row.documents?.file_name ?? null,
      createdAt: row.created_at,
      analysis: parsed.data,
    });
  }
  return analyses;
}
