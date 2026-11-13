import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { createServerClient } from "@supabase/ssr";

// Exercise the actual callback route with installed SSR/Next cookie adapters.
// Provider replies, profile authorization and request context are offline fixtures;
// no credential, user, guild or database from a real project is used.
const require = createRequire(import.meta.url);
const { RequestCookies, ResponseCookies } = require("next/dist/server/web/spec-extension/cookies.js");
const { MutableRequestCookiesAdapter, appendMutableCookies } = require("next/dist/server/web/spec-extension/adapters/request-cookies.js");
const originalEnvironment = { ...process.env };
const originalFetch = globalThis.fetch;
for (const name of Object.keys(process.env))
  if (/SUPABASE|R2_|PUBG_|DISCORD_|DATABASE_URL|DIRECT_URL|QA_STAGING_/.test(name)) delete process.env[name];
process.env.NODE_ENV = "production";

const origin = "https://offline-callback.supabase.co";
const site = "https://bravo.example";
const cookieName = "sb-offline-callback-auth-token";
const verifierName = `${cookieName}-code-verifier`;
const intentName = "bravo_discord_oauth_intent";
const intent = "00000000-0000-4000-8000-000000000003";
const fixtures = {
  "next/headers": "export async function cookies(){return globalThis.__bravoCallbackCheck.cookies;}",
  "@/lib/supabase/server": "export async function createSupabaseServerClient(){return globalThis.__bravoCallbackCheck.client;}",
  "@/lib/audit-logs": "export async function writeAuditLogFromRequest(){}",
  "@/lib/supabase-auth-server": `export const SESSION_COOKIE='bravo_session';export const REFRESH_COOKIE='bravo_refresh';export function getSessionCookieMaxAge(){return 3600;}export async function verifyAccessToken(){return {uid:'offline-user',email:'offline@example.invalid',role:'admin',isAdmin:true,teamId:null,playerId:null};}`,
  "@/lib/discord-role-sync": "export class DiscordRoleSyncError extends Error{constructor(category,message){super(message);this.category=category;}}",
  "@/lib/discord-login": "import {DiscordRoleSyncError} from '@/lib/discord-role-sync';export async function completeDiscordLogin(){if(globalThis.__bravoCallbackCheck.rejectMembership)throw new DiscordRoleSyncError('not_member','Offline membership denial');return {redirectTo:'/admin',notice:null};}",
};

