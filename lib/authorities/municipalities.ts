/**
 * Gemeindekatalog - der Weg von "wo wohnst du?" zum richtigen Amt.
 *
 * Deutschland hat rund 11.000 Gemeinden, und jede betreibt ihr Bürgeramt
 * selbst. Eine vollständige Liste mit Direktlinks auf die jeweilige
 * Anmeldeseite wäre genau das, was die Produktregel verbietet: erfundene
 * Quellen. Darum drei bewusste Einschränkungen:
 *
 *  1. **Nur Domain-Wurzeln.** `https://www.leipzig.de` steht hier,
 *     `.../buergeramt/anmeldung` nicht. Pfade ändern sich, Domains kaum.
 *     Ein toter Direktlink ist schlimmer als ein Klick mehr.
 *  2. **Nur Einträge, die geprüft werden können.** `npm run check:links`
 *     ruft jede URL hier auf. Was nicht erreichbar ist, fliegt raus.
 *  3. **Keine Gemeinde im Katalog heißt: kein Link.** Die Oberfläche sagt
 *     dann "nicht hinterlegt" und verweist auf die bundesweite Suche - sie
 *     rät nicht.
 *
 * Erweitern: Eintrag ergänzen, `npm run check:links` laufen lassen, fertig.
 * Kein Code.
 */

export interface MunicipalityEntry {
  /** ASCII-Schlüssel, stabil über Umbenennungen der Anzeige hinweg. */
  key: string;
  /** Amtlicher Name mit Umlauten. */
  name: string;
  /** Bundesland, ausgeschrieben. */
  state: string;
  /** Stadtportal, nur die Wurzel. Immer HTTPS. */
  url: string;
  /** Weitere Schreibweisen, die eindeutig auf diesen Ort zeigen. */
  aliases?: string[];
  /**
   * Schreibweisen, die es mehrfach in Deutschland gibt. Ein Treffer darauf
   * zählt nur, wenn die Postleitzahl ihn bestätigt.
   */
  ambiguousAliases?: string[];
  /** PLZ-Anfänge dieses Ortes - nur zur Unterscheidung gleichnamiger Orte. */
  postalPrefixes?: string[];
}

