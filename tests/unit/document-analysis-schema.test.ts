import { describe, expect, it } from "vitest";
import { documentAnalysisSchema, isLowConfidence } from "@/lib/ai/schemas";
import { sanitizeAnalysis } from "@/lib/ai/analysis-sanitizer";
import { makeAnalysis } from "../fixtures/analysis";

describe("documentAnalysisSchema", () => {
  it("akzeptiert eine vollständige Analyse", () => {
    const result = documentAnalysisSchema.safeParse(makeAnalysis());
    expect(result.success).toBe(true);
  });

  it("lehnt ein Datum ab, das nicht ISO-formatiert ist", () => {
    const result = documentAnalysisSchema.safeParse(
      makeAnalysis({
        deadlines: [
          {
            date: "15.10.2026",
            title: "Frist",
            description: null,
            sourceText: null,
            page: null,
            confidence: 0.9,
          },
        ],
      }),
    );
    expect(result.success).toBe(false);
  });

  it("lehnt eine Konfidenz außerhalb von 0..1 ab", () => {
    const result = documentAnalysisSchema.safeParse(
      makeAnalysis({ authority: { name: "Jobcenter", confidence: 1.4 } }),
    );
    expect(result.success).toBe(false);
  });

  it("lehnt eine Analyse ohne Zusammenfassung ab", () => {
    const result = documentAnalysisSchema.safeParse(makeAnalysis({ summary: "" }));
    expect(result.success).toBe(false);
  });

  it("erlaubt null für nicht erkannte Felder", () => {
    const result = documentAnalysisSchema.safeParse(
      makeAnalysis({ authority: null, caseType: null, referenceNumber: null, documentDate: null }),
    );
    expect(result.success).toBe(true);
  });
});

describe("isLowConfidence", () => {
  it("behandelt fehlende Werte als unsicher", () => {
    expect(isLowConfidence(null)).toBe(true);
    expect(isLowConfidence(undefined)).toBe(true);
  });

  it("markiert Werte unter 0.6 als unsicher", () => {
    expect(isLowConfidence(0.59)).toBe(true);
    expect(isLowConfidence(0.6)).toBe(false);
    expect(isLowConfidence(0.95)).toBe(false);
  });
});

describe("sanitizeAnalysis", () => {
  const now = new Date("2026-09-18T10:00:00Z");

  it("verwirft Fristen außerhalb eines plausiblen Zeitraums", () => {
    const analysis = sanitizeAnalysis(
      makeAnalysis({
        deadlines: [
          {
            date: "1999-01-01",
            title: "Unsinnige Frist",
            description: null,
            sourceText: null,
            page: null,
            confidence: 0.9,
          },
        ],
      }),
      now,
    );

    expect(analysis.deadlines).toHaveLength(0);
    expect(analysis.uncertaintyNotes.join(" ")).toContain("1999-01-01");
  });

  it("behält plausible Fristen", () => {
    const analysis = sanitizeAnalysis(makeAnalysis(), now);
    expect(analysis.deadlines).toHaveLength(1);
    expect(analysis.deadlines[0]?.date).toBe("2026-10-15");
  });

  it("verwirft eine Behörde mit sehr niedriger Konfidenz", () => {
    const analysis = sanitizeAnalysis(
      makeAnalysis({ authority: { name: "Irgendwas", confidence: 0.2 } }),
      now,
    );
    expect(analysis.authority).toBeNull();
    expect(analysis.uncertaintyNotes.join(" ")).toContain("Behörde");
  });

  it("warnt, wenn das Dokument keine Behördenpost ist", () => {
    const analysis = sanitizeAnalysis(
      makeAnalysis({ looksLikeAuthorityLetter: false }),
      now,
    );
    expect(analysis.uncertaintyNotes.join(" ")).toContain("Behördenpost");
  });

  it("entfernt unplausible Aufgabenfristen, behält aber die Aufgabe", () => {
    const analysis = sanitizeAnalysis(
      makeAnalysis({
        requiredActions: [
          {
            title: "Etwas tun",
            description: null,
            deadline: "2099-01-01",
            required: true,
            sourceText: null,
            page: null,
            confidence: 0.8,
          },
        ],
      }),
      now,
    );
    expect(analysis.requiredActions).toHaveLength(1);
    expect(analysis.requiredActions[0]?.deadline).toBeNull();
  });
});
