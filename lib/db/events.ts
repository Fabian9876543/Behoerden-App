import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { log } from "@/lib/logging";
import type { CaseEventRow } from "@/lib/types/database";

/**
 * Case-Timeline.
 *
 * Wichtig: metadata enthaelt ausschliesslich IDs und Zaehler - niemals
 * Dokumentinhalte oder personenbezogene Texte.
 */

export type CaseEventType =
  | "case_created"
  | "document_uploaded"
  | "text_extracted"
  | "authority_detected"
  | "deadline_detected"
  | "tasks_created"
  | "documents_required"
  | "forms_detected"
  | "task_completed"
  | "task_reopened"
  | "deadline_met"
  | "letter_drafted"
  | "letter_approved"
  | "case_status_changed"
  | "case_closed"
  | "document_deleted"
  | "analysis_failed";

export interface RecordEventInput {
  userId: string;
  caseId: string;
  type: CaseEventType;
  title: string;
  description?: string | null;
  metadata?: Record<string, string | number | boolean | null>;
}

export async function recordCaseEvent(input: RecordEventInput): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("case_events").insert({
    user_id: input.userId,
    case_id: input.caseId,
    event_type: input.type,
    title: input.title,
    description: input.description ?? null,
    metadata: input.metadata ?? {},
  });

  if (error) {
    // Die Timeline ist wichtig, aber kein Grund, den Hauptvorgang scheitern
    // zu lassen.
    log.warn("case_event_insert_failed", { caseId: input.caseId, type: input.type });
  }
}

export async function recordCaseEvents(events: RecordEventInput[]): Promise<void> {
  if (events.length === 0) return;
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("case_events").insert(
    events.map((event) => ({
      user_id: event.userId,
      case_id: event.caseId,
      event_type: event.type,
      title: event.title,
      description: event.description ?? null,
      metadata: event.metadata ?? {},
    })),
  );
  if (error) {
    log.warn("case_events_insert_failed", { count: events.length });
  }
}

export async function getCaseTimeline(caseId: string): Promise<CaseEventRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("case_events")
    .select("*")
    .eq("case_id", caseId)
    .order("created_at", { ascending: false });

  if (error) {
    log.warn("case_timeline_failed", { caseId });
    return [];
  }
  return data ?? [];
}
