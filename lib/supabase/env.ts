function normalizeEnvValue(value?: string) {
  return value?.trim() || "";
}

export function getSupabaseUrl() {
  return normalizeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_URL);
}

export function getSupabasePublishableKey() {
  return normalizeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
}

export function getSupabasePublicKey() {
  return getSupabasePublishableKey() || normalizeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function isSupabaseConfigured() {
  return Boolean(getSupabaseUrl() && getSupabasePublicKey());
}

export function requireSupabaseEnv() {
  const url = getSupabaseUrl();
  const publicKey = getSupabasePublicKey();

  if (!url || !publicKey) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY)."
    );
  }

  return { url, publicKey };
}
