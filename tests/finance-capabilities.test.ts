import { describe, expect, it } from "vitest";
import { GuardrailManager } from "../src/guardrails/manager.js";
import { MemoryGuardrailStore } from "../src/guardrails/memory-store.js";
import { capabilityRegistry } from "../src/capabilities/index.js";
import {
  financeInterpretQuestionCapability,
  financeInterpretQuestionInputSchema,
  financeInterpretQuestionOutputSchema
} from "../src/capabilities/finance/interpret-question.js";

describe("finance.interpretQuestion", () => {
  it("is registered only for the finance app", () => {
    const capability = capabilityRegistry.get("finance.interpretQuestion");
    expect(capability).toBe(financeInterpretQuestionCapability);
    expect(capability?.allowedApps).toEqual(["finance"]);
  });

  it("accepts only bounded question/date input", () => {
    expect(
      financeInterpretQuestionInputSchema.safeParse({
        question: "How much did I spend last month?",
        today: "2026-10-07"
      }).success
    ).toBe(true);

    expect(
      financeInterpretQuestionInputSchema.safeParse({
        question: "",
        today: "2026-10-07"
      }).success
    ).toBe(false);
  });

  it("allows valid Finance questions under the conservative prompt-byte guardrail", async () => {
    const now = new Date("2026-10-08T12:00:00Z");
    const store = new MemoryGuardrailStore(() => now.getTime());
    const guardrails = new GuardrailManager(store, { now: () => now });

    for (const question of [
      "Was habe ich letzten Monat ausgegeben?",
      "가".repeat(1_000)
    ]) {
      const input = financeInterpretQuestionInputSchema.parse({
        question,
        today: "2026-10-08"
      });
      const prompt = financeInterpretQuestionCapability.buildPrompt(input);
      const reservation = await guardrails.beforeModelCall({
        appId: "finance",
        capability: financeInterpretQuestionCapability,
        instructions: prompt.instructions,
        input: prompt.input
      });

      expect(reservation.appId).toBe("finance");
      await guardrails.releaseReservation(reservation);
    }
  });

  it("accepts a safe executable interpretation", () => {
    const output = financeInterpretQuestionOutputSchema.parse({
      status: "parsed",
      intent: "spending",
      period: {
        kind: "month",
        anchorDate: "2026-09-15",
        label: "last month"
      },
      dimension: null,
      necessity: null,
      reason: null
    });

    expect(
      financeInterpretQuestionCapability.validateOutput?.(
        {
          question: "How much did I spend last month?",
          today: "2026-10-07"
        },
        output
      )
    ).toBeUndefined();
  });

  it("rejects semantically executable fields on unsupported questions", () => {
    const issue = financeInterpretQuestionCapability.validateOutput?.(
      {
        question: "Tell me which stock I should buy.",
        today: "2026-10-07"
      },
      {
        status: "unsupported",
        intent: "spending",
        period: null,
        dimension: null,
        necessity: null,
        reason: "Investment advice is outside this Finance query contract."
      }
    );

    expect(issue).toMatch(/must not contain executable query fields/i);
  });

  it("does not place Finance records in the model prompt contract", () => {
    const prompt = financeInterpretQuestionCapability.buildPrompt({
      question: "How much did I spend at REWE?",
      today: "2026-10-07"
    });

    expect(prompt.input).toContain("REWE");
    expect(prompt.input).not.toContain("transaction");
    expect(prompt.instructions).toMatch(/do not calculate money/i);
  });
});
