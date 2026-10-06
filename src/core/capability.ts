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
    maxInputTokens: number;
    maxOutputTokens: number;
    requestsPerMinute?: number;
    requestsPerDay?: number;
  };
  allowedApps: readonly string[];
  buildPrompt(input: I): CapabilityPrompt;
};

function assertPositiveInteger(
  value: number | undefined,
  name: string,
  capabilityId: string
): void {
  if (
    value !== undefined &&
    (!Number.isInteger(value) || value < 1)
  ) {
    throw new Error(`Invalid ${name} for ${capabilityId}`);
  }
}

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

  assertPositiveInteger(
    definition.limits.maxInputTokens,
    "maxInputTokens",
    definition.id
  );
  assertPositiveInteger(
    definition.limits.maxOutputTokens,
    "maxOutputTokens",
    definition.id
  );
  assertPositiveInteger(
    definition.limits.requestsPerMinute,
    "requestsPerMinute",
    definition.id
  );
  assertPositiveInteger(
    definition.limits.requestsPerDay,
    "requestsPerDay",
    definition.id
  );

  if (definition.allowedApps.length === 0) {
    throw new Error(
      `Capability ${definition.id} must declare at least one intended caller`
    );
  }

  return definition;
}

export type AnyCapabilityDefinition = CapabilityDefinition<any, any>;
