import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Compass, Inbox } from "lucide-react";
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
import { resolveMaxUploadBytes } from "@/lib/env";
import { LegalNotice } from "@/components/shared/legal-notice";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

/**
 * Die Analyse ruft Claude synchron im Request auf. Das Standard-Timeout einer
 * Serverless Function reicht dafür bei mehrseitigen Bescheiden nicht; 60
 * Sekunden sind auf dem Hobby-Plan die Obergrenze. Läuft die Anwendung
 * woanders, ist dieser Export wirkungslos.
 */
export const maxDuration = 60;


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
            ? "Lade deinen ersten Behördenbrief hoch - du erfährst sofort, was zu tun ist."
            : cases.length === 1
              ? "Du hast einen aktiven Vorgang."
              : `Du hast ${cases.length} aktive Vorgänge.`}
        </p>
      </div>

      {!isAiConfigured() ? (
        <Alert variant="warning">
          <AlertTitle>Analyse noch nicht konfiguriert</AlertTitle>
          Setze <code className="font-mono text-xs">ANTHROPIC_API_KEY</code> in{" "}
          <code className="font-mono text-xs">.env.local</code>, damit hochgeladene Dokumente
          analysiert werden können.
        </Alert>
      ) : null}

      <CriticalDeadlines deadlines={critical} />

      <section aria-labelledby="upload-heading" className="space-y-3">
        <h2 id="upload-heading" className="sr-only">
          Behördenbrief hinzufügen
        </h2>
        <UploadDropzone
          openCases={cases.map((entry) => ({ id: entry.id, title: entry.title }))}
          maxBytes={resolveMaxUploadBytes()}
        />

        {/* Zweiter Einstieg: Es gibt Dinge, für die kein Brief kommt. */}
        <div className="flex flex-wrap items-center justify-center gap-2 rounded-xl border bg-card px-4 py-3 text-sm">
          <Compass className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <span className="text-muted-foreground">Kein Brief, aber etwas steht an?</span>
          <Button asChild variant="link" className="h-auto p-0">
            <Link href="/lebenslagen">Umzug, Geburt und weitere Lebenslagen</Link>
          </Button>
        </div>
      </section>

      <section aria-labelledby="cases-heading" className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 id="cases-heading" className="text-lg font-semibold tracking-tight">
            Deine Vorgänge
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
            title="Noch keine Vorgänge"
            description="Sobald du einen Brief hochlädst, entsteht daraus automatisch ein Vorgang mit Fristen und Aufgaben."
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
