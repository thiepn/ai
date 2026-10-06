# P1 — Minimal GPT-6 Luna Execution Service

Status: Implemented

## Scope

P1 implements the smallest end-to-end model execution path:

```text
POST /v1/run
  -> validate P1 request
  -> core.smoke capability
  -> GPT-6 Luna provider adapter
  -> normalized result/error
```

It also exposes:

```text
GET /v1/health
```

The health route does not call OpenAI and therefore incurs no model cost.

## Internal smoke capability

P1 intentionally supports only:

```text
core.smoke
```

This is not a product capability. It exists to prove the service boundary before P2 introduces the real capability registry.

Example request:

```json
{
  "capability": "core.smoke",
  "input": {
    "text": "Reply with a one-line confirmation."
  },
  "requestId": "optional-trace-id"
}
```

Example success shape:

```json
{
  "ok": true,
  "data": {
    "reply": "..."
  },
  "meta": {
    "capability": "core.smoke",
    "version": 1,
    "requestId": "...",
    "model": "gpt-6-luna"
  }
}
```

## Safety gate

P3 owns real caller authentication. Until then, P1 model execution is disabled unless:

```text
THIEPN_AI_P1_ENABLED=true
```

This flag is intended only for controlled local or preview smoke testing.

Do not expose an unauthenticated production execution endpoint.

## Environment

Required for a live smoke test:

```text
OPENAI_API_KEY=...
THIEPN_AI_P1_ENABLED=true
```

The provider credential is server-side only.

## Model behavior

P1 hard-codes:

```text
model: gpt-6-luna
reasoning: low
max output: 160 tokens for core.smoke
```

Apps cannot override those values.

## Deliberately deferred

P1 does not implement:

- real capability registry
- structured output schemas for product features
- app authentication/permissions
- budget/rate accounting
- shared client SDK
- Languages capabilities
- tools
- cross-app context
- persistent memory
- model routing
- dashboard

Those remain in later phases.

## Verification

Unit tests cover:

- valid P1 contract
- invalid capability/input rejection
- injected provider execution
- request metadata
- provider rate-limit normalization

A live provider call is intentionally not part of automated tests because it requires credentials and incurs external cost.

Provider response identifiers remain internal and are not part of the application-facing capability result.

## P1 acceptance

P1 is complete when:

- [x] service can compile as strict TypeScript
- [x] stable `/v1/run` and `/v1/health` routes exist
- [x] GPT-6 Luna is encapsulated in one provider adapter
- [x] callers cannot choose provider/model/prompt/reasoning
- [x] request validation happens before model execution
- [x] provider failures become normalized service errors
- [x] execution is safely disabled by default before P3 auth
- [x] core logic can be tested without a real API call
- [x] P2 can replace the temporary smoke dispatch with the capability registry
