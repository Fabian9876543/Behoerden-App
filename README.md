# BehördenBuddy

**Case Manager für persönliche Behördenangelegenheiten.**

Du lädst einen Behördenbrief hoch. Die App liest ihn, erkennt Behörde, Fristen
und Pflichten und beantwortet die eine Frage, um die es wirklich geht:

> „Was muss ich jetzt eigentlich tun?"

Kein Chatbot. Die primäre UX ist Case-Management.

---

## Der Produkt-Loop

```
Dokument hochladen
  → Text extrahieren (PDF-Textlayer oder OCR)
  → Claude-Analyse (strukturiertes JSON, gegen Zod validiert)
  → Vorgang anlegen/zuordnen
  → Fristen erkennen      (mit Quellenangabe)
  → Aufgaben ableiten     (mit Quellenangabe)
  → benötigte Unterlagen + Formulare
  → Timeline fortschreiben
  → Fristen überwachen
  → Vorgang abschließen
```

---

## Schnellstart

```bash
# 1. Abhängigkeiten
npm install

# 2. Konfiguration
cp .env.example .env.local
#    NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
#    SUPABASE_SERVICE_ROLE_KEY und ANTHROPIC_API_KEY eintragen

# 3. Datenbank (lokale Supabase-Instanz)
supabase start
supabase db reset          # wendet supabase/migrations/* an

# 4. App
npm run dev                # http://localhost:3000
```

Ohne `ANTHROPIC_API_KEY` läuft die App, aber Uploads werden nicht analysiert.
Das Dashboard weist darauf hin. Über **„Beispiel-Vorgang ansehen"** lässt sich
der komplette Flow trotzdem erleben.

### Supabase Cloud statt lokal

`NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` aus den
Projekteinstellungen übernehmen, dann `supabase link --project-ref <ref>` und
`supabase db push`.

---

## Architektur

Strikte Trennung von UI, Business-Logik, KI-Schicht und Persistenz.

```
app/
  (auth)/              Login, Registrierung
  (app)/               geschützte App-Routen (Dashboard, Vorgänge, …)
  actions/             Server Actions – die einzige Schreibschnittstelle der UI
  api/                 Route Handler (Download, .ics-Export, Timeline-JSON)
  onboarding/

components/
  ui/                  shadcn/ui-Primitive
  shared/              Status-Badges, Quellenanzeige, Rechtshinweis
  dashboard/ cases/ documents/ tasks/ deadlines/ settings/

lib/
  ai/                  Claude-Zugang, Prompts, Zod-Schemas, Ableitungen
  db/                  Repositories + Analyse-Pipeline
  documents/           MIME-Prüfung, PDF-Textextraktion
  ocr/                 austauschbare OCR-Schnittstelle
  storage/             Supabase Storage
  authorities/         Behörden-Registry
  forms/               Formularkatalog
  validation/          Zod-Schemas für Eingaben
  calendar/            iCalendar-Export
  supabase/            Client (Browser / Server / Service-Role)

supabase/
  migrations/          Schema, RLS, Storage-Policies, Löschfunktion
  seed/
```

### Wichtige Entscheidungen

