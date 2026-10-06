# P6 — Targeted Exercises + Adaptive Conversation

Status: Implemented

## Objective

P6 completes the initial Languages feature set with:

```text
languages.generateExercise
languages.conversation
```

Together with P5:

```text
languages.correct
languages.explain
languages.generateExercise
languages.conversation
```

now form the first complete product pilot for `thiepn/ai`.

## Core boundary

P6 does not ask the model to discover a hidden learner model.

The Languages product supplies explicit weakness and skill targets from its authoritative learner/orchestration systems.

The AI generates practice and conversation behavior from those targets.

```text
Languages learner state
        |
        | explicit selected targets
        v
thiepn/ai
        |
        | generated practice/dialogue
        v
Languages interaction
        |
        | actual learner evidence
        v
Languages learner engine
```

## languages.generateExercise

The capability generates one to eight practice items.

Input includes:

- language ID;
- proficiency framework + level;
- explicit product skill IDs;
- explicit correction categories;
- optional learner notes;
- optional exercise count;
- optional exercise-type restrictions;
- optional topic;
- explanation language.

Supported exercise types:

```text
fill_blank
rewrite
translation
multiple_choice
short_response
sentence_build
```

Each generated item contains:

```text
id
type
prompt
choices
expectedAnswer
acceptedAnswers
explanation
targetSkillIds
categories
difficulty
```

Difficulty is deliberately coarse:

```text
on_level
stretch
```

The generator may not invent product skill IDs. It may only echo IDs supplied by Languages.

### Answer-key boundary

The generated explanation and expected answers are answer-key material.

The consuming product controls when they are revealed.

P6 does not claim generated items are validated assessment instruments. They are practice content.

## languages.conversation

Conversation is one explicit turn at a time.

The service does not own a conversation database or hidden memory.

Each request contains:

- language ID;
- framework + level;
- scenario definition;
- up to 16 previous messages;
- current learner message;
- optional explicit target skills/categories/vocabulary;
- support mode;
- correction mode;
- explanation language.

### Support modes

```text
immersion
balanced
supported
```

### Correction modes

```text
minimal
balanced
coach
```

The model is instructed to keep the scenario moving rather than turning every turn into a correction lesson.

### Output

```text
reply
supportHint

feedback:
  summary
  errors[]
  suggestions[]

turnSignal:
  difficulty
  nextDifficulty
  objective
  rationale
```

Difficulty signals:

```text
comfortable
productive_struggle
too_hard
unclear
```

Next-turn suggestion:

```text
easier
same
harder
```

Objective signal:

```text
not_yet
progressing
appears_achieved
```

The wording `appears_achieved` is intentional. It is an advisory interpretation of the supplied dialogue, not persisted learning progress.

## No AI-owned score

P6 deliberately does not return:

- proficiency scores;
- mastery scores;
- XP;
- promotion;
- streak changes;
- durable learner-state updates.

Those belong to Languages.

## Stateless conversation

A conversation turn can depend only on the context explicitly supplied in that request.

The history limit is 16 messages and each message is bounded.

This provides:

- predictable privacy;
- predictable cost;
- easier debugging;
- deterministic app ownership of session history;
- no invisible cross-session memory.

## Prompt-injection boundary

Scenario text, learner history, learner messages, target vocabulary, learner notes, and topics are untrusted data.

They cannot expand permissions or override the capability rules.

Neither P6 capability has application tools.

## Product alignment

The current French shared learning profile already contains skills such as:

```text
sentence-transfer
speaking
conversation
missions
```

P6 accepts those product-owned IDs as opaque targets rather than duplicating the Languages skill graph inside `thiepn/ai`.

This also supports Japanese and future language packs without adding language-name conditionals to the AI core.

## Limits

`languages.generateExercise`:

```text
input ceiling:  8192
output maximum: 2000 tokens
rate:           20/minute, 300/day
```

`languages.conversation`:

```text
input ceiling:  16384
output maximum: 1500 tokens
rate:           30/minute, 600/day
history:        maximum 16 messages
```

Both use GPT-6 Luna with low reasoning.

## SDK

The shared `@thiepn/ai` client now exposes typed calls for:

```ts
ai.run("languages.generateExercise", ...)
ai.run("languages.conversation", ...)
```

including exercise types, generated exercise records, and conversation history types.

## P6 acceptance

- [x] targeted exercise capability exists
- [x] exercise targets come from Languages, not model inference
- [x] exercise count and output are bounded
- [x] practice answer keys are structured
- [x] product skill IDs cannot be silently invented by contract intent
- [x] conversation capability exists
- [x] conversation history is explicit and bounded
- [x] no hidden AI conversation memory exists
- [x] support and correction intensity are explicit
- [x] errors and naturalness suggestions reuse P5 taxonomy
- [x] next-turn difficulty is advisory
- [x] scenario objective signal is non-authoritative
- [x] no AI-owned mastery/proficiency score exists
- [x] both capabilities are Languages-only
- [x] SDK exposes both capabilities
- [x] contract tests cover bounds and authority rules

## Next phase

P7 is not another feature phase.

P7 builds the evaluation suite that determines whether these four capabilities are actually reliable enough to use:

```text
correction
explanation
exercise generation
conversation
```

It should include deterministic contract tests plus curated quality cases and, where credentials are available, controlled live Luna evaluations.
