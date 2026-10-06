import { describe, expect, it } from "vitest";
import {
  createThiepnAI,
  ThiepnAIError
} from "../packages/client/src/index.js";
import { authenticateAppRequest } from "../src/security/app-auth.js";
import { MemoryGuardrailStore } from "../src/guardrails/memory-store.js";

const secret = "0123456789abcdef0123456789abcdef";

function headersToRecord(
  headers: Headers
): Record<string, string> {
  return Object.fromEntries(headers.entries());
}

describe("@thiepn/ai client", () => {
  it("signs a request the server can authenticate", async () => {
    const store = new MemoryGuardrailStore();

    const mockFetch: typeof fetch = async (
      input,
      init
    ) => {
      const url = new URL(
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input
            : input.url
      );

      const body = JSON.parse(
        String(init?.body ?? "{}")
      ) as {
        capability: string;
        input: unknown;
        requestId: string;
      };

      const headers = new Headers(init?.headers);

      const caller = await authenticateAppRequest({
        headers: headersToRecord(headers),
        method: init?.method ?? "GET",
        path: url.pathname,
        body,
        store,
        secrets: {
          internal: secret
        }
      });

      expect(caller.appId).toBe("internal");

      return new Response(
        JSON.stringify({
          ok: true,
          data: {
            reply: "Authenticated."
          },
          meta: {
            capability: "core.smoke",
            version: 1,
            requestId: body.requestId,
            model: "gpt-6-luna"
          }
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json"
          }
        }
      );
    };

    const ai = createThiepnAI({
      baseUrl: "https://ai.thiepn.dev/",
      appId: "internal",
      appSecret: secret,
      fetch: mockFetch
    });

    const result = await ai.run("core.smoke", {
      text: "Hello"
    });

    expect(result.data.reply).toBe(
      "Authenticated."
    );
    expect(result.meta.capability).toBe(
      "core.smoke"
    );
  });

  it("turns service failures into ThiepnAIError", async () => {
    const mockFetch: typeof fetch = async () =>
      new Response(
        JSON.stringify({
          ok: false,
          error: {
            code: "FORBIDDEN",
            message: "Not allowed.",
            requestId: "req_forbidden"
          }
        }),
        {
          status: 403,
          headers: {
            "content-type": "application/json"
          }
        }
      );

    const ai = createThiepnAI({
      baseUrl: "https://ai.thiepn.dev",
      appId: "internal",
      appSecret: secret,
      fetch: mockFetch
    });

    try {
      await ai.run("core.smoke", {
        text: "Hello"
      });
      throw new Error("Expected request to fail.");
    } catch (error) {
      expect(error).toBeInstanceOf(
        ThiepnAIError
      );

      const typed = error as ThiepnAIError;
      expect(typed.code).toBe("FORBIDDEN");
      expect(typed.status).toBe(403);
      expect(typed.requestId).toBe(
        "req_forbidden"
      );
    }
  });

  it("rejects response metadata that does not match the request", async () => {
    const mockFetch: typeof fetch = async () =>
      new Response(
        JSON.stringify({
          ok: true,
          data: {
            reply: "Wrong metadata."
          },
          meta: {
            capability: "other.capability",
            version: 1,
            requestId: "wrong",
            model: "gpt-6-luna"
          }
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json"
          }
        }
      );

    const ai = createThiepnAI({
      baseUrl: "https://ai.thiepn.dev",
      appId: "internal",
      appSecret: secret,
      fetch: mockFetch
    });

    await expect(
      ai.run("core.smoke", {
        text: "Hello"
      })
    ).rejects.toMatchObject({
      code: "INVALID_RESPONSE"
    });
  });

  it("validates configuration before making requests", () => {
    expect(() =>
      createThiepnAI({
        baseUrl: "not-a-url",
        appId: "internal",
        appSecret: secret
      })
    ).toThrow(ThiepnAIError);

    expect(() =>
      createThiepnAI({
        baseUrl: "https://ai.thiepn.dev",
        appId: "INVALID APP",
        appSecret: secret
      })
    ).toThrow(ThiepnAIError);

    expect(() =>
      createThiepnAI({
        baseUrl: "https://ai.thiepn.dev",
        appId: "internal",
        appSecret: "too-short"
      })
    ).toThrow(ThiepnAIError);
  });
});
