import { hasEdgeAdminAccess, hasEdgeTeamAccess, resolveEdgeIdentity } from "@/lib/edge-auth";
import { refreshSupabaseSession } from "@/lib/supabase/proxy";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const SESSION_COOKIE = "bravo_session";
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
      return refreshSupabaseSession(request, notFoundResponse(request));
    }
  }

  if (request.nextUrl.pathname.startsWith("/pubg/matches/")) {
    const slug = request.nextUrl.pathname.split("/").filter(Boolean)[2];
    if (!slug || (await shouldRejectMatchSlug(slug))) {
      return refreshSupabaseSession(request, notFoundResponse(request));
    }
  }

  const isAdminRoute = request.nextUrl.pathname.startsWith("/admin");
  const isTeamRoute = request.nextUrl.pathname === "/team" || request.nextUrl.pathname.startsWith("/team/");
  if (!isAdminRoute && !isTeamRoute) {
    return refreshSupabaseSession(request, NextResponse.next({ request }));
  }

  const identity = await resolveEdgeIdentity(request);
  const isAdminLoginPage = request.nextUrl.pathname === "/admin/login";
  const isTeamLoginPage = request.nextUrl.pathname === "/team/login";

  if (isAdminRoute && !isAdminLoginPage && !hasEdgeAdminAccess(identity)) {
    const response = NextResponse.redirect(new URL("/admin/login", request.url));
    response.cookies.delete(SESSION_COOKIE);
    return refreshSupabaseSession(request, response);
  }

  if (isTeamRoute && !isTeamLoginPage && !hasEdgeTeamAccess(identity)) {
    const response = NextResponse.redirect(new URL("/team/login?redirect=/team", request.url));
    if (!identity) response.cookies.delete(SESSION_COOKIE);
    return refreshSupabaseSession(request, response);
  }

  const response = NextResponse.next();
  response.headers.set("Cache-Control", "private, no-store");
  return refreshSupabaseSession(request, response);
}

export const config = {
  matcher: ["/admin", "/admin/:path*", "/team", "/team/:path*", "/news/:path*", "/pubg/matches/:path*"],
};
