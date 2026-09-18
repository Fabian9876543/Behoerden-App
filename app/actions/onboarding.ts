"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { completeOnboarding, ensureProfile } from "@/lib/db/profiles";
import { fail, type ActionResult } from "@/lib/errors";
import { firstIssueMessage, onboardingSchema } from "@/lib/validation/schemas";

export interface OnboardingState {
  error: string | null;
}

export async function completeOnboardingAction(
  _prevState: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const parsed = onboardingSchema.safeParse({
    householdMode: formData.get("householdMode"),
  });
  if (!parsed.success) return { error: firstIssueMessage(parsed.error) };

  try {
    const user = await requireUser();
    await ensureProfile(user.id, user.email);
    await completeOnboarding(user.id, parsed.data.householdMode);
  } catch (error) {
    const result: ActionResult<never> = fail(error);
    return { error: result.error?.message ?? null };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}
