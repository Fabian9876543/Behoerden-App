import { FileCheck2, FileQuestion } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { RequiredDocumentRow } from "@/lib/types/database";

export function RequiredDocumentsList({ items }: { items: RequiredDocumentRow[] }) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Es wurden keine zusätzlichen Unterlagen erkannt.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => {
        const fulfilled = Boolean(item.fulfilled_by_document_id);
        const Icon = fulfilled ? FileCheck2 : FileQuestion;
        return (
          <li key={item.id} className="flex items-start gap-3 rounded-lg border bg-card px-4 py-3">
            <Icon
              className={
                fulfilled
                  ? "mt-0.5 size-4 shrink-0 text-status-success"
                  : "mt-0.5 size-4 shrink-0 text-muted-foreground"
              }
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium">{item.name}</p>
                {!item.is_required ? <Badge variant="muted">Optional</Badge> : null}
                {fulfilled ? <Badge variant="success">Vorhanden</Badge> : null}
              </div>
              {item.description ? (
                <p className="mt-0.5 text-sm text-muted-foreground">{item.description}</p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
