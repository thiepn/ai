# THIEPN Recipe integration — Luna capabilities

Three standalone capabilities are registered for the `recipe` app identity only:

- `recipe.generate`: create one structured recipe suggestion from an explicit brief, pantry ingredients, excluded ingredients, servings and language.
- `recipe.extract`: extract structured recipe fields from user-supplied plain/OCR text without inventing absent quantities or cooking steps.
- `recipe.cookingHelp`: help with a single selected recipe and question; no access to the broader cookbook.

The inference service still owns GPT-6 Luna usage, service-budget and rate limits, signed application identity and replay protection. **There is no user-facing API key.** Caller identity must be `recipe` and the Core Gateway should sign requests with an independent, ≥32-character secret provisioned in the AI secret map.

Outputs are strongly typed and validated. AI cannot save recipes, read other product data, publish, edit existing records, or call arbitrary tools. Generated content is always proposed for human review. Allergy/food-safety warnings are not a substitute for professional advice or thermometer verification.

## Production setup

1. Stage shared AI capability changes and deploy after CI.
2. Add a separate `recipe` secret to `THIEPN_AI_APP_SECRETS_JSON` in the server's encrypted environment configuration, **without printing or committing it**.
3. Configure the exact same secret under the Core Gateway server-only `THIEPN_AI_RECIPE_SECRET` environment variable.
4. Smoke-test signatures, capability permissions, rate/budget exhaustion, malformed output and real model latency.
5. Deploy Recipe UI only when Core is reachable. It must continue functioning when AI is not configured.

These changes do not modify provider SDK credentials or any Supabase database.
