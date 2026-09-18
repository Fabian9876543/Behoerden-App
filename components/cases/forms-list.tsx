import { ClipboardList, ExternalLink, FileWarning } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { PrefillField } from "@/lib/ai/form-assistance";
import type { FormRow } from "@/lib/types/database";

const SOURCE_LABELS: Record<FormRow["source_kind"], string> = {
  official_catalog: "Offizielle Quelle",
  authority_website: "Behördenwebsite",
  unverified: "Quelle ungeprüft",
};

/**
 * Formulare zum Vorgang.
 *
 * Eine Quelle wird nur dann als offiziell ausgewiesen, wenn sie aus dem
 * hinterlegten Katalog stammt. Alles andere wird sichtbar als ungeprüft
 * gekennzeichnet - niemals als Tatsache dargestellt.
 */
export function FormsList({
  forms,
  prefill = [],
}: {
  forms: FormRow[];
  /** Werte aus dem Profil, die beim Ausfüllen helfen. */
  prefill?: PrefillField[];
}) {
  if (forms.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Im Schreiben wurden keine Formulare genannt.
      </p>
    );
  }

  return (
    <div className="space-y-4">
    <ul className="space-y-2">
      {forms.map((form) => (
        <li key={form.id} className="rounded-lg border bg-card px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium">{form.name}</p>
            {form.form_number ? <Badge variant="muted">{form.form_number}</Badge> : null}
            <Badge variant={form.source_kind === "official_catalog" ? "success" : "warning"}>
              {SOURCE_LABELS[form.source_kind]}
            </Badge>
          </div>

          {form.description ? (
            <p className="mt-1 text-sm text-muted-foreground">{form.description}</p>
          ) : null}

          {form.official_url ? (
            <a
              href={form.official_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              {form.source_label ?? "Zur Quelle"}
              <ExternalLink className="size-3.5" aria-hidden />
            </a>
          ) : (
            <p className="mt-2 flex items-start gap-1.5 text-xs text-status-warning">
              <FileWarning className="mt-px size-3.5 shrink-0" aria-hidden />
              Zu diesem Formular ist keine offizielle Quelle hinterlegt. Bitte suche es auf der
              Website der zuständigen Behörde.
            </p>
          )}
        </li>
      ))}
    </ul>

    {prefill.length > 0 ? (
      <details className="rounded-lg border bg-muted/40 px-4 py-3">
        <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium">
          <ClipboardList className="size-4 text-muted-foreground" aria-hidden />
          Angaben aus deinem Profil
        </summary>
        <p className="mt-2 text-xs text-muted-foreground">
          Diese Werte brauchst du in fast jedem Formular. Die Anwendung füllt nichts
          automatisch aus - du übernimmst sie selbst.
        </p>
        <dl className="mt-3 space-y-1.5">
          {prefill.map((field) => (
            <div key={field.label} className="flex flex-wrap gap-x-2 text-sm">
              <dt className="text-muted-foreground">{field.label}:</dt>
              <dd className="font-medium">{field.value}</dd>
            </div>
          ))}
        </dl>
      </details>
    ) : null}
    </div>
  );
}
