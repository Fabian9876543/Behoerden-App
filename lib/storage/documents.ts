import "server-only";

import { STORAGE_BUCKET } from "@/lib/env";
import { AppError } from "@/lib/errors";
import { log } from "@/lib/logging";
import type { SupportedMimeType } from "@/lib/documents/mime";
import { userStoragePrefix } from "@/lib/storage/paths";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export { buildStoragePath, userIdFromStoragePath } from "@/lib/storage/paths";

/**
 * Storage-Zugriff fuer Behoerdenunterlagen.
 *
 * Pfadschema: users/{userId}/cases/{caseId}/documents/{documentId}.{ext}
 * Der Bucket ist privat; Downloads laufen ausschliesslich ueber kurzlebige
 * signierte URLs.
 */

export async function uploadDocument(params: {
  path: string;
  bytes: Uint8Array;
  mimeType: SupportedMimeType;
}): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(params.path, params.bytes, {
      contentType: params.mimeType,
      upsert: false,
    });

  if (error) {
    log.error("storage_upload_failed", { message: error.message });
    throw new AppError("storage_failed", undefined, { cause: error });
  }
}

export async function downloadDocument(path: string): Promise<Uint8Array> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.storage.from(STORAGE_BUCKET).download(path);

  if (error || !data) {
    log.error("storage_download_failed", { message: error?.message ?? "no data" });
    throw new AppError("storage_failed", undefined, { cause: error });
  }

  return new Uint8Array(await data.arrayBuffer());
}

/** Kurzlebige signierte URL (Standard: 5 Minuten). */
export async function createSignedUrl(path: string, expiresInSeconds = 300): Promise<string> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(path, expiresInSeconds);

  if (error || !data?.signedUrl) {
    log.error("storage_sign_failed", { message: error?.message ?? "no url" });
    throw new AppError("storage_failed", undefined, { cause: error });
  }
  return data.signedUrl;
}

export async function deleteDocuments(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.storage.from(STORAGE_BUCKET).remove(paths);
  if (error) {
    // Nicht fatal: Der Datenbankeintrag ist bereits weg, die Datei bleibt
    // durch die Storage-Policy fuer alle anderen unzugaenglich.
    log.warn("storage_delete_failed", { count: paths.length, message: error.message });
  }
}

/** Entfernt alle Dateien eines Nutzers - fuer "Alle meine Daten loeschen". */
export async function deleteAllUserFiles(userId: string): Promise<number> {
  const supabase = await createSupabaseServerClient();
  const prefix = userStoragePrefix(userId);

  const { data: caseFolders, error } = await supabase.storage.from(STORAGE_BUCKET).list(prefix);
  if (error) {
    log.warn("storage_list_failed", { message: error.message });
    return 0;
  }

  const paths: string[] = [];
  for (const folder of caseFolders ?? []) {
    const documentsPrefix = `${prefix}/${folder.name}/documents`;
    const { data: files } = await supabase.storage.from(STORAGE_BUCKET).list(documentsPrefix);
    for (const file of files ?? []) {
      paths.push(`${documentsPrefix}/${file.name}`);
    }
  }

  await deleteDocuments(paths);
  return paths.length;
}
