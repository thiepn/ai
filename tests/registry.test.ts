import { describe, expect, it } from "vitest";
import { z } from "zod";
import { defineCapability } from "../src/core/capability.js";
import { CapabilityRegistry } from "../src/core/registry.js";

function testCapability(id: string) {
  return defineCapability({
    id,
    version: 1,
    description: "Test capability",
    inputSchema: z.object({ text: z.string() }).strict(),
    outputSchema: z.object({ reply: z.string() }).strict(),
    outputName: id.replace(".", "_"),
    reasoning: "low",
    limits: {
      maxInputTokens: 1_024,
      maxOutputTokens: 100
    },
    allowedApps: ["internal"],
    buildPrompt(input) {
      return {
        instructions: "Reply.",
        input: input.text
      };
    }
  });
}

describe("CapabilityRegistry", () => {
  it("registers and resolves capabilities", () => {
    const capability = testCapability("core.test");
    const registry = new CapabilityRegistry([capability]);

    expect(registry.get("core.test")).toBe(capability);
    expect(registry.has("core.test")).toBe(true);
    expect(registry.list()).toHaveLength(1);
  });

  it("rejects duplicate capability ids", () => {
    const capability = testCapability("core.test");

    expect(
      () => new CapabilityRegistry([capability, capability])
    ).toThrow("Duplicate capability id");
  });

  it("rejects malformed definitions", () => {
    expect(() =>
      defineCapability({
        id: "bad",
        version: 1,
        description: "Bad capability",
        inputSchema: z.object({}),
        outputSchema: z.object({}),
        outputName: "bad",
        reasoning: "low",
        limits: {
          maxInputTokens: 1,
          maxOutputTokens: 1
        },
        allowedApps: ["internal"],
        buildPrompt() {
          return { instructions: "", input: "" };
        }
      })
    ).toThrow("Invalid capability id");
  });

  it("rejects invalid rate ceilings", () => {
    expect(() =>
      defineCapability({
        id: "core.bad-rate",
        version: 1,
        description: "Bad rate",
        inputSchema: z.object({}),
        outputSchema: z.object({}),
        outputName: "core_bad_rate",
        reasoning: "low",
        limits: {
          maxInputTokens: 1,
          maxOutputTokens: 1,
          requestsPerMinute: 0
        },
        allowedApps: ["internal"],
        buildPrompt() {
          return { instructions: "", input: "" };
        }
      })
    ).toThrow("Invalid requestsPerMinute");
  });
});
