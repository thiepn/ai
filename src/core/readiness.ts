import { getRuntimeGuardrailStore } from "../guardrails/runtime.js";
import { loadAppSecrets } from "../security/app-auth.js";

export type RuntimeReadiness = {
  ready: boolean;
  dependencies: {
    provider: boolean;
    guardrails: boolean;
    appAuth: boolean;
  };
};

export function getRuntimeReadiness(
  env: NodeJS.ProcessEnv = process.env
): RuntimeReadiness {
  const provider = Boolean(env.OPENAI_API_KEY);
  const guardrails = Boolean(
    (env.UPSTASH_REDIS_REST_URL ??
      env.KV_REST_API_URL) &&
    (env.UPSTASH_REDIS_REST_TOKEN ??
      env.KV_REST_API_TOKEN)
  );

  let appAuth = false;
  try {
    const secrets = loadAppSecrets(
      env.THIEPN_AI_APP_SECRETS_JSON
    );
    appAuth = Boolean(secrets.languages);
  } catch {
    appAuth = false;
  }

  return {
    ready: provider && guardrails && appAuth,
    dependencies: {
      provider,
      guardrails,
      appAuth
    }
  };
}

export async function checkRuntimeReadiness(
  env: NodeJS.ProcessEnv = process.env,
  probeGuardrails: () => Promise<unknown> = () =>
    getRuntimeGuardrailStore().getNumber(
      "health:readiness-probe"
    )
): Promise<RuntimeReadiness> {
  const configured = getRuntimeReadiness(env);

  if (!configured.dependencies.guardrails) {
    return configured;
  }

  let guardrails = false;
  try {
    await probeGuardrails();
    guardrails = true;
  } catch {
    guardrails = false;
  }

  return {
    ready:
      configured.dependencies.provider &&
      guardrails &&
      configured.dependencies.appAuth,
    dependencies: {
      ...configured.dependencies,
      guardrails
    }
  };
}
