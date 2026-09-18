import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/errors";
import { log } from "@/lib/logging";
import type { CaseRow, TaskRow, TaskStatus } from "@/lib/types/database";

export interface TaskWithCase extends TaskRow {
  cases: Pick<CaseRow, "id" | "title" | "authority_name" | "status"> | null;
}

export async function createTask(params: {
  userId: string;
  caseId: string;
  title: string;
  description?: string | null;
  dueDate?: string | null;
  isRequired?: boolean;
  sourceDocumentId?: string | null;
  deadlineId?: string | null;
  sourceText?: string | null;
  sourcePage?: number | null;
  confidence?: number | null;
  position?: number;
  generatedBy?: "ai" | "user" | "demo";
}): Promise<TaskRow> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      user_id: params.userId,
      case_id: params.caseId,
      title: params.title,
      description: params.description ?? null,
      due_date: params.dueDate ?? null,
      is_required: params.isRequired ?? true,
      source_document_id: params.sourceDocumentId ?? null,
      deadline_id: params.deadlineId ?? null,
      source_text: params.sourceText ?? null,
      source_page: params.sourcePage ?? null,
      confidence: params.confidence ?? null,
      position: params.position ?? 0,
      generated_by: params.generatedBy ?? "user",
    })
    .select("*")
    .single();

  if (error || !data) {
    log.error("task_insert_failed", { message: error?.message ?? "no data" });
    throw new AppError("database_failed", undefined, { cause: error });
  }
  return data;
}

export async function requireTask(taskId: string, userId: string): Promise<TaskRow> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("tasks").select("*").eq("id", taskId).maybeSingle();
  if (!data || data.user_id !== userId) throw new AppError("not_found");
  return data;
}

export async function updateTask(
  taskId: string,
  patch: Partial<Pick<TaskRow, "title" | "description" | "due_date" | "status" | "is_required">>,
): Promise<TaskRow> {
  const supabase = await createSupabaseServerClient();
  const completedAt =
    patch.status === "completed"
      ? new Date().toISOString()
      : patch.status !== undefined
        ? null
        : undefined;

  const { data, error } = await supabase
    .from("tasks")
    .update({ ...patch, ...(completedAt !== undefined ? { completed_at: completedAt } : {}) })
    .eq("id", taskId)
    .select("*")
    .single();

  if (error || !data) {
    log.error("task_update_failed", { taskId, message: error?.message ?? "no data" });
    throw new AppError("database_failed", undefined, { cause: error });
  }
  return data;
}

export async function deleteTask(taskId: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("tasks").delete().eq("id", taskId);
  if (error) throw new AppError("database_failed", undefined, { cause: error });
}

export async function listTasks(
  userId: string,
  options: { statuses?: TaskStatus[] } = {},
): Promise<TaskWithCase[]> {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("tasks")
    .select("*, cases(id, title, authority_name, status)")
    .eq("user_id", userId);

  if (options.statuses && options.statuses.length > 0) {
    query = query.in("status", options.statuses);
  }

  const { data, error } = await query
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("position", { ascending: true });

  if (error) {
    log.error("tasks_list_failed", { message: error.message });
    throw new AppError("database_failed", undefined, { cause: error });
  }
  return (data ?? []) as unknown as TaskWithCase[];
}
