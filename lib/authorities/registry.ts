/**
 * Behörden-Registry.
 *
 * Bewusst datengetrieben: Neue Behörden werden hier ergänzt, ohne dass
 * Business-Logik angefasst werden muss. Die KI erkennt den Namen frei aus
 * dem Dokument - diese Liste dient nur der Normalisierung, dem Matching auf
 * einen stabilen Schlüssel und der Zuordnung offizieller Quellen.
 *
 * Wichtig: Eine nicht gelistete Behörde ist kein Fehler. Der erkannte Name
 * wird dann unverändert übernommen und `authorityKey` bleibt null.
 */

export interface AuthorityDefinition {
  key: string;
  /** Anzeigename */
  name: string;
  /** Ebene - bestimmt die Vertrauenswürdigkeit einer Quelle. */
  level: "bund" | "land" | "kommune" | "körperschaft";
  /** Offizielle Website, falls bundesweit eindeutig. */
  officialUrl?: string;
  /** Begriffe, die im Dokument auf diese Behörde hindeuten. */
  aliases: string[];
  /** Typische Vorgangsarten - dienen als Vorschlag, nicht als Zwang. */
  commonCaseTypes: string[];
}

export const AUTHORITIES: readonly AuthorityDefinition[] = [
  {
    key: "jobcenter",
    name: "Jobcenter",
    level: "kommune",
    officialUrl: "https://www.arbeitsagentur.de/arbeitslos-arbeit-finden/bürgergeld",
    aliases: ["jobcenter", "job-center", "bürgergeld", "bürgergeld", "sgb ii", "sgb 2", "grundsicherung für arbeitsuchende"],
    commonCaseTypes: ["weiterbewilligung", "erstantrag", "bescheid", "mitwirkungsaufforderung", "eingliederungsvereinbarung"],
  },
  {
    key: "agentur_für_arbeit",
    name: "Agentur für Arbeit",
    level: "bund",
    officialUrl: "https://www.arbeitsagentur.de",
    aliases: ["agentur für arbeit", "agentur für arbeit", "arbeitsagentur", "arbeitslosengeld i", "alg i"],
    commonCaseTypes: ["arbeitslosengeld", "bescheid", "meldeaufforderung"],
  },
  {
    key: "finanzamt",
    name: "Finanzamt",
    level: "land",
    officialUrl: "https://www.elster.de",
    aliases: ["finanzamt", "steuerbescheid", "einkommensteuer", "steuernummer", "elster"],
    commonCaseTypes: ["steuerbescheid", "steuererklärung", "einspruch", "vorauszahlung"],
  },
  {
    key: "familienkasse",
    name: "Familienkasse",
    level: "bund",
    officialUrl: "https://www.arbeitsagentur.de/familie-und-kinder",
    aliases: ["familienkasse", "kindergeld", "kinderzuschlag"],
    commonCaseTypes: ["kindergeld", "kinderzuschlag", "bescheid", "weiterbewilligung"],
  },
  {
    key: "wohngeldstelle",
    name: "Wohngeldstelle",
    level: "kommune",
    aliases: ["wohngeld", "wohngeldstelle", "mietzuschuss", "lastenzuschuss"],
    commonCaseTypes: ["wohngeld", "weiterbewilligung", "bescheid"],
  },
  {
    key: "bürgeramt",
    name: "Bürgeramt",
    level: "kommune",
    aliases: ["bürgeramt", "bürgeramt", "bürgerbüro", "einwohnermeldeamt", "meldebehörde", "anmeldung wohnsitz"],
    commonCaseTypes: ["anmeldung", "ummeldung", "ausweis", "führungszeugnis"],
  },
  {
    key: "krankenkasse",
    name: "Krankenkasse",
    level: "körperschaft",
    aliases: ["krankenkasse", "aok", "barmer", "tk", "techniker krankenkasse", "dak", "ikk", "beitragsbescheid krankenversicherung"],
    commonCaseTypes: ["beitragsbescheid", "leistungsantrag", "widerspruch", "mitgliedschaft"],
  },
  {
    key: "rentenversicherung",
    name: "Deutsche Rentenversicherung",
    level: "bund",
    officialUrl: "https://www.deutsche-rentenversicherung.de",
    aliases: ["deutsche rentenversicherung", "rentenversicherung", "drv", "rentenbescheid", "kontenklärung"],
    commonCaseTypes: ["rentenbescheid", "kontenklärung", "reha-antrag", "erwerbsminderung"],
  },
  {
    key: "ausländerbehörde",
    name: "Ausländerbehörde",
    level: "kommune",
    aliases: ["ausländerbehörde", "ausländerbehörde", "aufenthaltstitel", "aufenthaltserlaubnis", "niederlassungserlaubnis"],
    commonCaseTypes: ["aufenthaltstitel", "verlängerung", "einbürgerung"],
  },
  {
    key: "führerscheinstelle",
    name: "Führerscheinstelle",
    level: "kommune",
    aliases: ["führerscheinstelle", "führerscheinstelle", "fahrerlaubnisbehörde", "führerschein"],
    commonCaseTypes: ["fahrerlaubnis", "umtausch", "eignungsüberprüfung"],
  },
  {
    key: "kfz_zulassungsstelle",
    name: "Kfz-Zulassungsstelle",
    level: "kommune",
    aliases: ["zulassungsstelle", "kfz-zulassung", "kraftfahrzeugsteuer", "kfz-steuer"],
    commonCaseTypes: ["zulassung", "abmeldung", "kfz-steuer"],
  },
  {
    key: "rundfunkbeitrag",
    name: "ARD ZDF Deutschlandradio Beitragsservice",
    level: "körperschaft",
    officialUrl: "https://www.rundfunkbeitrag.de",
    aliases: ["beitragsservice", "rundfunkbeitrag", "gez", "ard zdf deutschlandradio"],
    commonCaseTypes: ["beitragsbescheid", "befreiung", "anmeldung", "widerspruch"],
  },
  {
    key: "bafög_amt",
    name: "BAföG-Amt",
    level: "land",
    officialUrl: "https://www.bafög-digital.de",
    aliases: ["bafög", "bafög", "amt für ausbildungsförderung", "studierendenwerk"],
    commonCaseTypes: ["bafög-antrag", "weiterförderung", "bescheid"],
  },
  {
    key: "elterngeldstelle",
    name: "Elterngeldstelle",
    level: "land",
    aliases: ["elterngeld", "elterngeldstelle", "elterngeldplus"],
    commonCaseTypes: ["elterngeld", "bescheid", "änderungsmitteilung"],
  },
  {
    key: "sozialamt",
    name: "Sozialamt",
    level: "kommune",
    aliases: ["sozialamt", "sozialhilfe", "sgb xii", "grundsicherung im alter"],
    commonCaseTypes: ["grundsicherung", "bescheid", "antrag"],
  },
] as const;

