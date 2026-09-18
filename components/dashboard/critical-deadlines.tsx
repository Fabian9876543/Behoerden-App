import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DeadlineStatusBadge } from "@/components/shared/status";
import { formatDate } from "@/lib/dates";
import type { DeadlineWithCase } from "@/lib/db/deadlines";

/** Kritische Fristen werden auf dem Dashboard ganz oben gezeigt. */
export function CriticalDeadlines({ deadlines }: { deadlines: DeadlineWithCase[] }) {
  if (deadlines.length === 0) return null;

  return (
    <Card className="border-status-critical/30 bg-status-critical/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-status-critical">
          <AlertTriangle className="size-4" aria-hidden />
          {deadlines.length === 1 ? "Eine Frist braucht Aufmerksamkeit" : "Fristen im Blick"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {deadlines.map((deadline) => (
          <Link
            key={deadline.id}
            href={`/cases/${deadline.case_id}`}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-card px-4 py-3 transition-colors hover:bg-accent"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{deadline.title}</p>
              <p className="truncate text-xs text-muted-foreground">
                {deadline.cases?.title ?? "Vorgang"} &middot; {formatDate(deadline.due_date)}
              </p>
            </div>
            <DeadlineStatusBadge status={deadline.status} dueDate={deadline.due_date} />
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
