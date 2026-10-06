# Data and Context Rules

## Principle

Send the model the minimum context required to complete the current capability well.

More context is not automatically better.

Benefits:

- lower cost
- lower latency
- less accidental disclosure
- fewer irrelevant instructions
- easier debugging
- more predictable behavior

## Ownership

Application data remains owned by the application that created it.

`thiepn/ai` does not become a duplicate system of record.

Examples:

```text
Languages -> learner history
Recipe    -> saved recipes
StudyOS   -> courses, notes, progress
Selah     -> study notes
Diet      -> food records
```

The AI service may receive selected slices temporarily for a request.

## No global memory in initial platform

P0-P8 must not implement:

- universal user profile injected into every prompt
- automatic cross-app history
- persistent conversational memory shared across apps
- vectorization of all user data "just in case"

If a future cross-app assistant needs context, that access must be explicit, permissioned, and designed as a new feature.

## Context assembly

The capability defines what context it accepts.

Example:

```ts
languages.generateExercise({
  targetLanguage,
  cefrLevel,
  targetSkill,
  recentMistakes: selectRelevantMistakes(10)
})
```

Do not send the learner's entire historical database.

## Search pattern

For natural-language search:

```text
user query
  -> model interprets intent / filters
  -> authoritative app search executes
  -> app returns exact records
  -> optional model formatting
```

The model must not invent records when search returns none.

## Calculations and factual state

If a deterministic source exists, use it.

Examples:

- nutrition engine calculates macros
- chess engine evaluates positions
- database returns saved recipes
- calendar returns actual events
- study system returns actual completion status

The LLM may explain or transform those outputs but must not replace them as ground truth.

## Retention

Initial service design should avoid persistent storage of raw model input/output unless a specific product capability requires it.

Persist operational metadata separately from product content.

Capability-specific product data belongs back in the originating app when intentionally saved.
