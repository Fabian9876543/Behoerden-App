import type {
  DocumentAnalysis,
  ExtractedAction,
  ExtractedDeadline,
} from "@/lib/ai/schemas";
import type { CasePriority, CaseStatus } from "@/lib/types/database";
import { daysUntil } from "@/lib/dates";

/**
 * Ableitung von Aufgaben, Fristen, Status und Priorität aus der Analyse.
 *
 * Bewusst deterministisch und ohne weiteren KI-Aufruf: Das Ergebnis muss
 * nachvollziehbar und testbar sein. Die KI liefert die Fakten, diese Datei
 * macht daraus einen Vorgang.
 */

export interface GeneratedTask {
  title: string;
  description: string | null;
  isRequired: boolean;
  dueDate: string | null;
  position: number;
  sourceText: string | null;
  sourcePage: number | null;
  confidence: number;
  /** Index der zugehörigen Frist in `deadlines`, falls zuordenbar. */
  deadlineIndex: number | null;
}

export interface GeneratedDeadline {
  title: string;
  description: string | null;
  dueDate: string;
  sourceText: string | null;
  sourcePage: number | null;
  confidence: number;
}

export interface GeneratedCaseShape {
  tasks: GeneratedTask[];
  deadlines: GeneratedDeadline[];
  status: CaseStatus;
  priority: CasePriority;
}

function dedupeDeadlines(deadlines: ExtractedDeadline[]): ExtractedDeadline[] {
  const seen = new Map<string, ExtractedDeadline>();
  for (const deadline of deadlines) {
    const key = `${deadline.date}|${deadline.title.toLowerCase().trim()}`;
    const existing = seen.get(key);
    // Bei Duplikaten gewinnt die Angabe mit der höheren Konfidenz.
    if (!existing || deadline.confidence > existing.confidence) {
      seen.set(key, deadline);
    }
  }
  return [...seen.values()].sort((a, b) => a.date.localeCompare(b.date));
}

function dedupeActions(actions: ExtractedAction[]): ExtractedAction[] {
  const seen = new Set<string>();
  const result: ExtractedAction[] = [];
  for (const action of actions) {
    const key = action.title.toLowerCase().replace(/\s+/g, " ").trim();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(action);
  }
  return result;
}

/**
 * Ordnet einer Aufgabe eine Frist zu.
 * Zuerst über das explizite Datum, sonst - bei genau einer Frist im
 * Dokument - über diese. Mehrdeutigkeiten bleiben bewusst unzugeordnet.
 */
function matchDeadlineIndex(
  action: ExtractedAction,
  deadlines: ExtractedDeadline[],
): number | null {
  if (action.deadline) {
    const index = deadlines.findIndex((d) => d.date === action.deadline);
    if (index >= 0) return index;
  }
  if (deadlines.length === 1 && action.required) return 0;
  return null;
}

export function generateCaseShape(
  analysis: DocumentAnalysis,
  now: Date = new Date(),
): GeneratedCaseShape {
  const deadlines = dedupeDeadlines(analysis.deadlines);
  const actions = dedupeActions(analysis.requiredActions);

  const generatedDeadlines: GeneratedDeadline[] = deadlines.map((deadline) => ({
    title: deadline.title,
    description: deadline.description,
    dueDate: deadline.date,
    sourceText: deadline.sourceText,
    sourcePage: deadline.page,
    confidence: deadline.confidence,
  }));

  const tasks: GeneratedTask[] = actions.map((action, index) => {
    const deadlineIndex = matchDeadlineIndex(action, deadlines);
    const linked = deadlineIndex !== null ? deadlines[deadlineIndex] : undefined;
    return {
      title: action.title,
      description: action.description,
      isRequired: action.required,
      dueDate: action.deadline ?? linked?.date ?? null,
      position: index,
      sourceText: action.sourceText,
      sourcePage: action.page,
      confidence: action.confidence,
      deadlineIndex,
    };
  });

  // Erforderliche Aufgaben zuerst, danach nach Fälligkeit.
  tasks.sort((a, b) => {
    if (a.isRequired !== b.isRequired) return a.isRequired ? -1 : 1;
    if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    return a.position - b.position;
  });
  tasks.forEach((task, index) => {
    task.position = index;
  });

  return {
    tasks,
    deadlines: generatedDeadlines,
    status: deriveCaseStatus(tasks),
    priority: derivePriority(generatedDeadlines, tasks, now),
  };
}

export function deriveCaseStatus(tasks: GeneratedTask[]): CaseStatus {
  const hasRequiredOpen = tasks.some((task) => task.isRequired);
  if (hasRequiredOpen) return "action_required";
  if (tasks.length > 0) return "waiting_on_user";
  return "waiting_on_authority";
}

export function derivePriority(
  deadlines: GeneratedDeadline[],
  tasks: GeneratedTask[],
  now: Date = new Date(),
): CasePriority {
  const dates = [
    ...deadlines.map((d) => d.dueDate),
    ...tasks.map((t) => t.dueDate).filter((d): d is string => Boolean(d)),
  ];

  let soonest: number | null = null;
  for (const date of dates) {
    const days = daysUntil(date, now);
    if (days === null) continue;
    if (soonest === null || days < soonest) soonest = days;
  }

  if (soonest === null) return tasks.some((t) => t.isRequired) ? "normal" : "low";
  if (soonest < 0) return "critical";
  if (soonest <= 7) return "critical";
  if (soonest <= 21) return "high";
  return "normal";
}
