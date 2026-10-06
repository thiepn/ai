import type { SmokeInput } from "../core/contracts.js";
import type { LunaRequest, LunaResult } from "../providers/luna.js";

export const CORE_SMOKE_CAPABILITY = {
  id: "core.smoke",
  version: 1,
  maxOutputTokens: 160
} as const;

export type CoreSmokeResult = {
  reply: string;
};

export async function runCoreSmoke(
  input: SmokeInput,
  runModel: (request: LunaRequest) => Promise<LunaResult>
): Promise<CoreSmokeResult> {
  const result = await runModel({
    instructions: [
      "You are the internal smoke-test capability for thiepn/ai.",
      "Reply briefly and directly to the supplied text.",
      "Do not call tools, browse, or claim access to application data."
    ].join(" "),
    input: input.text,
    reasoning: "low",
    maxOutputTokens: CORE_SMOKE_CAPABILITY.maxOutputTokens
  });

  return {
    reply: result.text
  };
}
