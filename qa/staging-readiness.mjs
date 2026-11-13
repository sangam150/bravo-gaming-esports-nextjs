import { existsSync, readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { STAGING_ORIGIN, STAGING_PROJECT_REF, readStagingEnvironment, assertStagingTarget } from "./staging-target.mjs";

const environment = readStagingEnvironment();
const target = assertStagingTarget(environment);
async function check(url) {
  try {
    const headers =
      url === STAGING_ORIGIN && environment.VERCEL_AUTOMATION_BYPASS_SECRET
        ? { "x-vercel-protection-bypass": environment.VERCEL_AUTOMATION_BYPASS_SECRET }
        : {};
    const response = await fetch(url, { headers, redirect: "manual", signal: AbortSignal.timeout(10_000) });
    const location = response.headers.get("location");
    const redirect = location ? new URL(location, url) : null;
    return {
      reachable: true,
      status: response.status,
      vercelError: response.headers.get("x-vercel-error"),
      redirectTo: redirect ? `${redirect.origin}${redirect.pathname}` : null,
      protectedByVercel: url === STAGING_ORIGIN && ([401, 403].includes(response.status) || redirect?.hostname === "vercel.com"),
      apiKeyRequired: url.includes("supabase.co") && response.status === 401,
    };
  } catch (error) {
    return { reachable: false, error: error.cause?.code ?? error.name ?? "network_failure" };
  }
}
const previousFile = new URL("../.env.local", import.meta.url);
const previous = existsSync(previousFile) ? parseEnv(readFileSync(previousFile, "utf8")) : {};
const present = (name) => Boolean(environment[name]?.trim());
const publicKey = environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || environment.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
const serverKey = environment.SUPABASE_SECRET_KEY?.trim() || environment.SUPABASE_SERVICE_ROLE_KEY?.trim();
async function keyedCheck(route, key) {
  if (!key) return { status: "BLOCKED", ok: false, reason: "required_key_missing" };
  try {
    const headers = { apikey: key, Accept: "application/json" };
    if (route.startsWith("/rest/v1/")) headers.Authorization = `Bearer ${key}`;
    const response = await fetch(`${target.supabaseUrl}${route}`, { headers, redirect: "error", signal: AbortSignal.timeout(10_000) });
    const data = await response.json().catch(() => null);
    return { status: response.status, ok: response.ok, errorCode: /^[A-Z0-9_]{1,24}$/.test(data?.code || "") ? data.code : null,
      ...(route === "/auth/v1/settings" && response.ok ? { emailEnabled: data?.external?.email === true, discordEnabled: data?.external?.discord === true } : {}) };
  } catch (error) { return { status: "ERR", ok: false, error: error.cause?.code || error.name || "network_failure" }; }
}
const [website, supabase, auth, profiles, discordProfiles, discordMappings, discordReviews] = await Promise.all([
  check(STAGING_ORIGIN), check(`${target.supabaseUrl}/auth/v1/health`), keyedCheck("/auth/v1/settings", publicKey),
  keyedCheck("/rest/v1/profiles?select=id,auth_user_id,email,role,is_active,role_source&limit=0", serverKey),
  keyedCheck("/rest/v1/profiles?select=discord_user_id,discord_guild_id,discord_role_ids,discord_mapped_roles,discord_role_synced_at,discord_team_role_id,discord_team_verified_at&limit=0", serverKey),
  keyedCheck("/rest/v1/discord_role_mappings?select=id&limit=0", serverKey), keyedCheck("/rest/v1/discord_access_reviews?select=id&limit=0", serverKey),
]);
let discordAuthorization = { status: "BLOCKED", reason: "provider_or_public_key_unavailable" };
if (auth.ok && auth.discordEnabled) {
  try {
    const url = new URL("/auth/v1/authorize", target.supabaseUrl);
    url.searchParams.set("provider", "discord");
    url.searchParams.set("redirect_to", "http://localhost:3000/auth/callback");
    const response = await fetch(url, { headers: { apikey: publicKey }, redirect: "manual", signal: AbortSignal.timeout(10_000) });
    const location = response.headers.get("location");
    const next = location ? new URL(location, url) : null;
    const id = next?.searchParams.get("client_id") || "";
    const numericId = /^\d{1,20}$/.test(id) && BigInt(id) > 0n && BigInt(id) <= 18446744073709551615n;
    discordAuthorization = { status: response.status, redirectsToDiscord: next?.origin === "https://discord.com", clientIdIsSnowflake: numericId,
      clientIdIsEmail: /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(id), callbackTargetsStaging: next?.searchParams.get("redirect_uri") === `${target.supabaseUrl}/auth/v1/callback` };
    await response.body?.cancel();
  } catch (error) { discordAuthorization = { status: "ERR", reason: error.cause?.code || error.name || "network_failure" }; }
}
const report = {
  checkedAt: new Date().toISOString(),
  stagingOrigin: STAGING_ORIGIN,
  stagingProjectRef: STAGING_PROJECT_REF,
  defaultEnvLocalTargetsStaging: previous.NEXT_PUBLIC_SUPABASE_URL?.trim() === target.supabaseUrl,
  localDevelopmentCommand: "npm run dev:staging -- --discord",
  website,
  supabase,
  auth,
  schema: { profiles, discordProfiles, discordMappings, discordReviews },
  discordAuthorization,
  configuration: {
    publicKey: present("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") || present("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    serverKey: present("SUPABASE_SECRET_KEY") || present("SUPABASE_SERVICE_ROLE_KEY"),
    adminEmail: present("QA_STAGING_ADMIN_EMAIL"),
    adminPassword: present("QA_STAGING_ADMIN_PASSWORD"),
    r2Credentials: ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY"].every(present),
    permittedMatchId: present("QA_STAGING_PUBG_MATCH_ID"),
    teamAccount: present("QA_STAGING_TEAM_EMAIL"),
    playerAccount: present("QA_STAGING_PLAYER_EMAIL"),
  },
};
mkdirSync(new URL("../qa-artifacts/", import.meta.url), { recursive: true });
writeFileSync(new URL("../qa-artifacts/staging-readiness.json", import.meta.url), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (!website.reachable || website.status !== 200 || website.protectedByVercel || !supabase.reachable || !auth.ok || !profiles.ok ||
  !discordProfiles.ok || !discordMappings.ok || !discordReviews.ok || !discordAuthorization.clientIdIsSnowflake ||
  discordAuthorization.status !== 302 || !discordAuthorization.redirectsToDiscord ||
  !discordAuthorization.callbackTargetsStaging || !report.configuration.adminEmail || !report.configuration.adminPassword)
  process.exitCode = 1;
