/**
 * Baut ein echtes, mehrseitiges PDF mit Textlayer.
 *
 * Bewusst von Hand erzeugt statt als Binärdatei im Repository: So ist im
 * Test sichtbar, welcher Text auf welcher Seite steht - genau darauf stützt
 * sich die Seitenzuordnung der Quellenangaben.
 */
export function buildTestPdf(pages: string[][]): Uint8Array {
  const escape = (line: string) =>
    line.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

  const contents = pages.map((lines) =>
    lines
      .map((line, index) => `BT /F1 11 Tf 56 ${760 - index * 20} Td (${escape(line)}) Tj ET`)
      .join("\n"),
  );

  // Objektnummern: 1 Katalog, 2 Seitenbaum, dann je Seite ein Page- und ein
  // Content-Objekt, zuletzt die Schrift.
  const pageObjectNumbers = pages.map((_, index) => 3 + index * 2);
  const fontNumber = 3 + pages.length * 2;

  const objects: string[] = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Kids [${pageObjectNumbers
      .map((n) => `${n} 0 R`)
      .join(" ")}] /Count ${pages.length} >>`,
  ];

  pages.forEach((_, index) => {
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] ` +
        `/Resources << /Font << /F1 ${fontNumber} 0 R >> >> ` +
        `/Contents ${pageObjectNumbers[index]! + 1} 0 R >>`,
    );
    objects.push(
      `<< /Length ${contents[index]!.length} >>\nstream\n${contents[index]}\nendstream`,
    );
  });

  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((body, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return new Uint8Array(Buffer.from(pdf, "latin1"));
}

/** Der Beispielbrief aus der Produktspezifikation, zweiseitig. */
export const JOBCENTER_LETTER_PAGES: string[][] = [
  [
    "Jobcenter Musterstadt",
    "Aktenzeichen: 12345/2026",
    "Datum: 18.09.2026",
    "Weiterbewilligung Ihres Anspruchs auf Buergergeld",
    "Sehr geehrte Damen und Herren,",
    "reichen Sie den Weiterbewilligungsantrag bis zum 15.10.2026 ein.",
  ],
  [
    "Benoetigte Unterlagen:",
    "- Kontoauszuege der letzten drei Monate",
    "- Aktuelle Mietbescheinigung",
    "Mit freundlichen Gruessen",
  ],
];
