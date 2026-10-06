# ADR 0004 — Signed Application Identities

Status: Accepted

## Decision

Thiepn applications authenticate to `thiepn/ai` server-to-server using independent HMAC-SHA256 secrets.

Each request signs:

- application ID
- timestamp
- nonce
- HTTP method
- canonical route
- SHA-256 of the canonical JSON body

Verified nonces are persisted temporarily to prevent replay.

## Why

A browser-visible API key would expose the paid model endpoint. A single shared ecosystem key would also make revocation and capability isolation difficult.

Independent signed identities provide:

- no provider key exposure
- per-app revocation
- per-app permissions
- body-integrity verification
- replay protection
- a stable authentication primitive for the future SDK

## Consequence

Client applications must invoke `thiepn/ai` from their trusted server-side runtime. P4 will hide signing details behind the shared client SDK.
