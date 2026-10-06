# ADR 0007 — Explicit Bounded Conversation State

Status: Accepted

## Decision

`languages.conversation` is stateless at the shared AI-service layer.

Every turn carries the conversation state required for that turn:

- scenario;
- up to 16 prior messages;
- current learner message;
- explicit target skills/categories/vocabulary;
- support and correction modes.

The AI service does not persist hidden chat memory.

## Why

Persistent model-owned conversation state would weaken several P0 boundaries:

- app-local data ownership;
- minimum necessary context;
- predictable cost;
- debuggability;
- privacy;
- reproducibility.

Languages already owns the learning/session domain and should decide what conversation context is retained.

## Consequences

The calling product is responsible for selecting and retaining conversation history.

The 16-message bound prevents unlimited context growth.

If future product evidence shows that longer continuity is valuable, Languages should summarize or deliberately select prior context rather than granting the AI service unrestricted session memory.
