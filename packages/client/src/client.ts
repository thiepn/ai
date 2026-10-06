import { randomUUID } from "node:crypto";
import { ThiepnAIError } from "./error.js";
import { RUN_PATH, signRequest } from "./signing.js";
import type {
  CapabilityId,
  CapabilityInput,
  CapabilityOutput,
  RunOptions,
  RunResult,
  ServiceFailure,
  ServiceSuccess,
  ThiepnAIClientOptions
} from "./types.js";

const DEFAULT_TIMEOUT_MS = 15_000;
const APP_ID_PATTERN = /^[a-z][a-z0-9-]{1,31}$/;

function assertServerRuntime(): void {
  if (
    typeof globalThis !== "undefined" &&
    "window" in globalThis
  ) {
    throw new ThiepnAIError(
      "INVALID_CONFIGURATION",
      "@thiepn/ai is server-side only and must not run in a browser."
    );
  }
}

function normalizeBaseUrl(value: string): string {
  let url: URL;

  try {
    url = new URL(value);
  } catch (error) {
    throw new ThiepnAIError(
      "INVALID_CONFIGURATION",
      "Thiepn AI baseUrl must be an absolute URL.",
      { cause: error }
    );
  }

  if (!["https:", "http:"].includes(url.protocol)) {
    throw new ThiepnAIError(
      "INVALID_CONFIGURATION",
      "Thiepn AI baseUrl must use HTTP or HTTPS."
    );
  }

  url.pathname = url.pathname.replace(/\/+$/, "");
  url.search = "";
  url.hash = "";

  return url.toString().replace(/\/$/, "");
}

function isServiceFailure(
  value: unknown
): value is ServiceFailure {
  if (
    value === null ||
    typeof value !== "object" ||
    !("ok" in value) ||
    (value as { ok?: unknown }).ok !== false ||
    !("error" in value)
  ) {
    return false;
  }

  const error = (value as {
    error?: unknown;
  }).error;

  return (
    error !== null &&
    typeof error === "object" &&
    typeof (error as { code?: unknown }).code === "string" &&
    typeof (error as { message?: unknown }).message === "string" &&
    typeof (error as { requestId?: unknown }).requestId === "string"
  );
}

function isServiceSuccess(
  value: unknown
): value is ServiceSuccess {
  if (
    value === null ||
    typeof value !== "object" ||
    !("ok" in value) ||
    (value as { ok?: unknown }).ok !== true ||
    !("meta" in value)
  ) {
    return false;
  }

  const meta = (value as {
    meta?: unknown;
  }).meta;

  return (
    meta !== null &&
    typeof meta === "object" &&
    typeof (meta as { capability?: unknown }).capability === "string" &&
    typeof (meta as { version?: unknown }).version === "number" &&
    typeof (meta as { requestId?: unknown }).requestId === "string" &&
    typeof (meta as { model?: unknown }).model === "string" &&
    "data" in value
  );
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch (error) {
    throw new ThiepnAIError(
      "INVALID_RESPONSE",
      "Thiepn AI returned a non-JSON response.",
      {
        status: response.status,
        cause: error
      }
    );
  }
}

function combineAbortSignals(
  timeoutMs: number,
  externalSignal?: AbortSignal
): {
  signal: AbortSignal;
  cleanup(): void;
  didTimeout(): boolean;
} {
  const controller = new AbortController();
  let timedOut = false;

  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  const onAbort = () => controller.abort();

  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort();
    } else {
      externalSignal.addEventListener("abort", onAbort, {
        once: true
      });
    }
  }

  return {
    signal: controller.signal,
    cleanup() {
      clearTimeout(timer);
      externalSignal?.removeEventListener("abort", onAbort);
    },
    didTimeout() {
      return timedOut;
    }
  };
}

export class ThiepnAIClient {
  readonly #baseUrl: string;
  readonly #appId: string;
  readonly #appSecret: string;
  readonly #timeoutMs: number;
  readonly #fetch: typeof globalThis.fetch;

