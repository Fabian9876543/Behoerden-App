"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Download, FileText, RefreshCw, Trash2 } from "lucide-react";
import { analyzeDocumentAction, deleteDocumentAction } from "@/app/actions/documents";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DocumentStatusBadge } from "@/components/shared/status";
import { formatDate } from "@/lib/dates";
import type { DocumentRow } from "@/lib/types/database";

function formatSize(bytes: number): string {
  if (bytes <= 0) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentList({
  documents,
  showCase = false,
  caseTitles,
}: {
  documents: DocumentRow[];
  showCase?: boolean;
  caseTitles?: Map<string, string>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (documents.length === 0) {
    return <p className="text-sm text-muted-foreground">Noch keine Dokumente.</p>;
  }

  return (
    <div className="space-y-3">
      {error ? <Alert variant="critical">{error}</Alert> : null}

      <ul className="space-y-2">
        {documents.map((document) => (
          <li
            key={document.id}
            className="flex flex-wrap items-start gap-3 rounded-lg border bg-card px-4 py-3"
          >
            <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-sm font-medium">{document.file_name}</p>
                <DocumentStatusBadge status={document.status} />
                {document.is_demo ? <Badge variant="muted">Demo</Badge> : null}
              </div>

              <p className="mt-0.5 text-xs text-muted-foreground">
                {formatDate(document.created_at)}
                {document.page_count ? ` · ${document.page_count} Seite(n)` : ""}
                {document.size_bytes > 0 ? ` · ${formatSize(document.size_bytes)}` : ""}
              </p>

              {showCase && document.case_id ? (
                <Link
                  href={`/cases/${document.case_id}`}
                  className="mt-1 inline-block text-xs text-muted-foreground hover:text-foreground hover:underline"
                >
                  {caseTitles?.get(document.case_id) ?? "Zum Vorgang"}
                </Link>
              ) : null}

              {document.status === "failed" && document.error_message ? (
                <p className="mt-1 text-xs text-status-critical">{document.error_message}</p>
              ) : null}
            </div>

            <div className="flex shrink-0 items-center gap-1">
              {!document.is_demo ? (
                <Button asChild variant="ghost" size="icon" aria-label="Dokument herunterladen">
                  <a href={`/api/documents/${document.id}/download`}>
                    <Download className="size-4 text-muted-foreground" aria-hidden />
                  </a>
                </Button>
              ) : null}

              {document.status === "failed" ? (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      setError(null);
                      const result = await analyzeDocumentAction(document.id);
                      if (!result.ok) {
                        setError(result.error?.message ?? "Die Analyse ist fehlgeschlagen.");
                        return;
                      }
                      router.refresh();
                    })
                  }
                >
                  <RefreshCw className="size-4" aria-hidden />
                  Erneut analysieren
                </Button>
              ) : null}

              <Button
                variant="ghost"
                size="icon"
                aria-label={`Dokument "${document.file_name}" loeschen`}
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    setError(null);
                    const result = await deleteDocumentAction(document.id);
                    if (!result.ok) {
                      setError(result.error?.message ?? "Das Dokument konnte nicht geloescht werden.");
                      return;
                    }
                    router.refresh();
                  })
                }
              >
                <Trash2 className="size-4 text-muted-foreground" aria-hidden />
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
