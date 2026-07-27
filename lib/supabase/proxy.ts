import type { Database } from "@/types/database.types";
import { createServerClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";
import { requireSupabaseEnv } from "./env";

export async function refreshSupabaseSession(request: NextRequest, response: NextResponse) {
  const { url, publicKey } = requireSupabaseEnv();
  const supabase = createServerClient<Database>(url, publicKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  await supabase.auth.getUser();
  return response;
}
