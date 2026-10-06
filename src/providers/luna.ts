import OpenAI from "openai";
import { AiServiceError, normalizeUnknownError } from "../core/errors.js";

export const LUNA_MODEL = "gpt-6-luna" as const;

export type LunaRequest = {
  instructions: string;
  input: string;
  reasoning?: "none" | "low" | "medium";
  maxOutputTokens: number;
};

export type LunaResult = {
  text: string;
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

export async function runLuna(request: LunaRequest): Promise<LunaResult> {
  try {
    const response = await getClient().responses.create({
      model: LUNA_MODEL,
      instructions: request.instructions,
      input: request.input,
      reasoning: {
        effort: request.reasoning ?? "low"
      },
      max_output_tokens: request.maxOutputTokens
    });

    const text = response.output_text?.trim();

    if (!text) {
      throw new AiServiceError(
        "INVALID_MODEL_OUTPUT",
        "The model returned no usable text.",
        502
      );
    }

    return {
      text,
      responseId: response.id,
      model: LUNA_MODEL
    };
  } catch (error) {
    throw normalizeUnknownError(error);
  }
}
