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

const result = await ai.run("languages.correct", {
  languageId: "french",
  text: "Hier je vais au magasin.",
  proficiency: {
    framework: "cefr",
    level: "A2"
  }
});

console.log(result.data.correctedText);
console.log(result.data.errors);
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

The map now includes the internal `core.smoke` capability plus `languages.correct`, `languages.explain`, `languages.generateExercise`, and `languages.conversation`. The SDK therefore type-checks correction, explanation, generated-practice, and conversation-turn requests and results.
