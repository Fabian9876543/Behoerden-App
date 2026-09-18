"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { AppError, fail, ok, type ActionResult } from "@/lib/errors";
import { createTask, deleteTask, requireTask, updateTask } from "@/lib/db/tasks";
import { refreshCaseStatus, requireCase } from "@/lib/db/cases";
import { recordCaseEvent } from "@/lib/db/events";
import {
  createTaskSchema,
  emptyToNull,
  firstIssueMessage,
  setTaskStatusSchema,
  updateTaskSchema,
} from "@/lib/validation/schemas";

export async function createTaskAction(formData: FormData): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = createTaskSchema.safeParse({
      caseId: formData.get("caseId"),
      title: formData.get("title"),
      description: formData.get("description") ?? "",
      dueDate: formData.get("dueDate") ?? "",
      isRequired: formData.get("isRequired") !== "false",
    });
    if (!parsed.success) {
      throw new AppError("validation_failed", firstIssueMessage(parsed.error));
    }

    const caseRow = await requireCase(parsed.data.caseId, user.id);
    await createTask({
      userId: user.id,
      caseId: caseRow.id,
      title: parsed.data.title,
      description: emptyToNull(parsed.data.description),
      dueDate: emptyToNull(parsed.data.dueDate),
      isRequired: parsed.data.isRequired,
      generatedBy: "user",
      position: 999,
    });

    await refreshCaseStatus(caseRow.id);
    revalidatePath(`/cases/${caseRow.id}`);
    revalidatePath("/tasks");
    revalidatePath("/dashboard");
    return ok();
  } catch (error) {
    return fail(error);
  }
}

export async function setTaskStatusAction(
  taskId: string,
  status: string,
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = setTaskStatusSchema.safeParse({ taskId, status });
    if (!parsed.success) {
      throw new AppError("validation_failed", firstIssueMessage(parsed.error));
    }

    const task = await requireTask(parsed.data.taskId, user.id);
    if (task.status === parsed.data.status) return ok();

    await updateTask(task.id, { status: parsed.data.status });

    if (parsed.data.status === "completed") {
      await recordCaseEvent({
        userId: user.id,
        caseId: task.case_id,
        type: "task_completed",
        title: "Aufgabe erledigt",
        description: task.title,
        metadata: { taskId: task.id },
      });
    } else if (task.status === "completed") {
      await recordCaseEvent({
        userId: user.id,
        caseId: task.case_id,
        type: "task_reopened",
        title: "Aufgabe wieder geoeffnet",
        description: task.title,
        metadata: { taskId: task.id },
      });
    }

    await refreshCaseStatus(task.case_id);
    revalidatePath(`/cases/${task.case_id}`);
    revalidatePath("/tasks");
    revalidatePath("/dashboard");
    return ok();
  } catch (error) {
    return fail(error);
  }
}

export async function updateTaskAction(formData: FormData): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = updateTaskSchema.safeParse({
      taskId: formData.get("taskId"),
      title: formData.get("title") ?? undefined,
      description: formData.get("description") ?? "",
      dueDate: formData.get("dueDate") ?? "",
      status: formData.get("status") ?? undefined,
    });
    if (!parsed.success) {
      throw new AppError("validation_failed", firstIssueMessage(parsed.error));
    }

    const task = await requireTask(parsed.data.taskId, user.id);
    await updateTask(task.id, {
      ...(parsed.data.title ? { title: parsed.data.title } : {}),
      description: emptyToNull(parsed.data.description),
      due_date: emptyToNull(parsed.data.dueDate),
      ...(parsed.data.status ? { status: parsed.data.status } : {}),
    });

    await refreshCaseStatus(task.case_id);
    revalidatePath(`/cases/${task.case_id}`);
    revalidatePath("/tasks");
    return ok();
  } catch (error) {
    return fail(error);
  }
}

export async function deleteTaskAction(taskId: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const task = await requireTask(taskId, user.id);
    await deleteTask(task.id);
    await refreshCaseStatus(task.case_id);

    revalidatePath(`/cases/${task.case_id}`);
    revalidatePath("/tasks");
    revalidatePath("/dashboard");
    return ok();
  } catch (error) {
    return fail(error);
  }
}
