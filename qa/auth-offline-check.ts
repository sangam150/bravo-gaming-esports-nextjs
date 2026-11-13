import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { readSafeAuthDestination, resolveAuthorizedAuthDestination } from "../lib/auth-destinations";
import { hasPlayerDashboardAccess, hasTeamWorkspaceAccess } from "../lib/authz";
import { buildDiscordAuthCallbackUrl } from "../lib/discord-auth";
import { validateSameOriginRequest } from "../lib/request-origin";
import { isSupabaseAuthCookieName, isSupabaseSessionCookieName, requestHasSupabaseAuthCookie } from "../lib/supabase-auth-cookies";
import { checkLoginRouteFailures } from "./login-route-check";
import { checkSupabaseFetchTimeouts } from "./supabase-fetch-check";
import { GET as getProviderAvailability } from "../app/api/auth/providers/route";

assert.equal(readSafeAuthDestination("https://attacker.invalid"), null);
assert.equal(readSafeAuthDestination("//attacker.invalid"), null);
assert.equal(resolveAuthorizedAuthDestination({ role: "viewer" }, "/admin"), "/");
assert.equal(resolveAuthorizedAuthDestination({ isAdmin: true, role: "admin" }, "/admin"), "/admin");
assert.equal(resolveAuthorizedAuthDestination({ role: "team_igl", teamId: "team-1" }, "/team"), "/team");
assert.equal(resolveAuthorizedAuthDestination({ playerId: "player-1", role: "player" }, "/dashboard/player"), "/dashboard/player");
assert.equal(resolveAuthorizedAuthDestination({ role: "team_igl" }, "/team"), "/");
assert.equal(resolveAuthorizedAuthDestination({ role: "player" }, "/dashboard/player"), "/");
assert.equal(hasTeamWorkspaceAccess("team_igl"), true);
assert.equal(hasTeamWorkspaceAccess("team_igl", true), false);
assert.equal(hasPlayerDashboardAccess("player"), true);
assert.equal(isSupabaseAuthCookieName("sb-project-auth-token-code-verifier"), true);
assert.equal(isSupabaseSessionCookieName("sb-project-auth-token-code-verifier"), false);
assert.equal(isSupabaseSessionCookieName("sb-project-auth-token.0"), true);
assert.equal(
  requestHasSupabaseAuthCookie(new Request("https://bravo.example", { headers: { Cookie: "sb-project-auth-token-code-verifier=pkce" } })),
  false,
);
assert.equal(
  buildDiscordAuthCallbackUrl("https://bravo.example", "/", "test-intent"),
  "https://bravo.example/auth/callback?flow=discord&intent=test-intent&next=%2F",
);
assert.equal(
  validateSameOriginRequest(
    new Request("https://bravo.example/api/auth/login", {
      method: "POST",
      headers: { Origin: "https://bravo.example" },
    }),
  ),
  null,
);
assert.equal(
  validateSameOriginRequest(
    new Request("https://bravo.example/api/auth/login", {
      method: "POST",
      headers: { Origin: "https://attacker.invalid" },
    }),
  ),
  "A same-origin request is required.",
);
assert.equal(
  validateSameOriginRequest(new Request("https://bravo.example/api/auth/session", { method: "DELETE" })),
  "A same-origin request is required.",
);

