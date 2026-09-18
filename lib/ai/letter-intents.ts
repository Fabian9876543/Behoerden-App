/**
 * Anliegen für Antwortschreiben.
 *
 * Bewusst frei von Server-Abhängigkeiten: Die Liste wird auch im Client
 * gebraucht (Auswahlfeld) und darf das Anthropic-SDK nicht mitziehen.
 */

export const LETTER_INTENTS = [
  {
    key: "unterlagen_nachreichen",
    label: "Unterlagen nachreichen",
    description: "Begleitschreiben zu Unterlagen, die du einreichst.",
  },
  {
    key: "fristverlängerung",
    label: "Fristverlängerung bitten",
    description: "Bitte um mehr Zeit, mit Begründung.",
  },
  {
    key: "rückfrage",
    label: "Rückfrage stellen",
    description: "Sachliche Nachfrage zu einem unklaren Punkt.",
  },
  {
    key: "sachverhalt_mitteilen",
    label: "Aenderung mitteilen",
    description: "Mitteilung einer Aenderung (Adresse, Einkommen, Situation).",
  },
  {
    key: "eingang_bestätigen",
    label: "Eingang bestätigen",
    description: "Kurze Bestätigung, dass du das Schreiben erhalten hast.",
  },
] as const;

export type LetterIntentKey = (typeof LETTER_INTENTS)[number]["key"];

export function isLetterIntent(value: string): value is LetterIntentKey {
  return LETTER_INTENTS.some((intent) => intent.key === value);
}

export function letterIntentLabel(key: string): string {
  return LETTER_INTENTS.find((intent) => intent.key === key)?.label ?? key;
}
