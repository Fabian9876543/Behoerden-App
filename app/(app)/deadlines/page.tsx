import type { Metadata } from "next";
import { CalendarClock, CalendarPlus } from "lucide-react";
import { requireUserOrRedirect } from "@/lib/auth";
import { criticalDeadlines, listDeadlines } from "@/lib/db/deadlines";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { DeadlineItem } from "@/components/deadlines/deadline-item";

export const metadata: Metadata = { title: "Fristen" };
export const dynamic = "force-dynamic";

export default async function DeadlinesPage() {
  const user = await requireUserOrRedirect();
  const deadlines = await listDeadlines(user.id, { includeResolved: true });

  const openDeadlines = deadlines.filter(
    (deadline) => deadline.status !== "met" && deadline.status !== "dismissed",
  );
  const critical = criticalDeadlines(openDeadlines);
  const upcoming = openDeadlines.filter((deadline) => !critical.includes(deadline));
  const resolved = deadlines.filter(
    (deadline) => deadline.status === "met" || deadline.status === "dismissed",
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Fristen</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Alle Termine aus deinen Vorgängen - nach Fälligkeit sortiert.
          </p>
        </div>

        {openDeadlines.length > 0 ? (
          <Button asChild variant="outline">
            <a href="/api/deadlines/ics" download="behoerdenbuddy-fristen.ics">
              <CalendarPlus className="size-4" aria-hidden />
              In Kalender exportieren
            </a>
          </Button>
        ) : null}
      </div>

      {deadlines.length === 0 ? (
        <EmptyState
          icon={<CalendarClock className="size-8" />}
          title="Keine Fristen"
          description="Fristen werden automatisch erkannt, sobald du einen Behördenbrief hochlädst."
        />
      ) : null}

      {critical.length > 0 ? (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight text-status-critical">
            Dringend
          </h2>
          <ul className="space-y-2">
            {critical.map((deadline) => (
              <DeadlineItem
                key={deadline.id}
                deadline={deadline}
                caseInfo={
                  deadline.cases ? { id: deadline.cases.id, title: deadline.cases.title } : null
                }
              />
            ))}
          </ul>
        </section>
      ) : null}

      {upcoming.length > 0 ? (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight">Anstehend</h2>
          <ul className="space-y-2">
            {upcoming.map((deadline) => (
              <DeadlineItem
                key={deadline.id}
                deadline={deadline}
                caseInfo={
                  deadline.cases ? { id: deadline.cases.id, title: deadline.cases.title } : null
                }
              />
            ))}
          </ul>
        </section>
      ) : null}

      {resolved.length > 0 ? (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight">Erledigt</h2>
          <ul className="space-y-2">
            {resolved.map((deadline) => (
              <DeadlineItem
                key={deadline.id}
                deadline={deadline}
                caseInfo={
                  deadline.cases ? { id: deadline.cases.id, title: deadline.cases.title } : null
                }
              />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
