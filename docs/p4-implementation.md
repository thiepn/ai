# P4 — Shared @thiepn/ai Client SDK

Status: Implemented

## Purpose

P4 packages the P3 protocol into one server-side client so consuming Thiepn applications never implement signing, nonces, transport, or service-error decoding themselves.

The intended app-side API is:

```ts
import { createThiepnAIFromEnv } from "@thiepn/ai";

const ai = createThiepnAIFromEnv();

const result = await ai.run("core.smoke", {
  text: "Hello"
});
```

P5 will add the first real Languages capability types.

## Package

```text
packages/client
└── @thiepn/ai
```

The package is independently buildable and distributable from the shared repository.

It is server-side only.

## Configuration

Explicit:

```ts
const ai = createThiepnAI({
  baseUrl: "https://ai.thiepn.dev",
  appId: "languages",
  appSecret: process.env.THIEPN_AI_APP_SECRET!
});
```

Or environment-based:

```text
THIEPN_AI_BASE_URL
THIEPN_AI_APP_ID
THIEPN_AI_APP_SECRET
```

followed by:

```ts
const ai = createThiepnAIFromEnv();
```

## Responsibilities hidden by the SDK

The consuming application does not implement:

- canonical JSON
- body hashing
- HMAC-SHA256
- timestamps
- replay nonces
- request IDs
- authentication headers
- timeout wiring
- response-envelope validation
- service-error decoding

## Request flow

```text
ai.run(capability, input)
  -> generate requestId
  -> generate nonce
  -> timestamp request
  -> canonicalize + hash body
  -> HMAC-sign P3 payload
  -> POST /v1/run
  -> decode service envelope
  -> verify response metadata
  -> return typed data
```

## Typed capability map

The client exports:

```ts
interface ThiepnAICapabilityMap {
  "core.smoke": {
    input: { text: string };
    output: { reply: string };
  };
}
```

Therefore TypeScript constrains both the capability ID and its input/output shape.

As real capabilities are added, the map becomes the shared public compile-time contract.

## Errors

All service failures become:

```ts
ThiepnAIError
```

with:

```text
code
message
status?
requestId?
cause?
```

Client-only codes cover:

- invalid configuration
- invalid service response
- network failure
- timeout

Service error codes remain unchanged.

## Protocol compatibility

Because signing code necessarily exists on both sides of the network boundary, P4 adds a compatibility test that signs the same request with:

```text
SDK signer
server verifier/signer
```

and requires byte-for-byte identical signatures.

This prevents silent authentication breakage if canonicalization changes later.

## Security boundary

The SDK imports Node cryptography and rejects browser execution.

App credentials must live in an application's trusted server runtime, never in client JavaScript.

The expected deployment path is:

```text
browser
  -> app server
  -> @thiepn/ai
  -> ai.thiepn.dev
```

not:

```text
browser -> @thiepn/ai -> ai.thiepn.dev
```

## Distribution

P4 prepares `@thiepn/ai` as a normal distributable package but does not publish a release yet.

Publishing before a real product capability exists would create unnecessary release/version overhead.

P5 may consume the workspace directly while developing Languages; a package-release mechanism can be finalized when the first external repository integration is performed.

## P4 acceptance

- [x] one server-side client API
- [x] automatic HMAC request signing
- [x] automatic request IDs and replay nonces
- [x] configurable timeout
- [x] external AbortSignal support
- [x] typed capability input/output map
- [x] normalized `ThiepnAIError`
- [x] response metadata verification
- [x] environment-based constructor
- [x] protocol compatibility tests
- [x] SDK transport tests
- [x] independent SDK TypeScript build
- [x] distributable package structure
- [x] no browser credential path
