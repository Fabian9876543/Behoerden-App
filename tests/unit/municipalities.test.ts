import { describe, expect, it } from "vitest";
import {
  MUNICIPAL_DOMAINS,
  MUNICIPALITIES,
  getMunicipality,
  normalizePlace,
  resolveMunicipality,
} from "@/lib/authorities/municipalities";
import { isOfficialAuthorityUrl } from "@/lib/authorities/registry";

/**
 * Der Gemeindekatalog entscheidet, welchen Link eine Person zu sehen bekommt.
 * Der teuerste Fehler wäre nicht ein fehlender Link, sondern ein falscher -
 * das Bürgeramt einer gleichnamigen Stadt 400 Kilometer weiter. Diese Tests
 * halten deshalb vor allem fest, wann bewusst *nichts* geliefert wird.
 */

describe("normalizePlace", () => {
  it("löst Umlaute auf", () => {
    expect(normalizePlace("München")).toBe(normalizePlace("Muenchen"));
    expect(normalizePlace("Lübeck")).toBe("luebeck");
  });

  it("zieht Klammerzusätze in den Namen", () => {
    expect(normalizePlace("Halle (Saale)")).toBe("halle saale");
  });

  it("ignoriert Satzzeichen und doppelte Leerzeichen", () => {
    expect(normalizePlace("  Frankfurt/Main ")).toBe("frankfurt main");
  });
});

describe("resolveMunicipality", () => {
  it("findet eine Stadt über den Namen", () => {
    expect(resolveMunicipality({ city: "Leipzig" })?.key).toBe("leipzig");
  });

  it("findet sie auch ohne Umlaute geschrieben", () => {
    expect(resolveMunicipality({ city: "Muenchen" })?.key).toBe("muenchen");
    expect(resolveMunicipality({ city: "Köln" })?.key).toBe("koeln");
  });

  it("akzeptiert hinterlegte Schreibweisen", () => {
    expect(resolveMunicipality({ city: "Frankfurt am Main" })?.key).toBe("frankfurt_am_main");
    expect(resolveMunicipality({ city: "Halle an der Saale" })?.key).toBe("halle_saale");
  });

  it("liefert nichts bei einem mehrdeutigen Namen ohne PLZ", () => {
    // Frankfurt am Main oder Frankfurt (Oder)? Ohne PLZ ist das nicht zu
    // entscheiden - und Raten ist hier der schlimmere Fehler.
    expect(resolveMunicipality({ city: "Frankfurt" })).toBeNull();
    expect(resolveMunicipality({ city: "Halle" })).toBeNull();
  });

  it("entscheidet einen mehrdeutigen Namen über die PLZ", () => {
    expect(resolveMunicipality({ city: "Frankfurt", postalCode: "60313" })?.key).toBe(
      "frankfurt_am_main",
    );
    expect(resolveMunicipality({ city: "Halle", postalCode: "06108" })?.key).toBe("halle_saale");
  });

  it("liefert nichts, wenn die PLZ zu einem anderen Ort gehört", () => {
    // 15230 ist Frankfurt (Oder), 33790 ist Halle (Westf.) - beide stehen
    // nicht im Katalog, also gibt es keinen Link.
    expect(resolveMunicipality({ city: "Frankfurt", postalCode: "15230" })).toBeNull();
    expect(resolveMunicipality({ city: "Halle", postalCode: "33790" })).toBeNull();
  });

  it("ignoriert eine unbrauchbare PLZ", () => {
    expect(resolveMunicipality({ city: "Frankfurt", postalCode: "601" })).toBeNull();
    expect(resolveMunicipality({ city: "Leipzig", postalCode: "keine" })?.key).toBe("leipzig");
  });

  it("liest die PLZ auch mit Leerzeichen", () => {
    expect(resolveMunicipality({ city: "Frankfurt", postalCode: " 60313 " })?.key).toBe(
      "frankfurt_am_main",
    );
  });

  it("liefert nichts für unbekannte oder leere Orte", () => {
    expect(resolveMunicipality({ city: "Kleinkleckersdorf" })).toBeNull();
    expect(resolveMunicipality({ city: "" })).toBeNull();
    expect(resolveMunicipality({ city: null })).toBeNull();
    expect(resolveMunicipality({})).toBeNull();
  });
});

describe("getMunicipality", () => {
  it("findet über den Schlüssel", () => {
    expect(getMunicipality("dresden")?.name).toBe("Dresden");
  });

  it("liefert null für unbekannte Schlüssel", () => {
    expect(getMunicipality("atlantis")).toBeNull();
    expect(getMunicipality(null)).toBeNull();
  });
});

describe("Stadtportale als offizielle Quelle", () => {
  it("jede Katalogadresse besteht die Offiziell-Prüfung", () => {
    for (const entry of MUNICIPALITIES) {
      expect(isOfficialAuthorityUrl(entry.url), entry.name).toBe(true);
    }
  });

  it("Unterdomains einer hinterlegten Stadt zählen mit", () => {
    expect(isOfficialAuthorityUrl("https://service.berlin.de/dienstleistung/120686/")).toBe(true);
  });

  it("eine Gemeinde, die nicht im Katalog steht, zählt nicht", () => {
    expect(isOfficialAuthorityUrl("https://www.kleinkleckersdorf.de")).toBe(false);
  });

  it("eine fremde Domain mit einem Stadtnamen darin zählt nicht", () => {
    expect(isOfficialAuthorityUrl("https://www.leipzig.de.beispiel.com")).toBe(false);
    expect(isOfficialAuthorityUrl("https://leipzig-buergeramt-service.com")).toBe(false);
  });

  it("HTTP zählt nie", () => {
    expect(isOfficialAuthorityUrl("http://www.leipzig.de")).toBe(false);
  });
});

describe("MUNICIPAL_DOMAINS", () => {
  it("enthält die Domains ohne www und ohne Dopplungen", () => {
    expect(MUNICIPAL_DOMAINS).toContain("leipzig.de");
    expect(MUNICIPAL_DOMAINS.every((domain) => !domain.startsWith("www."))).toBe(true);
    expect(new Set(MUNICIPAL_DOMAINS).size).toBe(MUNICIPAL_DOMAINS.length);
  });
});
