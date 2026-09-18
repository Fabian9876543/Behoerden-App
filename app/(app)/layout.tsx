import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { getProfile, requireUserOrRedirect } from "@/lib/auth";
import { ensureProfile } from "@/lib/db/profiles";
import { BottomNav, SidebarNav } from "@/components/layout/nav";
import { UserMenu } from "@/components/layout/user-menu";

/**
 * Diese Route liest Cookies bzw. Nutzerdaten und darf nie statisch
 * vorgerendert werden - sonst braeuchte schon der Build die Supabase-Keys.
 */
export const dynamic = "force-dynamic";


export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUserOrRedirect();
  await ensureProfile(user.id, user.email);

  const profile = await getProfile(user.id);
  if (!profile?.onboarding_completed_at) redirect("/onboarding");

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b bg-card/95 backdrop-blur print:hidden">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/dashboard" className="inline-flex items-center gap-2 font-semibold">
            <ShieldCheck className="size-5 text-primary" aria-hidden />
            <span>BehoerdenBuddy</span>
          </Link>
          <UserMenu email={user.email} />
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-1 gap-8 px-4 pb-24 pt-6 sm:px-6 md:pb-10">
        <aside className="hidden w-52 shrink-0 md:block print:hidden">
          <div className="sticky top-20">
            <SidebarNav />
          </div>
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>

      <BottomNav />
    </div>
  );
}
