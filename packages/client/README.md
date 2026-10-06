# @thiepn/ai

Server-side TypeScript client for `thiepn/ai`.

## Security

This package is **server-side only**. It contains application credentials used to sign requests and must never be imported into browser/client bundles.

Each consuming app should configure:

```text
THIEPN_AI_BASE_URL=https://ai.thiepn.dev
THIEPN_AI_APP_ID=languages
THIEPN_AI_APP_SECRET=<independent random secret>
```

## Usage

```ts
import { createThiepnAIFromEnv } from "@thiepn/ai";

const ai = createThiepnAIFromEnv();

const result = await ai.run("core.smoke", {
  text: "Confirm the service is reachable."
});

console.log(result.data.reply);
```

Normal application code never handles:

- HMAC signing
- timestamps
- nonces
- request IDs
- authentication headers
- protocol error decoding

## Errors

```ts
import {
  ThiepnAIError,
  createThiepnAIFromEnv
} from "@thiepn/ai";

try {
  await createThiepnAIFromEnv().run(
    "core.smoke",
    { text: "Hello" }
  );
} catch (error) {
  if (error instanceof ThiepnAIError) {
    console.error(
      error.code,
      error.status,
      error.requestId
    );
  }
}
```

## Capability typing

The SDK exposes a central `ThiepnAICapabilityMap`.

P4 contains only the internal `core.smoke` capability. Product capability types are added when those capabilities become real; P5 will add the first Languages contracts.
