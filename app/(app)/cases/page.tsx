import type { Metadata } from "next";
import { FolderKanban } from "lucide-react";
import { requireUserOrRedirect } from "@/lib/auth";
import { listCasesWithContext } from "@/lib/db/cases";
import { CaseCard } from "@/components/dashboard/case-card";
import { EmptyState } from "@/components/ui/empty-state";
import { NewCaseForm } from "@/components/cases/new-case-form";

export const metadata: Metadata = { title: "Meine Vorgänge" };
export const dynamic = "force-dynamic";

export default async function CasesPage() {
  const user = await requireUserOrRedirect();
  const cases = await listCasesWithContext(user.id);

  const active = cases.filter((c) => c.status !== "completed");
  const completed = cases.filter((c) => c.status === "completed");

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Meine Vorgänge</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Alle Behördenangelegenheiten an einem Ort.
          </p>
        </div>
        <NewCaseForm />
      </div>

      {cases.length === 0 ? (
        <EmptyState
          icon={<FolderKanban className="size-8" />}
          title="Noch keine Vorgänge"
          description="Lade auf dem Dashboard einen Behördenbrief hoch - daraus entsteht automatisch ein Vorgang."
        />
      ) : null}

      {active.length > 0 ? (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight">Aktiv</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {active.map((caseRow) => (
              <CaseCard key={caseRow.id} caseRow={caseRow} />
            ))}
          </div>
        </section>
      ) : null}

      {completed.length > 0 ? (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight">Abgeschlossen</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {completed.map((caseRow) => (
              <CaseCard key={caseRow.id} caseRow={caseRow} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
