# P3 — Authentication, App Permissions & Budget Guardrails

Status: Implemented

## Purpose

P3 changes `/v1/run` from a gated development endpoint into a server-to-server endpoint with explicit caller identity, replay protection, authorization, rate limits, usage accounting, and a persistent monthly spending ceiling.

## Authentication

Every caller signs the request with an independent application secret.

Required headers:

```text
X-Thiepn-App
X-Thiepn-Timestamp
X-Thiepn-Nonce
X-Thiepn-Signature
```

The canonical signature payload is:

```text
v1
<app-id>
<unix-seconds>
<nonce>
POST
/v1/run
<sha256(canonical-json-body)>
```

Signature:

```text
v1=<HMAC-SHA256 hex digest>
```

Rules:

- app secrets are server-side only
- secrets must be at least 32 characters
- timestamp may differ by at most 5 minutes
- nonce must be 16–128 URL-safe characters
- a verified nonce is persisted for 10 minutes and cannot be reused
- signature comparison is timing-safe

## Application identities

Secrets are configured through:

```text
THIEPN_AI_APP_SECRETS_JSON
```

Example shape only:

```json
{
  "internal": "<random secret>",
  "languages": "<different random secret>"
}
```

Do not reuse one secret across apps.

## Authorization

Authentication answers:

> Which application is calling?

The capability registry answers:

> Is that application allowed to call this capability?

For example:

```ts
allowedApps: ["languages"]
```

P3 now enforces this list. An authenticated but unauthorized app receives `FORBIDDEN`.

## Rate limits

Two fixed-window layers are enforced before the model call:

```text
application / minute
application / day
application + capability / minute
application + capability / day
```

Application defaults:

```text
60 requests/minute
1000 requests/day
```

They can be overridden through `THIEPN_AI_APP_POLICIES_JSON`.

Each capability may define lower ceilings.

The internal `core.smoke` capability is limited to:

```text
10/minute
100/day
```

## Input and output ceilings

Each capability declares:

```ts
limits: {
  maxInputTokens,
  maxOutputTokens
}
```

The service uses UTF-8 byte length as a conservative upper bound for text-token count before sending the request.

The provider still receives the explicit `max_output_tokens` limit.

## Persistent store

Rate-limit counters, nonces, budget reservations, and usage metrics must survive serverless instances.

P3 therefore defines a provider-neutral `GuardrailStore` and supplies a production implementation using Upstash Redis over REST.

Required production variables:

```text
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
```

If persistent storage is unavailable, the execution endpoint fails closed.

The core guardrail logic depends only on the `GuardrailStore` interface. Redis can be replaced later without rewriting capability execution.

## Spending guardrail

Current standard GPT-6 Luna text pricing is encoded as:

```text
input        $0.10 / 1M tokens
cached input $0.01 / 1M tokens
cache write  $0.125 / 1M tokens
output       $0.50 / 1M tokens
```

The calculator also accounts for the documented >272K-token long-context multipliers.

Default monthly thresholds:

```text
warning  $2
soft     $5
hard     $10
```

The hard threshold is enforced before model execution by reserving the maximum possible cost allowed by the capability.

After a successful model response:

```text
reserved maximum
      ↓
actual provider token usage
      ↓
settle difference
      ↓
persistent monthly spend
```

This avoids concurrent requests independently crossing the hard ceiling.

## Usage accounting

Successful requests persist monthly per-app counters for:

- requests
- input tokens
- cached input tokens
- cache-write tokens
- output tokens
- estimated provider cost in nano-USD

Nano-USD integers avoid floating-point drift for extremely cheap model calls.

Operational usage metadata remains outside normal capability responses.

## Failure behavior

The system fails closed for:

- missing/invalid authentication
- expired timestamps
- replayed nonces
- unauthorized capabilities
- rate limits
- input ceilings
- budget exhaustion
- missing persistent quota storage

Provider/model failures do not bypass the normal normalized-error contract.

## Deliberately deferred

P3 does not implement:

- browser-side authentication
- user accounts
- the shared `@thiepn/ai` SDK
- Languages product capabilities
- dashboard UI
- notifications for warning/soft budget thresholds
- cross-app tools
- global memory
- alternate models

## Acceptance

P3 is complete when:

- [x] callers have signed app identities
- [x] signatures cover the request body
- [x] replay protection is persistent
- [x] `allowedApps` is enforced
- [x] per-app and per-capability rate limits are enforced
- [x] input/output ceilings are explicit
- [x] a persistent serverless guardrail store exists
- [x] monthly hard-budget reservation is atomic
- [x] actual provider usage settles reserved spend
- [x] usage is accounted per application
- [x] the endpoint fails closed without security infrastructure
- [x] tests cover authentication, authorization, rate, budget, and pricing behavior
