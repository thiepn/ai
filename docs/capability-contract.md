# Capability Contract

A capability is the only supported unit of AI behavior exposed to Thiepn applications.

## Naming

Use:

```text
<domain>.<verbOrOperation>
```

Examples:

```text
languages.correct
languages.explain
languages.generateExercise
recipe.interpretSearch
study.organize
```

Names are stable API identifiers.

## Definition

Conceptual TypeScript contract:

```ts
type CapabilityDefinition<I, O> = {
  id: string;
  version: number;
  description: string;

  inputSchema: Schema<I>;
  outputSchema: Schema<O>;

  reasoning: "none" | "low" | "medium";
  maxInputTokens: number;
  maxOutputTokens: number;

  allowedApps: string[];

  buildInstructions(input: I, context: CapabilityContext): ModelInstructions;
  tools?: ToolDefinition[];
};
```

P0 intentionally excludes high/max reasoning from ordinary capability defaults. If a future use case truly requires it, it must be added explicitly rather than silently increasing cost.

## Request contract

```json
{
  "capability": "languages.correct",
  "input": {
    "text": "Hier je vais au magasin.",
    "language": "fr",
    "level": "A2"
  },
  "requestId": "optional-client-idempotency-or-trace-id"
}
```

The caller may not supply:

- model name
- provider API key
- system prompt
- unrestricted tool list
- arbitrary reasoning settings
- arbitrary output-token limit

Those belong to the capability definition.

## Success response

```json
{
  "ok": true,
  "data": {},
  "meta": {
    "capability": "languages.correct",
    "version": 1,
    "requestId": "...",
    "model": "gpt-6-luna"
  }
}
```

Token/cost internals need not be exposed to normal app users.

## Error response

Errors are normalized:

```json
{
  "ok": false,
  "error": {
    "code": "INVALID_INPUT",
    "message": "Input did not match capability schema",
    "requestId": "..."
  }
}
```

Initial error vocabulary:

```text
UNAUTHORIZED
FORBIDDEN
UNKNOWN_CAPABILITY
INVALID_INPUT
INPUT_TOO_LARGE
RATE_LIMITED
BUDGET_EXCEEDED
MODEL_TIMEOUT
MODEL_UNAVAILABLE
INVALID_MODEL_OUTPUT
TOOL_REJECTED
INTERNAL_ERROR
```

Provider-specific errors must not leak through the public contract.

## Structured output rule

Prefer typed structured output whenever downstream software consumes the result.

Free-form text is appropriate only when text itself is the product, such as:

- explanation
- conversation reply
- rewritten passage

Even then, useful metadata should remain structured.

Example:

```ts
{
  reply: string;
  corrections: Correction[];
  difficulty: "A1" | "A2" | "B1";
}
```

## Versioning

Changing wording without changing semantics does not require a new capability version.

Increment the capability version when behavior or output interpretation materially changes.

Breaking schema changes should become a new API-compatible capability/version migration rather than silently changing callers.

## Capability admission test

Before a new capability is accepted, all answers must be "yes":

1. Is an LLM materially better than deterministic software here?
2. Is the task narrow enough to define and evaluate?
3. Can authoritative state remain outside the model?
4. Can the input/output be bounded?
5. Can failure be detected or made low-risk?
6. Does at least one real app need it now?

If not, do not add it.
