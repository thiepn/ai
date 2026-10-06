# ADR 0006 — Server-Only Shared Client SDK

Status: Accepted

## Decision

All Thiepn applications integrate with the shared AI service through the `@thiepn/ai` server-side client SDK.

Applications do not independently implement the P3 signing protocol.

## Why

Duplicating authentication and transport logic across repositories would create protocol drift and make security fixes difficult to roll out consistently.

The SDK centralizes:

- signing
- nonces
- timestamps
- request IDs
- transport
- timeouts
- typed capability contracts
- error normalization

## Browser boundary

The SDK is intentionally server-only because it requires an application secret.

A browser must call its own application backend first.

## Distribution

The package is structured to be publishable, but P4 does not publish it. Distribution is finalized when the first real cross-repository consumer is integrated.
