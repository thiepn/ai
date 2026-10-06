# ADR 0008 — Deterministic Evals Before LLM Judges

Status: Accepted

## Decision

The initial Thiepn AI quality gate uses curated cases, deterministic assertions, capability semantic validation, and explicit human-review questions.

It does not use an LLM-as-judge as the release authority.

## Why

Using the same or another language model as a judge can be useful, but it introduces:

- correlated model errors;
- extra cost;
- judge prompt drift;
- non-deterministic CI;
- a false impression of objective linguistic correctness.

Several important requirements are objectively testable without a judge:

- valid language must not be overcorrected;
- schemas must hold;
- requested targets must not be invented;
- exercise answer keys must be structurally valid;
- bounded feedback rules must hold.

Subjective pedagogical quality is better surfaced for human review until enough real evidence exists to justify another evaluation layer.

## Revisit when

Add an independent judge only if P8/P9 evidence shows deterministic checks miss material regressions that cannot be covered with stronger fixtures or expert review.
