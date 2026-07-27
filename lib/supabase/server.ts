import type { Database } from "@/types/database.types";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import "server-only";
import { requireSupabaseEnv } from "./env";

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  const { url, publicKey } = requireSupabaseEnv();

  return createServerClient<Database>(url, publicKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          cookieStore.set(name, value, options);
        }
      },
    },
  });
}
