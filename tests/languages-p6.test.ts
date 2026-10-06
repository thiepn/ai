import { describe, expect, it, vi } from "vitest";
import { capabilityRegistry } from "../src/capabilities/index.js";
import {
  languagesGenerateExerciseCapability,
  languagesGenerateExerciseInputSchema,
  languagesGenerateExerciseOutputSchema
} from "../src/capabilities/languages/exercise.js";
import {
  languagesConversationCapability,
  languagesConversationInputSchema,
  languagesConversationOutputSchema
} from "../src/capabilities/languages/conversation.js";
import { executeRun } from "../src/core/execute.js";
import type { ModelRunner } from "../src/core/execute.js";
import { GuardrailManager } from "../src/guardrails/manager.js";
import { MemoryGuardrailStore } from "../src/guardrails/memory-store.js";

function guardrails() {
  return new GuardrailManager(
    new MemoryGuardrailStore(),
    {
      appPolicy: () => ({
        requestsPerMinute: 1_000,
        requestsPerDay: 10_000
      }),
      budgetPolicy: () => ({
        warningUsd: 100,
        softUsd: 200,
        hardUsd: 300
      })
    }
  );
}

function modelResult(output: unknown): ModelRunner {
  return vi.fn<ModelRunner>(async () => ({
    output,
    responseId: "resp_p6",
    model: "gpt-6-luna",
    usage: {
      inputTokens: 500,
      cachedInputTokens: 0,
      cacheWriteTokens: 0,
      outputTokens: 250
    }
  }));
}

describe("languages.generateExercise", () => {
  it("accepts explicit product-owned weakness targets", () => {
    const parsed =
      languagesGenerateExerciseInputSchema.parse({
        languageId: "french",
        proficiency: {
          framework: "cefr",
          level: "A2"
        },
        targets: {
          skillIds: ["sentence-transfer"],
          correctionCategories: [
            "tense_aspect",
            "conjugation"
          ],
          learnerNotes: [
            "Recent trouble choosing passé composé auxiliaries."
          ]
        },
        count: 5,
        exerciseTypes: [
          "fill_blank",
          "rewrite"
        ]
      });

    expect(parsed.targets.skillIds).toEqual([
      "sentence-transfer"
    ]);
    expect(parsed.targets.correctionCategories).toContain(
      "tense_aspect"
    );
  });

  it("builds prompts from supplied targets instead of inferring hidden weaknesses", () => {
    const prompt =
      languagesGenerateExerciseCapability.buildPrompt({
        languageId: "french",
        proficiency: {
          framework: "cefr",
          level: "A2"
        },
        targets: {
          skillIds: ["sentence-transfer"],
          correctionCategories: ["conjugation"]
        }
      });

    expect(prompt.instructions).toContain(
      "Do not infer additional learner weaknesses"
    );

    const payload = JSON.parse(prompt.input);
    expect(payload.count).toBe(5);
    expect(payload.targets.skillIds).toEqual([
      "sentence-transfer"
    ]);
  });

  it("validates a bounded mixed exercise set", () => {
    const parsed =
      languagesGenerateExerciseOutputSchema.parse({
        title: "Passé composé repair",
        learnerInstructions:
          "Complete each sentence using the correct past form.",
        exercises: [
          {
            id: "x1",
            type: "fill_blank",
            prompt:
              "Hier, Marie ___ (arriver) à huit heures.",
            choices: null,
            expectedAnswer: "est arrivée",
            acceptedAnswers: [],
            explanation:
              "Arriver forms the passé composé with être and agrees with Marie.",
            targetSkillIds: ["sentence-transfer"],
            categories: [
              "conjugation",
              "agreement"
            ],
            difficulty: "on_level"
          },
          {
            id: "x2",
            type: "multiple_choice",
            prompt:
              "Choose the correct form: Nous ___ au cinéma hier.",
            choices: [
              "avons allé",
              "sommes allés",
              "allons"
            ],
            expectedAnswer: "sommes allés",
            acceptedAnswers: [],
            explanation:
              "Aller uses être in the passé composé.",
            targetSkillIds: ["sentence-transfer"],
            categories: ["conjugation"],
            difficulty: "on_level"
          }
        ]
      });

    expect(parsed.exercises).toHaveLength(2);
    expect(parsed.exercises[1]?.choices).toHaveLength(
      3
    );
  });

  it("rejects semantic drift beyond requested targets and types", async () => {
    const runModel = modelResult({
      title: "Practice",
      learnerInstructions: "Answer the item.",
      exercises: [
        {
          id: "x1",
          type: "translation",
          prompt: "Translate: Yesterday I studied.",
          choices: null,
          expectedAnswer: "Hier, j'ai étudié.",
          acceptedAnswers: [],
          explanation:
            "Use the passé composé for a completed past action.",
          targetSkillIds: ["invented-skill"],
          categories: ["tense_aspect"],
          difficulty: "on_level"
        }
      ]
    });

    const result = await executeRun(
      {
        capability: "languages.generateExercise",
        input: {
          languageId: "french",
          proficiency: {
            framework: "cefr",
            level: "A2"
          },
          targets: {
            skillIds: ["sentence-transfer"],
            correctionCategories: [
              "tense_aspect"
            ]
          },
          count: 1,
          exerciseTypes: ["translation"]
        }
      },
      { appId: "languages" },
      {
        runModel,
        registry: capabilityRegistry,
        guardrails: guardrails()
      }
    );

    expect(result.status).toBe(502);
    expect(result.body.ok).toBe(false);

    if (!result.body.ok) {
      expect(result.body.error.code).toBe(
        "INVALID_MODEL_OUTPUT"
      );
    }
  });

  it("is restricted to the Languages app identity", async () => {
    const runModel = modelResult({
      title: "Practice",
      learnerInstructions: "Answer the item.",
      exercises: [
        {
          id: "x1",
          type: "short_response",
          prompt: "Say what you did yesterday.",
          choices: null,
          expectedAnswer:
            "Hier, j'ai étudié.",
          acceptedAnswers: [],
          explanation:
            "A completed action yesterday can use the passé composé.",
          targetSkillIds: ["sentence-transfer"],
          categories: ["tense_aspect"],
          difficulty: "on_level"
        }
      ]
    });

    const allowed = await executeRun(
      {
        capability: "languages.generateExercise",
        input: {
          languageId: "french",
          proficiency: {
            framework: "cefr",
            level: "A2"
          },
          targets: {
            skillIds: ["sentence-transfer"],
            correctionCategories: [
              "tense_aspect"
            ]
          },
          count: 1
        }
      },
      { appId: "languages" },
      {
        runModel,
        registry: capabilityRegistry,
        guardrails: guardrails()
      }
    );

    expect(allowed.status).toBe(200);

    const forbidden = await executeRun(
      {
        capability: "languages.generateExercise",
        input: {
          languageId: "french",
          proficiency: {
            framework: "cefr",
            level: "A2"
          },
          targets: {
            skillIds: ["sentence-transfer"],
            correctionCategories: [
              "tense_aspect"
            ]
          }
        }
      },
      { appId: "internal" },
      {
        runModel,
        registry: capabilityRegistry,
        guardrails: guardrails()
      }
    );

    expect(forbidden.status).toBe(403);
  });
});

