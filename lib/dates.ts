import type { DeadlineStatus } from "@/lib/types/database";

const BERLIN_LOCALE = "de-DE";

/** ISO-Datum (YYYY-MM-DD) -> "15.10.2026" */
export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "-";
  const date = typeof value === "string" ? parseIsoDate(value) : value;
  if (!date) return "-";
  return new Intl.DateTimeFormat(BERLIN_LOCALE, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "-";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat(BERLIN_LOCALE, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/** Akzeptiert "2026-10-15" und ISO-Timestamps, sonst null. */
export function parseIsoDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return null;
  const [, y, m, d] = match;
  const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function startOfToday(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/** Ganze Tage bis zum Stichtag. Negativ = ueberfaellig. */
export function daysUntil(dueDate: string, now: Date = new Date()): number | null {
  const due = parseIsoDate(dueDate);
  if (!due) return null;
  const today = startOfToday(now);
  return Math.round((due.getTime() - today.getTime()) / 86_400_000);
}

/**
 * Leitet den Anzeigestatus einer Frist ab.
 * `met` und `dismissed` sind Nutzerentscheidungen und werden nie ueberschrieben.
 */
export function deriveDeadlineStatus(
  dueDate: string,
  current: DeadlineStatus,
  now: Date = new Date(),
): DeadlineStatus {
  if (current === "met" || current === "dismissed") return current;
  const days = daysUntil(dueDate, now);
  if (days === null) return current;
  if (days < 0) return "overdue";
  if (days <= 7) return "due_soon";
  return "upcoming";
}

/** "in 12 Tagen", "heute", "seit 3 Tagen ueberfaellig" */
export function describeDueDate(dueDate: string, now: Date = new Date()): string {
  const days = daysUntil(dueDate, now);
  if (days === null) return "";
  if (days === 0) return "heute faellig";
  if (days === 1) return "morgen faellig";
  if (days > 1) return `in ${days} Tagen`;
  if (days === -1) return "seit gestern ueberfaellig";
  return `seit ${Math.abs(days)} Tagen ueberfaellig`;
}

export function greeting(now: Date = new Date()): string {
  const hour = now.getHours();
  if (hour < 11) return "Guten Morgen";
  if (hour < 18) return "Guten Tag";
  return "Guten Abend";
}
