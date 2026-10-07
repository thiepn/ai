# Finance integration — subscription-independent Ask Finance

THIEPN Finance uses `thiepn/ai` only as an optional natural-language interpretation layer.

## Production boundary

```text
Finance browser
  -> authenticated Finance session
  -> THIEPN Core
  -> signed request as appId=finance
  -> finance.interpretQuestion
  -> GPT-6 Luna
  -> typed interpretation only
  -> Finance deterministic P19 engine
  -> authoritative Finance read models
```

The model does not receive Finance balances, transactions, receipts, account UUIDs, bearer tokens, or database access.

## Capability

`finance.interpretQuestion` accepts only:

- the user's natural-language question;
- the current calendar date.

It returns only the supported P19 intent/period/dimension/necessity fields or an explicit unsupported result.

Merchant, category, and product names are deliberately not model-resolved. Finance resolves those names against its authoritative catalog after interpretation.

## Failure rule

AI is optional. Finance should use its deterministic P19 parser as the zero-cost fast path and invoke this capability only when natural-language interpretation is needed. If Core, the AI service, Luna, rate limits, or the Finance app secret are unavailable, existing deterministic P19 questions remain functional. The Finance product remains usable without ChatGPT, ChatGPT Pro, or an available model call.

## Authority

Finance remains authoritative for every calculation and every record. Luna may interpret language; it may not calculate spending, budgets, net worth, product prices, or receipt state.


## Production app identity

Finance uses a dedicated server-only `THIEPN_AI_FINANCE_SECRET`. The AI service merges that credential into its runtime app-auth map without rewriting `THIEPN_AI_APP_SECRETS_JSON`, so existing Languages authentication remains untouched. Core must hold the same Finance secret when signing `appId=finance` requests.
