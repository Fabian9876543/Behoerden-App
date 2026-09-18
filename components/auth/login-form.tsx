"use client";

import { useActionState } from "react";
import { signInAction, type AuthFormState } from "@/app/actions/auth";
import { Alert } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/shared/submit-button";

const initialState: AuthFormState = { error: null };

export function LoginForm({ redirectTo }: { redirectTo: string }) {
  const [state, formAction] = useActionState(signInAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="redirect" value={redirectTo} />

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
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>

      {state.error ? <Alert variant="critical">{state.error}</Alert> : null}

      <SubmitButton className="w-full" pendingText="Anmelden...">
        Anmelden
      </SubmitButton>
    </form>
  );
}
