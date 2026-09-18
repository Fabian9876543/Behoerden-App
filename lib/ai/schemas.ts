import { z } from "zod";

/**
 * Strukturiertes Ausgabeformat der Dokumentanalyse.
 *
 * Claude liefert ausschließlich JSON gegen dieses Schema (Structured
 * Outputs). Alles, was nicht validiert, wird als Fehler behandelt - es wird
 * nie Freitext interpretiert.
 *
 * Kernidee "Evidence": Jede extrahierte Tatsache trägt, wo möglich,
 * `sourceText` (wörtliches Zitat) + `page` + `confidence`.
 */

export const DOCUMENT_ANALYSIS_SCHEMA_VERSION = 1;

/** Konfidenz 0..1. Werte < 0.6 werden in der UI als unsicher markiert. */
const confidence = z.number().min(0).max(1);

/** ISO-Datum YYYY-MM-DD. Claude darf hier nichts anderes liefern. */
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Datum muss im Format YYYY-MM-DD vorliegen");

/**
 * Obergrenzen für Fließtext.
 *
 * Bewusst NICHT Teil des Zod-Schemas. Structured Outputs unterstützen weder
 * maxLength (der SDK-Helper verschiebt es in die `description`) noch
 * Transforms oder dynamische catch-Werte - beides bricht die Umwandlung in
 * ein JSON-Schema. Die Grenzen werden darum in sanitizeAnalysis angewendet,
 * und dort wird **gekürzt statt verworfen**: Eine um ein paar Zeichen zu
 * lange Zusammenfassung darf nicht die gesamte Analyse mitreißen, denn mit
 * ihr gingen auch alle erkannten Fristen und Aufgaben verloren.
 *
 * Für alles, was eine Frist oder Pflicht verbergen könnte, gilt das
 * ausdrücklich nicht: Das Datumsformat und die Obergrenzen der Fristen- und
 * Aufgabenlisten bleiben im Schema und lehnen ab. Lieber sichtbar scheitern,
 * als still eine Frist zu unterschlagen.
 */
export const TEXT_LIMITS = {
  documentType: 120,
  authorityName: 160,
  caseType: 120,
  referenceNumber: 120,
  caseTitle: 120,
  summary: 1500,
  title: 160,
  description: 800,
  sourceText: 500,
  name: 160,
  formNumber: 40,
  term: 120,
  explanation: 600,
  note: 300,
  subject: 200,
  body: 6000,
} as const;

/** Kürzt Fließtext auf die Speichergrenze und entfernt Randleerzeichen. */
export function capText(value: string, max: number): string {
  return value.trim().slice(0, max);
}

/** Wie capText, macht aber aus einem leer gewordenen Text null. */
export function capNullable(value: string | null, max: number): string | null {
  if (value === null) return null;
  const capped = capText(value, max);
  return capped.length > 0 ? capped : null;
}

/**
 * Pflicht-Fließtext: mindestens ein Zeichen, das kein Leerraum ist.
 *
 * Als Regex statt .trim().min(1), weil ein Transform die Umwandlung in ein
 * JSON-Schema bricht. Erzwungen wird die Regel ohnehin erst beim Parsen -
 * Structured Outputs verschiebt sowohl `pattern` als auch `maxLength` in die
 * Beschreibung des Schemas.
 */
const nonBlank = z.string().regex(/\S/, "Darf nicht leer sein.");

export const deadlineSchema = z.object({
  date: isoDate,
  title: nonBlank,
  description: z.string().nullable(),
  sourceText: z.string().nullable(),
  page: z.number().int().positive().nullable(),
  confidence,
});

export const requiredActionSchema = z.object({
  title: nonBlank,
  description: z.string().nullable(),
  deadline: isoDate.nullable(),
  required: z.boolean(),
  sourceText: z.string().nullable(),
  page: z.number().int().positive().nullable(),
  confidence,
});

export const requiredDocumentSchema = z.object({
  name: nonBlank,
  description: z.string().nullable(),
  required: z.boolean(),
});

export const mentionedFormSchema = z.object({
  name: nonBlank,
  formNumber: z.string().nullable(),
});

export const importantTermSchema = z.object({
  term: nonBlank,
  explanation: nonBlank,
});

export const authoritySchema = z.object({
  name: nonBlank,
  confidence,
});

export const documentAnalysisSchema = z.object({
  /** z.B. "Bescheid", "Mitwirkungsaufforderung", "Anhörung". */
  documentType: nonBlank,
  authority: authoritySchema.nullable(),
  /** Vorgangsart, z.B. "weiterbewilligung". */
  caseType: z.string().nullable(),
  /** Aktenzeichen / BG-Nummer / Steuernummer. */
  referenceNumber: z.string().nullable(),
  /** Datum des Schreibens. */
  documentDate: isoDate.nullable(),
  /** Kurzer, sprechender Titel für den Vorgang. */
  suggestedCaseTitle: nonBlank,
  deadlines: z.array(deadlineSchema).max(20),
  requiredActions: z.array(requiredActionSchema).max(20),
  requiredDocuments: z.array(requiredDocumentSchema).max(20),
  mentionedForms: z.array(mentionedFormSchema).max(10),
  importantTerms: z.array(importantTermSchema).max(10),
  /** Verständliche Zusammenfassung in einfachem Deutsch. */
  summary: nonBlank,
  /** Explizite Hinweise, was unsicher oder nicht eindeutig erkannt wurde. */
  uncertaintyNotes: z.array(z.string()).max(15),
  /** True, wenn das Dokument keine erkennbare Behördenpost ist. */
  looksLikeAuthorityLetter: z.boolean(),
});

export type DocumentAnalysis = z.infer<typeof documentAnalysisSchema>;
export type ExtractedDeadline = z.infer<typeof deadlineSchema>;
export type ExtractedAction = z.infer<typeof requiredActionSchema>;
export type ExtractedRequiredDocument = z.infer<typeof requiredDocumentSchema>;
export type MentionedForm = z.infer<typeof mentionedFormSchema>;

/** Antwortschreiben-Entwurf. */
export const letterDraftSchema = z.object({
  subject: nonBlank,
  body: nonBlank,
  /** Punkte, die der Nutzer vor dem Versand prüfen/ergänzen muss. */
  openPoints: z.array(z.string()).max(10),
});

export type LetterDraft = z.infer<typeof letterDraftSchema>;

/** Schwelle, ab der eine Angabe in der UI als "bitte prüfen" markiert wird. */
export const LOW_CONFIDENCE_THRESHOLD = 0.6;

export function isLowConfidence(value: number | null | undefined): boolean {
  if (value === null || value === undefined) return true;
  return value < LOW_CONFIDENCE_THRESHOLD;
}
