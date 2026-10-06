import type {
  ConversationEvalCase,
  CorrectionEvalCase,
  EvalAssertion,
  EvalGrade,
  ExerciseEvalCase,
  ExplanationEvalCase,
  LanguageEvalCase
} from "./types.js";
import type { LanguagesConversationOutput } from "../capabilities/languages/conversation.js";
import type { LanguagesCorrectOutput } from "../capabilities/languages/correct.js";
import type { LanguagesExplainOutput } from "../capabilities/languages/explain.js";
import type { LanguagesGenerateExerciseOutput } from "../capabilities/languages/exercise.js";

function assertion(
  id: string,
  passed: boolean,
  weight: number,
  detail?: string
): EvalAssertion {
  return detail === undefined
    ? { id, passed, weight }
    : { id, passed, weight, detail };
}

function finalize(
  assertions: EvalAssertion[]
): EvalGrade {
  const totalWeight = assertions.reduce(
    (sum, item) => sum + item.weight,
    0
  );
  const passedWeight = assertions.reduce(
    (sum, item) =>
      sum + (item.passed ? item.weight : 0),
    0
  );

  return {
    score:
      totalWeight === 0
        ? 1
        : passedWeight / totalWeight,
    passedWeight,
    totalWeight,
    assertions
  };
}

function normalizedText(parts: unknown[]): string {
  return parts
    .flatMap((part) =>
      typeof part === "string"
        ? [part]
        : Array.isArray(part)
          ? part.filter(
              (item): item is string =>
                typeof item === "string"
            )
          : []
    )
    .join(" ")
    .toLocaleLowerCase();
}

function gradeCorrection(
  item: CorrectionEvalCase,
  output: LanguagesCorrectOutput
): EvalGrade {
  const assertions: EvalAssertion[] = [];

  assertions.push(
    assertion(
      "status",
      output.status === item.expect.status,
      3,
      `expected ${item.expect.status}, received ${output.status}`
    )
  );

  assertions.push(
    assertion(
      "error-count-min",
      output.errors.length >= item.expect.minErrors,
      1,
      `expected >= ${item.expect.minErrors}, received ${output.errors.length}`
    ),
    assertion(
      "error-count-max",
      output.errors.length <= item.expect.maxErrors,
      2,
      `expected <= ${item.expect.maxErrors}, received ${output.errors.length}`
    )
  );

  const actualCategories = new Set(
    output.errors.map((error) => error.category)
  );

  for (const category of
    item.expect.requiredCategories ?? []) {
    assertions.push(
      assertion(
        `required-category:${category}`,
        actualCategories.has(category),
        2
      )
    );
  }

  for (const category of
    item.expect.forbiddenCategories ?? []) {
    assertions.push(
      assertion(
        `forbidden-category:${category}`,
        !actualCategories.has(category),
        2
      )
    );
  }

  if (item.expect.preserveInputWhenCorrect) {
    assertions.push(
      assertion(
        "preserve-correct-input",
        output.correctedText.trim() ===
          item.input.text.trim(),
        3,
        "correct input should not be silently rewritten"
      )
    );
  }

  return finalize(assertions);
}

function explanationCorpus(
  output: LanguagesExplainOutput
): string {
  return normalizedText([
    output.headline,
    output.explanation,
    output.rule,
    output.memoryTip ?? "",
    output.nuance ?? "",
    output.examples.flatMap((example) => [
      example.target,
      example.meaning ?? "",
      example.note ?? ""
    ])
  ]);
}

function gradeExplanation(
  item: ExplanationEvalCase,
  output: LanguagesExplainOutput
): EvalGrade {
  const assertions: EvalAssertion[] = [
    assertion(
      "example-count-min",
      output.examples.length >= item.expect.minExamples,
      1
    ),
    assertion(
      "example-count-max",
      output.examples.length <= item.expect.maxExamples,
      1
    )
  ];

  if (item.expect.levelFit) {
    assertions.push(
      assertion(
        "level-fit",
        output.levelFit === item.expect.levelFit,
        2,
        `expected ${item.expect.levelFit}, received ${output.levelFit}`
      )
    );
  }

  const corpus = explanationCorpus(output);

  if (
    item.expect.requiredTermsAny &&
    item.expect.requiredTermsAny.length > 0
  ) {
    const matched =
      item.expect.requiredTermsAny.some((term) =>
        corpus.includes(term.toLocaleLowerCase())
      );

    assertions.push(
      assertion(
        "required-concept",
        matched,
        3,
        `expected one of: ${item.expect.requiredTermsAny.join(", ")}`
      )
    );
  }

  for (const term of item.expect.forbiddenTerms ?? []) {
    assertions.push(
      assertion(
        `forbidden-term:${term}`,
        !corpus.includes(term.toLocaleLowerCase()),
        2
      )
    );
  }

  return finalize(assertions);
}