export const MUNICIPALITIES: readonly MunicipalityEntry[] = [
  // --- Stadtstaaten: Landes- und Stadtportal sind dasselbe ----------------
  { key: "berlin", name: "Berlin", state: "Berlin", url: "https://www.berlin.de" },
  { key: "hamburg", name: "Hamburg", state: "Hamburg", url: "https://www.hamburg.de" },
  { key: "bremen", name: "Bremen", state: "Bremen", url: "https://www.bremen.de" },

  // --- Nordrhein-Westfalen ------------------------------------------------
  { key: "koeln", name: "Köln", state: "Nordrhein-Westfalen", url: "https://www.stadt-koeln.de" },
  { key: "duesseldorf", name: "Düsseldorf", state: "Nordrhein-Westfalen", url: "https://www.duesseldorf.de" },
  { key: "dortmund", name: "Dortmund", state: "Nordrhein-Westfalen", url: "https://www.dortmund.de" },
  { key: "essen", name: "Essen", state: "Nordrhein-Westfalen", url: "https://www.essen.de" },
  { key: "duisburg", name: "Duisburg", state: "Nordrhein-Westfalen", url: "https://www.duisburg.de" },
  { key: "bochum", name: "Bochum", state: "Nordrhein-Westfalen", url: "https://www.bochum.de" },
  { key: "wuppertal", name: "Wuppertal", state: "Nordrhein-Westfalen", url: "https://www.wuppertal.de" },
  { key: "bielefeld", name: "Bielefeld", state: "Nordrhein-Westfalen", url: "https://www.bielefeld.de" },
  { key: "bonn", name: "Bonn", state: "Nordrhein-Westfalen", url: "https://www.bonn.de" },
  { key: "muenster", name: "Münster", state: "Nordrhein-Westfalen", url: "https://www.stadt-muenster.de" },
  { key: "moenchengladbach", name: "Mönchengladbach", state: "Nordrhein-Westfalen", url: "https://www.moenchengladbach.de" },
  { key: "gelsenkirchen", name: "Gelsenkirchen", state: "Nordrhein-Westfalen", url: "https://www.gelsenkirchen.de" },
  { key: "aachen", name: "Aachen", state: "Nordrhein-Westfalen", url: "https://www.aachen.de" },
  { key: "krefeld", name: "Krefeld", state: "Nordrhein-Westfalen", url: "https://www.krefeld.de" },
  { key: "oberhausen", name: "Oberhausen", state: "Nordrhein-Westfalen", url: "https://www.oberhausen.de" },
  { key: "hagen", name: "Hagen", state: "Nordrhein-Westfalen", url: "https://www.hagen.de" },
  { key: "hamm", name: "Hamm", state: "Nordrhein-Westfalen", url: "https://www.hamm.de" },
  { key: "leverkusen", name: "Leverkusen", state: "Nordrhein-Westfalen", url: "https://www.leverkusen.de" },
  { key: "solingen", name: "Solingen", state: "Nordrhein-Westfalen", url: "https://www.solingen.de" },
  { key: "herne", name: "Herne", state: "Nordrhein-Westfalen", url: "https://www.herne.de" },
  { key: "neuss", name: "Neuss", state: "Nordrhein-Westfalen", url: "https://www.neuss.de" },
  { key: "paderborn", name: "Paderborn", state: "Nordrhein-Westfalen", url: "https://www.paderborn.de" },
  { key: "bottrop", name: "Bottrop", state: "Nordrhein-Westfalen", url: "https://www.bottrop.de" },
  { key: "recklinghausen", name: "Recklinghausen", state: "Nordrhein-Westfalen", url: "https://www.recklinghausen.de" },
  { key: "remscheid", name: "Remscheid", state: "Nordrhein-Westfalen", url: "https://www.remscheid.de" },
  { key: "moers", name: "Moers", state: "Nordrhein-Westfalen", url: "https://www.moers.de" },
  { key: "siegen", name: "Siegen", state: "Nordrhein-Westfalen", url: "https://www.siegen.de" },
  { key: "guetersloh", name: "Gütersloh", state: "Nordrhein-Westfalen", url: "https://www.guetersloh.de" },

  // --- Bayern -------------------------------------------------------------
  { key: "muenchen", name: "München", state: "Bayern", url: "https://www.muenchen.de" },
  { key: "nuernberg", name: "Nürnberg", state: "Bayern", url: "https://www.nuernberg.de" },
  { key: "augsburg", name: "Augsburg", state: "Bayern", url: "https://www.augsburg.de" },
  { key: "regensburg", name: "Regensburg", state: "Bayern", url: "https://www.regensburg.de" },
  { key: "ingolstadt", name: "Ingolstadt", state: "Bayern", url: "https://www.ingolstadt.de" },
  { key: "wuerzburg", name: "Würzburg", state: "Bayern", url: "https://www.wuerzburg.de" },
  { key: "fuerth", name: "Fürth", state: "Bayern", url: "https://www.fuerth.de" },
  { key: "erlangen", name: "Erlangen", state: "Bayern", url: "https://www.erlangen.de" },

  // --- Baden-Württemberg --------------------------------------------------
  { key: "stuttgart", name: "Stuttgart", state: "Baden-Württemberg", url: "https://www.stuttgart.de" },
  { key: "karlsruhe", name: "Karlsruhe", state: "Baden-Württemberg", url: "https://www.karlsruhe.de" },
  { key: "mannheim", name: "Mannheim", state: "Baden-Württemberg", url: "https://www.mannheim.de" },
  {
    key: "freiburg",
    name: "Freiburg im Breisgau",
    state: "Baden-Württemberg",
    url: "https://www.freiburg.de",
    ambiguousAliases: ["freiburg"],
    postalPrefixes: ["79"],
  },
  { key: "heidelberg", name: "Heidelberg", state: "Baden-Württemberg", url: "https://www.heidelberg.de" },
  { key: "ulm", name: "Ulm", state: "Baden-Württemberg", url: "https://www.ulm.de" },
  { key: "heilbronn", name: "Heilbronn", state: "Baden-Württemberg", url: "https://www.heilbronn.de" },
  { key: "pforzheim", name: "Pforzheim", state: "Baden-Württemberg", url: "https://www.pforzheim.de" },
  { key: "reutlingen", name: "Reutlingen", state: "Baden-Württemberg", url: "https://www.reutlingen.de" },

  // --- Hessen -------------------------------------------------------------
  {
    key: "frankfurt_am_main",
    name: "Frankfurt am Main",
    state: "Hessen",
    url: "https://www.frankfurt.de",
    aliases: ["frankfurt/main", "frankfurt a. m."],
    ambiguousAliases: ["frankfurt"],
    postalPrefixes: ["60", "65"],
  },
  { key: "wiesbaden", name: "Wiesbaden", state: "Hessen", url: "https://www.wiesbaden.de" },
  { key: "kassel", name: "Kassel", state: "Hessen", url: "https://www.kassel.de" },
  { key: "darmstadt", name: "Darmstadt", state: "Hessen", url: "https://www.darmstadt.de" },
  {
    key: "offenbach_am_main",
    name: "Offenbach am Main",
    state: "Hessen",
    url: "https://www.offenbach.de",
    ambiguousAliases: ["offenbach"],
    postalPrefixes: ["63"],
  },

  // --- Niedersachsen ------------------------------------------------------
  { key: "hannover", name: "Hannover", state: "Niedersachsen", url: "https://www.hannover.de" },
  { key: "braunschweig", name: "Braunschweig", state: "Niedersachsen", url: "https://www.braunschweig.de" },
  { key: "osnabrueck", name: "Osnabrück", state: "Niedersachsen", url: "https://www.osnabrueck.de" },
  {
    // Amtlich "Oldenburg (Oldb)" - der Zusatz unterscheidet die Stadt von
    // Oldenburg in Holstein. Ohne ihn stünde der Name zweimal im Land.
    key: "oldenburg",
    name: "Oldenburg (Oldb)",
    state: "Niedersachsen",
    url: "https://www.oldenburg.de",
    ambiguousAliases: ["oldenburg"],
    postalPrefixes: ["26"],
  },
  { key: "wolfsburg", name: "Wolfsburg", state: "Niedersachsen", url: "https://www.wolfsburg.de" },
  { key: "goettingen", name: "Göttingen", state: "Niedersachsen", url: "https://www.goettingen.de" },
  { key: "hildesheim", name: "Hildesheim", state: "Niedersachsen", url: "https://www.hildesheim.de" },
  { key: "salzgitter", name: "Salzgitter", state: "Niedersachsen", url: "https://www.salzgitter.de" },

  // --- Rheinland-Pfalz und Saarland ---------------------------------------
  { key: "mainz", name: "Mainz", state: "Rheinland-Pfalz", url: "https://www.mainz.de" },
  {
    key: "ludwigshafen",
    name: "Ludwigshafen am Rhein",
    state: "Rheinland-Pfalz",
    url: "https://www.ludwigshafen.de",
    ambiguousAliases: ["ludwigshafen"],
    postalPrefixes: ["67"],
  },
  { key: "koblenz", name: "Koblenz", state: "Rheinland-Pfalz", url: "https://www.koblenz.de" },
  { key: "trier", name: "Trier", state: "Rheinland-Pfalz", url: "https://www.trier.de" },
  { key: "kaiserslautern", name: "Kaiserslautern", state: "Rheinland-Pfalz", url: "https://www.kaiserslautern.de" },
  { key: "saarbruecken", name: "Saarbrücken", state: "Saarland", url: "https://www.saarbruecken.de" },

  // --- Ostdeutschland -----------------------------------------------------
  { key: "leipzig", name: "Leipzig", state: "Sachsen", url: "https://www.leipzig.de" },
  { key: "dresden", name: "Dresden", state: "Sachsen", url: "https://www.dresden.de" },
  { key: "chemnitz", name: "Chemnitz", state: "Sachsen", url: "https://www.chemnitz.de" },
  {
    key: "halle_saale",
    name: "Halle (Saale)",
    state: "Sachsen-Anhalt",
    url: "https://www.halle.de",
    aliases: ["halle an der saale"],
    ambiguousAliases: ["halle"],
    postalPrefixes: ["06"],
  },
  { key: "magdeburg", name: "Magdeburg", state: "Sachsen-Anhalt", url: "https://www.magdeburg.de" },
  { key: "erfurt", name: "Erfurt", state: "Thüringen", url: "https://www.erfurt.de" },
  { key: "jena", name: "Jena", state: "Thüringen", url: "https://www.jena.de" },
  { key: "potsdam", name: "Potsdam", state: "Brandenburg", url: "https://www.potsdam.de" },
  { key: "cottbus", name: "Cottbus", state: "Brandenburg", url: "https://www.cottbus.de" },
  { key: "rostock", name: "Rostock", state: "Mecklenburg-Vorpommern", url: "https://www.rostock.de" },
  { key: "schwerin", name: "Schwerin", state: "Mecklenburg-Vorpommern", url: "https://www.schwerin.de" },

  // --- Schleswig-Holstein und Bremerhaven ---------------------------------
  { key: "kiel", name: "Kiel", state: "Schleswig-Holstein", url: "https://www.kiel.de" },
  { key: "luebeck", name: "Lübeck", state: "Schleswig-Holstein", url: "https://www.luebeck.de" },
  { key: "bremerhaven", name: "Bremerhaven", state: "Bremen", url: "https://www.bremerhaven.de" },
] as const;

