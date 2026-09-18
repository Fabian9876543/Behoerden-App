"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { createCaseAction } from "@/app/actions/cases";
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

/** Vorgang ohne Dokument anlegen - z.B. für telefonische Auskünfte. */
export function NewCaseForm({ familyMode = false }: { familyMode?: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Plus className="size-4" aria-hidden />
          Vorgang anlegen
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Neuen Vorgang anlegen</DialogTitle>
          <DialogDescription>
            Du kannst später jederzeit Dokumente hinzufügen.
          </DialogDescription>
        </DialogHeader>

        <form
          action={(formData) => {
            startTransition(async () => {
              setError(null);
              const result = await createCaseAction(formData);
              if (!result.ok || !result.data) {
                setError(result.error?.message ?? "Der Vorgang konnte nicht angelegt werden.");
                return;
              }
              setOpen(false);
              router.push(`/cases/${result.data.caseId}`);
              router.refresh();
            });
          }}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="case-title">Titel</Label>
            <Input
              id="case-title"
              name="title"
              required
              minLength={3}
              maxLength={120}
              placeholder="z.B. Wohngeld Erstantrag"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="case-authority">Behörde (optional)</Label>
            <Input
              id="case-authority"
              name="authorityName"
              maxLength={160}
              placeholder="z.B. Wohngeldstelle"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="case-reference">Aktenzeichen (optional)</Label>
            <Input id="case-reference" name="referenceNumber" maxLength={120} />
          </div>

          {familyMode ? (
            <div className="space-y-1.5">
              <Label htmlFor="case-concerns">Betrifft (optional)</Label>
              <Input
                id="case-concerns"
                name="concerns"
                maxLength={80}
                placeholder="z.B. Tochter Lena"
              />
            </div>
          ) : null}

          {error ? <Alert variant="critical">{error}</Alert> : null}

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost">
                Abbrechen
              </Button>
            </DialogClose>
            <Button type="submit" disabled={pending}>
              {pending ? "Wird angelegt..." : "Anlegen"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
