import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { requireSupabaseServiceRoleEnv } from "./server-env";

let serviceRoleClient: SupabaseClient<Database> | null = null;

export function getSupabaseServiceRoleClient(): SupabaseClient<Database> {
  if (serviceRoleClient) {
    return serviceRoleClient;
  }

  const { url, serviceRoleKey } = requireSupabaseServiceRoleEnv();
  serviceRoleClient = createClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return serviceRoleClient;
}
