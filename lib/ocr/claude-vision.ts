import "server-only";

import { requestText, type DocumentBlock } from "@/lib/ai/claude";
import { OCR_INSTRUCTION, OCR_SYSTEM } from "@/lib/ai/prompts";
import { splitPages } from "@/lib/documents/text";
import { AppError } from "@/lib/errors";
import type { OcrInput, OcrProvider, OcrResult } from "@/lib/ocr/provider";

/**
 * OCR ueber Claude Vision.
 *
 * MVP-Default: Es wird kein zusaetzlicher Anbieter und kein weiteres
 * Systempaket benoetigt, und die Erkennungsqualitaet bei deutschen
 * Behoerdenbriefen ist gut. Fuer hohe Volumina laesst sich hier ein
 * spezialisierter OCR-Dienst einhaengen, ohne Aufrufer zu aendern.
 */
export const claudeVisionOcr: OcrProvider = {
  name: "claude-vision",

  supports(mimeType: string): boolean {
    return (
      mimeType === "application/pdf" || mimeType === "image/jpeg" || mimeType === "image/png"
    );
  },

  async recognize(input: OcrInput): Promise<OcrResult> {
    const base64 = Buffer.from(input.bytes).toString("base64");

    const block: DocumentBlock =
      input.mimeType === "application/pdf"
        ? { kind: "pdf", base64 }
        : { kind: "image", base64, mediaType: input.mimeType };

    const text = await requestText({
      system: OCR_SYSTEM,
      blocks: [block],
      instruction: OCR_INSTRUCTION,
    });

    if (!text || text.replace(/\s/g, "").length < 20) {
      throw new AppError("ocr_failed");
    }

    return { pages: splitPages(text), provider: claudeVisionOcr.name };
  },
};