describe("languages.conversation", () => {
  const baseInput = {
    languageId: "french",
    proficiency: {
      framework: "cefr" as const,
      level: "A2"
    },
    scenario: {
      title: "At a café",
      setting:
        "A small café in Lyon during breakfast.",
      learnerRole: "Customer",
      partnerRole: "Server",
      objective:
        "Order a drink and something to eat, then ask for the price."
    },
    history: [
      {
        role: "partner" as const,
        text: "Bonjour ! Vous désirez ?"
      }
    ],
    learnerMessage:
      "Je voudrais un café et un croissant, s'il vous plaît."
  };

  it("accepts explicit bounded conversation state", () => {
    const parsed =
      languagesConversationInputSchema.parse({
        ...baseInput,
        targets: {
          skillIds: ["conversation"],
          correctionCategories: [],
          vocabulary: [
            "je voudrais",
            "combien"
          ]
        },
        supportMode: "balanced",
        correctionMode: "minimal"
      });

    expect(parsed.history).toHaveLength(1);
    expect(parsed.targets?.skillIds).toEqual([
      "conversation"
    ]);
  });

  it("rejects unbounded conversation history", () => {
    expect(() =>
      languagesConversationInputSchema.parse({
        ...baseInput,
        history: Array.from(
          { length: 17 },
          (_, index) => ({
            role:
              index % 2 === 0
                ? ("learner" as const)
                : ("partner" as const),
            text: `Turn ${index}`
          })
        )
      })
    ).toThrow();
  });

  it("makes statelessness and advisory progress explicit in the prompt", () => {
    const prompt =
      languagesConversationCapability.buildPrompt(
        baseInput
      );

    expect(prompt.instructions).toContain(
      "do not claim hidden memory"
    );
    expect(prompt.instructions).toContain(
      "not authoritative learner progress"
    );
    expect(prompt.instructions).toContain(
      "Never substitute a style suggestion for a genuine error"
    );

    const payload = JSON.parse(prompt.input);
    expect(payload.supportMode).toBe("balanced");
    expect(payload.correctionMode).toBe(
      "balanced"
    );
    expect(payload.learnerMessage).toBe(
      baseInput.learnerMessage
    );
  });

  it("validates a conversational reply with bounded feedback and advisory signals", () => {
    const parsed =
      languagesConversationOutputSchema.parse({
        reply:
          "Très bien. Et avec votre café, vous préférez du lait ou vous le prenez noir ?",
        supportHint: null,
        feedback: {
          summary: null,
          errors: [],
          suggestions: []
        },
        turnSignal: {
          difficulty: "comfortable",
          nextDifficulty: "same",
          objective: "progressing",
          rationale:
            "The learner successfully ordered food and a drink but has not yet asked for the price."
        }
      });

    expect(parsed.turnSignal.objective).toBe(
      "progressing"
    );
    expect(parsed.feedback.errors).toEqual([]);
  });

  it("supports corrective coaching without converting feedback into a score", () => {
    const parsed =
      languagesConversationOutputSchema.parse({
        reply:
          "Bien sûr. Le café coûte trois euros.",
        supportHint:
          "Pour demander le prix : « Combien ça coûte ? »",
        feedback: {
          summary:
            "Your meaning was clear; one phrase can be corrected.",
          errors: [
            {
              id: "e1",
              category: "grammar",
              severity: "minor",
              original: "Combien il coûte ?",
              correction: "Combien ça coûte ?",
              explanation:
                "This is the natural basic question pattern here.",
              confidence: "high"
            }
          ],
          suggestions: []
        },
        turnSignal: {
          difficulty: "productive_struggle",
          nextDifficulty: "same",
          objective: "appears_achieved",
          rationale:
            "The supplied dialogue now appears to cover ordering and asking the price."
        }
      });

    expect(
      "score" in parsed.turnSignal
    ).toBe(false);
    expect(parsed.feedback.errors).toHaveLength(
      1
    );
  });
});
