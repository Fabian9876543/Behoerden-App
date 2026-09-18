import { describe, expect, it } from "vitest";
import { getLifeEvent, LIFE_EVENTS } from "@/lib/life-events/catalog";
import { buildPlan, missingRequiredAnswers, selectSteps, shiftDate } from "@/lib/life-events/plan";
import { AUTHORITIES, isOfficialAuthorityUrl } from "@/lib/authorities/registry";

/**
 * Die Lebenslagen sind der einzige Teil der Anwendung, der Pflichten nennt,
 * ohne dass ein Dokument sie belegt. Entsprechend streng wird der Katalog
 * geprüft - und die Planung muss deterministisch bleiben.
 */

const umzug = getLifeEvent("umzug")!;

describe("Katalog der Lebenslagen", () => {
  it("hat eindeutige Schlüssel", () => {
    const keys = LIFE_EVENTS.map((event) => event.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it.each(LIFE_EVENTS.map((event) => [event.key, event] as const))(
    "%s hat eindeutige Schritt-Schlüssel",
    (_key, event) => {
      const keys = event.steps.map((step) => step.key);
      expect(new Set(keys).size).toBe(keys.length);
    },
  );

  it("verweist nur auf Behörden, die es in der Registry gibt", () => {
    const known = new Set(AUTHORITIES.map((authority) => authority.key));
    for (const event of LIFE_EVENTS) {
      for (const step of event.steps) {
        if (!step.authorityKey) continue;
        expect(known.has(step.authorityKey), `${event.key}/${step.key}`).toBe(true);
      }
    }
  });

  it("nennt ausschließlich offizielle Quellen", () => {
    // Eine erfundene oder private Quelle wäre hier der schlimmste Fehler.
    for (const event of LIFE_EVENTS) {
      for (const step of event.steps) {
        if (!step.officialUrl) continue;
        expect(isOfficialAuthorityUrl(step.officialUrl), `${step.key}: ${step.officialUrl}`).toBe(
          true,
        );
      }
    }
  });

  it("bezieht jede Frist auf eine Datumsfrage, die es gibt", () => {
    for (const event of LIFE_EVENTS) {
      const dateQuestions = new Set(
        event.questions.filter((question) => question.type === "date").map((q) => q.key),
      );
      for (const step of event.steps) {
        if (!step.deadline) continue;
        expect(dateQuestions.has(step.deadline.relativeTo), `${step.key}`).toBe(true);
      }
    }
  });

  it("zeigt Schritte nur abhängig von Ja/Nein-Fragen, die es gibt", () => {
    for (const event of LIFE_EVENTS) {
      const booleans = new Set(
        event.questions.filter((question) => question.type === "boolean").map((q) => q.key),
      );
      for (const step of event.steps) {
        for (const key of step.showIf ?? []) {
          expect(booleans.has(key), `${step.key} -> ${key}`).toBe(true);
        }
      }
    }
  });

  it("hat pro Lebenslage genau eine Pflicht-Datumsfrage", () => {
    for (const event of LIFE_EVENTS) {
      const required = event.questions.filter((question) => question.required);
      expect(required.length, event.key).toBe(1);
      expect(required[0]?.type, event.key).toBe("date");
    }
  });
});

describe("shiftDate", () => {
  it("rechnet vorwärts und rückwärts", () => {
    expect(shiftDate("2026-10-01", 14)).toBe("2026-10-15");
    expect(shiftDate("2026-10-01", -30)).toBe("2026-09-01");
  });

  it("rechnet über Monats- und Jahresgrenzen", () => {
    expect(shiftDate("2026-12-28", 14)).toBe("2027-01-11");
    expect(shiftDate("2028-02-28", 1)).toBe("2028-02-29");
  });

  it("gibt ohne Bezugsdatum null zurück", () => {
    expect(shiftDate(null, 14)).toBeNull();
    expect(shiftDate("kein datum", 14)).toBeNull();
  });
});

describe("selectSteps", () => {
  it("zeigt ohne Zusatzangaben nur die allgemeinen Schritte", () => {
    const steps = selectSteps(umzug, { moveDate: "2026-10-01" });
    const keys = steps.map((step) => step.key);

    expect(keys).toContain("anmeldung_buergeramt");
    expect(keys).toContain("wohnungsgeberbestaetigung");
    expect(keys).not.toContain("kfz_ummelden");
    expect(keys).not.toContain("familienkasse");
    expect(keys).not.toContain("auslaenderbehoerde");
  });

  it("ergänzt die Schritte zur jeweiligen Situation", () => {
    const steps = selectSteps(umzug, {
      moveDate: "2026-10-01",
      hasVehicle: true,
      hasChildren: true,
      receivesBenefits: true,
      hasResidencePermit: true,
    });
    const keys = steps.map((step) => step.key);

    expect(keys).toContain("kfz_ummelden");
    expect(keys).toContain("kita_schule");
    expect(keys).toContain("zusicherung_jobcenter");
    expect(keys).toContain("auslaenderbehoerde");
  });
});

describe("buildPlan", () => {
  const answers = { moveDate: "2026-10-01", newCity: "Leipzig", receivesBenefits: true };

  it("rechnet die gesetzliche Meldefrist aus dem Einzugsdatum", () => {
    const plan = buildPlan(umzug, answers);
    const anmeldung = plan.steps.find((step) => step.key === "anmeldung_buergeramt");

    // § 17 Abs. 1 BMG: zwei Wochen nach dem Einzug.
    expect(anmeldung?.dueDate).toBe("2026-10-15");
  });

  it("legt die Zusicherung vor den Umzug", () => {
    const plan = buildPlan(umzug, answers);
    const zusicherung = plan.steps.find((step) => step.key === "zusicherung_jobcenter");

    expect(zusicherung?.dueDate).toBe("2026-09-01");
  });

  it("sortiert die Fristen nach Fälligkeit", () => {
    const dates = buildPlan(umzug, answers).deadlines.map((deadline) => deadline.dueDate);
    expect(dates).toEqual([...dates].sort());
  });

  it("nimmt den Zielort in den Titel auf", () => {
    expect(buildPlan(umzug, answers).caseTitle).toBe("Umzug nach Leipzig");
    expect(buildPlan(umzug, { moveDate: "2026-10-01" }).caseTitle).toBe("Umzug");
  });

  it("führt jede Unterlage nur einmal auf", () => {
    const names = buildPlan(umzug, {
      moveDate: "2026-10-01",
      hasResidencePermit: true,
    }).documents.map((document) => document.name.toLowerCase());

    expect(new Set(names).size).toBe(names.length);
  });

  it("lässt ohne Einzugsdatum die Fristen offen, statt zu raten", () => {
    const plan = buildPlan(umzug, {});
    expect(plan.deadlines).toEqual([]);
    expect(plan.steps.every((step) => step.dueDate === null)).toBe(true);
  });

  it("ist deterministisch", () => {
    expect(buildPlan(umzug, answers)).toEqual(buildPlan(umzug, answers));
  });

  it("nennt in der Zusammenfassung Umfang und örtlichen Vorbehalt", () => {
    const summary = buildPlan(umzug, answers).summary;
    expect(summary).toMatch(/\d+ Schritte/);
    expect(summary).toContain(umzug.localNote);
  });
});

describe("missingRequiredAnswers", () => {
  it("meldet das fehlende Pflichtdatum", () => {
    expect(missingRequiredAnswers(umzug, {})).toEqual(["moveDate"]);
    expect(missingRequiredAnswers(umzug, { moveDate: "   " })).toEqual(["moveDate"]);
    expect(missingRequiredAnswers(umzug, { moveDate: "2026-10-01" })).toEqual([]);
  });
});

describe("Geburt", () => {
  const geburt = getLifeEvent("geburt")!;

  it("blendet die Vaterschaftsanerkennung nur bei unverheirateten Eltern ein", () => {
    const married = selectSteps(geburt, { birthDate: "2026-09-01" }).map((step) => step.key);
    const unmarried = selectSteps(geburt, { birthDate: "2026-09-01", unmarried: true }).map(
      (step) => step.key,
    );

    expect(married).not.toContain("vaterschaft");
    expect(unmarried).toContain("vaterschaft");
  });

  it("rechnet die Anzeigefrist beim Standesamt aus dem Geburtsdatum", () => {
    const plan = buildPlan(geburt, { birthDate: "2026-09-01" });
    expect(plan.steps.find((step) => step.key === "standesamt")?.dueDate).toBe("2026-09-08");
  });
});
