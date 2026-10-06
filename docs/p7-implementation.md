# P7 — Evaluation Suite + Reliability Hardening

Status: Implemented

## Objective

P7 stops feature expansion and establishes a repeatable quality gate for the four Languages capabilities:

```text
languages.correct
languages.explain
languages.generateExercise
languages.conversation
```

The goal is not to prove that an LLM is infallible. The goal is to make quality measurable, regressions visible, and deployment decisions evidence-based.

## Two evaluation layers

### 1. Deterministic CI-safe evaluation

Runs on every normal CI build without calling a model.

It verifies:

- curated eval IDs are unique;
- all four capabilities are represented;
- both French and Japanese are represented for every capability;
- eval inputs still satisfy current capability schemas;
- critical cases remain focused on false-positive correction safety;
- graders reward valid outputs and penalize known bad outputs;
- report gating behaves correctly.

Command:

```text
npm run eval:static
```

### 2. Controlled live Luna evaluation

A separate manual GitHub Actions workflow calls GPT-6 Luna.

It requires an explicit `OPENAI_API_KEY` Actions secret and is never triggered by normal pushes or pull requests.

Command:

```text
THIEPN_AI_LIVE_EVAL_ACK=yes OPENAI_API_KEY=... npm run eval:live
```

Optional filters:

```text
EVAL_SUITE=all|french|japanese
EVAL_LIMIT=<positive integer>
EVAL_OUTPUT_PATH=<path>
```

The acknowledgement variable is mandatory to make accidental paid evaluation harder.

## Curated suite

P7 begins with 18 cases:

```text
correction     6
explanation    4
exercise       4
conversation   4
total         18
```

Every capability contains both French and Japanese cases.

The suite deliberately includes ordinary valid learner language because false-positive correction is one of the most damaging failure modes for a learning product.

## Critical cases

Critical cases currently test:

> Does the correction capability leave valid learner language alone?

Critical examples include:

- correct French A2 habitual language;
- correct French negation;
- correct Japanese N4 polite past;
- correct Japanese polite request language.

A critical failure blocks the live gate even if average quality remains high.

## Deterministic graders

P7 does not use Luna to judge Luna.

Each case uses narrow deterministic checks designed around facts the fixture can establish safely.

Examples:

### Correction

- expected correct/needs-correction status;
- minimum/maximum error count;
- required/forbidden error categories;
- preservation of already-correct input.

### Explanation

- example count;
- expected level-fit classification;
- presence of at least one relevant concept marker;
- absence of known distracting advanced concepts.

The concept checks do not require exact wording.

### Exercises

- requested item count;
- each item identifies an explicit supplied target;
- prompt does not trivially reveal the answer.

Capability-level semantic validation separately enforces:

- no invented skill IDs;
- no invented correction categories;
- requested exercise-type compliance;
- valid multiple-choice answer keys.

### Conversation

- bounded correction count;
- support-hint behavior;
- scenario-objective signal when deterministic enough to expect;
- simple required/forbidden reply signals.

Naturalness, pedagogical quality, distractor quality, and target-language register are also listed as manual-review questions where deterministic grading would overclaim certainty.

## Live report

The live runner records per case:

```text
case ID
capability
language
critical flag
machine score
pass/fail
schema validity
semantic validity
latency
input tokens
output tokens
estimated cost
assertion results
manual-review questions
raw curated-case output
error, if any
```

The generated report is written by default to:

```text
artifacts/evals/live-report.json
```

The manual GitHub workflow uploads this file as an artifact even when the gate fails.

## Release thresholds

Initial P7 thresholds are intentionally strict where failure is objective:

```text
individual case pass         >= 0.80
overall machine score        >= 0.90
per-capability score         >= 0.85
schema validity              = 100%
semantic validity            = 100%
critical pass rate           = 100%
average model cost/case      <= $0.01
```

Latency is recorded but not used as a hard release gate in P7 because provider/network latency can vary independently of product correctness.

These thresholds are versioned code, not informal expectations.

## Human review boundary

Machine score is not sufficient to certify language pedagogy.

The report includes manual-review questions such as:

- Is a suggestion actually optional?
- Is an explanation level-appropriate?
- Are exercise distractors plausible?
- Is Japanese register natural?
- Does conversation feedback overwhelm the interaction?

P8 real-world qualification will use this evidence alongside actual product behavior.

## Cost discipline

The live suite runs serially.

Reasons:

- predictable provider load;
- easier diagnosis;
- clearer latency readings;
- avoidance of burst-driven rate issues;
- easier cost attribution.

The report calculates GPT-6 Luna cost from actual provider usage using the existing billing calculator.

## Workflow

`.github/workflows/live-evals.yml` is manual-only.

Inputs:

```text
suite = all | french | japanese
limit = optional case limit
```

The workflow:

```text
checkout
  -> install
  -> require OPENAI_API_KEY
  -> run live eval gate
  -> upload report artifact
```

It is intentionally separate from ordinary CI so normal development does not spend API money.

## P7 acceptance

- [x] reusable evaluation types exist
- [x] 18 curated cases exist
- [x] all four Languages capabilities are covered
- [x] French and Japanese are covered in every capability
- [x] false-positive correction cases are critical
- [x] deterministic graders exist
- [x] grader behavior is itself tested
- [x] capability schema drift invalidates fixtures
- [x] live runner measures latency, tokens, and cost
- [x] live runner validates schema and capability semantics
- [x] explicit release thresholds exist
- [x] critical failures block the gate
- [x] live eval requires explicit acknowledgement
- [x] live workflow is manual-only
- [x] normal CI spends no model tokens
- [x] live report is uploaded for inspection
- [x] manual linguistic review remains explicit rather than faked by an AI judge

## P8 handoff

P8 should not add more AI features.

It should connect the pilot safely into a real Languages server path, run the live suite with production-like credentials, exercise the features in real study sessions, inspect the report manually, and harden defects only.
