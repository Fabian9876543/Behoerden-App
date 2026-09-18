import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/errors";
import { log } from "@/lib/logging";
import type { GeneratedLetterRow, LetterStatus } from "@/lib/types/database";

export async function createLetter(params: {
  userId: string;
  caseId: string;
  subject: string;
  body: string;
  intent: string;
  model: string;
}): Promise<GeneratedLetterRow> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("generated_letters")
    .insert({
      user_id: params.userId,
      case_id: params.caseId,
      subject: params.subject,
      body: params.body,
      intent: params.intent,
      model: params.model,
      status: "draft",
    })
    .select("*")
    .single();

  if (error || !data) {
    log.error("letter_insert_failed", { message: error?.message ?? "no data" });
    throw new AppError("database_failed", undefined, { cause: error });
  }
  return data;
}

export async function requireLetter(
  letterId: string,
  userId: string,
): Promise<GeneratedLetterRow> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("generated_letters")
    .select("*")
    .eq("id", letterId)
    .maybeSingle();
  if (!data || data.user_id !== userId) throw new AppError("not_found");
  return data;
}

export async function updateLetter(
  letterId: string,
  patch: { subject?: string; body?: string; status?: LetterStatus },
): Promise<GeneratedLetterRow> {
  const supabase = await createSupabaseServerClient();
  const approvedAt =
    patch.status === "approved" || patch.status === "sent"
      ? new Date().toISOString()
      : patch.status === "draft"
        ? null
        : undefined;

  const { data, error } = await supabase
    .from("generated_letters")
    .update({ ...patch, ...(approvedAt !== undefined ? { approved_at: approvedAt } : {}) })
    .eq("id", letterId)
    .select("*")
    .single();

  if (error || !data) {
    log.error("letter_update_failed", { letterId, message: error?.message ?? "no data" });
    throw new AppError("database_failed", undefined, { cause: error });
  }
  return data;
}

export async function deleteLetter(letterId: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("generated_letters").delete().eq("id", letterId);
  if (error) throw new AppError("database_failed", undefined, { cause: error });
}
