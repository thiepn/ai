import type { ErrorCode, RunFailure } from "./contracts.js";

export class AiServiceError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly status: number,
    options?: ErrorOptions
  ) {
    super(message, options);
    this.name = "AiServiceError";
  }
}

export function normalizeUnknownError(error: unknown): AiServiceError {
  if (error instanceof AiServiceError) {
    return error;
  }

  const status =
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof (error as { status?: unknown }).status === "number"
      ? (error as { status: number }).status
      : undefined;

  const name =
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    typeof (error as { name?: unknown }).name === "string"
      ? (error as { name: string }).name
      : "";

  if (status === 429) {
    return new AiServiceError("RATE_LIMITED", "The model provider is rate limited.", 503, {
      cause: error
    });
  }

  if (status !== undefined && status >= 500) {
    return new AiServiceError("MODEL_UNAVAILABLE", "The model provider is temporarily unavailable.", 503, {
      cause: error
    });
  }

  if (name === "AbortError" || name.toLowerCase().includes("timeout")) {
    return new AiServiceError("MODEL_TIMEOUT", "The model request timed out.", 504, {
      cause: error
    });
  }

  return new AiServiceError("INTERNAL_ERROR", "The AI request failed.", 500, {
    cause: error
  });
}

export function failureBody(error: AiServiceError, requestId: string): RunFailure {
  return {
    ok: false,
    error: {
      code: error.code,
      message: error.message,
      requestId
    }
  };
}
