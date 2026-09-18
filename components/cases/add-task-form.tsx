"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { createTaskAction } from "@/app/actions/tasks";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AddTaskForm({ caseId }: { caseId: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Plus className="size-4" aria-hidden />
        Eigene Aufgabe hinzufügen
      </Button>
    );
  }

  return (
    <form
      ref={formRef}
      action={(formData) => {
        formData.set("caseId", caseId);
        startTransition(async () => {
          setError(null);
          const result = await createTaskAction(formData);
          if (!result.ok) {
            setError(result.error?.message ?? "Die Aufgabe konnte nicht angelegt werden.");
            return;
          }
          formRef.current?.reset();
          setOpen(false);
          router.refresh();
        });
      }}
      className="space-y-3 rounded-lg border bg-card p-4"
    >
      <div className="space-y-1.5">
        <Label htmlFor="new-task-title">Aufgabe</Label>
        <Input
          id="new-task-title"
          name="title"
          required
          minLength={3}
          maxLength={160}
          placeholder="z.B. Termin im Bürgeramt vereinbaren"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="new-task-due">Fällig bis (optional)</Label>
        <Input id="new-task-due" name="dueDate" type="date" />
      </div>

      {error ? <Alert variant="critical">{error}</Alert> : null}

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Wird gespeichert..." : "Hinzufügen"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Abbrechen
        </Button>
      </div>
    </form>
  );
}
