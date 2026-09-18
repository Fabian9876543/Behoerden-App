import "server-only";

import { extractPdfPages } from "@/lib/documents/pdf";
import { hasUsableText, joinPages } from "@/lib/documents/text";
import { runOcr } from "@/lib/ocr";
import { log } from "@/lib/logging";
import type { SupportedMimeType } from "@/lib/documents/mime";

export interface TextExtractionResult {
  pages: string[];
  text: string;
  pageCount: number;
  /** "pdf-text" oder "ocr:<provider>" - wird am Dokument gespeichert. */
  method: string;
}

/**
 * Holt den Text aus einer hochgeladenen Datei.
 *
 * Strategie:
 *   PDF   -> eingebetteten Text lesen; bei reinem Scan auf OCR ausweichen.
 *   Bild  -> direkt OCR.
 *
 * Die Funktion wirft nur AppError; Aufrufer koennen die Meldung direkt zeigen.
 */
export async function extractText(params: {
  bytes: Uint8Array;
  mimeType: SupportedMimeType;
  fileName: string;
}): Promise<TextExtractionResult> {
  if (params.mimeType === "application/pdf") {
    const { pages, pageCount } = await extractPdfPages(params.bytes);

    if (hasUsableText(pages)) {
      return {
        pages,
        text: joinPages(pages),
        pageCount,
        method: "pdf-text",
      };
    }

    log.info("pdf_without_text_layer_falling_back_to_ocr", { pageCount });
    const ocr = await runOcr({
      bytes: params.bytes,
      mimeType: params.mimeType,
      fileName: params.fileName,
    });
    return {
      pages: ocr.pages,
      text: joinPages(ocr.pages),
      pageCount: ocr.pages.length || pageCount,
      method: `ocr:${ocr.provider}`,
    };
  }

  const ocr = await runOcr({
    bytes: params.bytes,
    mimeType: params.mimeType,
    fileName: params.fileName,
  });
  return {
    pages: ocr.pages,
    text: joinPages(ocr.pages),
    pageCount: ocr.pages.length,
    method: `ocr:${ocr.provider}`,
  };
}
