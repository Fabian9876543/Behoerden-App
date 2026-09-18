import type { DocumentAnalysis } from "@/lib/ai/schemas";

/** Eine vollstaendige, realistische Analyse - Basis fuer alle Tests. */
export function makeAnalysis(overrides: Partial<DocumentAnalysis> = {}): DocumentAnalysis {
  return {
    documentType: "Mitwirkungsaufforderung",
    authority: { name: "Jobcenter", confidence: 0.96 },
    caseType: "weiterbewilligung",
    referenceNumber: "12345/2026",
    documentDate: "2026-09-18",
    suggestedCaseTitle: "Weiterbewilligung Buergergeld",
    deadlines: [
      {
        date: "2026-10-15",
        title: "Weiterbewilligungsantrag einreichen",
        description: null,
        sourceText: "bis zum 15.10.2026 bei uns ein",
        page: 1,
        confidence: 0.94,
      },
    ],
    requiredActions: [
      {
        title: "Kontoauszuege der letzten drei Monate hochladen",
        description: null,
        deadline: "2026-10-15",
        required: true,
        sourceText: "Kontoauszuege der letzten drei Monate",
        page: 2,
        confidence: 0.92,
      },
      {
        title: "Mietbescheinigung beschaffen",
        description: null,
        deadline: null,
        required: true,
        sourceText: "Aktuelle Mietbescheinigung",
        page: 2,
        confidence: 0.88,
      },
      {
        title: "Kontaktdaten pruefen",
        description: null,
        deadline: null,
        required: false,
        sourceText: null,
        page: null,
        confidence: 0.5,
      },
    ],
    requiredDocuments: [
      { name: "Kontoauszuege", description: null, required: true },
      { name: "Mietbescheinigung", description: null, required: true },
    ],
    mentionedForms: [{ name: "Weiterbewilligungsantrag", formNumber: "WBA" }],
    importantTerms: [
      { term: "Bedarfsgemeinschaft", explanation: "Alle Personen im gemeinsamen Haushalt." },
    ],
    summary: "Das Jobcenter fordert Unterlagen zur Weiterbewilligung an.",
    uncertaintyNotes: [],
    looksLikeAuthorityLetter: true,
    ...overrides,
  };
}
