import { redirect } from "next/navigation";
import { getSessionUser, getProfile } from "@/lib/auth";

/**
 * Diese Route liest Cookies bzw. Nutzerdaten und darf nie statisch
 * vorgerendert werden - sonst braeuchte schon der Build die Supabase-Keys.
 */
export const dynamic = "force-dynamic";


export default async function RootPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const profile = await getProfile(user.id);
  if (!profile?.onboarding_completed_at) redirect("/onboarding");

  redirect("/dashboard");
}
