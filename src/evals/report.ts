import { P7_EVAL_THRESHOLDS } from "./thresholds.js";
import type {
  EvalCapabilityId,
  LiveEvalCaseResult,
  LiveEvalReport
} from "./types.js";

const CAPABILITIES: readonly EvalCapabilityId[] = [
  "languages.correct",
  "languages.explain",
  "languages.generateExercise",
  "languages.conversation"
];

function mean(values: readonly number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return (
    values.reduce((sum, value) => sum + value, 0) /
    values.length
  );
}

function percentile95(
  values: readonly number[]
): number {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort(
    (a, b) => a - b
  );
  const index = Math.min(
    sorted.length - 1,
    Math.ceil(sorted.length * 0.95) - 1
  );

  return sorted[index] ?? 0;
}

export function buildLiveEvalReport(
  cases: LiveEvalCaseResult[],
  generatedAt = new Date().toISOString()
): LiveEvalReport {
  const totalCases = cases.length;
  const passedCases = cases.filter(
    (item) => item.passed
  ).length;

  const byCapability =
    Object.fromEntries(
      CAPABILITIES.map((capability) => {
        const subset = cases.filter(
          (item) => item.capability === capability
        );

        return [
          capability,
          {
            cases: subset.length,
            passed: subset.filter(
              (item) => item.passed
            ).length,
            score: mean(
              subset.map((item) => item.score)
            )
          }
        ];
      })
    ) as LiveEvalReport["summary"]["byCapability"];

  const critical = cases.filter(
    (item) => item.critical
  );

  const summary: LiveEvalReport["summary"] = {
    totalCases,
    passedCases,
    overallScore: mean(
      cases.map((item) => item.score)
    ),
    schemaValidityRate:
      totalCases === 0
        ? 0
        : cases.filter(
            (item) => item.schemaValid
          ).length / totalCases,
    semanticValidityRate:
      totalCases === 0
        ? 0
        : cases.filter(
            (item) => item.semanticValid
          ).length / totalCases,
    criticalPassRate:
      critical.length === 0
        ? 0
        : critical.filter(
            (item) => item.passed
          ).length / critical.length,
    byCapability,
    totalCostUsd: cases.reduce(
      (sum, item) => sum + item.costUsd,
      0
    ),
    averageLatencyMs: mean(
      cases.map((item) => item.latencyMs)
    ),
    p95LatencyMs: percentile95(
      cases.map((item) => item.latencyMs)
    )
  };

  const failures: string[] = [];

  if (
    summary.overallScore <
    P7_EVAL_THRESHOLDS.overallScore
  ) {
    failures.push(
      `overall score ${summary.overallScore.toFixed(3)} < ${P7_EVAL_THRESHOLDS.overallScore}`
    );
  }

  if (
    summary.schemaValidityRate <
    P7_EVAL_THRESHOLDS.schemaValidityRate
  ) {
    failures.push(
      "not all live outputs passed their declared schemas"
    );
  }

  if (
    summary.semanticValidityRate <
    P7_EVAL_THRESHOLDS.semanticValidityRate
  ) {
    failures.push(
      "not all live outputs passed capability semantic validation"
    );
  }

  if (
    summary.criticalPassRate <
    P7_EVAL_THRESHOLDS.criticalPassRate
  ) {
    failures.push(
      "one or more critical cases failed"
    );
  }

  for (const capability of CAPABILITIES) {
    const result = byCapability[capability];

    if (
      result.cases > 0 &&
      result.score <
        P7_EVAL_THRESHOLDS.perCapabilityScore
    ) {
      failures.push(
        `${capability} score ${result.score.toFixed(3)} < ${P7_EVAL_THRESHOLDS.perCapabilityScore}`
      );
    }
  }

  const averageCost =
    totalCases === 0
      ? 0
      : summary.totalCostUsd / totalCases;

  if (
    averageCost >
    P7_EVAL_THRESHOLDS.maxAverageCostUsdPerCase
  ) {
    failures.push(
      `average cost $US${averageCost.toFixed(6)} exceeds $US${P7_EVAL_THRESHOLDS.maxAverageCostUsdPerCase.toFixed(6)}`
    );
  }

  return {
    generatedAt,
    model: "gpt-6-luna",
    cases,
    summary,
    gate: {
      passed:
        totalCases > 0 &&
        failures.length === 0,
      failures:
        totalCases === 0
          ? ["no evaluation cases were executed"]
          : failures
    }
  };
}
