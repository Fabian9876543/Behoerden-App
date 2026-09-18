import "server-only";

import { requestStructured } from "@/lib/ai/claude";
import { buildLetterContext, type LetterContext } from "@/lib/ai/letter-context";
import { letterIntentLabel } from "@/lib/ai/letter-intents";
import { LETTER_SYSTEM, letterInstruction } from "@/lib/ai/prompts";
import { letterDraftSchema, type LetterDraft } from "@/lib/ai/schemas";

export { LETTER_INTENTS, isLetterIntent, letterIntentLabel } from "@/lib/ai/letter-intents";
export { buildLetterContext } from "@/lib/ai/letter-context";
export type { LetterContext } from "@/lib/ai/letter-context";

export async function generateLetterDraft(params: {
  context: LetterContext;
  intent: string;
  userNote: string | null;
}): Promise<{ draft: LetterDraft; model: string }> {
  const contextBlock = buildLetterContext(params.context);
  const intentLabel = letterIntentLabel(params.intent);

  const result = await requestStructured({
    system: LETTER_SYSTEM,
    blocks: [{ kind: "text", text: contextBlock }],
    instruction: letterInstruction({ intent: intentLabel, userNote: params.userNote }),
    schema: letterDraftSchema,
    maxTokens: 4_000,
    effort: "medium",
  });

  return { draft: result.data, model: result.model };
}
