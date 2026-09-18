/**
 * Formularkatalog.
 *
 * Im MVP ein kleiner, handgepflegter Katalog mit offiziellen Quellen.
 * Die Architektur ist auf einen späteren, vollständigen Katalog (z.B.
 * Anbindung an das Formularverzeichnis von bund.de) ausgelegt:
 * `findForm()` ist die einzige Stelle, die getauscht werden muss.
 *
 * Regel: Wenn kein Katalogeintrag passt, wird KEINE Drittquelle als offiziell
 * ausgegeben. Der Formularname wird gespeichert, die Quelle bleibt leer und
 * die UI weist darauf hin, dass die Quelle noch geprüft werden muss.
 */

import { getAuthority, isOfficialAuthorityUrl } from "@/lib/authorities/registry";
import type { FormSourceKind } from "@/lib/types/database";

export interface CatalogForm {
  /** Amtliche Formularnummer, falls vorhanden. */
  formNumber?: string;
  name: string;
  description?: string;
  authorityKey: string;
  officialUrl: string;
  sourceLabel: string;
  /** Begriffe, unter denen das Formular in Briefen auftaucht. */
  aliases: string[];
}

export const FORM_CATALOG: readonly CatalogForm[] = [
  {
    formNumber: "HA",
    name: "Hauptantrag auf Bürgergeld",
    description: "Antrag auf Leistungen zur Sicherung des Lebensunterhalts nach dem SGB II.",
    authorityKey: "jobcenter",
    officialUrl: "https://www.arbeitsagentur.de/arbeitslos-arbeit-finden/bürgergeld",
    sourceLabel: "Bundesagentur für Arbeit",
    aliases: ["hauptantrag", "antrag auf bürgergeld", "hauptantrag bürgergeld", "alg ii antrag"],
  },
  {
    formNumber: "WBA",
    name: "Weiterbewilligungsantrag Bürgergeld",
    description: "Antrag auf Weiterbewilligung der Leistungen nach dem SGB II.",
    authorityKey: "jobcenter",
    officialUrl: "https://www.arbeitsagentur.de/arbeitslos-arbeit-finden/bürgergeld",
    sourceLabel: "Bundesagentur für Arbeit",
    aliases: ["weiterbewilligungsantrag", "wba", "weiterbewilligung", "folgeantrag"],
  },
  {
    formNumber: "EK",
    name: "Anlage EK - Einkommenserklärung",
    description: "Angaben zum Einkommen aller Mitglieder der Bedarfsgemeinschaft.",
    authorityKey: "jobcenter",
    officialUrl: "https://www.arbeitsagentur.de/arbeitslos-arbeit-finden/bürgergeld",
    sourceLabel: "Bundesagentur für Arbeit",
    aliases: ["anlage ek", "einkommenserklärung", "anlage einkommen"],
  },
  {
    formNumber: "KDU",
    name: "Anlage KDU - Kosten der Unterkunft",
    description: "Angaben zu Miete, Nebenkosten und Heizkosten.",
    authorityKey: "jobcenter",
    officialUrl: "https://www.arbeitsagentur.de/arbeitslos-arbeit-finden/bürgergeld",
    sourceLabel: "Bundesagentur für Arbeit",
    aliases: ["anlage kdu", "kosten der unterkunft", "kdu", "mietbescheinigung"],
  },
  {
    name: "Antrag auf Kindergeld",
    description: "Antrag auf Kindergeld bei der Familienkasse.",
    authorityKey: "familienkasse",
    officialUrl: "https://www.arbeitsagentur.de/familie-und-kinder/kindergeld-anspruch-höhe-dauer",
    sourceLabel: "Familienkasse der Bundesagentur für Arbeit",
    aliases: ["kindergeldantrag", "antrag auf kindergeld", "kg 1"],
  },
  {
    name: "Einkommensteuererklärung (ELSTER)",
    description: "Elektronische Abgabe der Einkommensteuererklärung.",
    authorityKey: "finanzamt",
    officialUrl: "https://www.elster.de",
    sourceLabel: "ELSTER - Steuerverwaltung der Länder",
    aliases: ["einkommensteuererklärung", "steuererklärung", "est 1a", "elster"],
  },
  {
    name: "Antrag auf Befreiung vom Rundfunkbeitrag",
    description: "Befreiung oder Ermäßigung des Rundfunkbeitrags.",
    authorityKey: "rundfunkbeitrag",
    officialUrl: "https://www.rundfunkbeitrag.de/buergerinnen_und_buerger/formulare",
    sourceLabel: "ARD ZDF Deutschlandradio Beitragsservice",
    aliases: ["befreiung rundfunkbeitrag", "rundfunkbeitrag befreiung", "gez befreiung"],
  },
  {
    name: "BAföG-Antrag (Formblatt 1)",
    description: "Antrag auf Ausbildungsförderung.",
    authorityKey: "bafög_amt",
    officialUrl: "https://www.bafög-digital.de",
    sourceLabel: "BAföG Digital (Bund)",
    aliases: ["formblatt 1", "bafög antrag", "antrag auf ausbildungsförderung"],
  },
  {
    name: "Antrag auf Kontenklärung (V0100)",
    description: "Antrag auf Klärung des Versicherungskontos.",
    authorityKey: "rentenversicherung",
    officialUrl: "https://www.deutsche-rentenversicherung.de/DRV/DE/Services/Formulare-und-Anträge/formulare-und-anträge.html",
    sourceLabel: "Deutsche Rentenversicherung",
    aliases: ["v0100", "kontenklärung", "versicherungsverlauf"],
  },
] as const;

