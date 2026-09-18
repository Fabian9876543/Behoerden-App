import { Scale } from "lucide-react";

/**
 * Produktregel: Die Anwendung darf sich nie als Rechtsberatung darstellen.
 * Dieser Hinweis erscheint überall dort, wo KI-Ergebnisse gezeigt werden.
 */
export function LegalNotice({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <p className="text-xs text-muted-foreground">
        Keine Rechtsberatung. Bitte prüfe wichtige Angaben immer im Originalschreiben.
      </p>
    );
  }

  return (
    <div className="flex items-start gap-3 rounded-lg border bg-muted/50 px-4 py-3">
      <Scale className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
      <p className="text-xs leading-relaxed text-muted-foreground">
        BehördenBuddy hilft dir, Behördenpost zu verstehen und zu organisieren. Die
        Ergebnisse stammen aus einer automatischen Analyse und sind{" "}
        <strong className="font-medium text-foreground">keine Rechtsberatung</strong>. Prüfe
        Fristen und Pflichten immer im Originalschreiben. Bei rechtlichen Fragen wende dich an
        eine Beratungsstelle oder an eine Rechtsanwaltskanzlei.
      </p>
    </div>
  );
}
