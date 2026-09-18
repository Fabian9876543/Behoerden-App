import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Upload } from "lucide-react";
import { LIFE_EVENTS } from "@/lib/life-events/catalog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LegalNotice } from "@/components/shared/legal-notice";

export const metadata: Metadata = { title: "Lebenslagen" };

export default function LifeEventsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Ich habe etwas vor</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Du musst nicht auf einen Brief warten. Sag, was ansteht - du bekommst eine Liste mit
          allem, was dazugehört: Fristen, Unterlagen, Formulare und die Stelle, bei der du es
          abgibst.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {LIFE_EVENTS.map((event) => (
          <Card key={event.key} className="flex flex-col">
            <CardHeader>
              <CardTitle>{event.title}</CardTitle>
              <p className="text-sm text-muted-foreground">{event.subtitle}</p>
            </CardHeader>
            <CardContent className="mt-auto">
              <Button asChild variant="outline" className="w-full">
                <Link href={`/lebenslagen/${event.key}`}>
                  Schritte ansehen
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Deine Lebenslage ist nicht dabei?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Der Katalog wächst Schritt für Schritt. Bis deine Situation dabei ist: Lade den
            Brief hoch, der dich betrifft - daraus entsteht ebenfalls ein Vorgang mit Fristen und
            Aufgaben.
          </p>
          <Button asChild variant="outline">
            <Link href="/dashboard">
              <Upload className="size-4" aria-hidden />
              Behördenbrief hochladen
            </Link>
          </Button>
        </CardContent>
      </Card>

      <LegalNotice />
    </div>
  );
}
