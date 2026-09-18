/**
 * Fehlerbehandlung.
 *
 * Grundsatz: Der Nutzer sieht eine verständliche deutsche Meldung.
 * Technische Details bleiben im Server-Log - und dort ohne Dokumentinhalte.
 */

export type AppErrorCode =
  | "unauthorized"
  | "not_found"
  | "validation_failed"
  | "file_too_large"
  | "unsupported_file_type"
  | "pdf_unreadable"
  | "ocr_failed"
  | "ai_unavailable"
  | "ai_invalid_output"
  | "storage_failed"
  | "database_failed"
  | "not_configured"
  | "unknown";

const USER_MESSAGES: Record<AppErrorCode, string> = {
  unauthorized: "Bitte melde dich an, um fortzufahren.",
  not_found: "Der gesuchte Eintrag wurde nicht gefunden.",
  validation_failed: "Die Eingabe ist unvollständig oder ungültig.",
  file_too_large: "Die Datei ist zu groß. Erlaubt sind maximal 10 MB.",
  unsupported_file_type:
    "Dieses Dateiformat wird nicht unterstützt. Möglich sind PDF, JPG und PNG.",
  pdf_unreadable:
    "Das PDF konnte nicht gelesen werden. Bitte versuche es mit einem Foto oder Scan der Seiten.",
  ocr_failed:
    "Der Text im Dokument konnte nicht erkannt werden. Bitte lade ein schärferes Foto oder ein PDF hoch.",
  ai_unavailable:
    "Die Analyse ist derzeit nicht erreichbar. Das Dokument ist gespeichert - du kannst die Analyse später erneut starten.",
  ai_invalid_output:
    "Die Analyse hat kein verwertbares Ergebnis geliefert. Bitte starte die Analyse erneut.",
  storage_failed: "Die Datei konnte nicht gespeichert werden. Bitte versuche es erneut.",
  database_failed: "Die Daten konnten nicht gespeichert werden. Bitte versuche es erneut.",
  not_configured:
    "Die Anwendung ist noch nicht vollständig konfiguriert. Bitte prüfe die Umgebungsvariablen.",
  unknown: "Es ist ein unerwarteter Fehler aufgetreten. Bitte versuche es erneut.",
};

export class AppError extends Error {
  readonly code: AppErrorCode;
  /** Meldung, die dem Nutzer gezeigt werden darf. */
  readonly userMessage: string;
  readonly status: number;

  constructor(code: AppErrorCode, userMessage?: string, options?: { cause?: unknown }) {
    super(userMessage ?? USER_MESSAGES[code], options as ErrorOptions);
    this.name = "AppError";
    this.code = code;
    this.userMessage = userMessage ?? USER_MESSAGES[code];
    this.status = statusForCode(code);
  }
}

function statusForCode(code: AppErrorCode): number {
  switch (code) {
    case "unauthorized":
      return 401;
    case "not_found":
      return 404;
    case "validation_failed":
      return 422;
    case "file_too_large":
      return 413;
    case "unsupported_file_type":
      return 415;
    case "ai_unavailable":
      return 503;
    case "not_configured":
      return 500;
    default:
      return 500;
  }
}

export function userMessageFor(code: AppErrorCode): string {
  return USER_MESSAGES[code];
}

/** Uebersetzt beliebige Fehler in eine nutzersichere Meldung. */
export function toUserMessage(error: unknown): string {
  if (error instanceof AppError) return error.userMessage;
  return USER_MESSAGES.unknown;
}

export interface ActionResult<T = undefined> {
  ok: boolean;
  data?: T;
  error?: { code: AppErrorCode; message: string };
}

export function ok<T>(data?: T): ActionResult<T> {
  return { ok: true, data };
}

export function fail(error: unknown): ActionResult<never> {
  const code = error instanceof AppError ? error.code : "unknown";
  return { ok: false, error: { code, message: toUserMessage(error) } };
}
