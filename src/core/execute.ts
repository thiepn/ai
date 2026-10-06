import { ZodError } from "zod";
import {
  runEnvelopeSchema,
  smokeInputSchema,
  type RunFailure,
  type RunSuccess
} from "./contracts.js";
import { AiServiceError, failureBody, normalizeUnknownError } from "./errors.js";
import { createRequestId } from "./request-id.js";
import {
  CORE_SMOKE_CAPABILITY,
  runCoreSmoke,
  type CoreSmokeResult
} from "../capabilities/core-smoke.js";
import { runLuna, type LunaRequest, type LunaResult } from "../providers/luna.js";

export type ModelRunner = (request: LunaRequest) => Promise<LunaResult>;

export type ExecuteDependencies = {
  runModel: ModelRunner;
};

const defaultDependencies: ExecuteDependencies = {
  runModel: runLuna
};

export async function executeRun(
  rawRequest: unknown,
  dependencies: ExecuteDependencies = defaultDependencies
): Promise<{
  status: number;
  body: RunSuccess<CoreSmokeResult> | RunFailure;
}> {
  let requestId = createRequestId();

  try {
    const envelope = runEnvelopeSchema.parse(rawRequest);
    requestId = createRequestId(envelope.requestId);

    if (envelope.capability !== CORE_SMOKE_CAPABILITY.id) {
      throw new AiServiceError(
        "UNKNOWN_CAPABILITY",
        "Unknown capability.",
        404
      );
    }

    const input = smokeInputSchema.parse(envelope.input);
    const data = await runCoreSmoke(input, dependencies.runModel);

    return {
      status: 200,
      body: {
        ok: true,
        data,
        meta: {
          capability: CORE_SMOKE_CAPABILITY.id,
          version: CORE_SMOKE_CAPABILITY.version,
          requestId,
          model: "gpt-6-luna"
        }
      }
    };
  } catch (error) {
    const normalized =
      error instanceof ZodError
        ? new AiServiceError("INVALID_INPUT", "Request did not match the P1 contract.", 400, {
            cause: error
          })
        : normalizeUnknownError(error);

    return {
      status: normalized.status,
      body: failureBody(normalized, requestId)
    };
  }
}
