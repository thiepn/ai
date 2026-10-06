import { z } from "zod";
import type { AnyCapabilityDefinition } from "../core/capability.js";

const policyOverridesSchema = z.record(
  z.string(),
  z.object({
    requestsPerMinute: z.number().int().positive().optional(),
    requestsPerDay: z.number().int().positive().optional()
  }).strict()
);

export type AppPolicy = {
  requestsPerMinute: number;
  requestsPerDay: number;
};

export type BudgetPolicy = {
  warningUsd: number;
  softUsd: number;
  hardUsd: number;
};

export function getAppPolicy(appId: string): AppPolicy {
  const defaults: AppPolicy = {
    requestsPerMinute: 60,
    requestsPerDay: 1_000
  };

  const raw = process.env.THIEPN_AI_APP_POLICIES_JSON;

  if (!raw) {
    return defaults;
  }

  const overrides = policyOverridesSchema.parse(JSON.parse(raw));
  return {
    ...defaults,
    ...overrides[appId]
  };
}

export function getBudgetPolicy(): BudgetPolicy {
  const warningUsd = Number(
    process.env.THIEPN_AI_MONTHLY_WARNING_USD ?? "2"
  );
  const softUsd = Number(
    process.env.THIEPN_AI_MONTHLY_SOFT_USD ?? "5"
  );
  const hardUsd = Number(
    process.env.THIEPN_AI_MONTHLY_HARD_USD ?? "10"
  );

  if (
    !Number.isFinite(warningUsd) ||
    !Number.isFinite(softUsd) ||
    !Number.isFinite(hardUsd) ||
    warningUsd < 0 ||
    softUsd < warningUsd ||
    hardUsd <= softUsd
  ) {
    throw new Error("Invalid monthly AI budget configuration.");
  }

  return { warningUsd, softUsd, hardUsd };
}

export function capabilityRatePolicy(
  capability: AnyCapabilityDefinition
): {
  requestsPerMinute: number;
  requestsPerDay: number;
} {
  return {
    requestsPerMinute:
      capability.limits.requestsPerMinute ?? 30,
    requestsPerDay:
      capability.limits.requestsPerDay ?? 500
  };
}
