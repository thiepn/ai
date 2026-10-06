import { describe, expect, it } from "vitest";
import { runRequestSchema } from "../src/core/contracts.js";

describe("P1 request contract", () => {
  it("accepts the internal smoke capability", () => {
    const parsed = runRequestSchema.parse({
      capability: "core.smoke",
      input: { text: "Hello" },
      requestId: "test-1"
    });

    expect(parsed.capability).toBe("core.smoke");
    expect(parsed.input.text).toBe("Hello");
  });

  it("rejects arbitrary capability names", () => {
    expect(() =>
      runRequestSchema.parse({
        capability: "languages.correct",
        input: { text: "Hello" }
      })
    ).toThrow();
  });

  it("rejects empty input", () => {
    expect(() =>
      runRequestSchema.parse({
        capability: "core.smoke",
        input: { text: "   " }
      })
    ).toThrow();
  });
});
