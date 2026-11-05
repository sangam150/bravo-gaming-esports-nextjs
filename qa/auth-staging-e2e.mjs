import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { assertStagingTarget, readStagingEnvironment } from "./staging-target.mjs";

const environment = readStagingEnvironment();
const { origin, supabaseUrl } = assertStagingTarget(environment);
const missing = ["QA_STAGING_ADMIN_EMAIL", "QA_STAGING_ADMIN_PASSWORD"].filter((name) => !environment[name]?.trim());
if (missing.length) throw new Error(`Configure ${missing.join(", ")} in ignored .env.staging.local. Never provide passwords in chat.`);
const email = environment.QA_STAGING_ADMIN_EMAIL;
const password = environment.QA_STAGING_ADMIN_PASSWORD;
const bypass = environment.VERCEL_AUTOMATION_BYPASS_SECRET;
const sections = [
  "competitions",
  "competitions?view=registrations",
  "competitions?view=competitionSchedule",
  "competitions?view=competitionMatches",
  "competitions?view=competitionStandings",
  "competitions?view=seasons",
  "scrims",
  "match-results",
  "match-results?view=pubg",
  "teams-players",
  "teams-players?view=players",
  "broadcast",
  "content",
  "settings",
];
const report = {
  target: origin,
  supabaseUrl,
  fixtureResponsesUsed: false,
  completed: [],
  remaining: [
    "CRUD, R2 and OBS acceptance are separate from authentication",
    "team/player credentials not supplied",
    "permitted PUBG match ID not supplied",
    "real-time token expiry and recovery email delivery require separate acceptance",
  ],
};
let stage = "launch";
const browser = await chromium.launch({
  headless: true,
  ...(environment.QA_BROWSER_EXECUTABLE ? { executablePath: environment.QA_BROWSER_EXECUTABLE } : {}),
});
function check(condition) {
  if (!condition) throw new Error("Acceptance failed");
}
async function context() {
  const result = await browser.newContext();
  if (bypass) {
    const bootstrap = await result.request.get(origin, {
      headers: { "x-vercel-protection-bypass": bypass, "x-vercel-set-bypass-cookie": "true" },
      maxRedirects: 0,
      timeout: 12_000,
    });
    await bootstrap.dispose();
  }
  await result.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.hostname.endsWith(".supabase.co") && url.origin !== supabaseUrl) return route.abort("blockedbyclient");
    // Bypass uses a host-scoped cookie bootstrapped without following redirects;
    // no protection secret is attached to browser subresources or external URLs.
    return route.continue();
  });
  return result;
}
try {
  const anonymous = await context();
  const invalidPage = await anonymous.newPage();
  stage = "deployment access and invalid credentials";
  await invalidPage.goto(`${origin}/admin/login`, { waitUntil: "domcontentloaded" });
  check(new URL(invalidPage.url()).origin === origin);
  await invalidPage.getByLabel("Admin email", { exact: true }).fill(email);
  await invalidPage.getByLabel("Password", { exact: true }).fill(`Invalid-staging-test-${randomUUID()}`);
  await invalidPage.getByRole("button", { name: "Sign In", exact: true }).click();
  await invalidPage.getByRole("alert").waitFor({ state: "visible", timeout: 20_000 });
  const denied = await invalidPage.evaluate(async () => (await fetch("/api/admin/broadcast")).status);
  check(denied === 401);
  report.completed.push("Invalid credentials show an error; anonymous admin API access denied");
  await anonymous.close();

  const authenticated = await context();
  const page = await authenticated.newPage();
  stage = "designated admin login";
  await page.goto(`${origin}/admin/login`, { waitUntil: "domcontentloaded" });
  await page.getByLabel("Admin email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  await page.waitForURL(`${origin}/admin`, { timeout: 30_000 });
  await page.getByRole("heading", { name: "Dashboard", exact: true }).waitFor({ timeout: 30_000 });
  const cookies = await authenticated.cookies(origin);
  const session = cookies.find((cookie) => cookie.name === "bravo_session");
  check(session?.httpOnly && session.secure && session.sameSite === "Strict");
  // Inspect only the issuer locally; never print or persist a cookie/token.
  const claims = JSON.parse(Buffer.from(session.value.split(".")[1], "base64url").toString("utf8"));
  check(claims.iss === `${supabaseUrl}/auth/v1`);
  report.completed.push("Admin login redirects to /admin with secure cookies issued by the designated staging project");

  stage = "refresh and direct navigation";
  await page.reload({ waitUntil: "domcontentloaded" });
  check(page.url() === `${origin}/admin`);
  for (const section of sections) {
    await page.goto(`${origin}/admin/${section}`, { waitUntil: "domcontentloaded" });
    check(`${new URL(page.url()).pathname}${new URL(page.url()).search}` === `/admin/${section}`);
    const me = await page.evaluate(async () => {
      const response = await fetch("/api/auth/me", { cache: "no-store" });
      const data = await response.json();
      return { status: response.status, authenticated: data.authenticated, admin: data.user?.isAdmin };
    });
    check(me.status === 200 && me.authenticated && me.admin);
  }
  report.completed.push("Refresh, direct navigation and authorization across all named admin sections");

  stage = "multiple tabs and logout";
  const second = await authenticated.newPage();
  await second.goto(`${origin}/admin`, { waitUntil: "domcontentloaded" });
  await second.getByRole("heading", { name: "Dashboard", exact: true }).waitFor();
  await page.getByRole("button", { name: "Sign Out", exact: true }).click();
  await page.getByRole("heading", { name: "Admin Login", exact: true }).waitFor({ timeout: 20_000 });
  await second.bringToFront();
  await second.getByRole("heading", { name: "Admin Login", exact: true }).waitFor({ timeout: 20_000 });
  await second.goto(`${origin}/admin`, { waitUntil: "domcontentloaded" });
  check(new URL(second.url()).pathname === "/admin/login");
  const signedOut = await second.evaluate(async () => (await fetch("/api/admin/broadcast")).status);
  check(signedOut === 401);
  report.completed.push("Logout removes access across tabs and protected APIs");
  await authenticated.close();
  report.status = "passed";
} catch {
  // Playwright errors can contain action arguments. Record only the checkpoint,
  // never raw exception text, request headers, passwords, cookies or tokens.
  report.status = "failed";
  report.failedAt = stage;
  process.exitCode = 1;
} finally {
  await browser.close();
  mkdirSync(new URL("../qa-artifacts/", import.meta.url), { recursive: true });
  writeFileSync(new URL("../qa-artifacts/auth-staging.json", import.meta.url), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}
