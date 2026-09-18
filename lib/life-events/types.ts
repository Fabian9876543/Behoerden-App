/**
 * Lebenslagen.
 *
 * Der zweite Einstieg ins Case-Management: Statt auf einen Brief zu
 * reagieren, nennt die Person ihre Situation ("Ich ziehe um") und bekommt
 * daraus einen Vorgang mit Aufgaben, Fristen, benötigten Unterlagen und
 * Formularen.
 *
 * Die Schritte stammen bewusst aus einem gepflegten Katalog und nicht aus
 * einem Modellaufruf. Bei "Was muss ich wo abgeben?" wären erfundene
 * Pflichten oder Quellen der schlimmste Fehler - und genau das schließt die
 * Produktregel aus. Ein Katalog ist dafür nachvollziehbar, testbar und
 * funktioniert ohne KI.
 */

export type QuestionType = "date" | "text" | "boolean";

export interface LifeEventQuestion {
  key: string;
  type: QuestionType;
  label: string;
  /** Erklärung unter dem Feld. */
  help?: string;
  placeholder?: string;
  required?: boolean;
}

export interface StepDeadline {
  /** Schlüssel der Datumsfrage, auf die sich die Frist bezieht. */
  relativeTo: string;
  /** Tage nach dem Bezugsdatum; negativ bedeutet davor. */
  offsetDays: number;
  title: string;
  /** Rechtsgrundlage, sofern es eine klare gibt. Sonst weglassen. */
  legalBasis?: string;
}

export interface LifeEventStep {
  key: string;
  title: string;
  /** Was konkret zu tun ist. */
  description: string;
  /** Wo es abgegeben bzw. erledigt wird. */
  where: string;
  /** Schlüssel aus lib/authorities/registry, falls es eine Behörde ist. */
  authorityKey?: string;
  required: boolean;
  /** Schritt nur zeigen, wenn alle genannten Ja/Nein-Fragen "ja" sind. */
  showIf?: string[];
  /** Mitzubringende oder beizulegende Unterlagen. */
  documents?: { name: string; description?: string }[];
  /** Formularnamen; werden über den Formularkatalog aufgelöst. */
  forms?: string[];
  deadline?: StepDeadline;
  /** Praktischer Hinweis, der nicht in die Beschreibung gehört. */
  note?: string;
  /**
   * Offizielle Quelle. Nur setzen, wenn es eine bundesweit eindeutige gibt -
   * örtliche Ämter haben keine, und eine erfundene URL wäre schlimmer als
   * gar keine.
   */
  officialUrl?: string;
}

export interface LifeEventDefinition {
  key: string;
  title: string;
  /** Eine Zeile, die die Lebenslage beschreibt. */
  subtitle: string;
  /** Wird der Person vor dem Ausfüllen gezeigt. */
  intro: string;
  questions: LifeEventQuestion[];
  steps: LifeEventStep[];
  /** Hinweis, dass örtliche Regeln abweichen können. */
  localNote: string;
}

export type LifeEventAnswers = Record<string, string | boolean | undefined>;