/**
 * Bundesweite Behördensuche - der Ausweg, wenn die Gemeinde nicht im Katalog
 * steht. Führt über die Postleitzahl zur zuständigen Stelle.
 */
export const AUTHORITY_FINDER = {
  url: "https://www.service.bund.de/Content/DE/Behoerden/Suche/Formular.html",
  label: "Behördensuche auf service.bund.de",
} as const;

/**
 * Vergleichsform für Ortsnamen: Umlaute aufgelöst, Klammerzusätze entfernt,
 * Satzzeichen raus. "Halle (Saale)" und "halle saale" landen damit gleich.
 */
export function normalizePlace(value: string): string {
  return value
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/\(([^)]*)\)/g, " $1 ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizedPostalCode(value: string | null | undefined): string | null {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  return /^\d{5}$/.test(digits) ? digits : null;
}

function matchesPostalCode(entry: MunicipalityEntry, postalCode: string | null): boolean {
  if (!entry.postalPrefixes || entry.postalPrefixes.length === 0) return false;
  if (!postalCode) return false;
  return entry.postalPrefixes.some((prefix) => postalCode.startsWith(prefix));
}

export interface PlaceInput {
  city?: string | null;
  postalCode?: string | null;
}

/**
 * Findet die Gemeinde zu einer Adresse.
 *
 * Im Zweifel `null`: Ein mehrdeutiger Name ("Frankfurt", "Halle") zählt nur,
 * wenn die Postleitzahl ihn bestätigt. Lieber kein Link als der Link einer
 * gleichnamigen Stadt 400 Kilometer weiter.
 */
