import { describe, expect, it } from "vitest";
import { coreSmokeCapability } from "../src/capabilities/core-smoke.js";
import { GuardrailManager } from "../src/guardrails/manager.js";
import { MemoryGuardrailStore } from "../src/guardrails/memory-store.js";
import { nanosToUsd } from "../src/billing/luna-pricing.js";

const now = new Date("2026-10-06T14:00:00.000Z");

function manager(args?: {
  hardUsd?: number;
  requestsPerMinute?: number;
}) {
  const store = new MemoryGuardrailStore(
    () => now.getTime()
  );

  const guardrails = new GuardrailManager(store, {
    now: () => now,
    appPolicy: () => ({
      requestsPerMinute:
        args?.requestsPerMinute ?? 100,
      requestsPerDay: 1_000
    }),
    budgetPolicy: () => {
      const hardUsd = args?.hardUsd ?? 10;
      return {
        warningUsd: hardUsd * 0.5,
        softUsd: hardUsd * 0.75,
        hardUsd
      };
    }
  });

  return { store, guardrails };
}

describe("GuardrailManager", () => {
  it("settles a maximum reservation down to actual cost", async () => {
    const { store, guardrails } = manager();

    const reservation = await guardrails.beforeModelCall({
      appId: "internal",
      capability: coreSmokeCapability,
      instructions: "Reply.",
      input: "Hello."
    });

    const actual = await guardrails.settleSuccess(
      reservation,
      {
        inputTokens: 100,
        cachedInputTokens: 0,
        cacheWriteTokens: 0,
        outputTokens: 20
      }
    );

    const stored = await store.getNumber(
      reservation.budgetKey
    );

    expect(stored).toBe(actual);
    expect(nanosToUsd(actual)).toBeGreaterThan(0);
  });

  it("blocks requests that cannot fit under the hard budget", async () => {
    const { guardrails } = manager({
      hardUsd: 0.000001
    });

    await expect(
      guardrails.beforeModelCall({
        appId: "internal",
        capability: coreSmokeCapability,
        instructions: "Reply.",
        input: "Hello."
      })
    ).rejects.toMatchObject({
      code: "BUDGET_EXCEEDED"
    });
  });

  it("enforces per-app rate limits", async () => {
    const { guardrails } = manager({
      requestsPerMinute: 1
    });

    const first = await guardrails.beforeModelCall({
      appId: "internal",
      capability: coreSmokeCapability,
      instructions: "Reply.",
      input: "Hello."
    });

    await guardrails.releaseReservation(first);

    await expect(
      guardrails.beforeModelCall({
        appId: "internal",
        capability: coreSmokeCapability,
        instructions: "Reply.",
        input: "Again."
      })
    ).rejects.toMatchObject({
      code: "RATE_LIMITED"
    });
  });

  it("enforces conservative input ceilings", async () => {
    const { guardrails } = manager();

    await expect(
      guardrails.beforeModelCall({
        appId: "internal",
        capability: coreSmokeCapability,
        instructions: "x".repeat(4_100),
        input: ""
      })
    ).rejects.toMatchObject({
      code: "INPUT_TOO_LARGE"
    });
  });
});
