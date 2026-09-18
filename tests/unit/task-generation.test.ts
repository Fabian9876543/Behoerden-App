import { describe, expect, it } from "vitest";
import {
  deriveCaseStatus,
  derivePriority,
  generateCaseShape,
} from "@/lib/ai/task-generation";
import { makeAnalysis } from "../fixtures/analysis";

const NOW = new Date("2026-09-18T10:00:00Z");

describe("generateCaseShape", () => {
  it("erzeugt Aufgaben und Fristen aus der Analyse", () => {
    const shape = generateCaseShape(makeAnalysis(), NOW);
    expect(shape.tasks).toHaveLength(3);
    expect(shape.deadlines).toHaveLength(1);
    expect(shape.deadlines[0]?.dueDate).toBe("2026-10-15");
  });

  it("sortiert erforderliche Aufgaben nach vorn", () => {
    const shape = generateCaseShape(makeAnalysis(), NOW);
    expect(shape.tasks[0]?.isRequired).toBe(true);
    expect(shape.tasks.at(-1)?.isRequired).toBe(false);
    expect(shape.tasks.map((t) => t.position)).toEqual([0, 1, 2]);
  });

  it("verknüpft eine Aufgabe über ihr Datum mit der Frist", () => {
    const shape = generateCaseShape(makeAnalysis(), NOW);
    const linked = shape.tasks.find((task) =>
      task.title.includes("Kontoauszüge"),
    );
    expect(linked?.deadlineIndex).toBe(0);
  });

  it("übernimmt das Fristdatum, wenn es nur eine Frist gibt", () => {
    const shape = generateCaseShape(makeAnalysis(), NOW);
    const miete = shape.tasks.find((task) => task.title.includes("Mietbescheinigung"));
    expect(miete?.dueDate).toBe("2026-10-15");
  });

  it("entfernt doppelte Aufgaben", () => {
    const duplicate = {
      title: "Kontoauszüge der letzten drei Monate hochladen",
      description: null,
      deadline: null,
      required: true,
      sourceText: null,
      page: null,
      confidence: 0.7,
    };
    const analysis = makeAnalysis();
    const shape = generateCaseShape(
      { ...analysis, requiredActions: [...analysis.requiredActions, duplicate] },
      NOW,
    );
    expect(shape.tasks).toHaveLength(3);
  });

  it("entfernt doppelte Fristen und behält die höhere Konfidenz", () => {
    const analysis = makeAnalysis();
    const shape = generateCaseShape(
      {
        ...analysis,
        deadlines: [
          { ...analysis.deadlines[0]!, confidence: 0.4 },
          { ...analysis.deadlines[0]!, confidence: 0.99 },
        ],
      },
      NOW,
    );
    expect(shape.deadlines).toHaveLength(1);
    expect(shape.deadlines[0]?.confidence).toBe(0.99);
  });

  it("übernimmt die Quellenangaben in Aufgaben und Fristen", () => {
    const shape = generateCaseShape(makeAnalysis(), NOW);
    expect(shape.deadlines[0]?.sourcePage).toBe(1);
    expect(shape.deadlines[0]?.sourceText).toContain("15.10.2026");
    const konto = shape.tasks.find((t) => t.title.includes("Kontoauszüge"));
    expect(konto?.sourcePage).toBe(2);
  });
});

describe("deriveCaseStatus", () => {
  const task = (isRequired: boolean) => ({
    title: "t",
    description: null,
    isRequired,
    dueDate: null,
    position: 0,
    sourceText: null,
    sourcePage: null,
    confidence: 1,
    deadlineIndex: null,
  });

  it("verlangt eine Aktion, wenn es Pflichtaufgaben gibt", () => {
    expect(deriveCaseStatus([task(true)])).toBe("action_required");
  });

  it("wartet auf den Nutzer bei rein optionalen Aufgaben", () => {
    expect(deriveCaseStatus([task(false)])).toBe("waiting_on_user");
  });

  it("wartet auf die Behörde, wenn nichts zu tun ist", () => {
    expect(deriveCaseStatus([])).toBe("waiting_on_authority");
  });
});

describe("derivePriority", () => {
  const deadline = (dueDate: string) => ({
    title: "f",
    description: null,
    dueDate,
    sourceText: null,
    sourcePage: null,
    confidence: 1,
  });

  it("stuft eine überfällige Frist als dringend ein", () => {
    expect(derivePriority([deadline("2026-09-01")], [], NOW)).toBe("critical");
  });

  it("stuft eine Frist innerhalb einer Woche als dringend ein", () => {
    expect(derivePriority([deadline("2026-09-22")], [], NOW)).toBe("critical");
  });

  it("stuft eine Frist in drei Wochen als hoch ein", () => {
    expect(derivePriority([deadline("2026-10-05")], [], NOW)).toBe("high");
  });

  it("stuft eine weit entfernte Frist als normal ein", () => {
    expect(derivePriority([deadline("2026-12-31")], [], NOW)).toBe("normal");
  });

  it("stuft einen Vorgang ohne Fristen und Aufgaben als niedrig ein", () => {
    expect(derivePriority([], [], NOW)).toBe("low");
  });
});
