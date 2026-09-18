import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Nahtstelle zwischen den beiden Einstiegen.
 *
 * Ein Vorgang kann aus einer Lebenslage entstehen ("Ich ziehe um") und
 * später ein Schreiben dazubekommen ("Post vom Bürgeramt"). Die Analyse
 * dieses Schreibens darf den Vorgang dann ergänzen, aber nicht umbenennen -
 * sie kennt nur den einen Brief, nicht das Vorhaben dahinter.
 *
 * Geprüft wird am Quelltext, weil die Pipeline ohne Supabase nicht läuft.
 * Der Verhaltenstest dazu liegt in supabase/tests/rls.sql und im E2E-Lauf.
 */

const pipeline = readFileSync(
  join(process.cwd(), "lib", "db", "analysis-pipeline.ts"),
  "utf8",
);

describe("Dokument in einen bestehenden Vorgang", () => {
  it("liest den Vorgang, bevor es ihn ändert", () => {
    expect(pipeline).toContain("const existing = await requireCase(caseId, userId)");
  });

  it("ersetzt den Titel nur, solange er der Platzhalter ist", () => {
    expect(pipeline).toContain("PLACEHOLDER_CASE_TITLE");
    expect(pipeline).toMatch(/isPlaceholder \? \{ title: analysis\.suggestedCaseTitle \}/);
  });

  it.each([
    ["authority_name", /existing\.authority_name[\s\S]{0,120}authority_name: analysis\.authority/],
    ["case_type", /existing\.case_type \? \{\} : \{ case_type: analysis\.caseType \}/],
    ["reference_number", /existing\.reference_number \? \{\} : \{ reference_number:/],
    ["summary", /existing\.summary \? \{\} : \{ summary: analysis\.summary \}/],
  ])("überschreibt %s nur, wenn das Feld noch leer ist", (_field, pattern) => {
    expect(pipeline).toMatch(pattern);
  });

  it("behält die höhere Priorität, statt sie herabzustufen", () => {
    expect(pipeline).toContain("CASE_PRIORITY_ORDER");
    expect(pipeline).toMatch(/CASE_PRIORITY_ORDER\[shape\.priority\] >\s*CASE_PRIORITY_ORDER\[existing\.priority\]/);
  });

  it("leitet den Status aus allen Aufgaben ab, nicht nur aus den neuen", () => {
    // generateCaseShape kennt nur die Aufgaben aus diesem Dokument. Ein
    // Vorgang aus einer Lebenslage hat daneben eigene offene Schritte.
    expect(pipeline).toContain("await refreshCaseStatus(caseId)");
    expect(pipeline).not.toMatch(/status: shape\.status/);
  });
});

describe("Upload-Ziel", () => {
  const action = readFileSync(join(process.cwd(), "app", "actions", "documents.ts"), "utf8");
  const dropzone = readFileSync(
    join(process.cwd(), "components", "documents", "upload-dropzone.tsx"),
    "utf8",
  );

  it("nimmt eine Vorgangs-ID entgegen und prüft sie", () => {
    expect(action).toContain("uploadMetadataSchema");
    expect(action).toContain("requireCase(metadata.data.caseId, user.id)");
  });

  it("legt nur ohne Zuordnung einen neuen Vorgang an", () => {
    expect(action).toContain("PLACEHOLDER_CASE_TITLE");
  });

  it("lässt in der Oberfläche einen bestehenden Vorgang wählen", () => {
    expect(dropzone).toContain("openCases");
    expect(dropzone).toContain("Neuer Vorgang");
  });
});
