import { createServer, type Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { extractPdfPages } from "@/lib/documents/pdf";
import { joinPages } from "@/lib/documents/text";
import { generateCaseShape } from "@/lib/ai/task-generation";
import { matchAuthorityKey } from "@/lib/authorities/registry";
import { resolveForms } from "@/lib/ai/form-assistance";
import { buildTestPdf, JOBCENTER_LETTER_PAGES } from "../fixtures/pdf";
import { makeAnalysis } from "../fixtures/analysis";

/**
 * Der Produkt-Loop bis zur Persistenz, an einem Stück.
 *
 *   echtes PDF -> Textextraktion -> Claude-Analyse -> Bereinigung
 *   -> Aufgaben, Fristen, Status, Priorität, Formulare
 *
 * Nur der Modellaufruf ist durch einen lokalen Server ersetzt; alles andere
 * ist der Produktionscode. Was danach kommt - das Schreiben in die Datenbank -
 * deckt supabase/tests/rls.sql ab.
 */

const NOW = new Date("2026-09-18T10:00:00Z");

let server: Server;
let baseUrl = "";
let lastRequest: Record<string, unknown> = {};
let reply: unknown = null;

beforeAll(async () => {
  server = createServer((request, response) => {
    const chunks: Buffer[] = [];
    request.on("data", (chunk: Buffer) => chunks.push(chunk));
    request.on("end", () => {
      lastRequest = JSON.parse(Buffer.concat(chunks).toString("utf8")) as Record<string, unknown>;
      response.writeHead(200, { "content-type": "application/json" });
      response.end(
        JSON.stringify({
          id: "msg_test",
          type: "message",
          role: "assistant",
          model: "claude-opus-5",
          content: [{ type: "text", text: JSON.stringify(reply) }],
          stop_reason: "end_turn",
          usage: { input_tokens: 2400, output_tokens: 620 },
        }),
      );
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (typeof address === "string" || address === null) throw new Error("Kein Port");
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterAll(() => server.close());

async function runAnalysis(params: {
  text: string;
  bytes?: Uint8Array;
  mimeType?: "application/pdf" | "image/png";
}) {
  vi.resetModules();
  process.env.ANTHROPIC_API_KEY = "sk-ant-test";
  process.env.ANTHROPIC_BASE_URL = baseUrl;
  const { analyzeDocument } = await import("@/lib/ai/document-analysis");
  return analyzeDocument({
    fileName: "jobcenter-schreiben.pdf",
    mimeType: params.mimeType ?? "application/pdf",
    text: params.text,
    bytes: params.bytes,
    now: NOW,
  });
}

/** Inhaltsblöcke der letzten Anfrage. */
function sentBlocks(): { type: string; text?: string }[] {
  const messages = lastRequest.messages as { content: { type: string; text?: string }[] }[];
  return messages[0]!.content;
}

describe("Produkt-Loop vom PDF bis zum Vorgang", () => {
  it("führt ein echtes PDF bis zum fertigen Vorgang", async () => {
    reply = makeAnalysis();

    const extraction = await extractPdfPages(buildTestPdf(JOBCENTER_LETTER_PAGES));
    const text = joinPages(extraction.pages);
    const { analysis, inputTokens } = await runAnalysis({ text });

    // Der extrahierte Text ist wirklich beim Modell angekommen.
    const textBlock = sentBlocks().find((block) => block.text?.includes("Dokumenttext"));
    expect(textBlock?.text).toContain("15.10.2026");
    expect(textBlock?.text).toContain("--- Seite 2 ---");
    expect(inputTokens).toBe(2400);

    const shape = generateCaseShape(analysis, NOW);
    const authorityKey = matchAuthorityKey(analysis.authority?.name);
    const forms = resolveForms(analysis.mentionedForms, authorityKey);

    expect(authorityKey).toBe("jobcenter");
    expect(shape.status).toBe("action_required");
    expect(shape.deadlines).toHaveLength(1);
    expect(shape.deadlines[0]?.dueDate).toBe("2026-10-15");
    expect(shape.tasks).toHaveLength(3);
    expect(shape.tasks[0]?.isRequired).toBe(true);
    expect(forms[0]?.sourceKind).toBe("official_catalog");
  });

  it("nennt dem Modell das heutige Datum und den Dateinamen", async () => {
    reply = makeAnalysis();
    await runAnalysis({ text: "--- Seite 1 ---\nEin Schreiben mit ausreichend Text. ".repeat(20) });

    const instruction = sentBlocks().at(-1)?.text ?? "";
    // Ohne Bezugsdatum kann das Modell relative Fristen nicht umrechnen.
    expect(instruction).toContain("2026-09-18");
    expect(instruction).toContain("jobcenter-schreiben.pdf");
  });

  // Zwei Schwellen greifen hier ineinander, mit verschiedenen Aufgaben:
  // hasUsableText() entscheidet, ob überhaupt OCR nötig ist; die Schwelle in
  // analyzeDocument entscheidet, ob der Text allein reicht oder das Original
  // mitgeschickt wird. Ein dünner, aber vorhandener Textlayer heißt also:
  // keine OCR, aber das Modell sieht zusätzlich die Datei.
  it("schickt bei umfangreichem Text nur den Text, nicht die Datei", async () => {
    reply = makeAnalysis();
    const bytes = buildTestPdf(JOBCENTER_LETTER_PAGES);
    const text = `--- Seite 1 ---\n${"Sehr geehrte Damen und Herren, ".repeat(40)}`;

    await runAnalysis({ text, bytes });

    // Spart Tokens und Kosten, solange der Text vollständig vorliegt.
    expect(sentBlocks().some((block) => block.type === "document")).toBe(false);
  });

  it("schickt bei dünnem Textlayer zusätzlich das Original", async () => {
    reply = makeAnalysis();
    const bytes = buildTestPdf(JOBCENTER_LETTER_PAGES);

    // Wenig Text heißt: Der Extraktion ist nicht zu trauen, das Modell soll
    // das Original sehen können.
    await runAnalysis({ text: "Jobcenter", bytes });

    expect(sentBlocks().some((block) => block.type === "document")).toBe(true);
  });

  it("schickt ein kurzes, aber vollständig gelesenes Schreiben mitsamt Original", async () => {
    reply = makeAnalysis();
    const bytes = buildTestPdf(JOBCENTER_LETTER_PAGES);
    const extraction = await extractPdfPages(bytes);

    await runAnalysis({ text: joinPages(extraction.pages), bytes });

    // Der Beispielbrief ist kurz. Lieber einmal zu viel das Original
    // mitschicken, als bei einer knappen Aufforderung eine Frist zu übersehen.
    expect(sentBlocks().some((block) => block.type === "document")).toBe(true);
  });

  it("schickt ein Foto als Bild, nicht als Dokument", async () => {
    reply = makeAnalysis();
    await runAnalysis({
      text: "unleserlich",
      bytes: new Uint8Array([0x89, 0x50, 0x4e, 0x47]),
      mimeType: "image/png",
    });

    const blocks = sentBlocks();
    expect(blocks.some((block) => block.type === "image")).toBe(true);
    expect(blocks.some((block) => block.type === "document")).toBe(false);
  });

  it("bereinigt die Modellausgabe, bevor daraus ein Vorgang wird", async () => {
    // Unplausible Frist und zu unsichere Behörde in einer Antwort.
    reply = makeAnalysis({
      authority: { name: "Irgendetwas", confidence: 0.1 },
      deadlines: [
        {
          date: "1999-01-01",
          title: "Uralte Frist",
          description: null,
          sourceText: null,
          page: null,
          confidence: 0.9,
        },
      ],
    });

    const { analysis } = await runAnalysis({ text: "Ein Schreiben. ".repeat(50) });

    expect(analysis.deadlines).toHaveLength(0);
    expect(analysis.authority).toBeNull();
    expect(analysis.uncertaintyNotes.join(" ")).toContain("1999-01-01");

    const shape = generateCaseShape(analysis, NOW);
    expect(shape.deadlines).toHaveLength(0);
  });
});

describe("Zusammenspiel der beiden Einstiege", () => {
  // Beide Wege - hochgeladener Brief und geplante Lebenslage - münden im
  // selben Vorgang. Die Analyse kennt aber immer nur das eine Schreiben,
  // nicht das Vorhaben dahinter. Diese Regeln halten das auseinander.

  it("die Analyse liefert einen Titelvorschlag, überschreibt aber nichts selbst", async () => {
    reply = makeAnalysis({ suggestedCaseTitle: "Anmeldung Wohnsitz" });
    const { analysis } = await runAnalysis({ text: "Ein Schreiben. ".repeat(50) });

    // Ob der Vorschlag genommen wird, entscheidet die Pipeline anhand des
    // bestehenden Vorgangs - nicht die Analyse.
    expect(analysis.suggestedCaseTitle).toBe("Anmeldung Wohnsitz");
  });

  it("Aufgaben aus einem Brief tragen dieselbe Form wie Schritte aus einer Lebenslage", async () => {
    reply = makeAnalysis();
    const { analysis } = await runAnalysis({ text: "Ein Schreiben. ".repeat(50) });
    const shape = generateCaseShape(analysis, NOW);

    // Beide erzeugen Aufgaben mit Titel, Pflichtkennzeichen und Position -
    // deshalb lassen sie sich in einem Vorgang mischen.
    for (const task of shape.tasks) {
      expect(typeof task.title).toBe("string");
      expect(typeof task.isRequired).toBe("boolean");
      expect(typeof task.position).toBe("number");
    }
  });
});
