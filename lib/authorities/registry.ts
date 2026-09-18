/**
 * Behoerden-Registry.
 *
 * Bewusst datengetrieben: Neue Behoerden werden hier ergaenzt, ohne dass
 * Business-Logik angefasst werden muss. Die KI erkennt den Namen frei aus
 * dem Dokument - diese Liste dient nur der Normalisierung, dem Matching auf
 * einen stabilen Schluessel und der Zuordnung offizieller Quellen.
 *
 * Wichtig: Eine nicht gelistete Behoerde ist kein Fehler. Der erkannte Name
 * wird dann unveraendert uebernommen und `authorityKey` bleibt null.
 */

export interface AuthorityDefinition {
  key: string;
  /** Anzeigename */
  name: string;
  /** Ebene - bestimmt die Vertrauenswuerdigkeit einer Quelle. */
  level: "bund" | "land" | "kommune" | "koerperschaft";
  /** Offizielle Website, falls bundesweit eindeutig. */
  officialUrl?: string;
  /** Begriffe, die im Dokument auf diese Behoerde hindeuten. */
  aliases: string[];
  /** Typische Vorgangsarten - dienen als Vorschlag, nicht als Zwang. */
  commonCaseTypes: string[];
}

export const AUTHORITIES: readonly AuthorityDefinition[] = [
  {
    key: "jobcenter",
    name: "Jobcenter",
    level: "kommune",
    officialUrl: "https://www.arbeitsagentur.de/arbeitslos-arbeit-finden/buergergeld",
    aliases: ["jobcenter", "job-center", "buergergeld", "bürgergeld", "sgb ii", "sgb 2", "grundsicherung fuer arbeitsuchende"],
    commonCaseTypes: ["weiterbewilligung", "erstantrag", "bescheid", "mitwirkungsaufforderung", "eingliederungsvereinbarung"],
  },
  {
    key: "agentur_fuer_arbeit",
    name: "Agentur fuer Arbeit",
    level: "bund",
    officialUrl: "https://www.arbeitsagentur.de",
    aliases: ["agentur fuer arbeit", "agentur für arbeit", "arbeitsagentur", "arbeitslosengeld i", "alg i"],
    commonCaseTypes: ["arbeitslosengeld", "bescheid", "meldeaufforderung"],
  },
  {
    key: "finanzamt",
    name: "Finanzamt",
    level: "land",
    officialUrl: "https://www.elster.de",
    aliases: ["finanzamt", "steuerbescheid", "einkommensteuer", "steuernummer", "elster"],
    commonCaseTypes: ["steuerbescheid", "steuererklaerung", "einspruch", "vorauszahlung"],
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
    key: "buergeramt",
    name: "Buergeramt",
    level: "kommune",
    aliases: ["buergeramt", "bürgeramt", "buergerbuero", "einwohnermeldeamt", "meldebehoerde", "anmeldung wohnsitz"],
    commonCaseTypes: ["anmeldung", "ummeldung", "ausweis", "fuehrungszeugnis"],
  },
  {
    key: "krankenkasse",
    name: "Krankenkasse",
    level: "koerperschaft",
    aliases: ["krankenkasse", "aok", "barmer", "tk", "techniker krankenkasse", "dak", "ikk", "beitragsbescheid krankenversicherung"],
    commonCaseTypes: ["beitragsbescheid", "leistungsantrag", "widerspruch", "mitgliedschaft"],
  },
  {
    key: "rentenversicherung",
    name: "Deutsche Rentenversicherung",
    level: "bund",
    officialUrl: "https://www.deutsche-rentenversicherung.de",
    aliases: ["deutsche rentenversicherung", "rentenversicherung", "drv", "rentenbescheid", "kontenklaerung"],
    commonCaseTypes: ["rentenbescheid", "kontenklaerung", "reha-antrag", "erwerbsminderung"],
  },
  {
    key: "auslaenderbehoerde",
    name: "Auslaenderbehoerde",
    level: "kommune",
    aliases: ["auslaenderbehoerde", "ausländerbehörde", "aufenthaltstitel", "aufenthaltserlaubnis", "niederlassungserlaubnis"],
    commonCaseTypes: ["aufenthaltstitel", "verlaengerung", "einbuergerung"],
  },
  {
    key: "fuehrerscheinstelle",
    name: "Fuehrerscheinstelle",
    level: "kommune",
    aliases: ["fuehrerscheinstelle", "führerscheinstelle", "fahrerlaubnisbehoerde", "fuehrerschein"],
    commonCaseTypes: ["fahrerlaubnis", "umtausch", "eignungsueberpruefung"],
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
    level: "koerperschaft",
    officialUrl: "https://www.rundfunkbeitrag.de",
    aliases: ["beitragsservice", "rundfunkbeitrag", "gez", "ard zdf deutschlandradio"],
    commonCaseTypes: ["beitragsbescheid", "befreiung", "anmeldung", "widerspruch"],
  },
  {
    key: "bafoeg_amt",
    name: "BAfoeG-Amt",
    level: "land",
    officialUrl: "https://www.bafoeg-digital.de",
    aliases: ["bafoeg", "bafög", "amt fuer ausbildungsfoerderung", "studierendenwerk"],
    commonCaseTypes: ["bafoeg-antrag", "weiterfoerderung", "bescheid"],
  },
  {
    key: "elterngeldstelle",
    name: "Elterngeldstelle",
    level: "land",
    aliases: ["elterngeld", "elterngeldstelle", "elterngeldplus"],
    commonCaseTypes: ["elterngeld", "bescheid", "aenderungsmitteilung"],
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
 * Ordnet einen von der KI erkannten Behoerdennamen einem stabilen Schluessel
 * zu. Liefert null, wenn kein Eintrag sicher passt - dann wird der erkannte
 * Name unveraendert weiterverwendet.
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

/** Bevorzugte offizielle Quellen, absteigend nach Vertrauenswuerdigkeit. */
export const OFFICIAL_SOURCE_PRIORITY = [
  "bund.de",
  "arbeitsagentur.de",
  "deutsche-rentenversicherung.de",
  "elster.de",
  "rundfunkbeitrag.de",
  "bafoeg-digital.de",
  "service.bund.de",
] as const;

/**
 * Prueft, ob eine URL zu einer offiziellen deutschen Behoerdenquelle gehoert.
 *
 * Bewusst konservativ: Im Zweifel `false`. Eine Quelle, die hier nicht
 * durchkommt, wird in der UI als "ungeprueft" gekennzeichnet und niemals als
 * offizielle Behoerdenquelle dargestellt.
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

  // 1. Explizit hinterlegte Bundes- und Traegerportale.
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
