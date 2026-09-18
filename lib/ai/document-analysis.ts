import "server-only";

import { requestStructured, type DocumentBlock } from "@/lib/ai/claude";
import { DOCUMENT_ANALYSIS_SYSTEM, documentAnalysisInstruction } from "@/lib/ai/prompts";
import { sanitizeAnalysis } from "@/lib/ai/analysis-sanitizer";
import { documentAnalysisSchema, type DocumentAnalysis } from "@/lib/ai/schemas";
import { toIsoDate } from "@/lib/dates";
import { isImageMimeType, type SupportedMimeType } from "@/lib/documents/mime";

export interface AnalyzeDocumentInput {
  fileName: string;
  mimeType: SupportedMimeType;
  /** Bereits extrahierter Text mit "--- Seite N ---"-Markern. */
  text: string;
  /**
   * Rohbytes. Werden nur genutzt, wenn der Textlayer duenn ist - dann sieht
   * Claude das Original und kann Layoutinformationen mitlesen.
   */
  bytes?: Uint8Array;
  now?: Date;
}

export interface AnalyzeDocumentResult {
  analysis: DocumentAnalysis;
  model: string;
  inputTokens: number | null;
  outputTokens: number | null;
}

/** Ab dieser Textlaenge reicht der extrahierte Text ohne Originaldatei. */
const TEXT_ONLY_THRESHOLD = 400;

/**
 * Fuehrt die strukturierte Dokumentanalyse durch.
 *
 * Reine Extraktion - es wird nichts gespeichert und nichts abgeleitet.
 * Persistenz und Ableitungen passieren in lib/db/analysis-pipeline.ts.
 */
export async function analyzeDocument(
  input: AnalyzeDocumentInput,
): Promise<AnalyzeDocumentResult> {
  const now = input.now ?? new Date();
  const compactText = input.text.replace(/\s/g, "");
  const useOriginal = Boolean(input.bytes) && compactText.length < TEXT_ONLY_THRESHOLD;

  const blocks: DocumentBlock[] = [];

  if (useOriginal && input.bytes) {
    const base64 = Buffer.from(input.bytes).toString("base64");
    if (isImageMimeType(input.mimeType)) {
      blocks.push({ kind: "image", base64, mediaType: input.mimeType });
    } else {
      blocks.push({ kind: "pdf", base64 });
    }
  }

  if (input.text.trim().length > 0) {
    blocks.push({
      kind: "text",
      text: `Dokumenttext:\n\n${input.text}`,
    });
  }

  const result = await requestStructured({
    system: DOCUMENT_ANALYSIS_SYSTEM,
    blocks,
    instruction: documentAnalysisInstruction({
      todayIso: toIsoDate(now),
      fileName: input.fileName,
      hasImages: useOriginal && isImageMimeType(input.mimeType),
    }),
    schema: documentAnalysisSchema,
    effort: "high",
  });

  return {
    analysis: sanitizeAnalysis(result.data, now),
    model: result.model,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
  };
}

export { sanitizeAnalysis } from "@/lib/ai/analysis-sanitizer";
