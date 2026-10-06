import { describe, expect, it } from "vitest";
import { capabilityRegistry } from "../src/capabilities/index.js";
import { languagesCorrectOutputSchema } from "../src/capabilities/languages/correct.js";
import { languagesExplainOutputSchema } from "../src/capabilities/languages/explain.js";
import { languagesGenerateExerciseOutputSchema } from "../src/capabilities/languages/exercise.js";
import { languagesConversationOutputSchema } from "../src/capabilities/languages/conversation.js";
import { gradeLanguageEvalCase } from "../src/evals/grader.js";
import { languageEvalCases } from "../src/evals/languages/cases.js";
import { buildLiveEvalReport } from "../src/evals/report.js";
import { P7_EVAL_THRESHOLDS } from "../src/evals/thresholds.js";
import type { LiveEvalCaseResult } from "../src/evals/types.js";

describe("P7 evaluation suite", () => {
  it("has unique IDs and covers both languages across all four capabilities", () => {
    const ids = languageEvalCases.map(
      (item) => item.id
    );

    expect(new Set(ids).size).toBe(ids.length);

    for (const capability of [
      "languages.correct",
      "languages.explain",
      "languages.generateExercise",
      "languages.conversation"
    ] as const) {
      const cases = languageEvalCases.filter(
        (item) => item.capability === capability
      );

      expect(
        cases.some(
          (item) => item.language === "french"
        )
      ).toBe(true);
      expect(
        cases.some(
          (item) => item.language === "japanese"
        )
      ).toBe(true);
      expect(cases.length).toBeGreaterThanOrEqual(4);
    }
  });

  it("keeps all curated inputs compatible with registered capability schemas", () => {
    for (const item of languageEvalCases) {
      const capability =
        capabilityRegistry.get(item.capability);

      expect(
        capability,
        item.id
      ).toBeDefined();

      const parsed =
        capability?.inputSchema.safeParse(item.input);

      expect(
        parsed?.success,
        item.id
      ).toBe(true);
    }
  });

  it("keeps critical cases focused on false-positive correction safety", () => {
    const critical = languageEvalCases.filter(
      (item) => item.critical
    );

    expect(critical.length).toBeGreaterThan(0);

    for (const item of critical) {
      expect(item.capability).toBe(
        "languages.correct"
      );

      if (item.capability === "languages.correct") {
        expect(item.expect.status).toBe("correct");
        expect(item.expect.maxErrors).toBe(0);
      }
    }
  });
});

