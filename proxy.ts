import type { SupabaseProxyIdentity } from "@/lib/supabase/proxy";
import { refreshSupabaseSession } from "@/lib/supabase/proxy";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const SESSION_COOKIE = "bravo_session";
const ADMIN_ROLES = new Set(["super_admin", "admin", "moderator", "organizer"]);
const TEAM_ROLES = new Set(["team_igl", "team_manager", "coach"]);
const PLAYER_ROLES = new Set(["player"]);
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";
const SUPABASE_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || "";

function getSupabaseHeaders() {
  if (!SUPABASE_PUBLIC_KEY) {
    return null;
  }

  return {
    apikey: SUPABASE_PUBLIC_KEY,
    Authorization: `Bearer ${SUPABASE_PUBLIC_KEY}`,
    Accept: "application/json",
  };
}

async function hasPublicSupabaseRow(table: string, filters: Record<string, string>) {
  const headers = getSupabaseHeaders();
  if (!SUPABASE_URL || !headers) {
    return true;
  }

  try {
    const searchParams = new URLSearchParams({
      select: "id",
      limit: "1",
      ...filters,
    });
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${searchParams.toString()}`, {
      headers,
      cache: "no-store",
    });

    if (!response.ok) {
      return true;
    }

    const rows = (await response.json()) as unknown;
    return Array.isArray(rows) && rows.length > 0;
  } catch {
    return true;
  }
}

function notFoundResponse(request: NextRequest) {
  const response = NextResponse.rewrite(new URL("/_not-found", request.url), {
    status: 404,
  });
  response.headers.set("x-robots-tag", "noindex");
  return response;
}

function copyRefreshedCookies(source: NextResponse, target: NextResponse) {
  for (const cookie of source.cookies.getAll()) {
    target.cookies.set(cookie);
  }
  return target;
}

function hasAdminAccess(identity: SupabaseProxyIdentity | null) {
  return Boolean(identity && ADMIN_ROLES.has(identity.role));
}

function hasTeamAccess(identity: SupabaseProxyIdentity | null) {
  return Boolean(identity && TEAM_ROLES.has(identity.role) && identity.teamId);
}

function hasPlayerAccess(identity: SupabaseProxyIdentity | null) {
  return Boolean(identity && PLAYER_ROLES.has(identity.role) && identity.playerId);
}

async function shouldRejectNewsSlug(slug: string) {
  return !(await hasPublicSupabaseRow("app_documents", {
    collection_name: "eq.newsArticles",
    "data->>slug": `eq.${slug}`,
  }));
}

async function shouldRejectMatchSlug(slug: string) {
  return !(await hasPublicSupabaseRow("matches", {
    id: `eq.${slug}`,
  }));
}

export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/news/")) {
    const slug = request.nextUrl.pathname.split("/").filter(Boolean)[1];
    if (!slug || (await shouldRejectNewsSlug(slug))) {
      return (await refreshSupabaseSession(request, notFoundResponse(request))).response;
    }
  }

  if (request.nextUrl.pathname.startsWith("/pubg/matches/")) {
    const slug = request.nextUrl.pathname.split("/").filter(Boolean)[2];
    if (!slug || (await shouldRejectMatchSlug(slug))) {
      return (await refreshSupabaseSession(request, notFoundResponse(request))).response;
    }
  }

  const isAdminRoute = request.nextUrl.pathname.startsWith("/admin");
  const isTeamRoute = request.nextUrl.pathname === "/team" || request.nextUrl.pathname.startsWith("/team/");
  const isPlayerRoute = request.nextUrl.pathname === "/dashboard/player" || request.nextUrl.pathname.startsWith("/dashboard/player/");
  if (!isAdminRoute && !isTeamRoute && !isPlayerRoute) {
    return (await refreshSupabaseSession(request, NextResponse.next({ request }))).response;
  }

  const refreshed = await refreshSupabaseSession(request, NextResponse.next({ request }));
  const identity = refreshed.identity;
  const isAdminLoginPage = request.nextUrl.pathname === "/admin/login";
  const isTeamLoginPage = request.nextUrl.pathname === "/team/login";

  if (isAdminRoute && !isAdminLoginPage && !hasAdminAccess(identity)) {
    const response = NextResponse.redirect(new URL("/admin/login", request.url));
    response.cookies.delete(SESSION_COOKIE);
    return copyRefreshedCookies(refreshed.response, response);
  }

  if (isTeamRoute && !isTeamLoginPage && !hasTeamAccess(identity)) {
    const response = NextResponse.redirect(new URL("/team/login?redirect=/team", request.url));
    if (!identity) response.cookies.delete(SESSION_COOKIE);
    return copyRefreshedCookies(refreshed.response, response);
  }

  if (isPlayerRoute && !hasPlayerAccess(identity)) {
    const response = NextResponse.redirect(new URL("/player/login", request.url));
    if (!identity) response.cookies.delete(SESSION_COOKIE);
    return copyRefreshedCookies(refreshed.response, response);
  }

  refreshed.response.headers.set("Cache-Control", "private, no-store");
  return refreshed.response;
}

export const config = {
  matcher: ["/admin", "/admin/:path*", "/team", "/team/:path*", "/dashboard/player/:path*", "/news/:path*", "/pubg/matches/:path*"],
};
