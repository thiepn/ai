import { describe, expect, it, vi } from "vitest";
import { executeRun } from "../src/core/execute.js";
import type { ModelRunner } from "../src/core/execute.js";
import { capabilityRegistry } from "../src/capabilities/index.js";

describe("executeRun", () => {
  it("executes a registered capability through the model runner", async () => {
    const runModel = vi.fn<ModelRunner>(async () => ({
      output: { reply: "Smoke test passed." },
      responseId: "resp_test",
      model: "gpt-6-luna"
    }));

    const result = await executeRun(
      {
        capability: "core.smoke",
        input: { text: "Say hello" },
        requestId: "req_test"
      },
      { runModel, registry: capabilityRegistry }
    );

    expect(result.status).toBe(200);
    expect(result.body.ok).toBe(true);

    if (result.body.ok) {
      expect(result.body.data).toEqual({ reply: "Smoke test passed." });
      expect(result.body.meta.model).toBe("gpt-6-luna");
      expect(result.body.meta.requestId).toBe("req_test");
    }

    expect(runModel).toHaveBeenCalledTimes(1);
    expect(runModel).toHaveBeenCalledWith(
      expect.objectContaining({
        reasoning: "low",
        maxOutputTokens: 160,
        outputName: "core_smoke"
      })
    );
  });

  it("rejects an unknown capability without calling the model", async () => {
    const runModel = vi.fn<ModelRunner>();

    const result = await executeRun(
      {
        capability: "languages.correct",
        input: { text: "Hello" }
      },
      { runModel, registry: capabilityRegistry }
    );

    expect(result.status).toBe(404);
    expect(result.body.ok).toBe(false);
    expect(runModel).not.toHaveBeenCalled();

    if (!result.body.ok) {
      expect(result.body.error.code).toBe("UNKNOWN_CAPABILITY");
    }
  });

  it("rejects invalid capability input without calling the model", async () => {
    const runModel = vi.fn<ModelRunner>();

    const result = await executeRun(
      {
        capability: "core.smoke",
        input: { text: "" }
      },
      { runModel, registry: capabilityRegistry }
    );

    expect(result.status).toBe(400);
    expect(result.body.ok).toBe(false);
    expect(runModel).not.toHaveBeenCalled();

    if (!result.body.ok) {
      expect(result.body.error.code).toBe("INVALID_INPUT");
    }
  });

  it("rejects model output that violates the capability schema", async () => {
    const runModel = vi.fn<ModelRunner>(async () => ({
      output: { wrong: true },
      responseId: "resp_bad",
      model: "gpt-6-luna"
    }));

    const result = await executeRun(
      {
        capability: "core.smoke",
        input: { text: "Hello" }
      },
      { runModel, registry: capabilityRegistry }
    );

    expect(result.status).toBe(502);
    expect(result.body.ok).toBe(false);

    if (!result.body.ok) {
      expect(result.body.error.code).toBe("INVALID_MODEL_OUTPUT");
    }
  });

  it("normalizes provider rate limits", async () => {
    const runModel = vi.fn<ModelRunner>(async () => {
      throw { status: 429 };
    });

    const result = await executeRun(
      {
        capability: "core.smoke",
        input: { text: "Hello" }
      },
      { runModel, registry: capabilityRegistry }
    );

    expect(result.status).toBe(503);
    expect(result.body.ok).toBe(false);

    if (!result.body.ok) {
      expect(result.body.error.code).toBe("RATE_LIMITED");
    }
  });
});
