import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getLifeEvent } from "@/lib/life-events/catalog";
import { getProfile, requireUserOrRedirect } from "@/lib/auth";
import { LifeEventForm } from "@/components/life-events/life-event-form";
import { LegalNotice } from "@/components/shared/legal-notice";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ key: string }>;
}): Promise<Metadata> {
  const { key } = await params;
  return { title: getLifeEvent(key)?.title ?? "Lebenslage" };
}

// Liest das Profil, um die Ämter am Wohnort zu verlinken.
export const dynamic = "force-dynamic";

export default async function LifeEventPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const definition = getLifeEvent(key);
  if (!definition) notFound();

  const user = await requireUserOrRedirect();
  const profile = await getProfile(user.id);

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/lebenslagen"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Alle Lebenslagen
        </Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">{definition.title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {definition.intro}
        </p>
      </div>

      <LifeEventForm
        definition={definition}
        home={{ city: profile?.city ?? null, postalCode: profile?.postal_code ?? null }}
      />

      <LegalNotice />
    </div>
  );
}
