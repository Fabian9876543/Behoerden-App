import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";
import { serverEnv } from "@/lib/env";
import { AppError } from "@/lib/errors";
import { log } from "@/lib/logging";

/**
 * Zentraler Claude-Zugang.
 *
 * Alles, was mit der Anthropic-API spricht, läuft über diese Datei:
 * Client-Erzeugung, strukturierte Ausgaben, Fehlerübersetzung.
 * Prompts liegen in lib/ai/prompts.ts, nie in UI-Komponenten.
 */

let client: Anthropic | null = null;

export function getClaudeClient(): Anthropic {
  if (client) return client;
  const { anthropicApiKey } = serverEnv();
  client = new Anthropic({ apiKey: anthropicApiKey, maxRetries: 2 });
  return client;
}

export function getModel(): string {
  return serverEnv().anthropicModel;
}

/** Inhaltsblock eines Dokuments, das Claude analysieren soll. */
export type DocumentBlock =
  | { kind: "pdf"; base64: string }
  | { kind: "image"; base64: string; mediaType: "image/jpeg" | "image/png" }
  | { kind: "text"; text: string };

export interface StructuredRequest<TSchema extends z.ZodType> {
  system: string;
  /** Blocks in Reihenfolge - Dokument zuerst, dann die Anweisung. */
  blocks: DocumentBlock[];
  instruction: string;
  schema: TSchema;
  maxTokens?: number;
  /** "low" | "medium" | "high" - steuert Tiefe und Kosten. */
  effort?: "low" | "medium" | "high";
}

export interface StructuredResponse<T> {
  data: T;
  model: string;
  inputTokens: number | null;
  outputTokens: number | null;
}

function toContentBlock(block: DocumentBlock): Anthropic.ContentBlockParam {
  switch (block.kind) {
    case "pdf":
      return {
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: block.base64 },
      };
    case "image":
      return {
        type: "image",
        source: { type: "base64", media_type: block.mediaType, data: block.base64 },
      };
    case "text":
      return { type: "text", text: block.text };
  }
}

/**
 * Führt einen Claude-Aufruf mit erzwungenem JSON-Schema aus.
 *
 * Wirft AppError("ai_unavailable") bei Transport-/API-Problemen und
 * AppError("ai_invalid_output"), wenn die Antwort nicht gegen das Schema
 * validiert. Es wird niemals ein teilweise geparstes Ergebnis zurückgegeben.
 */
export async function requestStructured<TSchema extends z.ZodType>(
  request: StructuredRequest<TSchema>,
): Promise<StructuredResponse<z.infer<TSchema>>> {
  const anthropic = getClaudeClient();
  const model = getModel();

  const content: Anthropic.ContentBlockParam[] = [
    ...request.blocks.map(toContentBlock),
    { type: "text", text: request.instruction },
  ];

  try {
    const response = await anthropic.messages.parse({
      model,
      max_tokens: request.maxTokens ?? 16_000,
      system: request.system,
      messages: [{ role: "user", content }],
      output_config: {
        effort: request.effort ?? "medium",
        format: zodOutputFormat(request.schema),
      },
    });

    if (response.stop_reason === "refusal") {
      throw new AppError(
        "ai_invalid_output",
        "Die Analyse wurde für dieses Dokument abgelehnt. Bitte prüfe den Inhalt und versuche es erneut.",
      );
    }

    const parsed: unknown = response.parsed_output;
    if (parsed === null || parsed === undefined) {
      log.warn("claude_output_schema_mismatch", {
        model,
        stopReason: response.stop_reason ?? null,
      });
      throw new AppError("ai_invalid_output");
    }

    // Zweite, eigene Validierung: Wir vertrauen der Modellausgabe nie ungeprüft.
    const validated = request.schema.safeParse(parsed);
    if (!validated.success) {
      log.warn("claude_output_zod_mismatch", { model, issues: validated.error.issues.length });
      throw new AppError("ai_invalid_output");
    }

    return {
      data: validated.data as z.infer<TSchema>,
      model,
      inputTokens: response.usage?.input_tokens ?? null,
      outputTokens: response.usage?.output_tokens ?? null,
    };
  } catch (error) {
    if (error instanceof AppError) throw error;

    // Bewusst nur Fehlerklasse loggen - niemals Prompt oder Dokumentinhalt.
    log.error("claude_request_failed", {
      model,
      errorName: error instanceof Error ? error.name : "unknown",
      status: error instanceof Anthropic.APIError ? error.status : null,
    });

    if (error instanceof Anthropic.AuthenticationError) {
      throw new AppError(
        "not_configured",
        "Der Claude-API-Schlüssel wurde nicht akzeptiert. Bitte ANTHROPIC_API_KEY prüfen.",
        { cause: error },
      );
    }
    throw new AppError("ai_unavailable", undefined, { cause: error });
  }
}

/** Freitextantwort - nur für OCR, wo es kein sinnvolles Schema gibt. */
export async function requestText(params: {
  system: string;
  blocks: DocumentBlock[];
  instruction: string;
  maxTokens?: number;
}): Promise<string> {
  const anthropic = getClaudeClient();
  const model = getModel();

  try {
    const response = await anthropic.messages.create({
      model,
      max_tokens: params.maxTokens ?? 16_000,
      system: params.system,
      messages: [
        {
          role: "user",
          content: [
            ...params.blocks.map(toContentBlock),
            { type: "text", text: params.instruction },
          ],
        },
      ],
    });

    if (response.stop_reason === "refusal") {
      throw new AppError("ocr_failed");
    }

    return response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("\n")
      .trim();
  } catch (error) {
    if (error instanceof AppError) throw error;
    log.error("claude_text_request_failed", {
      model,
      errorName: error instanceof Error ? error.name : "unknown",
      status: error instanceof Anthropic.APIError ? error.status : null,
    });
    throw new AppError("ai_unavailable", undefined, { cause: error });
  }
}
