import { z } from "zod";

/**
 * Strukturiertes Ausgabeformat der Dokumentanalyse.
 *
 * Claude liefert ausschliesslich JSON gegen dieses Schema (Structured
 * Outputs). Alles, was nicht validiert, wird als Fehler behandelt - es wird
 * nie Freitext interpretiert.
 *
 * Kernidee "Evidence": Jede extrahierte Tatsache traegt, wo moeglich,
 * `sourceText` (woertliches Zitat) + `page` + `confidence`.
 */

export const DOCUMENT_ANALYSIS_SCHEMA_VERSION = 1;

/** Konfidenz 0..1. Werte < 0.6 werden in der UI als unsicher markiert. */
const confidence = z.number().min(0).max(1);

/** ISO-Datum YYYY-MM-DD. Claude darf hier nichts anderes liefern. */
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Datum muss im Format YYYY-MM-DD vorliegen");

export const evidenceSchema = z.object({
  /** Woertliches Zitat aus dem Dokument. Leer, wenn nicht belegbar. */
  sourceText: z.string().max(500).nullable(),
  /** 1-basierte Seitenzahl, falls bekannt. */
  page: z.number().int().positive().nullable(),
  confidence,
});

export const deadlineSchema = z.object({
  date: isoDate,
  title: z.string().min(1).max(160),
  description: z.string().max(600).nullable(),
  sourceText: z.string().max(500).nullable(),
  page: z.number().int().positive().nullable(),
  confidence,
});

export const requiredActionSchema = z.object({
  title: z.string().min(1).max(160),
  description: z.string().max(800).nullable(),
  deadline: isoDate.nullable(),
  required: z.boolean(),
  sourceText: z.string().max(500).nullable(),
  page: z.number().int().positive().nullable(),
  confidence,
});

export const requiredDocumentSchema = z.object({
  name: z.string().min(1).max(160),
  description: z.string().max(600).nullable(),
  required: z.boolean(),
});

export const mentionedFormSchema = z.object({
  name: z.string().min(1).max(160),
  formNumber: z.string().max(40).nullable(),
});

export const importantTermSchema = z.object({
  term: z.string().min(1).max(120),
  explanation: z.string().min(1).max(600),
});

export const authoritySchema = z.object({
  name: z.string().min(1).max(160),
  confidence,
});

export const documentAnalysisSchema = z.object({
  /** z.B. "Bescheid", "Mitwirkungsaufforderung", "Anhoerung". */
  documentType: z.string().min(1).max(120),
  authority: authoritySchema.nullable(),
  /** Vorgangsart, z.B. "weiterbewilligung". */
  caseType: z.string().max(120).nullable(),
  /** Aktenzeichen / BG-Nummer / Steuernummer. */
  referenceNumber: z.string().max(120).nullable(),
  /** Datum des Schreibens. */
  documentDate: isoDate.nullable(),
  /** Kurzer, sprechender Titel fuer den Vorgang. */
  suggestedCaseTitle: z.string().min(1).max(120),
  deadlines: z.array(deadlineSchema).max(20),
  requiredActions: z.array(requiredActionSchema).max(20),
  requiredDocuments: z.array(requiredDocumentSchema).max(20),
  mentionedForms: z.array(mentionedFormSchema).max(10),
  importantTerms: z.array(importantTermSchema).max(10),
  /** Verstaendliche Zusammenfassung in einfachem Deutsch. */
  summary: z.string().min(1).max(1500),
  /** Explizite Hinweise, was unsicher oder nicht eindeutig erkannt wurde. */
  uncertaintyNotes: z.array(z.string().max(300)).max(15),
  /** True, wenn das Dokument keine erkennbare Behoerdenpost ist. */
  looksLikeAuthorityLetter: z.boolean(),
});

export type DocumentAnalysis = z.infer<typeof documentAnalysisSchema>;
export type ExtractedDeadline = z.infer<typeof deadlineSchema>;
export type ExtractedAction = z.infer<typeof requiredActionSchema>;
export type ExtractedRequiredDocument = z.infer<typeof requiredDocumentSchema>;
export type MentionedForm = z.infer<typeof mentionedFormSchema>;

/** Antwortschreiben-Entwurf. */
export const letterDraftSchema = z.object({
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(6000),
  /** Punkte, die der Nutzer vor dem Versand pruefen/ergaenzen muss. */
  openPoints: z.array(z.string().max(300)).max(10),
});

export type LetterDraft = z.infer<typeof letterDraftSchema>;

/** Schwelle, ab der eine Angabe in der UI als "bitte pruefen" markiert wird. */
export const LOW_CONFIDENCE_THRESHOLD = 0.6;

export function isLowConfidence(value: number | null | undefined): boolean {
  if (value === null || value === undefined) return true;
  return value < LOW_CONFIDENCE_THRESHOLD;
}
