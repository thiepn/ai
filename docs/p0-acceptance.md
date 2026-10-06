# P0 Acceptance Criteria

P0 is complete when the following decisions are explicit and internally consistent.

## Product boundary

- [x] `thiepn/ai` is shared infrastructure, not a mandatory chatbot.
- [x] AI is opt-in per feature.
- [x] Languages is the first pilot.
- [x] Expansion to other apps happens only after the pilot proves value.

## Model boundary

- [x] GPT-6 Luna is the only initial model.
- [x] Apps cannot choose models directly.
- [x] The provider is encapsulated behind the AI core.
- [x] No model router/fallback complexity is required for P1.

## API boundary

- [x] Apps invoke named capabilities.
- [x] Apps do not send arbitrary system prompts.
- [x] Capability inputs and outputs are schema-validated.
- [x] Provider-specific errors are normalized.
- [x] Initial execution primitive is `POST /v1/run`.

## Authority boundary

- [x] Application databases remain authoritative.
- [x] Deterministic calculations remain deterministic.
- [x] Model output is never implicitly trusted.
- [x] Tool calls are proposals until validated/executed by software.

## Security boundary

- [x] Provider credential is server-only.
- [x] Each application has a scoped caller identity.
- [x] Capabilities define caller allowlists.
- [x] Sensitive writes require explicit confirmation.
- [x] Prompt content cannot expand permissions.

## Data boundary

- [x] Context is app-local by default.
- [x] No global AI memory for P0-P8.
- [x] No unrestricted cross-app data access.
- [x] Raw prompts/responses are not retained by default in platform logs.

## Operational boundary

- [x] Every capability is versioned and bounded.
- [x] Usage, latency, failures, and token cost are measurable.
- [x] Budget/rate limits are requirements for P3.
- [x] Evals are mandatory before ecosystem expansion.

## P1 handoff

P1 may now implement only the minimum execution path:

```text
typed internal request
  -> capability stub
  -> GPT-6 Luna provider adapter
  -> normalized result
```

P1 should not implement:

- multiple apps
- cross-app tools
- admin dashboard
- global memory
- model routing
- complex agents
- production write tools

## P0 exit decision

**Approved architecture: Core + Capabilities + Tools.**

**Approved first model: GPT-6 Luna.**

**Approved first pilot: Languages.**

**Approved expansion strategy: evidence-driven, after P8 qualification.**
