# P8 — Real-World Languages Qualification & Defect-Only Hardening

Status: Integration-ready; live certification pending deployment credentials and human study acceptance.

## Purpose

P8 moves the Languages pilot from isolated capability/eval code into the actual THIEPN application path without changing the P0 authority boundaries.

No new model capability is introduced.

The production path is:

```text
language product browser
  -> THIEPN Account bearer token
  -> THIEPN Core
  -> authenticated user verification
  -> signed app-to-app request as languages
  -> thiepn/ai
  -> GPT-6 Luna
```

The Account identity and bearer token terminate at Core. They are not forwarded to `thiepn/ai`.

## Implemented integration

### Core gateway

`thiepn/core` now owns four explicit authenticated routes:

```text
POST /v1/languages/ai/correct
POST /v1/languages/ai/explain
POST /v1/languages/ai/exercises
POST /v1/languages/ai/conversation
```

There is intentionally no generic browser-visible AI proxy.

Core:

- verifies the existing THIEPN Account bearer token;
- accepts only the four Languages operations;
- strips user identity before forwarding;
- signs the internal request using the P3 HMAC protocol;
- sends `appId=languages`;
- maps AI limits/unavailability into stable Core errors;
- rejects oversized browser payloads;
- fails closed when AI configuration is missing.

### Languages browser client

`thiepn/languages` now exposes a browser-safe adapter:

```ts
import { createLanguagesAiClient } from "@thiepn/languages/ai-client";
```

It requires only:

- Core API origin;
- an existing Account access-token getter.

It contains no OpenAI credential and no Languages HMAC secret.

Typed methods:

```text
correct
explain
generateExercise
conversation
```

## Failure behavior

AI remains optional.

A model/network/limit failure must not:

- erase learner text;
- create learner evidence;
- mutate mastery;
- alter proficiency;
- block deterministic study content.

Stable browser error classes are:

```text
AUTH_REQUIRED
INVALID_REQUEST
LIMITED
UNAVAILABLE
INVALID_RESPONSE
TIMEOUT
```

## P8 qualification layers

### Layer A — code/integration qualification

Required:

- P7 static eval suite passes;
- AI service CI passes;
- Core gateway tests pass;
- Languages browser-client tests pass;
- no Account identity reaches the AI request;
- no AI secret reaches browser code;
- arbitrary AI capabilities cannot be proxied;
- error/limit behavior is fail-closed.

### Layer B — live model qualification

Required:

- deploy/configure the AI service;
- configure persistent guardrails;
- provision one independent `languages` app secret;
- configure the matching Core Worker secret;
- point Core at the production AI origin;
- run the complete 18-case P7 live Luna suite;
- manually inspect all critical/linguistic review items;
- exercise all four capabilities from an authenticated real browser session;
- force 429, timeout, and unavailable paths;
- confirm learner work is preserved.

Layer B cannot be inferred from unit tests.

## Current activation blockers

This session does not have:

- a connected Vercel team/project for `thiepn/ai`;
- the production OpenAI API credential;
- the production Upstash guardrail credentials;
- the production `languages` HMAC secret;
- a live signed-in human study session.

Therefore P8 must not be called fully certified yet.

## Defect-only rule

After activation, P8 permits fixes only for observed defects such as:

- false corrections;
- inaccurate explanations;
- invalid generated answer keys;
- level mismatch;
- conversation derailment;
- excessive latency;
- broken error recovery;
- context/privacy leakage.

New AI features belong to later product planning, not P8.

## Exit criteria

P8 is fully complete only when:

```text
Layer A = PASS
Layer B = PASS
```

Until then the truthful state is:

```text
integration-ready
live-certification-pending
```


## Layer A qualification evidence — 2026-10-06

The integration layer has been exercised across all three repositories.

### thiepn/ai

Latest P8 integration status/health head:

```text
504f8a3e4709a21375d73e54549f70484f78faf3
```

CI: PASS.

This preserves the already-green P7 platform/eval suite and changes only the truthful phase/status reporting.

### thiepn/languages

Latest P8 qualification-document head:

```text
5b4c0691e82811ba00905e0887fcfb181a4e1bd3
```

CI: PASS.

The browser-safe AI adapter and its tests also passed on their implementation heads.

### thiepn/core

P8 bridge head:

```text
e5f2917bb91cb63990143df6d64440ef22fc5a57
```

Before the repository reaches its database bootstrap, Core verification passes:

```text
Prettier
ESLint
strict TypeScript
93/93 tests
registry validation
secret scan
Cloudflare Worker production dry-run build
```

The six `apps/gateway/test/languages-ai.test.ts` cases pass.

The full Core workflow then fails during `db:start` on the unrelated Recipe migration:

```text
20261006163029_recipe_p3_collection_lint_hardening.sql
syntax error at or near "\\"
```

This is confirmed pre-existing: Core commit

```text
e9c859ec01f49eefb73e2a257640161c3d51a964
```

failed on the same Recipe migration before the P8 Languages AI bridge was added.

P8 does not modify that unrelated Recipe migration.

### Layer A result

```text
AI service integration code       PASS
Languages browser adapter          PASS
Core AI bridge code/tests/build    PASS
Cross-boundary secret design       PASS
Full Core repository DB bootstrap  BLOCKED by pre-existing Recipe migration
```

For P8 purposes, the Languages AI integration layer is code-qualified. This does not satisfy Layer B live certification.
