import type { Database } from "@/types/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@supabase/supabase-js";
import "server-only";
import { requireSupabaseServiceRoleEnv } from "./server-env";
import { supabaseRequestFetch } from "./request-fetch";

let serviceRoleClient: SupabaseClient<Database> | null = null;

export function getSupabaseServiceRoleClient(): SupabaseClient<Database> {
  if (serviceRoleClient) {
    return serviceRoleClient;
  }

  const { url, serviceRoleKey } = requireSupabaseServiceRoleEnv();
  serviceRoleClient = createClient<Database>(url, serviceRoleKey, {
    global: { fetch: supabaseRequestFetch },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return serviceRoleClient;
}
