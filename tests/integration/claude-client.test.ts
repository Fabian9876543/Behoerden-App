import { createServer, type Server } from "node:http";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { AppErrorCode } from "@/lib/errors";
import { makeAnalysis } from "../fixtures/analysis";

/**
 * Prüft den Claude-Zugang gegen einen lokalen Fake der Messages-API.
 *
 * Die Fehlerpfade sind im Betrieb am wichtigsten und am seltensten erprobt:
 * Was sieht die nutzende Person, wenn die API ausfällt, der Schlüssel falsch
 * ist, das Modell ablehnt oder eine Antwort liefert, die nicht zum Schema
 * passt? Der Test läuft ohne Zugangsdaten und ohne Netz, benutzt aber das
 * echte SDK - nur der Server ist ersetzt.
 */

type Responder = (body: string) => { status: number; json: unknown };

let server: Server;
let baseUrl = "";
let respond: Responder = () => ({ status: 200, json: {} });
let requestCount = 0;

/** Antwort der Messages-API mit einem Textblock, der das JSON trägt. */
function messageWith(payload: unknown, stopReason = "end_turn") {
  return {
    id: "msg_test",
    type: "message",
    role: "assistant",
    model: "claude-opus-5",
    content: [{ type: "text", text: JSON.stringify(payload) }],
    stop_reason: stopReason,
    stop_sequence: null,
    usage: { input_tokens: 1200, output_tokens: 340 },
  };
}

