import { describe, expect, it } from "vitest";
import { findForm, FORM_CATALOG } from "@/lib/forms/catalog";
import { prefillFieldsFromProfile, resolveForms } from "@/lib/ai/form-assistance";
import { isOfficialAuthorityUrl } from "@/lib/authorities/registry";
import type { Profile } from "@/lib/types/database";

describe("findForm", () => {
  it("findet ein Katalogformular und weist es als offiziell aus", () => {
    const result = findForm("Weiterbewilligungsantrag", "jobcenter");
    expect(result.sourceKind).toBe("official_catalog");
    expect(result.officialUrl).toContain("arbeitsagentur.de");
    expect(result.formNumber).toBe("WBA");
  });

  it("findet über die Formularnummer", () => {
    expect(findForm("WBA", "jobcenter").sourceKind).toBe("official_catalog");
  });

  it("fällt bei unbekanntem Formular auf die Behördenwebsite zurück", () => {
    const result = findForm("Formular 999-XYZ", "rentenversicherung");
    expect(result.sourceKind).toBe("authority_website");
    expect(result.officialUrl).toContain("deutsche-rentenversicherung.de");
  });

  it("gibt bei völlig unbekannter Behörde keine Quelle aus", () => {
    const result = findForm("Irgendein Formular", null);
    expect(result.sourceKind).toBe("unverified");
    expect(result.officialUrl).toBeNull();
  });

  it("stellt niemals eine ungeprüft Quelle als offiziell dar", () => {
    const result = findForm("Antrag beim Verein", "wohngeldstelle");
    expect(result.sourceKind).not.toBe("official_catalog");
  });
});

describe("resolveForms", () => {
  it("löst genannte Formulare auf und entfernt Duplikate", () => {
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

  it("behält die im Dokument genannte Formularnummer", () => {
    const resolved = resolveForms([{ name: "Unbekannt", formNumber: "XY-7" }], null);
    expect(resolved[0]?.mentionedFormNumber).toBe("XY-7");
  });
});

describe("FORM_CATALOG", () => {
  it("verweist ausschließlich auf offizielle Quellen", () => {
    for (const form of FORM_CATALOG) {
      expect(isOfficialAuthorityUrl(form.officialUrl), form.name).toBe(true);
    }
  });
});

describe("prefillFieldsFromProfile", () => {
  const profile = (overrides: Partial<Profile> = {}): Profile => ({
    id: "11111111-1111-4111-8111-111111111111",
    first_name: "Anna",
    last_name: "Muster",
    email: "anna@example.de",
    phone: null,
    street: "Hauptstr. 1",
    postal_code: "12345",
    city: "Musterstadt",
    household_mode: "personal",
    onboarding_completed_at: null,
    created_at: "2026-09-18T10:00:00Z",
    updated_at: "2026-09-18T10:00:00Z",
    ...overrides,
  });

  it("liefert die ausgefüllten Felder in stabiler Reihenfolge", () => {
    const fields = prefillFieldsFromProfile(profile());
    expect(fields.map((field) => field.label)).toEqual([
      "Vorname",
      "Nachname",
      "Straße und Hausnummer",
      "Postleitzahl",
      "Ort",
      "E-Mail",
    ]);
  });

  it("lässt leere und nur aus Leerzeichen bestehende Felder aus", () => {
    const fields = prefillFieldsFromProfile(profile({ last_name: "", city: "   " }));
    const labels = fields.map((field) => field.label);
    expect(labels).not.toContain("Nachname");
    expect(labels).not.toContain("Ort");
  });

  it("schneidet Leerzeichen an den Rändern ab", () => {
    const fields = prefillFieldsFromProfile(profile({ first_name: "  Anna  " }));
    expect(fields.find((field) => field.label === "Vorname")?.value).toBe("Anna");
  });

  it("gibt ohne Profil nichts zurück", () => {
    expect(prefillFieldsFromProfile(null)).toEqual([]);
  });
});
