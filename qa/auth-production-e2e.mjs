import { randomBytes, randomUUID } from "node:crypto";
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";

const origin = "https://bravo-gaming-esports.vercel.app";
const rawOrigin = "https://bravo-gaming-esports-kjmkrye0k-sangams-projects-9468acfa.vercel.app";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) throw new Error("Supabase production QA configuration is incomplete.");

const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
const users = [];
let temporaryTeamId = null;
let temporaryPlayerId = null;
const suffix = randomUUID();
const password = `Qa!${randomBytes(18).toString("base64url")}`;
const emails = {
  admin: `codex-admin-${suffix}@example.invalid`,
  viewer: `codex-viewer-${suffix}@example.invalid`,
  team: `codex-team-${suffix}@example.invalid`,
  player: `codex-player-${suffix}@example.invalid`,
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function createQaUser(email, role, teamId = null, playerId = null) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;
  users.push(data.user.id);
  const { error: profileError } = await admin
    .from("profiles")
    .update({ role, team_id: teamId, player_id: playerId, is_active: true })
    .eq("auth_user_id", data.user.id);
  if (profileError) throw profileError;
}

const browser = await chromium.launch({
  headless: true,
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
});

try {
  const { data: teams, error: teamLookupError } = await admin
    .from("teams")
    .select("id")
    .eq("is_active", true)
    .limit(1);
  if (teamLookupError) throw teamLookupError;
  let teamId = teams?.[0]?.id ?? null;
  if (!teamId) {
    const { data: temporaryTeam, error: temporaryTeamError } = await admin
      .from("teams")
      .insert({
        name: `Codex Auth QA ${suffix}`,
        tag: "AUTHQA",
        status: "active",
        is_active: true,
        demo_seed_tag: `auth-qa-${suffix}`,
      })
      .select("id")
      .single();
    if (temporaryTeamError) throw temporaryTeamError;
    teamId = temporaryTeam.id;
    temporaryTeamId = temporaryTeam.id;
  }

  await createQaUser(emails.admin, "admin");
  await createQaUser(emails.viewer, "viewer");
  await createQaUser(emails.team, "team_manager", teamId);
  const { data: temporaryPlayer, error: temporaryPlayerError } = await admin
    .from("players")
    .insert({
      pubg_name: `CodexPlayer${suffix.replaceAll("-", "").slice(0, 12)}`,
      display_name: "Codex Player QA",
      slug: `codex-player-${suffix}`,
      is_active: true,
      demo_seed_tag: `auth-qa-${suffix}`,
    })
    .select("id")
    .single();
  if (temporaryPlayerError) throw temporaryPlayerError;
  temporaryPlayerId = temporaryPlayer.id;
  await createQaUser(emails.player, "player", null, temporaryPlayer.id);

  const consoleErrors = [];
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await desktop.newPage();
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(`${message.text()} ${message.location().url}`.trim());
    }
  });

  await page.goto(`${origin}/admin/login`, { waitUntil: "domcontentloaded" });
  await page.getByLabel("Admin email").fill(emails.admin);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL(`${origin}/admin`, { timeout: 20_000 });
  await page.getByText("Staff Control Center", { exact: true }).waitFor({ timeout: 20_000 });

  const cookies = await desktop.cookies(origin);
  const sessionCookie = cookies.find((cookie) => cookie.name === "bravo_session");
  assert(
    sessionCookie?.httpOnly && sessionCookie.secure && sessionCookie.sameSite === "Strict",
    `Session cookie security attributes are invalid: ${JSON.stringify(sessionCookie ?? null)}`
  );

  await page.reload({ waitUntil: "domcontentloaded" });
  assert(page.url() === `${origin}/admin`, "Admin refresh lost authorization.");
  await page.goto(`${origin}/admin/events`, { waitUntil: "domcontentloaded" });
  assert(page.url().startsWith(`${origin}/admin/events`), "Direct admin route navigation failed.");

  await page.getByRole("button", { name: "Sign Out" }).click();
  await page.getByRole("heading", { name: "Admin Login" }).waitFor({ timeout: 20_000 });
  await page.goto(`${origin}/admin`, { waitUntil: "domcontentloaded" });
  assert(page.url().includes("/admin/login"), "Logged-out admin retained protected access.");
  await desktop.close();

  const viewerContext = await browser.newContext();
  const viewerPage = await viewerContext.newPage();
  await viewerPage.goto(`${origin}/admin/login`, { waitUntil: "domcontentloaded" });
  await viewerPage.getByLabel("Admin email").fill(emails.viewer);
  await viewerPage.getByLabel("Password").fill(password);
  await viewerPage.getByRole("button", { name: "Sign In" }).click();
  await viewerPage.getByText("This account does not have admin access.", { exact: true }).waitFor({ timeout: 20_000 });
  await viewerContext.close();

  const playerContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const playerPage = await playerContext.newPage();
  await playerPage.goto(`${origin}/player/login`, { waitUntil: "domcontentloaded" });
  await playerPage.getByRole("button", { name: "Open Player Dashboard" }).waitFor();
  await playerPage.waitForFunction(
    () => !document.querySelector('button[type="submit"]')?.hasAttribute("disabled"),
    { timeout: 20_000 }
  );
  await playerPage.getByLabel("Email address").fill(emails.player);
  await playerPage.getByLabel("Password").fill(password);
  await playerPage.getByRole("button", { name: "Open Player Dashboard" }).click();
  await playerPage.waitForURL(`${origin}/dashboard/player`, { timeout: 20_000 });
  await playerPage.getByRole("heading", { name: "Player access confirmed" }).waitFor();
  await playerPage.reload({ waitUntil: "domcontentloaded" });
  assert(playerPage.url() === `${origin}/dashboard/player`, "Player refresh lost authorization.");
  await playerContext.close();

  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const teamPage = await mobile.newPage();
  await teamPage.goto(`${origin}/team/login`, { waitUntil: "domcontentloaded" });
  await teamPage.getByRole("button", { name: "Open Team Workspace" }).waitFor({ state: "visible" });
  await teamPage.waitForFunction(
    () => !(document.querySelector('button[type="submit"]') instanceof HTMLButtonElement) ||
      !document.querySelector('button[type="submit"]').disabled,
    { timeout: 20_000 }
  );
  await teamPage.getByLabel("Email address").fill(emails.team);
  await teamPage.getByLabel("Password").fill(password);
  await teamPage.getByRole("button", { name: "Open Team Workspace" }).click();
  await teamPage.waitForURL(`${origin}/team`, { timeout: 20_000 }).catch(() => undefined);
  const teamMe = await teamPage.evaluate(async () => {
    const response = await fetch("/api/auth/me", { credentials: "include" });
    const data = await response.json().catch(() => ({}));
    return {
      status: response.status,
      authenticated: Boolean(data.authenticated),
      role: data.role ?? data.user?.role ?? null,
      hasTeamId: Boolean(data.teamId ?? data.user?.teamId),
    };
  });
  const teamFormText = await teamPage.locator("form").innerText().catch(() => "");
  let directTeamDiagnostic = null;
  if (teamPage.url() !== `${origin}/team`) {
    directTeamDiagnostic = await teamPage.evaluate(async ({ email, password }) => {
      const loginResponse = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password, variant: "team" }),
      });
      const loginData = await loginResponse.json().catch(() => ({}));
      const meResponse = await fetch("/api/auth/me", { credentials: "include" });
      const meData = await meResponse.json().catch(() => ({}));
      return {
        loginStatus: loginResponse.status,
        loginSuccess: Boolean(loginData.success),
        loginError: loginData.error ?? null,
        meStatus: meResponse.status,
        meRole: meData.role ?? meData.user?.role ?? null,
        meHasTeamId: Boolean(meData.teamId ?? meData.user?.teamId),
      };
    }, { email: emails.team, password });
    if (directTeamDiagnostic.meStatus === 200) {
      await teamPage.goto(`${origin}/team`, { waitUntil: "domcontentloaded" });
    }
  }
  assert(
    teamPage.url() === `${origin}/team`,
    `Team login did not reach the workspace: ${JSON.stringify(teamMe)} ${JSON.stringify(directTeamDiagnostic)} ${teamFormText}`
  );
  assert(
    directTeamDiagnostic === null,
    `Team login required a diagnostic retry: ${JSON.stringify({ teamMe, directTeamDiagnostic, teamFormText })}`
  );
  await teamPage.goto(`${origin}/admin`, { waitUntil: "domcontentloaded" });
  assert(teamPage.url().includes("/admin/login"), "Team account accessed the admin route.");
  await mobile.close();

  const resetResponse = await fetch(`${origin}/api/auth/password-reset`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: emails.viewer }),
  });
  const resetBody = await resetResponse.json();
  assert(resetResponse.ok && resetBody.success, "Password-reset request failed.");

  const [aliasResponse, rawResponse] = await Promise.all([
    fetch(`${origin}/admin`, { redirect: "manual" }),
    fetch(`${rawOrigin}/admin`, { redirect: "manual" }),
  ]);
  assert(aliasResponse.status >= 300 && aliasResponse.status < 400, "Owner alias did not protect /admin.");
  assert(rawResponse.status >= 300 && rawResponse.status < 400, "Raw deployment did not protect /admin.");
  assert(consoleErrors.length === 0, `Browser console errors were observed: ${JSON.stringify([...new Set(consoleErrors)])}`);

  console.log("Production browser authentication QA passed: admin login/refresh/direct route/logout, viewer rejection, team isolation, mobile login, reset request, and raw/alias protection.");
} finally {
  await browser.close();
  for (const userId of users) {
    await admin.auth.admin.deleteUser(userId).catch(() => undefined);
  }
  if (temporaryTeamId) {
    try {
      await admin.from("teams").delete().eq("id", temporaryTeamId);
    } catch {
      // Best-effort cleanup; the primary QA failure remains authoritative.
    }
  }
  if (temporaryPlayerId) {
    await admin.from("players").delete().eq("id", temporaryPlayerId).catch(() => undefined);
  }
}
