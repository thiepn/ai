# ADR 0002 — GPT-6 Luna as Initial Model

Status: Accepted

## Decision

Use GPT-6 Luna as the only model in the initial platform.

## Why

The intended workload is inexpensive, low-volume, general-purpose language intelligence for personal applications. A single capable low-cost model is simpler and more reliable than premature model routing.

## Non-decision

This does not permanently couple application contracts to GPT-6 Luna.

Apps invoke capabilities. The provider/model remains internal to `thiepn/ai`.

## Revisit when

- Luna is deprecated
- another model is materially better on measured platform evals
- a real capability has a model requirement Luna cannot satisfy
- provider reliability becomes a demonstrated problem

Price differences alone are not enough reason to add routing complexity at current usage.
