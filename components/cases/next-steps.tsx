import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/dates";
import type { DeadlineRow, TaskRow } from "@/lib/types/database";

/**
 * Die wichtigste UX-Regel des Produkts:
 *
 * Nach dem Hochladen fragt die Anwendung nicht "Wie kann ich dir helfen?",
 * sondern sagt, was zu tun ist - in der richtigen Reihenfolge, mit Frist.
 */
export function NextSteps({
  tasks,
  deadlines,
  summary,
}: {
  tasks: TaskRow[];
  deadlines: DeadlineRow[];
  summary: string | null;
}) {
  const openTasks = tasks
    .filter((task) => task.status === "open" || task.status === "in_progress")
    .slice(0, 5);

  const nextDeadline = deadlines
    .filter((deadline) => deadline.status !== "met" && deadline.status !== "dismissed")
    .sort((a, b) => a.due_date.localeCompare(b.due_date))[0];

  if (openTasks.length === 0) {
    return (
      <Card className="border-status-success/30 bg-status-success/5">
        <CardContent className="flex items-start gap-3 pt-5">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-status-success" aria-hidden />
          <div>
            <p className="font-medium">Aktuell ist nichts zu tun</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Fuer diesen Vorgang sind keine Aufgaben offen.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Das musst du jetzt tun</CardTitle>
        {summary ? (
          <p className="text-sm leading-relaxed text-muted-foreground">{summary}</p>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        <ol className="space-y-2.5">
          {openTasks.map((task, index) => (
            <li key={task.id} className="flex items-start gap-3">
              <span
                aria-hidden
                className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary"
              >
                {index + 1}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium">{task.title}</p>
                {task.due_date ? (
                  <p className="text-xs text-muted-foreground">
                    bis {formatDate(task.due_date)}
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ol>

        {nextDeadline ? (
          <p className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm">
            <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <span>
              Frist: <strong className="font-medium">{formatDate(nextDeadline.due_date)}</strong>
            </span>
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
