"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, PenLine, Trash2 } from "lucide-react";
import {
  approveLetterAction,
  deleteLetterAction,
  generateLetterAction,
  updateLetterAction,
} from "@/app/actions/letters";
import { LETTER_INTENTS } from "@/lib/ai/letter-intents";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime } from "@/lib/dates";
import type { GeneratedLetterRow } from "@/lib/types/database";

/**
 * Antwortentwuerfe.
 *
 * Der Entwurf ist immer bearbeitbar und muss ausdruecklich bestaetigt werden.
 * Es wird nie automatisch etwas versendet - das Kopieren und Absenden bleibt
 * in der Hand des Nutzers.
 */
/** Erstes Anliegen als Vorauswahl. */
const DEFAULT_INTENT: string = LETTER_INTENTS[0].key;

export function LetterComposer({
  caseId,
  letters,
}: {
  caseId: string;
  letters: GeneratedLetterRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [openPoints, setOpenPoints] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const onGenerate = (formData: FormData) => {
    formData.set("caseId", caseId);
    startTransition(async () => {
      setError(null);
      setOpenPoints([]);
      const result = await generateLetterAction(formData);
      if (!result.ok || !result.data) {
        setError(result.error?.message ?? "Der Entwurf konnte nicht erstellt werden.");
        return;
      }
      setOpenPoints(result.data.openPoints);
      setEditingId(result.data.letterId);
      router.refresh();
    });
  };

  return (
    <div className="space-y-5">
      <form action={onGenerate} className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="intent">Anliegen</Label>
          <Select id="intent" name="intent" defaultValue={DEFAULT_INTENT}>
            {LETTER_INTENTS.map((intent) => (
              <option key={intent.key} value={intent.key}>
                {intent.label} - {intent.description}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="note">Hinweis fuer den Entwurf (optional)</Label>
          <Textarea
            id="note"
            name="note"
            rows={3}
            maxLength={1000}
            placeholder="z.B. Ich bin bis zum 20.10. im Ausland und kann die Unterlagen erst danach einreichen."
          />
        </div>

        <Button type="submit" disabled={pending}>
          <PenLine className="size-4" aria-hidden />
          {pending ? "Entwurf wird erstellt..." : "Antwort erstellen"}
        </Button>
      </form>

      {error ? <Alert variant="critical">{error}</Alert> : null}

      {openPoints.length > 0 ? (
        <Alert variant="warning">
          <AlertTitle>Bitte vor dem Absenden ergaenzen</AlertTitle>
          <ul className="list-disc space-y-1 pl-5">
            {openPoints.map((point, index) => (
              <li key={index}>{point}</li>
            ))}
          </ul>
        </Alert>
      ) : null}

      {letters.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Noch kein Entwurf vorhanden. Waehle ein Anliegen und erstelle einen Vorschlag.
        </p>
      ) : (
        <ul className="space-y-4">
          {letters.map((letter) => {
            const isEditing = editingId === letter.id;
            return (
              <li key={letter.id} className="rounded-lg border bg-card p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={letter.status === "approved" ? "success" : "muted"}>
                      {letter.status === "approved" ? "Freigegeben" : "Entwurf"}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(letter.created_at)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        void navigator.clipboard.writeText(
                          `${letter.subject}\n\n${letter.body}`,
                        );
                        setCopiedId(letter.id);
                        window.setTimeout(() => setCopiedId(null), 2000);
                      }}
                    >
                      {copiedId === letter.id ? (
                        <Check className="size-4" aria-hidden />
                      ) : (
                        <Copy className="size-4" aria-hidden />
                      )}
                      {copiedId === letter.id ? "Kopiert" : "Kopieren"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Entwurf loeschen"
                      disabled={pending}
                      onClick={() =>
                        startTransition(async () => {
                          const result = await deleteLetterAction(letter.id);
                          if (!result.ok) {
                            setError(result.error?.message ?? "Loeschen fehlgeschlagen.");
                            return;
                          }
                          router.refresh();
                        })
                      }
                    >
                      <Trash2 className="size-4 text-muted-foreground" aria-hidden />
                    </Button>
                  </div>
                </div>

                {isEditing ? (
                  <form
                    action={(formData) => {
                      formData.set("letterId", letter.id);
                      startTransition(async () => {
                        const result = await updateLetterAction(formData);
                        if (!result.ok) {
                          setError(result.error?.message ?? "Speichern fehlgeschlagen.");
                          return;
                        }
                        setEditingId(null);
                        router.refresh();
                      });
                    }}
                    className="space-y-3"
                  >
                    <div className="space-y-1.5">
                      <Label htmlFor={`subject-${letter.id}`}>Betreff</Label>
                      <Input
                        id={`subject-${letter.id}`}
                        name="subject"
                        defaultValue={letter.subject}
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor={`body-${letter.id}`}>Text</Label>
                      <Textarea
                        id={`body-${letter.id}`}
                        name="body"
                        defaultValue={letter.body}
                        rows={14}
                        required
                        className="font-mono text-xs leading-relaxed"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" disabled={pending}>
                        Speichern
                      </Button>
                      <Button type="button" variant="ghost" onClick={() => setEditingId(null)}>
                        Abbrechen
                      </Button>
                    </div>
                  </form>
                ) : (
                  <>
                    <p className="text-sm font-medium">{letter.subject}</p>
                    <pre className="mt-2 whitespace-pre-wrap font-sans text-sm leading-relaxed text-muted-foreground">
                      {letter.body}
                    </pre>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" onClick={() => setEditingId(letter.id)}>
                        <PenLine className="size-4" aria-hidden />
                        Bearbeiten
                      </Button>
                      {letter.status !== "approved" ? (
                        <Button
                          size="sm"
                          disabled={pending}
                          onClick={() =>
                            startTransition(async () => {
                              const result = await approveLetterAction(letter.id);
                              if (!result.ok) {
                                setError(result.error?.message ?? "Freigabe fehlgeschlagen.");
                                return;
                              }
                              router.refresh();
                            })
                          }
                        >
                          <Check className="size-4" aria-hidden />
                          Geprueft und freigeben
                        </Button>
                      ) : null}
                    </div>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <p className="text-xs text-muted-foreground">
        Entwuerfe werden nicht automatisch versendet. Pruefe den Text, ergaenze fehlende
        Angaben und verschicke ihn selbst.
      </p>
    </div>
  );
}
