import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Wächter über die Server Actions.
 *
 * Row Level Security ist die eigentliche Absicherung - keine Query kann
 * Zeilen eines anderen Nutzers sehen. Die Prüfungen in den Actions sind die
 * zweite Verteidigungslinie: Sie sorgen dafür, dass ein Zugriff auf eine
 * fremde ID als "nicht gefunden" endet, statt still ins Leere zu laufen.
 *
 * Dieser Test hält die Regel fest, damit eine neue Action sie nicht
 * versehentlich auslässt. Er liest den Quelltext - absichtlich stumpf, dafür
 * ohne laufende Datenbank.
 */

const ACTIONS_DIR = join(process.cwd(), "app", "actions");

/** Anmeldung und Registrierung stellen die Session erst her. */
const WITHOUT_SESSION = new Set(["signInAction", "signUpAction", "signOutAction"]);

/** Funktionen, die eine fremde ID gegen die Nutzer-ID prüfen. */
const OWNERSHIP_GUARDS = [
  "requireCase",
  "requireDocument",
  "requireTask",
  "requireDeadline",
  "requireLetter",
  "requireRequiredDocument",
  "getCaseDetail",
];

interface ActionSource {
  file: string;
  name: string;
  body: string;
}

function readActions(): ActionSource[] {
  const actions: ActionSource[] = [];
  for (const file of readdirSync(ACTIONS_DIR).filter((name) => name.endsWith(".ts"))) {
    const source = readFileSync(join(ACTIONS_DIR, file), "utf8");
    const matches = [...source.matchAll(/export async function (\w+)\(/g)];
    matches.forEach((match, index) => {
      const start = match.index ?? 0;
      const end = matches[index + 1]?.index ?? source.length;
      actions.push({ file, name: match[1]!, body: source.slice(start, end) });
    });
  }
  return actions;
}

const actions = readActions();

/** Nimmt die Action eine ID entgegen, die von außen kommt? */
function takesForeignId(action: ActionSource): boolean {
  const signature = action.body.slice(0, action.body.indexOf(")") + 1);
  if (/\b\w+Id\s*:\s*string/.test(signature)) return true;
  return /formData\.get\("(\w+Id)"\)/.test(action.body);
}

/** Wird die fremde ID zusammen mit der Nutzer-ID geprüft? */
function checksOwnership(action: ActionSource): boolean {
  return OWNERSHIP_GUARDS.some((guard) => action.body.includes(`${guard}(`));
}

describe("Server Actions", () => {
  it("findet überhaupt Actions zum Prüfen", () => {
    // Schutz davor, dass der Test durch eine Umbenennung stumm wird.
    expect(actions.length).toBeGreaterThan(20);
  });

  it.each(actions.map((action) => [action.name, action] as const))(
    "%s stellt die Session fest",
    (name, action) => {
      if (WITHOUT_SESSION.has(name)) return;
      expect(action.body).toContain("requireUser()");
    },
  );

  it.each(
    actions
      .filter((action) => !WITHOUT_SESSION.has(action.name) && takesForeignId(action))
      .map((action) => [action.name, action] as const),
  )("%s prüft die Eigentümerschaft der übergebenen ID", (_name, action) => {
    expect(checksOwnership(action)).toBe(true);
  });

  it("nutzt den Service-Role-Schlüssel nur für die Kontolöschung", () => {
    // Der Service-Role-Client umgeht RLS. Er darf ausschließlich dort
    // auftauchen, wo die Auth-Ebene selbst betroffen ist.
    const users = actions.filter((action) => action.body.includes("createSupabaseAdminClient("));
    expect(users.map((action) => action.name)).toEqual(["deleteAllDataAction"]);
    expect(users[0]?.body).toContain("requireUser()");
  });

  it("validiert Formulareingaben über ein Schema", () => {
    // Eingaben aus FormData sind nie vertrauenswürdig.
    for (const action of actions) {
      if (!action.body.includes("formData.get(")) continue;
      expect(
        action.body.includes("safeParse("),
        `${action.name} liest FormData ohne Schemaprüfung`,
      ).toBe(true);
    }
  });

  it("leitet nach der Anmeldung nur auf interne Pfade weiter", () => {
    const signIn = actions.find((action) => action.name === "signInAction");
    // Kein offener Redirect über den ?redirect-Parameter.
    expect(signIn?.body).toContain('startsWith("/")');
    expect(signIn?.body).toContain('startsWith("//")');
  });
});
