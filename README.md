# thiepn/ai

Shared AI infrastructure for the Thiepn ecosystem.

`thiepn/ai` is not a general-purpose chatbot and not a mandatory dependency for every Thiepn app. It is a small internal service that exposes narrowly defined AI capabilities to applications that genuinely benefit from language-model intelligence.

## Current status

**P7 implemented.** The Languages pilot now has a curated French/Japanese evaluation suite, deterministic graders, critical false-positive correction gates, explicit release thresholds, and a manual credential-gated live GPT-6 Luna evaluation workflow with latency/token/cost reporting.

P0 architecture remains authoritative; P8 will move from laboratory evaluation to real-world Languages qualification and defect-only hardening.

## Core principles

1. **One shared AI service, app-specific capabilities.**
2. **GPT-6 Luna is the only initial model.**
3. **Apps invoke capabilities, never raw model prompts.**
4. **Application databases remain authoritative.**
5. **AI may interpret, transform, classify, explain, or propose; deterministic software owns truth and state.**
6. **No unrestricted cross-app memory or database access.**
7. **Every capability is explicitly permissioned, typed, versioned, bounded, and measurable.**
8. **AI is opt-in per feature, not per application.**
9. **Destructive or sensitive writes require explicit user confirmation.**
10. **The platform expands only after a real application proves value.**

## Initial platform shape

```text
Thiepn apps
   |
   v
@thiepn/ai client
   |
   v
thiepn/ai service
   |- authentication / app identity
   |- capability registry
   |- input + output validation
   |- limits / budgets
   |- usage + error logging
   |- tool mediation
   |
   v
GPT-6 Luna
```

## First pilot

The first application integration will be **Languages**. P1-P8 will prove the platform through:

- language correction
- contextual explanation
- targeted exercise generation
- controlled conversation practice
- evaluation and real-use qualification

Only after that pilot is stable should Recipe, StudyOS, Diet, Selah, or cross-app features be added.

## Documentation

- [Architecture](docs/architecture.md)
- [Capability contract](docs/capability-contract.md)
- [Security boundaries](docs/security-boundaries.md)
- [Data and context rules](docs/data-context.md)
- [P0 acceptance criteria](docs/p0-acceptance.md)
- [P1 implementation](docs/p1-implementation.md)
- [P2 implementation](docs/p2-implementation.md)
- [P3 implementation](docs/p3-implementation.md)
- [P4 implementation](docs/p4-implementation.md)
- [P5 implementation](docs/p5-implementation.md)
- [P6 implementation](docs/p6-implementation.md)
- [P7 implementation](docs/p7-implementation.md)
- [Languages integration boundary](docs/languages-integration.md)
- [Architecture decisions](docs/adr/)

## Phase roadmap

| Phase | Objective |
|---|---|
| P0 | Architecture, boundaries, contracts |
| P1 | Minimal GPT-6 Luna execution service |
| P2 | Capability registry + structured schemas |
| P3 | Authentication, permissions, budgets |
| P4 | Shared client SDK |
| P5 | Languages correction + explanation |
| P6 | Languages exercises + conversation |
| P7 | Evaluation suite + reliability hardening |
| P8 | Real-world Languages qualification |
| P9+ | Expansion only if P0-P8 prove useful |

