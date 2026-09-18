import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";

/**
 * End-to-End: der zentrale Produkt-Loop.
 *
 *   Registrieren -> Onboarding -> Dokument hochladen -> Analyse
 *   -> Vorgang entsteht -> Aufgaben entstehen -> Frist erscheint
 *   -> Aufgabe abhaken -> Dokument löschen
 *
 * Voraussetzungen (siehe README, Abschnitt "Tests"):
 *   - laufende Supabase-Instanz mit angewendeten Migrationen
 *   - E-Mail-Bestätigung deaktiviert (supabase/config.toml)
 *   - gesetzter ANTHROPIC_API_KEY, damit die Analyse echt läuft
 *
 * Der Test nutzt eine echte PDF-Datei und eine echte Claude-Analyse -
 * er prüft den Flow, nicht eine bestimmte Formulierung der KI.
 */

const PASSWORD = "Test-Passwort-2026!";

/** Minimales, gültiges PDF mit dem Text eines Jobcenter-Schreibens. */
function buildTestPdf(): Buffer {
  const lines = [
    "Jobcenter Musterstadt",
    "Aktenzeichen: E2E-12345/2026",
    "Datum: 18.09.2026",
    "Weiterbewilligung Ihres Anspruchs auf Bürgergeld",
    "Sehr geehrte Damen und Herren,",
    "Ihr Bewilligungszeitraum endet am 31.10.2026. Bitte reichen Sie den",
    "Weiterbewilligungsantrag bis zum 15.10.2026 bei uns ein.",
    "Benötigte Unterlagen: Kontoauszüge der letzten drei Monate sowie",
    "eine aktuelle Mietbescheinigung.",
    "Mit freundlichen Grüßen",
  ];

  const textOps = lines
    .map((line, index) => {
      const escaped = line.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
      return `BT /F1 11 Tf 56 ${760 - index * 20} Td (${escaped}) Tj ET`;
    })
    .join("\n");

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${textOps.length} >>\nstream\n${textOps}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];

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

  return Buffer.from(pdf, "latin1");
}

async function registerAndOnboard(page: Page): Promise<void> {
  const email = `e2e-${randomUUID()}@example.test`;

  await page.goto("/register");
  await page.getByLabel("E-Mail-Adresse").fill(email);
  await page.getByLabel("Passwort").fill(PASSWORD);
  await page.getByRole("button", { name: "Konto erstellen" }).click();

  await expect(
    page.getByRole("heading", { name: /Wie möchtest du Behördenpost verwalten/i }),
  ).toBeVisible({ timeout: 30_000 });

  await page.getByText("Nur für mich").click();
  await page.getByRole("button", { name: /Weiter zum Dashboard/i }).click();

  await expect(page.getByRole("heading", { name: /Guten (Morgen|Tag|Abend)/ })).toBeVisible({
    timeout: 30_000,
  });
}

test.describe("Zentraler Produkt-Loop", () => {
  test("Registrierung, Upload, Analyse, Vorgang, Aufgaben und Frist", async ({ page }) => {
    test.slow(); // Die echte Dokumentanalyse braucht Zeit.

    await registerAndOnboard(page);

    // --- Upload -----------------------------------------------------------
    await page.setInputFiles('input[type="file"]', {
      name: "jobcenter-schreiben.pdf",
      mimeType: "application/pdf",
      buffer: buildTestPdf(),
    });

    // Der Fortschritt muss nachvollziehbar sein.
    await expect(page.getByText("Datei gespeichert")).toBeVisible({ timeout: 60_000 });

    // --- Vorgang ----------------------------------------------------------
    await page.waitForURL(/\/cases\/[0-9a-f-]{36}/, { timeout: 180_000 });

    // Die wichtigste UX-Regel: Es steht sofort da, was zu tun ist.
    await expect(page.getByRole("heading", { name: "Das musst du jetzt tun" })).toBeVisible();

    // --- Aufgaben ---------------------------------------------------------
    const tasksSection = page.locator("section", { has: page.getByRole("heading", { name: "Aufgaben" }) });
    const checkboxes = tasksSection.getByRole("checkbox");
    await expect(checkboxes.first()).toBeVisible({ timeout: 30_000 });
    const taskCount = await checkboxes.count();
    expect(taskCount).toBeGreaterThan(0);

    // --- Frist ------------------------------------------------------------
    const deadlinesSection = page.locator("section", {
      has: page.getByRole("heading", { name: "Fristen" }),
    });
    await expect(deadlinesSection.getByText(/15\.10\.2026/)).toBeVisible({ timeout: 30_000 });

    // --- Quellenanzeige ---------------------------------------------------
    await expect(page.getByText(/Quelle:/).first()).toBeVisible();

    // --- Aufgabe abhaken --------------------------------------------------
    await checkboxes.first().click();
    await expect(checkboxes.first()).toBeChecked();

    // --- Dashboard zeigt den Vorgang --------------------------------------
    await page.goto("/dashboard");
    await expect(page.getByRole("link", { name: /Vorgang öffnen/ }).first()).toBeVisible();

    // --- Frist erscheint in der Fristenliste -------------------------------
    await page.goto("/deadlines");
    await expect(page.getByText(/15\.10\.2026/).first()).toBeVisible();

    // --- Dokument löschen ------------------------------------------------
    await page.goto("/documents");
    await page.getByRole("button", { name: /löschen/i }).first().click();
    await expect(page.getByText("jobcenter-schreiben.pdf")).toBeHidden({ timeout: 30_000 });
  });

  test("lehnt ein nicht unterstütztes Dateiformat verständlich ab", async ({ page }) => {
    await registerAndOnboard(page);

    await page.setInputFiles('input[type="file"]', {
      name: "tabelle.csv",
      mimeType: "text/csv",
      buffer: Buffer.from("a,b,c\n1,2,3\n"),
    });

    await expect(page.getByText(/Dateiformat wird nicht unterstützt/i)).toBeVisible({
      timeout: 20_000,
    });
  });

  test("schützt App-Routen vor nicht angemeldeten Besuchern", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });
});
