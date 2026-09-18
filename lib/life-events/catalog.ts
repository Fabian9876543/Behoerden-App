import type { LifeEventDefinition } from "@/lib/life-events/types";

/**
 * Katalog der Lebenslagen.
 *
 * Neue Lebenslagen werden hier ergänzt - ohne Codeänderung. Regeln für
 * Einträge:
 *
 *  - Nur Pflichten aufnehmen, die belegbar sind. Im Zweifel als Hinweis
 *    formulieren statt als Pflicht.
 *  - `deadline` nur setzen, wenn es eine benennbare Frist gibt. "Unverzüglich"
 *    ist keine Frist mit Datum und gehört in die Beschreibung.
 *  - `officialUrl` nur bei bundesweit eindeutigen Quellen. Örtliche Ämter
 *    haben keine - dort bleibt das Feld leer, und die Oberfläche verweist auf
 *    die eigene Gemeinde.
 */

const UMZUG: LifeEventDefinition = {
  key: "umzug",
  title: "Ich ziehe um",
  subtitle: "Ummelden, Fristen und wer sonst noch Bescheid wissen muss",
  intro:
    "Ein Umzug betrifft mehr Stellen als nur das Bürgeramt. Beantworte ein paar Fragen, "
    + "und du bekommst eine Liste mit allem, was für deine Situation ansteht - mit Fristen, "
    + "benötigten Unterlagen und dem Ort, an dem du es abgibst.",
  localNote:
    "Welche Unterlagen genau verlangt werden und ob du einen Termin brauchst, "
    + "regelt jede Gemeinde selbst. Prüfe das vor dem Weg zum Amt auf der Website "
    + "deiner neuen Gemeinde.",
  questions: [
    {
      key: "moveDate",
      type: "date",
      label: "Wann ziehst du ein?",
      help: "Das Einzugsdatum bestimmt die Fristen.",
      required: true,
    },
    {
      key: "newCity",
      type: "text",
      label: "Wohin ziehst du?",
      placeholder: "z.B. Leipzig",
      help: "Nur für den Titel des Vorgangs.",
    },
    {
      key: "sameMunicipality",
      type: "boolean",
      label: "Der Umzug bleibt innerhalb derselben Gemeinde",
    },
    { key: "hasVehicle", type: "boolean", label: "Auf mich ist ein Fahrzeug zugelassen" },
    { key: "hasChildren", type: "boolean", label: "Kinder ziehen mit um" },
    {
      key: "receivesBenefits",
      type: "boolean",
      label: "Ich beziehe Bürgergeld, Wohngeld oder eine ähnliche Leistung",
    },
    {
      key: "hasResidencePermit",
      type: "boolean",
      label: "Ich habe einen Aufenthaltstitel",
    },
  ],
  steps: [
    {
      key: "zusicherung_jobcenter",
      title: "Vor der Unterschrift: Zusicherung beim Jobcenter einholen",
      description:
        "Wer Bürgergeld bezieht, sollte dem Jobcenter den geplanten Umzug vor Abschluss des "
        + "Mietvertrags mitteilen und sich die Übernahme der neuen Wohnkosten zusichern lassen. "
        + "Ohne vorherige Zusicherung kann es passieren, dass höhere Kosten nicht übernommen werden.",
      where: "Dein Jobcenter - schriftlich oder bei der zuständigen Sachbearbeitung",
      authorityKey: "jobcenter",
      required: true,
      showIf: ["receivesBenefits"],
      documents: [
        { name: "Angebot oder Exposé der neuen Wohnung", description: "Mit Miete und Nebenkosten." },
        { name: "Begründung für den Umzug" },
      ],
      deadline: {
        relativeTo: "moveDate",
        offsetDays: -30,
        title: "Zusicherung für die neue Wohnung einholen",
      },
      note: "Je früher, desto besser - die Bearbeitung dauert oft mehrere Wochen.",
      officialUrl: "https://www.arbeitsagentur.de/arbeitslos-arbeit-finden/buergergeld",
    },
    {
      key: "wohnungsgeberbestaetigung",
      title: "Wohnungsgeberbestätigung besorgen",
      description:
        "Die vermietende Person muss den Einzug schriftlich bestätigen. Ohne diese Bestätigung "
        + "kann das Bürgeramt dich nicht anmelden - besorge sie deshalb rechtzeitig.",
      where: "Von deiner Vermieterin oder deinem Vermieter",
      required: true,
      documents: [{ name: "Wohnungsgeberbestätigung" }],
      deadline: {
        relativeTo: "moveDate",
        offsetDays: 7,
        title: "Wohnungsgeberbestätigung vorliegen haben",
        legalBasis: "§ 19 BMG",
      },
    },
    {
      key: "anmeldung_buergeramt",
      title: "Wohnsitz beim Bürgeramt anmelden",
      description:
        "Die Anmeldung beim Bürgeramt ist der zentrale Schritt. Von dort werden viele weitere "
        + "Stellen automatisch informiert - unter anderem das Finanzamt.",
      where:
        "Bürgeramt, Bürgerbüro oder Einwohnermeldeamt deiner neuen Gemeinde. "
        + "In vielen Städten nur mit Termin.",
      authorityKey: "buergeramt",
      required: true,
      documents: [
        { name: "Personalausweis oder Reisepass", description: "Für alle Personen, die mit umziehen." },
        { name: "Wohnungsgeberbestätigung" },
        { name: "Ausgefülltes Anmeldeformular", description: "Gibt es meist auf der Website der Gemeinde." },
      ],
      deadline: {
        relativeTo: "moveDate",
        offsetDays: 14,
        title: "Wohnsitz anmelden",
        legalBasis: "§ 17 Abs. 1 BMG: innerhalb von zwei Wochen nach dem Einzug",
      },
      note:
        "Termine sind in großen Städten oft Wochen im Voraus ausgebucht. Vereinbare den Termin, "
        + "sobald das Einzugsdatum feststeht - die Frist läuft trotzdem.",
    },
    {
      key: "kfz_ummelden",
      title: "Fahrzeug ummelden",
      description:
        "Die Anschrift in der Zulassungsbescheinigung Teil I muss nach dem Umzug geändert werden. "
        + "Das Kennzeichen darfst du dabei behalten.",
      where: "Kfz-Zulassungsstelle deiner neuen Gemeinde",
      authorityKey: "kfz_zulassungsstelle",
      required: true,
      showIf: ["hasVehicle"],
      documents: [
        { name: "Zulassungsbescheinigung Teil I" },
        { name: "Zulassungsbescheinigung Teil II", description: "Wird nicht überall verlangt." },
        { name: "Personalausweis" },
      ],
      note:
        "Kümmere dich zeitnah darum - eine feste Anzahl Tage gibt das Gesetz nicht vor, "
        + "verlangt die Änderung aber unverzüglich.",
    },
    {
      key: "rundfunkbeitrag",
      title: "Rundfunkbeitrag ummelden",
      description:
        "Melde die neue Wohnung beim Beitragsservice. Wenn du mit jemandem zusammenziehst, "
        + "der bereits zahlt, meldest du deine alte Wohnung ab - pro Wohnung wird nur einmal gezahlt.",
      where: "Online beim ARD ZDF Deutschlandradio Beitragsservice",
      authorityKey: "rundfunkbeitrag",
      required: true,
      officialUrl: "https://www.rundfunkbeitrag.de",
    },
    {
      key: "krankenkasse",
      title: "Krankenkasse über die neue Anschrift informieren",
      description:
        "Eine kurze Mitteilung genügt. Wichtig, damit Bescheide und Karten dich weiter erreichen.",
      where: "Deine Krankenkasse - meist online oder telefonisch",
      authorityKey: "krankenkasse",
      required: true,
    },
    {
      key: "aenderung_leistungen",
      title: "Laufende Leistungen ummelden",
      description:
        "Teile die neue Anschrift und die neuen Wohnkosten mit. Bei Bürgergeld und Wohngeld "
        + "ändert sich mit der Miete auch die Höhe der Leistung.",
      where: "Jobcenter bzw. Wohngeldstelle - schriftlich",
      authorityKey: "jobcenter",
      required: true,
      showIf: ["receivesBenefits"],
      documents: [
        { name: "Neuer Mietvertrag" },
        { name: "Nachweis der Kosten der Unterkunft" },
      ],
      deadline: {
        relativeTo: "moveDate",
        offsetDays: 14,
        title: "Änderung der Anschrift und Wohnkosten mitteilen",
      },
    },
    {
      key: "familienkasse",
      title: "Familienkasse informieren",
      description:
        "Damit das Kindergeld ohne Unterbrechung weiterläuft, braucht die Familienkasse "
        + "deine neue Anschrift.",
      where: "Familienkasse der Bundesagentur für Arbeit",
      authorityKey: "familienkasse",
      required: true,
      showIf: ["hasChildren"],
      officialUrl: "https://www.arbeitsagentur.de/familie-und-kinder",
    },
    {
      key: "kita_schule",
      title: "Kita- oder Schulplatz klären",
      description:
        "Melde die Kinder an der neuen Schule an bzw. kümmere dich um einen Kita-Platz. "
        + "In vielen Gemeinden gibt es Anmeldefristen und Wartelisten.",
      where: "Schulamt oder Kita-Platzvergabe deiner neuen Gemeinde",
      required: true,
      showIf: ["hasChildren"],
      note: "Kümmere dich so früh wie möglich darum - Plätze sind oft knapp.",
    },
    {
      key: "auslaenderbehoerde",
      title: "Ausländerbehörde über den Umzug informieren",
      description:
        "Die Anmeldung beim Bürgeramt ersetzt das nicht überall. Frage bei der für dich "
        + "zuständigen Ausländerbehörde nach, ob die Anschrift im Aufenthaltstitel "
        + "geändert werden muss.",
      where: "Ausländerbehörde - bei einem Ortswechsel die der neuen Gemeinde",
      authorityKey: "auslaenderbehoerde",
      required: true,
      showIf: ["hasResidencePermit"],
      documents: [{ name: "Aufenthaltstitel" }, { name: "Meldebestätigung der neuen Anschrift" }],
    },
    {
      key: "nachsendeauftrag",
      title: "Nachsendeauftrag einrichten",
      description:
        "Damit Post an die alte Anschrift dich weiter erreicht - gerade in den Wochen, in denen "
        + "noch nicht alle Stellen umgemeldet sind.",
      where: "Deutsche Post - ein privates Unternehmen, keine Behörde. Kostenpflichtig.",
      required: false,
    },
    {
      key: "weitere_stellen",
      title: "Übrige Stellen informieren",
      description:
        "Arbeitgeber, Bank, Versicherungen, Strom- und Internetanbieter, Vereine. "
        + "Keine Behörden, aber genau hier geht erfahrungsgemäß Post verloren.",
      where: "Jeweils direkt beim Anbieter",
      required: false,
    },
  ],
};

