import type { ClientErrorCode } from "./types.js";

export class ThiepnAIError extends Error {
  constructor(
    public readonly code: ClientErrorCode,
    message: string,
    public readonly options: {
      status?: number;
      requestId?: string;
      cause?: unknown;
    } = {}
  ) {
    super(message, { cause: options.cause });
    this.name = "ThiepnAIError";
  }

  get status(): number | undefined {
    return this.options.status;
  }

  get requestId(): string | undefined {
    return this.options.requestId;
  }
}
