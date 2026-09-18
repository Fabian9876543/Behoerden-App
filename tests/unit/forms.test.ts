import { describe, expect, it } from "vitest";
import { findForm, FORM_CATALOG } from "@/lib/forms/catalog";
import { resolveForms } from "@/lib/ai/form-assistance";
import { isOfficialAuthorityUrl } from "@/lib/authorities/registry";

describe("findForm", () => {
  it("findet ein Katalogformular und weist es als offiziell aus", () => {
    const result = findForm("Weiterbewilligungsantrag", "jobcenter");
    expect(result.sourceKind).toBe("official_catalog");
    expect(result.officialUrl).toContain("arbeitsagentur.de");
    expect(result.formNumber).toBe("WBA");
  });

  it("findet ueber die Formularnummer", () => {
    expect(findForm("WBA", "jobcenter").sourceKind).toBe("official_catalog");
  });

  it("faellt bei unbekanntem Formular auf die Behoerdenwebsite zurueck", () => {
    const result = findForm("Formular 999-XYZ", "rentenversicherung");
    expect(result.sourceKind).toBe("authority_website");
    expect(result.officialUrl).toContain("deutsche-rentenversicherung.de");
  });

  it("gibt bei voellig unbekannter Behoerde keine Quelle aus", () => {
    const result = findForm("Irgendein Formular", null);
    expect(result.sourceKind).toBe("unverified");
    expect(result.officialUrl).toBeNull();
  });

  it("stellt niemals eine ungeprueft Quelle als offiziell dar", () => {
    const result = findForm("Antrag beim Verein", "wohngeldstelle");
    expect(result.sourceKind).not.toBe("official_catalog");
  });
});

describe("resolveForms", () => {
  it("loest genannte Formulare auf und entfernt Duplikate", () => {
    const resolved = resolveForms(
      [
        { name: "Weiterbewilligungsantrag", formNumber: "WBA" },
        { name: "weiterbewilligungsantrag", formNumber: null },
        { name: "Anlage EK", formNumber: null },
      ],
      "jobcenter",
    );

    expect(resolved).toHaveLength(2);
    expect(resolved[0]?.sourceKind).toBe("official_catalog");
    expect(resolved[1]?.name).toContain("Anlage EK");
  });

  it("behaelt die im Dokument genannte Formularnummer", () => {
    const resolved = resolveForms([{ name: "Unbekannt", formNumber: "XY-7" }], null);
    expect(resolved[0]?.mentionedFormNumber).toBe("XY-7");
  });
});

describe("FORM_CATALOG", () => {
  it("verweist ausschliesslich auf offizielle Quellen", () => {
    for (const form of FORM_CATALOG) {
      expect(isOfficialAuthorityUrl(form.officialUrl), form.name).toBe(true);
    }
  });
});
