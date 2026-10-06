import type {
  LanguagesConversationInput,
  LanguagesConversationOutput
} from "../capabilities/languages/conversation.js";
import type {
  LanguagesCorrectInput,
  LanguagesCorrectOutput
} from "../capabilities/languages/correct.js";
import type {
  LanguagesExplainInput,
  LanguagesExplainOutput
} from "../capabilities/languages/explain.js";
import type {
  LanguagesGenerateExerciseInput,
  LanguagesGenerateExerciseOutput
} from "../capabilities/languages/exercise.js";
import type { CorrectionCategory } from "../capabilities/languages/shared.js";

export type EvalCapabilityId =
  | "languages.correct"
  | "languages.explain"
  | "languages.generateExercise"
  | "languages.conversation";

export type EvalAssertion = {
  id: string;
  passed: boolean;
  weight: number;
  detail?: string;
};

export type EvalGrade = {
  score: number;
  passedWeight: number;
  totalWeight: number;
  assertions: EvalAssertion[];
};

type EvalCaseBase = {
  id: string;
  description: string;
  language: "french" | "japanese";
  critical?: boolean;
  manualReview: readonly string[];
};

export type CorrectionEvalCase = EvalCaseBase & {
  capability: "languages.correct";
  input: LanguagesCorrectInput;
  expect: {
    status: "correct" | "needs_correction";
    minErrors: number;
    maxErrors: number;
    requiredCategories?: readonly CorrectionCategory[];
    forbiddenCategories?: readonly CorrectionCategory[];
    preserveInputWhenCorrect?: boolean;
  };
};

export type ExplanationEvalCase = EvalCaseBase & {
  capability: "languages.explain";
  input: LanguagesExplainInput;
  expect: {
    levelFit?: "core" | "useful_next_step" | "advanced_detail";
    minExamples: number;
    maxExamples: number;
    requiredTermsAny?: readonly string[];
    forbiddenTerms?: readonly string[];
  };
};

export type ExerciseEvalCase = EvalCaseBase & {
  capability: "languages.generateExercise";
  input: LanguagesGenerateExerciseInput;
  expect: {
    count: number;
    requireTargetSignal: boolean;
    forbidPromptAnswerLeak?: boolean;
  };
};

export type ConversationEvalCase = EvalCaseBase & {
  capability: "languages.conversation";
  input: LanguagesConversationInput;
  expect: {
    maxErrors: number;
    supportHint: "null" | "present" | "any";
    objective?: "not_yet" | "progressing" | "appears_achieved";
    objectiveAnyOf?: readonly (
      | "not_yet"
      | "progressing"
      | "appears_achieved"
    )[];
    requiredErrorCategories?: readonly CorrectionCategory[];
    replyMustContainAny?: readonly string[];
    replyMustNotContain?: readonly string[];
  };
};

export type LanguageEvalCase =
  | CorrectionEvalCase
  | ExplanationEvalCase
  | ExerciseEvalCase
  | ConversationEvalCase;

export type EvalOutputMap = {
  "languages.correct": LanguagesCorrectOutput;
  "languages.explain": LanguagesExplainOutput;
  "languages.generateExercise": LanguagesGenerateExerciseOutput;
  "languages.conversation": LanguagesConversationOutput;
};

export type LiveEvalCaseResult = {
  id: string;
  capability: EvalCapabilityId;
  language: "french" | "japanese";
  critical: boolean;
  score: number;
  passed: boolean;
  schemaValid: boolean;
  semanticValid: boolean;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  assertions: EvalAssertion[];
  manualReview: readonly string[];
  output?: unknown;
  error?: string;
};

export type LiveEvalReport = {
  generatedAt: string;
  model: "gpt-6-luna";
  cases: LiveEvalCaseResult[];
  summary: {
    totalCases: number;
    passedCases: number;
    overallScore: number;
    schemaValidityRate: number;
    semanticValidityRate: number;
    criticalPassRate: number;
    byCapability: Record<
      EvalCapabilityId,
      {
        cases: number;
        passed: number;
        score: number;
      }
    >;
    totalCostUsd: number;
    averageLatencyMs: number;
    p95LatencyMs: number;
  };
  gate: {
    passed: boolean;
    failures: string[];
  };
};
