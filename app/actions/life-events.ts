"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { AppError, fail, ok, type ActionResult } from "@/lib/errors";
import { log } from "@/lib/logging";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createCase } from "@/lib/db/cases";
import { recordCaseEvents } from "@/lib/db/events";
import { getAuthority } from "@/lib/authorities/registry";
import { findForm } from "@/lib/forms/catalog";
import { getLifeEvent } from "@/lib/life-events/catalog";
import { buildPlan, missingRequiredAnswers } from "@/lib/life-events/plan";
import { lifeEventAnswersSchema } from "@/lib/validation/schemas";
import type { LifeEventAnswers } from "@/lib/life-events/types";
import type { CasePriority } from "@/lib/types/database";

/**
 * Legt aus einer Lebenslage einen Vorgang an.
 *
 * Die Schritte kommen aus dem Katalog, die Daten aus den Antworten - es wird
 * nichts geschätzt und kein Modell befragt. Das Ergebnis ist ein ganz
 * normaler Vorgang: dieselben Aufgaben, Fristen und Formulare wie bei einem
 * analysierten Brief, nur ohne Dokument.
 */
export async function createCaseFromLifeEventAction(
  formData: FormData,
): Promise<ActionResult<{ caseId: string; stepCount: number; deadlineCount: number }>> {
  try {
    const user = await requireUser();

    const parsed = lifeEventAnswersSchema.safeParse({
      eventKey: formData.get("eventKey"),
      answers: formData.get("answers"),
    });
    if (!parsed.success) {
      throw new AppError("validation_failed", "Die Angaben konnten nicht gelesen werden.");
    }

    const definition = getLifeEvent(parsed.data.eventKey);
    if (!definition) throw new AppError("not_found", "Diese Lebenslage ist nicht hinterlegt.");

    const answers = parsed.data.answers as LifeEventAnswers;
    const missing = missingRequiredAnswers(definition, answers);
    if (missing.length > 0) {
      const question = definition.questions.find((entry) => entry.key === missing[0]);
      throw new AppError(
        "validation_failed",
        question ? `Bitte ausfüllen: ${question.label}` : "Bitte fülle alle Pflichtfelder aus.",
      );
    }

    const plan = buildPlan(definition, answers);
    if (plan.steps.length === 0) {
      throw new AppError(
        "validation_failed",
        "Für diese Angaben ergeben sich keine Schritte. Bitte prüfe deine Auswahl.",
      );
    }

    const caseRow = await createCase({
      userId: user.id,
      title: plan.caseTitle,
      caseType: definition.key,
      summary: plan.summary,
      status: "action_required",
      priority: derivePriority(plan.deadlines.length),
    });

    const supabase = await createSupabaseServerClient();

    // --- Fristen zuerst, damit die Aufgaben daran hängen können -------------
    const deadlineIdByStep = new Map<string, string>();
    if (plan.deadlines.length > 0) {
      const { data, error } = await supabase
        .from("deadlines")
        .insert(
          plan.deadlines.map((deadline) => ({
            user_id: user.id,
            case_id: caseRow.id,
            title: deadline.title,
            description: deadline.description,
            due_date: deadline.dueDate,
          })),
        )
        .select("id");

      if (error) {
        log.error("life_event_deadlines_failed", { caseId: caseRow.id, message: error.message });
        throw new AppError("database_failed", undefined, { cause: error });
      }
      plan.deadlines.forEach((deadline, index) => {
        const id = data?.[index]?.id;
        if (id) deadlineIdByStep.set(deadline.stepKey, id);
      });
    }

    // --- Schritte als Aufgaben ---------------------------------------------
    const { error: tasksError } = await supabase.from("tasks").insert(
      plan.steps.map((step) => ({
        user_id: user.id,
        case_id: caseRow.id,
        deadline_id: deadlineIdByStep.get(step.key) ?? null,
        title: step.title,
        description: buildTaskDescription(step),
        is_required: step.required,
        due_date: step.dueDate,
        position: step.position,
        generated_by: "life_event",
      })),
    );
    if (tasksError) {
      log.error("life_event_tasks_failed", { caseId: caseRow.id, message: tasksError.message });
      throw new AppError("database_failed", undefined, { cause: tasksError });
    }

    // --- Benötigte Unterlagen ----------------------------------------------
    if (plan.documents.length > 0) {
      const { error } = await supabase.from("required_documents").insert(
        plan.documents.map((document) => ({
          user_id: user.id,
          case_id: caseRow.id,
          name: document.name,
          description: document.description,
          is_required: true,
        })),
      );
      if (error) log.warn("life_event_documents_failed", { caseId: caseRow.id });
    }

    // --- Formulare über den bestehenden Katalog auflösen --------------------
    const forms = plan.formNames.map((name) => {
      const step = plan.steps.find((entry) => (entry.forms ?? []).includes(name));
      return findForm(name, step?.authorityKey ?? null);
    });
    if (forms.length > 0) {
      const { error } = await supabase.from("forms").insert(
        forms.map((form) => ({
          user_id: user.id,
          case_id: caseRow.id,
          name: form.name,
          form_number: form.formNumber,
          description: form.description,
          official_url: form.officialUrl,
          source_kind: form.sourceKind,
          source_label: form.sourceLabel,
          authority_key: form.authorityKey,
        })),
      );
      if (error) log.warn("life_event_forms_failed", { caseId: caseRow.id });
    }

    await recordCaseEvents([
      {
        userId: user.id,
        caseId: caseRow.id,
        type: "case_created",
        title: `Vorgang aus Lebenslage angelegt: ${definition.title}`,
        metadata: { lifeEvent: definition.key },
      },
      {
        userId: user.id,
        caseId: caseRow.id,
        type: "tasks_created",
        title: `${plan.steps.length} Schritte erstellt`,
        metadata: { count: plan.steps.length },
      },
      ...(plan.deadlines.length > 0
        ? [
            {
              userId: user.id,
              caseId: caseRow.id,
              type: "deadline_detected" as const,
              title: `${plan.deadlines.length} Frist(en) aus dem Katalog übernommen`,
              metadata: { count: plan.deadlines.length },
            },
          ]
        : []),
    ]);

    log.info("life_event_case_created", {
      caseId: caseRow.id,
      lifeEvent: definition.key,
      stepCount: plan.steps.length,
      deadlineCount: plan.deadlines.length,
    });

    revalidatePath("/dashboard");
    revalidatePath("/cases");
    revalidatePath("/tasks");
    revalidatePath("/deadlines");

    return ok({
      caseId: caseRow.id,
      stepCount: plan.steps.length,
      deadlineCount: plan.deadlines.length,
    });
  } catch (error) {
    return fail(error);
  }
}

/** Baut aus Ort, Unterlagen und Hinweis eine lesbare Aufgabenbeschreibung. */
function buildTaskDescription(step: {
  description: string;
  where: string;
  authorityKey?: string;
  note?: string;
  officialUrl?: string;
}): string {
  const parts = [step.description, `Wo: ${step.where}`];

  const authority = getAuthority(step.authorityKey ?? null);
  if (authority && !step.where.includes(authority.name)) {
    parts.push(`Zuständig: ${authority.name}`);
  }
  if (step.note) parts.push(`Hinweis: ${step.note}`);
  if (step.officialUrl) parts.push(`Offizielle Quelle: ${step.officialUrl}`);

  return parts.join("\n\n");
}

function derivePriority(deadlineCount: number): CasePriority {
  return deadlineCount > 0 ? "high" : "normal";
}
