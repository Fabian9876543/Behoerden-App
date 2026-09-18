/**
 * Formularkatalog.
 *
 * Im MVP ein kleiner, handgepflegter Katalog mit offiziellen Quellen.
 * Die Architektur ist auf einen spaeteren, vollstaendigen Katalog (z.B.
 * Anbindung an das Formularverzeichnis von bund.de) ausgelegt:
 * `findForm()` ist die einzige Stelle, die getauscht werden muss.
 *
 * Regel: Wenn kein Katalogeintrag passt, wird KEINE Drittquelle als offiziell
 * ausgegeben. Der Formularname wird gespeichert, die Quelle bleibt leer und
 * die UI weist darauf hin, dass die Quelle noch geprueft werden muss.
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
    name: "Hauptantrag auf Buergergeld",
    description: "Antrag auf Leistungen zur Sicherung des Lebensunterhalts nach dem SGB II.",
    authorityKey: "jobcenter",
    officialUrl: "https://www.arbeitsagentur.de/arbeitslos-arbeit-finden/buergergeld",
    sourceLabel: "Bundesagentur fuer Arbeit",
    aliases: ["hauptantrag", "antrag auf buergergeld", "hauptantrag buergergeld", "alg ii antrag"],
  },
  {
    formNumber: "WBA",
    name: "Weiterbewilligungsantrag Buergergeld",
    description: "Antrag auf Weiterbewilligung der Leistungen nach dem SGB II.",
    authorityKey: "jobcenter",
    officialUrl: "https://www.arbeitsagentur.de/arbeitslos-arbeit-finden/buergergeld",
    sourceLabel: "Bundesagentur fuer Arbeit",
    aliases: ["weiterbewilligungsantrag", "wba", "weiterbewilligung", "folgeantrag"],
  },
  {
    formNumber: "EK",
    name: "Anlage EK - Einkommenserklaerung",
    description: "Angaben zum Einkommen aller Mitglieder der Bedarfsgemeinschaft.",
    authorityKey: "jobcenter",
    officialUrl: "https://www.arbeitsagentur.de/arbeitslos-arbeit-finden/buergergeld",
    sourceLabel: "Bundesagentur fuer Arbeit",
    aliases: ["anlage ek", "einkommenserklaerung", "anlage einkommen"],
  },
  {
    formNumber: "KDU",
    name: "Anlage KDU - Kosten der Unterkunft",
    description: "Angaben zu Miete, Nebenkosten und Heizkosten.",
    authorityKey: "jobcenter",
    officialUrl: "https://www.arbeitsagentur.de/arbeitslos-arbeit-finden/buergergeld",
    sourceLabel: "Bundesagentur fuer Arbeit",
    aliases: ["anlage kdu", "kosten der unterkunft", "kdu", "mietbescheinigung"],
  },
  {
    name: "Antrag auf Kindergeld",
    description: "Antrag auf Kindergeld bei der Familienkasse.",
    authorityKey: "familienkasse",
    officialUrl: "https://www.arbeitsagentur.de/familie-und-kinder/kindergeld-anspruch-hoehe-dauer",
    sourceLabel: "Familienkasse der Bundesagentur fuer Arbeit",
    aliases: ["kindergeldantrag", "antrag auf kindergeld", "kg 1"],
  },
  {
    name: "Einkommensteuererklaerung (ELSTER)",
    description: "Elektronische Abgabe der Einkommensteuererklaerung.",
    authorityKey: "finanzamt",
    officialUrl: "https://www.elster.de",
    sourceLabel: "ELSTER - Steuerverwaltung der Laender",
    aliases: ["einkommensteuererklaerung", "steuererklaerung", "est 1a", "elster"],
  },
  {
    name: "Antrag auf Befreiung vom Rundfunkbeitrag",
    description: "Befreiung oder Ermaessigung des Rundfunkbeitrags.",
    authorityKey: "rundfunkbeitrag",
    officialUrl: "https://www.rundfunkbeitrag.de/buergerinnen_und_buerger/formulare",
    sourceLabel: "ARD ZDF Deutschlandradio Beitragsservice",
    aliases: ["befreiung rundfunkbeitrag", "rundfunkbeitrag befreiung", "gez befreiung"],
  },
  {
    name: "BAfoeG-Antrag (Formblatt 1)",
    description: "Antrag auf Ausbildungsfoerderung.",
    authorityKey: "bafoeg_amt",
    officialUrl: "https://www.bafoeg-digital.de",
    sourceLabel: "BAfoeG Digital (Bund)",
    aliases: ["formblatt 1", "bafoeg antrag", "antrag auf ausbildungsfoerderung"],
  },
  {
    name: "Antrag auf Kontenklaerung (V0100)",
    description: "Antrag auf Klaerung des Versicherungskontos.",
    authorityKey: "rentenversicherung",
    officialUrl: "https://www.deutsche-rentenversicherung.de/DRV/DE/Services/Formulare-und-Antraege/formulare-und-antraege.html",
    sourceLabel: "Deutsche Rentenversicherung",
    aliases: ["v0100", "kontenklaerung", "versicherungsverlauf"],
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
 * Findet nichts -> Rueckgabe mit `sourceKind: "unverified"` und ohne URL.
 * Eine ungepruefte Quelle wird niemals als offiziell ausgegeben.
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

  // Kein Katalogtreffer: auf die offizielle Behoerdenseite verweisen, wenn
  // diese bekannt ist - aber klar als "Behoerdenwebsite", nicht als Formular.
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
