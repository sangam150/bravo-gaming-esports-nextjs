import { AuthBackendConfigurationError } from "../auth-errors";
import { assertPreviewSupabaseEnvironment } from "../preview-resource-policy.js";

function normalizeEnvValue(value?: string) {
  return value?.trim() || "";
}

function getSupabaseUrl() {
  return normalizeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_URL);
}

function getSupabasePublishableKey() {
  return normalizeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
}

function getSupabasePublicKey() {
  return getSupabasePublishableKey() || normalizeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function isSupabaseConfigured() {
  return Boolean(getSupabaseUrl() && getSupabasePublicKey());
}

export function requireSupabaseEnv() {
  try {
    assertPreviewSupabaseEnvironment(process.env);
  } catch (error) {
    throw new AuthBackendConfigurationError(error instanceof Error ? error.message : "Vercel Preview Supabase configuration is unsafe.");
  }
  const url = getSupabaseUrl();
  const publicKey = getSupabasePublicKey();

  if (!url || !publicKey) {
    throw new AuthBackendConfigurationError(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY).",
    );
  }

  try {
    const endpoint = new URL(url);
    if (!/^https?:$/.test(endpoint.protocol) || endpoint.username || endpoint.password) throw new Error("Invalid endpoint");
  } catch {
    throw new AuthBackendConfigurationError("Supabase URL is invalid. Configure a valid HTTP(S) endpoint without URL credentials.");
  }

  return { url, publicKey };
}
