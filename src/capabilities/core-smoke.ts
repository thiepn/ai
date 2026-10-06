import { z } from "zod";
import { defineCapability } from "../core/capability.js";

export const coreSmokeInputSchema = z.object({
  text: z.string().trim().min(1).max(2_000)
}).strict();

export const coreSmokeOutputSchema = z.object({
  reply: z.string().trim().min(1).max(500)
}).strict();

export const coreSmokeCapability = defineCapability({
  id: "core.smoke",
  version: 1,
  description: "Internal structured-output smoke test for the shared AI execution path.",
  inputSchema: coreSmokeInputSchema,
  outputSchema: coreSmokeOutputSchema,
  outputName: "core_smoke",
  reasoning: "low",
  limits: {
    maxInputTokens: 4_096,
    maxOutputTokens: 160,
    requestsPerMinute: 10,
    requestsPerDay: 100
  },
  allowedApps: ["internal"],
  buildPrompt(input) {
    return {
      instructions: [
        "You are the internal smoke-test capability for thiepn/ai.",
        "Reply briefly and directly to the supplied text.",
        "Return only the structured response requested by the output schema.",
        "Do not call tools, browse, or claim access to application data."
      ].join(" "),
      input: input.text
    };
  }
});

export type CoreSmokeInput = z.infer<typeof coreSmokeInputSchema>;
export type CoreSmokeOutput = z.infer<typeof coreSmokeOutputSchema>;
