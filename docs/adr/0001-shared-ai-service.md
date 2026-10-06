# ADR 0001 — Shared AI Service

Status: Accepted

## Decision

Use one central `thiepn/ai` service for model access and shared operational controls. Individual applications consume typed capabilities through a shared client.

## Why

Duplicating provider credentials, prompts, limits, telemetry, error handling, and schemas in each repository would create drift and make model changes expensive.

Centralization applies to infrastructure, not application behavior.

## Consequences

Positive:

- one provider integration
- one security boundary
- one cost-control layer
- consistent capability contracts
- model changes do not require every app to change

Trade-off:

- `thiepn/ai` becomes shared infrastructure and must remain stable
- capability-specific failures can affect multiple apps if changes are not evaluated

Mitigation: version capabilities and require evals before broad changes.
