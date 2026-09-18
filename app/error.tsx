"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

/**
 * Globale Fehleranzeige. Es wird bewusst kein Stacktrace gezeigt -
 * technische Details bleiben im Server-Log.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Nur die Digest-ID, nie die Fehlermeldung selbst (könnte Inhalte tragen).
    console.error(JSON.stringify({ level: "error", event: "ui_error", digest: error.digest }));
  }, [error.digest]);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-xl font-semibold">Da ist etwas schiefgelaufen</h1>
      <p className="text-sm text-muted-foreground">
        Der Vorgang konnte nicht geladen werden. Bitte versuche es noch einmal. Deine Daten
        sind davon nicht betroffen.
      </p>
      <Button onClick={reset}>Erneut versuchen</Button>
    </main>
  );
}
