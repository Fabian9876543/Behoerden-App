import { redirect } from "next/navigation";
import { getSessionUser, getProfile } from "@/lib/auth";

export default async function RootPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const profile = await getProfile(user.id);
  if (!profile?.onboarding_completed_at) redirect("/onboarding");

  redirect("/dashboard");
}
