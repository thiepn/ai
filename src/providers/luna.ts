import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import type { CapabilityReasoning } from "../core/capability.js";
import { AiServiceError, normalizeUnknownError } from "../core/errors.js";

export const LUNA_MODEL = "gpt-6-luna" as const;

export type LunaRequest = {
  instructions: string;
  input: string;
  reasoning: CapabilityReasoning;
  maxOutputTokens: number;
  outputName: string;
  outputSchema: z.ZodType;
};

export type LunaResult = {
  output: unknown;
  responseId: string;
  model: typeof LUNA_MODEL;
};

let client: OpenAI | undefined;

function getClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new AiServiceError(
      "INTERNAL_ERROR",
      "The AI provider is not configured.",
      500
    );
  }

  client ??= new OpenAI({ apiKey });
  return client;
}

function findRefusal(response: {
  output: Array<{
    type?: string;
    content?: Array<{ type?: string; refusal?: string }>;
  }>;
}): string | undefined {
  for (const item of response.output) {
    if (item.type !== "message" || !item.content) {
      continue;
    }

    for (const content of item.content) {
      if (content.type === "refusal" && content.refusal) {
        return content.refusal;
      }
    }
  }

  return undefined;
}

export async function runLuna(request: LunaRequest): Promise<LunaResult> {
  try {
    const response = await getClient().responses.parse({
      model: LUNA_MODEL,
      instructions: request.instructions,
      input: request.input,
      reasoning: {
        effort: request.reasoning
      },
      max_output_tokens: request.maxOutputTokens,
      text: {
        format: zodTextFormat(request.outputSchema, request.outputName)
      }
    });

    const refusal = findRefusal(response);

    if (refusal) {
      throw new AiServiceError(
        "MODEL_REFUSED",
        "The model refused the request.",
        422
      );
    }

    const parsed = request.outputSchema.safeParse(response.output_parsed);

    if (!parsed.success) {
      throw new AiServiceError(
        "INVALID_MODEL_OUTPUT",
        "The model output did not match the capability schema.",
        502
      );
    }

    return {
      output: parsed.data,
      responseId: response.id,
      model: LUNA_MODEL
    };
  } catch (error) {
    throw normalizeUnknownError(error);
  }
}
