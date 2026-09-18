"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CalendarClock, FileText, MapPin } from "lucide-react";
import { createCaseFromLifeEventAction } from "@/app/actions/life-events";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buildPlan, planPlace } from "@/lib/life-events/plan";
import { isLocalAuthority, stepAuthorityLinks } from "@/lib/authorities/links";
import {
  AUTHORITY_FINDER,
  resolveMunicipality,
  type PlaceInput,
} from "@/lib/authorities/municipalities";
import { AuthorityLinks } from "@/components/shared/authority-links";
import { describeDueDate, formatDate } from "@/lib/dates";
import type { LifeEventAnswers, LifeEventDefinition } from "@/lib/life-events/types";

/**
 * Fragen zur Lebenslage - und direkt daneben die Vorschau.
 *
 * Die Vorschau entsteht aus derselben reinen Funktion, die später auch den
 * Vorgang baut. Die Person sieht damit vor dem Anlegen genau das, was sie
 * bekommt.
 */
export function LifeEventForm({
  definition,
  home,
}: {
  definition: LifeEventDefinition;
  /** Adresse aus dem Profil - Ausgangspunkt, wenn die Antworten keine nennen. */
  home: PlaceInput;
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState<LifeEventAnswers>({});
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const plan = useMemo(() => buildPlan(definition, answers), [definition, answers]);

  // Der Ort entscheidet, welches Amt gemeint ist. Beim Umzug ist das der
  // Zielort, sonst die gemeldete Adresse.
  const place = useMemo(
    () => planPlace(definition, answers, home),
    [definition, answers, home],
  );
  const municipality = useMemo(() => resolveMunicipality(place), [place]);
  const needsLocalAuthority = plan.steps.some((step) => isLocalAuthority(step.authorityKey));

  const missing = definition.questions
    .filter((question) => question.required)
    .filter((question) => {
      const value = answers[question.key];
      return typeof value !== "string" || value.trim() === "";
    });

  const set = (key: string, value: string | boolean) =>
    setAnswers((current) => ({ ...current, [key]: value }));

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
      <div className="space-y-5">
        <Card>
          <CardHeader>
            <CardTitle>Deine Situation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {definition.questions.map((question) => {
              const id = `q-${question.key}`;
              if (question.type === "boolean") {
                return (
                  <label key={question.key} className="flex items-start gap-3 text-sm">
                    <Checkbox
                      checked={answers[question.key] === true}
                      onCheckedChange={(value) => set(question.key, value === true)}
                      aria-label={question.label}
                    />
                    <span>
                      {question.label}
                      {question.help ? (
                        <span className="block text-xs text-muted-foreground">{question.help}</span>
                      ) : null}
                    </span>
                  </label>
                );
              }
              return (
                <div key={question.key} className="space-y-1.5">
                  <Label htmlFor={id}>
                    {question.label}
                    {question.required ? null : (
                      <span className="ml-1 font-normal text-muted-foreground">(optional)</span>
                    )}
                  </Label>
                  <Input
                    id={id}
                    type={question.type === "date" ? "date" : "text"}
                    placeholder={question.placeholder}
                    value={typeof answers[question.key] === "string" ? String(answers[question.key]) : ""}
                    onChange={(event) => set(question.key, event.target.value)}
                  />
                  {question.help ? (
                    <p className="text-xs text-muted-foreground">{question.help}</p>
                  ) : null}
                </div>
              );
            })}
          </CardContent>
        </Card>

        {error ? <Alert variant="critical">{error}</Alert> : null}

        <Button
          size="lg"
          className="w-full"
          disabled={pending || missing.length > 0}
          onClick={() =>
            startTransition(async () => {
              setError(null);
              const formData = new FormData();
              formData.set("eventKey", definition.key);
              formData.set("answers", JSON.stringify(answers));
              const result = await createCaseFromLifeEventAction(formData);
              if (!result.ok || !result.data) {
                setError(result.error?.message ?? "Der Vorgang konnte nicht angelegt werden.");
                return;
              }
              router.push(`/cases/${result.data.caseId}`);
              router.refresh();
            })
          }
        >
          {pending ? "Vorgang wird angelegt..." : `Vorgang mit ${plan.steps.length} Schritten anlegen`}
          {pending ? null : <ArrowRight className="size-4" aria-hidden />}
        </Button>

        {missing.length > 0 ? (
          <p className="text-center text-xs text-muted-foreground">
            Noch auszufüllen: {missing.map((question) => question.label).join(", ")}
          </p>
        ) : null}
      </div>

      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Das steht für dich an</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Die Liste passt sich deinen Angaben an. Nichts davon wird geschätzt - alle Schritte
            stammen aus einem gepflegten Katalog.
          </p>
        </div>

        <ol className="space-y-3">
          {plan.steps.map((step) => (
            <li key={step.key} className="rounded-xl border bg-card p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  aria-hidden
                  className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary"
                >
                  {step.position + 1}
                </span>
                <p className="font-medium">{step.title}</p>
                {step.required ? null : <Badge variant="muted">Optional</Badge>}
              </div>

              <p className="mt-2 text-sm text-muted-foreground">{step.description}</p>

              <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                <p className="flex items-start gap-1.5">
                  <MapPin className="mt-px size-3.5 shrink-0" aria-hidden />
                  {step.where}
                </p>

                {step.dueDate ? (
                  <p className="flex items-start gap-1.5">
                    <CalendarClock className="mt-px size-3.5 shrink-0" aria-hidden />
                    Bis {formatDate(step.dueDate)} ({describeDueDate(step.dueDate)})
                    {step.deadline?.legalBasis ? ` - ${step.deadline.legalBasis}` : ""}
                  </p>
                ) : null}

                {(step.documents ?? []).length > 0 ? (
                  <p className="flex items-start gap-1.5">
                    <FileText className="mt-px size-3.5 shrink-0" aria-hidden />
                    Mitbringen: {(step.documents ?? []).map((d) => d.name).join(", ")}
                  </p>
                ) : null}
              </div>

              {step.note ? (
                <p className="mt-2 rounded-lg bg-muted/60 px-3 py-2 text-xs">{step.note}</p>
              ) : null}

              {/*
                Die Behördensuche gehört nicht an jeden einzelnen Schritt -
                sie steht einmal unter der Liste.
              */}
              <AuthorityLinks
                links={stepAuthorityLinks(step, place).filter(
                  (link) => link.kind !== "behoerdensuche",
                )}
                className="mt-3 space-y-2 border-t pt-3"
              />
            </li>
          ))}
        </ol>

        {needsLocalAuthority && !municipality ? (
          <Alert variant="warning">
            {place.city
              ? `Für ${place.city} ist kein Stadtportal hinterlegt. `
              : "Ohne Ort können wir die zuständige Stelle nicht verlinken. "}
            Die zuständige Stelle findest du über die{" "}
            <a
              href={AUTHORITY_FINDER.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary hover:underline"
            >
              bundesweite Behördensuche
            </a>
            . Geraten wird hier nichts.
          </Alert>
        ) : null}

        <Alert variant="info">{definition.localNote}</Alert>
      </div>
    </div>
  );
}
