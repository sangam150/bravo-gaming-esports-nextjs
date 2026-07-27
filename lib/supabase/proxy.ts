import type { Database } from "@/types/database.types";
import { createServerClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";
import { requireSupabaseEnv } from "./env";

export type SupabaseProxyIdentity = {
  uid: string;
  role: string;
  teamId: string | null;
  playerId: string | null;
  isActive: boolean;
};

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

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { response, identity: null };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role,team_id,player_id,is_active")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  const identity =
    profile?.role && profile.is_active
      ? ({
          uid: user.id,
          role: profile.role,
          teamId: profile.team_id,
          playerId: profile.player_id,
          isActive: true,
        } satisfies SupabaseProxyIdentity)
      : null;

  return { response, identity };
}
