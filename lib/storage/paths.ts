import { extensionFor, type SupportedMimeType } from "@/lib/documents/mime";

/**
 * Pfadschema für Behördenunterlagen im Storage.
 *
 * Bewusst frei von I/O, damit es überall - auch im Test - nutzbar ist.
 * Das zweite Segment ist die User-ID; genau darauf stützt sich die
 * Storage-Policy in supabase/migrations.
 */
export function buildStoragePath(params: {
  userId: string;
  caseId: string;
  documentId: string;
  mimeType: SupportedMimeType;
}): string {
  return `users/${params.userId}/cases/${params.caseId}/documents/${params.documentId}.${extensionFor(
    params.mimeType,
  )}`;
}

/** Liefert die im Pfad enthaltene User-ID, oder null bei fremdem Schema. */
export function userIdFromStoragePath(path: string): string | null {
  const segments = path.split("/");
  if (segments[0] !== "users" || !segments[1]) return null;
  return segments[1];
}

/** Prefix, unter dem alle Dateien eines Nutzers liegen. */
export function userStoragePrefix(userId: string): string {
  return `users/${userId}/cases`;
}
