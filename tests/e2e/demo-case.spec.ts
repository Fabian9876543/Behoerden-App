import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";

/**
 * Der Demo-Vorgang macht die App ohne eigenen Brief und ohne Claude-Key
 * erlebbar. Er muss klar als Demo erkennbar sein.
 */
test("Demo-Vorgang anlegen und öffnen", async ({ page }) => {
  const email = `demo-${randomUUID()}@example.test`;

  await page.goto("/register");
  await page.getByLabel("E-Mail-Adresse").fill(email);
  await page.getByLabel("Passwort").fill("Test-Passwort-2026!");
  await page.getByRole("button", { name: "Konto erstellen" }).click();

  await page.getByText("Nur für mich").click();
  await page.getByRole("button", { name: /Weiter zum Dashboard/i }).click();

  await page.getByRole("button", { name: /Beispiel-Vorgang ansehen/i }).click();
  await page.waitForURL(/\/cases\/[0-9a-f-]{36}/, { timeout: 60_000 });

  await expect(page.getByRole("heading", { name: /Weiterbewilligung Bürgergeld/ })).toBeVisible();
  await expect(page.getByText("Demo").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Das musst du jetzt tun" })).toBeVisible();
  await expect(page.getByText(/15\.10\.2026/).first()).toBeVisible();

  // Drei Aufgaben, zwei benötigte Unterlagen, ein Formular.
  const tasksSection = page.locator("section", {
    has: page.getByRole("heading", { name: "Aufgaben" }),
  });
  await expect(tasksSection.getByRole("checkbox")).toHaveCount(3);
  await expect(page.getByText("Kontoauszüge der letzten drei Monate")).toHaveCount(2);
  await expect(page.getByText("Weiterbewilligungsantrag Bürgergeld")).toBeVisible();
});
