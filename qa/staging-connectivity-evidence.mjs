import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseEnv } from "node:util";
import { fileURLToPath } from "node:url";
import { lookup } from "node:dns/promises";
import { execFileSync } from "node:child_process";
import { chromium } from "@playwright/test";
import { assertStagingTarget, readStagingEnvironment } from "./staging-target.mjs";

const environment = readStagingEnvironment();
const target = assertStagingTarget(environment);
const artifactDirectory = new URL("../qa-artifacts/staging-verification/", import.meta.url);
mkdirSync(artifactDirectory, { recursive: true });
const present = (name) => Boolean(environment[name]?.trim());
const names = [
  "NEXT_PUBLIC_SITE_URL",
  "QA_AUTH_ORIGIN",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SECRET_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "DATABASE_URL",
  "DIRECT_URL",
  "QA_STAGING_ADMIN_EMAIL",
  "QA_STAGING_ADMIN_PASSWORD",
  "VERCEL_AUTOMATION_BYPASS_SECRET",
  "QA_STAGING_TEAM_EMAIL",
  "QA_STAGING_TEAM_PASSWORD",
  "QA_STAGING_PLAYER_EMAIL",
  "QA_STAGING_PLAYER_PASSWORD",
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_ENDPOINT",
  "R2_BUCKET_NAME",
  "R2_PRIVATE_BUCKET_NAME",
  "R2_PUBLIC_DELIVERY_MODE",
  "R2_PUBLIC_BASE_URL",
  "NEXT_PUBLIC_R2_PUBLIC_BASE_URL",
  "PUBG_API_KEY",
  "PUBG_SHARD",
  "QA_STAGING_PUBG_MATCH_ID",
];
let ignored = false;
try {
  ignored =
    execFileSync("git", ["check-ignore", ".env.staging.local"], { encoding: "utf8", windowsHide: true }).trim() === ".env.staging.local";
} catch {
  /* A nonzero result is recorded as failure, never ignored. */
}
const report = {
  checkedAt: new Date().toISOString(),
  target,
  fixturesUsed: false,
  environmentIgnoredByGit: ignored,
  environment: Object.fromEntries(names.map((name) => [name, present(name) ? "CONFIGURED" : "MISSING"])),
  managementAccess: {
    vercelTokenInProcess: Boolean(process.env.VERCEL_TOKEN),
    vercelTokenInStagingFile: present("VERCEL_TOKEN"),
    vercelLocalAuthFileExists: [
      resolve(process.env.APPDATA || ".", "com.vercel.cli", "auth.json"),
      resolve(process.env.LOCALAPPDATA || ".", "com.vercel.cli", "auth.json"),
      resolve(process.env.USERPROFILE || ".", ".vercel", "auth.json"),
    ].some(existsSync),
  },
  requests: [],
};

async function probe(origin, path, headers = {}) {
  const started = Date.now();
  const url = new URL(path, origin);
  const safeHeaders = { ...headers };
  if (url.origin === target.origin && present("VERCEL_AUTOMATION_BYPASS_SECRET"))
    safeHeaders["x-vercel-protection-bypass"] = environment.VERCEL_AUTOMATION_BYPASS_SECRET;
  try {
    const response = await fetch(url, { headers: safeHeaders, redirect: "manual", signal: AbortSignal.timeout(12_000) });
    const location = response.headers.get("location");
    const redirect = location ? new URL(location, url) : null;
    const result = {
      url: `${url.origin}${url.pathname}`,
      status: response.status,
      durationMs: Date.now() - started,
      contentType: response.headers.get("content-type"),
      redirect: redirect ? `${redirect.origin}${redirect.pathname}` : null,
      vercelProtected: redirect?.hostname === "vercel.com" || response.headers.get("x-vercel-mitigated") === "challenge",
      bypassHeaderUsed: "x-vercel-protection-bypass" in safeHeaders,
    };
    await response.body?.cancel();
    report.requests.push(result);
    return result;
  } catch (error) {
    const result = { url: `${url.origin}${url.pathname}`, error: error.cause?.code || error.name, durationMs: Date.now() - started };
    report.requests.push(result);
    return result;
  }
}

