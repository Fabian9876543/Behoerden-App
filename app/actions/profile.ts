"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { AppError, fail, toUserMessage, type ActionResult } from "@/lib/errors";
import { log } from "@/lib/logging";
import { ensureProfile, updateProfile } from "@/lib/db/profiles";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient, isAdminClientConfigured } from "@/lib/supabase/admin";
import { deleteAllUserFiles } from "@/lib/storage/documents";
import { emptyToNull, firstIssueMessage, profileSchema } from "@/lib/validation/schemas";

export interface ProfileFormState {
  error: string | null;
  success: boolean;
}

export async function saveProfileAction(
  _prevState: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const parsed = profileSchema.safeParse({
    firstName: formData.get("firstName") ?? "",
    lastName: formData.get("lastName") ?? "",
    phone: formData.get("phone") ?? "",
    street: formData.get("street") ?? "",
    postalCode: formData.get("postalCode") ?? "",
    city: formData.get("city") ?? "",
  });
  if (!parsed.success) return { error: firstIssueMessage(parsed.error), success: false };

  try {
    const user = await requireUser();
    await ensureProfile(user.id, user.email);
    await updateProfile(user.id, {
      first_name: emptyToNull(parsed.data.firstName),
      last_name: emptyToNull(parsed.data.lastName),
      phone: emptyToNull(parsed.data.phone),
      street: emptyToNull(parsed.data.street),
      postal_code: emptyToNull(parsed.data.postalCode),
      city: emptyToNull(parsed.data.city),
    });
  } catch (error) {
    return { error: toUserMessage(error), success: false };
  }

  revalidatePath("/settings");
  return { error: null, success: true };
}

/**
 * DSGVO: Loescht alle Fachdaten des Nutzers - Dateien im Storage, alle
 * Datenbankzeilen und, wenn der Service-Role-Key vorhanden ist, das Konto.
 *
 * Der Nutzer muss zur Bestaetigung das Wort LOESCHEN eingeben.
 */
export async function deleteAllDataAction(formData: FormData): Promise<ActionResult> {
  try {
    const user = await requireUser();

    const confirmation = String(formData.get("confirmation") ?? "").trim().toUpperCase();
    if (confirmation !== "LOESCHEN") {
      throw new AppError(
        "validation_failed",
        'Bitte gib zur Bestaetigung "LOESCHEN" ein.',
      );
    }

    const deleteAccount = formData.get("deleteAccount") === "on";

    // 1. Dateien zuerst - solange die Storage-Policy den Nutzer noch kennt.
    const removedFiles = await deleteAllUserFiles(user.id);

    // 2. Alle Fachdaten. Die Funktion laeuft als der Nutzer, RLS greift.
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.rpc("delete_my_data");
    if (error) {
      log.error("delete_my_data_failed", { message: error.message });
      throw new AppError("database_failed", undefined, { cause: error });
    }

    log.info("user_data_deleted", { removedFiles, deleteAccount });

    // 3. Optional das Konto selbst.
    if (deleteAccount) {
      if (!isAdminClientConfigured()) {
        throw new AppError(
          "not_configured",
          "Deine Daten wurden geloescht. Die Loeschung des Kontos benoetigt zusaetzlich SUPABASE_SERVICE_ROLE_KEY.",
        );
      }
      const admin = createSupabaseAdminClient();
      const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
      if (deleteError) {
        log.error("account_delete_failed", { message: deleteError.message });
        throw new AppError(
          "database_failed",
          "Deine Daten wurden geloescht, das Konto konnte aber nicht entfernt werden.",
        );
      }
      await supabase.auth.signOut();
    }
  } catch (error) {
    return fail(error);
  }

  revalidatePath("/", "layout");
  redirect("/login");
}
