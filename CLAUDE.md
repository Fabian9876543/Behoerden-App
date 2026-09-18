# BehördenBuddy - Hinweise für die Weiterentwicklung

Kurzfassung der Konventionen und der Fallstricke, die in diesem Projekt schon
einmal Zeit gekostet haben. Produktbeschreibung und Setup stehen im README.

## Befehle

```bash
npm run dev
npm run typecheck     # tsc --noEmit, strict + noUncheckedIndexedAccess
npm run lint          # ESLint-CLI (nicht `next lint`, ab Next 16 entfernt)
npm test              # Vitest: Unit + Integration
npm run test:db       # Migrationen, RLS und Demo-Seed gegen echtes PostgreSQL
npm run test:e2e      # Playwright (braucht Supabase + ANTHROPIC_API_KEY)
npm run build
```

`npm run test:db` braucht weder Docker noch Supabase - nur die
PostgreSQL-Binaries. Es startet einen Wegwerf-Cluster, spielt Migrationen und
Seed ein und prüft die Row Level Security im Betrieb. Bei Änderungen an
`supabase/migrations/` immer mitlaufen lassen.

Die KI-Anbindung wird ohne Zugangsdaten getestet: `claude-client.test.ts` und
`analysis-flow.test.ts` starten einen lokalen Server und setzen
`ANTHROPIC_BASE_URL` darauf. Das SDK ist echt, nur der Gegenüber nicht - so
lassen sich auch die Fehlerpfade prüfen, die man im Betrieb nie absichtlich
auslöst.

## Architektur in einem Satz

UI ruft ausschließlich Server Actions in `app/actions/`; die rufen Repositories
in `lib/db/`; die KI-Schicht in `lib/ai/` liefert nur Daten und schreibt nie
selbst. Reine Funktionen liegen getrennt von I/O, damit sie testbar bleiben.

**Zwei Einstiege, ein Vorgang.** Hochgeladener Brief (`lib/ai/`) und Lebenslage
(`lib/life-events/`) erzeugen beide einen ganz normalen Vorgang mit denselben
Aufgaben, Fristen und Formularen. Wer an einem der beiden Wege etwas ändert,
prüft, ob der andere davon betroffen ist - `tests/integration/case-merge.test.ts`
hält die Nahtstelle fest.

Wichtig dabei: Eine Dokumentanalyse kennt immer nur das eine Schreiben, nie das
Vorhaben dahinter. Sie darf einen bestehenden Vorgang deshalb **ergänzen**, aber
nie umbenennen oder herabstufen. Überschrieben wird nur, was noch leer ist; der
Status kommt aus `refreshCaseStatus` über alle Aufgaben, nicht aus den neuen.

## Fallstricke

**Supabase-Typen kollabieren zu `never`.** `supabase-js` verlangt, dass jede
Tabelle `Record<string, unknown>` erfüllt. Interfaces bekommen in TypeScript
keine implizite Index-Signatur, Mapped Types schon - darum läuft in
`lib/types/database.ts` jede Zeile durch `AsRecord<T>`. Ohne das verliert jede
Query stillschweigend ihre Typen. Neue Tabellen genauso eintragen.

**Routen, die Supabase lesen, brauchen `export const dynamic = "force-dynamic"`.**
Der Env-Check schlägt sonst schon beim Prerendering zu und der Build braucht
Runtime-Secrets. `npm run build` muss ohne `.env.local` durchlaufen.

**`server-only` in jedem Modul, das Keys, Cookies oder das SDK anfasst.**
Vitest mappt das Paket auf einen leeren Stub (`tests/stubs/server-only.ts`).
Wenn ein Client-Component etwas aus so einem Modul braucht, gehört der reine
Teil in ein eigenes Modul - siehe `lib/ai/letter-intents.ts` neben
`lib/ai/letter-generation.ts`.

**Zod 4.** `zodOutputFormat` aus dem Anthropic-SDK erwartet die v4-Typen.
Also `z.uuid()` statt `z.string().uuid()`, `z.email()` hinter `.pipe()` und
`error:` statt `errorMap:`.

**Structured Outputs erzwingt weder `maxLength` noch `pattern`.** Der
SDK-Helper verschiebt beides in die `description` des JSON-Schemas. Geprüft
wird erst beim Parsen - was im Schema steht, ist also eine Regel für *uns*,
kein Auftrag an das Modell. Was das Modell einhalten soll, gehört zusätzlich
in den Prompt (siehe Datumsformat).

**Keine `.transform()` und keine dynamischen `.catch()` im Analyseschema.**
Beides bricht die Umwandlung in ein JSON-Schema, und zwar erst zur Laufzeit -
jede Analyse schlägt dann fehl. Längen werden darum in `sanitizeAnalysis`
über `TEXT_LIMITS` gekürzt, nicht im Schema. Für "nicht nur Leerraum" eine
Regex statt `.trim()`. `tests/integration/structured-output.test.ts` nagelt
das fest.

**Kürzen statt verwerfen - aber nur bei Fließtext.** Eine um Zeichen zu lange
Zusammenfassung darf nicht die ganze Analyse samt Fristen mitreißen. Streng
bleiben Datumsformat und die Obergrenzen der Fristen- und Aufgabenlisten:
Lieber sichtbar scheitern, als still eine Frist unterschlagen.

**SDK-Fehler unterscheiden.** Ein `AnthropicError`, der *kein* `APIError` ist,
entsteht clientseitig (vor allem beim Parsen) und ist ein Schemafehler, kein
Ausfall - sonst liest die Person "derzeit nicht erreichbar" und wartet,
obwohl ein erneuter Versuch sofort hilft.

**Deutsch mit Umlauten.** Oberflächentexte, Fehlermeldungen und Prompts nutzen
echte Umlaute. ASCII bleiben nur technische Bezeichner: Paketname,
Supabase-Projekt-ID, iCalendar-PRODID/UID und der Name der Exportdatei.

## Regeln, die nicht verhandelbar sind

- **RLS auf jeder neuen Tabelle**, Policy an `auth.uid()` gebunden. Kein
  `using (true)`, keine Policy für `anon`.
  `tests/integration/rls-policies.test.ts` prüft das statisch,
  `supabase/tests/rls.sql` im Betrieb.
- **Keine Dokumentinhalte in Logs oder `case_events.metadata`.**
  Logging läuft über `lib/logging.ts`, das personenbezogene Felder filtert.
- **KI-Ausgabe nie ungeprüft verwenden.** Immer gegen das Zod-Schema
  validieren - auch beim Lesen aus der Datenbank, denn dort liegt Modellausgabe
  aus der Vergangenheit.
- **Keine erfundenen Quellen.** Ein Formular gilt nur als offiziell, wenn es
  aus `lib/forms/catalog.ts` kommt und `isOfficialAuthorityUrl()` besteht.
- **Keine Rechtsberatung** und keine automatisch versendeten Schreiben.
- **Fehler erreichen die UI nur als verständliche deutsche Meldung**
  (`lib/errors.ts`), nie als Stacktrace.

## Erweitern

- Behörde: Eintrag in `lib/authorities/registry.ts`, kein Code.
- Formular: Eintrag in `lib/forms/catalog.ts`, nur HTTPS-URLs offizieller
  Stellen (ein Test sichert das ab).
- OCR-Anbieter: `OcrProvider` implementieren, in `lib/ocr/index.ts` registrieren.
- Analyseschema ändern: `documentAnalysisSchema` anpassen **und**
  `DOCUMENT_ANALYSIS_SCHEMA_VERSION` erhöhen.
