import type { Metadata } from "next";
import { getProfile, requireUserOrRedirect } from "@/lib/auth";
import { isAdminClientConfigured } from "@/lib/supabase/admin";
import { isAiConfigured } from "@/lib/env";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileForm } from "@/components/settings/profile-form";
import { DeleteDataSection } from "@/components/settings/delete-data";

export const metadata: Metadata = { title: "Einstellungen" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireUserOrRedirect();
  const profile = await getProfile(user.id);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Einstellungen</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Angemeldet als {user.email ?? "unbekannt"}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Persoenliche Angaben</CardTitle>
          <CardDescription>
            Werden genutzt, um Antwortschreiben und Formulare vorzubereiten.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm profile={profile} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Erinnerungen</CardTitle>
          <CardDescription>
            Im Moment erinnert dich BehoerdenBuddy direkt in der App - kritische Fristen
            stehen oben auf dem Dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p className="flex items-center gap-2">
            <Badge variant="success">Aktiv</Badge> In-App-Hinweise
          </p>
          <p className="flex items-center gap-2">
            <Badge variant="muted">Geplant</Badge> E-Mail, Push, Kalender-Abo
          </p>
          <p>
            Fristen lassen sich schon jetzt als .ics-Datei exportieren und in jedem Kalender
            abonnieren.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Systemstatus</CardTitle>
          <CardDescription>Konfiguration dieser Installation.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="flex items-center gap-2">
            <Badge variant={isAiConfigured() ? "success" : "warning"}>
              {isAiConfigured() ? "Konfiguriert" : "Fehlt"}
            </Badge>
            Dokumentanalyse (ANTHROPIC_API_KEY)
          </p>
          <p className="flex items-center gap-2">
            <Badge variant={isAdminClientConfigured() ? "success" : "muted"}>
              {isAdminClientConfigured() ? "Konfiguriert" : "Optional"}
            </Badge>
            Kontoloeschung (SUPABASE_SERVICE_ROLE_KEY)
          </p>
        </CardContent>
      </Card>

      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-destructive">Daten loeschen</CardTitle>
          <CardDescription>
            Du kannst jederzeit alle bei uns gespeicherten Daten entfernen.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DeleteDataSection />
        </CardContent>
      </Card>
    </div>
  );
}
