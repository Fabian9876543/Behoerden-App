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
import { deadlineBadgeText } from "@/components/shared/status";

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
  it("zählt Tage bis zum Stichtag", () => {
    expect(daysUntil("2026-09-25", NOW)).toBe(7);
  });

  it("liefert negative Werte für überfällige Termine", () => {
    expect(daysUntil("2026-09-15", NOW)).toBe(-3);
  });

  it("liefert 0 am Stichtag selbst", () => {
    expect(daysUntil("2026-09-18", NOW)).toBe(0);
  });
});

describe("deriveDeadlineStatus", () => {
  it("markiert vergangene Termine als überfällig", () => {
    expect(deriveDeadlineStatus("2026-09-01", "upcoming", NOW)).toBe("overdue");
  });

  it("markiert Termine innerhalb einer Woche als bald fällig", () => {
    expect(deriveDeadlineStatus("2026-09-22", "upcoming", NOW)).toBe("due_soon");
  });

  it("lässt spätere Termine anstehend", () => {
    expect(deriveDeadlineStatus("2026-12-01", "upcoming", NOW)).toBe("upcoming");
  });

  it("überschreibt Nutzerentscheidungen nicht", () => {
    expect(deriveDeadlineStatus("2026-09-01", "met", NOW)).toBe("met");
    expect(deriveDeadlineStatus("2026-09-01", "dismissed", NOW)).toBe("dismissed");
  });
});

describe("describeDueDate", () => {
  it("beschreibt heute, morgen und die Zukunft", () => {
    expect(describeDueDate("2026-09-18", NOW)).toBe("heute fällig");
    expect(describeDueDate("2026-09-19", NOW)).toBe("morgen fällig");
    expect(describeDueDate("2026-09-25", NOW)).toBe("in 7 Tagen");
  });

  it("beschreibt Überfälligkeit", () => {
    expect(describeDueDate("2026-09-17", NOW)).toBe("seit gestern überfällig");
    expect(describeDueDate("2026-09-15", NOW)).toBe("seit 3 Tagen überfällig");
  });
});

describe("greeting", () => {
  it("passt sich der Tageszeit an", () => {
    expect(greeting(new Date(2026, 8, 18, 8))).toBe("Guten Morgen");
    expect(greeting(new Date(2026, 8, 18, 14))).toBe("Guten Tag");
    expect(greeting(new Date(2026, 8, 18, 21))).toBe("Guten Abend");
  });
});

describe("deadlineBadgeText", () => {
  it("wiederholt bei überfälligen Fristen nicht das Wort", () => {
    // "Überfällig - seit 8 Tagen überfällig" wäre doppelt gemoppelt.
    expect(deadlineBadgeText("overdue", "2026-09-10")).toBe("Seit 8 Tagen überfällig");
    expect(deadlineBadgeText("overdue", "2026-09-17")).toBe("Seit gestern überfällig");
  });

  it("ergänzt sonst die relative Angabe", () => {
    expect(deadlineBadgeText("due_soon", "2026-09-22")).toBe("Bald fällig - in 4 Tagen");
    expect(deadlineBadgeText("upcoming", "2026-12-01")).toBe("Anstehend - in 74 Tagen");
  });

  it("zeigt bei erledigten Fristen nur den Status", () => {
    expect(deadlineBadgeText("met", "2026-09-10")).toBe("Erledigt");
    expect(deadlineBadgeText("dismissed", "2026-09-10")).toBe("Verworfen");
  });

  it("kommt ohne Datum aus", () => {
    expect(deadlineBadgeText("upcoming")).toBe("Anstehend");
  });
});
