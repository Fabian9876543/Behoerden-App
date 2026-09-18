import { describe, expect, it } from "vitest";
import {
  daysUntil,
  deriveDeadlineStatus,
  describeDueDate,
  formatDate,
  greeting,
  parseIsoDate,
  toIsoDate,
} from "@/lib/dates";

const NOW = new Date("2026-09-18T10:00:00Z");

describe("parseIsoDate", () => {
  it("liest ein ISO-Datum", () => {
    expect(toIsoDate(parseIsoDate("2026-10-15")!)).toBe("2026-10-15");
  });

  it("gibt null bei unbrauchbarer Eingabe", () => {
    expect(parseIsoDate("15.10.2026")).toBeNull();
    expect(parseIsoDate("keine Ahnung")).toBeNull();
  });
});

describe("formatDate", () => {
  it("formatiert deutsch", () => {
    expect(formatDate("2026-10-15")).toBe("15.10.2026");
  });

  it("zeigt einen Platzhalter bei fehlendem Wert", () => {
    expect(formatDate(null)).toBe("-");
  });
});

describe("daysUntil", () => {
  it("zaehlt Tage bis zum Stichtag", () => {
    expect(daysUntil("2026-09-25", NOW)).toBe(7);
  });

  it("liefert negative Werte fuer ueberfaellige Termine", () => {
    expect(daysUntil("2026-09-15", NOW)).toBe(-3);
  });

  it("liefert 0 am Stichtag selbst", () => {
    expect(daysUntil("2026-09-18", NOW)).toBe(0);
  });
});

describe("deriveDeadlineStatus", () => {
  it("markiert vergangene Termine als ueberfaellig", () => {
    expect(deriveDeadlineStatus("2026-09-01", "upcoming", NOW)).toBe("overdue");
  });

  it("markiert Termine innerhalb einer Woche als bald faellig", () => {
    expect(deriveDeadlineStatus("2026-09-22", "upcoming", NOW)).toBe("due_soon");
  });

  it("laesst spaetere Termine anstehend", () => {
    expect(deriveDeadlineStatus("2026-12-01", "upcoming", NOW)).toBe("upcoming");
  });

  it("ueberschreibt Nutzerentscheidungen nicht", () => {
    expect(deriveDeadlineStatus("2026-09-01", "met", NOW)).toBe("met");
    expect(deriveDeadlineStatus("2026-09-01", "dismissed", NOW)).toBe("dismissed");
  });
});

describe("describeDueDate", () => {
  it("beschreibt heute, morgen und die Zukunft", () => {
    expect(describeDueDate("2026-09-18", NOW)).toBe("heute faellig");
    expect(describeDueDate("2026-09-19", NOW)).toBe("morgen faellig");
    expect(describeDueDate("2026-09-25", NOW)).toBe("in 7 Tagen");
  });

  it("beschreibt Ueberfaelligkeit", () => {
    expect(describeDueDate("2026-09-17", NOW)).toBe("seit gestern ueberfaellig");
    expect(describeDueDate("2026-09-15", NOW)).toBe("seit 3 Tagen ueberfaellig");
  });
});

describe("greeting", () => {
  it("passt sich der Tageszeit an", () => {
    expect(greeting(new Date(2026, 8, 18, 8))).toBe("Guten Morgen");
    expect(greeting(new Date(2026, 8, 18, 14))).toBe("Guten Tag");
    expect(greeting(new Date(2026, 8, 18, 21))).toBe("Guten Abend");
  });
});
