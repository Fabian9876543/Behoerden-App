import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-xl font-semibold">Seite nicht gefunden</h1>
      <p className="text-sm text-muted-foreground">
        Diese Seite gibt es nicht - oder der Eintrag wurde gelöscht.
      </p>
      <Button asChild>
        <Link href="/dashboard">Zum Dashboard</Link>
      </Button>
    </main>
  );
}
