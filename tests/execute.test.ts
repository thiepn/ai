import { describe, expect, it, vi } from "vitest";
import { executeRun } from "../src/core/execute.js";
import type { ModelRunner } from "../src/core/execute.js";

describe("executeRun", () => {
  it("executes core.smoke through the injected model runner", async () => {
    const runModel = vi.fn<ModelRunner>(async () => ({
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
      expect("providerResponseId" in result.body.data).toBe(false);
    }

    expect(runModel).toHaveBeenCalledTimes(1);
  });

  it("rejects an unknown capability without calling the model", async () => {
    const runModel = vi.fn<ModelRunner>();

    const result = await executeRun(
      {
        capability: "languages.correct",
        input: { text: "Hello" }
      },
      { runModel }
    );

    expect(result.status).toBe(404);
    expect(result.body.ok).toBe(false);
    expect(runModel).not.toHaveBeenCalled();

    if (!result.body.ok) {
      expect(result.body.error.code).toBe("UNKNOWN_CAPABILITY");
    }
  });

  it("normalizes invalid capability input without calling the model", async () => {
    const runModel = vi.fn<ModelRunner>();

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

    if (!result.body.ok) {
      expect(result.body.error.code).toBe("INVALID_INPUT");
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
      { runModel }
    );

    expect(result.status).toBe(503);
    expect(result.body.ok).toBe(false);

    if (!result.body.ok) {
      expect(result.body.error.code).toBe("RATE_LIMITED");
    }
  });
});
