"use client";

import { useState, useTransition } from "react";
import { AlertTriangle } from "lucide-react";
import { deleteAllDataAction } from "@/app/actions/profile";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * DSGVO-Funktion: alle eigenen Daten löschen.
 * Bewusst mit expliziter Texteingabe als Schutz vor Fehlklicks.
 */
export function DeleteDataSection() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState("");
  const [deleteAccount, setDeleteAccount] = useState(false);

  const canSubmit = confirmation.trim().toUpperCase() === "LOESCHEN";

  return (
    <div className="space-y-4">
      <Alert variant="critical">
        <span className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            Dabei werden alle Vorgänge, Dokumente, Aufgaben, Fristen und Entwürfe
            unwiderruflich gelöscht - auch die hochgeladenen Dateien.
          </span>
        </span>
      </Alert>

      <form
        action={(formData) => {
          startTransition(async () => {
            setError(null);
            const result = await deleteAllDataAction(formData);
            // Bei Erfolg leitet die Action zum Login um; hier landet nur der Fehlerfall.
            if (result && !result.ok) {
              setError(result.error?.message ?? "Das Löschen ist fehlgeschlagen.");
            }
          });
        }}
        className="space-y-4"
      >
        <div className="space-y-1.5">
          <Label htmlFor="confirmation">
            Tippe zur Bestätigung <strong className="font-mono">LOESCHEN</strong>
          </Label>
          <Input
            id="confirmation"
            name="confirmation"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            autoComplete="off"
            placeholder="LOESCHEN"
          />
        </div>

        <label className="flex items-start gap-3 text-sm">
          <Checkbox
            checked={deleteAccount}
            onCheckedChange={(value) => setDeleteAccount(value === true)}
            aria-label="Konto vollständig löschen"
          />
          <span>
            Auch mein Konto vollständig löschen
            <span className="block text-xs text-muted-foreground">
              Danach ist keine Anmeldung mehr möglich.
            </span>
          </span>
        </label>
        {/* Radix rendert kein natives Feld - der Wert wird hier gespiegelt. */}
        {deleteAccount ? <input type="hidden" name="deleteAccount" value="on" /> : null}

        {error ? <Alert variant="critical">{error}</Alert> : null}

        <Button type="submit" variant="destructive" disabled={!canSubmit || pending}>
          {pending ? "Wird gelöscht..." : "Alle meine Daten löschen"}
        </Button>
      </form>
    </div>
  );
}
