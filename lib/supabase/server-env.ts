import "server-only";

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
  const { url, publicKey } = requireSupabaseEnv();
  const serviceRoleKey = getSupabasePrivilegedKey();

  if (!serviceRoleKey) {
    throw new Error(
      "Supabase privileged server key is not configured. Set SUPABASE_SECRET_KEY (preferred) or SUPABASE_SERVICE_ROLE_KEY for secure admin/server actions.",
    );
  }

  return {
    url,
    publicKey,
    serviceRoleKey,
  };
}
