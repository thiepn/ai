# P2 — Capability Registry + Structured Schemas

Status: Implemented

## Purpose

P2 replaces P1's hard-coded dispatch with a reusable capability architecture.

A capability now owns:

- stable ID
- version
- description
- input schema
- structured output schema
- structured-output name
- reasoning level
- maximum output-token budget
- intended application callers
- prompt construction

The executor owns none of those domain decisions.

## Execution flow

```text
POST /v1/run
  -> parse generic request envelope
  -> registry lookup
  -> capability input validation
  -> capability prompt construction
  -> GPT-6 Luna structured-output request
  -> provider-level schema validation
  -> executor-level schema validation
  -> normalized typed response
```

## Registry

The initial registry contains only:

```text
core.smoke
```

This remains an internal proving capability. Real product capabilities begin in later phases.

Adding a capability no longer requires editing the generic executor. It requires defining and registering a capability.

## Structured Outputs

The Luna provider uses the OpenAI Responses API structured-output parser with a Zod schema supplied by the capability.

The provider validates the parsed model output, and the executor validates it again at the capability boundary.

This is intentional defense in depth: a provider adapter must not be able to bypass the application's declared output contract.

## Capability definition

Conceptually:

```ts
defineCapability({
  id: "languages.correct",
  version: 1,
  description: "...",
  inputSchema,
  outputSchema,
  outputName: "languages_correction",
  reasoning: "low",
  limits: {
    maxOutputTokens: 800
  },
  allowedApps: ["languages"],
  buildPrompt(input) {
    return {
      instructions: "...",
      input: "..."
    };
  }
});
```

`allowedApps` is declarative in P2. Enforcement begins in P3 when authenticated caller identity exists.

## Refusals

Model refusals are distinguished from malformed output as:

```text
MODEL_REFUSED
```

This lets future app capabilities handle a refusal differently from provider failure or schema failure.

## P2 non-goals

P2 does not implement:

- authenticated app identity
- enforcement of `allowedApps`
- budgets or rate limits
- usage persistence
- shared app client SDK
- real Languages capabilities
- tools
- cross-app access
- model routing

## Acceptance

P2 is complete when:

- [x] capability definitions are typed and validated
- [x] duplicate capability IDs are rejected
- [x] executor uses registry lookup instead of hard-coded dispatch
- [x] capability input schemas are enforced
- [x] capability output schemas are enforced
- [x] GPT-6 Luna receives strict structured-output schemas
- [x] model refusals are normalized separately
- [x] app permissions are declared but not falsely enforced before P3
- [x] adding a capability requires no executor change
- [x] registry and execution behavior are unit tested
