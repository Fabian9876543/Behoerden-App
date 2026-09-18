import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { requireUserOrRedirect } from "@/lib/auth";
import { getCaseDetail, type CaseDetail } from "@/lib/db/cases";
import { getCaseTimeline } from "@/lib/db/events";
import { AppError } from "@/lib/errors";
import { formatDate } from "@/lib/dates";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CaseStatusBadge, PriorityBadge } from "@/components/shared/status";
import { LegalNotice } from "@/components/shared/legal-notice";
import { NextSteps } from "@/components/cases/next-steps";
import { CaseActions } from "@/components/cases/case-actions";
import { CaseTimeline } from "@/components/cases/case-timeline";
import { AddTaskForm } from "@/components/cases/add-task-form";
import { FormsList } from "@/components/cases/forms-list";
import { RequiredDocumentsList } from "@/components/cases/required-documents";
import { LetterComposer } from "@/components/cases/letter-composer";
import { TaskList } from "@/components/tasks/task-list";
import { DeadlineItem } from "@/components/deadlines/deadline-item";
import { DocumentList } from "@/components/documents/document-list";
import { UploadDropzone } from "@/components/documents/upload-dropzone";

export const metadata: Metadata = { title: "Vorgang" };
export const dynamic = "force-dynamic";

export default async function CaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUserOrRedirect();

  let detail: CaseDetail;
  try {
    detail = await getCaseDetail(id, user.id);
  } catch (error) {
    if (error instanceof AppError && error.code === "not_found") notFound();
    throw error;
  }

  const timeline = await getCaseTimeline(id);
  const { caseRow, tasks, deadlines, documents, requiredDocuments, forms, letters } = detail;

  const documentNames = new Map(documents.map((doc) => [doc.id, doc.file_name]));
  const failedDocuments = documents.filter((doc) => doc.status === "failed");

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {caseRow.authority_name ? (
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {caseRow.authority_name}
            </span>
          ) : null}
          {caseRow.is_demo ? <Badge variant="muted">Demo</Badge> : null}
        </div>

        <h1 className="text-2xl font-semibold tracking-tight">{caseRow.title}</h1>

        <div className="flex flex-wrap items-center gap-2">
          <CaseStatusBadge status={caseRow.status} />
          <PriorityBadge priority={caseRow.priority} />
          {caseRow.reference_number ? (
            <Badge variant="outline">Aktenzeichen: {caseRow.reference_number}</Badge>
          ) : null}
        </div>

        <p className="text-xs text-muted-foreground">
          Angelegt am {formatDate(caseRow.created_at)}
        </p>
      </header>

      {failedDocuments.length > 0 ? (
        <Alert variant="warning">
          <AlertTitle className="flex items-center gap-2">
            <AlertTriangle className="size-4" aria-hidden />
            {failedDocuments.length === 1
              ? "Ein Dokument konnte nicht analysiert werden"
              : `${failedDocuments.length} Dokumente konnten nicht analysiert werden`}
          </AlertTitle>
          {failedDocuments[0]?.error_message ??
            "Die Analyse ist fehlgeschlagen. Du kannst sie unten erneut starten."}
        </Alert>
      ) : null}

      <NextSteps tasks={tasks} deadlines={deadlines} summary={caseRow.summary} />

      <section aria-labelledby="tasks-heading" className="space-y-4">
        <h2 id="tasks-heading" className="text-lg font-semibold tracking-tight">
          Aufgaben
        </h2>
        {tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">Noch keine Aufgaben.</p>
        ) : (
          <TaskList
            entries={tasks.map((task) => ({
              task,
              sourceDocumentName: task.source_document_id
                ? (documentNames.get(task.source_document_id) ?? null)
                : null,
            }))}
          />
        )}
        <AddTaskForm caseId={caseRow.id} />
      </section>

      <section aria-labelledby="deadlines-heading" className="space-y-4">
        <h2 id="deadlines-heading" className="text-lg font-semibold tracking-tight">
          Fristen
        </h2>
        {deadlines.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            In diesem Vorgang wurde keine Frist erkannt.
          </p>
        ) : (
          <ul className="space-y-2">
            {deadlines.map((deadline) => (
              <DeadlineItem
                key={deadline.id}
                deadline={deadline}
                sourceDocumentName={
                  deadline.source_document_id
                    ? (documentNames.get(deadline.source_document_id) ?? null)
                    : null
                }
              />
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Benötigte Unterlagen</CardTitle>
          </CardHeader>
          <CardContent>
            <RequiredDocumentsList items={requiredDocuments} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Formulare</CardTitle>
          </CardHeader>
          <CardContent>
            <FormsList forms={forms} />
          </CardContent>
        </Card>
      </div>

      <section aria-labelledby="documents-heading" className="space-y-4">
        <h2 id="documents-heading" className="text-lg font-semibold tracking-tight">
          Dokumente
        </h2>
        <DocumentList documents={documents} />
        <UploadDropzone caseId={caseRow.id} compact />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Antwortschreiben</CardTitle>
        </CardHeader>
        <CardContent>
          <LetterComposer caseId={caseRow.id} letters={letters} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Verlauf</CardTitle>
        </CardHeader>
        <CardContent>
          <CaseTimeline events={timeline} />
        </CardContent>
      </Card>

      <CaseActions caseId={caseRow.id} status={caseRow.status} />

      <LegalNotice />
    </div>
  );
}
