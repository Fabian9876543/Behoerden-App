import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/errors";
import { log } from "@/lib/logging";
import { deriveDeadlineStatus } from "@/lib/dates";
import type { CaseRow, DeadlineRow, DeadlineStatus } from "@/lib/types/database";

export interface DeadlineWithCase extends DeadlineRow {
  cases: Pick<CaseRow, "id" | "title" | "authority_name"> | null;
}

export async function createDeadline(params: {
  userId: string;
  caseId: string;
  title: string;
  dueDate: string;
  description?: string | null;
  sourceDocumentId?: string | null;
  sourceText?: string | null;
  sourcePage?: number | null;
  confidence?: number | null;
}): Promise<DeadlineRow> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("deadlines")
    .insert({
      user_id: params.userId,
      case_id: params.caseId,
      title: params.title,
      due_date: params.dueDate,
      description: params.description ?? null,
      source_document_id: params.sourceDocumentId ?? null,
      source_text: params.sourceText ?? null,
      source_page: params.sourcePage ?? null,
      confidence: params.confidence ?? null,
      extracted_at: params.sourceDocumentId ? new Date().toISOString() : null,
      status: deriveDeadlineStatus(params.dueDate, "upcoming"),
    })
    .select("*")
    .single();

  if (error || !data) {
    log.error("deadline_insert_failed", { message: error?.message ?? "no data" });
    throw new AppError("database_failed", undefined, { cause: error });
  }
  return data;
}

export async function requireDeadline(deadlineId: string, userId: string): Promise<DeadlineRow> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("deadlines").select("*").eq("id", deadlineId).maybeSingle();
  if (!data || data.user_id !== userId) throw new AppError("not_found");
  return data;
}

export async function updateDeadline(
  deadlineId: string,
  patch: Partial<
    Pick<DeadlineRow, "title" | "description" | "due_date" | "status" | "reminder_days_before">
  >,
): Promise<DeadlineRow> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("deadlines")
    .update(patch)
    .eq("id", deadlineId)
    .select("*")
    .single();

  if (error || !data) {
    log.error("deadline_update_failed", { deadlineId, message: error?.message ?? "no data" });
    throw new AppError("database_failed", undefined, { cause: error });
  }
  return data;
}

export async function deleteDeadline(deadlineId: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("deadlines").delete().eq("id", deadlineId);
  if (error) throw new AppError("database_failed", undefined, { cause: error });
}

export async function listDeadlines(
  userId: string,
  options: { includeResolved?: boolean } = {},
): Promise<DeadlineWithCase[]> {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("deadlines")
    .select("*, cases(id, title, authority_name)")
    .eq("user_id", userId);

  if (!options.includeResolved) {
    query = query.not("status", "in", "(met,dismissed)");
  }

  const { data, error } = await query.order("due_date", { ascending: true });
  if (error) {
    log.error("deadlines_list_failed", { message: error.message });
    throw new AppError("database_failed", undefined, { cause: error });
  }

  // Der gespeicherte Status kann veraltet sein - beim Lesen neu ableiten.
  return ((data ?? []) as unknown as DeadlineWithCase[]).map((deadline) => ({
    ...deadline,
    status: deriveDeadlineStatus(deadline.due_date, deadline.status),
  }));
}

/** Fristen, die in der UI hervorgehoben werden. */
export function criticalDeadlines(deadlines: DeadlineWithCase[]): DeadlineWithCase[] {
  const critical: DeadlineStatus[] = ["overdue", "due_soon"];
  return deadlines.filter((deadline) => critical.includes(deadline.status));
}
