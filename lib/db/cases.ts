import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/errors";
import { log } from "@/lib/logging";
import { deriveDeadlineStatus } from "@/lib/dates";
import type {
  CasePriority,
  CaseRow,
  CaseStatus,
  DeadlineRow,
  DocumentRow,
  FormRow,
  GeneratedLetterRow,
  RequiredDocumentRow,
  TaskRow,
} from "@/lib/types/database";

export interface CaseWithCounts extends CaseRow {
  openTaskCount: number;
  nextTask: Pick<TaskRow, "id" | "title" | "due_date"> | null;
  nextDeadline: Pick<DeadlineRow, "id" | "title" | "due_date" | "status"> | null;
}

export interface CaseDetail {
  caseRow: CaseRow;
  documents: DocumentRow[];
  tasks: TaskRow[];
  deadlines: DeadlineRow[];
  requiredDocuments: RequiredDocumentRow[];
  forms: FormRow[];
  letters: GeneratedLetterRow[];
}

export async function createCase(params: {
  userId: string;
  title: string;
  authorityName?: string | null;
  authorityKey?: string | null;
  caseType?: string | null;
  referenceNumber?: string | null;
  status?: CaseStatus;
  priority?: CasePriority;
  summary?: string | null;
  isDemo?: boolean;
}): Promise<CaseRow> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("cases")
    .insert({
      user_id: params.userId,
      title: params.title,
      authority_name: params.authorityName ?? null,
      authority_key: params.authorityKey ?? null,
      case_type: params.caseType ?? null,
      reference_number: params.referenceNumber ?? null,
      status: params.status ?? "in_progress",
      priority: params.priority ?? "normal",
      summary: params.summary ?? null,
      is_demo: params.isDemo ?? false,
    })
    .select("*")
    .single();

  if (error || !data) {
    log.error("case_insert_failed", { message: error?.message ?? "no data" });
    throw new AppError("database_failed", undefined, { cause: error });
  }
  return data;
}

export async function getCase(caseId: string): Promise<CaseRow | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("cases").select("*").eq("id", caseId).maybeSingle();
  return data ?? null;
}

/** Wirft, wenn der Vorgang nicht existiert oder nicht dem Nutzer gehört. */
export async function requireCase(caseId: string, userId: string): Promise<CaseRow> {
  const caseRow = await getCase(caseId);
  // RLS filtert bereits, die explizite Prüfung ist die zweite Verteidigungslinie.
  if (!caseRow || caseRow.user_id !== userId) throw new AppError("not_found");
  return caseRow;
}

export async function updateCase(
  caseId: string,
  patch: Partial<
    Pick<
      CaseRow,
      | "title"
      | "authority_name"
      | "authority_key"
      | "case_type"
      | "reference_number"
      | "status"
      | "priority"
      | "summary"
      | "closed_at"
    >
  >,
): Promise<CaseRow> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("cases")
    .update(patch)
    .eq("id", caseId)
    .select("*")
    .single();

  if (error || !data) {
    log.error("case_update_failed", { caseId, message: error?.message ?? "no data" });
    throw new AppError("database_failed", undefined, { cause: error });
  }
  return data;
}

export async function deleteCase(caseId: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("cases").delete().eq("id", caseId);
  if (error) {
    log.error("case_delete_failed", { caseId, message: error.message });
    throw new AppError("database_failed", undefined, { cause: error });
  }
}

const ACTIVE_STATUSES: CaseStatus[] = [
  "action_required",
  "waiting_on_user",
  "waiting_on_authority",
  "in_progress",
];

