import { describe, expect, it } from "vitest";
import {
  authenticateAppRequest,
  loadAppSecrets,
  signAppRequest
} from "../src/security/app-auth.js";
import { MemoryGuardrailStore } from "../src/guardrails/memory-store.js";

const secret = "0123456789abcdef0123456789abcdef";
const appId = "internal";
const nowMs = Date.UTC(2026, 9, 6, 14, 0, 0);
const timestamp = String(Math.floor(nowMs / 1000));
const body = {
  capability: "core.smoke",
  input: { text: "hello" }
};

function signedHeaders(
  nonce: string,
  signedBody: unknown = body
) {
  return {
    "x-thiepn-app": appId,
    "x-thiepn-timestamp": timestamp,
    "x-thiepn-nonce": nonce,
    "x-thiepn-signature": signAppRequest({
      secret,
      appId,
      timestamp,
      nonce,
      method: "POST",
      path: "/v1/run",
      body: signedBody
    })
  };
}

describe("application authentication", () => {
  it("merges an isolated Finance secret without rewriting the shared map", () => {
    const financeSecret = "fedcba9876543210fedcba9876543210";
    const secrets = loadAppSecrets(
      JSON.stringify({ internal: secret, languages: secret }),
      financeSecret
    );

    expect(secrets).toEqual({
      internal: secret,
      languages: secret,
      finance: financeSecret
    });
  });

  it("rejects an invalid isolated Finance secret", () => {
    expect(() =>
      loadAppSecrets(
        JSON.stringify({ internal: secret }),
        "too-short"
      )
    ).toThrow();
  });

  it("accepts a valid signed request", async () => {
    const store = new MemoryGuardrailStore(() => nowMs);
    const nonce = "nonce_1234567890abcdef";

    const result = await authenticateAppRequest({
      headers: signedHeaders(nonce),
      method: "POST",
      path: "/v1/run",
      body,
      store,
      nowMs,
      secrets: { [appId]: secret }
    });

    expect(result).toEqual({ appId });
  });

  it("rejects body tampering", async () => {
    const store = new MemoryGuardrailStore(() => nowMs);
    const nonce = "nonce_1234567890abcdeg";

    await expect(
      authenticateAppRequest({
        headers: signedHeaders(nonce),
        method: "POST",
        path: "/v1/run",
        body: {
          capability: "core.smoke",
          input: { text: "changed" }
        },
        store,
        nowMs,
        secrets: { [appId]: secret }
      })
    ).rejects.toMatchObject({
      code: "UNAUTHORIZED"
    });
  });

  it("rejects replayed nonces", async () => {
    const store = new MemoryGuardrailStore(() => nowMs);
    const nonce = "nonce_1234567890abcdef";

    const request = {
      headers: signedHeaders(nonce),
      method: "POST",
      path: "/v1/run",
      body,
      store,
      nowMs,
      secrets: { [appId]: secret }
    } as const;

    await authenticateAppRequest(request);

    await expect(
      authenticateAppRequest(request)
    ).rejects.toMatchObject({
      code: "UNAUTHORIZED"
    });
  });

  it("rejects stale timestamps", async () => {
    const store = new MemoryGuardrailStore(() => nowMs);
    const staleTimestamp = String(
      Math.floor((nowMs - 10 * 60 * 1000) / 1000)
    );
    const nonce = "nonce_1234567890abcdeh";

    await expect(
      authenticateAppRequest({
        headers: {
          "x-thiepn-app": appId,
          "x-thiepn-timestamp": staleTimestamp,
          "x-thiepn-nonce": nonce,
          "x-thiepn-signature": signAppRequest({
            secret,
            appId,
            timestamp: staleTimestamp,
            nonce,
            method: "POST",
            path: "/v1/run",
            body
          })
        },
        method: "POST",
        path: "/v1/run",
        body,
        store,
        nowMs,
        secrets: { [appId]: secret }
      })
    ).rejects.toMatchObject({
      code: "UNAUTHORIZED"
    });
  });
});
