import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getProfile, requireUserOrRedirect } from "@/lib/auth";
import { ensureProfile } from "@/lib/db/profiles";
import { OnboardingForm } from "@/components/onboarding/onboarding-form";

export const metadata: Metadata = { title: "Willkommen" };
export const dynamic = "force-dynamic";

/**
 * Onboarding: genau eine Frage. Danach direkt ins Dashboard.
 */
export default async function OnboardingPage() {
  const user = await requireUserOrRedirect();
  await ensureProfile(user.id, user.email);

  const profile = await getProfile(user.id);
  if (profile?.onboarding_completed_at) redirect("/dashboard");

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Wie möchtest du Behördenpost verwalten?</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Das lässt sich jederzeit in den Einstellungen ändern.
      </p>
      <OnboardingForm className="mt-8" />
    </main>
  );
}
