export type LanguageProficiencyFramework =
  | "cefr"
  | "jlpt"
  | "custom";

export type LanguageProficiency = {
  framework: LanguageProficiencyFramework;
  level: string;
};

export type LanguageCorrectionCategory =
  | "grammar"
  | "tense_aspect"
  | "agreement"
  | "conjugation"
  | "word_order"
  | "article_determiner"
  | "preposition"
  | "pronoun"
  | "vocabulary"
  | "collocation"
  | "idiom_naturalness"
  | "spelling"
  | "punctuation"
  | "register"
  | "script"
  | "other";

export type LanguageCorrectionError = {
  id: string;
  category: LanguageCorrectionCategory;
  severity: "minor" | "major";
  original: string;
  correction: string;
  explanation: string;
  confidence: "high" | "medium" | "low";
};

export type LanguageNaturalnessSuggestion = {
  original: string;
  suggestion: string;
  reason: string;
};

export type LanguageExplanationExample = {
  target: string;
  meaning: string | null;
  note: string | null;
};

export interface ThiepnAICapabilityMap {
  "core.smoke": {
    input: {
      text: string;
    };
    output: {
      reply: string;
    };
  };

  "languages.correct": {
    input: {
      languageId: string;
      text: string;
      proficiency: LanguageProficiency;
      explanationLanguage?: string;
      focus?:
        | "accuracy"
        | "accuracy_and_naturalness";
      context?: string;
    };
    output: {
      status: "correct" | "needs_correction";
      correctedText: string;
      summary: string;
      errors: LanguageCorrectionError[];
      suggestions: LanguageNaturalnessSuggestion[];
      naturalVersion: string | null;
    };
  };

  "languages.explain": {
    input: {
      languageId: string;
      proficiency: LanguageProficiency;
      sourceText: string;
      correctedText: string;
      focus: {
        type: "error" | "suggestion" | "general";
        original: string;
        correction: string;
        category: LanguageCorrectionCategory | null;
      };
      explanationLanguage?: string;
      question?: string;
    };
    output: {
      headline: string;
      explanation: string;
      rule: string;
      levelFit:
        | "core"
        | "useful_next_step"
        | "advanced_detail";
      examples: LanguageExplanationExample[];
      memoryTip: string | null;
      nuance: string | null;
    };
  };
}

export type CapabilityId = keyof ThiepnAICapabilityMap;

export type CapabilityInput<K extends CapabilityId> =
  ThiepnAICapabilityMap[K]["input"];

export type CapabilityOutput<K extends CapabilityId> =
  ThiepnAICapabilityMap[K]["output"];

export type ServiceErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "UNKNOWN_CAPABILITY"
  | "INVALID_INPUT"
  | "INPUT_TOO_LARGE"
  | "RATE_LIMITED"
  | "BUDGET_EXCEEDED"
  | "MODEL_TIMEOUT"
  | "MODEL_UNAVAILABLE"
  | "MODEL_REFUSED"
  | "INVALID_MODEL_OUTPUT"
  | "TOOL_REJECTED"
  | "INTERNAL_ERROR";

export type ClientErrorCode =
  | ServiceErrorCode
  | "INVALID_RESPONSE"
  | "NETWORK_ERROR"
  | "TIMEOUT"
  | "INVALID_CONFIGURATION";

export type RunMeta<K extends CapabilityId = CapabilityId> = {
  capability: K;
  version: number;
  requestId: string;
  model: "gpt-6-luna";
};

export type RunResult<
  K extends CapabilityId = CapabilityId
> = {
  data: CapabilityOutput<K>;
  meta: RunMeta<K>;
};

export type RunOptions = {
  requestId?: string;
  signal?: AbortSignal;
};

export type ThiepnAIClientOptions = {
  baseUrl: string;
  appId: string;
  appSecret: string;
  timeoutMs?: number;
  fetch?: typeof globalThis.fetch;
};

export type ServiceSuccess = {
  ok: true;
  data: unknown;
  meta: {
    capability: string;
    version: number;
    requestId: string;
    model: string;
  };
};

export type ServiceFailure = {
  ok: false;
  error: {
    code: ServiceErrorCode;
    message: string;
    requestId: string;
  };
};
