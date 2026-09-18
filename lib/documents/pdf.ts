import "server-only";

import { AppError } from "@/lib/errors";
import { log } from "@/lib/logging";

export { hasUsableText, joinPages, splitPages } from "@/lib/documents/text";

export interface PdfExtraction {
  /** Seitenweise Texte, Index 0 = Seite 1. */
  pages: string[];
  pageCount: number;
}

/**
 * Extrahiert Text aus einem PDF.
 *
 * Kapselt `unpdf` vollständig, damit die Bibliothek später ohne Aenderung
 * an Aufrufern getauscht werden kann.
 */
export async function extractPdfPages(bytes: Uint8Array): Promise<PdfExtraction> {
  try {
    const { extractText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(bytes);
    const { text, totalPages } = await extractText(pdf, { mergePages: false });
    const pages = Array.isArray(text) ? text : [text];
    return { pages: pages.map((page) => page ?? ""), pageCount: totalPages ?? pages.length };
  } catch (error) {
    log.error("pdf_extraction_failed", {
      errorName: error instanceof Error ? error.name : "unknown",
    });
    throw new AppError("pdf_unreadable", undefined, { cause: error });
  }
}
