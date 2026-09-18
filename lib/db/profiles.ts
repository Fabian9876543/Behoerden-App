import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/errors";
import { log } from "@/lib/logging";
import type { HouseholdMode, Profile } from "@/lib/types/database";

export async function ensureProfile(userId: string, email: string | null): Promise<Profile> {
  const supabase = await createSupabaseServerClient();
  const { data: existing } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (existing) return existing;

  const { data, error } = await supabase
    .from("profiles")
    .insert({ id: userId, email })
    .select("*")
    .single();

  if (error || !data) {
    log.error("profile_insert_failed", { message: error?.message ?? "no data" });
    throw new AppError("database_failed", undefined, { cause: error });
  }
  return data;
}

export async function updateProfile(
  userId: string,
  patch: Partial<
    Pick<
      Profile,
      | "first_name"
      | "last_name"
      | "phone"
      | "street"
      | "postal_code"
      | "city"
      | "household_mode"
      | "onboarding_completed_at"
    >
  >,
): Promise<Profile> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("id", userId)
    .select("*")
    .single();

  if (error || !data) {
    log.error("profile_update_failed", { message: error?.message ?? "no data" });
    throw new AppError("database_failed", undefined, { cause: error });
  }
  return data;
}

export async function completeOnboarding(
  userId: string,
  householdMode: HouseholdMode,
): Promise<Profile> {
  return updateProfile(userId, {
    household_mode: householdMode,
    onboarding_completed_at: new Date().toISOString(),
  });
}
