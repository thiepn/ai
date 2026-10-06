import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  calculateLunaCostNanosUsd,
  nanosToUsd
} from "../../src/billing/luna-pricing.js";
import { capabilityRegistry } from "../../src/capabilities/index.js";
import { gradeLanguageEvalCase } from "../../src/evals/grader.js";
import { languageEvalCases } from "../../src/evals/languages/cases.js";
import { P7_EVAL_THRESHOLDS } from "../../src/evals/thresholds.js";
import { runLuna } from "../../src/providers/luna.js";

export default async function handler(
  request: VercelRequest,
  response: VercelResponse
): Promise<void> {
  response.setHeader("Cache-Control", "no-store");

  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    response.status(405).json({ error: "Method not allowed." });
    return;
  }

  const deploymentHost = process.env.VERCEL_URL;
  const requestHost = request.headers.host;

  if (
    !deploymentHost ||
    !requestHost ||
    requestHost !== deploymentHost
  ) {
    response.status(404).json({ error: "Not found." });
    return;
  }

  const id =
    typeof request.query.id === "string"
      ? request.query.id
      : undefined;

  const item = languageEvalCases.find(
    (candidate) => candidate.id === id
  );

  if (!item) {
    response.status(404).json({ error: "Unknown eval case." });
    return;
  }

  const capability = capabilityRegistry.get(
    item.capability
  );

  if (!capability) {
    response.status(500).json({
      error: "Capability not registered."
    });
    return;
  }

  const inputResult =
    capability.inputSchema.safeParse(item.input);

  if (!inputResult.success) {
    response.status(500).json({
      error: "Eval fixture no longer matches input schema."
    });
    return;
  }

  const startedAt = performance.now();

  try {
    const prompt = capability.buildPrompt(
      inputResult.data
    );

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

    if (!outputResult.success) {
      response.status(200).json({
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
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens,
        costUsd: nanosToUsd(
          calculateLunaCostNanosUsd(result.usage)
        ),
        assertions: [],
        manualReview: item.manualReview,
        error: "Output schema validation failed."
      });
      return;
    }

    const semanticIssue =
      capability.validateOutput?.(
        inputResult.data,
        outputResult.data
      );
    const semanticValid = !semanticIssue;

    const grade = semanticValid
      ? gradeLanguageEvalCase(
          item,
          outputResult.data
        )
      : {
          score: 0,
          passedWeight: 0,
          totalWeight: 0,
          assertions: []
        };

    response.status(200).json({
      id: item.id,
      capability: item.capability,
      language: item.language,
      critical: item.critical ?? false,
      score: grade.score,
      passed:
        semanticValid &&
        grade.score >=
          P7_EVAL_THRESHOLDS.casePassScore,
      schemaValid: true,
      semanticValid,
      latencyMs: Math.round(
        performance.now() - startedAt
      ),
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
      costUsd: nanosToUsd(
        calculateLunaCostNanosUsd(result.usage)
      ),
      assertions: grade.assertions,
      manualReview: item.manualReview,
      output: outputResult.data,
      ...(semanticIssue
        ? { error: semanticIssue }
        : {})
    });
  } catch (error) {
    response.status(500).json({
      id: item.id,
      error:
        error instanceof Error
          ? error.message
          : "Unknown eval failure."
    });
  }
}
