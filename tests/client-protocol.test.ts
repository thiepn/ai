import { describe, expect, it } from "vitest";
import { signAppRequest } from "../src/security/app-auth.js";
import {
  buildSignaturePayload,
  signRequest
} from "../packages/client/src/signing.js";

describe("@thiepn/ai signing protocol", () => {
  it("matches the server signature implementation exactly", () => {
    const args = {
      secret: "0123456789abcdef0123456789abcdef",
      appId: "languages",
      timestamp: "1791298800",
      nonce: "nonce_1234567890abcdef",
      method: "POST",
      path: "/v1/run",
      body: {
        requestId: "req-1",
        input: {
          level: "A2",
          text: "Bonjour"
        },
        capability: "core.smoke"
      }
    };

    expect(signRequest(args)).toBe(
      signAppRequest(args)
    );
  });

  it("uses deterministic canonical JSON regardless of key order", () => {
    const common = {
      secret: "0123456789abcdef0123456789abcdef",
      appId: "internal",
      timestamp: "1791298800",
      nonce: "nonce_1234567890abcdeg",
      method: "POST",
      path: "/v1/run"
    };

    const a = signRequest({
      ...common,
      body: {
        capability: "core.smoke",
        input: { text: "hello", z: 1, a: 2 }
      }
    });

    const b = signRequest({
      ...common,
      body: {
        input: { a: 2, z: 1, text: "hello" },
        capability: "core.smoke"
      }
    });

    expect(a).toBe(b);
  });

  it("keeps the canonical payload versioned", () => {
    const payload = buildSignaturePayload({
      appId: "internal",
      timestamp: "1791298800",
      nonce: "nonce_1234567890abcdeh",
      method: "POST",
      path: "/v1/run",
      body: {}
    });

    expect(payload.startsWith("v1\n")).toBe(true);
  });
});