export interface FormLookupResult {
  name: string;
  formNumber: string | null;
  description: string | null;
  officialUrl: string | null;
  sourceKind: FormSourceKind;
  sourceLabel: string | null;
  authorityKey: string | null;
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Sucht ein Formular im Katalog.
 *
 * Findet nichts -> Rückgabe mit `sourceKind: "unverified"` und ohne URL.
 * Eine ungeprüfte Quelle wird niemals als offiziell ausgegeben.
 */
export function findForm(
  formName: string,
  authorityKey?: string | null,
): FormLookupResult {
  const needle = normalize(formName);

  const candidates = authorityKey
    ? FORM_CATALOG.filter((f) => f.authorityKey === authorityKey)
    : FORM_CATALOG;

  const pools = [candidates, FORM_CATALOG];

  for (const pool of pools) {
    for (const form of pool) {
      const haystack = [form.name, form.formNumber ?? "", ...form.aliases].map(normalize);
      const hit = haystack.some(
        (candidate) =>
          candidate.length > 2 && (needle === candidate || needle.includes(candidate)),
      );
      if (!hit) continue;
      if (!isOfficialAuthorityUrl(form.officialUrl)) continue;
      return {
        name: form.name,
        formNumber: form.formNumber ?? null,
        description: form.description ?? null,
        officialUrl: form.officialUrl,
        sourceKind: "official_catalog",
        sourceLabel: form.sourceLabel,
        authorityKey: form.authorityKey,
      };
    }
  }

  // Kein Katalogtreffer: auf die offizielle Behördenseite verweisen, wenn
  // diese bekannt ist - aber klar als "Behördenwebsite", nicht als Formular.
  const authority = getAuthority(authorityKey ?? null);
  if (authority?.officialUrl && isOfficialAuthorityUrl(authority.officialUrl)) {
    return {
      name: formName,
      formNumber: null,
      description: null,
      officialUrl: authority.officialUrl,
      sourceKind: "authority_website",
      sourceLabel: authority.name,
      authorityKey: authority.key,
    };
  }

  return {
    name: formName,
    formNumber: null,
    description: null,
    officialUrl: null,
    sourceKind: "unverified",
    sourceLabel: null,
    authorityKey: authorityKey ?? null,
  };
}
