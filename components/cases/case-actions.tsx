"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, RotateCcw, Trash2 } from "lucide-react";
import { closeCaseAction, deleteCaseAction, reopenCaseAction } from "@/app/actions/cases";
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
import type { CaseStatus } from "@/lib/types/database";

export function CaseActions({ caseId, status }: { caseId: string; status: CaseStatus }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {status === "completed" ? (
          <Button
            variant="outline"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await reopenCaseAction(caseId);
                if (!result.ok) {
                  setError(result.error?.message ?? "Der Vorgang konnte nicht geoeffnet werden.");
                  return;
                }
                router.refresh();
              })
            }
          >
            <RotateCcw className="size-4" aria-hidden />
            Wieder oeffnen
          </Button>
        ) : (
          <Button
            variant="outline"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await closeCaseAction(caseId);
                if (!result.ok) {
                  setError(result.error?.message ?? "Der Vorgang konnte nicht abgeschlossen werden.");
                  return;
                }
                router.refresh();
              })
            }
          >
            <CheckCircle2 className="size-4" aria-hidden />
            Vorgang abschliessen
          </Button>
        )}

        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost" className="text-destructive hover:text-destructive">
              <Trash2 className="size-4" aria-hidden />
              Loeschen
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Vorgang wirklich loeschen?</DialogTitle>
              <DialogDescription>
                Alle Dokumente, Aufgaben, Fristen und Entwuerfe dieses Vorgangs werden
                unwiderruflich geloescht - auch die hochgeladenen Dateien.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="ghost">Abbrechen</Button>
              </DialogClose>
              <Button
                variant="destructive"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    const result = await deleteCaseAction(caseId);
                    if (!result.ok) {
                      setError(result.error?.message ?? "Der Vorgang konnte nicht geloescht werden.");
                      return;
                    }
                    router.push("/cases");
                    router.refresh();
                  })
                }
              >
                Endgueltig loeschen
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {error ? <Alert variant="critical">{error}</Alert> : null}
    </div>
  );
}
