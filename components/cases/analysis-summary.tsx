import { BookOpen, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UncertaintyNotes } from "@/components/shared/evidence";
import { formatDate } from "@/lib/dates";
import type { StoredAnalysis } from "@/lib/db/analysis";

/**
 * Zeigt, was die Analyse aus dem Schreiben gelesen hat.
 *
 * Zwei Dinge, die das Produkt ausdruecklich zusichert und die sonst nirgends
 * sichtbar waeren: die Erklaerung der Fachbegriffe und - wichtiger - die
 * Punkte, bei denen die Analyse unsicher war.
 */
export function AnalysisSummary({ analyses }: { analyses: StoredAnalysis[] }) {
  if (analyses.length === 0) return null;

  const terms = dedupeTerms(analyses);
  const notes = dedupeNotes(analyses);

  if (terms.length === 0 && notes.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Das steht im Schreiben</CardTitle>
        <div className="flex flex-wrap gap-2 pt-1">
          {analyses.map((entry) => (
            <Badge key={entry.documentId} variant="muted">
              <FileText className="size-3" aria-hidden />
              {entry.analysis.documentType}
              {entry.analysis.documentDate ? ` vom ${formatDate(entry.analysis.documentDate)}` : ""}
            </Badge>
          ))}
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {notes.length > 0 ? <UncertaintyNotes notes={notes} /> : null}

        {terms.length > 0 ? (
          <div>
            <p className="mb-2 flex items-center gap-2 text-sm font-medium">
              <BookOpen className="size-4 text-muted-foreground" aria-hidden />
              Begriffe aus dem Schreiben
            </p>
            <dl className="space-y-2.5">
              {terms.map((term) => (
                <div key={term.term} className="rounded-lg bg-muted/60 px-3 py-2">
                  <dt className="text-sm font-medium">{term.term}</dt>
                  <dd className="mt-0.5 text-sm text-muted-foreground">{term.explanation}</dd>
                </div>
              ))}
            </dl>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function dedupeTerms(analyses: StoredAnalysis[]) {
  const seen = new Map<string, { term: string; explanation: string }>();
  for (const entry of analyses) {
    for (const term of entry.analysis.importantTerms) {
      const key = term.term.toLowerCase().trim();
      if (!seen.has(key)) seen.set(key, term);
    }
  }
  return [...seen.values()];
}

function dedupeNotes(analyses: StoredAnalysis[]): string[] {
  const notes = analyses.flatMap((entry) => entry.analysis.uncertaintyNotes);
  return [...new Set(notes)];
}