/** Vorgänge inklusive nächster Aufgabe und nächster Frist für das Dashboard. */
export async function listCasesWithContext(
  userId: string,
  options: { onlyActive?: boolean } = {},
): Promise<CaseWithCounts[]> {
  const supabase = await createSupabaseServerClient();

  let query = supabase.from("cases").select("*").eq("user_id", userId);
  if (options.onlyActive) query = query.in("status", ACTIVE_STATUSES);

  const { data: cases, error } = await query.order("updated_at", { ascending: false });
  if (error) {
    log.error("cases_list_failed", { message: error.message });
    throw new AppError("database_failed", undefined, { cause: error });
  }
  if (!cases || cases.length === 0) return [];

  const caseIds = cases.map((c) => c.id);

  const [{ data: tasks }, { data: deadlines }] = await Promise.all([
    supabase
      .from("tasks")
      .select("id, case_id, title, due_date, status, position")
      .in("case_id", caseIds)
      .in("status", ["open", "in_progress"])
      .order("position", { ascending: true }),
    supabase
      .from("deadlines")
      .select("id, case_id, title, due_date, status")
      .in("case_id", caseIds)
      .not("status", "in", "(met,dismissed)")
      .order("due_date", { ascending: true }),
  ]);

  type TaskSummary = NonNullable<typeof tasks>[number];
  type DeadlineSummary = NonNullable<typeof deadlines>[number];

  const tasksByCase = new Map<string, TaskSummary[]>();
  for (const task of tasks ?? []) {
    const list = tasksByCase.get(task.case_id);
    if (list) list.push(task);
    else tasksByCase.set(task.case_id, [task]);
  }

  const deadlinesByCase = new Map<string, DeadlineSummary[]>();
  for (const deadline of deadlines ?? []) {
    const list = deadlinesByCase.get(deadline.case_id);
    if (list) list.push(deadline);
    else deadlinesByCase.set(deadline.case_id, [deadline]);
  }

  return cases.map((caseRow) => {
    const caseTasks = tasksByCase.get(caseRow.id) ?? [];
    const caseDeadlines = deadlinesByCase.get(caseRow.id) ?? [];
    const nextTask = caseTasks[0];
    const nextDeadline = caseDeadlines[0];

    return {
      ...caseRow,
      openTaskCount: caseTasks.length,
      nextTask: nextTask
        ? { id: nextTask.id, title: nextTask.title, due_date: nextTask.due_date }
        : null,
      nextDeadline: nextDeadline
        ? {
            id: nextDeadline.id,
            title: nextDeadline.title,
            due_date: nextDeadline.due_date,
            status: deriveDeadlineStatus(nextDeadline.due_date, nextDeadline.status),
          }
        : null,
    };
  });
}

export async function getCaseDetail(caseId: string, userId: string): Promise<CaseDetail> {
  const caseRow = await requireCase(caseId, userId);
  const supabase = await createSupabaseServerClient();

  const [documents, tasks, deadlines, requiredDocuments, forms, letters] = await Promise.all([
    supabase
      .from("documents")
      .select("*")
      .eq("case_id", caseId)
      .order("created_at", { ascending: false }),
    supabase
      .from("tasks")
      .select("*")
      .eq("case_id", caseId)
      .order("position", { ascending: true }),
    supabase
      .from("deadlines")
      .select("*")
      .eq("case_id", caseId)
      .order("due_date", { ascending: true }),
    supabase
      .from("required_documents")
      .select("*")
      .eq("case_id", caseId)
      .order("created_at", { ascending: true }),
    supabase.from("forms").select("*").eq("case_id", caseId).order("created_at"),
    supabase
      .from("generated_letters")
      .select("*")
      .eq("case_id", caseId)
      .order("created_at", { ascending: false }),
  ]);

  return {
    caseRow,
    documents: documents.data ?? [],
    tasks: tasks.data ?? [],
    deadlines: (deadlines.data ?? []).map((deadline) => ({
      ...deadline,
      status: deriveDeadlineStatus(deadline.due_date, deadline.status),
    })),
    requiredDocuments: requiredDocuments.data ?? [],
    forms: forms.data ?? [],
    letters: letters.data ?? [],
  };
}

/** Setzt den Vorgangsstatus anhand der offenen Aufgaben neu. */
export async function refreshCaseStatus(caseId: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { data: tasks } = await supabase
    .from("tasks")
    .select("status, is_required")
    .eq("case_id", caseId);

  const { data: caseRow } = await supabase
    .from("cases")
    .select("status")
    .eq("id", caseId)
    .maybeSingle();

  // Abgeschlossene Vorgänge bleiben abgeschlossen, bis der Nutzer sie öffnet.
  if (!caseRow || caseRow.status === "completed") return;

  const open = (tasks ?? []).filter(
    (task) => task.status === "open" || task.status === "in_progress",
  );
  const requiredOpen = open.filter((task) => task.is_required);

  const nextStatus: CaseStatus =
    requiredOpen.length > 0
      ? "action_required"
      : open.length > 0
        ? "waiting_on_user"
        : "waiting_on_authority";

  if (nextStatus !== caseRow.status) {
    await supabase.from("cases").update({ status: nextStatus }).eq("id", caseId);
  }
}
