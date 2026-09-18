import { describe, expect, it } from "vitest";
import { authorityLinks, isLocalAuthority, stepAuthorityLinks } from "@/lib/authorities/links";
import { AUTHORITIES, isOfficialAuthorityUrl } from "@/lib/authorities/registry";
import { AUTHORITY_FINDER } from "@/lib/authorities/municipalities";

const LEIPZIG = { city: "Leipzig", postalCode: "04103" };
const UNBEKANNT = { city: "Kleinkleckersdorf", postalCode: "12345" };

describe("isLocalAuthority", () => {
  it("erkennt kommunale Stellen", () => {
    expect(isLocalAuthority("buergeramt")).toBe(true);
    expect(isLocalAuthority("kfz_zulassungsstelle")).toBe(true);
  });

  it("Bundes- und Landesstellen sind nicht kommunal", () => {
    expect(isLocalAuthority("rentenversicherung")).toBe(false);
    expect(isLocalAuthority("finanzamt")).toBe(false);
    expect(isLocalAuthority(null)).toBe(false);
    expect(isLocalAuthority("gibt_es_nicht")).toBe(false);
  });
});

describe("authorityLinks", () => {
  it("verlinkt bei einer kommunalen Stelle zuerst das Stadtportal", () => {
    const links = authorityLinks("buergeramt", LEIPZIG);
    expect(links[0]?.kind).toBe("stadtportal");
    expect(links[0]?.url).toBe("https://www.leipzig.de");
    expect(links[0]?.label).toBe("Stadtportal Leipzig");
  });

  it("nennt im Hinweis das gesuchte Amt mit passendem Artikel", () => {
    expect(authorityLinks("buergeramt", LEIPZIG)[0]?.hint).toContain("das Bürgeramt");
    expect(authorityLinks("wohngeldstelle", LEIPZIG)[0]?.hint).toContain("die Wohngeldstelle");
  });

  it("fällt auf die Behördensuche zurück, wenn die Gemeinde fehlt", () => {
    const links = authorityLinks("buergeramt", UNBEKANNT);
    expect(links[0]?.kind).toBe("behoerdensuche");
    expect(links[0]?.url).toBe(AUTHORITY_FINDER.url);
  });

  it("erfindet für eine unbekannte Gemeinde keine Adresse", () => {
    const links = authorityLinks("buergeramt", UNBEKANNT);
    expect(links.some((link) => link.url.includes("kleinkleckersdorf"))).toBe(false);
  });

  it("zeigt bei einer kommunalen Stelle mit Bundesportal beide Wege", () => {
    const links = authorityLinks("jobcenter", LEIPZIG);
    expect(links.map((link) => link.kind)).toEqual(["stadtportal", "bundesweit"]);
  });

  it("liefert für Landes- und Bundesstellen kein Stadtportal", () => {
    const links = authorityLinks("finanzamt", LEIPZIG);
    expect(links.map((link) => link.kind)).toEqual(["bundesweit"]);
  });

  it("liefert nichts für eine unbekannte Behörde", () => {
    expect(authorityLinks(null, LEIPZIG)).toEqual([]);
    expect(authorityLinks("gibt_es_nicht", LEIPZIG)).toEqual([]);
  });

  it("jede gelieferte Adresse besteht die Offiziell-Prüfung", () => {
    for (const authority of AUTHORITIES) {
      for (const place of [LEIPZIG, UNBEKANNT, {}]) {
        for (const link of authorityLinks(authority.key, place)) {
          expect(isOfficialAuthorityUrl(link.url), `${authority.key}: ${link.url}`).toBe(true);
        }
      }
    }
  });
});

describe("stepAuthorityLinks", () => {
  it("hängt die Quelle des Schritts hinten an", () => {
    const links = stepAuthorityLinks(
      { authorityKey: "buergeramt", officialUrl: "https://www.bund.de" },
      LEIPZIG,
    );
    expect(links.map((link) => link.kind)).toEqual(["stadtportal", "bundesweit"]);
    expect(links[1]?.url).toBe("https://www.bund.de");
  });

  it("nennt dieselbe Adresse nicht zweimal", () => {
    const authority = AUTHORITIES.find((entry) => entry.key === "jobcenter");
    const links = stepAuthorityLinks(
      { authorityKey: "jobcenter", officialUrl: authority?.officialUrl },
      LEIPZIG,
    );
    const urls = links.map((link) => link.url);
    expect(new Set(urls).size).toBe(urls.length);
  });

  it("kommt ohne Behörde aus", () => {
    const links = stepAuthorityLinks({ officialUrl: "https://www.rundfunkbeitrag.de" }, LEIPZIG);
    expect(links).toHaveLength(1);
    expect(links[0]?.kind).toBe("bundesweit");
  });

  it("liefert für einen Schritt ohne Behörde und ohne Quelle nichts", () => {
    expect(stepAuthorityLinks({}, LEIPZIG)).toEqual([]);
  });
});