export function resolveMunicipality({ city, postalCode }: PlaceInput): MunicipalityEntry | null {
  const needle = city ? normalizePlace(city) : "";
  if (!needle) return null;
  const plz = normalizedPostalCode(postalCode);

  const ambiguous: MunicipalityEntry[] = [];

  for (const entry of MUNICIPALITIES) {
    if (normalizePlace(entry.name) === needle) return entry;
    if ((entry.aliases ?? []).some((alias) => normalizePlace(alias) === needle)) return entry;
    if ((entry.ambiguousAliases ?? []).some((alias) => normalizePlace(alias) === needle)) {
      ambiguous.push(entry);
    }
  }

  const confirmed = ambiguous.filter((entry) => matchesPostalCode(entry, plz));
  return confirmed.length === 1 ? (confirmed[0] ?? null) : null;
}

/**
 * Domains aller hinterlegten Stadtportale, ohne `www.`.
 *
 * Grundlage der Offiziell-Prüfung in der Registry: Nur was hier steht, gilt
 * als kommunale Quelle - Unterdomains eingeschlossen, denn `service.berlin.de`
 * gehört derselben Stadt wie `berlin.de`.
 */
export const MUNICIPAL_DOMAINS: readonly string[] = [
  ...new Set(
    MUNICIPALITIES.map((entry) =>
      new URL(entry.url).hostname.toLowerCase().replace(/^www\./, ""),
    ),
  ),
];

export function getMunicipality(key: string | null | undefined): MunicipalityEntry | null {
  if (!key) return null;
  return MUNICIPALITIES.find((entry) => entry.key === key) ?? null;
}
