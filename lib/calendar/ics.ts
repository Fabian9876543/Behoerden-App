/**
 * iCalendar-Export.
 *
 * Vorbereitete Schnittstelle: Die Anwendung erzeugt eine .ics-Datei mit allen
 * offenen Fristen. Eine echte Zwei-Wege-Kalendersynchronisation ist bewusst
 * nicht Teil des MVP, lässt sich hier aber andocken.
 */

export interface CalendarEvent {
  uid: string;
  /** Ganztägiger Termin, YYYY-MM-DD. */
  date: string;
  title: string;
  description?: string | null;
  /** Tage vor dem Termin, an denen erinnert werden soll. */
  reminderDaysBefore?: number[];
}

function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** Faltet Zeilen auf 75 Oktette, wie es RFC 5545 verlangt. */
function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const chunks: string[] = [line.slice(0, 75)];
  let rest = line.slice(75);
  while (rest.length > 74) {
    chunks.push(` ${rest.slice(0, 74)}`);
    rest = rest.slice(74);
  }
  if (rest.length > 0) chunks.push(` ${rest}`);
  return chunks.join("\r\n");
}

function compactDate(isoDate: string): string {
  return isoDate.replace(/-/g, "");
}

function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function buildIcsCalendar(events: CalendarEvent[], now: Date = new Date()): string {
  const stamp = `${now.toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`;

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//BehoerdenBuddy//Fristen//DE",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:BehördenBuddy Fristen",
  ];

  for (const event of events) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${event.uid}@behoerdenbuddy.local`,
      `DTSTAMP:${stamp}`,
      // Ganztägig: DTEND ist exklusiv, daher +1 Tag.
      `DTSTART;VALUE=DATE:${compactDate(event.date)}`,
      `DTEND;VALUE=DATE:${compactDate(addDays(event.date, 1))}`,
      `SUMMARY:${escapeText(event.title)}`,
    );

    if (event.description) {
      lines.push(`DESCRIPTION:${escapeText(event.description)}`);
    }

    for (const days of event.reminderDaysBefore ?? []) {
      lines.push(
        "BEGIN:VALARM",
        "ACTION:DISPLAY",
        `TRIGGER:-P${days}D`,
        `DESCRIPTION:${escapeText(`Erinnerung: ${event.title}`)}`,
        "END:VALARM",
      );
    }

    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.map(foldLine).join("\r\n");
}
