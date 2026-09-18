import { describe, expect, it } from "vitest";
import { __testing } from "@/lib/logging";
import { AppError, fail, ok, toUserMessage, userMessageFor } from "@/lib/errors";
import { buildLetterContext } from "@/lib/ai/letter-context";
import { buildIcsCalendar } from "@/lib/calendar/ics";

const { sanitize } = __testing;

describe("Logging-Datenschutz", () => {
  it("entfernt Dokumentinhalte", () => {
    const result = sanitize({ documentId: "abc", extracted_text: "Sehr geehrte Damen" });
    expect(result.documentId).toBe("abc");
    expect(result.extracted_text).toBe("[redacted]");
  });

  it("entfernt personenbezogene Felder", () => {
    const result = sanitize({ email: "a@b.de", firstName: "Anna", street: "Hauptstr. 1" });
    expect(result.email).toBe("[redacted]");
    expect(result.firstName).toBe("[redacted]");
    expect(result.street).toBe("[redacted]");
  });

  it("kuerzt lange Freitexte, auch unter unbekannten Schluesseln", () => {
    expect(sanitize({ irgendwas: "x".repeat(300) }).irgendwas).toBe("[redacted:long-string]");
  });

  it("laesst unkritische Metadaten durch", () => {
    const result = sanitize({ caseId: "c1", taskCount: 3, ok: true });
    expect(result).toEqual({ caseId: "c1", taskCount: 3, ok: true });
  });
});

describe("Fehlerbehandlung", () => {
  it("liefert deutsche Meldungen ohne technische Details", () => {
    const error = new AppError("pdf_unreadable");
    expect(error.userMessage).toContain("PDF");
    expect(error.userMessage).not.toContain("Error");
    expect(error.status).toBe(500);
  });

  it("setzt passende HTTP-Status", () => {
    expect(new AppError("unauthorized").status).toBe(401);
    expect(new AppError("not_found").status).toBe(404);
    expect(new AppError("file_too_large").status).toBe(413);
    expect(new AppError("unsupported_file_type").status).toBe(415);
    expect(new AppError("ai_unavailable").status).toBe(503);
  });

  it("verschweigt unbekannte Fehler gegenueber dem Nutzer", () => {
    const leaky = new Error("Connection refused at 10.0.0.5:5432 password=hunter2");
    expect(toUserMessage(leaky)).toBe(userMessageFor("unknown"));
    expect(toUserMessage(leaky)).not.toContain("hunter2");
  });

  it("verpackt Ergebnisse einheitlich", () => {
    expect(ok({ a: 1 })).toEqual({ ok: true, data: { a: 1 } });
    const failed = fail(new AppError("not_found"));
    expect(failed.ok).toBe(false);
    expect(failed.error?.code).toBe("not_found");
  });
});

describe("buildLetterContext", () => {
  const base = {
    caseRow: {
      title: "Weiterbewilligung",
      authority_name: "Jobcenter",
      case_type: "weiterbewilligung",
      reference_number: "12345",
      summary: "Unterlagen nachreichen.",
    },
    tasks: [
      { title: "Kontoauszuege hochladen", status: "open" as const, due_date: "2026-10-15" },
      { title: "Antrag ausfuellen", status: "completed" as const, due_date: null },
    ],
    deadlines: [
      { title: "Antrag einreichen", due_date: "2026-10-15", status: "due_soon" as const },
    ],
    profile: null,
  };

  it("enthaelt nur strukturierte Vorgangsdaten", () => {
    const context = buildLetterContext(base);
    expect(context).toContain("Jobcenter");
    expect(context).toContain("12345");
    expect(context).toContain("Kontoauszuege hochladen");
    expect(context).toContain("Bereits erledigt");
  });

  it("setzt Platzhalter, wenn das Profil leer ist", () => {
    const context = buildLetterContext(base);
    expect(context).toContain("[Name ergaenzen]");
    expect(context).toContain("[Anschrift ergaenzen]");
  });

  it("uebernimmt vorhandene Profildaten", () => {
    const context = buildLetterContext({
      ...base,
      profile: {
        first_name: "Anna",
        last_name: "Muster",
        street: "Hauptstr. 1",
        postal_code: "12345",
        city: "Musterstadt",
      },
    });
    expect(context).toContain("Anna Muster");
    expect(context).toContain("Hauptstr. 1, 12345 Musterstadt");
  });
});

describe("buildIcsCalendar", () => {
  const now = new Date("2026-09-18T10:00:00Z");

  it("erzeugt ein gueltiges Kalendergeruest", () => {
    const ics = buildIcsCalendar(
      [{ uid: "abc", date: "2026-10-15", title: "Antrag einreichen" }],
      now,
    );
    expect(ics.startsWith("BEGIN:VCALENDAR")).toBe(true);
    expect(ics.trimEnd().endsWith("END:VCALENDAR")).toBe(true);
    expect(ics).toContain("DTSTART;VALUE=DATE:20261015");
    // DTEND ist exklusiv.
    expect(ics).toContain("DTEND;VALUE=DATE:20261016");
    expect(ics).toContain("SUMMARY:Antrag einreichen");
  });

  it("maskiert Sonderzeichen", () => {
    const ics = buildIcsCalendar(
      [{ uid: "a", date: "2026-10-15", title: "Antrag; Teil 1, Teil 2" }],
      now,
    );
    expect(ics).toContain("SUMMARY:Antrag\; Teil 1\\, Teil 2");
  });

  it("erzeugt Erinnerungen", () => {
    const ics = buildIcsCalendar(
      [{ uid: "a", date: "2026-10-15", title: "X", reminderDaysBefore: [7, 1] }],
      now,
    );
    expect(ics).toContain("TRIGGER:-P7D");
    expect(ics).toContain("TRIGGER:-P1D");
  });

  it("nutzt CRLF-Zeilenenden", () => {
    const ics = buildIcsCalendar([{ uid: "a", date: "2026-10-15", title: "X" }], now);
    expect(ics).toContain("\r\n");
  });
});
