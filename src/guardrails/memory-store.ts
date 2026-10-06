import type { GuardrailStore } from "./store.js";

type Entry = {
  value: number;
  expiresAtMs: number;
};

export class MemoryGuardrailStore implements GuardrailStore {
  readonly #values = new Map<string, Entry>();
  readonly #nonces = new Map<string, number>();

  constructor(private readonly now: () => number = () => Date.now()) {}

  #getEntry(key: string): Entry | undefined {
    const entry = this.#values.get(key);

    if (entry && entry.expiresAtMs <= this.now()) {
      this.#values.delete(key);
      return undefined;
    }

    return entry;
  }

  async claimNonce(key: string, ttlSeconds: number): Promise<boolean> {
    const now = this.now();
    const existingExpiry = this.#nonces.get(key);

    if (existingExpiry !== undefined && existingExpiry > now) {
      return false;
    }

    this.#nonces.set(key, now + ttlSeconds * 1000);
    return true;
  }

  async incrementFixedWindow(
    key: string,
    ttlSeconds: number
  ): Promise<number> {
    const existing = this.#getEntry(key);

    if (!existing) {
      this.#values.set(key, {
        value: 1,
        expiresAtMs: this.now() + ttlSeconds * 1000
      });
      return 1;
    }

    existing.value += 1;
    return existing.value;
  }

  async reserveBudget(
    key: string,
    amountNanosUsd: number,
    limitNanosUsd: number,
    ttlSeconds: number
  ): Promise<boolean> {
    const existing = this.#getEntry(key);
    const current = existing?.value ?? 0;

    if (current + amountNanosUsd > limitNanosUsd) {
      return false;
    }

    this.#values.set(key, {
      value: current + amountNanosUsd,
      expiresAtMs: existing?.expiresAtMs ?? this.now() + ttlSeconds * 1000
    });

    return true;
  }

  async adjustBudget(
    key: string,
    deltaNanosUsd: number,
    ttlSeconds: number
  ): Promise<number> {
    const existing = this.#getEntry(key);
    const current = existing?.value ?? 0;
    const next = Math.max(0, current + deltaNanosUsd);

    this.#values.set(key, {
      value: next,
      expiresAtMs: existing?.expiresAtMs ?? this.now() + ttlSeconds * 1000
    });

    return next;
  }

  async incrementMetric(
    key: string,
    amount: number,
    ttlSeconds: number
  ): Promise<number> {
    const existing = this.#getEntry(key);
    const next = (existing?.value ?? 0) + amount;

    this.#values.set(key, {
      value: next,
      expiresAtMs: existing?.expiresAtMs ?? this.now() + ttlSeconds * 1000
    });

    return next;
  }

  async getNumber(key: string): Promise<number> {
    return this.#getEntry(key)?.value ?? 0;
  }
}