describe("P7 deterministic graders", () => {
  it("gives a perfect score to a correct no-overcorrection result", () => {
    const item = languageEvalCases.find(
      (candidate) =>
        candidate.id ===
        "correct-fr-valid-a2-01"
    );

    expect(item).toBeDefined();

    const output =
      languagesCorrectOutputSchema.parse({
        status: "correct",
        correctedText:
          "Je vais à la bibliothèque tous les jours.",
        summary: "The sentence is correct.",
        errors: [],
        suggestions: [],
        naturalVersion: null
      });

    const grade = gradeLanguageEvalCase(
      item!,
      output
    );

    expect(grade.score).toBe(1);
  });

  it("penalizes false-positive correction on a critical valid sentence", () => {
    const item = languageEvalCases.find(
      (candidate) =>
        candidate.id ===
        "correct-fr-valid-a2-01"
    );

    const output =
      languagesCorrectOutputSchema.parse({
        status: "needs_correction",
        correctedText:
          "Chaque jour, je vais à la bibliothèque.",
        summary: "Rephrased.",
        errors: [
          {
            id: "e1",
            category: "word_order",
            severity: "minor",
            original:
              "Je vais à la bibliothèque tous les jours.",
            correction:
              "Chaque jour, je vais à la bibliothèque.",
            explanation:
              "This sounds more natural.",
            confidence: "low"
          }
        ],
        suggestions: [],
        naturalVersion: null
      });

    const grade = gradeLanguageEvalCase(
      item!,
      output
    );

    expect(grade.score).toBeLessThan(
      P7_EVAL_THRESHOLDS.casePassScore
    );
  });

  it("checks explanation concepts without demanding exact wording", () => {
    const item = languageEvalCases.find(
      (candidate) =>
        candidate.id ===
        "explain-fr-passe-compose-a2-01"
    );

    const output =
      languagesExplainOutputSchema.parse({
        headline: "A completed past action",
        explanation:
          "Hier places this completed event in the past.",
        rule:
          "Everyday French often uses the passé composé for this kind of completed event.",
        levelFit: "core",
        examples: [
          {
            target: "Hier, j'ai travaillé.",
            meaning: "Yesterday I worked.",
            note: null
          },
          {
            target: "Hier, elle est arrivée.",
            meaning: "Yesterday she arrived.",
            note: null
          }
        ],
        memoryTip: null,
        nuance: null
      });

    expect(
      gradeLanguageEvalCase(item!, output).score
    ).toBe(1);
  });

  it("detects exercise answer leakage", () => {
    const item = languageEvalCases.find(
      (candidate) =>
        candidate.id ===
        "exercise-fr-prepositions-a2-01"
    );

    const output =
      languagesGenerateExerciseOutputSchema.parse({
        title: "Places",
        learnerInstructions: "Answer.",
        exercises: [
          {
            id: "x1",
            type: "fill_blank",
            prompt:
              "Complete with au: Je vais ___ cinéma.",
            choices: null,
            expectedAnswer: "au",
            acceptedAnswers: [],
            explanation:
              "Use au before cinéma.",
            targetSkillIds: [
              "sentence-transfer"
            ],
            categories: ["preposition"],
            difficulty: "on_level"
          },
          {
            id: "x2",
            type: "short_response",
            prompt:
              "Say that you are going to the station.",
            choices: null,
            expectedAnswer:
              "Je vais à la gare.",
            acceptedAnswers: [],
            explanation:
              "Use à la before gare.",
            targetSkillIds: [
              "sentence-transfer"
            ],
            categories: ["preposition"],
            difficulty: "on_level"
          }
        ]
      });

    const grade = gradeLanguageEvalCase(
      item!,
      output
    );

    expect(
      grade.assertions.find(
        (entry) =>
          entry.id === "no-answer-leak"
      )?.passed
    ).toBe(false);
  });

  it("penalizes conversation feedback that skips a required genuine error", () => {
    const item = languageEvalCases.find(
      (candidate) =>
        candidate.id ===
        "conversation-fr-cafe-error-a2-01"
    );

    const output =
      languagesConversationOutputSchema.parse({
        reply:
          "Bien sûr. Le café coûte trois euros.",
        supportHint: null,
        feedback: {
          summary: null,
          errors: [],
          suggestions: [
            {
              original: "Je veux un café.",
              suggestion:
                "Je voudrais un café, s'il vous plaît.",
              reason:
                "This sounds more polite."
            }
          ]
        },
        turnSignal: {
          difficulty: "comfortable",
          nextDifficulty: "same",
          objective: "appears_achieved",
          rationale:
            "The learner ordered and asked the price."
        }
      });

    const grade = gradeLanguageEvalCase(
      item!,
      output
    );

    expect(
      grade.assertions.find(
        (entry) =>
          entry.id ===
          "required-error-category:grammar"
      )?.passed
    ).toBe(false);
  });

  it("grades bounded conversation behavior without inventing a score", () => {
    const item = languageEvalCases.find(
      (candidate) =>
        candidate.id ===
        "conversation-ja-shop-n4-01"
    );

    const output =
      languagesConversationOutputSchema.parse({
        reply:
          "お水はこちらです。どうぞ。",
        supportHint: null,
        feedback: {
          summary: null,
          errors: [],
          suggestions: []
        },
        turnSignal: {
          difficulty: "comfortable",
          nextDifficulty: "same",
          objective: "not_yet",
          rationale:
            "The learner asked where the water is but has not yet thanked the cashier."
        }
      });

    expect(
      gradeLanguageEvalCase(item!, output).score
    ).toBe(1);
  });
});

describe("P7 report gate", () => {
  function result(
    overrides: Partial<LiveEvalCaseResult> = {}
  ): LiveEvalCaseResult {
    return {
      id: "case",
      capability: "languages.correct",
      language: "french",
      critical: false,
      score: 1,
      passed: true,
      schemaValid: true,
      semanticValid: true,
      latencyMs: 100,
      inputTokens: 100,
      outputTokens: 50,
      costUsd: 0.0001,
      assertions: [],
      manualReview: [],
      ...overrides
    };
  }

  it("passes a healthy complete report", () => {
    const cases: LiveEvalCaseResult[] = [
      result({
        id: "c1",
        capability: "languages.correct",
        critical: true
      }),
      result({
        id: "c2",
        capability: "languages.explain"
      }),
      result({
        id: "c3",
        capability:
          "languages.generateExercise"
      }),
      result({
        id: "c4",
        capability: "languages.conversation"
      })
    ];

    expect(
      buildLiveEvalReport(cases).gate.passed
    ).toBe(true);
  });

  it("fails if any critical no-overcorrection case fails", () => {
    const cases: LiveEvalCaseResult[] = [
      result({
        id: "critical",
        critical: true,
        score: 0.5,
        passed: false
      }),
      result({
        id: "e",
        capability: "languages.explain"
      }),
      result({
        id: "x",
        capability:
          "languages.generateExercise"
      }),
      result({
        id: "v",
        capability: "languages.conversation"
      })
    ];

    const report = buildLiveEvalReport(cases);

    expect(report.gate.passed).toBe(false);
    expect(
      report.gate.failures.some((failure) =>
        failure.includes("critical")
      )
    ).toBe(true);
  });
});
