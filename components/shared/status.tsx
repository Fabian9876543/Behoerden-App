import { Badge } from "@/components/ui/badge";
import { describeDueDate } from "@/lib/dates";
import type {
  CasePriority,
  CaseStatus,
  DeadlineStatus,
  DocumentStatus,
  TaskStatus,
} from "@/lib/types/database";

export const CASE_STATUS_LABELS: Record<CaseStatus, string> = {
  action_required: "Aktion erforderlich",
  waiting_on_user: "Wartet auf dich",
  waiting_on_authority: "Wartet auf Behörde",
  in_progress: "In Bearbeitung",
  completed: "Abgeschlossen",
};

const CASE_STATUS_VARIANT: Record<CaseStatus, "critical" | "warning" | "info" | "success" | "muted"> =
  {
    action_required: "critical",
    waiting_on_user: "warning",
    waiting_on_authority: "info",
    in_progress: "info",
    completed: "success",
  };

export function CaseStatusBadge({ status }: { status: CaseStatus }) {
  return (
    <Badge variant={CASE_STATUS_VARIANT[status]}>
      <span aria-hidden className="text-[0.6rem] leading-none">
        {status === "action_required" ? "●" : "○"}
      </span>
      {CASE_STATUS_LABELS[status]}
    </Badge>
  );
}

export const DEADLINE_STATUS_LABELS: Record<DeadlineStatus, string> = {
  upcoming: "Anstehend",
  due_soon: "Bald fällig",
  overdue: "Überfällig",
  met: "Erledigt",
  dismissed: "Verworfen",
};

const DEADLINE_STATUS_VARIANT: Record<
  DeadlineStatus,
  "critical" | "warning" | "info" | "success" | "muted"
> = {
  upcoming: "info",
  due_soon: "warning",
  overdue: "critical",
  met: "success",
  dismissed: "muted",
};

/**
 * Beschriftung eines Fristen-Badges.
 *
 * Bei "überfällig" enthält die relative Angabe das Wort bereits ("seit 8
 * Tagen überfällig") - dann wird sie allein verwendet, sonst stünde
 * "Überfällig - seit 8 Tagen überfällig" im Badge.
 */
export function deadlineBadgeText(status: DeadlineStatus, dueDate?: string): string {
  const label = DEADLINE_STATUS_LABELS[status];
  const resolved = status === "met" || status === "dismissed";
  if (!dueDate || resolved) return label;

  const relative = describeDueDate(dueDate);
  if (!relative) return label;
  if (status === "overdue") return relative.charAt(0).toUpperCase() + relative.slice(1);
  return `${label} - ${relative}`;
}

export function DeadlineStatusBadge({
  status,
  dueDate,
}: {
  status: DeadlineStatus;
  dueDate?: string;
}) {
  return (
    <Badge variant={DEADLINE_STATUS_VARIANT[status]}>{deadlineBadgeText(status, dueDate)}</Badge>
  );
}

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  open: "Offen",
  in_progress: "In Arbeit",
  completed: "Erledigt",
  dismissed: "Nicht nötig",
};

export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  uploaded: "Gespeichert",
  extracting: "Text wird gelesen",
  analyzing: "Wird analysiert",
  analyzed: "Analysiert",
  failed: "Fehlgeschlagen",
};

export function DocumentStatusBadge({ status }: { status: DocumentStatus }) {
  const variant =
    status === "analyzed"
      ? "success"
      : status === "failed"
        ? "critical"
        : status === "uploaded"
          ? "muted"
          : "info";
  return <Badge variant={variant}>{DOCUMENT_STATUS_LABELS[status]}</Badge>;
}

export const PRIORITY_LABELS: Record<CasePriority, string> = {
  low: "Niedrig",
  normal: "Normal",
  high: "Hoch",
  critical: "Dringend",
};

export function PriorityBadge({ priority }: { priority: CasePriority }) {
  if (priority === "normal" || priority === "low") return null;
  return (
    <Badge variant={priority === "critical" ? "critical" : "warning"}>
      {PRIORITY_LABELS[priority]}
    </Badge>
  );
}
