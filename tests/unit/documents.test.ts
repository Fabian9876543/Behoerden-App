import { describe, expect, it } from "vitest";
import {
  assertMimeMatchesContent,
  assertUploadable,
  extensionFor,
  isImageMimeType,
  isSupportedMimeType,
  sniffMimeType,
} from "@/lib/documents/mime";
import { hasUsableText, joinPages, splitPages } from "@/lib/documents/text";
import { buildStoragePath, userIdFromStoragePath } from "@/lib/storage/paths";
import { AppError } from "@/lib/errors";

const PDF_BYTES = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]);
const JPEG_BYTES = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const GIF_BYTES = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00]);

describe("sniffMimeType", () => {
  it("erkennt die unterstuetzten Formate", () => {
    expect(sniffMimeType(PDF_BYTES)).toBe("application/pdf");
    expect(sniffMimeType(JPEG_BYTES)).toBe("image/jpeg");
    expect(sniffMimeType(PNG_BYTES)).toBe("image/png");
  });

  it("lehnt nicht unterstuetzte Formate ab", () => {
    expect(sniffMimeType(GIF_BYTES)).toBeNull();
    expect(sniffMimeType(new Uint8Array([1, 2]))).toBeNull();
  });
});

describe("assertMimeMatchesContent", () => {
  it("vertraut dem Dateiinhalt, nicht dem gemeldeten Typ", () => {
    // Browser melden fuer manche Scans einen falschen Typ.
    expect(assertMimeMatchesContent("image/jpg", JPEG_BYTES)).toBe("image/jpeg");
  });

  it("enttarnt eine umbenannte Datei", () => {
    expect(() => assertMimeMatchesContent("application/pdf", GIF_BYTES)).toThrow(AppError);
  });
});

describe("assertUploadable", () => {
  it("laesst gueltige Uploads durch", () => {
    expect(() =>
      assertUploadable({ mimeType: "application/pdf", sizeBytes: 1024 }),
    ).not.toThrow();
  });

  it("lehnt zu grosse Dateien ab", () => {
    try {
      assertUploadable({ mimeType: "application/pdf", sizeBytes: 50 * 1024 * 1024 });
      expect.unreachable("sollte werfen");
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).code).toBe("file_too_large");
    }
  });

  it("lehnt falsche Dateitypen ab", () => {
    try {
      assertUploadable({ mimeType: "application/zip", sizeBytes: 100 });
      expect.unreachable("sollte werfen");
    } catch (error) {
      expect((error as AppError).code).toBe("unsupported_file_type");
    }
  });

  it("lehnt leere Dateien ab", () => {
    expect(() => assertUploadable({ mimeType: "image/png", sizeBytes: 0 })).toThrow(AppError);
  });
});

describe("mime helpers", () => {
  it("klassifiziert Typen", () => {
    expect(isSupportedMimeType("application/pdf")).toBe(true);
    expect(isSupportedMimeType("text/plain")).toBe(false);
    expect(isImageMimeType("image/png")).toBe(true);
    expect(isImageMimeType("application/pdf")).toBe(false);
  });

  it("liefert passende Endungen", () => {
    expect(extensionFor("application/pdf")).toBe("pdf");
    expect(extensionFor("image/jpeg")).toBe("jpg");
    expect(extensionFor("image/png")).toBe("png");
  });
});

describe("PDF-Textauswertung", () => {
  it("markiert Seiten fuer die Quellenangabe", () => {
    const joined = joinPages(["Erste Seite", "Zweite Seite"]);
    expect(joined).toContain("--- Seite 1 ---");
    expect(joined).toContain("--- Seite 2 ---");
  });

  it("erkennt brauchbaren Textlayer", () => {
    expect(hasUsableText([`${"Sehr geehrte Damen und Herren. ".repeat(10)}`])).toBe(true);
  });

  it("erkennt reine Scans ohne Textlayer", () => {
    expect(hasUsableText(["", "  ", "\n"])).toBe(false);
    expect(hasUsableText(["Seite 1"])).toBe(false);
  });
});

describe("splitPages", () => {
  it("zerlegt OCR-Ausgaben an den Seitenmarkern", () => {
    const pages = splitPages("--- Seite 1 ---\nHallo\n--- Seite 2 ---\nWelt");
    expect(pages).toEqual(["Hallo", "Welt"]);
  });

  it("liefert eine Seite, wenn keine Marker vorhanden sind", () => {
    expect(splitPages("Nur Text")).toEqual(["Nur Text"]);
  });
});

describe("Storage-Pfade", () => {
  const userId = "11111111-1111-4111-8111-111111111111";
  const caseId = "22222222-2222-4222-8222-222222222222";
  const documentId = "33333333-3333-4333-8333-333333333333";

  it("baut den user-scoped Pfad", () => {
    const path = buildStoragePath({ userId, caseId, documentId, mimeType: "application/pdf" });
    expect(path).toBe(`users/${userId}/cases/${caseId}/documents/${documentId}.pdf`);
  });

  it("liest die User-ID aus dem Pfad", () => {
    const path = buildStoragePath({ userId, caseId, documentId, mimeType: "image/png" });
    expect(userIdFromStoragePath(path)).toBe(userId);
  });

  it("gibt null bei fremdem Pfadschema", () => {
    expect(userIdFromStoragePath("public/irgendwas.pdf")).toBeNull();
  });
});
