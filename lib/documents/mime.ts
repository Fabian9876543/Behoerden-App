import { AppError } from "@/lib/errors";

export const SUPPORTED_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png"] as const;
export type SupportedMimeType = (typeof SUPPORTED_MIME_TYPES)[number];

export const DEFAULT_MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

/**
 * Obergrenze auf Vercel.
 *
 * Eine Serverless Function bekommt dort höchstens rund 4,5 MB Request-Body -
 * eine Plattformgrenze, die `serverActions.bodySizeLimit` nicht anhebt. Ohne
 * eigene Grenze darunter stirbt ein größerer Scan an der Plattform, bevor die
 * Anwendung ihn ablehnen kann: Die Person sähe einen nackten 413 statt einer
 * deutschen Meldung. `lib/env.ts` schaltet darauf um, sobald `VERCEL` gesetzt
 * ist.
 */
export const VERCEL_MAX_UPLOAD_BYTES = 4 * 1024 * 1024; // 4 MB

/** "10 MB" - eine Zahl, die Meldung und Oberfläche gemeinsam nutzen. */
export function describeMaxUploadSize(maxBytes: number): string {
  return `${Math.floor(maxBytes / (1024 * 1024))} MB`;
}

export function isSupportedMimeType(value: string): value is SupportedMimeType {
  return (SUPPORTED_MIME_TYPES as readonly string[]).includes(value);
}

export function isImageMimeType(value: string): value is "image/jpeg" | "image/png" {
  return value === "image/jpeg" || value === "image/png";
}

/**
 * Prüft Dateityp und -größe, bevor irgendetwas gespeichert wird.
 * Vertraut dem vom Browser gemeldeten MIME-Typ nicht allein, sondern prüft
 * zusätzlich die Magic Bytes.
 */
export function assertUploadable(params: {
  mimeType: string;
  sizeBytes: number;
  maxBytes?: number;
}): void {
  const maxBytes = params.maxBytes ?? DEFAULT_MAX_UPLOAD_BYTES;
  if (!isSupportedMimeType(params.mimeType)) {
    throw new AppError("unsupported_file_type");
  }
  if (params.sizeBytes <= 0) {
    throw new AppError("validation_failed", "Die Datei ist leer.");
  }
  if (params.sizeBytes > maxBytes) {
    throw new AppError(
      "file_too_large",
      `Die Datei ist zu groß. Erlaubt sind maximal ${describeMaxUploadSize(maxBytes)}.`,
    );
  }
}

/**
 * Erkennt den echten Dateityp anhand der Magic Bytes.
 * Liefert null, wenn der Typ nicht zu den unterstützten gehört.
 */
export function sniffMimeType(bytes: Uint8Array): SupportedMimeType | null {
  if (bytes.length < 8) return null;

  // %PDF
  if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
    return "application/pdf";
  }
  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (pngSignature.every((byte, index) => bytes[index] === byte)) {
    return "image/png";
  }
  return null;
}

/** Wirft, wenn der gemeldete Typ nicht zum tatsächlichen Dateiinhalt passt. */
export function assertMimeMatchesContent(reported: string, bytes: Uint8Array): SupportedMimeType {
  const actual = sniffMimeType(bytes);
  if (!actual) throw new AppError("unsupported_file_type");
  if (actual !== reported) {
    // Der Browser meldet für manche Scans image/jpg o.ae. - der echte Typ gewinnt.
    return actual;
  }
  return actual;
}

export function extensionFor(mimeType: SupportedMimeType): string {
  switch (mimeType) {
    case "application/pdf":
      return "pdf";
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
  }
}
