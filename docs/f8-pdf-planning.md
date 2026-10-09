# F8 — Native PDF Workflow Planning Capability

## Scope

Adds `pdf.planWorkflow` version 1 to the existing `thiepn/ai` service. It is a tightly scoped GPT-6 Luna planning capability, not a PDF-processing operation, a chat endpoint or general-purpose autonomous agent.

- Caller identity: **pdf** only.
- Request: `{ "goal": "Rotate all pages 90 degrees" }`, 3–1,200 characters.
- Response: structured `{schemaVersion:1,title,rationale,actions:[{actionId,paramsJson}],notes}`.
- Allowed actions: ten F5 registry operations. The model produces a JSON object encoded in each `paramsJson`. Independent server validation confirms exact parameter keys, finite numeric ranges, terminal ZIP rules and 1–32 actions.
- Limits: 5 requests/minute and 40/day, max 1,500 output tokens, low reasoning.
- Model output cannot contain approvals, authenticated user identity, file contents, tool calls or execution requests.
- No PDF bytes, filenames or extracted content are sent to Luna; only the user-entered goal.
- Capability `validateOutput` rejects unsafe plans. Downstream PDF Studio still revalidates via the F7 parser and F6 execution preflight.

## Deployment

Generate a separate random secret of at least 32 characters and configure it **only as server-side environment variables**:

- `thiepn/ai` (Vercel): `THIEPN_AI_PDF_SECRET=<secret>`. This overrides/adds the pdf entry in the existing authenticated-app secret set.
- `thiepn/core` (Cloudflare Worker secret): `THIEPN_AI_PDF_SECRET=<same secret>`.
- Existing service `OPENAI_API_KEY` must remain exclusively on the service server.

Do not copy the secret to PDF Studio, any `VITE_` variable, an OAuth callback, GitHub, or client-side code.

Core must be deployed with its `/v1/pdf/ai/plan` route and Account verification before the PDF browser app can call the capability.

## Safety and qualification

- The existing AI provider, logging, token accounting and monthly hard budgets remain authoritative.
- App identity HMAC and replay protection are unchanged.
- Users must first authenticate through Core using a THIEPN Account bearer token.
- This new app identity has no permission to call other capabilities; tests verify the capability's `allowedApps` is exactly `['pdf']`.
- The test suite covers schema, limits, prompt isolation, action normalization, unknown parameters, malformed JSON and premature ZIP export.

Do not claim live-model or production qualification until the live service deployments and supported real-user flows have been exercised.
