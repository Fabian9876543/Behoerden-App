"use client";

import { useActionState } from "react";
import { saveProfileAction, type ProfileFormState } from "@/app/actions/profile";
import { Alert } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/shared/submit-button";
import type { Profile } from "@/lib/types/database";

const initialState: ProfileFormState = { error: null, success: false };

export function ProfileForm({ profile }: { profile: Profile | null }) {
  const [state, formAction] = useActionState(saveProfileAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="firstName">Vorname</Label>
          <Input
            id="firstName"
            name="firstName"
            defaultValue={profile?.first_name ?? ""}
            autoComplete="given-name"
            maxLength={80}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lastName">Nachname</Label>
          <Input
            id="lastName"
            name="lastName"
            defaultValue={profile?.last_name ?? ""}
            autoComplete="family-name"
            maxLength={80}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="street">Straße und Hausnummer</Label>
        <Input
          id="street"
          name="street"
          defaultValue={profile?.street ?? ""}
          autoComplete="street-address"
          maxLength={160}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
        <div className="space-y-1.5">
          <Label htmlFor="postalCode">PLZ</Label>
          <Input
            id="postalCode"
            name="postalCode"
            defaultValue={profile?.postal_code ?? ""}
            autoComplete="postal-code"
            inputMode="numeric"
            maxLength={5}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="city">Ort</Label>
          <Input
            id="city"
            name="city"
            defaultValue={profile?.city ?? ""}
            autoComplete="address-level2"
            maxLength={120}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="phone">Telefon (optional)</Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          defaultValue={profile?.phone ?? ""}
          autoComplete="tel"
          maxLength={40}
        />
      </div>

      {state.error ? <Alert variant="critical">{state.error}</Alert> : null}
      {state.success ? <Alert variant="success">Profil gespeichert.</Alert> : null}

      <SubmitButton pendingText="Wird gespeichert...">Speichern</SubmitButton>

      <p className="text-xs text-muted-foreground">
        Diese Angaben werden nur genutzt, um Antwortschreiben und Formulare für dich
        vorzubereiten. Sie verlassen deine Vorgänge nicht.
      </p>
    </form>
  );
}
