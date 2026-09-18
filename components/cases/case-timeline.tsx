import { formatDate, formatDateTime } from "@/lib/dates";
import type { CaseEventRow } from "@/lib/types/database";

/**
 * Timeline eines Vorgangs. Zeigt ausschließlich die gespeicherten
 * Ereignistitel - keine Dokumentinhalte.
 */
export function CaseTimeline({ events }: { events: CaseEventRow[] }) {
  if (events.length === 0) {
    return <p className="text-sm text-muted-foreground">Noch keine Ereignisse.</p>;
  }

  return (
    <ol className="space-y-0">
      {events.map((event, index) => (
        <li key={event.id} className="relative flex gap-4 pb-5 last:pb-0">
          <div className="flex flex-col items-center">
            <span
              aria-hidden
              className="mt-1.5 size-2 shrink-0 rounded-full bg-primary/60 ring-4 ring-primary/10"
            />
            {index < events.length - 1 ? (
              <span aria-hidden className="mt-1 w-px flex-1 bg-border" />
            ) : null}
          </div>

          <div className="min-w-0 flex-1 pb-1">
            <p className="text-xs text-muted-foreground">
              <time dateTime={event.created_at} title={formatDateTime(event.created_at)}>
                {formatDate(event.created_at)}
              </time>
            </p>
            <p className="text-sm font-medium">{event.title}</p>
            {event.description ? (
              <p className="mt-0.5 text-sm text-muted-foreground">{event.description}</p>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
