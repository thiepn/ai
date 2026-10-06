# Languages Integration Boundary

## Current product topology

The current `thiepn/languages` production shell is designed for static delivery on `languages.thiepn.dev` and authenticates the user in the browser with the existing THIEPN Account identity flow.

That means the browser cannot safely contain the `languages` application HMAC secret used by `thiepn/ai`.

## Required topology

```text
languages.thiepn.dev
        |
        | user-authenticated request
        v
trusted THIEPN server runtime
        |
        | @thiepn/ai
        | appId=languages
        | server-only app secret
        v
ai.thiepn.dev
        |
        v
GPT-6 Luna
```

The trusted server runtime may be the existing Core/API layer or another explicitly approved server-side Languages workload.

It must not be the GitHub Pages/browser bundle.

## P5 boundary

P5 implements the production capability contracts in `thiepn/ai`:

- `languages.correct`
- `languages.explain`

It does not add an app secret or OpenAI credential to `thiepn/languages`.

The browser-side product integration should be performed only through an authenticated server bridge that verifies the THIEPN Account user, applies product/user-level authorization and limits, supplies only request-scoped learner context, invokes `@thiepn/ai` with the server-held Languages identity, and returns only the capability result.

## Authority

The AI response is feedback, not learner-state authority.

`thiepn/languages` remains authoritative for StudyEvents, learner evidence, mastery, proficiency, curriculum, scheduling, and progress.

A model-labelled error must not automatically become durable learner evidence merely because Luna returned it. The product decides whether feedback becomes a StudyEvent based on the actual learning interaction and its existing evidence rules.

## Framework compatibility

The capability contract carries `framework + level` rather than assuming every language uses CEFR.

Examples:

```text
French   -> cefr / A2
Japanese -> jlpt / N4
future   -> custom / <product level>
```

The model uses this information only to calibrate feedback depth. It does not award or infer proficiency.
