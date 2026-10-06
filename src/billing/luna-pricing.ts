export type LunaUsage = {
  inputTokens: number;
  cachedInputTokens: number;
  cacheWriteTokens: number;
  outputTokens: number;
};

export const LUNA_STANDARD_PRICING = {
  inputNanosUsdPerToken: 100,
  cachedInputNanosUsdPerToken: 10,
  cacheWriteNanosUsdPerToken: 125,
  outputNanosUsdPerToken: 500,
  longContextThresholdTokens: 272_000
} as const;

export function calculateLunaCostNanosUsd(
  usage: LunaUsage
): number {
  const cached = Math.max(0, usage.cachedInputTokens);
  const cacheWrite = Math.max(0, usage.cacheWriteTokens);
  const uncached = Math.max(
    0,
    usage.inputTokens - cached - cacheWrite
  );

  const longContext =
    usage.inputTokens >
    LUNA_STANDARD_PRICING.longContextThresholdTokens;

  const inputMultiplier = longContext ? 2 : 1;
  const outputMultiplier = longContext ? 1.5 : 1;

  return Math.round(
    uncached *
      LUNA_STANDARD_PRICING.inputNanosUsdPerToken *
      inputMultiplier +
      cached *
        LUNA_STANDARD_PRICING.cachedInputNanosUsdPerToken *
        inputMultiplier +
      cacheWrite *
        LUNA_STANDARD_PRICING.cacheWriteNanosUsdPerToken *
        inputMultiplier +
      usage.outputTokens *
        LUNA_STANDARD_PRICING.outputNanosUsdPerToken *
        outputMultiplier
  );
}

export function maximumCapabilityCostNanosUsd(limits: {
  maxInputTokens: number;
  maxOutputTokens: number;
}): number {
  return calculateLunaCostNanosUsd({
    inputTokens: limits.maxInputTokens,
    cachedInputTokens: 0,
    cacheWriteTokens: 0,
    outputTokens: limits.maxOutputTokens
  });
}

export function usdToNanos(usd: number): number {
  return Math.round(usd * 1_000_000_000);
}

export function nanosToUsd(nanos: number): number {
  return nanos / 1_000_000_000;
}
