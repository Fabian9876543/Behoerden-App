/**
 * Prüft jede hinterlegte URL - Stadtportale, Behördenportale, Formulare.
 *
 *   npm run check:links
 *
 * Der Grund für dieses Skript: Die Produktregel "keine erfundenen Quellen"
 * lässt sich nicht durch gutes Zureden einhalten, sondern nur durch Nachsehen.
 * Ein Katalogeintrag ist eine Behauptung, bis jemand sie geprüft hat - und das
 * kann nur eine Maschine mit Netzzugang tun, nicht der Editor.
 *
 * Geprüft wird nur die Erreichbarkeit unter HTTPS, nicht der Inhalt. Eine
 * Adresse, die 404 oder gar nicht antwortet, gehört korrigiert oder entfernt.
 * Umleitungen sind in Ordnung: Städte bauen ihre Portale um.
 *
 * Läuft bewusst nicht in `npm test` mit - Tests dürfen nicht vom Netz abhängen.
 */

import { AUTHORITIES } from "@/lib/authorities/registry";
import { AUTHORITY_FINDER, MUNICIPALITIES } from "@/lib/authorities/municipalities";
import { FORM_CATALOG } from "@/lib/forms/catalog";
import { LIFE_EVENTS } from "@/lib/life-events/catalog";

interface Target {
  url: string;
  origin: string;
}

function collectTargets(): Target[] {
  const targets: Target[] = [];

  for (const entry of MUNICIPALITIES) {
    targets.push({ url: entry.url, origin: `Gemeinde ${entry.name}` });
  }
  for (const authority of AUTHORITIES) {
    if (authority.officialUrl) {
      targets.push({ url: authority.officialUrl, origin: `Behörde ${authority.name}` });
    }
  }
  for (const form of FORM_CATALOG) {
    if (form.officialUrl) {
      targets.push({ url: form.officialUrl, origin: `Formular ${form.name}` });
    }
  }
  for (const event of LIFE_EVENTS) {
    for (const step of event.steps) {
      if (step.officialUrl) {
        targets.push({ url: step.officialUrl, origin: `Schritt ${event.key}/${step.key}` });
      }
    }
  }
  targets.push({ url: AUTHORITY_FINDER.url, origin: "Behördensuche" });

  // Dieselbe Adresse steht an mehreren Stellen - einmal prüfen genügt.
  const seen = new Set<string>();
  return targets.filter((target) => {
    if (seen.has(target.url)) return false;
    seen.add(target.url);
    return true;
  });
}

const TIMEOUT_MS = 15_000;

/**
 * Drei Ergebnisse, nicht zwei.
 *
 * Viele Stadtportale sitzen hinter einem Bot-Schutz und antworten einem
 * schlichten `fetch` mit 403 - die Adresse ist trotzdem richtig. Dasselbe gilt
 * für Netze, die den Zugriff per Richtlinie sperren. Nur was nachweislich
 * falsch ist (unbekannter Host, 404, abgelaufenes Zertifikat), darf den Lauf
 * rot machen. Sonst löscht irgendwann jemand einen guten Eintrag.
 */
type Verdict =
  | { state: "ok" }
  | { state: "unklar"; reason: string }
  | { state: "fehler"; reason: string };

const UNCLEAR_STATUS = new Set([401, 403, 405, 406, 429]);

function classifyResponse(status: number): Verdict {
  if (status >= 200 && status < 400) return { state: "ok" };
  if (UNCLEAR_STATUS.has(status)) return { state: "unklar", reason: `HTTP ${status}` };
  if (status >= 500) return { state: "unklar", reason: `HTTP ${status} - Serverproblem` };
  return { state: "fehler", reason: `HTTP ${status}` };
}

function classifyError(error: unknown): Verdict {
  const message = error instanceof Error ? error.message : String(error);
  const cause = error instanceof Error && error.cause instanceof Error ? error.cause.message : "";
  const text = `${message} ${cause}`;

  // Ein unbekannter Host ist ein Tippfehler im Katalog, kein Netzproblem.
  if (/ENOTFOUND|EAI_AGAIN|getaddrinfo/i.test(text)) {
    return { state: "fehler", reason: "Host nicht auflösbar" };
  }
  if (/CERT|SSL|self-signed/i.test(text)) {
    return { state: "fehler", reason: `Zertifikat: ${message}` };
  }
  if (/abort/i.test(text)) return { state: "unklar", reason: "Zeitüberschreitung" };
  return { state: "unklar", reason: message };
}

async function check(target: Target): Promise<Verdict> {
  if (!target.url.startsWith("https://")) {
    return { state: "fehler", reason: "kein HTTPS" };
  }

  // Manche Portale mögen HEAD nicht - dann noch einmal mit GET.
  let verdict: Verdict = { state: "unklar", reason: "nicht geprüft" };
  for (const method of ["HEAD", "GET"] as const) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await fetch(target.url, {
        method,
        redirect: "follow",
        signal: controller.signal,
        headers: { "user-agent": "BehoerdenBuddy-LinkCheck/1.0" },
      });
      verdict = classifyResponse(response.status);
    } catch (error) {
      verdict = classifyError(error);
    } finally {
      clearTimeout(timer);
    }
    if (verdict.state === "ok") return verdict;
  }
  return verdict;
}

async function main(): Promise<void> {
  const targets = collectTargets();
  console.log(`Prüfe ${targets.length} Adressen...\n`);

  const failures: { target: Target; reason: string }[] = [];
  const unclear: { target: Target; reason: string }[] = [];

  // In kleinen Gruppen, damit kein Portal sich belästigt fühlt.
  const BATCH = 8;
  for (let index = 0; index < targets.length; index += BATCH) {
    const batch = targets.slice(index, index + BATCH);
    const verdicts = await Promise.all(batch.map(check));
    batch.forEach((target, offset) => {
      const verdict = verdicts[offset];
      if (!verdict || verdict.state === "ok") {
        console.log(`  ok       ${target.url}`);
        return;
      }
      const entry = { target, reason: verdict.reason };
      if (verdict.state === "fehler") {
        failures.push(entry);
        console.log(`  FEHLER   ${target.url} (${target.origin}): ${verdict.reason}`);
      } else {
        unclear.push(entry);
        console.log(`  unklar   ${target.url} (${target.origin}): ${verdict.reason}`);
      }
    });
  }

  const ok = targets.length - failures.length - unclear.length;
  console.log(
    `\n${ok} erreichbar, ${unclear.length} unklar, ${failures.length} falsch `
      + `(von ${targets.length}).`,
  );

  if (unclear.length > 0) {
    console.log(
      "\nUnklar heißt: geblockt, überlastet oder hinter einem Bot-Schutz. "
        + "Das sagt nichts über die Richtigkeit der Adresse - im Browser nachsehen.",
    );
  }

  if (failures.length > 0) {
    console.error("\nFalsch - bitte korrigieren oder aus dem Katalog nehmen:");
    for (const failure of failures) {
      console.error(`  ${failure.target.origin}: ${failure.target.url} - ${failure.reason}`);
    }
    process.exitCode = 1;
  }
}

await main();
