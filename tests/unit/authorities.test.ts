import { describe, expect, it } from "vitest";
import {
  AUTHORITIES,
  getAuthority,
  isOfficialAuthorityUrl,
  matchAuthorityKey,
} from "@/lib/authorities/registry";

describe("matchAuthorityKey", () => {
  it("erkennt exakte Namen", () => {
    expect(matchAuthorityKey("Jobcenter")).toBe("jobcenter");
    expect(matchAuthorityKey("Finanzamt")).toBe("finanzamt");
  });

  it("erkennt Aliase und Umlautschreibweisen", () => {
    expect(matchAuthorityKey("Bürgergeld-Stelle")).toBe("jobcenter");
    expect(matchAuthorityKey("Deutsche Rentenversicherung Bund")).toBe("rentenversicherung");
    expect(matchAuthorityKey("Ausländerbehörde der Stadt Musterstadt")).toBe(
      "auslaenderbehoerde",
    );
  });

  it("erkennt eine Behoerde in einem laengeren Namen", () => {
    expect(matchAuthorityKey("Jobcenter Musterstadt - Team 42")).toBe("jobcenter");
  });

  it("gibt null bei unbekannten Behoerden zurueck", () => {
    expect(matchAuthorityKey("Musterverein e.V.")).toBeNull();
    expect(matchAuthorityKey(null)).toBeNull();
    expect(matchAuthorityKey("")).toBeNull();
  });
});

describe("getAuthority", () => {
  it("liefert den Eintrag zum Schluessel", () => {
    expect(getAuthority("jobcenter")?.name).toBe("Jobcenter");
  });

  it("liefert null bei unbekanntem Schluessel", () => {
    expect(getAuthority("gibtsnicht")).toBeNull();
    expect(getAuthority(null)).toBeNull();
  });
});

describe("isOfficialAuthorityUrl", () => {
  it("akzeptiert bekannte offizielle Quellen", () => {
    expect(isOfficialAuthorityUrl("https://www.arbeitsagentur.de/buergergeld")).toBe(true);
    expect(isOfficialAuthorityUrl("https://www.elster.de")).toBe(true);
    expect(isOfficialAuthorityUrl("https://service.bund.de/formulare")).toBe(true);
  });

  it("lehnt Drittquellen ab", () => {
    expect(isOfficialAuthorityUrl("https://formulare-billig.example.com")).toBe(false);
    expect(isOfficialAuthorityUrl("https://hartz4hilfe.de")).toBe(false);
  });

  it("lehnt unverschluesselte Verbindungen ab", () => {
    expect(isOfficialAuthorityUrl("http://www.arbeitsagentur.de")).toBe(false);
  });

  it("lehnt kaputte URLs ab", () => {
    expect(isOfficialAuthorityUrl("nicht-mal-eine-url")).toBe(false);
  });

  it("laesst sich nicht durch angehaengte Domains taeuschen", () => {
    expect(isOfficialAuthorityUrl("https://elster.de.boese.example")).toBe(false);
    expect(isOfficialAuthorityUrl("https://bund.de.evil.com")).toBe(false);
  });
});

describe("AUTHORITIES", () => {
  it("hat eindeutige Schluessel", () => {
    const keys = AUTHORITIES.map((a) => a.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("hinterlegt nur offizielle URLs", () => {
    for (const authority of AUTHORITIES) {
      if (!authority.officialUrl) continue;
      expect(
        isOfficialAuthorityUrl(authority.officialUrl),
        `${authority.key}: ${authority.officialUrl}`,
      ).toBe(true);
    }
  });
});
