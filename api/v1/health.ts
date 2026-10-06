import type { VercelRequest, VercelResponse } from "@vercel/node";
import { LUNA_MODEL } from "../../src/providers/luna.js";

export default function handler(
  request: VercelRequest,
  response: VercelResponse
): void {
  response.setHeader("Cache-Control", "no-store");

  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    response.status(405).json({
      status: "error",
      message: "Method not allowed."
    });
    return;
  }

  response.status(200).json({
    status: "ok",
    service: "thiepn/ai",
    phase: "P3",
    model: LUNA_MODEL
  });
}