const paths = ["/", "/admin/login", "/api/auth/me", "/api/version", "/api/admin/broadcast", "/api/broadcast", "/api/leaderboard"];
await Promise.all(paths.map((path) => probe(target.origin, path)));
const graphics = [
  "program",
  "scoreboard",
  "results",
  "winner",
  "mvp",
  "top-fragger",
  "top-damage",
  "players",
  "headshots",
  "rankings",
  "standings",
  "lower-third",
  "schedule",
  "sponsors",
  "opening",
  "closing",
  "killfeed",
  "road-to-finals",
  "road-to-finals-2",
  "todays-matches",
  "map-intro",
  "countdown",
  "casters",
  "team-stats",
  "break",
  "group-standings",
  "day-standings",
  "compact-scoreboard",
  "match-info",
  "team-spotlight",
  "sponsor-strip",
  "champion",
  "final-rankings",
  "player-comparison",
  "technical-break",
  "analyst-panel",
  "starting-soon",
  "advancement",
];
await Promise.all(graphics.map((graphic) => probe(target.origin, `/overlay/${graphic}`)));
await probe(target.supabaseUrl, "/auth/v1/health");
const publicKey = environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || environment.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
if (publicKey) {
  report.keyedSupabaseHealth = await probe(target.supabaseUrl, "/auth/v1/health", { apikey: publicKey });
  report.keyedSupabaseSettings = await probe(target.supabaseUrl, "/auth/v1/settings", { apikey: publicKey });
} else report.keyedSupabaseHealth = { status: "BLOCKED", missing: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY" };

// Diagnose the earlier LOCAL smoke-test target without using production keys,
// signing in, writing records, or making a request to production APIs.
const localFile = new URL("../.env.local", import.meta.url);
const local = existsSync(localFile) ? parseEnv(readFileSync(localFile, "utf8")) : {};
if (local.NEXT_PUBLIC_SUPABASE_URL) {
  const hostname = new URL(local.NEXT_PUBLIC_SUPABASE_URL).hostname;
  report.localSmokeTarget = { hostname, targetsDesignatedStaging: hostname === new URL(target.supabaseUrl).hostname };
  try {
    await lookup(hostname);
    report.localSmokeTarget.dns = "RESOLVED";
  } catch (error) {
    report.localSmokeTarget.dns = error.code || error.name;
  }
}

let browser;
try {
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  if (present("VERCEL_AUTOMATION_BYPASS_SECRET")) {
    // Bootstrap Vercel's host-scoped browser cookie with no redirects. The
    // secret is never installed as a global browser header or URL parameter.
    const bootstrap = await context.request.get(target.origin, {
      headers: { "x-vercel-protection-bypass": environment.VERCEL_AUTOMATION_BYPASS_SECRET, "x-vercel-set-bypass-cookie": "true" },
      maxRedirects: 0,
      timeout: 12_000,
    });
    report.browserBypassBootstrapStatus = bootstrap.status();
    await bootstrap.dispose();
  }
  await context.route("**/*", (route) => {
    const origin = new URL(route.request().url()).origin;
    if (origin.endsWith(".supabase.co") && origin !== target.supabaseUrl) return route.abort("blockedbyclient");
    return route.continue();
  });
  const page = await context.newPage();
  await page.goto(`${target.origin}/admin/login`, { waitUntil: "domcontentloaded", timeout: 25_000 });
  const url = new URL(page.url());
  report.browser = { finalPage: `${url.origin}${url.pathname}`, applicationReached: url.origin === target.origin };
  await page.screenshot({ path: fileURLToPath(new URL("deployment-access.png", artifactDirectory)), fullPage: true });
  report.browser.screenshot = "qa-artifacts/staging-verification/deployment-access.png";
} catch (error) {
  report.browser = { status: "FAIL", error: error.name };
} finally {
  await browser?.close();
}

writeFileSync(new URL("connectivity.json", artifactDirectory), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (!ignored || !publicKey || report.requests.some((request) => request.error || request.vercelProtected)) process.exitCode = 1;
