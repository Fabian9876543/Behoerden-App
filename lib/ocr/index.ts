import "server-only";

import { AppError } from "@/lib/errors";
import { claudeVisionOcr } from "@/lib/ocr/claude-vision";
import type { OcrInput, OcrProvider, OcrResult } from "@/lib/ocr/provider";

export type { OcrInput, OcrProvider, OcrResult } from "@/lib/ocr/provider";

/**
 * Registrierte OCR-Provider, in Reihenfolge der Bevorzugung.
 * Neue Provider werden hier ergaenzt - Aufrufer bleiben unveraendert.
 */
const PROVIDERS: OcrProvider[] = [claudeVisionOcr];

export function getOcrProvider(mimeType: string): OcrProvider {
  const provider = PROVIDERS.find((p) => p.supports(mimeType));
  if (!provider) throw new AppError("ocr_failed");
  return provider;
}

export async function runOcr(input: OcrInput): Promise<OcrResult> {
  return getOcrProvider(input.mimeType).recognize(input);
}
