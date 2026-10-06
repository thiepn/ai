import { ZodError } from "zod";
import {
  runEnvelopeSchema,
  type RunFailure,
  type RunSuccess
} from "./contracts.js";
import { AiServiceError, failureBody, normalizeUnknownError } from "./errors.js";
import { createRequestId } from "./request-id.js";
import { capabilityRegistry } from "../capabilities/index.js";
import type { CapabilityRegistry } from "./registry.js";
import { runLuna, type LunaRequest, type LunaResult } from "../providers/luna.js";

export type ModelRunner = (request: LunaRequest) => Promise<LunaResult>;

export type ExecuteDependencies = {
  runModel: ModelRunner;
  registry: CapabilityRegistry;
};

const defaultDependencies: ExecuteDependencies = {
  runModel: runLuna,
  registry: capabilityRegistry
};

export async function executeRun(
  rawRequest: unknown,
  dependencies: ExecuteDependencies = defaultDependencies
): Promise<{
  status: number;
  body: RunSuccess<unknown> | RunFailure;
}> {
  let requestId = createRequestId();

  try {
    const envelope = runEnvelopeSchema.parse(rawRequest);
    requestId = createRequestId(envelope.requestId);

    const capability = dependencies.registry.get(envelope.capability);

    if (!capability) {
      throw new AiServiceError(
        "UNKNOWN_CAPABILITY",
        "Unknown capability.",
        404
      );
    }

    const inputResult = capability.inputSchema.safeParse(envelope.input);

    if (!inputResult.success) {
      throw new AiServiceError(
        "INVALID_INPUT",
        "Input did not match the capability schema.",
        400,
        { cause: inputResult.error }
      );
    }

    const prompt = capability.buildPrompt(inputResult.data);

    const modelResult = await dependencies.runModel({
      instructions: prompt.instructions,
      input: prompt.input,
      reasoning: capability.reasoning,
      maxOutputTokens: capability.limits.maxOutputTokens,
      outputName: capability.outputName,
      outputSchema: capability.outputSchema
    });

    const outputResult = capability.outputSchema.safeParse(modelResult.output);

    if (!outputResult.success) {
      throw new AiServiceError(
        "INVALID_MODEL_OUTPUT",
        "The model output did not match the capability schema.",
        502,
        { cause: outputResult.error }
      );
    }

    return {
      status: 200,
      body: {
        ok: true,
        data: outputResult.data,
        meta: {
          capability: capability.id,
          version: capability.version,
          requestId,
          model: modelResult.model
        }
      }
    };
  } catch (error) {
    const normalized =
      error instanceof ZodError
        ? new AiServiceError("INVALID_INPUT", "Request did not match the execution contract.", 400, {
            cause: error
          })
        : normalizeUnknownError(error);

    return {
      status: normalized.status,
      body: failureBody(normalized, requestId)
    };
  }
}
