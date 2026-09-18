"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { credentialsSchema, firstIssueMessage } from "@/lib/validation/schemas";
import { log } from "@/lib/logging";

export interface AuthFormState {
  error: string | null;
}

/** Login-Fehler bewusst generisch halten - keine Auskunft, ob das Konto existiert. */
const GENERIC_LOGIN_ERROR = "E-Mail-Adresse oder Passwort ist falsch.";

export async function signInAction(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: firstIssueMessage(parsed.error) };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    log.warn("sign_in_failed", { status: error.status ?? null });
    return { error: GENERIC_LOGIN_ERROR };
  }

  const redirectTo = String(formData.get("redirect") ?? "/dashboard");
  // Nur interne Pfade zulassen - kein Open Redirect.
  const safeTarget = redirectTo.startsWith("/") && !redirectTo.startsWith("//")
    ? redirectTo
    : "/dashboard";

  revalidatePath("/", "layout");
  redirect(safeTarget);
}

export async function signUpAction(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: firstIssueMessage(parsed.error) };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp(parsed.data);

  if (error) {
    log.warn("sign_up_failed", { status: error.status ?? null });
    return {
      error:
        error.status === 422
          ? "Zu diesem Konto gibt es bereits eine Anmeldung. Bitte melde dich an."
          : "Die Registrierung ist fehlgeschlagen. Bitte versuche es erneut.",
    };
  }

  if (!data.session) {
    return {
      error:
        "Fast geschafft: Bitte bestaetige zuerst die E-Mail-Adresse ueber den Link in deinem Postfach.",
    };
  }

  revalidatePath("/", "layout");
  redirect("/onboarding");
}

export async function signOutAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
