import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

/**
 * Elección del proveedor de LLM a partir de las variables de entorno.
 *
 * El equipo evaluador usará SUS claves y no sabemos cuál tendrá, así que basta
 * con una cualquiera: se usa la primera presente en este orden, o la que fije
 * LLM_PROVIDER. Por defecto, el modelo rápido de cada casa: en un tutor
 * conversacional pesa más la latencia que exprimir la última décima de
 * calidad. LLM_MODEL permite cambiarlo sin tocar código.
 */

export type ProviderId = "anthropic" | "openai" | "google";

export const PROVIDERS: Record<ProviderId, { readonly envKey: string; readonly defaultModel: string; readonly label: string }> = {
  anthropic: { envKey: "ANTHROPIC_API_KEY", defaultModel: "claude-haiku-5-5", label: "Anthropic" },
  openai: { envKey: "OPENAI_API_KEY", defaultModel: "gpt-5.4-mini", label: "OpenAI" },
  google: { envKey: "GOOGLE_GENERATIVE_AI_API_KEY", defaultModel: "gemini-3.5-flash", label: "Google" },
};

const ORDER: readonly ProviderId[] = ["anthropic", "openai", "google"];

export type ProviderResolution =
  | { readonly ok: true; readonly id: ProviderId; readonly model: string; readonly apiKey: string }
  | { readonly ok: false; readonly reason: string };

type Env = Readonly<Record<string, string | undefined>>;

const isProvider = (value: string): value is ProviderId => value in PROVIDERS;

/** Función pura (recibe el entorno) para poder probarla sin tocar process.env. */
export function resolveProvider(env: Env): ProviderResolution {
  const forced = env.LLM_PROVIDER?.trim().toLowerCase();
  if (forced) {
    if (!isProvider(forced)) {
      return { ok: false, reason: `LLM_PROVIDER="${forced}" no es válido: usa anthropic, openai o google.` };
    }
    const apiKey = env[PROVIDERS[forced].envKey]?.trim();
    if (!apiKey) {
      return { ok: false, reason: `LLM_PROVIDER=${forced}, pero falta ${PROVIDERS[forced].envKey}.` };
    }
    return { ok: true, id: forced, model: env.LLM_MODEL?.trim() || PROVIDERS[forced].defaultModel, apiKey };
  }
  for (const id of ORDER) {
    const apiKey = env[PROVIDERS[id].envKey]?.trim();
    if (apiKey) return { ok: true, id, model: env.LLM_MODEL?.trim() || PROVIDERS[id].defaultModel, apiKey };
  }
  return {
    ok: false,
    reason: "No hay ninguna clave de LLM configurada (ANTHROPIC_API_KEY, OPENAI_API_KEY o GOOGLE_GENERATIVE_AI_API_KEY).",
  };
}

export function createModel(resolution: Extract<ProviderResolution, { ok: true }>): LanguageModel {
  const { id, model, apiKey } = resolution;
  switch (id) {
    case "anthropic":
      return createAnthropic({ apiKey })(model);
    case "openai":
      return createOpenAI({ apiKey })(model);
    case "google":
      return createGoogleGenerativeAI({ apiKey })(model);
  }
}
