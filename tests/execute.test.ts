import { describe, expect, it, vi } from "vitest";
import { executeRun } from "../src/core/execute.js";
import type { ModelRunner } from "../src/core/execute.js";

describe("executeRun", () => {
  it("executes core.smoke through the injected model runner", async () => {
    const runModel: ModelRunner = vi.fn(async () => ({
      text: "Smoke test passed.",
      responseId: "resp_test",
      model: "gpt-6-luna"
    }));

    const result = await executeRun(
      {
        capability: "core.smoke",
        input: { text: "Say hello" },
        requestId: "req_test"
      },
      { runModel }
    );

    expect(result.status).toBe(200);
    expect(result.body.ok).toBe(true);

    if (result.body.ok) {
      expect(result.body.data.reply).toBe("Smoke test passed.");
      expect(result.body.meta.model).toBe("gpt-6-luna");
      expect(result.body.meta.requestId).toBe("req_test");
    }

    expect(runModel).toHaveBeenCalledTimes(1);
  });

  it("normalizes invalid input without calling the model", async () => {
    const runModel: ModelRunner = vi.fn();

    const result = await executeRun(
      {
        capability: "core.smoke",
        input: { text: "" }
      },
      { runModel }
    );

    expect(result.status).toBe(400);
    expect(result.body.ok).toBe(false);
    expect(runModel).not.toHaveBeenCalled();
  });

  it("normalizes provider rate limits", async () => {
    const runModel: ModelRunner = vi.fn(async () => {
      throw { status: 429 };
    });

    const result = await executeRun(
      {
        capability: "core.smoke",
        input: { text: "Hello" }
      },
      { runModel }
    );

    expect(result.status).toBe(503);
    expect(result.body.ok).toBe(false);

    if (!result.body.ok) {
      expect(result.body.error.code).toBe("RATE_LIMITED");
    }
  });
});
