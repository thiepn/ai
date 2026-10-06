import { randomUUID } from "node:crypto";

export function createRequestId(provided?: string): string {
  return provided ?? randomUUID();
}
