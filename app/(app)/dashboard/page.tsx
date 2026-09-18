import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Inbox } from "lucide-react";
import { getProfile, requireUserOrRedirect } from "@/lib/auth";
import { listCasesWithContext } from "@/lib/db/cases";
import { criticalDeadlines, listDeadlines } from "@/lib/db/deadlines";
import { greeting } from "@/lib/dates";
import { isAiConfigured } from "@/lib/env";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { CaseCard } from "@/components/dashboard/case-card";
import { CriticalDeadlines } from "@/components/dashboard/critical-deadlines";
import { DemoCaseButton } from "@/components/dashboard/demo-case-button";
import { UploadDropzone } from "@/components/documents/upload-dropzone";
import { LegalNotice } from "@/components/shared/legal-notice";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUserOrRedirect();
  const [profile, cases, deadlines] = await Promise.all([
    getProfile(user.id),
    listCasesWithContext(user.id, { onlyActive: true }),
    listDeadlines(user.id),
  ]);

  const critical = criticalDeadlines(deadlines);
  const firstName = profile?.first_name?.trim();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {greeting()}
          {firstName ? `, ${firstName}` : ""}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {cases.length === 0
            ? "Lade deinen ersten Behoerdenbrief hoch - du erfaehrst sofort, was zu tun ist."
            : cases.length === 1
              ? "Du hast einen aktiven Vorgang."
              : `Du hast ${cases.length} aktive Vorgaenge.`}
        </p>
      </div>

      {!isAiConfigured() ? (
        <Alert variant="warning">
          <AlertTitle>Analyse noch nicht konfiguriert</AlertTitle>
          Setze <code className="font-mono text-xs">ANTHROPIC_API_KEY</code> in{" "}
          <code className="font-mono text-xs">.env.local</code>, damit hochgeladene Dokumente
          analysiert werden koennen.
        </Alert>
      ) : null}

      <CriticalDeadlines deadlines={critical} />

      <section aria-labelledby="upload-heading" className="space-y-3">
        <h2 id="upload-heading" className="sr-only">
          Behoerdenbrief hinzufuegen
        </h2>
        <UploadDropzone />
      </section>

      <section aria-labelledby="cases-heading" className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 id="cases-heading" className="text-lg font-semibold tracking-tight">
            Deine Vorgaenge
          </h2>
          {cases.length > 0 ? (
            <Button asChild variant="ghost" size="sm">
              <Link href="/cases">
                Alle ansehen
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </Button>
          ) : null}
        </div>

        {cases.length === 0 ? (
          <EmptyState
            icon={<Inbox className="size-8" />}
            title="Noch keine Vorgaenge"
            description="Sobald du einen Brief hochlaedst, entsteht daraus automatisch ein Vorgang mit Fristen und Aufgaben."
            action={<DemoCaseButton />}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {cases.map((caseRow) => (
              <CaseCard key={caseRow.id} caseRow={caseRow} />
            ))}
          </div>
        )}
      </section>

      <LegalNotice />
    </div>
  );
}