  constructor(options: ThiepnAIClientOptions) {
    assertServerRuntime();

    if (!APP_ID_PATTERN.test(options.appId)) {
      throw new ThiepnAIError(
        "INVALID_CONFIGURATION",
        "Thiepn AI appId is invalid."
      );
    }

    if (options.appSecret.length < 32) {
      throw new ThiepnAIError(
        "INVALID_CONFIGURATION",
        "Thiepn AI appSecret must contain at least 32 characters."
      );
    }

    if (
      options.timeoutMs !== undefined &&
      (!Number.isInteger(options.timeoutMs) ||
        options.timeoutMs < 1)
    ) {
      throw new ThiepnAIError(
        "INVALID_CONFIGURATION",
        "Thiepn AI timeoutMs must be a positive integer."
      );
    }

    this.#baseUrl = normalizeBaseUrl(options.baseUrl);
    this.#appId = options.appId;
    this.#appSecret = options.appSecret;
    this.#timeoutMs =
      options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.#fetch = options.fetch ?? globalThis.fetch;

    if (typeof this.#fetch !== "function") {
      throw new ThiepnAIError(
        "INVALID_CONFIGURATION",
        "No fetch implementation is available."
      );
    }
  }

  async run<K extends CapabilityId>(
    capability: K,
    input: CapabilityInput<K>,
    options: RunOptions = {}
  ): Promise<RunResult<K>> {
    const requestId =
      options.requestId ?? randomUUID();

    const body = {
      capability,
      input,
      requestId
    };

    const timestamp = String(
      Math.floor(Date.now() / 1000)
    );
    const nonce = randomUUID();

    const signature = signRequest({
      secret: this.#appSecret,
      appId: this.#appId,
      timestamp,
      nonce,
      method: "POST",
      path: RUN_PATH,
      body
    });

    const abort = combineAbortSignals(
      this.#timeoutMs,
      options.signal
    );

    let response: Response;

    try {
      response = await this.#fetch(
        `${this.#baseUrl}${RUN_PATH}`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-thiepn-app": this.#appId,
            "x-thiepn-timestamp": timestamp,
            "x-thiepn-nonce": nonce,
            "x-thiepn-signature": signature
          },
          body: JSON.stringify(body),
          signal: abort.signal
        }
      );
    } catch (error) {
      if (abort.didTimeout()) {
        throw new ThiepnAIError(
          "TIMEOUT",
          "Thiepn AI request timed out.",
          {
            requestId,
            cause: error
          }
        );
      }

      if (options.signal?.aborted) {
        throw error;
      }

      throw new ThiepnAIError(
        "NETWORK_ERROR",
        "Could not reach the Thiepn AI service.",
        {
          requestId,
          cause: error
        }
      );
    } finally {
      abort.cleanup();
    }

    const payload = await readJson(response);

    if (isServiceFailure(payload)) {
      throw new ThiepnAIError(
        payload.error.code,
        payload.error.message,
        {
          status: response.status,
          requestId: payload.error.requestId
        }
      );
    }

    if (!response.ok || !isServiceSuccess(payload)) {
      throw new ThiepnAIError(
        "INVALID_RESPONSE",
        "Thiepn AI returned an invalid response.",
        {
          status: response.status,
          requestId
        }
      );
    }

    if (
      payload.meta.capability !== capability ||
      payload.meta.requestId !== requestId ||
      payload.meta.model !== "gpt-6-luna"
    ) {
      throw new ThiepnAIError(
        "INVALID_RESPONSE",
        "Thiepn AI response metadata did not match the request.",
        {
          status: response.status,
          requestId
        }
      );
    }

    return {
      data: payload.data as CapabilityOutput<K>,
      meta: {
        capability,
        version: payload.meta.version,
        requestId: payload.meta.requestId,
        model: "gpt-6-luna"
      }
    };
  }
}

export function createThiepnAI(
  options: ThiepnAIClientOptions
): ThiepnAIClient {
  return new ThiepnAIClient(options);
}

export function createThiepnAIFromEnv(
  env: NodeJS.ProcessEnv = process.env
): ThiepnAIClient {
  const baseUrl = env.THIEPN_AI_BASE_URL;
  const appId = env.THIEPN_AI_APP_ID;
  const appSecret = env.THIEPN_AI_APP_SECRET;

  if (!baseUrl || !appId || !appSecret) {
    throw new ThiepnAIError(
      "INVALID_CONFIGURATION",
      "THIEPN_AI_BASE_URL, THIEPN_AI_APP_ID, and THIEPN_AI_APP_SECRET are required."
    );
  }

  return createThiepnAI({
    baseUrl,
    appId,
    appSecret
  });
}