const GEBURT: LifeEventDefinition = {
  key: "geburt",
  title: "Wir haben ein Kind bekommen",
  subtitle: "Geburtsurkunde, Kindergeld, Elterngeld und Krankenversicherung",
  intro:
    "Nach einer Geburt laufen mehrere Anträge parallel, und einige davon haben knappe Fristen. "
    + "Beantworte ein paar Fragen, und du bekommst die Schritte in sinnvoller Reihenfolge.",
  localNote:
    "Viele Geburtskliniken übernehmen die Anmeldung beim Standesamt. Frag dort nach, "
    + "bevor du selbst einen Termin machst.",
  questions: [
    {
      key: "birthDate",
      type: "date",
      label: "Wann wurde das Kind geboren?",
      help: "Bestimmt die Fristen für Elterngeld und Anmeldung.",
      required: true,
    },
    { key: "childName", type: "text", label: "Vorname des Kindes", placeholder: "z.B. Lena" },
    { key: "unmarried", type: "boolean", label: "Die Eltern sind nicht miteinander verheiratet" },
  ],
  steps: [
    {
      key: "standesamt",
      title: "Geburt beim Standesamt anzeigen und Urkunden holen",
      description:
        "Die Geburtsurkunde brauchst du für fast alle weiteren Anträge. Bestelle gleich mehrere "
        + "beglaubigte Ausfertigungen - Kindergeld und Elterngeld verlangen jeweils eigene.",
      where: "Standesamt am Geburtsort - oft übernimmt die Klinik die Anzeige",
      required: true,
      documents: [
        { name: "Personalausweise beider Eltern" },
        { name: "Geburtsbescheinigung der Klinik" },
        { name: "Eheurkunde oder Geburtsurkunden der Eltern" },
      ],
      deadline: {
        relativeTo: "birthDate",
        offsetDays: 7,
        title: "Geburt beim Standesamt anzeigen",
        legalBasis: "§ 18 PStG: innerhalb einer Woche",
      },
    },
    {
      key: "vaterschaft",
      title: "Vaterschaft anerkennen und Sorgerecht klären",
      description:
        "Sind die Eltern nicht verheiratet, entsteht das gemeinsame Sorgerecht nicht automatisch. "
        + "Beides lässt sich gemeinsam beim Jugendamt oder Standesamt erklären - auch schon vor der Geburt.",
      where: "Jugendamt oder Standesamt",
      required: true,
      showIf: ["unmarried"],
      documents: [{ name: "Personalausweise beider Eltern" }, { name: "Geburtsurkunde des Kindes" }],
    },
    {
      key: "krankenkasse_kind",
      title: "Kind bei der Krankenkasse anmelden",
      description:
        "Das Kind wird in der Regel beitragsfrei mitversichert. Melde es zügig an, damit "
        + "Arztbesuche abgerechnet werden können.",
      where: "Krankenkasse eines Elternteils",
      authorityKey: "krankenkasse",
      required: true,
      documents: [{ name: "Geburtsurkunde des Kindes" }],
    },
    {
      key: "kindergeld",
      title: "Kindergeld beantragen",
      description:
        "Der Antrag geht an die Familienkasse. Kindergeld wird rückwirkend nur für einen "
        + "begrenzten Zeitraum gezahlt - stelle den Antrag deshalb früh.",
      where: "Familienkasse der Bundesagentur für Arbeit",
      authorityKey: "familienkasse",
      required: true,
      forms: ["Antrag auf Kindergeld"],
      documents: [{ name: "Geburtsurkunde des Kindes", description: "Ausfertigung für Kindergeld." }],
      deadline: {
        relativeTo: "birthDate",
        offsetDays: 60,
        title: "Kindergeldantrag stellen",
      },
      officialUrl: "https://www.arbeitsagentur.de/familie-und-kinder",
    },
    {
      key: "elterngeld",
      title: "Elterngeld beantragen",
      description:
        "Elterngeld wird rückwirkend höchstens für die letzten drei Lebensmonate des Kindes "
        + "gezahlt. Wer später beantragt, verliert die davor liegenden Monate.",
      where: "Elterngeldstelle deines Bundeslandes",
      authorityKey: "elterngeldstelle",
      required: true,
      documents: [
        { name: "Geburtsurkunde des Kindes", description: "Ausfertigung für Elterngeld." },
        { name: "Einkommensnachweise der letzten zwölf Monate" },
        { name: "Bescheinigung über Mutterschaftsleistungen" },
      ],
      deadline: {
        relativeTo: "birthDate",
        offsetDays: 90,
        title: "Elterngeldantrag stellen",
      },
      note: "Der Antrag ist umfangreich. Fang früh an, die Einkommensnachweise zu sammeln.",
    },
  ],
};

export const LIFE_EVENTS: readonly LifeEventDefinition[] = [UMZUG, GEBURT] as const;

export function getLifeEvent(key: string): LifeEventDefinition | null {
  return LIFE_EVENTS.find((event) => event.key === key) ?? null;
}
