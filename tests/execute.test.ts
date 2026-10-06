import { describe, expect, it, vi } from "vitest";
import { executeRun } from "../src/core/execute.js";
import type { ModelRunner } from "../src/core/execute.js";
import { capabilityRegistry } from "../src/capabilities/index.js";
import { GuardrailManager } from "../src/guardrails/manager.js";
import { MemoryGuardrailStore } from "../src/guardrails/memory-store.js";

function testGuardrails() {
  return new GuardrailManager(
    new MemoryGuardrailStore(),
    {
      appPolicy: () => ({
        requestsPerMinute: 1_000,
        requestsPerDay: 10_000
      }),
      budgetPolicy: () => ({
        warningUsd: 100,
        softUsd: 200,
        hardUsd: 300
      })
    }
  );
}

function successModel(
  output: unknown = { reply: "Smoke test passed." }
): ModelRunner {
  return vi.fn<ModelRunner>(async () => ({
    output,
    responseId: "resp_test",
    model: "gpt-6-luna",
    usage: {
      inputTokens: 100,
      cachedInputTokens: 0,
      cacheWriteTokens: 0,
      outputTokens: 20
    }
  }));
}

describe("executeRun", () => {
  it("executes an authorized registered capability", async () => {
    const runModel = successModel();

    const result = await executeRun(
      {
        capability: "core.smoke",
        input: { text: "Say hello" },
        requestId: "req_test"
      },
      { appId: "internal" },
      {
        runModel,
        registry: capabilityRegistry,
        guardrails: testGuardrails()
      }
    );

    expect(result.status).toBe(200);
    expect(result.body.ok).toBe(true);

    if (result.body.ok) {
      expect(result.body.data).toEqual({
        reply: "Smoke test passed."
      });
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

  it("rejects an authenticated app without capability permission", async () => {
    const runModel = successModel();

    const result = await executeRun(
      {
        capability: "core.smoke",
        input: { text: "Hello" }
      },
      { appId: "languages" },
      {
        runModel,
        registry: capabilityRegistry,
        guardrails: testGuardrails()
      }
    );

    expect(result.status).toBe(403);
    expect(result.body.ok).toBe(false);
    expect(runModel).not.toHaveBeenCalled();

    if (!result.body.ok) {
      expect(result.body.error.code).toBe("FORBIDDEN");
    }
  });

  it("rejects an unknown capability without calling the model", async () => {
    const runModel = successModel();

    const result = await executeRun(
      {
        capability: "future.capability",
        input: { text: "Hello" }
      },
      { appId: "internal" },
      {
        runModel,
        registry: capabilityRegistry,
        guardrails: testGuardrails()
      }
    );

    expect(result.status).toBe(404);
    expect(result.body.ok).toBe(false);
    expect(runModel).not.toHaveBeenCalled();

    if (!result.body.ok) {
      expect(result.body.error.code).toBe("UNKNOWN_CAPABILITY");
    }
  });

  it("rejects invalid capability input without calling the model", async () => {
    const runModel = successModel();

    const result = await executeRun(
      {
        capability: "core.smoke",
        input: { text: "" }
      },
      { appId: "internal" },
      {
        runModel,
        registry: capabilityRegistry,
        guardrails: testGuardrails()
      }
    );

    expect(result.status).toBe(400);
    expect(result.body.ok).toBe(false);
    expect(runModel).not.toHaveBeenCalled();

    if (!result.body.ok) {
      expect(result.body.error.code).toBe("INVALID_INPUT");
    }
  });

  it("rejects model output that violates the capability schema", async () => {
    const runModel = successModel({ wrong: true });

    const result = await executeRun(
      {
        capability: "core.smoke",
        input: { text: "Hello" }
      },
      { appId: "internal" },
      {
        runModel,
        registry: capabilityRegistry,
        guardrails: testGuardrails()
      }
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
      { appId: "internal" },
      {
        runModel,
        registry: capabilityRegistry,
        guardrails: testGuardrails()
      }
    );

    expect(result.status).toBe(503);
    expect(result.body.ok).toBe(false);

    if (!result.body.ok) {
      expect(result.body.error.code).toBe("RATE_LIMITED");
    }
  });
});
