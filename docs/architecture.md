# Architecture

## Purpose

`thiepn/ai` provides a shared, controlled AI execution layer for selected Thiepn applications.

The platform centralizes model access and operational concerns while keeping product behavior app-specific.

## System boundary

```text
App UI
  |
  v
App server / authenticated backend
  |
  v
@thiepn/ai client
  |
  v
POST /v1/run
  |
  +--> authenticate caller
  +--> resolve capability
  +--> validate input
  +--> enforce permissions + limits
  +--> construct model request
  +--> execute GPT-6 Luna
  +--> validate structured output
  +--> record usage / latency / failure
  |
  v
Typed result
```

Apps must not call the model provider directly.

## Initial technology decision

P1 will use the official OpenAI API with `gpt-6-luna` through a provider adapter owned by `thiepn/ai`.

There is deliberately no multi-model router in the initial architecture. The provider boundary exists so the implementation can change later without changing app contracts.

## Platform layers

### 1. Core

Owns generic infrastructure:

- model execution
- authentication and caller identity
- capability resolution
- schema validation
- token / request / spend limits
- retries and normalized errors
- telemetry
- tool mediation

Core must contain no app-specific teaching, recipe, study, or domain behavior.

### 2. Capabilities

A capability is a versioned AI operation with one purpose.

Examples:

```text
languages.correct
languages.explain
languages.generateExercise
recipe.interpretSearch
study.classifyMaterial
```

Each capability owns:

- stable ID
- description
- input schema
- output schema
- prompt/instructions
- reasoning level
- token limits
- caller permissions
- version
- optional tools

Apps invoke capabilities. They do not submit arbitrary system prompts.

### 3. Tools

Tools bridge model reasoning to authoritative application systems.

Example:

```text
User intent
   |
   v
languages.findRecentMistakes
   |
   v
Languages service / DB
```

The model never receives unrestricted database credentials.

## Authority model

### Deterministic software is authoritative for

- persisted state
- calculations
- game rules
- database facts
- permissions
- billing
- destructive actions
- exact search results
- canonical curriculum/progress state

### The model may

- interpret natural language
- classify
- extract
- summarize
- explain
- rewrite
- generate bounded content
- propose tool calls
- format results

This distinction is non-negotiable.

## App-local context

There is no global personal-memory blob.

A request carries only context needed for that capability.

```text
Languages request -> language-learning context
Recipe request    -> recipe context
Study request     -> study context
```

Cross-app access is a future explicit capability, not an implicit default.

## Initial endpoint surface

P1-P4 should keep the public surface minimal:

```text
POST /v1/run
GET  /v1/health
```

Usage/admin endpoints may be added when needed. Chat is not a separate primitive initially; conversational capabilities can run through the same capability system.

## Non-goals for P0-P8

- universal Thiepn chatbot
- autonomous cross-app agent
- unrestricted tool execution
- model marketplace/router
- vector database owned by the AI service
- global user memory
- self-hosted model inference
- AI added to every app
- replacing domain engines such as Stockfish
- model-generated authoritative calculations

## Evolution rule

New infrastructure is added only when a real capability requires it.

The preferred progression is:

```text
real use case
  -> capability
  -> repeated limitation
  -> minimal platform primitive
```

not:

```text
hypothetical future feature
  -> large generic platform
```
