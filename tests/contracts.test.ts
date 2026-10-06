import { describe, expect, it } from "vitest";
import { runEnvelopeSchema, smokeInputSchema } from "../src/core/contracts.js";

describe("P1 request contracts", () => {
  it("accepts a valid execution envelope", () => {
    const parsed = runEnvelopeSchema.parse({
      capability: "core.smoke",
      input: { text: "Hello" },
      requestId: "test-1"
    });

    expect(parsed.capability).toBe("core.smoke");
    expect(parsed.requestId).toBe("test-1");
  });

  it("keeps capability-specific input validation separate", () => {
    const envelope = runEnvelopeSchema.parse({
      capability: "future.capability",
      input: { any: "shape" }
    });

    expect(envelope.capability).toBe("future.capability");
    expect(() => smokeInputSchema.parse({ text: "   " })).toThrow();
  });
});
