import {
  createHmac,
  timingSafeEqual
} from "node:crypto";
import { z } from "zod";
import type { GuardrailStore } from "../guardrails/store.js";
import { AiServiceError } from "../core/errors.js";
import { sha256Hex, stableJson } from "./canonical.js";

const APP_ID_PATTERN = /^[a-z][a-z0-9-]{1,31}$/;
const NONCE_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;
const MAX_CLOCK_SKEW_SECONDS = 300;
const NONCE_TTL_SECONDS = 600;

const secretMapSchema = z.record(
  z.string().regex(APP_ID_PATTERN),
  z.string().min(32)
);

export type HeaderValue = string | string[] | undefined;
export type RequestHeaders = Record<string, HeaderValue>;

export type AuthenticatedApp = {
  appId: string;
};

function firstHeader(headers: RequestHeaders, name: string): string | undefined {
  const value = headers[name] ?? headers[name.toLowerCase()];

  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

export function loadAppSecrets(
  raw = process.env.THIEPN_AI_APP_SECRETS_JSON,
  financeSecret = process.env.THIEPN_AI_FINANCE_SECRET
): Readonly<Record<string, string>> {
  if (!raw) {
    throw new AiServiceError(
      "INTERNAL_ERROR",
      "Application authentication is not configured.",
      500
    );
  }

  try {
    const parsedJson: unknown = JSON.parse(raw);
    const secrets = secretMapSchema.parse(parsedJson);
    const finance = financeSecret?.trim();

    return finance
      ? secretMapSchema.parse({ ...secrets, finance })
      : secrets;
  } catch (error) {
    throw new AiServiceError(
      "INTERNAL_ERROR",
      "Application authentication configuration is invalid.",
      500,
      { cause: error }
    );
  }
}

export function buildSignaturePayload(args: {
  appId: string;
  timestamp: string;
  nonce: string;
  method: string;
  path: string;
  body: unknown;
}): string {
  return [
    "v1",
    args.appId,
    args.timestamp,
    args.nonce,
    args.method.toUpperCase(),
    args.path,
    sha256Hex(stableJson(args.body))
  ].join("\n");
}

export function signAppRequest(args: {
  secret: string;
  appId: string;
  timestamp: string;
  nonce: string;
  method: string;
  path: string;
  body: unknown;
}): string {
  const payload = buildSignaturePayload(args);
  const digest = createHmac("sha256", args.secret)
    .update(payload, "utf8")
    .digest("hex");

  return `v1=${digest}`;
}

function signaturesEqual(expected: string, provided: string): boolean {
  const expectedBuffer = Buffer.from(expected, "utf8");
  const providedBuffer = Buffer.from(provided, "utf8");

  if (expectedBuffer.length !== providedBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, providedBuffer);
}

export async function authenticateAppRequest(args: {
  headers: RequestHeaders;
  method: string;
  path: string;
  body: unknown;
  store: GuardrailStore;
  nowMs?: number;
  secrets?: Readonly<Record<string, string>>;
}): Promise<AuthenticatedApp> {
  const appId = firstHeader(args.headers, "x-thiepn-app");
  const timestamp = firstHeader(args.headers, "x-thiepn-timestamp");
  const nonce = firstHeader(args.headers, "x-thiepn-nonce");
  const signature = firstHeader(args.headers, "x-thiepn-signature");

  if (!appId || !timestamp || !nonce || !signature) {
    throw new AiServiceError(
      "UNAUTHORIZED",
      "Missing application authentication headers.",
      401
    );
  }

  if (!APP_ID_PATTERN.test(appId) || !NONCE_PATTERN.test(nonce)) {
    throw new AiServiceError(
      "UNAUTHORIZED",
      "Invalid application authentication headers.",
      401
    );
  }

  const timestampSeconds = Number(timestamp);
  const nowSeconds = Math.floor((args.nowMs ?? Date.now()) / 1000);

  if (
    !Number.isInteger(timestampSeconds) ||
    Math.abs(nowSeconds - timestampSeconds) > MAX_CLOCK_SKEW_SECONDS
  ) {
    throw new AiServiceError(
      "UNAUTHORIZED",
      "Application request timestamp is invalid or expired.",
      401
    );
  }

  const secrets = args.secrets ?? loadAppSecrets();
  const secret = secrets[appId];

  if (!secret) {
    throw new AiServiceError(
      "UNAUTHORIZED",
      "Unknown application identity.",
      401
    );
  }

  const expected = signAppRequest({
    secret,
    appId,
    timestamp,
    nonce,
    method: args.method,
    path: args.path,
    body: args.body
  });

  if (!signaturesEqual(expected, signature)) {
    throw new AiServiceError(
      "UNAUTHORIZED",
      "Invalid application signature.",
      401
    );
  }

  const claimed = await args.store.claimNonce(
    `auth:nonce:${appId}:${nonce}`,
    NONCE_TTL_SECONDS
  );

  if (!claimed) {
    throw new AiServiceError(
      "UNAUTHORIZED",
      "Application request was already used.",
      401
    );
  }

  return { appId };
}
