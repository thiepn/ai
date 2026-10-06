import { z } from "zod";

export const runEnvelopeSchema = z.object({
  capability: z.string().trim().min(1).max(128),
  input: z.unknown(),
  requestId: z.string().trim().min(1).max(128).optional()
}).strict();

export type RunEnvelope = z.infer<typeof runEnvelopeSchema>;

export type ErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "UNKNOWN_CAPABILITY"
  | "INVALID_INPUT"
  | "INPUT_TOO_LARGE"
  | "RATE_LIMITED"
  | "BUDGET_EXCEEDED"
  | "MODEL_TIMEOUT"
  | "MODEL_UNAVAILABLE"
  | "MODEL_REFUSED"
  | "INVALID_MODEL_OUTPUT"
  | "TOOL_REJECTED"
  | "INTERNAL_ERROR";

export type RunSuccess<T> = {
  ok: true;
  data: T;
  meta: {
    capability: string;
    version: number;
    requestId: string;
    model: "gpt-6-luna";
  };
};

export type RunFailure = {
  ok: false;
  error: {
    code: ErrorCode;
    message: string;
    requestId: string;
  };
};
