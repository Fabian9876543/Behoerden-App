import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Anmelden" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const params = await searchParams;
  const redirectTo =
    params.redirect && params.redirect.startsWith("/") && !params.redirect.startsWith("//")
      ? params.redirect
      : "/dashboard";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Willkommen zurueck</CardTitle>
        <CardDescription>Melde dich an, um deine Vorgaenge zu sehen.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <LoginForm redirectTo={redirectTo} />
        <p className="text-center text-sm text-muted-foreground">
          Noch kein Konto?{" "}
          <Link href="/register" className="font-medium text-primary hover:underline">
            Jetzt registrieren
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
