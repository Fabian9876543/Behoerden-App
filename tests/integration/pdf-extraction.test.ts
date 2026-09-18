import { describe, expect, it } from "vitest";
import { extractPdfPages } from "@/lib/documents/pdf";
import { hasUsableText, joinPages } from "@/lib/documents/text";
import { AppError } from "@/lib/errors";
import { buildTestPdf, JOBCENTER_LETTER_PAGES } from "../fixtures/pdf";

/**
 * Prüft die PDF-Textextraktion gegen echte PDF-Dateien.
 *
 * Das ist der erste Schritt des Produkt-Loops und die einzige Stelle, an der
 * eine externe Bibliothek (unpdf) das Ergebnis bestimmt. Die Seitenzuordnung
 * muss stimmen, weil sich die Quellenangaben ("Seite 2") darauf stützen.
 */
describe("extractPdfPages", () => {
  it("liest den Text eines mehrseitigen PDFs", async () => {
    const result = await extractPdfPages(buildTestPdf(JOBCENTER_LETTER_PAGES));

    expect(result.pageCount).toBe(2);
    expect(result.pages).toHaveLength(2);
    expect(result.pages[0]).toContain("Jobcenter Musterstadt");
    expect(result.pages[0]).toContain("15.10.2026");
  });

  it("ordnet den Text der richtigen Seite zu", async () => {
    const result = await extractPdfPages(buildTestPdf(JOBCENTER_LETTER_PAGES));

    // Die Quellenangabe "Seite 2" ist nur so viel wert wie diese Zuordnung.
    expect(result.pages[0]).not.toContain("Mietbescheinigung");
    expect(result.pages[1]).toContain("Mietbescheinigung");
    expect(result.pages[1]).toContain("Kontoauszuege");
  });

  it("erzeugt Seitenmarker, an denen sich die Analyse orientieren kann", async () => {
    const result = await extractPdfPages(buildTestPdf(JOBCENTER_LETTER_PAGES));
    const joined = joinPages(result.pages);

    expect(joined).toContain("--- Seite 1 ---");
    expect(joined).toContain("--- Seite 2 ---");
    expect(joined.indexOf("Jobcenter")).toBeLessThan(joined.indexOf("--- Seite 2 ---"));
  });

  it("erkennt einen brauchbaren Textlayer", async () => {
    const result = await extractPdfPages(buildTestPdf(JOBCENTER_LETTER_PAGES));
    expect(hasUsableText(result.pages)).toBe(true);
  });

  it("erkennt ein PDF ohne Textlayer als Scan", async () => {
    // Leere Seiten stehen fuer ein eingescanntes Dokument: Der Aufrufer muss
    // dann auf OCR ausweichen statt eine leere Analyse zu starten.
    const result = await extractPdfPages(buildTestPdf([[""], [""]]));
    expect(hasUsableText(result.pages)).toBe(false);
  });

  it("meldet eine kaputte Datei als lesbaren Fehler", async () => {
    const garbage = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x00, 0x01]);
    await expect(extractPdfPages(garbage)).rejects.toBeInstanceOf(AppError);
    await expect(extractPdfPages(garbage)).rejects.toMatchObject({ code: "pdf_unreadable" });
  });
});
