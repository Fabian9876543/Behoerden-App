/**
 * Welche Links gehören zu einer Behörde - und woher stammen sie?
 *
 * Zusammenführung von Registry (bundesweite Portale) und Gemeindekatalog
 * (Stadtportale). Reine Funktion, kein I/O: Ort rein, Links raus.
 *
 * Jeder Link trägt seine Herkunft mit. Die Oberfläche darf einen Link nur so
 * beschriften, wie `kind` es hergibt - ein Stadtportal ist nicht "das
 * Formular", sondern der Einstieg bei der zuständigen Stadt.
 */

import { getAuthority } from "@/lib/authorities/registry";
import {
  AUTHORITY_FINDER,
  resolveMunicipality,
  type MunicipalityEntry,
  type PlaceInput,
} from "@/lib/authorities/municipalities";

export type AuthorityLinkKind = "bundesweit" | "stadtportal" | "behoerdensuche";

export interface AuthorityLink {
  url: string;
  label: string;
  kind: AuthorityLinkKind;
  /** Eine Zeile, die sagt, was einen dort erwartet. */
  hint?: string;
}

/** Zuständigkeit für diese Behörde liegt bei der Gemeinde. */
export function isLocalAuthority(authorityKey: string | null | undefined): boolean {
  return getAuthority(authorityKey)?.level === "kommune";
}

/**
 * Links zu einer Behörde, passend zum Wohnort.
 *
 * Reihenfolge: erst das Stadtportal (dort sitzt das zuständige Amt), dann das
 * bundesweite Portal. Ist die Gemeinde nicht hinterlegt, tritt die
 * bundesweite Behördensuche an die Stelle des Stadtportals - geraten wird
 * nicht.
 */
export function authorityLinks(
  authorityKey: string | null | undefined,
  place: PlaceInput,
): AuthorityLink[] {
  const authority = getAuthority(authorityKey);
  const links: AuthorityLink[] = [];

  if (isLocalAuthority(authorityKey)) {
    const municipality = resolveMunicipality(place);
    if (municipality) {
      links.push(municipalLink(municipality, authority?.name ?? null));
    } else {
      links.push({
        url: AUTHORITY_FINDER.url,
        label: AUTHORITY_FINDER.label,
        kind: "behoerdensuche",
        hint: authority
          ? `Über die Postleitzahl zur ${authority.name} deiner Gemeinde.`
          : "Über die Postleitzahl zur zuständigen Stelle.",
      });
    }
  }

  if (authority?.officialUrl) {
    links.push({
      url: authority.officialUrl,
      label: authority.name,
      kind: "bundesweit",
      hint: "Bundesweites Portal - allgemeine Informationen und Onlinedienste.",
    });
  }

  return links;
}

/** Der Link zum Stadtportal, samt Hinweis auf das gesuchte Amt. */
export function municipalLink(
  municipality: MunicipalityEntry,
  authorityName: string | null,
): AuthorityLink {
  return {
    url: municipality.url,
    label: `Stadtportal ${municipality.name}`,
    kind: "stadtportal",
    hint: authorityName
      ? `Dort findest du Öffnungszeiten, Termine und Formulare für ${deriveArticle(authorityName)} ${authorityName}.`
      : "Dort findest du Öffnungszeiten, Termine und Formulare.",
  };
}

/**
 * Artikel für den Hinweistext. Klein, aber der Unterschied zwischen "für das
 * Bürgeramt" und "für die Bürgeramt".
 */
function deriveArticle(authorityName: string): string {
  if (/(?:amt|büro|center|zentrum)$/i.test(authorityName)) return "das";
  return "die";
}

/**
 * Links zu einem Schritt einer Lebenslage.
 *
 * Erst die Stelle vor Ort, dann die bundesweiten Portale, zuletzt die im
 * Katalog hinterlegte Quelle des Schritts. Doppelte Adressen fallen weg -
 * beim Rundfunkbeitrag stünde sonst zweimal dasselbe.
 */
export function stepAuthorityLinks(
  step: { authorityKey?: string; officialUrl?: string },
  place: PlaceInput,
): AuthorityLink[] {
  const links = authorityLinks(step.authorityKey, place);
  if (!step.officialUrl || links.some((link) => link.url === step.officialUrl)) {
    return links;
  }
  return [
    ...links,
    { url: step.officialUrl, label: "Offizielle Quelle zum Schritt", kind: "bundesweit" },
  ];
}
