import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { readSafeAuthDestination, resolveAuthorizedAuthDestination } from "../lib/auth-destinations";
import { hasPlayerDashboardAccess, hasTeamWorkspaceAccess } from "../lib/authz";
import { buildDiscordAuthCallbackUrl } from "../lib/discord-auth";

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
assert.equal(buildDiscordAuthCallbackUrl("https://bravo.example", "/"), "https://bravo.example/auth/callback?next=%2F");

async function main() {
  const providerSource = await readFile(new URL("../app/api/auth/providers/route.ts", import.meta.url), "utf8");
  assert.match(providerSource, /\/auth\/v1\/authorize/);
  assert.match(providerSource, /searchParams\.set\("provider", "discord"\)/);
  assert.match(providerSource, /redirect: "manual"/);
  assert.match(providerSource, /isDiscordAuthorizationRedirect/);
  assert.match(providerSource, /"Cache-Control": "private, no-store, max-age=0"/);
  assert.doesNotMatch(providerSource, /NEXT_PUBLIC_DISCORD|DISCORD_PROVIDER_ENABLED/);

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

  const passwordLoginSource = await readFile(new URL("../app/api/auth/login/route.ts", import.meta.url), "utf8");
  assert.match(passwordLoginSource, /signInWithPassword/);
  assert.match(passwordLoginSource, /verifyAccessToken/);
  assert.match(passwordLoginSource, /resolveAuthorizedAuthDestination/);
  assert.match(passwordLoginSource, /hasTeamWorkspaceAccess/);
  assert.match(passwordLoginSource, /hasPlayerDashboardAccess/);
  assert.doesNotMatch(passwordLoginSource, /role\s*=\s*body|email.*super_admin/i);

  const passwordResetSource = await readFile(new URL("../app/api/auth/password-reset/route.ts", import.meta.url), "utf8");
  assert.match(passwordResetSource, /resetPasswordForEmail/);
  assert.match(passwordResetSource, /redirectTo: `\$\{origin\}\/reset-password`/);
  assert.match(passwordResetSource, /Always return the same public success response to avoid account enumeration/);

  const sessionSource = await readFile(new URL("../app/api/auth/session/route.ts", import.meta.url), "utf8");
  assert.match(sessionSource, /verifyAccessToken/);
  assert.match(sessionSource, /createSessionCookie/);
  assert.match(sessionSource, /export async function DELETE/);
  assert.match(sessionSource, /SESSION_COOKIE/);
  assert.match(sessionSource, /REFRESH_COOKIE/);

  const proxySource = await readFile(new URL("../proxy.ts", import.meta.url), "utf8");
  assert.match(proxySource, /refreshSupabaseSession/);
  assert.match(proxySource, /hasAdminAccess/);
  assert.match(proxySource, /hasTeamAccess/);
  assert.match(proxySource, /hasPlayerAccess/);

  const supabaseProxySource = await readFile(new URL("../lib/supabase/proxy.ts", import.meta.url), "utf8");
  assert.match(supabaseProxySource, /createServerClient/);
  assert.match(supabaseProxySource, /getAll\(\)/);
  assert.match(supabaseProxySource, /setAll\(cookiesToSet\)/);
  assert.match(supabaseProxySource, /supabase\.auth\.getUser\(\)/);

  const adminAuthSource = await readFile(new URL("../lib/admin-auth.ts", import.meta.url), "utf8");
  assert.match(adminAuthSource, /if \(!auth\.session\.profileId\)/);
  assert.match(adminAuthSource, /Super-admin or admin role required/);

  const discordRoleSource = await readFile(new URL("../lib/discord-role-sync.ts", import.meta.url), "utf8");
  assert.match(discordRoleSource, /DISCORD_RELATIONAL_TEAM_AUTH_ENABLED\?\.trim\(\)\.toLowerCase\(\) === "true"/);
  assert.match(discordRoleSource, /resolution\.denied/);
  assert.match(discordRoleSource, /relationalTeamAuthEnabled && resolution\.teamState/);
  assert.match(discordRoleSource, /manuallyProtected/);

  console.log("Offline authentication provider, callback, session, recovery, and role-isolation QA passed.");
}

void main();
