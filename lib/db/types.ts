import type { CaseRow, DocumentRow } from "@/lib/types/database";

export type { DocumentRow, DocumentStatus } from "@/lib/types/database";

/** Dokument inklusive minimaler Vorgangsinfo fuer die Dokumentliste. */
export interface DocumentListItem extends DocumentRow {
  cases: Pick<CaseRow, "id" | "title" | "authority_name"> | null;
}
