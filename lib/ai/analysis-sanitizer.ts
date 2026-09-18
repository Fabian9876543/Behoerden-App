import {
  capNullable,
  capText,
  TEXT_LIMITS,
  type DocumentAnalysis,
} from "@/lib/ai/schemas";

/**
 * Nachbearbeitung der Modellausgabe.
 *
 * Das Schema garantiert die Form, nicht die Plausibilität. Hier werden
 * offensichtlich unbrauchbare Angaben verworfen, statt sie dem Nutzer als
 * Tatsache zu zeigen - inklusive Hinweis in den Unsicherheitsnotizen.
 */
/**
 * Kürzt allen Fließtext auf die Speichergrenzen.
 *
 * Bewusst kürzen statt ablehnen: Ein paar Zeichen zu viel dürfen nicht dazu
 * führen, dass eine sonst gute Analyse samt aller Fristen verworfen wird.
 * Siehe TEXT_LIMITS in lib/ai/schemas.ts.
 */
function capAnalysisText(analysis: DocumentAnalysis): DocumentAnalysis {
  const L = TEXT_LIMITS;
  return {
    ...analysis,
    documentType: capText(analysis.documentType, L.documentType),
    authority: analysis.authority
      ? { ...analysis.authority, name: capText(analysis.authority.name, L.authorityName) }
      : null,
    caseType: capNullable(analysis.caseType, L.caseType),
    referenceNumber: capNullable(analysis.referenceNumber, L.referenceNumber),
    suggestedCaseTitle: capText(analysis.suggestedCaseTitle, L.caseTitle),
    summary: capText(analysis.summary, L.summary),
    deadlines: analysis.deadlines.map((deadline) => ({
      ...deadline,
      title: capText(deadline.title, L.title),
      description: capNullable(deadline.description, L.description),
      sourceText: capNullable(deadline.sourceText, L.sourceText),
    })),
    requiredActions: analysis.requiredActions.map((action) => ({
      ...action,
      title: capText(action.title, L.title),
      description: capNullable(action.description, L.description),
      sourceText: capNullable(action.sourceText, L.sourceText),
    })),
    requiredDocuments: analysis.requiredDocuments.map((document) => ({
      ...document,
      name: capText(document.name, L.name),
      description: capNullable(document.description, L.description),
    })),
    mentionedForms: analysis.mentionedForms.map((form) => ({
      ...form,
      name: capText(form.name, L.name),
      formNumber: capNullable(form.formNumber, L.formNumber),
    })),
    importantTerms: analysis.importantTerms.map((term) => ({
      term: capText(term.term, L.term),
      explanation: capText(term.explanation, L.explanation),
    })),
    uncertaintyNotes: analysis.uncertaintyNotes.map((note) => capText(note, L.note)),
  };
}

export function sanitizeAnalysis(
  rawAnalysis: DocumentAnalysis,
  now: Date = new Date(),
): DocumentAnalysis {
  const analysis = capAnalysisText(rawAnalysis);
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
    uncertaintyNotes: [...new Set(notes)]
      .map((note) => capText(note, TEXT_LIMITS.note))
      .slice(0, 15),
  };
}
