import "server-only";

import { AuthBackendConfigurationError } from "../auth-errors";
import { assertPreviewSupabaseEnvironment } from "../preview-resource-policy.js";
import { isSupabaseConfigured, requireSupabaseEnv } from "./env";

function normalizeEnvValue(value?: string) {
  return value?.trim() || "";
}

function getSupabaseSecretKey() {
  return normalizeEnvValue(process.env.SUPABASE_SECRET_KEY);
}

function getSupabaseServiceRoleKey() {
  return normalizeEnvValue(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function getSupabasePrivilegedKey() {
  return getSupabaseSecretKey() || getSupabaseServiceRoleKey();
}

export function isSupabaseServiceRoleConfigured() {
  return Boolean(isSupabaseConfigured() && getSupabasePrivilegedKey());
}

export function requireSupabaseServiceRoleEnv() {
  try {
    assertPreviewSupabaseEnvironment(process.env);
  } catch (error) {
    throw new AuthBackendConfigurationError(error instanceof Error ? error.message : "Vercel Preview server configuration is unsafe.");
  }
  const { url, publicKey } = requireSupabaseEnv();
  const serviceRoleKey = getSupabasePrivilegedKey();

  if (!serviceRoleKey) {
    throw new AuthBackendConfigurationError(
      "Supabase privileged server key is not configured. Set SUPABASE_SECRET_KEY (preferred) or SUPABASE_SERVICE_ROLE_KEY for secure admin/server actions.",
    );
  }

  return {
    url,
    publicKey,
    serviceRoleKey,
  };
}
