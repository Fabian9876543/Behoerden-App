import type { Metadata } from "next";
import { ListTodo } from "lucide-react";
import { requireUserOrRedirect } from "@/lib/auth";
import { listTasks } from "@/lib/db/tasks";
import { EmptyState } from "@/components/ui/empty-state";
import { TaskList } from "@/components/tasks/task-list";
import type { TaskListEntry } from "@/components/tasks/task-list";

export const metadata: Metadata = { title: "Aufgaben" };
export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const user = await requireUserOrRedirect();
  const tasks = await listTasks(user.id);

  const toEntry = (task: (typeof tasks)[number]): TaskListEntry => ({
    task,
    caseInfo: task.cases ? { id: task.cases.id, title: task.cases.title } : null,
  });

  const open = tasks.filter((task) => task.status === "open" || task.status === "in_progress");
  const done = tasks.filter((task) => task.status === "completed");
  const dismissed = tasks.filter((task) => task.status === "dismissed");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Aufgaben</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {open.length === 0
            ? "Aktuell ist nichts offen."
            : open.length === 1
              ? "Eine Aufgabe wartet auf dich."
              : `${open.length} Aufgaben warten auf dich.`}
        </p>
      </div>

      {tasks.length === 0 ? (
        <EmptyState
          icon={<ListTodo className="size-8" />}
          title="Noch keine Aufgaben"
          description="Aufgaben entstehen automatisch, sobald du einen Behoerdenbrief hochlaedst."
        />
      ) : null}

      {open.length > 0 ? (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight">Offen</h2>
          <TaskList entries={open.map(toEntry)} />
        </section>
      ) : null}

      {done.length > 0 ? (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight">Erledigt</h2>
          <TaskList entries={done.map(toEntry)} />
        </section>
      ) : null}

      {dismissed.length > 0 ? (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight">Nicht noetig</h2>
          <TaskList entries={dismissed.map(toEntry)} />
        </section>
      ) : null}
    </div>
  );
}
