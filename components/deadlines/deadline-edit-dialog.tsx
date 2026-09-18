"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { updateDeadlineAction } from "@/app/actions/deadlines";
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
import { DEADLINE_STATUS_LABELS } from "@/components/shared/status";
import type { DeadlineRow, DeadlineStatus } from "@/lib/types/database";

// "upcoming", "due_soon" und "overdue" leitet die Anwendung aus dem Datum ab -
// von Hand setzbar sind nur die Entscheidungen des Nutzers.
const SETTABLE: DeadlineStatus[] = ["upcoming", "met", "dismissed"];

export function DeadlineEditDialog({ deadline }: { deadline: DeadlineRow }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Frist "${deadline.title}" bearbeiten`}>
          <Pencil className="size-4 text-muted-foreground" aria-hidden />
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Frist bearbeiten</DialogTitle>
          <DialogDescription>
            Prüfe das Datum immer im Originalschreiben nach.
          </DialogDescription>
        </DialogHeader>

        <form
          action={(formData) => {
            formData.set("deadlineId", deadline.id);
            startTransition(async () => {
              setError(null);
              const result = await updateDeadlineAction(formData);
              if (!result.ok) {
                setError(result.error?.message ?? "Die Frist konnte nicht gespeichert werden.");
                return;
              }
              setOpen(false);
              router.refresh();
            });
          }}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor={`deadline-title-${deadline.id}`}>Titel</Label>
            <Input
              id={`deadline-title-${deadline.id}`}
              name="title"
              defaultValue={deadline.title}
              required
              minLength={3}
              maxLength={160}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`deadline-desc-${deadline.id}`}>Notiz</Label>
            <Textarea
              id={`deadline-desc-${deadline.id}`}
              name="description"
              defaultValue={deadline.description ?? ""}
              rows={3}
              maxLength={600}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor={`deadline-due-${deadline.id}`}>Fällig am</Label>
              <Input
                id={`deadline-due-${deadline.id}`}
                name="dueDate"
                type="date"
                defaultValue={deadline.due_date}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`deadline-status-${deadline.id}`}>Status</Label>
              <Select
                id={`deadline-status-${deadline.id}`}
                name="status"
                defaultValue={SETTABLE.includes(deadline.status) ? deadline.status : "upcoming"}
              >
                {SETTABLE.map((status) => (
                  <option key={status} value={status}>
                    {DEADLINE_STATUS_LABELS[status]}
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
