import { describe, expect, it } from "vitest";
import {
  calculateLunaCostNanosUsd,
  nanosToUsd
} from "../src/billing/luna-pricing.js";

describe("GPT-6 Luna pricing", () => {
  it("matches standard uncached token pricing below 272k input", () => {
    const cost = calculateLunaCostNanosUsd({
      inputTokens: 100_000,
      cachedInputTokens: 0,
      cacheWriteTokens: 0,
      outputTokens: 100_000
    });

    expect(nanosToUsd(cost)).toBeCloseTo(0.06, 10);
  });

  it("prices cached input and cache writes separately", () => {
    const cost = calculateLunaCostNanosUsd({
      inputTokens: 100_000,
      cachedInputTokens: 40_000,
      cacheWriteTokens: 20_000,
      outputTokens: 0
    });

    // 40k normal + 40k cached + 20k cache write
    expect(nanosToUsd(cost)).toBeCloseTo(0.0069, 10);
  });

  it("applies long-context multipliers above 272k input", () => {
    const cost = calculateLunaCostNanosUsd({
      inputTokens: 300_000,
      cachedInputTokens: 0,
      cacheWriteTokens: 0,
      outputTokens: 100_000
    });

    expect(nanosToUsd(cost)).toBeCloseTo(0.135, 10);
  });
});
