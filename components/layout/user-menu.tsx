import Link from "next/link";
import { LogOut, Settings } from "lucide-react";
import { signOutAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";

export function UserMenu({ email }: { email: string | null }) {
  return (
    <div className="flex items-center gap-2">
      {email ? (
        <span className="hidden max-w-[16rem] truncate text-sm text-muted-foreground sm:inline">
          {email}
        </span>
      ) : null}
      <Button asChild variant="ghost" size="icon" aria-label="Einstellungen">
        <Link href="/settings">
          <Settings className="size-4" aria-hidden />
        </Link>
      </Button>
      <form action={signOutAction}>
        <Button type="submit" variant="ghost" size="icon" aria-label="Abmelden">
          <LogOut className="size-4" aria-hidden />
        </Button>
      </form>
    </div>
  );
}
