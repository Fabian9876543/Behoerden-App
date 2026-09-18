/**
 * Reine Textauswertung fuer Dokumente - ohne I/O, damit sie ueberall
 * nutzbar und vollstaendig testbar ist.
 */

/**
 * Fuegt Seitentexte mit Seitenmarkern zusammen.
 * Die Marker sind fuer die KI relevant: nur so kann sie `page` korrekt setzen.
 */
export function joinPages(pages: string[]): string {
  return pages
    .map((page, index) => `--- Seite ${index + 1} ---\n${page.trim()}`)
    .join("\n\n")
    .trim();
}

/**
 * Heuristik: Hat das PDF genug echten Text, oder ist es ein reiner Scan?
 * Gescannte PDFs liefern typischerweise 0-20 Zeichen pro Seite.
 */
export function hasUsableText(pages: string[]): boolean {
  const total = pages.reduce((sum, page) => sum + page.replace(/\s/g, "").length, 0);
  if (total < 120) return false;
  const perPage = total / Math.max(pages.length, 1);
  return perPage >= 40;
}

/** Zerlegt einen Text an den "--- Seite N ---"-Markern. */
export function splitPages(text: string): string[] {
  const parts = text.split(/^\s*-{2,}\s*Seite\s+\d+\s*-{2,}\s*$/gim);
  const pages = parts.map((part) => part.trim()).filter((part) => part.length > 0);
  return pages.length > 0 ? pages : [text.trim()];
}
