import { findForm, type FormLookupResult } from "@/lib/forms/catalog";
import type { MentionedForm } from "@/lib/ai/schemas";
import type { Profile } from "@/lib/types/database";

/**
 * Formularunterstuetzung.
 *
 * Im MVP keine freie Websuche: Ein von der KI genanntes Formular wird gegen
 * den hinterlegten Katalog aufgeloest. Gibt es keinen Treffer, wird das
 * Formular ohne Quelle gespeichert und in der UI als ungeprueft markiert.
 * Es wird niemals eine beliebige Drittquelle als offiziell dargestellt.
 */

export interface ResolvedForm extends FormLookupResult {
  /** Vom Dokument genannte Formularnummer, falls die KI eine gefunden hat. */
  mentionedFormNumber: string | null;
}

export function resolveForms(
  mentioned: MentionedForm[],
  authorityKey: string | null,
): ResolvedForm[] {
  const seen = new Set<string>();
  const resolved: ResolvedForm[] = [];

  for (const form of mentioned) {
    const key = form.name.toLowerCase().trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);

    const lookup = findForm(form.name, authorityKey);
    resolved.push({
      ...lookup,
      formNumber: lookup.formNumber ?? form.formNumber,
      mentionedFormNumber: form.formNumber,
    });
  }

  return resolved;
}

export interface PrefillField {
  label: string;
  value: string;
}

/**
 * Felder, die sich aus dem Profil vorbefuellen lassen.
 *
 * Vorbereitung fuer die spaetere Ausfuellhilfe: Die Anwendung fuellt
 * Formulare nie automatisch aus, sondern bietet die Werte zum Uebernehmen an.
 */
export function prefillFieldsFromProfile(profile: Profile | null): PrefillField[] {
  if (!profile) return [];
  const fields: PrefillField[] = [];
  const push = (label: string, value: string | null) => {
    if (value && value.trim()) fields.push({ label, value: value.trim() });
  };

  push("Vorname", profile.first_name);
  push("Nachname", profile.last_name);
  push("Strasse und Hausnummer", profile.street);
  push("Postleitzahl", profile.postal_code);
  push("Ort", profile.city);
  push("E-Mail", profile.email);
  push("Telefon", profile.phone);
  return fields;
}
