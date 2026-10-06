import type { VercelRequest, VercelResponse } from "@vercel/node";
import { checkRuntimeReadiness } from "../../src/core/readiness.js";
import { LUNA_MODEL } from "../../src/providers/luna.js";

export default async function handler(
  request: VercelRequest,
  response: VercelResponse
): Promise<void> {
  response.setHeader("Cache-Control", "no-store");

  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    response.status(405).json({
      status: "error",
      message: "Method not allowed."
    });
    return;
  }

  const readiness =
    await checkRuntimeReadiness();

  response.status(readiness.ready ? 200 : 503).json({
    status: readiness.ready ? "ok" : "degraded",
    ready: readiness.ready,
    service: "thiepn/ai",
    phase: "P8-integration",
    model: LUNA_MODEL,
    dependencies: readiness.dependencies
  });
}
