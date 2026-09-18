"use client";

import { Check, CircleDashed, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type StepState = "pending" | "running" | "done" | "failed";

export interface AnalysisStep {
  key: string;
  label: string;
  /** Ergebnisnotiz, z.B. "1 Frist gefunden". */
  result?: string;
  state: StepState;
}

/**
 * Nachvollziehbarer Fortschritt während Upload und Analyse.
 * Der Nutzer soll jederzeit sehen, was gerade passiert.
 */
export function UploadProgress({ steps }: { steps: AnalysisStep[] }) {
  return (
    <ol className="space-y-3" aria-live="polite">
      {steps.map((step) => (
        <li key={step.key} className="flex items-start gap-3">
          <StepIcon state={step.state} />
          <div className="min-w-0 flex-1">
            <p
              className={cn(
                "text-sm",
                step.state === "pending" && "text-muted-foreground",
                step.state === "failed" && "text-status-critical",
                step.state === "done" && "font-medium",
              )}
            >
              {step.label}
            </p>
            {step.result ? (
              <p
                className={cn(
                  "mt-0.5 text-xs",
                  step.state === "failed" ? "text-status-critical" : "text-muted-foreground",
                )}
              >
                {step.result}
              </p>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

function StepIcon({ state }: { state: StepState }) {
  const className = "mt-0.5 size-4 shrink-0";
  switch (state) {
    case "done":
      return <Check className={cn(className, "text-status-success")} aria-label="Erledigt" />;
    case "running":
      return (
        <Loader2 className={cn(className, "animate-spin text-primary")} aria-label="Läuft" />
      );
    case "failed":
      return <X className={cn(className, "text-status-critical")} aria-label="Fehlgeschlagen" />;
    default:
      return (
        <CircleDashed className={cn(className, "text-muted-foreground")} aria-label="Wartet" />
      );
  }
}
