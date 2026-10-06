# P5 — Languages Correction + Explanation

Status: Implemented

## Objective

P5 is the first product-value phase for `thiepn/ai`.

It adds two real Languages capabilities:

```text
languages.correct
languages.explain
```

Both are available only to the authenticated `languages` application identity.

## languages.correct

Purpose: evaluate learner-produced text conservatively, correct genuine errors, and keep optional naturalness improvements separate.

Input carries language ID, learner text, proficiency framework + level, optional explanation language, optional correction focus, and optional local task/context description.

Supported proficiency framework labels begin with `cefr`, `jlpt`, and `custom`. This avoids applying CEFR semantics to Japanese or future non-CEFR products.

### Output

```text
status
correctedText
summary
errors[]
suggestions[]
naturalVersion
```

Each actual error includes an ID, category, severity, original span, correction, explanation, and confidence.

### Error vs suggestion rule

```text
errors      = something actually needs correction
suggestions = acceptable language that could be more natural/stylistically preferable
```

A model preference must not silently become a learner mistake. If learner text is acceptable, the model is instructed to return `status = correct` and `errors = []` even if optional suggestions exist.

## languages.explain

Purpose: explain one selected correction, suggestion, or focused language issue without regenerating a full correction pass.

Input carries language ID, proficiency framework + level, original learner text, corrected text, one selected focus, optional learner question, and optional explanation language.

Output carries `headline`, `explanation`, `rule`, `levelFit`, two to four examples, `memoryTip`, and `nuance`.

`levelFit` is one of `core`, `useful_next_step`, or `advanced_detail`. It lets the UI keep explanations appropriate to the learner instead of dumping advanced grammar detail into every correction.

## Prompt-injection boundary

Learner text, task context, corrections, and questions are explicitly treated as data. Embedded instructions must not override system behavior. No app/database tools are available to either P5 capability.

## Context minimization

P5 does not send learner history. A correction request normally needs only language, level/framework, text, and small local context. An explanation request receives the selected correction rather than the entire learner profile.

## Existing Languages architecture alignment

The current shared Languages platform already separates learner evidence, skill/mastery projections, proficiency gates, curriculum, and orchestration. P5 does not create a parallel AI mastery model.

AI feedback is an interpretation layer only. Any future conversion of correction feedback into a StudyEvent remains owned by `thiepn/languages` and must follow its existing evidence rules.

## Static frontend boundary

The current Languages shell is compatible with static GitHub Pages deployment. Therefore `@thiepn/ai` must not be imported into the browser bundle because it requires the Languages HMAC secret.

See [Languages integration boundary](languages-integration.md).

## SDK

P5 extends `@thiepn/ai` typing so callers receive compile-time contracts for both capabilities.

Example:

```ts
const correction = await ai.run("languages.correct", {
  languageId: "french",
  text: "Hier je vais au magasin.",
  proficiency: { framework: "cefr", level: "A2" }
});

correction.data.errors;
correction.data.suggestions;
```

## Limits

`languages.correct` uses low reasoning, an 8192 conservative input ceiling, 1200 max output tokens, and 30/minute + 500/day capability limits.

`languages.explain` uses low reasoning, an 8192 conservative input ceiling, 1000 max output tokens, and 30/minute + 500/day capability limits.

## P5 acceptance

- [x] `languages.correct` exists
- [x] `languages.explain` exists
- [x] both are Languages-only
- [x] CEFR, JLPT, and custom level context are represented without conflation
- [x] correction schema separates errors from naturalness suggestions
- [x] errors have category, severity, and confidence
- [x] correct learner text can remain correct without forced edits
- [x] explanation is scoped to one issue
- [x] explanation depth is level-aware
- [x] prompts treat learner content as untrusted data
- [x] no global learner history is required
- [x] no learner-state/proficiency authority moves into AI
- [x] SDK contracts expose both capabilities
- [x] static Languages frontend secret boundary is documented
- [x] contract and authorization tests exist

## Deferred to P6

P6 adds targeted exercise generation and adaptive conversation. Those capabilities will reuse the same correction categories and proficiency context rather than inventing a second language-feedback vocabulary.
