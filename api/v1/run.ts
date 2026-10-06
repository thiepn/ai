import type { VercelRequest, VercelResponse } from "@vercel/node";
import { executeRun } from "../../src/core/execute.js";
import { AiServiceError, failureBody } from "../../src/core/errors.js";
import { createRequestId } from "../../src/core/request-id.js";

export default async function handler(
  request: VercelRequest,
  response: VercelResponse
): Promise<void> {
  response.setHeader("Cache-Control", "no-store");

  if (request.method !== "POST") {
    const requestId = createRequestId();
    response.setHeader("Allow", "POST");
    response.status(405).json(
      failureBody(
        new AiServiceError("INVALID_INPUT", "Method not allowed.", 405),
        requestId
      )
    );
    return;
  }

  // P1 intentionally precedes caller authentication (P3).
  // The execution endpoint is therefore opt-in for controlled smoke tests only.
  if (process.env.THIEPN_AI_P1_ENABLED !== "true") {
    const requestId = createRequestId();
    response.status(403).json(
      failureBody(
        new AiServiceError(
          "FORBIDDEN",
          "P1 model execution is disabled until explicitly enabled.",
          403
        ),
        requestId
      )
    );
    return;
  }

  const result = await executeRun(request.body);
  response.status(result.status).json(result.body);
}
