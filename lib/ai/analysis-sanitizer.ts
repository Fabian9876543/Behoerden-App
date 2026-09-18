import type { DocumentAnalysis } from "@/lib/ai/schemas";

/**
 * Nachbearbeitung der Modellausgabe.
 *
 * Das Schema garantiert die Form, nicht die Plausibilität. Hier werden
 * offensichtlich unbrauchbare Angaben verworfen, statt sie dem Nutzer als
 * Tatsache zu zeigen - inklusive Hinweis in den Unsicherheitsnotizen.
 */
export function sanitizeAnalysis(
  analysis: DocumentAnalysis,
  now: Date = new Date(),
): DocumentAnalysis {
  const notes = [...analysis.uncertaintyNotes];

  const currentYear = now.getUTCFullYear();
  const plausible = (iso: string): boolean => {
    const year = Number(iso.slice(0, 4));
    return year >= currentYear - 10 && year <= currentYear + 10;
  };

  const deadlines = analysis.deadlines.filter((deadline) => {
    if (plausible(deadline.date)) return true;
    notes.push(
      `Eine erkannte Frist (${deadline.date}) lag außerhalb eines plausiblen Zeitraums und wurde verworfen. Bitte prüfe das Dokument selbst.`,
    );
    return false;
  });

  const requiredActions = analysis.requiredActions.map((action) => {
    if (action.deadline && !plausible(action.deadline)) {
      notes.push(
        `Zur Aufgabe "${action.title}" wurde ein unplausibles Datum erkannt und entfernt.`,
      );
      return { ...action, deadline: null };
    }
    return action;
  });

  // Eine Behörde mit sehr niedriger Konfidenz gilt als nicht erkannt.
  let authority = analysis.authority;
  if (authority && authority.confidence < 0.3) {
    notes.push(
      "Die Behörde konnte nicht eindeutig erkannt werden. Bitte ergänze sie im Vorgang.",
    );
    authority = null;
  }

  if (!analysis.looksLikeAuthorityLetter) {
    notes.push(
      "Dieses Dokument wirkt nicht wie klassische Behördenpost. Bitte prüfe die Ergebnisse besonders sorgfältig.",
    );
  }

  return {
    ...analysis,
    authority,
    deadlines,
    requiredActions,
    uncertaintyNotes: [...new Set(notes)].slice(0, 15),
  };
}
