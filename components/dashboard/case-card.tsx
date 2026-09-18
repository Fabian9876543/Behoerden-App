import Link from "next/link";
import { ArrowRight, CalendarClock, ListTodo } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { CaseStatusBadge, DeadlineStatusBadge } from "@/components/shared/status";
import { formatDate } from "@/lib/dates";
import type { CaseWithCounts } from "@/lib/db/cases";

export function CaseCard({ caseRow }: { caseRow: CaseWithCounts }) {
  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          {caseRow.authority_name ? (
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {caseRow.authority_name}
            </span>
          ) : null}
          {caseRow.is_demo ? <Badge variant="muted">Demo</Badge> : null}
        </div>
        <h3 className="text-base font-semibold leading-snug">{caseRow.title}</h3>
        <div className="mt-1 flex flex-wrap gap-2">
          <CaseStatusBadge status={caseRow.status} />
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-3 text-sm">
        {caseRow.nextTask ? (
          <div className="flex items-start gap-2.5">
            <ListTodo className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Nächste Aufgabe</p>
              <p className="font-medium">{caseRow.nextTask.title}</p>
              {caseRow.openTaskCount > 1 ? (
                <p className="text-xs text-muted-foreground">
                  und {caseRow.openTaskCount - 1} weitere
                </p>
              ) : null}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Keine offenen Aufgaben.</p>
        )}

        {caseRow.nextDeadline ? (
          <div className="flex items-start gap-2.5">
            <CalendarClock className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Frist</p>
              <p className="font-medium">{formatDate(caseRow.nextDeadline.due_date)}</p>
              <div className="mt-1">
                <DeadlineStatusBadge
                  status={caseRow.nextDeadline.status}
                  dueDate={caseRow.nextDeadline.due_date}
                />
              </div>
            </div>
          </div>
        ) : null}
      </CardContent>

      <CardFooter>
        <Button asChild variant="outline" className="w-full">
          <Link href={`/cases/${caseRow.id}`}>
            Vorgang öffnen
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
