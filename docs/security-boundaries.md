# Security Boundaries

## Trust model

`thiepn/ai` treats:

- application callers as authenticated but capability-limited
- user input as untrusted
- model output as untrusted until validated
- tool arguments as untrusted until validated
- provider responses as external data
- application databases as authoritative systems outside the AI core

## Secret boundary

The OpenAI API credential exists only in the server-side `thiepn/ai` runtime.

Never expose it to:

- browser bundles
- mobile clients
- public repository files
- capability payloads
- logs
- model prompts

## Caller identity

Each consuming application has an identity, for example:

```text
languages
recipe
study
diet
selah
```

Requests are authorized against capability allowlists.

Example:

```text
languages -> languages.*
languages -X-> recipe.*
languages -X-> admin.*
```

User-level authorization remains the responsibility of the calling app unless a later platform requirement explicitly centralizes it.

## Tool permissions

Tools are classified:

### READ

No state change.

Examples:

- searchRecipes
- findNotes
- getRecentMistakes

May execute automatically after argument validation.

### SAFE_WRITE

Reversible, scoped state change.

Examples:

- addTag
- saveGeneratedExercise
- addToFavorites

May execute automatically only when the product explicitly defines that behavior as expected.

### SENSITIVE_WRITE

Destructive, externally visible, bulk, sharing, publishing, or difficult-to-reverse change.

Examples:

- delete
- overwrite
- publish
- bulk modify
- share

Requires explicit user confirmation at the product layer.

The model cannot waive confirmation.

## Prompt-injection boundary

Content retrieved from users, files, websites, databases, or tools is data, not authority.

Capability instructions and tool policy are defined server-side.

Retrieved text cannot:

- expand permissions
- introduce new tools
- reveal secrets
- change spending limits
- override confirmation requirements
- select arbitrary models

## Validation

Validate at every boundary:

```text
caller request
  -> input schema
  -> model
  -> output schema
  -> tool argument schema
  -> application authorization
  -> execution
```

A schema failure is a failed request, not a reason to "best effort" a state-changing action.

## Initial operational guardrails

P3 will implement configurable:

- per-app request limits
- per-capability input size
- per-capability output size
- monthly warning threshold
- monthly soft threshold
- hard spending cutoff
- provider timeout
- bounded retry policy

Suggested initial ecosystem budget:

```text
warning:     $2/month
soft alert:  $5/month
hard stop:  $10/month
```

These are safety defaults, not optimization targets.

## Logging

Do log:

- request ID
- app ID
- capability ID/version
- timestamp
- latency
- success/failure code
- input/output token counts
- estimated provider cost
- tool names invoked

Do not log by default:

- full private prompts
- full private responses
- secrets
- authentication tokens
- raw sensitive app records

Debug payload logging, if ever added, must be explicit, scoped, and temporary.
