import type { CaseRow, DocumentRow } from "@/lib/types/database";

export type { DocumentRow, DocumentStatus } from "@/lib/types/database";

/** Dokument inklusive minimaler Vorgangsinfo für die Dokumentliste. */
export interface DocumentListItem extends DocumentRow {
  cases: Pick<CaseRow, "id" | "title" | "authority_name"> | null;
}
