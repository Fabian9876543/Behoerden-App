"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { createDemoCaseAction } from "@/app/actions/demo";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export function DemoCaseButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <Button
        variant="outline"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const result = await createDemoCaseAction();
            if (!result.ok || !result.data) {
              setError(result.error?.message ?? "Der Demo-Vorgang konnte nicht angelegt werden.");
              return;
            }
            router.push(`/cases/${result.data.caseId}`);
            router.refresh();
          })
        }
      >
        <Sparkles className="size-4" aria-hidden />
        {pending ? "Wird angelegt..." : "Beispiel-Vorgang ansehen"}
      </Button>
      {error ? <Alert variant="critical">{error}</Alert> : null}
    </div>
  );
}