function promptLeaksAnswer(
  prompt: string,
  expectedAnswer: string
): boolean {
  const normalizedPrompt = prompt
    .trim()
    .toLocaleLowerCase();
  const normalizedAnswer = expectedAnswer
    .trim()
    .toLocaleLowerCase();

  if (normalizedAnswer.length === 0) {
    return false;
  }

  return normalizedPrompt.includes(normalizedAnswer);
}

function gradeExercise(
  item: ExerciseEvalCase,
  output: LanguagesGenerateExerciseOutput
): EvalGrade {
  const assertions: EvalAssertion[] = [
    assertion(
      "exercise-count",
      output.exercises.length === item.expect.count,
      3,
      `expected ${item.expect.count}, received ${output.exercises.length}`
    )
  ];

  if (item.expect.requireTargetSignal) {
    const everyExerciseTargets =
      output.exercises.every(
        (exercise) =>
          exercise.targetSkillIds.length > 0 ||
          exercise.categories.length > 0
      );

    assertions.push(
      assertion(
        "target-signal",
        everyExerciseTargets,
        3,
        "every generated exercise should identify at least one supplied target"
      )
    );
  }

  if (item.expect.forbidPromptAnswerLeak) {
    const noLeaks = output.exercises.every(
      (exercise) =>
        !promptLeaksAnswer(
          exercise.prompt,
          exercise.expectedAnswer
        )
    );

    assertions.push(
      assertion(
        "no-answer-leak",
        noLeaks,
        2
      )
    );
  }

  return finalize(assertions);
}

function gradeConversation(
  item: ConversationEvalCase,
  output: LanguagesConversationOutput
): EvalGrade {
  const assertions: EvalAssertion[] = [
    assertion(
      "max-errors",
      output.feedback.errors.length <=
        item.expect.maxErrors,
      2,
      `expected <= ${item.expect.maxErrors}, received ${output.feedback.errors.length}`
    )
  ];

  if (item.expect.supportHint === "null") {
    assertions.push(
      assertion(
        "support-hint-null",
        output.supportHint === null,
        2
      )
    );
  } else if (
    item.expect.supportHint === "present"
  ) {
    assertions.push(
      assertion(
        "support-hint-present",
        output.supportHint !== null,
        2
      )
    );
  }

  if (item.expect.objective) {
    assertions.push(
      assertion(
        "objective-signal",
        output.turnSignal.objective ===
          item.expect.objective,
        1,
        `expected ${item.expect.objective}, received ${output.turnSignal.objective}`
      )
    );
  }

  const reply = output.reply.toLocaleLowerCase();

  if (
    item.expect.replyMustContainAny &&
    item.expect.replyMustContainAny.length > 0
  ) {
    assertions.push(
      assertion(
        "reply-required-signal",
        item.expect.replyMustContainAny.some(
          (term) =>
            reply.includes(term.toLocaleLowerCase())
        ),
        2
      )
    );
  }

  for (const term of
    item.expect.replyMustNotContain ?? []) {
    assertions.push(
      assertion(
        `reply-forbidden:${term}`,
        !reply.includes(term.toLocaleLowerCase()),
        2
      )
    );
  }

  return finalize(assertions);
}

export function gradeLanguageEvalCase(
  item: LanguageEvalCase,
  output: unknown
): EvalGrade {
  switch (item.capability) {
    case "languages.correct":
      return gradeCorrection(
        item,
        output as LanguagesCorrectOutput
      );
    case "languages.explain":
      return gradeExplanation(
        item,
        output as LanguagesExplainOutput
      );
    case "languages.generateExercise":
      return gradeExercise(
        item,
        output as LanguagesGenerateExerciseOutput
      );
    case "languages.conversation":
      return gradeConversation(
        item,
        output as LanguagesConversationOutput
      );
  }
}
