import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseServiceRoleEnv } from "./env";

let serviceRoleClient: SupabaseClient | null = null;

export function getSupabaseServiceRoleClient() {
  if (serviceRoleClient) {
    return serviceRoleClient;
  }

  const { url, serviceRoleKey } = requireSupabaseServiceRoleEnv();
  serviceRoleClient = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return serviceRoleClient;
}
