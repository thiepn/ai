import type { AnyCapabilityDefinition } from "../core/capability.js";
import { AiServiceError } from "../core/errors.js";
import type { LunaUsage } from "../billing/luna-pricing.js";
import {
  calculateLunaCostNanosUsd,
  maximumCapabilityCostNanosUsd,
  nanosToUsd,
  usdToNanos
} from "../billing/luna-pricing.js";
import type { GuardrailStore } from "./store.js";
import {
  capabilityRatePolicy,
  getAppPolicy,
  getBudgetPolicy,
  type AppPolicy,
  type BudgetPolicy
} from "./policy.js";

export type GuardrailReservation = {
  budgetKey: string;
  reservedNanosUsd: number;
  budgetTtlSeconds: number;
  appId: string;
  capabilityId: string;
  month: string;
};

function utcMonthKey(now: Date): string {
  return now.toISOString().slice(0, 7);
}

function utcDayKey(now: Date): string {
  return now.toISOString().slice(0, 10);
}

function utcMinuteKey(now: Date): string {
  return now.toISOString().slice(0, 16);
}

function secondsUntilNextUtcMonth(now: Date): number {
  const next = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)
  );

  return Math.max(
    60,
    Math.ceil((next.getTime() - now.getTime()) / 1000) + 3_600
  );
}

function secondsUntilNextUtcDay(now: Date): number {
  const next = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + 1
    )
  );

  return Math.max(
    60,
    Math.ceil((next.getTime() - now.getTime()) / 1000) + 300
  );
}

function assertWithinInputLimit(
  capability: AnyCapabilityDefinition,
  instructions: string,
  input: string
): void {
  // GPT tokenization operates on byte sequences. UTF-8 bytes are a
  // conservative upper bound for text-token count and avoid a second
  // paid/provider call purely for counting.
  const upperBound =
    Buffer.byteLength(instructions, "utf8") +
    Buffer.byteLength(input, "utf8");

  if (upperBound > capability.limits.maxInputTokens) {
    throw new AiServiceError(
      "INPUT_TOO_LARGE",
      "Capability input exceeds its configured token ceiling.",
      413
    );
  }
}

export class GuardrailManager {
  constructor(
    private readonly store: GuardrailStore,
    private readonly options: {
      now?: () => Date;
      appPolicy?: (appId: string) => AppPolicy;
      budgetPolicy?: () => BudgetPolicy;
    } = {}
  ) {}

  #now(): Date {
    return this.options.now?.() ?? new Date();
  }

  async beforeModelCall(args: {
    appId: string;
    capability: AnyCapabilityDefinition;
    instructions: string;
    input: string;
  }): Promise<GuardrailReservation> {
    const now = this.#now();
    const appPolicy =
      this.options.appPolicy?.(args.appId) ??
      getAppPolicy(args.appId);
    const capabilityPolicy =
      capabilityRatePolicy(args.capability);

    assertWithinInputLimit(
      args.capability,
      args.instructions,
      args.input
    );

    const minute = utcMinuteKey(now);
    const day = utcDayKey(now);

    const counters = await Promise.all([
      this.store.incrementFixedWindow(
        `rate:app:${args.appId}:minute:${minute}`,
        120
      ),
      this.store.incrementFixedWindow(
        `rate:cap:${args.appId}:${args.capability.id}:minute:${minute}`,
        120
      ),
      this.store.incrementFixedWindow(
        `rate:app:${args.appId}:day:${day}`,
        secondsUntilNextUtcDay(now)
      ),
      this.store.incrementFixedWindow(
        `rate:cap:${args.appId}:${args.capability.id}:day:${day}`,
        secondsUntilNextUtcDay(now)
      )
    ]);

    if (
      counters[0] > appPolicy.requestsPerMinute ||
      counters[1] > capabilityPolicy.requestsPerMinute ||
      counters[2] > appPolicy.requestsPerDay ||
      counters[3] > capabilityPolicy.requestsPerDay
    ) {
      throw new AiServiceError(
        "RATE_LIMITED",
        "AI request rate limit exceeded.",
        429
      );
    }

    const budget = this.options.budgetPolicy?.() ?? getBudgetPolicy();
    const month = utcMonthKey(now);
    const budgetKey = `budget:global:${month}`;
    const budgetTtlSeconds = secondsUntilNextUtcMonth(now);
    const reservedNanosUsd =
      maximumCapabilityCostNanosUsd(args.capability.limits);

    const allowed = await this.store.reserveBudget(
      budgetKey,
      reservedNanosUsd,
      usdToNanos(budget.hardUsd),
      budgetTtlSeconds
    );

    if (!allowed) {
      throw new AiServiceError(
        "BUDGET_EXCEEDED",
        "Monthly AI spending limit reached.",
        429
      );
    }

    return {
      budgetKey,
      reservedNanosUsd,
      budgetTtlSeconds,
      appId: args.appId,
      capabilityId: args.capability.id,
      month
    };
  }

  async settleSuccess(
    reservation: GuardrailReservation,
    usage: LunaUsage
  ): Promise<number> {
    const actualNanosUsd = calculateLunaCostNanosUsd(usage);
    const delta =
      actualNanosUsd - reservation.reservedNanosUsd;

    const currentBudget = await this.store.adjustBudget(
      reservation.budgetKey,
      delta,
      reservation.budgetTtlSeconds
    );

    const prefix =
      `usage:${reservation.month}:app:${reservation.appId}`;

    await Promise.all([
      this.store.incrementMetric(
        `${prefix}:requests`,
        1,
        reservation.budgetTtlSeconds
      ),
      this.store.incrementMetric(
        `${prefix}:input_tokens`,
        usage.inputTokens,
        reservation.budgetTtlSeconds
      ),
      this.store.incrementMetric(
        `${prefix}:cached_input_tokens`,
        usage.cachedInputTokens,
        reservation.budgetTtlSeconds
      ),
      this.store.incrementMetric(
        `${prefix}:cache_write_tokens`,
        usage.cacheWriteTokens,
        reservation.budgetTtlSeconds
      ),
      this.store.incrementMetric(
        `${prefix}:output_tokens`,
        usage.outputTokens,
        reservation.budgetTtlSeconds
      ),
      this.store.incrementMetric(
        `${prefix}:cost_nanos_usd`,
        actualNanosUsd,
        reservation.budgetTtlSeconds
      )
    ]);

    const budget =
      this.options.budgetPolicy?.() ?? getBudgetPolicy();
    const currentUsd = nanosToUsd(currentBudget);

    if (currentUsd >= budget.softUsd) {
      console.warn(
        `[thiepn/ai] monthly AI spend is above soft threshold: $${currentUsd.toFixed(4)}`
      );
    } else if (currentUsd >= budget.warningUsd) {
      console.warn(
        `[thiepn/ai] monthly AI spend is above warning threshold: $${currentUsd.toFixed(4)}`
      );
    }

    return actualNanosUsd;
  }

  async releaseReservation(
    reservation: GuardrailReservation
  ): Promise<void> {
    await this.store.adjustBudget(
      reservation.budgetKey,
      -reservation.reservedNanosUsd,
      reservation.budgetTtlSeconds
    );
  }
}
