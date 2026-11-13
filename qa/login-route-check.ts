import assert from "node:assert/strict";
import { build } from "esbuild";
import { getLoginFailureDetails, LOGIN_ERROR_MESSAGES } from "../lib/user-facing-errors";

type Fixture = {
  signIns: number;
  signOuts: number;
  rateChecks: number;
  logs: number;
  cookies: Array<{ name: string; value: string }>;
  after: Array<() => Promise<void>>;
  verified: { uid: string; email: string; role: string; isAdmin: boolean; teamId: string | null; playerId: string | null; displayName: string | null };
  providerError?: unknown;
  providerThrow?: unknown;
  profileError?: unknown;
  auditError?: unknown;
  loggingError?: unknown;
  rateError?: unknown;
  limited?: boolean;
  missingSession?: boolean;
  signOutReturnError?: boolean;
  signOutThrows?: boolean;
  signOutAddsCookie?: boolean;
  incomingCookie?: string;
  afterThrows?: boolean;
};

const globalFixture = globalThis as typeof globalThis & { __bravoLoginRouteFixture?: Fixture };

// Exercise the real POST handler, origin/authorization decisions, configuration
// readers and error policy. Only SDK/request-context/logging services are
// fixtures. All networking is forbidden; this does not claim real login.
export async function checkLoginRouteFailures() {
  const mocks: Record<string, string> = {
    "server-only": "",
    "next/server": "export const after = callback => {const state=globalThis.__bravoLoginRouteFixture;if(state.afterThrows)throw new Error('fixture-private logging registration failed');state.after.push(callback);};",
    "next/headers": "export async function cookies(){return {getAll:()=>globalThis.__bravoLoginRouteFixture.cookies};}",
    "@/lib/audit-logs": "export async function writeAuditLogFromRequest() { const state=globalThis.__bravoLoginRouteFixture; if(state.auditError) throw state.auditError; }",
    "@/lib/server-monitoring": "export async function logServerError() { const state=globalThis.__bravoLoginRouteFixture; state.logs++; if(state.loggingError) throw state.loggingError; }",
    "@/lib/rate-limit": `export async function enforceRateLimit() {
      const state=globalThis.__bravoLoginRouteFixture; state.rateChecks++;
      if(state.rateError) throw state.rateError;
      return state.limited ? new Response(null, {status:429,headers:{'Retry-After':'60','X-RateLimit-Remaining':'0'}}) : null;
    }`,
    "@/lib/supabase/server": `import { requireSupabaseEnv } from '@/lib/supabase/env';
      export async function createSupabaseServerClient() {
        requireSupabaseEnv();
        return {auth:{async signInWithPassword() {
          const state=globalThis.__bravoLoginRouteFixture; state.signIns++;
          if(state.providerThrow) throw state.providerThrow;
          if(state.providerError) return {data:{session:null},error:state.providerError};
          state.cookies.push({name:'sb-offline-auth-token.0',value:'offline-chunk-0'},{name:'sb-offline-auth-token.1',value:'offline-chunk-1'},{name:'sb-offline-auth-token-code-verifier',value:'offline-verifier'},{name:'ordinary-cookie',value:'keep'});
          return {data:{session:state.missingSession ? null : {access_token:'offline-access',refresh_token:'offline-refresh'}},error:null};
        },async signOut() {
          const state=globalThis.__bravoLoginRouteFixture; state.signOuts++;
          if(state.signOutAddsCookie) state.cookies.push({name:'sb-offline-auth-token.2',value:'offline-chunk-2'});
          if(state.signOutThrows) throw new Error('fixture-private logout failed');
          if(state.signOutReturnError) return {error:new Error('fixture-private logout failed')};
          state.cookies=state.cookies.filter(cookie=>!cookie.name.startsWith('sb-')); return {error:null};
        }}};
      }`,
    "@/lib/supabase-auth-server": `import { requireSupabaseServiceRoleEnv } from '@/lib/supabase/server-env';
      export const SESSION_COOKIE='bravo_session'; export const REFRESH_COOKIE='bravo_refresh';
      export function getSessionCookieMaxAge(){return 3600;}
      export async function createSessionCookie(){return 'offline-access';}
      export async function verifyAccessToken() {
        requireSupabaseServiceRoleEnv(); const state=globalThis.__bravoLoginRouteFixture;
        if(state.profileError) throw state.profileError; return state.verified;
      }`,
  };
  const result = await build({
    stdin: { contents: "export { POST } from './app/api/auth/login/route'; export { AuthConfigurationError } from './lib/auth-errors';", resolveDir: process.cwd(), loader: "ts" },
    bundle: true,
    write: false,
    platform: "node",
    format: "esm",
    plugins: [{ name: "offline-login-services", setup(builder) {
      builder.onResolve({ filter: /^(server-only|next\/(server|headers)|@\/lib\/)/ }, (args) => Object.hasOwn(mocks, args.path) ? { path: args.path, namespace: "offline-login" } : undefined);
      builder.onLoad({ filter: /.*/, namespace: "offline-login" }, (args) => ({ contents: mocks[args.path], loader: "js", resolveDir: process.cwd() }));
    } }],
  });
  const route = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString("base64")}`) as {
    POST: (request: Request) => Promise<Response>;
    AuthConfigurationError: new (category: "account_inactive", message: string) => Error;
  };
  const names = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY", "NODE_ENV"];
  const previous = Object.fromEntries(names.map(name => [name, process.env[name]]));
  const originalFetch = globalThis.fetch;
  const oldFixture = globalFixture.__bravoLoginRouteFixture;
  const configure = () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://offline.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "offline-public-key";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "";
    process.env.SUPABASE_SECRET_KEY = "offline-server-key";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "";
    Object.assign(process.env, { NODE_ENV: "production" });
  };
  const fixture = (overrides: Partial<Fixture> = {}): Fixture => ({
    signIns: 0, signOuts: 0, rateChecks: 0, logs: 0, after: [], cookies: [],
    verified: { uid: "offline-user", email: "offline@example.invalid", role: "admin", isAdmin: true, teamId: null, playerId: null, displayName: null },
    ...overrides,
  });
  let assertions = 0;
  async function request(expected: number, state = fixture(), body: unknown = { email: "offline@example.invalid", password: "offline-password", variant: "admin" }, origin = "https://bravo.example") {
    globalFixture.__bravoLoginRouteFixture = state;
    const response = await route.POST(new Request("https://bravo.example/api/auth/login", {
      method: "POST", headers: { Origin: origin, "Content-Type": "application/json", ...(state.incomingCookie ? { Cookie: state.incomingCookie } : {}) }, body: JSON.stringify(body),
    }));
    const payload = await response.json();
    assert.equal(response.status, expected);
    assert.equal(payload.success, expected === 200);
    assert.match(response.headers.get("cache-control") || "", /no-store/);
    assert.doesNotMatch(JSON.stringify(payload), /fixture-private|42703|offline-public-key|offline-server-key/);
    if (expected >= 400) assert.equal(payload.status, expected);
    assertions++;
    return { response, payload, state };
  }
  try {
    configure();
    globalThis.fetch = async () => { throw new Error("Live network access is forbidden in offline login QA."); };
    for (const body of [{}, null, [], 42, "unexpected body", { email: "offline@example.invalid" }]) {
      const result = await request(400, fixture(), body);
      assert.equal(result.state.signIns, 0);
    }
    const limited = await request(429, fixture({ limited: true }));
    assert.equal(limited.response.headers.get("retry-after"), "60");
    assert.equal(limited.response.headers.get("x-ratelimit-remaining"), "0");
    assert.equal(limited.state.signIns, 0);
    await request(401, fixture({ providerError: { status: 400, code: "invalid_credentials", message: "Invalid login credentials" } }));
    await request(401, fixture({ providerError: { status: 400, message: "Invalid login credentials" }, afterThrows: true, loggingError: new Error("fixture-private logger failure") }));
    await request(401, fixture({ providerThrow: { status: 401, message: "Invalid login credentials" } }));
    await request(401, fixture({ providerError: { status: 400, code: "email_not_confirmed", message: "Email not confirmed" } }));
    await request(429, fixture({ providerError: { status: 429, message: "Too many requests" } }));
    await request(429, fixture({ providerThrow: { status: 429, message: "Too many requests" } }));
    await request(503, fixture({ providerError: { status: 503, message: "fixture-private upstream unavailable" } }));
    await request(503, fixture({ providerError: { status: 500, message: "fixture-private upstream failure" } }));
    await request(503, fixture({ providerError: { status: 401, message: "Invalid API key" } }));
    await request(503, fixture({ providerThrow: Object.assign(new TypeError("fetch failed"), { cause: { code: "ENOTFOUND" } }) }));
    await request(503, fixture({ providerThrow: { name: "AuthRetryableFetchError", status: 0, message: "fixture-private network error" } }));
    await request(503, fixture({ profileError: { message: "TypeError: fetch failed" } }));
    await request(503, fixture({ profileError: { cause: { code: "ERR_TLS_CERT_ALTNAME_INVALID" } } }));
    await request(503, fixture({ missingSession: true }));
    process.env.NEXT_PUBLIC_SUPABASE_URL = "";
    const missingPublic = await request(503);
    assert.equal(missingPublic.state.signIns, 0);
    configure();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "invalid-backend-url";
    const invalidEndpoint = await request(503);
    assert.equal(invalidEndpoint.state.signIns, 0);
    configure();
    process.env.SUPABASE_SECRET_KEY = "";
    const missingServer = await request(503);
    assert.equal(missingServer.state.signOuts, 1);
    configure();
    const viewer = fixture(); viewer.verified = { ...viewer.verified, role: "viewer", isAdmin: false };
    const denied = await request(403, viewer);
    assert.equal(denied.state.signOuts, 1);
    assert.match(denied.response.headers.get("set-cookie") || "", /bravo_session=;/);
    assert.match(denied.response.headers.get("set-cookie") || "", /Max-Age=0/);
    for (const failure of [{ signOutReturnError: true }, { signOutThrows: true }]) {
      const rejected = fixture({ ...failure, signOutAddsCookie: true, incomingCookie: "sb-incoming-auth-token.0=offline-old; ordinary-incoming=keep" });
      rejected.verified = { ...rejected.verified, role: "viewer", isAdmin: false };
      const cleared = (await request(403, rejected)).response.headers.get("set-cookie") || "";
      for (const name of ["sb-incoming-auth-token.0", "sb-offline-auth-token.0", "sb-offline-auth-token.1", "sb-offline-auth-token.2", "sb-offline-auth-token-code-verifier"]) assert.ok(cleared.includes(`${name}=;`));
      assert.doesNotMatch(cleared, /ordinary-cookie|ordinary-incoming/);
    }
    await request(403, fixture({ profileError: new route.AuthConfigurationError("account_inactive", LOGIN_ERROR_MESSAGES.inactiveAccount) }));
    const schema = await request(500, fixture({ profileError: { code: "42703", message: "fixture-private missing profiles column" } }));
    assert.equal(schema.payload.error, LOGIN_ERROR_MESSAGES.serverError);
    assert.equal(schema.state.signOuts, 1);
    assert.match(schema.response.headers.get("set-cookie") || "", /bravo_refresh=;/);
    const schemaWithLogoutError = await request(500, fixture({ profileError: { code: "42703", message: "fixture-private missing profiles column" }, signOutReturnError: true }));
    assert.match(schemaWithLogoutError.response.headers.get("set-cookie") || "", /sb-offline-auth-token\.0=;/);
    const unavailableWithLogoutError = await request(503, fixture({ profileError: Object.assign(new TypeError("fetch failed"), { cause: { code: "ENOTFOUND" } }), signOutThrows: true }));
    assert.match(unavailableWithLogoutError.response.headers.get("set-cookie") || "", /sb-offline-auth-token\.1=;/);
    await request(500, fixture({ rateError: new Error("fixture-private limiter bug") }));
    await request(500, fixture({ providerThrow: new TypeError("fixture-private programming error") }));
    await request(500, fixture({ auditError: new Error("fixture-private audit error") }));
    await request(500, fixture({ profileError: new Error("fixture-private failure"), loggingError: new Error("fixture-private logger failure") }));
    const successful = await request(200);
    assert.equal(successful.payload.redirectTo, "/admin");
    assert.equal(successful.state.signOuts, 0);
    assert.match(successful.response.headers.get("set-cookie") || "", /HttpOnly; SameSite=Strict; Priority=High; Max-Age=3600; Secure/);
    const blockedOrigin = fixture();
    globalFixture.__bravoLoginRouteFixture = blockedOrigin;
    const foreign = await route.POST(new Request("https://bravo.example/api/auth/login", { method: "POST", headers: { Origin: "https://attacker.invalid" }, body: "{}" }));
    assert.equal(foreign.status, 403); assert.equal(blockedOrigin.rateChecks, 0); assert.equal(blockedOrigin.signIns, 0);
    assert.equal(getLoginFailureDetails({ status: 500, message: LOGIN_ERROR_MESSAGES.serverError }, { variant: "admin", stage: "credentials" }).category, "server_error");
    assert.equal(getLoginFailureDetails({ status: 503, message: LOGIN_ERROR_MESSAGES.backendUnavailable }, { variant: "admin", stage: "credentials" }).category, "backend_unavailable");
    console.log(`Offline actual login-route QA passed: ${assertions} responses, status classification, safe errors, role/origin denials and cookie cleanup. No live login claimed.`);
  } finally {
    globalThis.fetch = originalFetch;
    if (oldFixture === undefined) delete globalFixture.__bravoLoginRouteFixture;
    else globalFixture.__bravoLoginRouteFixture = oldFixture;
    for (const name of names) {
      if (previous[name] === undefined) delete process.env[name]; else process.env[name] = previous[name];
    }
  }
}
