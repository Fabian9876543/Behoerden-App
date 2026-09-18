import { formatDate } from "@/lib/dates";
import type { CaseRow, DeadlineRow, Profile, TaskRow } from "@/lib/types/database";

/**
 * Kontextaufbereitung für Antwortentwürfe.
 *
 * Claude bekommt bewusst NUR die für den Vorgang relevanten, strukturierten
 * Daten - nicht den kompletten Dokumenttext. Das hält den Prompt klein und
 * verhindert, dass unnötige personenbezogene Details die Anwendung verlassen.
 *
 * Reine Funktion, damit genau dieser Ausschnitt testbar bleibt.
 */

export interface LetterContext {
  caseRow: Pick<
    CaseRow,
    "title" | "authority_name" | "case_type" | "reference_number" | "summary"
  >;
  tasks: Pick<TaskRow, "title" | "status" | "due_date">[];
  deadlines: Pick<DeadlineRow, "title" | "due_date" | "status">[];
  profile: Pick<Profile, "first_name" | "last_name" | "street" | "postal_code" | "city"> | null;
}

export function buildLetterContext(context: LetterContext): string {
  const { caseRow, tasks, deadlines, profile } = context;

  const lines: string[] = [
    "Vorgangsdaten:",
    `- Titel: ${caseRow.title}`,
    `- Behörde: ${caseRow.authority_name ?? "nicht erkannt"}`,
    `- Vorgangsart: ${caseRow.case_type ?? "nicht erkannt"}`,
    `- Aktenzeichen: ${caseRow.reference_number ?? "nicht bekannt"}`,
  ];

  if (caseRow.summary) {
    lines.push(`- Worum es geht: ${caseRow.summary}`);
  }

  if (deadlines.length > 0) {
    lines.push("", "Fristen:");
    for (const deadline of deadlines) {
      lines.push(`- ${deadline.title}: ${formatDate(deadline.due_date)} (${deadline.status})`);
    }
  }

  const openTasks = tasks.filter(
    (task) => task.status === "open" || task.status === "in_progress",
  );
  const doneTasks = tasks.filter((task) => task.status === "completed");

  if (openTasks.length > 0) {
    lines.push("", "Noch offen:");
    for (const task of openTasks) lines.push(`- ${task.title}`);
  }
  if (doneTasks.length > 0) {
    lines.push("", "Bereits erledigt:");
    for (const task of doneTasks) lines.push(`- ${task.title}`);
  }

  const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ");
  lines.push(
    "",
    "Absenderin/Absender:",
    `- Name: ${name || "[Name ergänzen]"}`,
    `- Anschrift: ${
      profile?.street && profile.postal_code && profile.city
        ? `${profile.street}, ${profile.postal_code} ${profile.city}`
        : "[Anschrift ergänzen]"
    }`,
  );

  return lines.join("\n");
}
