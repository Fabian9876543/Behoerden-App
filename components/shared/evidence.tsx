import { FileText, Info } from "lucide-react";
import { isLowConfidence } from "@/lib/ai/schemas";
import { cn } from "@/lib/utils";

/**
 * Quellenangabe zu einer KI-extrahierten Information.
 *
 * Nachvollziehbarkeit ist ein Kernversprechen des Produkts: Jede Frist und
 * jede Aufgabe zeigt, worauf sie sich stützt - und markiert sichtbar, wenn
 * die Erkennung unsicher war.
 */
export function EvidenceNote({
  documentName,
  page,
  sourceText,
  confidence,
  className,
}: {
  documentName?: string | null;
  page?: number | null;
  sourceText?: string | null;
  confidence?: number | null;
  className?: string;
}) {
  const hasSource = Boolean(documentName || page || sourceText);
  const uncertain = isLowConfidence(confidence);

  if (!hasSource && !uncertain) return null;

  return (
    <div className={cn("space-y-1.5", className)}>
      {hasSource ? (
        <details className="group text-xs text-muted-foreground">
          <summary className="flex cursor-pointer list-none items-center gap-1.5 hover:text-foreground">
            <FileText className="size-3.5 shrink-0" aria-hidden />
            <span>
              Quelle: {documentName ?? "Dokument"}
              {page ? `, Seite ${page}` : ""}
            </span>
          </summary>
          {sourceText ? (
            <blockquote className="mt-2 border-l-2 border-border pl-3 italic leading-relaxed">
              &bdquo;{sourceText}&ldquo;
            </blockquote>
          ) : (
            <p className="mt-2 pl-3">Kein wörtliches Zitat hinterlegt.</p>
          )}
        </details>
      ) : null}

      {uncertain ? (
        <p className="flex items-start gap-1.5 text-xs text-status-warning">
          <Info className="mt-px size-3.5 shrink-0" aria-hidden />
          <span>Nicht eindeutig erkannt. Bitte überprüfe diese Angabe.</span>
        </p>
      ) : null}
    </div>
  );
}

/** Liste der Unsicherheitshinweise aus einer Analyse. */
export function UncertaintyNotes({ notes }: { notes: string[] }) {
  if (notes.length === 0) return null;
  return (
    <div className="rounded-lg border border-status-warning/30 bg-status-warning/8 px-4 py-3">
      <p className="mb-1.5 flex items-center gap-2 text-sm font-medium">
        <Info className="size-4 text-status-warning" aria-hidden />
        Bitte selbst prüfen
      </p>
      <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
        {notes.map((note, index) => (
          <li key={index}>{note}</li>
        ))}
      </ul>
    </div>
  );
}
