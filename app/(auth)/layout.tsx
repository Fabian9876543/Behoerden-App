import Link from "next/link";
import { ShieldCheck } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col bg-muted/40">
      <header className="px-6 py-6">
        <Link href="/" className="inline-flex items-center gap-2 font-semibold">
          <ShieldCheck className="size-5 text-primary" aria-hidden />
          BehördenBuddy
        </Link>
      </header>
      <div className="flex flex-1 items-start justify-center px-6 pb-16 pt-4 sm:items-center sm:pt-0">
        <div className="w-full max-w-sm">{children}</div>
      </div>
      <footer className="px-6 pb-6 text-center text-xs text-muted-foreground">
        Deine Dokumente werden verschlüsselt gespeichert und sind nur für dich sichtbar.
      </footer>
    </main>
  );
}
