import { describe, expect, it } from "vitest";
import {
  calculateLunaCostNanosUsd,
  nanosToUsd
} from "../src/billing/luna-pricing.js";

describe("GPT-6 Luna pricing", () => {
  it("matches standard uncached token pricing", () => {
    const cost = calculateLunaCostNanosUsd({
      inputTokens: 1_000_000,
      cachedInputTokens: 0,
      cacheWriteTokens: 0,
      outputTokens: 1_000_000
    });

    expect(nanosToUsd(cost)).toBeCloseTo(0.6, 10);
  });

  it("prices cached input and cache writes separately", () => {
    const cost = calculateLunaCostNanosUsd({
      inputTokens: 1_000_000,
      cachedInputTokens: 400_000,
      cacheWriteTokens: 200_000,
      outputTokens: 0
    });

    // 400k normal + 400k cached + 200k cache write
    expect(nanosToUsd(cost)).toBeCloseTo(0.069, 10);
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
