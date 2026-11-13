import assert from "node:assert/strict";
import { NextRequest, NextResponse } from "next/server";
import { refreshSupabaseSession } from "../lib/supabase/proxy";

// In-process provider responses exercise the installed SSR SDK and actual proxy
// cookie adapter. This is an offline regression, not a live Supabase login.
async function main() {
  const names = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "DISCORD_RELATIONAL_TEAM_AUTH_ENABLED"] as const;
  const previous = Object.fromEntries(names.map((name) => [name, process.env[name]]));
  const originalFetch = globalThis.fetch;
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://offline.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "offline-public-key";
  process.env.DISCORD_RELATIONAL_TEAM_AUTH_ENABLED = "false";
  const user = {
    id: "00000000-0000-4000-8000-000000000001",
    aud: "authenticated",
    role: "authenticated",
    email: "offline@example.invalid",
    user_metadata: { role: "super_admin" },
    app_metadata: {},
    created_at: new Date().toISOString(),
  };
  const token = (exp: number) =>
    [
      Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url"),
      Buffer.from(JSON.stringify({ sub: user.id, exp, iat: exp - 3600, aud: "authenticated", role: "authenticated" })).toString(
        "base64url",
      ),
      "offline-signature",
    ].join(".");
  const oldSession = {
    access_token: token(Math.floor(Date.now() / 1000) - 60),
    refresh_token: "offline-refresh",
    expires_at: Math.floor(Date.now() / 1000) - 60,
    expires_in: 3600,
    token_type: "bearer",
    user,
  };
  const newSession = {
    ...oldSession,
    access_token: token(Math.floor(Date.now() / 1000) + 3600),
    expires_at: Math.floor(Date.now() / 1000) + 3600,
  };
  const cookieName = "sb-offline-auth-token";
  const oldCookie = `${cookieName}=base64-${Buffer.from(JSON.stringify(oldSession)).toString("base64url")}`;
  let refreshes = 0;
  let profile = { role: "admin", role_source: "manual", team_id: null, player_id: null, is_active: true };
  let userAllowed = true;
  globalThis.fetch = async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    assert.equal(url.origin, "https://offline.supabase.co", "Regression tests must never contact live services");
    assert.ok(init?.signal instanceof AbortSignal && !init.signal.aborted, "Proxy SDK requests must retain a bounded fetch signal.");
    if (url.pathname === "/auth/v1/token") {
      refreshes += 1;
      return Response.json(newSession);
    }
    if (url.pathname === "/auth/v1/user")
      return userAllowed ? Response.json(user) : Response.json({ code: "bad_jwt", message: "Invalid JWT" }, { status: 401 });
    if (url.pathname === "/rest/v1/profiles") return Response.json([profile]);
    throw new Error(`Unexpected offline request: ${url.pathname}`);
  };
  const request = () => new NextRequest("https://bravo.example/admin", { headers: { Cookie: oldCookie } });
  try {
    const first = request();
    const before = NextResponse.next({ request: { headers: first.headers } });
    assert.equal(before.headers.get("x-middleware-request-cookie"), oldCookie);
    const result = await refreshSupabaseSession(first, before, { resolveIdentity: true });
    assert.equal(refreshes, 1);
    assert.equal(result.identity?.role, "admin");
    assert.notEqual(first.headers.get("cookie"), oldCookie);
    assert.equal(
      result.response.headers.get("x-middleware-request-cookie"),
      first.headers.get("cookie"),
      "The current RSC render must receive the refreshed session, not the expired snapshot",
    );
    assert.ok(result.response.cookies.getAll().some((cookie) => cookie.name === cookieName && cookie.value !== oldCookie));

    profile = { ...profile, role: "viewer" };
    assert.equal(
      (await refreshSupabaseSession(request(), NextResponse.next(), { resolveIdentity: true })).identity?.role,
      "viewer",
      "OAuth metadata cannot elevate a viewer",
    );
    profile = { ...profile, role: "admin", role_source: "discord_sync" };
    assert.equal((await refreshSupabaseSession(request(), NextResponse.next(), { resolveIdentity: true })).identity, null);
    process.env.DISCORD_RELATIONAL_TEAM_AUTH_ENABLED = "true";
    assert.equal(
      (await refreshSupabaseSession(request(), NextResponse.next(), { resolveIdentity: true })).identity?.role,
      "admin",
      "Explicitly enabled Discord roles must match server-session policy",
    );
    profile = { ...profile, is_active: false };
    assert.equal((await refreshSupabaseSession(request(), NextResponse.next(), { resolveIdentity: true })).identity, null);
    userAllowed = false;
    assert.equal((await refreshSupabaseSession(request(), NextResponse.next(), { resolveIdentity: true })).identity, null);
    console.log(
      "Offline SSR refresh, same-request cookie forwarding, profile roles, Discord policy and inactive/invalid-session denial passed.",
    );
  } finally {
    globalThis.fetch = originalFetch;
    for (const name of names) {
      if (previous[name] === undefined) delete process.env[name];
      else process.env[name] = previous[name];
    }
  }
}
void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
