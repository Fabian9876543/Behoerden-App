import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { describe, expect, it } from "vitest";
import {
  documentAnalysisSchema,
  letterDraftSchema,
  TEXT_LIMITS,
  type DocumentAnalysis,
} from "@/lib/ai/schemas";
import { sanitizeAnalysis } from "@/lib/ai/analysis-sanitizer";
import { makeAnalysis } from "../fixtures/analysis";

const NOW = new Date("2026-09-18T10:00:00Z");

/**
 * Prüft die Schnittstelle zur strukturierten Claude-Ausgabe.
 *
 * Hier treffen zwei Dinge aufeinander, die unabhängig voneinander kaputtgehen
 * können: die Umwandlung des Zod-Schemas in ein JSON-Schema durch das SDK und
 * die Anforderungen von Structured Outputs an dieses Schema. Bricht eine der
 * beiden, schlägt jede Analyse fehl - darum wird beides hier festgenagelt.
 */

interface JsonSchemaNode {
  type?: string;
  properties?: Record<string, JsonSchemaNode>;
  required?: string[];
  additionalProperties?: boolean;
  [key: string]: unknown;
}

/** Sammelt Verstöße gegen die Strict-Regeln von Structured Outputs. */
function strictViolations(node: unknown, path = "root"): string[] {
  if (!node || typeof node !== "object") return [];
  const problems: string[] = [];
  const current = node as JsonSchemaNode;

  if (current.type === "object" && current.properties) {
    const properties = Object.keys(current.properties);
    const required = current.required ?? [];
    if (current.additionalProperties !== false) {
      problems.push(`${path}: additionalProperties ist nicht false`);
    }
    const missing = properties.filter((name) => !required.includes(name));
    if (missing.length > 0) {
      problems.push(`${path}: nicht als required markiert - ${missing.join(", ")}`);
    }
  }

  for (const [key, value] of Object.entries(current)) {
    if (Array.isArray(value)) {
      value.forEach((entry, index) => problems.push(...strictViolations(entry, `${path}.${key}[${index}]`)));
    } else if (value && typeof value === "object") {
      problems.push(...strictViolations(value, `${path}.${key}`));
    }
  }
  return problems;
}

describe("zodOutputFormat", () => {
  it("erzeugt aus dem Analyseschema ein JSON-Schema", () => {
    const format = zodOutputFormat(documentAnalysisSchema);
    expect(format.type).toBe("json_schema");
    expect(format.schema).toBeTypeOf("object");
  });

  it("erfüllt die Strict-Anforderungen von Structured Outputs", () => {
    // Jedes Objekt muss additionalProperties:false setzen und alle
    // Eigenschaften als required führen, sonst weist die API es zurück.
    expect(strictViolations(zodOutputFormat(documentAnalysisSchema).schema)).toEqual([]);
    expect(strictViolations(zodOutputFormat(letterDraftSchema).schema)).toEqual([]);
  });

  it("bildet nicht erkannte Felder als nullable ab", () => {
    const schema = zodOutputFormat(documentAnalysisSchema).schema as JsonSchemaNode;
    const authority = schema.properties?.authority as { anyOf?: JsonSchemaNode[] };
    // "anyOf: [..., null]" statt eines optionalen Feldes - so liefert das
    // Modell den Schlüssel immer und markiert Unbekanntes ausdrücklich.
    expect(authority.anyOf?.some((entry) => entry.type === "null")).toBe(true);
  });
});

describe("Arbeitsteilung Schema und Sanitizer", () => {
  const parse = (analysis: DocumentAnalysis) => documentAnalysisSchema.safeParse(analysis);

  it("das Schema lässt langen Fließtext durch - gekürzt wird später", () => {
    // Structured Outputs kann maxLength nicht erzwingen, und ein Transform im
    // Schema bricht die JSON-Schema-Umwandlung. Die Länge ist darum bewusst
    // keine Schemaregel.
    expect(parse(makeAnalysis({ summary: "A".repeat(5000) })).success).toBe(true);
  });

  it("der Sanitizer kürzt den Fließtext auf die Speichergrenze", () => {
    const result = sanitizeAnalysis(makeAnalysis({ summary: "A".repeat(5000) }), NOW);

    expect(result.summary).toHaveLength(TEXT_LIMITS.summary);
    // Entscheidend: Die Frist überlebt das Kürzen.
    expect(result.deadlines).toHaveLength(1);
    expect(result.deadlines[0]?.date).toBe("2026-10-15");
  });

  it("der Sanitizer kürzt auch Zitate und behält die Frist", () => {
    const result = sanitizeAnalysis(
      makeAnalysis({
        deadlines: [
          {
            date: "2026-10-15",
            title: "Frist",
            description: null,
            sourceText: "Z".repeat(900),
            page: 1,
            confidence: 0.9,
          },
        ],
      }),
      NOW,
    );

    expect(result.deadlines[0]?.sourceText).toHaveLength(TEXT_LIMITS.sourceText);
    expect(result.deadlines[0]?.date).toBe("2026-10-15");
  });

  it("der Sanitizer entfernt Randleerzeichen", () => {
    const result = sanitizeAnalysis(
      makeAnalysis({ suggestedCaseTitle: "   Weiterbewilligung   " }),
      NOW,
    );
    expect(result.suggestedCaseTitle).toBe("Weiterbewilligung");
  });

  it("aus einem nur aus Leerzeichen bestehenden Zitat wird null", () => {
    const result = sanitizeAnalysis(
      makeAnalysis({
        deadlines: [
          {
            date: "2026-10-15",
            title: "Frist",
            description: null,
            sourceText: "   ",
            page: 1,
            confidence: 0.9,
          },
        ],
      }),
      NOW,
    );
    expect(result.deadlines[0]?.sourceText).toBeNull();
  });

  it("lehnt ein leeres Pflichtfeld ab", () => {
    expect(parse(makeAnalysis({ summary: "" })).success).toBe(false);
    expect(parse(makeAnalysis({ summary: "   " })).success).toBe(false);
  });

  it("lehnt ein falsch formatiertes Datum ab", () => {
    // Bewusst streng: Ein unlesbares Datum darf nicht stillschweigend
    // durchrutschen - eine unterschlagene Frist ist der schlimmste Ausgang.
    const result = parse(
      makeAnalysis({
        deadlines: [
          {
            date: "15.10.2026",
            title: "Frist",
            description: null,
            sourceText: null,
            page: null,
            confidence: 0.9,
          },
        ],
      }),
    );
    expect(result.success).toBe(false);
  });

  it("lehnt eine überlange Fristenliste ab, statt still zu kürzen", () => {
    const deadline = {
      date: "2026-10-15",
      title: "Frist",
      description: null,
      sourceText: null,
      page: null,
      confidence: 0.9,
    };
    expect(parse(makeAnalysis({ deadlines: Array.from({ length: 25 }, () => deadline) })).success)
      .toBe(false);
  });
});
