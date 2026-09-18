"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CalendarClock, Trash2 } from "lucide-react";
import { deleteTaskAction, setTaskStatusAction } from "@/app/actions/tasks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { EvidenceNote } from "@/components/shared/evidence";
import { describeDueDate, formatDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { TaskRow } from "@/lib/types/database";

export interface TaskItemProps {
  task: TaskRow;
  /** Dateiname des Quelldokuments - fuer die Quellenanzeige. */
  sourceDocumentName?: string | null;
  /** Vorgangsinfo, wenn die Aufgabe ausserhalb des Vorgangs gezeigt wird. */
  caseInfo?: { id: string; title: string } | null;
  onError?: (message: string) => void;
}

export function TaskItem({ task, sourceDocumentName, caseInfo, onError }: TaskItemProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [optimisticDone, setOptimisticDone] = useState(task.status === "completed");

  const isDone = optimisticDone;
  const overdue =
    !isDone && task.due_date ? (describeDueDate(task.due_date).includes("ueberfaellig")) : false;

  const toggle = (checked: boolean) => {
    setOptimisticDone(checked);
    startTransition(async () => {
      const result = await setTaskStatusAction(task.id, checked ? "completed" : "open");
      if (!result.ok) {
        setOptimisticDone(!checked);
        onError?.(result.error?.message ?? "Die Aufgabe konnte nicht aktualisiert werden.");
        return;
      }
      router.refresh();
    });
  };

  return (
    <li
      className={cn(
        "flex items-start gap-3 rounded-lg border bg-card px-4 py-3 transition-opacity",
        isDone && "opacity-60",
        pending && "pointer-events-none",
      )}
    >
      <Checkbox
        checked={isDone}
        onCheckedChange={(value) => toggle(value === true)}
        aria-label={`Aufgabe "${task.title}" als erledigt markieren`}
        className="mt-0.5"
      />

      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <p className={cn("text-sm font-medium", isDone && "line-through")}>{task.title}</p>
          {!task.is_required ? <Badge variant="muted">Optional</Badge> : null}
        </div>

        {task.description ? (
          <p className="text-sm text-muted-foreground">{task.description}</p>
        ) : null}

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {task.due_date ? (
            <span
              className={cn("inline-flex items-center gap-1", overdue && "text-status-critical")}
            >
              <CalendarClock className="size-3.5" aria-hidden />
              {formatDate(task.due_date)}
              {!isDone ? ` (${describeDueDate(task.due_date)})` : ""}
            </span>
          ) : null}
          {caseInfo ? (
            <Link href={`/cases/${caseInfo.id}`} className="hover:text-foreground hover:underline">
              {caseInfo.title}
            </Link>
          ) : null}
        </div>

        <EvidenceNote
          documentName={sourceDocumentName}
          page={task.source_page}
          sourceText={task.source_text}
          confidence={task.generated_by === "ai" ? task.confidence : null}
        />
      </div>

      <Button
        variant="ghost"
        size="icon"
        aria-label={`Aufgabe "${task.title}" loeschen`}
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await deleteTaskAction(task.id);
            if (!result.ok) {
              onError?.(result.error?.message ?? "Die Aufgabe konnte nicht geloescht werden.");
              return;
            }
            router.refresh();
          })
        }
      >
        <Trash2 className="size-4 text-muted-foreground" aria-hidden />
      </Button>
    </li>
  );
}
