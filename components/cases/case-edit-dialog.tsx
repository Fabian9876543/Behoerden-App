"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { updateCaseAction } from "@/app/actions/cases";
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
import { CASE_STATUS_LABELS } from "@/components/shared/status";
import type { CaseRow, CaseStatus } from "@/lib/types/database";

const STATUSES: CaseStatus[] = [
  "action_required",
  "waiting_on_user",
  "waiting_on_authority",
  "in_progress",
  "completed",
];

/**
 * Die Analyse erkennt Behörde und Aktenzeichen nicht immer eindeutig.
 * Deshalb muss sich beides von Hand korrigieren lassen.
 */
export function CaseEditDialog({ caseRow }: { caseRow: CaseRow }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Pencil className="size-4" aria-hidden />
          Vorgang bearbeiten
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Vorgang bearbeiten</DialogTitle>
          <DialogDescription>
            Korrigiere, was die Analyse nicht eindeutig erkannt hat.
          </DialogDescription>
        </DialogHeader>

        <form
          action={(formData) => {
            formData.set("caseId", caseRow.id);
            startTransition(async () => {
              setError(null);
              const result = await updateCaseAction(formData);
              if (!result.ok) {
                setError(result.error?.message ?? "Der Vorgang konnte nicht gespeichert werden.");
                return;
              }
              setOpen(false);
              router.refresh();
            });
          }}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="case-edit-title">Titel</Label>
            <Input
              id="case-edit-title"
              name="title"
              defaultValue={caseRow.title}
              required
              minLength={3}
              maxLength={120}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="case-edit-authority">Behörde</Label>
            <Input
              id="case-edit-authority"
              name="authorityName"
              defaultValue={caseRow.authority_name ?? ""}
              maxLength={160}
              placeholder="z.B. Jobcenter"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="case-edit-type">Vorgangsart</Label>
              <Input
                id="case-edit-type"
                name="caseType"
                defaultValue={caseRow.case_type ?? ""}
                maxLength={120}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="case-edit-reference">Aktenzeichen</Label>
              <Input
                id="case-edit-reference"
                name="referenceNumber"
                defaultValue={caseRow.reference_number ?? ""}
                maxLength={120}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="case-edit-status">Status</Label>
            <Select id="case-edit-status" name="status" defaultValue={caseRow.status}>
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {CASE_STATUS_LABELS[status]}
                </option>
              ))}
            </Select>
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
