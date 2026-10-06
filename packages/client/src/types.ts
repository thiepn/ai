export interface ThiepnAICapabilityMap {
  "core.smoke": {
    input: {
      text: string;
    };
    output: {
      reply: string;
    };
  };
}

export type CapabilityId = keyof ThiepnAICapabilityMap;

export type CapabilityInput<K extends CapabilityId> =
  ThiepnAICapabilityMap[K]["input"];

export type CapabilityOutput<K extends CapabilityId> =
  ThiepnAICapabilityMap[K]["output"];

export type ServiceErrorCode =
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

export type ClientErrorCode =
  | ServiceErrorCode
  | "INVALID_RESPONSE"
  | "NETWORK_ERROR"
  | "TIMEOUT"
  | "INVALID_CONFIGURATION";

export type RunMeta<K extends CapabilityId = CapabilityId> = {
  capability: K;
  version: number;
  requestId: string;
  model: "gpt-6-luna";
};

export type RunResult<
  K extends CapabilityId = CapabilityId
> = {
  data: CapabilityOutput<K>;
  meta: RunMeta<K>;
};

export type RunOptions = {
  requestId?: string;
  signal?: AbortSignal;
};

export type ThiepnAIClientOptions = {
  baseUrl: string;
  appId: string;
  appSecret: string;
  timeoutMs?: number;
  fetch?: typeof globalThis.fetch;
};

export type ServiceSuccess = {
  ok: true;
  data: unknown;
  meta: {
    capability: string;
    version: number;
    requestId: string;
    model: string;
  };
};

export type ServiceFailure = {
  ok: false;
  error: {
    code: ServiceErrorCode;
    message: string;
    requestId: string;
  };
};
