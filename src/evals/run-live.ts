import {
  mkdir,
  writeFile
} from "node:fs/promises";
import { dirname } from "node:path";
import { capabilityRegistry } from "../capabilities/index.js";
import {
  calculateLunaCostNanosUsd,
  nanosToUsd
} from "../billing/luna-pricing.js";
import { runLuna } from "../providers/luna.js";
import { gradeLanguageEvalCase } from "./grader.js";
import {
  languageEvalCases,
  selectLanguageEvalCases
} from "./languages/cases.js";
import { buildLiveEvalReport } from "./report.js";
import { P7_EVAL_THRESHOLDS } from "./thresholds.js";
import type {
  LanguageEvalCase,
  LiveEvalCaseResult
} from "./types.js";

function parseSuite():
  | "all"
  | "french"
  | "japanese" {
  const value = process.env.EVAL_SUITE ?? "all";

  if (
    value !== "all" &&
    value !== "french" &&
    value !== "japanese"
  ) {
    throw new Error(
      "EVAL_SUITE must be all, french, or japanese."
    );
  }

  return value;
}

function parseLimit(): number | undefined {
  const raw = process.env.EVAL_LIMIT;

  if (!raw) {
    return undefined;
  }

  const value = Number(raw);

  if (
    !Number.isInteger(value) ||
    value < 1
  ) {
    throw new Error(
      "EVAL_LIMIT must be a positive integer."
    );
  }

  return value;
}

function outputPath(): string {
  return (
    process.env.EVAL_OUTPUT_PATH ??
    "artifacts/evals/live-report.json"
  );
}

async function runCase(
  item: LanguageEvalCase
): Promise<LiveEvalCaseResult> {
  const startedAt = performance.now();
  const capability =
    capabilityRegistry.get(item.capability);

  if (!capability) {
    return {
      id: item.id,
      capability: item.capability,
      language: item.language,
      critical: item.critical ?? false,
      score: 0,
      passed: false,
      schemaValid: false,
      semanticValid: false,
      latencyMs: Math.round(
        performance.now() - startedAt
      ),
      inputTokens: 0,
      outputTokens: 0,
      costUsd: 0,
      assertions: [],
      manualReview: item.manualReview,
      error: "Capability is not registered."
    };
  }

  const inputResult =
    capability.inputSchema.safeParse(item.input);

  if (!inputResult.success) {
    return {
      id: item.id,
      capability: item.capability,
      language: item.language,
      critical: item.critical ?? false,
      score: 0,
      passed: false,
      schemaValid: false,
      semanticValid: false,
      latencyMs: Math.round(
        performance.now() - startedAt
      ),
      inputTokens: 0,
      outputTokens: 0,
      costUsd: 0,
      assertions: [],
      manualReview: item.manualReview,
      error:
        "Eval fixture input does not match capability schema."
    };
  }

  try {
    const prompt =
      capability.buildPrompt(inputResult.data);

    const result = await runLuna({
      instructions: prompt.instructions,
      input: prompt.input,
      reasoning: capability.reasoning,
      maxOutputTokens:
        capability.limits.maxOutputTokens,
      outputName: capability.outputName,
      outputSchema: capability.outputSchema
    });

    const outputResult =
      capability.outputSchema.safeParse(
        result.output
      );
    const schemaValid = outputResult.success;

    let semanticValid = false;
    let semanticIssue: string | undefined;
    let grade = {
      score: 0,
      passedWeight: 0,
      totalWeight: 0,
      assertions: []
    };

    if (outputResult.success) {
      semanticIssue =
        capability.validateOutput?.(
          inputResult.data,
          outputResult.data
        );
      semanticValid = !semanticIssue;

      if (semanticValid) {
        grade = gradeLanguageEvalCase(
          item,
          outputResult.data
        );
      }
    }

    const costUsd = nanosToUsd(
      calculateLunaCostNanosUsd(result.usage)
    );

    const passed =
      schemaValid &&
      semanticValid &&
      grade.score >=
        P7_EVAL_THRESHOLDS.casePassScore;

    return {
      id: item.id,
      capability: item.capability,
      language: item.language,
      critical: item.critical ?? false,
      score: grade.score,
      passed,
      schemaValid,
      semanticValid,
      latencyMs: Math.round(
        performance.now() - startedAt
      ),
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
      costUsd,
      assertions: grade.assertions,
      manualReview: item.manualReview,
      output: result.output,
      ...(semanticIssue
        ? { error: semanticIssue }
        : {})
    };
  } catch (error) {
    return {
      id: item.id,
      capability: item.capability,
      language: item.language,
      critical: item.critical ?? false,
      score: 0,
      passed: false,
      schemaValid: false,
      semanticValid: false,
      latencyMs: Math.round(
        performance.now() - startedAt
      ),
      inputTokens: 0,
      outputTokens: 0,
      costUsd: 0,
      assertions: [],
      manualReview: item.manualReview,
      error:
        error instanceof Error
          ? error.message
          : "Unknown live evaluation failure."
    };
  }
}

async function main(): Promise<void> {
  if (
    process.env.THIEPN_AI_LIVE_EVAL_ACK !==
    "yes"
  ) {
    throw new Error(
      "Live eval is disabled. Set THIEPN_AI_LIVE_EVAL_ACK=yes to acknowledge API usage and cost."
    );
  }

  if (!process.env.OPENAI_API_KEY) {
    throw new Error(
      "OPENAI_API_KEY is required for live evaluation."
    );
  }

  const cases = selectLanguageEvalCases({
    suite: parseSuite(),
    limit: parseLimit()
  });

  if (cases.length === 0) {
    throw new Error(
      `No live eval cases selected from ${languageEvalCases.length} available cases.`
    );
  }

  const results: LiveEvalCaseResult[] = [];

  // Intentionally serial: predictable provider load and easier case-level diagnosis.
  for (const item of cases) {
    process.stdout.write(
      `[eval] ${item.id} ... `
    );
    const result = await runCase(item);
    results.push(result);
    process.stdout.write(
      `${result.passed ? "PASS" : "FAIL"} ${result.score.toFixed(3)} ${result.latencyMs}ms $US${result.costUsd.toFixed(6)}\n`
    );
  }

  const report = buildLiveEvalReport(results);
  const path = outputPath();

  await mkdir(dirname(path), {
    recursive: true
  });
  await writeFile(
    path,
    JSON.stringify(report, null, 2),
    "utf8"
  );

  process.stdout.write(
    [
      "",
      `Cases: ${report.summary.passedCases}/${report.summary.totalCases}`,
      `Overall score: ${report.summary.overallScore.toFixed(3)}`,
      `Schema validity: ${report.summary.schemaValidityRate.toFixed(3)}`,
      `Semantic validity: ${report.summary.semanticValidityRate.toFixed(3)}`,
      `Critical pass rate: ${report.summary.criticalPassRate.toFixed(3)}`,
      `Total cost: $US${report.summary.totalCostUsd.toFixed(6)}`,
      `Average latency: ${report.summary.averageLatencyMs.toFixed(0)}ms`,
      `P95 latency: ${report.summary.p95LatencyMs.toFixed(0)}ms`,
      `Report: ${path}`,
      `Gate: ${report.gate.passed ? "PASS" : "FAIL"}`
    ].join("\n") + "\n"
  );

  if (!report.gate.passed) {
    for (const failure of report.gate.failures) {
      process.stderr.write(
        `[gate] ${failure}\n`
      );
    }
    process.exitCode = 1;
  }
}

await main();
