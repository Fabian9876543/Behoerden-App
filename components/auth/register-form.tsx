"use client";

import { useActionState } from "react";
import { signUpAction, type AuthFormState } from "@/app/actions/auth";
import { Alert } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/shared/submit-button";

const initialState: AuthFormState = { error: null };

export function RegisterForm() {
  const [state, formAction] = useActionState(signUpAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="email">E-Mail-Adresse</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="name@beispiel.de"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">Passwort</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
        />
        <p className="text-xs text-muted-foreground">Mindestens 8 Zeichen.</p>
      </div>

      {state.error ? <Alert variant="critical">{state.error}</Alert> : null}

      <SubmitButton className="w-full" pendingText="Konto wird erstellt...">
        Konto erstellen
      </SubmitButton>
    </form>
  );
}
