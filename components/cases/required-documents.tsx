"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileCheck2, FileQuestion } from "lucide-react";
import { setRequiredDocumentAction } from "@/app/actions/required-documents";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import type { DocumentRow, RequiredDocumentRow } from "@/lib/types/database";

/**
 * Benoetigte Unterlagen zum Vorgang.
 *
 * Der Nutzer kann jede Unterlage einem hochgeladenen Dokument zuordnen -
 * so beantwortet die Liste die Frage "Was fehlt mir noch?".
 */
export function RequiredDocumentsList({
  items,
  documents,
}: {
  items: RequiredDocumentRow[];
  documents: DocumentRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Es wurden keine zusätzlichen Unterlagen erkannt.
      </p>
    );
  }

  const assignable = documents.filter((document) => !document.is_demo);

  return (
    <div className="space-y-3">
      {error ? <Alert variant="critical">{error}</Alert> : null}

      <ul className="space-y-2">
        {items.map((item) => {
          const fulfilled = Boolean(item.fulfilled_by_document_id);
          const Icon = fulfilled ? FileCheck2 : FileQuestion;
          return (
            <li key={item.id} className="flex items-start gap-3 rounded-lg border bg-card px-4 py-3">
              <Icon
                className={
                  fulfilled
                    ? "mt-0.5 size-4 shrink-0 text-status-success"
                    : "mt-0.5 size-4 shrink-0 text-muted-foreground"
                }
                aria-hidden
              />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium">{item.name}</p>
                  {!item.is_required ? <Badge variant="muted">Optional</Badge> : null}
                  {fulfilled ? <Badge variant="success">Vorhanden</Badge> : null}
                </div>

                {item.description ? (
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                ) : null}

                <Select
                  aria-label={`Dokument für "${item.name}" zuordnen`}
                  className="h-9 text-xs"
                  disabled={pending || assignable.length === 0}
                  value={item.fulfilled_by_document_id ?? ""}
                  onChange={(event) => {
                    const value = event.target.value || null;
                    startTransition(async () => {
                      setError(null);
                      const result = await setRequiredDocumentAction(item.id, value);
                      if (!result.ok) {
                        setError(result.error?.message ?? "Die Zuordnung ist fehlgeschlagen.");
                        return;
                      }
                      router.refresh();
                    });
                  }}
                >
                  <option value="">
                    {assignable.length === 0 ? "Noch kein Dokument hochgeladen" : "Noch nicht vorhanden"}
                  </option>
                  {assignable.map((document) => (
                    <option key={document.id} value={document.id}>
                      {document.file_name}
                    </option>
                  ))}
                </Select>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
