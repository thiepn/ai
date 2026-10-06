import { describe, expect, it } from "vitest";
import { runEnvelopeSchema } from "../src/core/contracts.js";
import { coreSmokeInputSchema } from "../src/capabilities/core-smoke.js";

describe("P2 request contracts", () => {
  it("accepts a generic execution envelope", () => {
    const parsed = runEnvelopeSchema.parse({
      capability: "core.smoke",
      input: { text: "Hello" },
      requestId: "test-1"
    });

    expect(parsed.capability).toBe("core.smoke");
    expect(parsed.requestId).toBe("test-1");
  });

  it("does not hard-code capability names into the envelope", () => {
    const envelope = runEnvelopeSchema.parse({
      capability: "future.capability",
      input: { any: "shape" }
    });

    expect(envelope.capability).toBe("future.capability");
  });

  it("keeps capability-specific validation with the capability", () => {
    expect(() => coreSmokeInputSchema.parse({ text: "   " })).toThrow();
    expect(coreSmokeInputSchema.parse({ text: "Hello" })).toEqual({
      text: "Hello"
    });
  });
});
