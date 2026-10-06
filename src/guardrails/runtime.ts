import { AiServiceError } from "../core/errors.js";
import { GuardrailManager } from "./manager.js";
import type { GuardrailStore } from "./store.js";
import { UpstashGuardrailStore } from "./upstash-store.js";

let store: GuardrailStore | undefined;
let manager: GuardrailManager | undefined;

export function getRuntimeGuardrailStore(): GuardrailStore {
  if (store) {
    return store;
  }

  try {
    store = UpstashGuardrailStore.fromEnv();
    return store;
  } catch (error) {
    throw new AiServiceError(
      "INTERNAL_ERROR",
      "Persistent guardrail storage is not configured.",
      500,
      { cause: error }
    );
  }
}

export function getRuntimeGuardrailManager(): GuardrailManager {
  manager ??= new GuardrailManager(getRuntimeGuardrailStore());
  return manager;
}