| Entscheidung | Begründung |
|---|---|
| **Strukturierte Claude-Ausgabe** statt Freitext | `messages.parse()` mit `output_config.format` erzwingt das Schema; zusätzlich validiert Zod serverseitig noch einmal. Eine Antwort, die nicht validiert, wird verworfen – nie halb geparst. |
| **Zwei Validierungsstufen** | Das Schema garantiert die *Form*, nicht die *Plausibilität*. `sanitizeAnalysis()` verwirft unplausible Fristen und zu unsicher erkannte Behörden und schreibt den Grund in die Unsicherheitshinweise. |
| **Ableitungen deterministisch** | Aufgaben, Fristen, Status und Priorität entstehen in `lib/ai/task-generation.ts` ohne zweiten KI-Aufruf – nachvollziehbar und vollständig testbar. |
| **OCR hinter einem Interface** | `lib/ocr/provider.ts` definiert den Vertrag; `claude-vision.ts` ist die MVP-Implementierung. Ein anderer Anbieter wird in `lib/ocr/index.ts` registriert, Aufrufer bleiben unverändert. |
| **PDF zuerst ohne OCR** | Hat das PDF einen brauchbaren Textlayer, wird der genutzt – schneller, billiger, exakter. Erst ein erkannter Scan geht in die OCR. |
| **Dokument gehört immer zu einem Vorgang** | Hält das Storage-Pfadschema stabil und die Timeline lückenlos. Ohne Zuordnung entsteht ein Platzhalter-Vorgang, den die Analyse anschließend benennt. |
| **Kein globaler SQL-Seed** | Alle Tabellen sind user-scoped. Demo-Daten entstehen pro Nutzer über eine Server Action (`is_demo = true`). |
| **Natives `<select>`** | Auf Mobilgeräten die beste und barrierefreiste Variante – spart eine Abhängigkeit. |
| **Eigene Datums-Helfer** | Wenige, klar umrissene Funktionen (`lib/dates.ts`) statt einer Datumsbibliothek. |

---

## Sicherheit und Datenschutz

Behördenpost ist hochsensibel. Entsprechend:

- **Row Level Security auf jeder Tabelle.** Jede Policy bindet an `auth.uid()`.
  Es gibt keine Policy mit `using (true)` und keine für `anon`.
  `tests/integration/rls-policies.test.ts` prüft das statisch bei jedem Testlauf.
- **Privater Storage-Bucket.** Pfadschema
  `users/{userId}/cases/{caseId}/documents/{documentId}`; die Storage-Policy
  vergleicht das zweite Pfadsegment mit `auth.uid()`. Downloads laufen über
  signierte URLs mit 5 Minuten Gültigkeit.
- **Alle externen Aufrufe serverseitig.** `ANTHROPIC_API_KEY` und
  `SUPABASE_SERVICE_ROLE_KEY` erreichen den Client nie; die betroffenen Module
  sind mit `server-only` markiert.
- **Uploads werden geprüft, nicht geglaubt.** Größe, MIME-Typ *und* Magic Bytes
  – eine umbenannte Datei fällt durch.
- **Logs ohne Inhalte.** `lib/logging.ts` filtert Dokumenttexte und
  personenbezogene Felder heraus und kürzt lange Freitexte; geloggt werden nur
  IDs, Zähler und Fehlercodes. Auch `case_events.metadata` trägt nie Inhalte.
- **Keine Stacktraces in der UI.** `lib/errors.ts` bildet jeden Fehler auf eine
  verständliche deutsche Meldung ab.
- **Löschfunktion.** Einstellungen → „Alle meine Daten löschen": entfernt
  Storage-Dateien, alle Fachdaten (`delete_my_data()`, `security invoker`, läuft
  unter RLS) und auf Wunsch das Konto.

### Umgang mit KI-Ergebnissen

- Die App tritt **nie als Rechtsberatung** auf; der Hinweis steht auf jeder
  Seite mit KI-Ergebnissen.
- Jede Frist und jede Aufgabe trägt **Quelle, Seite, Zitat und Konfidenz**.
  Unter 0,6 erscheint sichtbar „Nicht eindeutig erkannt. Bitte überprüfe diese
  Angabe."
- **Formularquellen werden nicht erfunden.** Nur Treffer aus dem hinterlegten
  Katalog gelten als offiziell; alles andere ist sichtbar als „Quelle
  ungeprüft" markiert. Priorität: bund.de → Bundes- → Landes- → Kommunalportale.
- **Antwortentwürfe werden nie automatisch versendet.** Sie sind bearbeitbar,
  müssen ausdrücklich freigegeben werden und enthalten Platzhalter statt
  erfundener Angaben.

---

## Tests

