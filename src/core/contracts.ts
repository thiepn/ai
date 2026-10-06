import { z } from "zod";

export const smokeInputSchema = z.object({
  text: z.string().trim().min(1).max(2_000)
}).strict();

export const runRequestSchema = z.object({
  capability: z.literal("core.smoke"),
  input: smokeInputSchema,
  requestId: z.string().trim().min(1).max(128).optional()
}).strict();

export type SmokeInput = z.infer<typeof smokeInputSchema>;
export type RunRequest = z.infer<typeof runRequestSchema>;

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
