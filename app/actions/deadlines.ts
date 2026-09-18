"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { AppError, fail, ok, type ActionResult } from "@/lib/errors";
import {
  createDeadline,
  deleteDeadline,
  requireDeadline,
  updateDeadline,
} from "@/lib/db/deadlines";
import { requireCase } from "@/lib/db/cases";
import { recordCaseEvent } from "@/lib/db/events";
import {
  createDeadlineSchema,
  emptyToNull,
  firstIssueMessage,
  updateDeadlineSchema,
} from "@/lib/validation/schemas";

export async function createDeadlineAction(formData: FormData): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = createDeadlineSchema.safeParse({
      caseId: formData.get("caseId"),
      title: formData.get("title"),
      description: formData.get("description") ?? "",
      dueDate: formData.get("dueDate"),
    });
    if (!parsed.success) {
      throw new AppError("validation_failed", firstIssueMessage(parsed.error));
    }

    const caseRow = await requireCase(parsed.data.caseId, user.id);
    await createDeadline({
      userId: user.id,
      caseId: caseRow.id,
      title: parsed.data.title,
      description: emptyToNull(parsed.data.description),
      dueDate: parsed.data.dueDate,
    });

    revalidatePath(`/cases/${caseRow.id}`);
    revalidatePath("/deadlines");
    revalidatePath("/dashboard");
    return ok();
  } catch (error) {
    return fail(error);
  }
}

export async function updateDeadlineAction(formData: FormData): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = updateDeadlineSchema.safeParse({
      deadlineId: formData.get("deadlineId"),
      title: formData.get("title") ?? undefined,
      description: formData.get("description") ?? "",
      dueDate: formData.get("dueDate") ?? undefined,
      status: formData.get("status") ?? undefined,
    });
    if (!parsed.success) {
      throw new AppError("validation_failed", firstIssueMessage(parsed.error));
    }

    const deadline = await requireDeadline(parsed.data.deadlineId, user.id);
    await updateDeadline(deadline.id, {
      ...(parsed.data.title ? { title: parsed.data.title } : {}),
      description: emptyToNull(parsed.data.description),
      ...(parsed.data.dueDate ? { due_date: parsed.data.dueDate } : {}),
      ...(parsed.data.status ? { status: parsed.data.status } : {}),
    });

    if (parsed.data.status === "met") {
      await recordCaseEvent({
        userId: user.id,
        caseId: deadline.case_id,
        type: "deadline_met",
        title: "Frist als erledigt markiert",
        description: deadline.title,
        metadata: { deadlineId: deadline.id },
      });
    }

    revalidatePath(`/cases/${deadline.case_id}`);
    revalidatePath("/deadlines");
    revalidatePath("/dashboard");
    return ok();
  } catch (error) {
    return fail(error);
  }
}

export async function setDeadlineMetAction(deadlineId: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const deadline = await requireDeadline(deadlineId, user.id);
    await updateDeadline(deadline.id, { status: "met" });
    await recordCaseEvent({
      userId: user.id,
      caseId: deadline.case_id,
      type: "deadline_met",
      title: "Frist als erledigt markiert",
      description: deadline.title,
      metadata: { deadlineId: deadline.id },
    });

    revalidatePath(`/cases/${deadline.case_id}`);
    revalidatePath("/deadlines");
    revalidatePath("/dashboard");
    return ok();
  } catch (error) {
    return fail(error);
  }
}

export async function deleteDeadlineAction(deadlineId: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const deadline = await requireDeadline(deadlineId, user.id);
    await deleteDeadline(deadline.id);

    revalidatePath(`/cases/${deadline.case_id}`);
    revalidatePath("/deadlines");
    revalidatePath("/dashboard");
    return ok();
  } catch (error) {
    return fail(error);
  }
}