async function main() {
  await checkLoginRouteFailures();
  await checkSupabaseFetchTimeouts();
  const providerEnvironmentNames = ["DISCORD_LOGIN_ENABLED", "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"];
  const previousProviderEnvironment = Object.fromEntries(providerEnvironmentNames.map(name => [name, process.env[name]]));
  const providerFetch = globalThis.fetch;
  try {
    let providerRequests = 0;
    globalThis.fetch = async input => {
      providerRequests++;
      assert.equal(new URL(String(input)).pathname, "/auth/v1/settings");
      return Response.json({ external: { discord: true } });
    };
    process.env.DISCORD_LOGIN_ENABLED = " false ";
    assert.deepEqual(await (await getProviderAvailability()).json(), { discord: false });
    assert.equal(providerRequests, 0, "Disabled Discord must not depend on a working Auth service or stop email login.");
    process.env.DISCORD_LOGIN_ENABLED = "true";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://offline.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "offline-public";
    assert.deepEqual(await (await getProviderAvailability()).json(), { discord: true });
    globalThis.fetch = async () => Response.json({ external: { discord: false } });
    assert.deepEqual(await (await getProviderAvailability()).json(), { discord: false }, "Local opt-in must not override a disabled Supabase provider.");
    globalThis.fetch = async () => { throw new Error("offline provider outage"); };
    assert.deepEqual(await (await getProviderAvailability()).json(), { discord: false });
  } finally {
    globalThis.fetch = providerFetch;
    for (const name of providerEnvironmentNames) {
      if (previousProviderEnvironment[name] === undefined) delete process.env[name];
      else process.env[name] = previousProviderEnvironment[name];
    }
  }
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  try {
    const [{ NextRequest, NextResponse }, { refreshSupabaseSession }] = await Promise.all([
      import("next/server"),
      import("../lib/supabase/proxy"),
    ]);
    const requestWithStaleCookie = new NextRequest("https://bravo.example/", {
      headers: { Cookie: "sb-project-auth-token=stale" },
    });
    const publicResponse = NextResponse.next();
    const refreshResult = await refreshSupabaseSession(requestWithStaleCookie, publicResponse);
    assert.equal(refreshResult.response, publicResponse);
    assert.equal(refreshResult.identity, null);
  } finally {
    if (supabaseUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = supabaseUrl;
    if (supabasePublishableKey === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    else process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = supabasePublishableKey;
    if (supabaseAnonKey === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = supabaseAnonKey;
  }

  const providerSource = await readFile(new URL("../app/api/auth/providers/route.ts", import.meta.url), "utf8");
  assert.match(providerSource, /\/auth\/v1\/settings/);
  assert.match(providerSource, /external[\s\S]*discord[\s\S]*=== true/);
  assert.match(providerSource, /AbortSignal\.timeout\(PROVIDER_SETTINGS_TIMEOUT_MS\)/);
  assert.match(providerSource, /if \(!response\.ok\)[\s\S]*return false/);
  assert.doesNotMatch(providerSource, /\/auth\/v1\/authorize/);
  assert.doesNotMatch(providerSource, /redirect: "manual"/);
  assert.match(providerSource, /"Cache-Control": "private, no-store, max-age=0"/);
  assert.doesNotMatch(providerSource, /NEXT_PUBLIC_DISCORD|DISCORD_PROVIDER_ENABLED/);

  const discordButtonSource = await readFile(new URL("../components/auth/DiscordLoginButton.tsx", import.meta.url), "utf8");
  assert.match(discordButtonSource, /Connecting to Discord…/);
  assert.match(discordButtonSource, /\/api\/auth\/discord-intent/);
  assert.doesNotMatch(discordButtonSource, /Discordâ/);

  const loginHubSource = await readFile(new URL("../components/auth/LoginHubClient.tsx", import.meta.url), "utf8");
  const oauthPanel = loginHubSource.match(/\{discordAuthEnabled \? \([\s\S]+?\) : null\}/)?.[0] ?? "";
  assert.match(oauthPanel, /Or continue with/i);
  assert.match(oauthPanel, /DiscordLoginButton/);

  const callbackSource = await readFile(new URL("../app/auth/callback/route.ts", import.meta.url), "utf8");
  assert.match(callbackSource, /exchangeCodeForSession/);
  assert.match(callbackSource, /supabase\.auth\.getUser/);
  assert.match(callbackSource, /completeDiscordLogin/);
  assert.match(callbackSource, /verifyAccessToken/);
  assert.match(callbackSource, /httpOnly: true/);
  assert.match(callbackSource, /rejectCallback/);
  assert.match(callbackSource, /DISCORD_OAUTH_INTENT_COOKIE/);
  assert.match(callbackSource, /readAuthenticationMethods/);

  const passwordLoginSource = await readFile(new URL("../app/api/auth/login/route.ts", import.meta.url), "utf8");
  assert.match(passwordLoginSource, /signInWithPassword/);
  assert.match(passwordLoginSource, /verifyAccessToken/);
  assert.match(passwordLoginSource, /resolveAuthorizedAuthDestination/);
  assert.match(passwordLoginSource, /hasTeamWorkspaceAccess/);
  assert.match(passwordLoginSource, /hasPlayerDashboardAccess/);
  assert.match(passwordLoginSource, /export async function POST[\s\S]*?requireSameOrigin\(request\)/);
  assert.doesNotMatch(passwordLoginSource, /role\s*=\s*body|email.*super_admin/i);

  const passwordResetSource = await readFile(new URL("../app/api/auth/password-reset/route.ts", import.meta.url), "utf8");
  assert.match(passwordResetSource, /resetPasswordForEmail/);
  assert.match(passwordResetSource, /redirectTo: `\$\{origin\}\/reset-password`/);
  assert.match(passwordResetSource, /export async function POST[\s\S]*?requireSameOrigin\(request\)/);
  assert.match(passwordResetSource, /flowType: "implicit"/);
  assert.match(passwordResetSource, /Always return the same public success response to avoid account enumeration/);

  const sessionSource = await readFile(new URL("../app/api/auth/session/route.ts", import.meta.url), "utf8");
  assert.match(sessionSource, /verifyAccessToken/);
  assert.match(sessionSource, /createSessionCookie/);
  assert.match(sessionSource, /export async function DELETE/);
  assert.match(sessionSource, /createSupabaseRouteClient/);
  assert.match(sessionSource, /signOut\(\{ scope: "local" \}\)/);
  assert.match(sessionSource, /request\.cookies[\s\S]*getAll\(\)/);
  assert.match(sessionSource, /isSupabaseAuthCookieName/);
  assert.match(sessionSource, /SESSION_COOKIE/);
  assert.match(sessionSource, /REFRESH_COOKIE/);
  assert.match(sessionSource, /export async function POST[\s\S]*?requireSameOrigin\(request\)/);
  assert.match(sessionSource, /export async function DELETE[\s\S]*?requireSameOrigin\(request\)/);

  const proxySource = await readFile(new URL("../proxy.ts", import.meta.url), "utf8");
  assert.match(proxySource, /refreshSupabaseSession/);
  assert.match(proxySource, /resolveIdentity: true/);
  assert.match(proxySource, /\(\?!api\(\?:\/\|\$\)\|_next\/static\|_next\/image/);
  assert.match(proxySource, /hasAdminAccess/);
  assert.match(proxySource, /hasTeamAccess/);
  assert.match(proxySource, /hasPlayerAccess/);

  const supabaseProxySource = await readFile(new URL("../lib/supabase/proxy.ts", import.meta.url), "utf8");
  assert.match(supabaseProxySource, /createServerClient/);
  assert.match(supabaseProxySource, /hasSupabaseAuthCookie/);
  assert.match(supabaseProxySource, /if \(!hasSupabaseAuthCookie\(request\)\)/);
  assert.match(supabaseProxySource, /getAll\(\)/);
  assert.match(supabaseProxySource, /setAll\(cookiesToSet\)/);
  assert.match(supabaseProxySource, /supabase\.auth\.getUser\(\)/);
  assert.match(supabaseProxySource, /error: userError/);
  assert.match(supabaseProxySource, /if \(userError \|\| !user\)/);
  assert.match(supabaseProxySource, /error: profileError/);
  assert.match(supabaseProxySource, /profile\.role_source !== "discord_sync"/);
  assert.match(supabaseProxySource, /catch \{[\s\S]*return \{ response, identity: null \}/);
  assert.ok(
    supabaseProxySource.indexOf("if (!options.resolveIdentity)") < supabaseProxySource.indexOf('.from("profiles")'),
    "Public document refresh must not perform the protected-route profile lookup.",
  );

  const adminAuthSource = await readFile(new URL("../lib/admin-auth.ts", import.meta.url), "utf8");
  assert.match(adminAuthSource, /if \(!auth\.session\.profileId\)/);
  assert.match(adminAuthSource, /Super-admin or admin role required/);
  assert.match(adminAuthSource, /sessionCookie && !requestHasSupabaseAuthCookie\(request\)/);

  const discordRoleSource = await readFile(new URL("../lib/discord-role-sync.ts", import.meta.url), "utf8");
  assert.match(discordRoleSource, /DISCORD_RELATIONAL_TEAM_AUTH_ENABLED\?\.trim\(\)\.toLowerCase\(\) === "true"/);
  assert.match(discordRoleSource, /resolution\.denied/);
  assert.match(discordRoleSource, /relationalTeamAuthEnabled && resolution\.teamState/);
  assert.match(discordRoleSource, /manuallyProtected/);
  assert.match(discordRoleSource, /isDiscordSnowflakeList/);
  assert.match(discordRoleSource, /configuredDenyRoleIds/);
  assert.match(discordRoleSource, /relationalTeamAuthEnabled[\s\S]*?effectiveRole[\s\S]*?: profile\.role/);
  assert.match(discordRoleSource, /role: relationalTeamAuthEnabled \? effectiveRole : profile\.role/);
  assert.equal(
    discordRoleSource.match(/https:\/\/discord\.com\/api\/v10\/guilds/g)?.length,
    1,
    "Discord login must fetch the guild member exactly once.",
  );

  const discordLoginSource = await readFile(new URL("../lib/discord-login.ts", import.meta.url), "utf8");
  assert.match(discordLoginSource, /const verifiedMember = await verifyDiscordGuildMembership\(user\)/);
  assert.match(discordLoginSource, /syncDiscordRoles\(user, verifiedMember\)/);

  const serverAuthSource = await readFile(new URL("../lib/supabase-auth-server.ts", import.meta.url), "utf8");
  assert.doesNotMatch(serverAuthSource, /getProfileFromDiscordUserId|syncDiscordRoles|extractDiscordUserId/);
  assert.match(serverAuthSource, /\.eq\("auth_user_id", authUserId\)/);
  assert.match(serverAuthSource, /profileRecord\.role_source !== "discord_sync"/);

  const recoveryClientSource = await readFile(new URL("../components/auth/PasswordRecoveryClient.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(recoveryClientSource, /exchangeCodeForSession/);
  assert.match(recoveryClientSource, /event === "PASSWORD_RECOVERY"/);
  assert.match(recoveryClientSource, /session\?\.access_token !== recoveryAccessToken/);
  assert.match(recoveryClientSource, /getSupabasePasswordRecoveryClient/);

  const supabaseClientSource = await readFile(new URL("../lib/supabase/client.ts", import.meta.url), "utf8");
  assert.match(supabaseClientSource, /flowType: "implicit"/);
  assert.match(supabaseClientSource, /persistSession: false/);
  assert.match(supabaseClientSource, /storageKey: "bravo-password-recovery"/);

  const teamAccessSource = await readFile(new URL("../app/api/admin/teams/[id]/access/route.ts", import.meta.url), "utf8");
  assert.match(teamAccessSource, /role_source: "manual"/);

  const adminResetSource = await readFile(new URL("../app/api/admin/reset/route.ts", import.meta.url), "utf8");
  assert.match(adminResetSource, /requireSameOrigin\(request\)/);
  assert.match(adminResetSource, /session\.role !== "super_admin"/);
  assert.match(adminResetSource, /RESET COMPETITION DATA/);
  assert.match(adminResetSource, /writeRequiredAuditLogFromRequest/);

  const provisionAdminSource = await readFile(new URL("../scripts/provision-admin.ts", import.meta.url), "utf8");
  assert.match(provisionAdminSource, /if \(!authUser\.email_confirmed_at\)/);
  assert.match(provisionAdminSource, /role_source: "manual"/);
  assert.doesNotMatch(provisionAdminSource, /\.auth\.admin\.updateUserById/);
  assert.doesNotMatch(provisionAdminSource, /(?:user|app)_metadata\s*:\s*\{[\s\S]*?\brole\s*:/);

  const profileProvisioningSource = await readFile(new URL("../lib/profile-provisioning.ts", import.meta.url), "utf8");
  assert.match(profileProvisioningSource, /role_source: "system"/);
  assert.doesNotMatch(profileProvisioningSource, /role_source: "system_provisioned"/);

  const productionE2eSource = await readFile(new URL("./auth-production-e2e.mjs", import.meta.url), "utf8");
  assert.match(productionE2eSource, /readQaOrigin\("QA_AUTH_ORIGIN", true\)/);
  assert.match(productionE2eSource, /readQaOrigin\("QA_AUTH_RAW_ORIGIN", false\)/);
  assert.doesNotMatch(productionE2eSource, /vercel\.app/);

  console.log("Offline authentication provider, callback, session, recovery, and role-isolation QA passed.");
}

void main();
