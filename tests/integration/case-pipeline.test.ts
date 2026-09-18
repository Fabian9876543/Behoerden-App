import { describe, expect, it } from "vitest";
import { generateCaseShape } from "@/lib/ai/task-generation";
import { sanitizeAnalysis } from "@/lib/ai/analysis-sanitizer";
import { resolveForms } from "@/lib/ai/form-assistance";
import { matchAuthorityKey } from "@/lib/authorities/registry";
import { deriveDeadlineStatus } from "@/lib/dates";
import { makeAnalysis } from "../fixtures/analysis";

/**
 * Integrationstest der Ableitungskette ohne Datenbank:
 *
 *   Analyse -> Bereinigung -> Vorgangsform -> Fristen/Aufgaben/Formulare
 *
 * Genau diese Kette laeuft in lib/db/analysis-pipeline.ts, bevor geschrieben
 * wird. Sie muss deterministisch und nachvollziehbar sein.
 */
describe("Analyse zu Vorgang", () => {
  const NOW = new Date("2026-09-18T10:00:00Z");

  it("erzeugt aus einem Jobcenter-Schreiben einen vollstaendigen Vorgang", () => {
    const analysis = sanitizeAnalysis(makeAnalysis(), NOW);
    const shape = generateCaseShape(analysis, NOW);
    const authorityKey = matchAuthorityKey(analysis.authority?.name);
    const forms = resolveForms(analysis.mentionedForms, authorityKey);

    expect(authorityKey).toBe("jobcenter");
    expect(shape.status).toBe("action_required");
    // 27 Tage bis zur Frist -> noch nicht dringend, aber Handlungsbedarf.
    expect(shape.priority).toBe("normal");
    expect(shape.deadlines).toHaveLength(1);
    expect(shape.tasks).toHaveLength(3);
    expect(forms).toHaveLength(1);
    expect(forms[0]?.sourceKind).toBe("official_catalog");

    // Jede Pflichtaufgabe traegt einen Beleg oder ist als unsicher erkennbar.
    for (const task of shape.tasks.filter((t) => t.isRequired)) {
      expect(task.sourceText ?? task.confidence).toBeTruthy();
    }
  });

  it("markiert eine ueberfaellige Frist korrekt", () => {
    const analysis = sanitizeAnalysis(makeAnalysis(), NOW);
    const shape = generateCaseShape(analysis, NOW);
    const status = deriveDeadlineStatus(
      shape.deadlines[0]!.dueDate,
      "upcoming",
      new Date("2026-11-01T10:00:00Z"),
    );
    expect(status).toBe("overdue");
  });

  it("kommt mit einem Schreiben ohne Fristen und Aufgaben zurecht", () => {
    const analysis = sanitizeAnalysis(
      makeAnalysis({
        deadlines: [],
        requiredActions: [],
        requiredDocuments: [],
        mentionedForms: [],
      }),
      NOW,
    );
    const shape = generateCaseShape(analysis, NOW);

    expect(shape.tasks).toHaveLength(0);
    expect(shape.deadlines).toHaveLength(0);
    expect(shape.status).toBe("waiting_on_authority");
    expect(shape.priority).toBe("low");
  });

  it("erfindet keine Formularquelle, wenn das Formular unbekannt ist", () => {
    const analysis = sanitizeAnalysis(
      makeAnalysis({
        authority: { name: "Stadtverwaltung Musterstadt", confidence: 0.8 },
        mentionedForms: [{ name: "Antrag 42-B", formNumber: "42-B" }],
      }),
      NOW,
    );
    const forms = resolveForms(analysis.mentionedForms, matchAuthorityKey(analysis.authority?.name));

    expect(forms[0]?.sourceKind).toBe("unverified");
    expect(forms[0]?.officialUrl).toBeNull();
  });
});
