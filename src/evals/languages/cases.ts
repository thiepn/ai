import type { LanguageEvalCase } from "../types.js";

export const languageEvalCases: readonly LanguageEvalCase[] = [
  {
    id: "correct-fr-valid-a2-01",
    capability: "languages.correct",
    language: "french",
    critical: true,
    description:
      "Do not manufacture an error in a simple correct A2 habitual sentence.",
    input: {
      languageId: "french",
      text: "Je vais à la bibliothèque tous les jours.",
      proficiency: { framework: "cefr", level: "A2" }
    },
    expect: {
      status: "correct",
      minErrors: 0,
      maxErrors: 0,
      preserveInputWhenCorrect: true
    },
    manualReview: [
      "Any suggestion should be genuinely optional rather than a disguised correction."
    ]
  },
  {
    id: "correct-fr-past-a2-01",
    capability: "languages.correct",
    language: "french",
    description:
      "Detect present tense used for a completed event introduced by hier.",
    input: {
      languageId: "french",
      text: "Hier je vais au magasin.",
      proficiency: { framework: "cefr", level: "A2" }
    },
    expect: {
      status: "needs_correction",
      minErrors: 1,
      maxErrors: 3,
      requiredCategories: ["tense_aspect"]
    },
    manualReview: [
      "Correction should preserve the intended meaning.",
      "Explanation should be accessible at A2."
    ]
  },
  {
    id: "correct-fr-valid-register-01",
    capability: "languages.correct",
    language: "french",
    critical: true,
    description:
      "Accept a standard negative sentence without stylistic overcorrection.",
    input: {
      languageId: "french",
      text: "Je ne sais pas.",
      proficiency: { framework: "cefr", level: "A1" }
    },
    expect: {
      status: "correct",
      minErrors: 0,
      maxErrors: 0,
      preserveInputWhenCorrect: true
    },
    manualReview: [
      "Do not replace the sentence merely to sound more conversational."
    ]
  },
  {
    id: "correct-ja-valid-n4-01",
    capability: "languages.correct",
    language: "japanese",
    critical: true,
    description:
      "Accept a correct polite Japanese past-tense sentence.",
    input: {
      languageId: "japanese",
      text: "昨日、学校に行きました。",
      proficiency: { framework: "jlpt", level: "N4" }
    },
    expect: {
      status: "correct",
      minErrors: 0,
      maxErrors: 0,
      preserveInputWhenCorrect: true
    },
    manualReview: [
      "Punctuation variation must not be treated as a learner error."
    ]
  },
  {
    id: "correct-ja-tense-n4-01",
    capability: "languages.correct",
    language: "japanese",
    description:
      "Detect non-past polite form conflicting with an explicit yesterday context.",
    input: {
      languageId: "japanese",
      text: "昨日、学校に行きます。",
      proficiency: { framework: "jlpt", level: "N4" }
    },
    expect: {
      status: "needs_correction",
      minErrors: 1,
      maxErrors: 2,
      requiredCategories: ["tense_aspect"]
    },
    manualReview: [
      "Expected correction should use 行きました without inventing other edits."
    ]
  },
  {
    id: "correct-ja-valid-request-01",
    capability: "languages.correct",
    language: "japanese",
    critical: true,
    description:
      "Accept a natural polite request in a café/shop context.",
    input: {
      languageId: "japanese",
      text: "コーヒーをお願いします。",
      proficiency: { framework: "jlpt", level: "N5" }
    },
    expect: {
      status: "correct",
      minErrors: 0,
      maxErrors: 0,
      preserveInputWhenCorrect: true
    },
    manualReview: [
      "Do not force a different politeness formula."
    ]
  },

  {
    id: "explain-fr-passe-compose-a2-01",
    capability: "languages.explain",
    language: "french",
    description:
      "Explain a completed past action at A2 without unnecessary advanced theory.",
    input: {
      languageId: "french",
      proficiency: { framework: "cefr", level: "A2" },
      sourceText: "Hier je vais au magasin.",
      correctedText: "Hier, je suis allé au magasin.",
      focus: {
        type: "error",
        original: "je vais",
        correction: "je suis allé",
        category: "tense_aspect"
      },
      question: "Why can't I use the present here?"
    },
    expect: {
      levelFit: "core",
      minExamples: 2,
      maxExamples: 4,
      requiredTermsAny: ["past", "hier", "passé composé"],
      forbiddenTerms: ["subjonctif imparfait"]
    },
    manualReview: [
      "Examples should directly reinforce completed past actions."
    ]
  },
  {
    id: "explain-fr-au-a2-01",
    capability: "languages.explain",
    language: "french",
    description:
      "Explain the contraction à + le -> au in a focused way.",
    input: {
      languageId: "french",
      proficiency: { framework: "cefr", level: "A2" },
      sourceText: "Je vais à le cinéma.",
      correctedText: "Je vais au cinéma.",
      focus: {
        type: "error",
        original: "à le",
        correction: "au",
        category: "article_determiner"
      }
    },
    expect: {
      levelFit: "core",
      minExamples: 2,
      maxExamples: 4,
      requiredTermsAny: ["à + le", "au", "contraction"]
    },
    manualReview: [
      "Rule should not be generalized to feminine nouns where à la remains separate."
    ]
  },
  {
    id: "explain-ja-past-n4-01",
    capability: "languages.explain",
    language: "japanese",
    description:
      "Explain polite past 行きました versus 行きます for 昨日.",
    input: {
      languageId: "japanese",
      proficiency: { framework: "jlpt", level: "N4" },
      sourceText: "昨日、学校に行きます。",
      correctedText: "昨日、学校に行きました。",
      focus: {
        type: "error",
        original: "行きます",
        correction: "行きました",
        category: "tense_aspect"
      }
    },
    expect: {
      levelFit: "core",
      minExamples: 2,
      maxExamples: 4,
      requiredTermsAny: ["past", "ました", "昨日"]
    },
    manualReview: [
      "Explanation should not imply Japanese tense works identically to English."
    ]
  },
  {
    id: "explain-ja-particle-n4-01",
    capability: "languages.explain",
    language: "japanese",
    description:
      "Explain a focused destination particle correction.",
    input: {
      languageId: "japanese",
      proficiency: { framework: "jlpt", level: "N4" },
      sourceText: "学校を行きます。",
      correctedText: "学校に行きます。",
      focus: {
        type: "error",
        original: "を",
        correction: "に",
        category: "grammar"
      }
    },
    expect: {
      levelFit: "core",
      minExamples: 2,
      maxExamples: 4,
      requiredTermsAny: ["に", "destination", "行き"]
    },
    manualReview: [
      "Explanation should stay focused on destination marking rather than claiming を is never used with movement verbs."
    ]
  },

  {
    id: "exercise-fr-past-a2-01",
    capability: "languages.generateExercise",
    language: "french",
    description:
      "Generate three focused passé composé practice items using only supplied targets.",
    input: {
      languageId: "french",
      proficiency: { framework: "cefr", level: "A2" },
      targets: {
        skillIds: ["sentence-transfer"],
        correctionCategories: ["tense_aspect", "conjugation"],
        learnerNotes: [
          "Recent trouble choosing passé composé auxiliaries."
        ]
      },
      count: 3,
      exerciseTypes: ["fill_blank", "rewrite", "translation"]
    },
    expect: {
      count: 3,
      requireTargetSignal: true,
      forbidPromptAnswerLeak: true
    },
    manualReview: [
      "Items should not all test the exact same surface pattern.",
      "Answer keys should be linguistically valid."
    ]
  },
  {
    id: "exercise-fr-prepositions-a2-01",
    capability: "languages.generateExercise",
    language: "french",
    description:
      "Generate short preposition practice without inventing curriculum skills.",
    input: {
      languageId: "french",
      proficiency: { framework: "cefr", level: "A2" },
      targets: {
        skillIds: ["sentence-transfer"],
        correctionCategories: ["preposition"]
      },
      count: 2,
      exerciseTypes: ["fill_blank", "short_response"],
      topic: "everyday places in a city"
    },
    expect: {
      count: 2,
      requireTargetSignal: true,
      forbidPromptAnswerLeak: true
    },
    manualReview: [
      "Examples should be ordinary A2 contexts rather than obscure exceptions."
    ]
  },
  {
    id: "exercise-ja-particles-n4-01",
    capability: "languages.generateExercise",
    language: "japanese",
    description:
      "Generate Japanese N4 particle practice from explicit targets.",
    input: {
      languageId: "japanese",
      proficiency: { framework: "jlpt", level: "N4" },
      targets: {
        skillIds: ["sentence-transfer"],
        correctionCategories: ["grammar"]
      },
      count: 3,
      exerciseTypes: ["fill_blank", "multiple_choice"]
    },
    expect: {
      count: 3,
      requireTargetSignal: true,
      forbidPromptAnswerLeak: true
    },
    manualReview: [
      "Distractors should be plausible rather than obviously absurd.",
      "Prompt should provide enough context for a single defensible answer."
    ]
  },
  {
    id: "exercise-ja-past-n4-01",
    capability: "languages.generateExercise",
    language: "japanese",
    description:
      "Generate Japanese polite past practice at N4.",
    input: {
      languageId: "japanese",
      proficiency: { framework: "jlpt", level: "N4" },
      targets: {
        skillIds: ["sentence-transfer"],
        correctionCategories: ["tense_aspect", "conjugation"]
      },
      count: 2,
      exerciseTypes: ["rewrite", "translation"],
      topic: "what happened yesterday"
    },
    expect: {
      count: 2,
      requireTargetSignal: true,
      forbidPromptAnswerLeak: true
    },
    manualReview: [
      "Items should remain within common N4-level language."
    ]
  },

  {
    id: "conversation-fr-cafe-a2-01",
    capability: "languages.conversation",
    language: "french",
    description:
      "Continue a successful café interaction without unnecessary English support.",
    input: {
      languageId: "french",
      proficiency: { framework: "cefr", level: "A2" },
      scenario: {
        title: "At a café",
        setting: "A café in Lyon during breakfast.",
        learnerRole: "Customer",
        partnerRole: "Server",
        objective:
          "Order a drink and food, then ask for the price."
      },
      history: [
        {
          role: "partner",
          text: "Bonjour ! Vous désirez ?"
        }
      ],
      learnerMessage:
        "Je voudrais un café et un croissant, s'il vous plaît.",
      targets: {
        skillIds: ["conversation"],
        correctionCategories: [],
        vocabulary: ["je voudrais", "combien"]
      },
      supportMode: "immersion",
      correctionMode: "minimal"
    },
    expect: {
      maxErrors: 0,
      supportHint: "null",
      objective: "progressing",
      replyMustNotContain: [
        "In English",
        "English:"
      ]
    },
    manualReview: [
      "Partner should naturally continue the café scenario and invite the learner toward asking the price."
    ]
  },
  {
    id: "conversation-fr-cafe-error-a2-01",
    capability: "languages.conversation",
    language: "french",
    description:
      "Keep conversation moving while correcting at most a small number of useful errors.",
    input: {
      languageId: "french",
      proficiency: { framework: "cefr", level: "A2" },
      scenario: {
        title: "At a café",
        setting: "A café in Lyon.",
        learnerRole: "Customer",
        partnerRole: "Server",
        objective: "Order and ask the price."
      },
      history: [],
      learnerMessage:
        "Je veux un café. Combien il coûte ?",
      supportMode: "balanced",
      correctionMode: "balanced"
    },
    expect: {
      maxErrors: 2,
      supportHint: "any"
    },
    manualReview: [
      "Feedback should not overwhelm the conversational reply.",
      "A valid correction should preserve the intended price question."
    ]
  },
  {
    id: "conversation-ja-shop-n4-01",
    capability: "languages.conversation",
    language: "japanese",
    description:
      "Continue a simple shop interaction in Japanese at N4.",
    input: {
      languageId: "japanese",
      proficiency: { framework: "jlpt", level: "N4" },
      scenario: {
        title: "Convenience store",
        setting: "A convenience store in Tokyo.",
        learnerRole: "Customer",
        partnerRole: "Cashier",
        objective:
          "Ask where bottled water is and thank the cashier."
      },
      history: [
        {
          role: "partner",
          text: "いらっしゃいませ。"
        }
      ],
      learnerMessage:
        "すみません、水はどこですか。",
      supportMode: "immersion",
      correctionMode: "minimal"
    },
    expect: {
      maxErrors: 0,
      supportHint: "null",
      objective: "progressing",
      replyMustContainAny: [
        "水",
        "こちら",
        "あちら",
        "です"
      ],
      replyMustNotContain: [
        "In English",
        "English:"
      ]
    },
    manualReview: [
      "Reply should sound like a plausible cashier and stay within a learner-friendly register."
    ]
  },
  {
    id: "conversation-ja-support-n4-01",
    capability: "languages.conversation",
    language: "japanese",
    description:
      "Provide bounded support when the learner explicitly struggles.",
    input: {
      languageId: "japanese",
      proficiency: { framework: "jlpt", level: "N4" },
      scenario: {
        title: "Train station",
        setting: "A station information desk.",
        learnerRole: "Traveler",
        partnerRole: "Station staff",
        objective:
          "Ask which platform the train to Kyoto leaves from."
      },
      history: [],
      learnerMessage:
        "京都... train... どこですか？",
      supportMode: "supported",
      correctionMode: "coach",
      explanationLanguage: "English"
    },
    expect: {
      maxErrors: 4,
      supportHint: "present"
    },
    manualReview: [
      "Support should help the learner form the next Japanese utterance without replacing the whole interaction with English."
    ]
  }
];

export function selectLanguageEvalCases(args?: {
  suite?: "all" | "french" | "japanese";
  limit?: number;
}): readonly LanguageEvalCase[] {
  const suite = args?.suite ?? "all";
  const filtered =
    suite === "all"
      ? languageEvalCases
      : languageEvalCases.filter(
          (item) => item.language === suite
        );

  if (
    args?.limit === undefined ||
    args.limit >= filtered.length
  ) {
    return filtered;
  }

  return filtered.slice(0, Math.max(0, args.limit));
}
