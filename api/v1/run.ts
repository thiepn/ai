import type { VercelRequest, VercelResponse } from "@vercel/node";
import { executeRun } from "../../src/core/execute.js";

export default async function handler(
  request: VercelRequest,
  response: VercelResponse
): Promise<void> {
  response.setHeader("Cache-Control", "no-store");

  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    response.status(405).json({
      ok: false,
      error: {
        code: "INVALID_INPUT",
        message: "Method not allowed."
      }
    });
    return;
  }

  // P1 intentionally precedes caller authentication (P3).
  // The execution endpoint is therefore opt-in for controlled smoke tests only.
  if (process.env.THIEPN_AI_P1_ENABLED !== "true") {
    response.status(403).json({
      ok: false,
      error: {
        code: "FORBIDDEN",
        message: "P1 model execution is disabled until explicitly enabled."
      }
    });
    return;
  }

  const result = await executeRun(request.body);
  response.status(result.status).json(result.body);
}
