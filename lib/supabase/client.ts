"use client";

import type { Database } from "@/types/database.types";
import { createBrowserClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseEnv } from "./env";

let browserClient: SupabaseClient<Database> | null = null;
let passwordRecoveryClient: SupabaseClient<Database> | null = null;

export function getSupabaseBrowserClient(): SupabaseClient<Database> {
  if (browserClient) {
    return browserClient;
  }

  const { url, publicKey } = requireSupabaseEnv();
  browserClient = createBrowserClient<Database>(url, publicKey);
  return browserClient;
}

export function getSupabasePasswordRecoveryClient(): SupabaseClient<Database> {
  if (passwordRecoveryClient) {
    return passwordRecoveryClient;
  }

  const { url, publicKey } = requireSupabaseEnv();
  passwordRecoveryClient = createClient<Database>(url, publicKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: true,
      flowType: "implicit",
      persistSession: false,
      storageKey: "bravo-password-recovery",
    },
  });
  return passwordRecoveryClient;
}