const BY_KEY = new Map(AUTHORITIES.map((a) => [a.key, a]));

export function getAuthority(key: string | null | undefined): AuthorityDefinition | null {
  if (!key) return null;
  return BY_KEY.get(key) ?? null;
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
 * Ordnet einen von der KI erkannten Behördennamen einem stabilen Schlüssel
 * zu. Liefert null, wenn kein Eintrag sicher passt - dann wird der erkannte
 * Name unverändert weiterverwendet.
 */
export function matchAuthorityKey(authorityName: string | null | undefined): string | null {
  if (!authorityName) return null;
  const needle = normalize(authorityName);
  if (!needle) return null;

  for (const authority of AUTHORITIES) {
    if (normalize(authority.name) === needle) return authority.key;
  }
  for (const authority of AUTHORITIES) {
    for (const alias of authority.aliases) {
      const normalizedAlias = normalize(alias);
      if (!normalizedAlias) continue;
      if (needle === normalizedAlias || needle.includes(normalizedAlias)) {
        return authority.key;
      }
    }
  }
  return null;
}

/** Bevorzugte offizielle Quellen, absteigend nach Vertrauenswürdigkeit. */
export const OFFICIAL_SOURCE_PRIORITY = [
  "bund.de",
  "arbeitsagentur.de",
  "deutsche-rentenversicherung.de",
  "elster.de",
  "rundfunkbeitrag.de",
  "bafög-digital.de",
  "service.bund.de",
] as const;

/**
 * Prüft, ob eine URL zu einer offiziellen deutschen Behördenquelle gehört.
 *
 * Bewusst konservativ: Im Zweifel `false`. Eine Quelle, die hier nicht
 * durchkommt, wird in der UI als "ungeprüft" gekennzeichnet und niemals als
 * offizielle Behördenquelle dargestellt.
 */
export function isOfficialAuthorityUrl(url: string): boolean {
  let host: string;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    host = parsed.hostname.toLowerCase().replace(/\.$/, "");
  } catch {
    return false;
  }

  const isOn = (domain: string) => host === domain || host.endsWith(`.${domain}`);

  // 1. Explizit hinterlegte Bundes- und Trägerportale.
  if (OFFICIAL_SOURCE_PRIORITY.some(isOn)) return true;

  // 2. Weitere in der Registry hinterlegte offizielle URLs.
  for (const authority of AUTHORITIES) {
    if (!authority.officialUrl) continue;
    try {
      if (isOn(new URL(authority.officialUrl).hostname.toLowerCase())) return true;
    } catch {
      // Fehlerhafte Registry-URL ignorieren.
    }
  }

  // 3. Verwaltungsdomains: .bund.de sowie die Landes-Verwaltungsdomains.
  if (isOn("bund.de")) return true;
  if (/\.(?:[a-z-]+\.)?(?:de)$/.test(host) && /(?:^|\.)(?:verwaltung|service)\.[a-z-]+\.de$/.test(host)) {
    return true;
  }

  return false;
}
