import { describe, expect, it } from "vitest";
import { getRuntimeReadiness } from "../src/core/readiness.js";

const appSecret =
  "0123456789abcdef0123456789abcdef";

describe("runtime readiness", () => {
  it("is degraded when production dependencies are missing", () => {
    expect(getRuntimeReadiness({})).toEqual({
      ready: false,
      dependencies: {
        provider: false,
        guardrails: false,
        appAuth: false
      }
    });
  });

  it("requires a valid languages app identity", () => {
    const result = getRuntimeReadiness({
      OPENAI_API_KEY: "configured",
      UPSTASH_REDIS_REST_URL: "https://redis.example",
      UPSTASH_REDIS_REST_TOKEN: "configured",
      THIEPN_AI_APP_SECRETS_JSON: JSON.stringify({
        internal: appSecret
      })
    });

    expect(result.ready).toBe(false);
    expect(result.dependencies.appAuth).toBe(false);
  });

  it("is ready only when provider, guardrails, and languages auth exist", () => {
    const result = getRuntimeReadiness({
      OPENAI_API_KEY: "configured",
      UPSTASH_REDIS_REST_URL: "https://redis.example",
      UPSTASH_REDIS_REST_TOKEN: "configured",
      THIEPN_AI_APP_SECRETS_JSON: JSON.stringify({
        languages: appSecret
      })
    });

    expect(result).toEqual({
      ready: true,
      dependencies: {
        provider: true,
        guardrails: true,
        appAuth: true
      }
    });
  });
});
