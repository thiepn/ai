import { Redis } from "@upstash/redis";
import type { GuardrailStore } from "./store.js";

const INCREMENT_WINDOW_SCRIPT = `
local current = redis.call("INCR", KEYS[1])
if current == 1 then
  redis.call("EXPIRE", KEYS[1], ARGV[1])
end
return current
`;

const RESERVE_BUDGET_SCRIPT = `
local current = tonumber(redis.call("GET", KEYS[1]) or "0")
local amount = tonumber(ARGV[1])
local limit = tonumber(ARGV[2])
local ttl = tonumber(ARGV[3])

if current + amount > limit then
  return 0
end

local next = current + amount
redis.call("SET", KEYS[1], tostring(next), "EX", ttl)
return 1
`;

const ADJUST_BUDGET_SCRIPT = `
local current = tonumber(redis.call("GET", KEYS[1]) or "0")
local delta = tonumber(ARGV[1])
local ttl = tonumber(ARGV[2])
local next = current + delta

if next < 0 then
  next = 0
end

redis.call("SET", KEYS[1], tostring(next), "EX", ttl)
return next
`;

const INCREMENT_METRIC_SCRIPT = `
local current = tonumber(redis.call("GET", KEYS[1]) or "0")
local amount = tonumber(ARGV[1])
local ttl = tonumber(ARGV[2])
local next = current + amount
redis.call("SET", KEYS[1], tostring(next), "EX", ttl)
return next
`;

export class UpstashGuardrailStore implements GuardrailStore {
  constructor(private readonly redis: Redis) {}

  static fromEnv(): UpstashGuardrailStore {
    if (
      !process.env.UPSTASH_REDIS_REST_URL ||
      !process.env.UPSTASH_REDIS_REST_TOKEN
    ) {
      throw new Error("Persistent guardrail store is not configured.");
    }

    return new UpstashGuardrailStore(
      new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
        enableTelemetry: false,
        signal: () => AbortSignal.timeout(2_000)
      })
    );
  }

  async claimNonce(key: string, ttlSeconds: number): Promise<boolean> {
    const result = await this.redis.set(key, "1", {
      nx: true,
      ex: ttlSeconds
    });

    return result === "OK";
  }

  async incrementFixedWindow(
    key: string,
    ttlSeconds: number
  ): Promise<number> {
    return Number(
      await this.redis.eval(
        INCREMENT_WINDOW_SCRIPT,
        [key],
        [ttlSeconds]
      )
    );
  }

  async reserveBudget(
    key: string,
    amountNanosUsd: number,
    limitNanosUsd: number,
    ttlSeconds: number
  ): Promise<boolean> {
    const result = await this.redis.eval(
      RESERVE_BUDGET_SCRIPT,
      [key],
      [amountNanosUsd, limitNanosUsd, ttlSeconds]
    );

    return Number(result) === 1;
  }

  async adjustBudget(
    key: string,
    deltaNanosUsd: number,
    ttlSeconds: number
  ): Promise<number> {
    return Number(
      await this.redis.eval(
        ADJUST_BUDGET_SCRIPT,
        [key],
        [deltaNanosUsd, ttlSeconds]
      )
    );
  }

  async incrementMetric(
    key: string,
    amount: number,
    ttlSeconds: number
  ): Promise<number> {
    return Number(
      await this.redis.eval(
        INCREMENT_METRIC_SCRIPT,
        [key],
        [amount, ttlSeconds]
      )
    );
  }

  async getNumber(key: string): Promise<number> {
    const result = await this.redis.get<number | string>(key);
    return result === null ? 0 : Number(result);
  }
}
