import { z } from "zod";

export type CapabilityReasoning = "none" | "low" | "medium";

export type CapabilityPrompt = {
  instructions: string;
  input: string;
};

export type CapabilityDefinition<I = unknown, O = unknown> = {
  id: string;
  version: number;
  description: string;
  inputSchema: z.ZodType<I>;
  outputSchema: z.ZodType<O>;
  outputName: string;
  reasoning: CapabilityReasoning;
  limits: {
    maxOutputTokens: number;
  };
  allowedApps: readonly string[];
  buildPrompt(input: I): CapabilityPrompt;
};

export function defineCapability<I, O>(
  definition: CapabilityDefinition<I, O>
): CapabilityDefinition<I, O> {
  if (!/^[a-z][a-z0-9-]*(\.[a-z][a-zA-Z0-9-]*)+$/.test(definition.id)) {
    throw new Error(`Invalid capability id: ${definition.id}`);
  }

  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(definition.outputName)) {
    throw new Error(`Invalid structured output name: ${definition.outputName}`);
  }

  if (!Number.isInteger(definition.version) || definition.version < 1) {
    throw new Error(`Invalid capability version for ${definition.id}`);
  }

  if (
    !Number.isInteger(definition.limits.maxOutputTokens) ||
    definition.limits.maxOutputTokens < 1
  ) {
    throw new Error(`Invalid maxOutputTokens for ${definition.id}`);
  }

  if (definition.allowedApps.length === 0) {
    throw new Error(`Capability ${definition.id} must declare at least one intended caller`);
  }

  return definition;
}

export type AnyCapabilityDefinition = CapabilityDefinition<any, any>;
