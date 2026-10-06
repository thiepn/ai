import { createHmac } from "node:crypto";
import { sha256Hex, stableJson } from "./canonical.js";

export const RUN_PATH = "/v1/run";

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

export function signRequest(args: {
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
