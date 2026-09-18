"use client";

import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { TaskItem } from "@/components/tasks/task-item";
import type { TaskRow } from "@/lib/types/database";

export interface TaskListEntry {
  task: TaskRow;
  sourceDocumentName?: string | null;
  caseInfo?: { id: string; title: string } | null;
}

export function TaskList({ entries }: { entries: TaskListEntry[] }) {
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      {error ? <Alert variant="critical">{error}</Alert> : null}
      <ul className="space-y-2">
        {entries.map((entry) => (
          <TaskItem
            key={entry.task.id}
            task={entry.task}
            sourceDocumentName={entry.sourceDocumentName}
            caseInfo={entry.caseInfo}
            onError={setError}
          />
        ))}
      </ul>
    </div>
  );
}
