/**
 * OCR-Schnittstelle.
 *
 * Bewusst minimal gehalten, damit der Provider später ohne Aenderung an
 * Aufrufern getauscht werden kann (z.B. Google Document AI, AWS Textract,
 * Azure Document Intelligence oder ein selbst gehostetes Tesseract).
 *
 * Ein Provider bekommt die Rohbytes und den MIME-Typ und liefert Text -
 * seitenweise, damit die Evidence-Anzeige ("Seite 2") funktioniert.
 */

export interface OcrInput {
  bytes: Uint8Array;
  mimeType: "application/pdf" | "image/jpeg" | "image/png";
  fileName: string;
}

export interface OcrResult {
  /** Seitenweise erkannter Text, Index 0 = Seite 1. */
  pages: string[];
  /** Kennung des verwendeten Providers, z.B. "claude-vision". */
  provider: string;
}

export interface OcrProvider {
  readonly name: string;
  /** Kann dieser Provider den Dateityp verarbeiten? */
  supports(mimeType: string): boolean;
  recognize(input: OcrInput): Promise<OcrResult>;
}
