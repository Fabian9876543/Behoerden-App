/**
 * Minimales Logging.
 *
 * Datenschutz: Es werden ausschliesslich IDs, Zaehler und Fehlercodes
 * geloggt. Dokumentinhalte, extrahierter Text, Adressen und Namen duerfen
 * niemals in ein Log gelangen.
 */

type LogFields = Record<string, string | number | boolean | null | undefined>;

const FORBIDDEN_KEYS = [
  "text",
  "extracted_text",
  "extractedtext",
  "content",
  "body",
  "sourcetext",
  "source_text",
  "email",
  "firstname",
  "lastname",
  "street",
  "phone",
];

/** Entfernt Felder, die personenbezogene oder dokumentbezogene Inhalte tragen. */
function sanitize(fields: LogFields | undefined): LogFields {
  if (!fields) return {};
  const clean: LogFields = {};
  for (const [key, value] of Object.entries(fields)) {
    if (FORBIDDEN_KEYS.includes(key.toLowerCase())) {
      clean[key] = "[redacted]";
      continue;
    }
    if (typeof value === "string" && value.length > 120) {
      clean[key] = "[redacted:long-string]";
      continue;
    }
    clean[key] = value;
  }
  return clean;
}

function emit(level: "info" | "warn" | "error", event: string, fields?: LogFields) {
  const line = JSON.stringify({
    level,
    event,
    at: new Date().toISOString(),
    ...sanitize(fields),
  });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const log = {
  info: (event: string, fields?: LogFields) => emit("info", event, fields),
  warn: (event: string, fields?: LogFields) => emit("warn", event, fields),
  error: (event: string, fields?: LogFields) => emit("error", event, fields),
};

export const __testing = { sanitize };