beforeAll(async () => {
  server = createServer((request, response) => {
    requestCount += 1;
    const chunks: Buffer[] = [];
    request.on("data", (chunk: Buffer) => chunks.push(chunk));
    request.on("end", () => {
      const { status, json } = respond(Buffer.concat(chunks).toString("utf8"));
      response.writeHead(status, { "content-type": "application/json" });
      response.end(JSON.stringify(json));
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (typeof address === "string" || address === null) throw new Error("Kein Port");
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterAll(() => {
  server.close();
});

afterEach(() => {
  requestCount = 0;
});

/** Lädt den Claude-Service frisch, damit der zwischengespeicherte Client neu entsteht. */
async function loadClaude() {
  vi.resetModules();
  process.env.ANTHROPIC_API_KEY = "sk-ant-test";
  process.env.ANTHROPIC_BASE_URL = baseUrl;
  return import("@/lib/ai/claude");
}

async function expectAppError(run: () => Promise<unknown>, code: AppErrorCode) {
  await expect(run()).rejects.toMatchObject({ name: "AppError", code });
}

async function analyze() {
  const { requestStructured } = await loadClaude();
  const { documentAnalysisSchema } = await import("@/lib/ai/schemas");
  return requestStructured({
    system: "Systemprompt",
    blocks: [{ kind: "text", text: "Dokumenttext" }],
    instruction: "Analysiere das Dokument.",
    schema: documentAnalysisSchema,
  });
}

describe("requestStructured", () => {
  it("liefert die geparste Analyse und die Tokenzahlen", async () => {
    const analysis = makeAnalysis();
    respond = () => ({ status: 200, json: messageWith(analysis) });

    const result = await analyze();

    expect(result.data.suggestedCaseTitle).toBe(analysis.suggestedCaseTitle);
    expect(result.data.deadlines[0]?.date).toBe("2026-10-15");
    expect(result.inputTokens).toBe(1200);
    expect(result.outputTokens).toBe(340);
  });

  it("schickt ein strict-JSON-Schema und das Dokument mit", async () => {
    let sent: Record<string, unknown> = {};
    respond = (body) => {
      sent = JSON.parse(body) as Record<string, unknown>;
      return { status: 200, json: messageWith(makeAnalysis()) };
    };

    await analyze();

    const outputConfig = sent.output_config as { format?: { type?: string } };
    expect(outputConfig.format?.type).toBe("json_schema");
    expect(JSON.stringify(sent.messages)).toContain("Dokumenttext");
    expect(sent.system).toBe("Systemprompt");
  });

  it("meldet eine Antwort, die nicht zum Schema passt, als Schemafehler", async () => {
    // Nicht als Ausfall: Die Person soll die Analyse erneut starten,
    // nicht auf einen Dienst warten, der gar nicht gestört ist.
    respond = () => ({ status: 200, json: messageWith({ documentType: "Bescheid" }) });
    await expectAppError(analyze, "ai_invalid_output");
  });

  it("meldet ungültiges JSON als Schemafehler", async () => {
    respond = () => ({
      status: 200,
      json: {
        ...messageWith({}),
        content: [{ type: "text", text: "Das ist kein JSON." }],
      },
    });
    await expectAppError(analyze, "ai_invalid_output");
  });

  it("behandelt eine Ablehnung des Modells als Schemafehler", async () => {
    respond = () => ({ status: 200, json: messageWith(makeAnalysis(), "refusal") });
    await expectAppError(analyze, "ai_invalid_output");
  });

  it("meldet eine Antwort ohne Textblock als Schemafehler", async () => {
    respond = () => ({ status: 200, json: { ...messageWith({}), content: [] } });
    await expectAppError(analyze, "ai_invalid_output");
  });

  it("erklärt eine abgeschnittene Antwort statt sie als Ausfall zu melden", async () => {
    respond = () => ({
      status: 200,
      json: messageWith(makeAnalysis(), "max_tokens"),
    });
    await expect(analyze()).rejects.toMatchObject({
      code: "ai_invalid_output",
      userMessage: expect.stringContaining("zu umfangreich"),
    });
  });

  it("meldet einen abgelehnten Schlüssel als Konfigurationsfehler", async () => {
    respond = () => ({
      status: 401,
      json: { type: "error", error: { type: "authentication_error", message: "invalid key" } },
    });
    await expectAppError(analyze, "not_configured");
    // Ein falscher Schlüssel wird nicht wiederholt.
    expect(requestCount).toBe(1);
  });

  it("meldet einen Serverfehler als vorübergehende Störung", async () => {
    respond = () => ({
      status: 500,
      json: { type: "error", error: { type: "api_error", message: "boom" } },
    });
    await expectAppError(analyze, "ai_unavailable");
    // Serverfehler werden vom SDK wiederholt, bevor aufgegeben wird.
    expect(requestCount).toBeGreaterThan(1);
  });

  it("meldet eine überschrittene Ratenbegrenzung als vorübergehende Störung", async () => {
    respond = () => ({
      status: 429,
      json: { type: "error", error: { type: "rate_limit_error", message: "slow down" } },
    });
    await expectAppError(analyze, "ai_unavailable");
  });
});

describe("requestText", () => {
  async function ocr() {
    const { requestText } = await loadClaude();
    return requestText({
      system: "OCR",
      blocks: [{ kind: "image", base64: "AAAA", mediaType: "image/png" }],
      instruction: "Gib den Text wieder.",
    });
  }

  it("fügt alle Textblöcke zusammen", async () => {
    respond = () => ({
      status: 200,
      json: {
        ...messageWith({}),
        content: [
          { type: "text", text: "--- Seite 1 ---\nZeile A" },
          { type: "text", text: "Zeile B" },
        ],
      },
    });

    await expect(ocr()).resolves.toBe("--- Seite 1 ---\nZeile A\nZeile B");
  });

  it("behandelt eine Ablehnung als fehlgeschlagene Texterkennung", async () => {
    respond = () => ({
      status: 200,
      json: { ...messageWith({}), content: [], stop_reason: "refusal" },
    });
    await expectAppError(ocr, "ocr_failed");
  });

  it("meldet einen Ausfall als vorübergehende Störung", async () => {
    respond = () => ({
      status: 503,
      json: { type: "error", error: { type: "overloaded_error", message: "overloaded" } },
    });
    await expectAppError(ocr, "ai_unavailable");
  });
});
