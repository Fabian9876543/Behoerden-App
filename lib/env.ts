import {
  DEFAULT_MAX_UPLOAD_BYTES,
  VERCEL_MAX_UPLOAD_BYTES,
} from "@/lib/documents/mime";

/**
 * Zentraler, validierter Zugriff auf Environment-Variablen.
 *
 * Serverseitige Keys werden bewusst über Funktionen ausgeliefert, damit sie
 * niemals versehentlich in ein Client-Bundle inlined werden.
 */

function required(name: string, value: string | undefined): string {
  if (!value || value.trim() === "") {
    throw new Error(
      `Konfigurationsfehler: Umgebungsvariable ${name} fehlt. ` +
        `Bitte .env.local anhand von .env.example ergänzen.`,
    );
  }
  return value;
}

/** Oeffentliche Werte - dürfen im Client landen. */
export const publicEnv = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
} as const;

export function requirePublicEnv() {
  return {
    supabaseUrl: required("NEXT_PUBLIC_SUPABASE_URL", publicEnv.supabaseUrl),
    supabaseAnonKey: required("NEXT_PUBLIC_SUPABASE_ANON_KEY", publicEnv.supabaseAnonKey),
    siteUrl: publicEnv.siteUrl,
  };
}

/** Nur serverseitig aufrufen. */
export function serverEnv() {
  if (typeof window !== "undefined") {
    throw new Error("serverEnv() darf nicht im Browser aufgerufen werden.");
  }
  return {
    anthropicApiKey: required("ANTHROPIC_API_KEY", process.env.ANTHROPIC_API_KEY),
    anthropicModel: process.env.ANTHROPIC_MODEL ?? "claude-opus-5",
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    maxUploadBytes: resolveMaxUploadBytes(),
  };
}

/**
 * Maximale Uploadgröße - auch ohne vollständige Serverkonfiguration lesbar.
 *
 * Ohne eigene Vorgabe richtet sie sich nach der Plattform: Auf Vercel gilt die
 * niedrigere Grenze, weil dort der Request-Body gedeckelt ist. Die Oberfläche
 * liest denselben Wert, damit sie keine Größe verspricht, die der Server
 * ablehnt.
 */
export function resolveMaxUploadBytes(): number {
  const platformDefault = process.env.VERCEL
    ? VERCEL_MAX_UPLOAD_BYTES
    : DEFAULT_MAX_UPLOAD_BYTES;

  const configured = process.env.MAX_UPLOAD_BYTES;
  if (!configured) return platformDefault;

  const value = Number(configured);
  return Number.isFinite(value) && value > 0 ? value : platformDefault;
}

/** Prüft ohne Exception, ob die KI-Integration konfiguriert ist. */
export function isAiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export const STORAGE_BUCKET = "case-documents";
