"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { updateTaskAction } from "@/app/actions/tasks";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { TASK_STATUS_LABELS } from "@/components/shared/status";
import type { TaskRow, TaskStatus } from "@/lib/types/database";

const STATUSES: TaskStatus[] = ["open", "in_progress", "completed", "dismissed"];

/**
 * Aufgaben aus der Analyse sind Vorschlaege, keine Vorgaben - sie muessen
 * sich umformulieren, terminieren und verwerfen lassen.
 */
export function TaskEditDialog({ task }: { task: TaskRow }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Aufgabe "${task.title}" bearbeiten`}>
          <Pencil className="size-4 text-muted-foreground" aria-hidden />
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Aufgabe bearbeiten</DialogTitle>
          <DialogDescription>
            Du kannst Vorschläge der Analyse jederzeit anpassen.
          </DialogDescription>
        </DialogHeader>

        <form
          action={(formData) => {
            formData.set("taskId", task.id);
            startTransition(async () => {
              setError(null);
              const result = await updateTaskAction(formData);
              if (!result.ok) {
                setError(result.error?.message ?? "Die Aufgabe konnte nicht gespeichert werden.");
                return;
              }
              setOpen(false);
              router.refresh();
            });
          }}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor={`task-title-${task.id}`}>Aufgabe</Label>
            <Input
              id={`task-title-${task.id}`}
              name="title"
              defaultValue={task.title}
              required
              minLength={3}
              maxLength={160}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`task-desc-${task.id}`}>Notiz</Label>
            <Textarea
              id={`task-desc-${task.id}`}
              name="description"
              defaultValue={task.description ?? ""}
              rows={3}
              maxLength={800}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor={`task-due-${task.id}`}>Fällig bis</Label>
              <Input
                id={`task-due-${task.id}`}
                name="dueDate"
                type="date"
                defaultValue={task.due_date ?? ""}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`task-status-${task.id}`}>Status</Label>
              <Select id={`task-status-${task.id}`} name="status" defaultValue={task.status}>
                {STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {TASK_STATUS_LABELS[status]}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {error ? <Alert variant="critical">{error}</Alert> : null}

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost">
                Abbrechen
              </Button>
            </DialogClose>
            <Button type="submit" disabled={pending}>
              {pending ? "Wird gespeichert..." : "Speichern"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
