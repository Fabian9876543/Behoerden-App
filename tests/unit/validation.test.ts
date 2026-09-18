import { describe, expect, it } from "vitest";
import {
  createCaseSchema,
  createDeadlineSchema,
  createTaskSchema,
  credentialsSchema,
  emptyToNull,
  firstIssueMessage,
  onboardingSchema,
  profileSchema,
  setTaskStatusSchema,
} from "@/lib/validation/schemas";

const UUID = "44444444-4444-4444-8444-444444444444";

describe("credentialsSchema", () => {
  it("akzeptiert gültige Zugangsdaten", () => {
    expect(
      credentialsSchema.safeParse({ email: "a@b.de", password: "12345678" }).success,
    ).toBe(true);
  });

  it("lehnt kurze Passwörter und kaputte Mails ab", () => {
    expect(credentialsSchema.safeParse({ email: "a@b.de", password: "123" }).success).toBe(false);
    expect(
      credentialsSchema.safeParse({ email: "keine-mail", password: "12345678" }).success,
    ).toBe(false);
  });

  it("liefert eine deutsche Fehlermeldung", () => {
    const result = credentialsSchema.safeParse({ email: "x", password: "12345678" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(firstIssueMessage(result.error)).toBe("Ungültige E-Mail-Adresse.");
    }
  });
});

describe("onboardingSchema", () => {
  it("kennt genau die beiden Optionen", () => {
    expect(onboardingSchema.safeParse({ householdMode: "personal" }).success).toBe(true);
    expect(onboardingSchema.safeParse({ householdMode: "family" }).success).toBe(true);
    expect(onboardingSchema.safeParse({ householdMode: "firma" }).success).toBe(false);
  });
});

describe("profileSchema", () => {
  it("akzeptiert leere Felder", () => {
    const result = profileSchema.safeParse({
      firstName: "",
      lastName: "",
      phone: "",
      street: "",
      postalCode: "",
      city: "",
    });
    expect(result.success).toBe(true);
  });

  it("prüft die Postleitzahl", () => {
    expect(profileSchema.safeParse({ postalCode: "12345" }).success).toBe(true);
    expect(profileSchema.safeParse({ postalCode: "123" }).success).toBe(false);
  });
});

describe("createCaseSchema", () => {
  it("verlangt einen aussagekräftigen Titel", () => {
    expect(createCaseSchema.safeParse({ title: "Wohngeld" }).success).toBe(true);
    expect(createCaseSchema.safeParse({ title: "ab" }).success).toBe(false);
  });
});

describe("createTaskSchema", () => {
  it("verlangt eine gültige Vorgangs-ID", () => {
    expect(
      createTaskSchema.safeParse({ caseId: "keine-uuid", title: "Etwas tun" }).success,
    ).toBe(false);
    expect(createTaskSchema.safeParse({ caseId: UUID, title: "Etwas tun" }).success).toBe(true);
  });

  it("lehnt ein falsch formatiertes Datum ab", () => {
    expect(
      createTaskSchema.safeParse({ caseId: UUID, title: "Etwas tun", dueDate: "15.10.2026" })
        .success,
    ).toBe(false);
  });
});

describe("createDeadlineSchema", () => {
  it("verlangt ein Datum", () => {
    expect(createDeadlineSchema.safeParse({ caseId: UUID, title: "Frist" }).success).toBe(false);
    expect(
      createDeadlineSchema.safeParse({ caseId: UUID, title: "Frist", dueDate: "2026-10-15" })
        .success,
    ).toBe(true);
  });
});

describe("setTaskStatusSchema", () => {
  it("kennt nur erlaubte Status", () => {
    expect(setTaskStatusSchema.safeParse({ taskId: UUID, status: "completed" }).success).toBe(
      true,
    );
    expect(setTaskStatusSchema.safeParse({ taskId: UUID, status: "erledigt" }).success).toBe(
      false,
    );
  });
});

describe("emptyToNull", () => {
  it("normalisiert leere Eingaben", () => {
    expect(emptyToNull("")).toBeNull();
    expect(emptyToNull("   ")).toBeNull();
    expect(emptyToNull(undefined)).toBeNull();
    expect(emptyToNull(" Text ")).toBe("Text");
  });
});
