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

## Architektur in einem Satz

UI ruft ausschließlich Server Actions in `app/actions/`; die rufen Repositories
in `lib/db/`; die KI-Schicht in `lib/ai/` liefert nur Daten und schreibt nie
selbst. Reine Funktionen liegen getrennt von I/O, damit sie testbar bleiben.

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
