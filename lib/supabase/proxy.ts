import type { Database } from "@/types/database.types";
import { createServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isSupabaseSessionCookieName } from "../supabase-auth-cookies";
import { requireSupabaseEnv } from "./env";
import { supabaseRequestFetch } from "./request-fetch";

export type SupabaseProxyIdentity = {
  uid: string;
  role: string;
  teamId: string | null;
  playerId: string | null;
  isActive: boolean;
};

export function hasSupabaseAuthCookie(request: NextRequest) {
  return request.cookies.getAll().some((cookie) => isSupabaseSessionCookieName(cookie.name));
}

export async function refreshSupabaseSession(
  request: NextRequest,
  response: NextResponse,
  options: {
    resolveIdentity?: boolean;
  } = {},
) {
  if (!hasSupabaseAuthCookie(request)) {
    return { response, identity: null };
  }

  try {
    const { url, publicKey } = requireSupabaseEnv();
    const supabase = createServerClient<Database>(url, publicKey, {
      global: { fetch: supabaseRequestFetch },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          // NextResponse.next snapshots request overrides. Mutating the request
          // afterwards is insufficient: the same server render must receive the
          // refreshed cookies, as well as the browser receiving Set-Cookie.
          const forwarded = NextResponse.next({ request: { headers: request.headers } });
          for (const [name, value] of forwarded.headers) {
            if (name === "x-middleware-override-headers" || name.startsWith("x-middleware-request-")) {
              response.headers.set(name, value);
            }
          }
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return { response, identity: null };
    }
    if (!options.resolveIdentity) {
      return { response, identity: null };
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role,role_source,team_id,player_id,is_active")
      .eq("auth_user_id", user.id)
      .maybeSingle();
    if (profileError) {
      return { response, identity: null };
    }
    const identity =
      profile?.role &&
      profile.is_active &&
      (profile.role_source !== "discord_sync" || process.env.DISCORD_RELATIONAL_TEAM_AUTH_ENABLED?.trim().toLowerCase() === "true")
        ? ({
            uid: user.id,
            role: profile.role,
            teamId: profile.team_id,
            playerId: profile.player_id,
            isActive: true,
          } satisfies SupabaseProxyIdentity)
        : null;

    return { response, identity };
  } catch {
    // Public routes remain available during transient auth failures. Protected
    // routes receive a null identity and therefore continue to fail closed.
    return { response, identity: null };
  }
}
