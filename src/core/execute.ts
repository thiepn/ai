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
import type { GuardrailManager } from "../guardrails/manager.js";

export type ModelRunner = (request: LunaRequest) => Promise<LunaResult>;

export type ExecuteContext = {
  appId: string;
};

export type ExecuteDependencies = {
  runModel: ModelRunner;
  registry: CapabilityRegistry;
  guardrails: GuardrailManager;
};

export async function executeRun(
  rawRequest: unknown,
  context: ExecuteContext,
  dependencies: ExecuteDependencies
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

    if (!capability.allowedApps.includes(context.appId)) {
      throw new AiServiceError(
        "FORBIDDEN",
        "Application is not allowed to use this capability.",
        403
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

    const reservation =
      await dependencies.guardrails.beforeModelCall({
        appId: context.appId,
        capability,
        instructions: prompt.instructions,
        input: prompt.input
      });

    let modelResult: LunaResult;

    try {
      modelResult = await dependencies.runModel({
        instructions: prompt.instructions,
        input: prompt.input,
        reasoning: capability.reasoning,
        maxOutputTokens: capability.limits.maxOutputTokens,
        outputName: capability.outputName,
        outputSchema: capability.outputSchema
      });
    } catch (error) {
      await dependencies.guardrails.releaseReservation(reservation);
      throw error;
    }

    await dependencies.guardrails.settleSuccess(
      reservation,
      modelResult.usage
    );

    const outputResult = capability.outputSchema.safeParse(
      modelResult.output
    );

    if (!outputResult.success) {
      throw new AiServiceError(
        "INVALID_MODEL_OUTPUT",
        "The model output did not match the capability schema.",
        502,
        { cause: outputResult.error }
      );
    }

    const semanticIssue = capability.validateOutput?.(
      inputResult.data,
      outputResult.data
    );

    if (semanticIssue) {
      throw new AiServiceError(
        "INVALID_MODEL_OUTPUT",
        "The model output violated the capability contract.",
        502,
        { cause: new Error(semanticIssue) }
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
        ? new AiServiceError(
            "INVALID_INPUT",
            "Request did not match the execution contract.",
            400,
            { cause: error }
          )
        : normalizeUnknownError(error);

    return {
      status: normalized.status,
      body: failureBody(normalized, requestId)
    };
  }
}

export const productionRegistry = capabilityRegistry;
export const productionModelRunner = runLuna;