async function main() {
  mkdirSync(new URL("../qa-artifacts/auth-callback-rejection/", import.meta.url), { recursive: true });
  const bundlePath = fileURLToPath(new URL("../qa-artifacts/auth-callback-rejection/route.cjs", import.meta.url));
  await build({
    entryPoints: [fileURLToPath(new URL("../app/auth/callback/route.ts", import.meta.url))],
    outfile: bundlePath,
    bundle: true,
    platform: "node",
    format: "cjs",
    packages: "external",
    logLevel: "silent",
    plugins: [{
      name: "offline-callback-context",
      setup(builder) {
        builder.onResolve({ filter: /^(next\/headers|@\/lib\/supabase\/server|@\/lib\/audit-logs|@\/lib\/supabase-auth-server|@\/lib\/discord-role-sync|@\/lib\/discord-login)$/ }, args => ({ path: args.path, namespace: "offline-fixture" }));
        builder.onLoad({ filter: /.*/, namespace: "offline-fixture" }, args => ({ contents: fixtures[args.path], loader: "js" }));
      },
    }],
  });
  const { GET } = require(bundlePath);
  const user = {
    id: "00000000-0000-4000-8000-000000000001",
    email: "offline@example.invalid",
    aud: "authenticated",
    role: "authenticated",
    app_metadata: {},
    // Ensure exchange creates multiple new cookie chunks, not a single cookie.
    user_metadata: { display_name: "Offline fixture ".repeat(700) },
    identities: [{ provider: "discord", identity_data: { sub: "123456789012345678" } }],
    created_at: "2026-01-01T00:00:00.000Z",
  };
  const claims = { sub: user.id, exp: Math.floor(Date.now() / 1000) + 3600, aud: "authenticated", role: "authenticated", amr: [{ method: "oauth" }] };
  const accessToken = [Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url"), Buffer.from(JSON.stringify(claims)).toString("base64url"), "offline-signature"].join(".");
  const session = { access_token: accessToken, refresh_token: "offline-refresh", expires_in: 3600, expires_at: claims.exp, token_type: "bearer", user };

  async function execute({ mode, invalidIntent = false, rejectMembership = true }) {
    const incoming = new Headers({ cookie: `${verifierName}=base64-${Buffer.from(JSON.stringify("offline-pkce-verifier")).toString("base64url")}; ${intentName}=${intent}; bravo_session=old-compatibility; theme=dark` });
    const cookies = MutableRequestCookiesAdapter.wrap(new RequestCookies(incoming));
    let exchanges = 0;
    let logoutAttempts = 0;
    globalThis.fetch = async input => {
      const url = new URL(input instanceof Request ? input.url : String(input));
      assert.equal(url.origin, origin, "Offline callback QA must not contact real services");
      if (url.pathname === "/auth/v1/token") { exchanges++; return Response.json(session); }
      if (url.pathname === "/auth/v1/user") return Response.json(user);
      if (url.pathname === "/auth/v1/logout") {
        logoutAttempts++;
        return Response.json({ code: "unexpected_failure", message: "Offline logout service unavailable" }, { status: 503 });
      }
      throw new Error("Unexpected offline callback request");
    };
    const createdNames = new Set();
    const client = createServerClient(origin, "offline-public-key", {
      cookies: {
        getAll: () => cookies.getAll().map(({ name, value }) => ({ name, value })),
        setAll: values => {
          for (const { name, value, options } of values) {
            cookies.set(name, value, options);
            if (name.startsWith(cookieName) && !name.includes("code-verifier") && value) createdNames.add(name);
          }
        },
      },
    });
    const sdkSignOut = client.auth.signOut.bind(client.auth);
    let sdkReturnedError = false;
    let sdkRetainedNewSession = false;
    client.auth.signOut = async options => {
      if (mode === "throws") {
        logoutAttempts++;
        // Also exercise a cookie created during a failing SDK sign-out/refresh.
        const lateName = `${cookieName}.99`;
        cookies.set(lateName, "offline-late-cookie", { path: "/", secure: true });
        createdNames.add(lateName);
        throw new Error("Offline SDK sign-out threw");
      }
      const result = await sdkSignOut(options);
      sdkReturnedError = Boolean(result.error);
      sdkRetainedNewSession = cookies.getAll().some(cookie => createdNames.has(cookie.name) && cookie.value);
      return result;
    };
    globalThis.__bravoCallbackCheck = { cookies, client, rejectMembership };
    const request = new Request(`${site}/auth/callback?code=offline-code&flow=discord&intent=${invalidIntent ? "00000000-0000-4000-8000-000000000004" : intent}&next=%2Fadmin`, { headers: incoming });
    const response = await GET(request);
    assert.equal(exchanges, 1, "The actual SSR SDK must exchange a code before rejection");
    assert.ok(createdNames.size >= 2, "The actual SSR SDK must create new session-cookie chunks");
    const headers = new Headers(response.headers);
    appendMutableCookies(headers, cookies);
    const outgoing = new ResponseCookies(headers);
    assert.equal(response.status, 303);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    if (rejectMembership || invalidIntent) {
      assert.equal(logoutAttempts, 1);
      const destination = new URL(response.headers.get("location"));
      assert.equal(destination.pathname, "/login");
      assert.equal(destination.searchParams.get("error"), invalidIntent ? "oauth_intent_invalid" : "discord_not_member");
      if (mode === "http503") {
        assert.equal(sdkReturnedError, true, "Installed auth-js returns an error rather than clearing cookies on logout503");
        assert.equal(sdkRetainedNewSession, true, "The fixture must reproduce an SDK session surviving before callback cleanup");
      }
      for (const name of [...createdNames, verifierName, "bravo_session", "bravo_refresh", intentName]) {
        const cookie = outgoing.get(name);
        assert.ok(cookie, `Rejected callback must expire ${name}`);
        assert.equal(Boolean(cookie.value), false, `Rejected callback left a live cookie: ${name}`);
        assert.ok(cookie.maxAge === 0 || cookie.expires?.getTime() <= Date.now(), `Rejected callback must expire ${name}`);
        assert.equal(cookie.httpOnly, true);
        assert.equal(cookie.secure, true);
        assert.equal(cookie.path, name === intentName ? "/auth/callback" : "/");
      }
      assert.equal(outgoing.get("theme"), undefined, "Auth rejection must not modify unrelated cookies");
    } else {
      assert.equal(logoutAttempts, 0);
      assert.equal(new URL(response.headers.get("location")).pathname, "/admin");
      assert.equal(outgoing.get("bravo_session").value, accessToken);
      assert.ok([...createdNames].every(name => outgoing.get(name)?.value), "Approved callbacks retain their actual SDK session");
    }
  }

  await execute({ mode: "http503" });
  await execute({ mode: "throws" });
  await execute({ mode: "http503", invalidIntent: true, rejectMembership: false });
  await execute({ mode: "http503", rejectMembership: false });
  console.log("PASS: actual callback rejects membership/intent failures and expires newly exchanged/chunked/late SDK cookies plus compatibility cookies despite logout503 or thrown sign-out; installed Next cookie merging and successful callback preservation verified. Offline fixtures only.");
}

try { await main(); }
finally {
  globalThis.fetch = originalFetch;
  delete globalThis.__bravoCallbackCheck;
  for (const name of Object.keys(process.env)) if (!Object.hasOwn(originalEnvironment, name)) delete process.env[name];
  Object.assign(process.env, originalEnvironment);
}
