# ADR 0003 — App-Local Data and Authority

Status: Accepted

## Decision

Application systems remain authoritative for their own data and state. `thiepn/ai` receives only request-scoped context and accesses app functionality through explicit tools.

## Why

A global AI-owned data layer would increase privacy risk, prompt size, coupling, stale data, and debugging difficulty.

## Consequences

- Recipe owns recipes.
- Languages owns learning state.
- StudyOS owns study state.
- Diet owns tracked nutrition data.
- Selah owns study notes.

The model may interpret or summarize those systems but does not become their source of truth.

Cross-app access, if added later, must be explicit and permissioned.
