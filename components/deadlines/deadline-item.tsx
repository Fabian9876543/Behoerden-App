"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Trash2 } from "lucide-react";
import { deleteDeadlineAction, setDeadlineMetAction } from "@/app/actions/deadlines";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { DeadlineStatusBadge } from "@/components/shared/status";
import { EvidenceNote } from "@/components/shared/evidence";
import { DeadlineEditDialog } from "@/components/deadlines/deadline-edit-dialog";
import { formatDate } from "@/lib/dates";
import type { DeadlineRow } from "@/lib/types/database";

export function DeadlineItem({
  deadline,
  sourceDocumentName,
  caseInfo,
}: {
  deadline: DeadlineRow;
  sourceDocumentName?: string | null;
  caseInfo?: { id: string; title: string } | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const resolved = deadline.status === "met" || deadline.status === "dismissed";

  return (
    <li className="rounded-lg border bg-card px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium">{deadline.title}</p>
            <DeadlineStatusBadge status={deadline.status} dueDate={deadline.due_date} />
          </div>

          <p className="text-sm text-muted-foreground">
            Fällig am {formatDate(deadline.due_date)}
          </p>

          {deadline.description ? (
            <p className="text-sm text-muted-foreground">{deadline.description}</p>
          ) : null}

          {caseInfo ? (
            <Link
              href={`/cases/${caseInfo.id}`}
              className="inline-block text-xs text-muted-foreground hover:text-foreground hover:underline"
            >
              {caseInfo.title}
            </Link>
          ) : null}

          <EvidenceNote
            documentName={sourceDocumentName}
            page={deadline.source_page}
            sourceText={deadline.source_text}
            confidence={deadline.source_document_id ? deadline.confidence : null}
          />
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <DeadlineEditDialog deadline={deadline} />
          {!resolved ? (
            <Button
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await setDeadlineMetAction(deadline.id);
                  if (!result.ok) {
                    setError(result.error?.message ?? "Die Frist konnte nicht aktualisiert werden.");
                    return;
                  }
                  router.refresh();
                })
              }
            >
              <CheckCircle2 className="size-4" aria-hidden />
              Erledigt
            </Button>
          ) : null}

          <Button
            variant="ghost"
            size="icon"
            aria-label={`Frist "${deadline.title}" löschen`}
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await deleteDeadlineAction(deadline.id);
                if (!result.ok) {
                  setError(result.error?.message ?? "Die Frist konnte nicht gelöscht werden.");
                  return;
                }
                router.refresh();
              })
            }
          >
            <Trash2 className="size-4 text-muted-foreground" aria-hidden />
          </Button>
        </div>
      </div>

      {error ? (
        <Alert variant="critical" className="mt-3">
          {error}
        </Alert>
      ) : null}
    </li>
  );
}
