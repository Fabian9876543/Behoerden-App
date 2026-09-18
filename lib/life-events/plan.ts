import { parseIsoDate, toIsoDate } from "@/lib/dates";
import type {
  LifeEventAnswers,
  LifeEventDefinition,
  LifeEventStep,
} from "@/lib/life-events/types";

/**
 * Macht aus einer Lebenslage und den Antworten einen konkreten Plan.
 *
 * Reine Funktion ohne I/O: Dieselben Antworten ergeben immer denselben Plan.
 * Genau das unterscheidet diesen Einstieg von der Dokumentanalyse - hier
 * wird nichts geschätzt.
 */

export interface PlannedStep extends LifeEventStep {
  /** Reihenfolge im Vorgang. */
  position: number;
  /** Aus der Frist berechnetes Datum, oder null. */
  dueDate: string | null;
}

export interface PlannedDeadline {
  title: string;
  dueDate: string;
  description: string | null;
  /** Schritt, aus dem die Frist stammt. */
  stepKey: string;
}

export interface LifeEventPlan {
  eventKey: string;
  /** Titel des entstehenden Vorgangs. */
  caseTitle: string;
  summary: string;
  steps: PlannedStep[];
  deadlines: PlannedDeadline[];
  /** Alle Unterlagen aus allen Schritten, ohne Dopplungen. */
  documents: { name: string; description: string | null }[];
  /** Formularnamen aus allen Schritten, ohne Dopplungen. */
  formNames: string[];
}

function isYes(answers: LifeEventAnswers, key: string): boolean {
  return answers[key] === true || answers[key] === "true";
}

function textAnswer(answers: LifeEventAnswers, key: string): string | null {
  const value = answers[key];
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** Wählt die Schritte aus, die zur Situation passen. */
export function selectSteps(
  definition: LifeEventDefinition,
  answers: LifeEventAnswers,
): LifeEventStep[] {
  return definition.steps.filter((step) =>
    (step.showIf ?? []).every((key) => isYes(answers, key)),
  );
}

/** Verschiebt ein Datum um Tage. Liefert null, wenn das Bezugsdatum fehlt. */
export function shiftDate(isoDate: string | null, offsetDays: number): string | null {
  if (!isoDate) return null;
  const base = parseIsoDate(isoDate);
  if (!base) return null;
  const shifted = new Date(base.getTime());
  shifted.setUTCDate(shifted.getUTCDate() + offsetDays);
  return toIsoDate(shifted);
}

export function buildPlan(
  definition: LifeEventDefinition,
  answers: LifeEventAnswers,
): LifeEventPlan {
  const steps = selectSteps(definition, answers);

  const plannedSteps: PlannedStep[] = steps.map((step, index) => ({
    ...step,
    position: index,
    dueDate: step.deadline
      ? shiftDate(textAnswer(answers, step.deadline.relativeTo), step.deadline.offsetDays)
      : null,
  }));

  const deadlines: PlannedDeadline[] = [];
  for (const step of plannedSteps) {
    if (!step.deadline || !step.dueDate) continue;
    deadlines.push({
      title: step.deadline.title,
      dueDate: step.dueDate,
      description: step.deadline.legalBasis ?? null,
      stepKey: step.key,
    });
  }
  deadlines.sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  const seenDocuments = new Map<string, { name: string; description: string | null }>();
  for (const step of plannedSteps) {
    for (const document of step.documents ?? []) {
      const key = document.name.toLowerCase().trim();
      const existing = seenDocuments.get(key);
      if (!existing) {
        seenDocuments.set(key, { name: document.name, description: document.description ?? null });
      } else if (!existing.description && document.description) {
        // Die genauere Beschreibung gewinnt.
        existing.description = document.description;
      }
    }
  }

  const formNames = [...new Set(plannedSteps.flatMap((step) => step.forms ?? []))];

  return {
    eventKey: definition.key,
    caseTitle: buildCaseTitle(definition, answers),
    summary: buildSummary(definition, plannedSteps, deadlines),
    steps: plannedSteps,
    deadlines,
    documents: [...seenDocuments.values()],
    formNames,
  };
}

function buildCaseTitle(definition: LifeEventDefinition, answers: LifeEventAnswers): string {
  if (definition.key === "umzug") {
    const city = textAnswer(answers, "newCity");
    return city ? `Umzug nach ${city}` : "Umzug";
  }
  if (definition.key === "geburt") {
    const name = textAnswer(answers, "childName");
    return name ? `Geburt von ${name}` : "Geburt";
  }
  return definition.title;
}

function buildSummary(
  definition: LifeEventDefinition,
  steps: PlannedStep[],
  deadlines: PlannedDeadline[],
): string {
  const required = steps.filter((step) => step.required).length;
  const parts = [
    `${steps.length} Schritte für deine Situation, davon ${required} verpflichtend.`,
  ];
  if (deadlines.length > 0) {
    parts.push(
      deadlines.length === 1
        ? "Eine davon ist an eine Frist gebunden."
        : `${deadlines.length} davon sind an Fristen gebunden.`,
    );
  }
  parts.push(definition.localNote);
  return parts.join(" ");
}

/** Fehlende Pflichtantworten - für die Validierung im Formular. */
export function missingRequiredAnswers(
  definition: LifeEventDefinition,
  answers: LifeEventAnswers,
): string[] {
  return definition.questions
    .filter((question) => question.required)
    .filter((question) => {
      const value = answers[question.key];
      return typeof value !== "string" || value.trim() === "";
    })
    .map((question) => question.key);
}