```bash
npm run typecheck     # TypeScript strict
npm run lint
npm test              # Unit- und Integrationstests (Vitest)
npm run test:db       # Migrationen + RLS gegen echtes PostgreSQL
npm run test:e2e      # End-to-End (Playwright)
npm run build
```

| Ebene | Umfang | Voraussetzung |
|---|---|---|
| **Unit** | Analyse-Schema, Fristenextraktion, Aufgabengenerierung, Datumslogik, Behörden-Matching, Formularkatalog, Upload-Validierung, Logging-Datenschutz, iCalendar | keine |
| **Integration** | Ableitungskette Analyse → Vorgang; statische RLS- und Storage-Policy-Prüfung der Migrationen | keine |
| **Datenbank** | `npm run test:db` startet einen temporären PostgreSQL-Cluster, spielt die echten Migrationen ein und prüft RLS **im Betrieb**: A legt Daten an, B sieht/ändert/löscht sie nicht, B kann nichts in A's Namen anlegen, Storage-Ordner sind getrennt, `delete_my_data` trifft nur den Aufrufer, Kaskaden räumen auf, anonym sieht nichts. Danach wird der Demo-Seed eingespielt und nachgerechnet, dass die CTE-Kette alle Daten schreibt und verknüpft. 44 Zusicherungen. | PostgreSQL-Binaries (kein Docker) |
| **Autorisierung** | `tests/integration/authorization.test.ts` macht dasselbe gegen eine echte Supabase-Instanz, inklusive Auth und Storage-API. Wird ohne Konfiguration übersprungen. | laufende Supabase-Instanz |
| **E2E** | Registrierung → Onboarding → Upload → Analyse → Vorgang → Aufgaben → Frist → Abhaken → Löschen; dazu abgelehnte Dateiformate und der Schutz der App-Routen. | Supabase + `ANTHROPIC_API_KEY` |

`npm run test:db` braucht weder Docker noch Supabase und läuft darum in CI
(`.github/workflows/ci.yml`) bei jedem Push mit — zusammen mit Typecheck,
Lint, Unit-Tests und Build.

Die Autorisierungs- und E2E-Tests brauchen eine laufende Supabase-Instanz mit
angewendeten Migrationen; der E2E-Flow zusätzlich einen gültigen
`ANTHROPIC_API_KEY`. In `supabase/config.toml` ist die E-Mail-Bestätigung für
lokale Entwicklung deaktiviert, damit die Registrierung im Test durchläuft.

---

## Erweiterung

- **Neue Behörde:** Eintrag in `lib/authorities/registry.ts`. Kein Code.
- **Neues Formular:** Eintrag in `lib/forms/catalog.ts`. Nur HTTPS-URLs
  offizieller Stellen – `isOfficialAuthorityUrl()` prüft das, ein Test sichert es ab.
- **Anderer OCR-Anbieter:** `OcrProvider` implementieren, in
  `lib/ocr/index.ts` registrieren.
- **Weitere Erinnerungskanäle:** `deadlines.reminder_channels` und
  `reminder_days_before` sind vorbereitet; im MVP ist nur `in_app` aktiv.
  Fristen lassen sich bereits als `.ics` exportieren
  (`/api/deadlines/ics`).
- **Analyseschema ändern:** `documentAnalysisSchema` anpassen und
  `DOCUMENT_ANALYSIS_SCHEMA_VERSION` erhöhen. Alte Ergebnisse bleiben in
  `document_analysis.result` mit ihrer Version erhalten.

---

## Bekannte Grenzen des MVP

- Erinnerungen nur in der App (kein Mail-/Push-Versand).
- Kein Formularkatalog mit Volltextsuche – nur der handgepflegte Katalog.
- Keine Familienfreigabe: `household_mode` wird erfasst, aber noch nicht für
  geteilte Vorgänge genutzt.
- Die Analyse läuft synchron im Request. Für größere Dokumentmengen gehört sie
  in eine Queue; `runDocumentAnalysis()` ist dafür bereits als eigenständiger,
  wiederholbarer Schritt geschnitten.
