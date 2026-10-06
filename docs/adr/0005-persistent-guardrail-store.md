# ADR 0005 — Persistent Guardrail Store

Status: Accepted

## Decision

Rate limits, replay nonces, budget reservations, and usage counters use a provider-neutral `GuardrailStore` abstraction.

The first production adapter uses Upstash Redis over its HTTP/REST client.

## Why

Vercel functions are ephemeral. In-memory counters cannot safely enforce ecosystem-wide limits across concurrent instances.

The guardrail core should not depend directly on a particular storage vendor.

## Consequences

Production execution fails closed when persistent guardrail storage is unavailable.

Redis-specific code remains isolated in one adapter and can be replaced later without changing capability or execution contracts.
