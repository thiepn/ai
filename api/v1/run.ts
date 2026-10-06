import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  executeRun,
  productionModelRunner,
  productionRegistry
} from "../../src/core/execute.js";
import {
  AiServiceError,
  failureBody,
  normalizeUnknownError
} from "../../src/core/errors.js";
import { createRequestId } from "../../src/core/request-id.js";
import { authenticateAppRequest } from "../../src/security/app-auth.js";
import { stableJson } from "../../src/security/canonical.js";
import {
  getRuntimeGuardrailManager,
  getRuntimeGuardrailStore
} from "../../src/guardrails/runtime.js";

const SIGNED_PATH = "/v1/run";
const MAX_REQUEST_BYTES = 64 * 1024;

export default async function handler(
  request: VercelRequest,
  response: VercelResponse
): Promise<void> {
  response.setHeader("Cache-Control", "no-store");
  const requestId = createRequestId();

  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    response.status(405).json(
      failureBody(
        new AiServiceError("INVALID_INPUT", "Method not allowed.", 405),
        requestId
      )
    );
    return;
  }

  try {
    const bodyBytes = Buffer.byteLength(
      stableJson(request.body),
      "utf8"
    );

    if (bodyBytes > MAX_REQUEST_BYTES) {
      throw new AiServiceError(
        "INPUT_TOO_LARGE",
        "Request body is too large.",
        413
      );
    }

    const store = getRuntimeGuardrailStore();
    const caller = await authenticateAppRequest({
      headers: request.headers,
      method: "POST",
      path: SIGNED_PATH,
      body: request.body,
      store
    });

    const result = await executeRun(
      request.body,
      caller,
      {
        runModel: productionModelRunner,
        registry: productionRegistry,
        guardrails: getRuntimeGuardrailManager()
      }
    );

    response.status(result.status).json(result.body);
  } catch (error) {
    const normalized = normalizeUnknownError(error);
    response
      .status(normalized.status)
      .json(failureBody(normalized, requestId));
  }
}
