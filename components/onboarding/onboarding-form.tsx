"use client";

import { useActionState, useState } from "react";
import { Check, User, Users } from "lucide-react";
import { completeOnboardingAction, type OnboardingState } from "@/app/actions/onboarding";
import { Alert } from "@/components/ui/alert";
import { SubmitButton } from "@/components/shared/submit-button";
import { cn } from "@/lib/utils";

const initialState: OnboardingState = { error: null };

const OPTIONS = [
  {
    value: "personal",
    title: "Nur für mich",
    description: "Deine eigenen Vorgänge, Fristen und Unterlagen.",
    Icon: User,
  },
  {
    value: "family",
    title: "Für meine Familie",
    description: "Auch Post, die Kinder oder Angehörige betrifft.",
    Icon: Users,
  },
] as const;

export function OnboardingForm({ className }: { className?: string }) {
  const [state, formAction] = useActionState(completeOnboardingAction, initialState);
  const [selected, setSelected] = useState<string>("personal");

  return (
    <form action={formAction} className={cn("space-y-6", className)}>
      <fieldset className="space-y-3">
        <legend className="sr-only">Nutzungsart</legend>
        {OPTIONS.map(({ value, title, description, Icon }) => {
          const isSelected = selected === value;
          return (
            <label
              key={value}
              className={cn(
                "flex cursor-pointer items-start gap-4 rounded-xl border bg-card p-4 transition-colors",
                isSelected ? "border-primary ring-1 ring-primary" : "hover:bg-accent",
              )}
            >
              <input
                type="radio"
                name="householdMode"
                value={value}
                checked={isSelected}
                onChange={() => setSelected(value)}
                className="sr-only"
              />
              <Icon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
              <span className="flex-1">
                <span className="block font-medium">{title}</span>
                <span className="mt-0.5 block text-sm text-muted-foreground">{description}</span>
              </span>
              {isSelected ? <Check className="size-5 shrink-0 text-primary" aria-hidden /> : null}
            </label>
          );
        })}
      </fieldset>

      {state.error ? <Alert variant="critical">{state.error}</Alert> : null}

      <SubmitButton className="w-full" size="lg" pendingText="Einen Moment...">
        Weiter zum Dashboard
      </SubmitButton>
    </form>
  );
}
