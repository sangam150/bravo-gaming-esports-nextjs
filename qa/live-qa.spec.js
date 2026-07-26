const fs = require("fs");
const path = require("path");
const { test, expect, devices } = require("@playwright/test");

const baseURL = process.env.QA_BASE_URL || "http://localhost:3000";
const artifactsDir = path.join(process.cwd(), "qa-artifacts");
const issueDir = path.join(artifactsDir, "issues");
const mobileDir = path.join(artifactsDir, "mobile");
const summaryPath = path.join(artifactsDir, "live-qa-summary.json");

fs.mkdirSync(issueDir, { recursive: true });
fs.mkdirSync(mobileDir, { recursive: true });
for (const fileName of fs.readdirSync(issueDir)) {
  fs.rmSync(path.join(issueDir, fileName), { force: true, recursive: true });
}
for (const fileName of fs.readdirSync(mobileDir)) {
  fs.rmSync(path.join(mobileDir, fileName), { force: true, recursive: true });
}

const summary = {
  generatedAt: new Date().toISOString(),
  passed: [],
  failed: [],
  skipped: [],
  notes: [],
};

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function pushUnique(target, value) {
  if (!target.includes(value)) {
    target.push(value);
  }
}

function writeSummary() {
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
}

async function settlePage(page) {
  await page.waitForLoadState("domcontentloaded").catch(() => undefined);
  await page.waitForTimeout(350).catch(() => undefined);
}

async function captureIssue(page, label, details) {
  const fileName = `${slugify(label)}.png`;
  const screenshotPath = path.join(issueDir, fileName);
  await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => undefined);
  summary.failed.push({
    label,
    details,
    screenshot: screenshotPath,
  });
  writeSummary();
}

function attachObservers(page) {
  const issues = [];
  const requestFailures = [];

  const onConsole = (message) => {
    if (message.type() === "error") {
      issues.push(`console error: ${message.text()}`);
    }
  };

  const onPageError = (error) => {
    issues.push(`page error: ${error.message}`);
  };

  const onRequestFailed = (request) => {
    const failure = request.failure();
    const errorText = failure?.errorText ?? "request failed";
    const url = request.url();

    if (errorText.includes("ERR_ABORTED")) {
      return;
    }

    if (url.includes("_rsc=") || url.includes("webpack.hot-update.json")) {
      return;
    }

    requestFailures.push(`${request.method()} ${url} :: ${errorText}`);
  };

  page.on("console", onConsole);
  page.on("pageerror", onPageError);
  page.on("requestfailed", onRequestFailed);

  return {
    issues,
    requestFailures,
    dispose() {
      page.off("console", onConsole);
      page.off("pageerror", onPageError);
      page.off("requestfailed", onRequestFailed);
    },
  };
}

async function gotoAndCheck(page, route, label) {
  const observers = attachObservers(page);

  try {
    const response = await page.goto(`${baseURL}${route}`, {
      waitUntil: "domcontentloaded",
      timeout: 45000,
    });
    await settlePage(page);
    const status = response?.status() ?? 0;
    const bodyText =
      (await page
        .locator("body")
        .innerText()
        .catch(() => "")) || "";
    const routeIssues = [];

    if (!status || status >= 400) {
      routeIssues.push(`HTTP ${status || "no response"} on ${route}`);
    }

    if (/Application error|Internal Server Error|Unhandled Runtime Error|This page could not be found/i.test(bodyText)) {
      routeIssues.push(`Error UI detected on ${route}`);
    }

    if (observers.issues.length > 0) {
      routeIssues.push(...observers.issues);
    }

    if (observers.requestFailures.length > 0) {
      routeIssues.push(...observers.requestFailures);
    }

    if (routeIssues.length > 0) {
      await captureIssue(page, label, routeIssues);
    } else {
      summary.passed.push({ label, route });
      writeSummary();
    }
  } finally {
    observers.dispose();
  }
}

async function submitSearchAndFilters(page, routeLabel) {
  const searchInput = page.locator('input[name="q"]').first();
  if (await searchInput.count()) {
    await searchInput.fill("bravo").catch(() => undefined);
  }

  const selects = page.locator("select");
  const selectCount = await selects.count();
  for (let index = 0; index < selectCount; index += 1) {
    const select = selects.nth(index);
    const options = await select.locator("option").count();
    if (options > 1) {
      const secondValue = await select.locator("option").nth(1).getAttribute("value");
      if (secondValue !== null) {
        await select.selectOption(secondValue).catch(() => undefined);
      }
    }
  }

  const submitButton = page
    .locator('button[type="submit"]')
    .filter({ hasText: /apply|search|filter/i })
    .first()
    .or(page.locator('button[type="submit"]').first());

  if (await submitButton.count()) {
    await submitButton.click().catch(() => undefined);
    await settlePage(page);
    pushUnique(summary.notes, `Submitted search/filter form on ${routeLabel}.`);
    writeSummary();
  }
}

async function clickFirstDetailLink(page, prefix, label) {
  const link = page.locator(`main a[href^="${prefix}"]`).first();
  if (!(await link.count())) {
    summary.skipped.push({
      label,
      reason: `No detail links found for prefix ${prefix}`,
    });
    writeSummary();
    return null;
  }

  const href = await link.getAttribute("href");
  if (!href) {
    summary.skipped.push({ label, reason: "Detail link had no href" });
    writeSummary();
    return null;
  }

  await Promise.all([page.waitForLoadState("domcontentloaded"), link.click()]).catch(async () => {
    await page.goto(`${baseURL}${href}`, {
      waitUntil: "domcontentloaded",
      timeout: 45000,
    });
  });
  await settlePage(page);

  pushUnique(summary.notes, `Opened detail route ${href} for ${label}.`);
  writeSummary();
  return href;
}

test.describe.configure({ mode: "serial" });

const publicStaticRoutes = [
  ["/", "Homepage"],
  ["/about", "About"],
  ["/about/founder", "Founder"],
  ["/about/media-kit", "Media kit"],
  ["/about/sponsor-us", "Sponsor us"],
  ["/anti-cheat", "Anti-cheat"],
  ["/calendar", "Calendar"],
  ["/championships", "Championships"],
  ["/community", "Community"],
  ["/community/announcements", "Announcements"],
  ["/community/highlights", "Community highlights"],
  ["/compare", "Compare"],
  ["/contact", "Contact"],
  ["/current-season", "Current season"],
  ["/events", "Events"],
  ["/fantasy", "Fantasy"],
  ["/feedback", "Feedback"],
  ["/games", "Games"],
  ["/giveaways", "Giveaways"],
  ["/gta-rp", "GTA RP"],
  ["/hall-of-fame", "Hall of fame"],
  ["/highlights", "Highlights"],
  ["/leaderboard", "Leaderboard"],
  ["/live-stream", "Live stream"],
  ["/login", "Login"],
  ["/matches", "Matches"],
  ["/media", "Media"],
  ["/mvp-ranking", "MVP ranking"],
  ["/news", "News"],
  ["/news-media", "News media"],
  ["/organizations", "Organizations"],
  ["/partners", "Partners"],
  ["/player/login", "Player login"],
  ["/players", "Players"],
  ["/privacy", "Privacy"],
  ["/pubg", "PUBG"],
  ["/pubg/access", "PUBG access"],
  ["/pubg/community", "PUBG community"],
  ["/pubg/compare", "PUBG compare"],
  ["/pubg/events", "PUBG events"],
  ["/pubg/fantasy", "PUBG fantasy"],
  ["/pubg/hall-of-fame", "PUBG hall of fame"],
  ["/pubg/leaderboards", "PUBG leaderboards"],
  ["/pubg/players", "PUBG players"],
  ["/pubg/results", "PUBG results"],
  ["/pubg/seasons/current", "Current PUBG season"],
  ["/pubg/teams", "PUBG teams"],
  ["/pubg-scrims", "PUBG scrims"],
  ["/rankings", "Rankings"],
  ["/reset-password", "Reset password"],
  ["/results", "Results"],
  ["/rules", "Rules"],
  ["/schedule", "Schedule"],
  ["/search", "Search"],
  ["/sponsor-kit", "Sponsor kit"],
  ["/sponsors", "Sponsors"],
  ["/statistics", "Statistics"],
  ["/stats", "Stats"],
  ["/stream-schedule", "Stream schedule"],
  ["/team/login", "Team login"],
  ["/teams", "Teams"],
  ["/teams/register", "Team registration"],
  ["/terms", "Terms"],
  ["/tournament-partners", "Tournament partners"],
  ["/tournaments", "Tournaments"],
  ["/videos", "Videos"],
];

for (const [route, label] of publicStaticRoutes) {
  test(`Public route: ${label}`, async ({ page }) => {
    test.setTimeout(75000);
    await gotoAndCheck(page, route, label);
    expect(
      summary.failed.some((failure) => failure.label === label),
      `${label} produced a route, browser-console, or request failure`,
    ).toBe(false);
  });
}

test("Public navigation and interaction QA", async ({ page }) => {
  test.setTimeout(240000);
  await page.goto(`${baseURL}/`, {
    waitUntil: "domcontentloaded",
    timeout: 45000,
  });
  await settlePage(page);
  const navClicks = [
    { name: "News", url: "/news" },
    { name: "Games", url: "/games" },
    { name: "Events", url: "/events" },
    { name: "Calendar", url: "/calendar" },
    { name: "Matches", url: "/matches" },
    { name: "Teams", url: "/teams" },
    { name: "Players", url: "/players" },
    { name: "Rankings", url: "/rankings" },
    { name: "Media", url: "/media" },
    { name: "Sponsors", url: "/sponsors" },
    { name: "Community", url: "/community" },
  ];

  for (const item of navClicks) {
    await page.goto(`${baseURL}/`, {
      waitUntil: "domcontentloaded",
      timeout: 45000,
    });
    await settlePage(page);
    const link = page.getByRole("link", { name: item.name, exact: true }).first();
    if (await link.count()) {
      await Promise.all([page.waitForURL(`**${item.url}`), link.click()]);
      await settlePage(page);
      pushUnique(summary.notes, `Clicked header nav item ${item.name}.`);
    } else {
      summary.skipped.push({
        label: `Header nav ${item.name}`,
        reason: "Link not found",
      });
    }
    writeSummary();
  }

  await page.goto(`${baseURL}/`, {
    waitUntil: "domcontentloaded",
    timeout: 45000,
  });
  await settlePage(page);
  for (const cta of ["Watch Live", "Explore Events", "Join Community"]) {
    const button = page.getByRole("link", { name: new RegExp(cta, "i") }).first();
    if (await button.count()) {
      const href = await button.getAttribute("href");
      if (href) {
        await page
          .goto(href.startsWith("http") ? href : `${baseURL}${href}`, {
            waitUntil: "domcontentloaded",
            timeout: 45000,
          })
          .catch(() => undefined);
        await settlePage(page);
        pushUnique(summary.notes, `Opened homepage CTA ${cta}.`);
      }
      await page.goto(`${baseURL}/`, {
        waitUntil: "domcontentloaded",
        timeout: 45000,
      });
      await settlePage(page);
    } else {
      summary.skipped.push({
        label: `Homepage CTA ${cta}`,
        reason: "CTA not visible in current data state",
      });
    }
    writeSummary();
  }

  const searchableRoutes = [
    ["/news", "News"],
    ["/events", "Events"],
    ["/teams", "Teams"],
    ["/players", "Players"],
    ["/rankings", "Rankings"],
    ["/media", "Media"],
    ["/pubg/events", "PUBG Events"],
    ["/pubg/teams", "PUBG Teams"],
    ["/pubg/players", "PUBG Players"],
    ["/compare", "Compare"],
  ];

  for (const [route, label] of searchableRoutes) {
    await page.goto(`${baseURL}${route}`, {
      waitUntil: "domcontentloaded",
      timeout: 45000,
    });
    await settlePage(page);
    await submitSearchAndFilters(page, label);
  }

  await page.goto(`${baseURL}/contact`, {
    waitUntil: "domcontentloaded",
    timeout: 45000,
  });
  await settlePage(page);
  if (await page.locator("form").count()) {
    const timestamp = Date.now();
    await page
      .locator('input[placeholder="Your Name"]')
      .fill("QA Browser Runner")
      .catch(() => undefined);
    await page
      .locator('input[placeholder="Email Address"]')
      .fill(`qa-browser-${timestamp}@example.com`)
      .catch(() => undefined);
    await page
      .locator("input[placeholder]")
      .nth(2)
      .fill("Live QA pass")
      .catch(() => undefined);
    await page
      .locator('textarea[placeholder="Message"]')
      .fill("Browser automation contact-form QA submission.")
      .catch(() => undefined);
    await page
      .locator('button[type="submit"]')
      .click()
      .catch(() => undefined);
    await settlePage(page);
    pushUnique(summary.notes, "Submitted the public contact form.");
    writeSummary();
  }

  const detailRoutes = [
    ["/events", "/events/", "Event detail"],
    ["/teams", "/teams/", "Team detail"],
    ["/players", "/players/", "Player detail"],
    ["/matches", "/matches/", "Match detail"],
    ["/sponsors", "/sponsors/", "Sponsor detail"],
    ["/games", "/games/", "Game detail"],
  ];

  for (const [route, prefix, label] of detailRoutes) {
    await page.goto(`${baseURL}${route}`, {
      waitUntil: "domcontentloaded",
      timeout: 45000,
    });
    await settlePage(page);
    const href = await clickFirstDetailLink(page, prefix, label);
    if (href) {
      await gotoAndCheck(page, href.replace(baseURL, ""), label);
    }
  }
});

test("Auth entry-point smoke QA", async ({ page }) => {
  test.setTimeout(120000);
  await page.goto(`${baseURL}/admin`, {
    waitUntil: "domcontentloaded",
    timeout: 45000,
  });
  await settlePage(page);
  await expect(page.getByRole("heading", { name: /Admin Login/i })).toBeVisible();
  summary.passed.push({ label: "Admin login screen renders", route: "/admin" });
  writeSummary();

  await page.getByLabel("Admin email", { exact: true }).fill("qa.viewer.browser+1@gmail.com");
  await page.getByLabel("Password", { exact: true }).fill("BravoQA123!");
  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(1500);
  const adminError = await page
    .locator("text=/Login failed|Invalid login credentials|Email not confirmed|This account does not have admin access|Invalid API key/i")
    .first()
    .textContent({ timeout: 5000 })
    .catch(() => null);
  if (adminError) {
    await captureIssue(page, "admin-login-attempt", [`Admin login did not complete: ${adminError}`]);
  } else {
    summary.skipped.push({
      label: "Admin login role test",
      reason: "Could not determine auth result from UI",
    });
    writeSummary();
  }

  await page.goto(`${baseURL}/team`, {
    waitUntil: "domcontentloaded",
    timeout: 45000,
  });
  await settlePage(page);
  await expect(page.getByRole("heading", { name: /Open the Bravo team workspace/i })).toBeVisible();
  summary.passed.push({ label: "Team login screen renders", route: "/team" });
  writeSummary();
});

test("Mobile layout screenshots", async ({ browser }) => {
  test.setTimeout(180000);
  const context = await browser.newContext({
    ...devices["iPhone 13"],
    baseURL,
  });
  const page = await context.newPage();

  const mobileTargets = [
    ["/", "mobile-homepage"],
    ["/pubg", "mobile-pubg"],
    ["/rankings", "mobile-rankings"],
    ["/admin", "mobile-admin"],
    ["/team", "mobile-team"],
  ];

  for (const [route, name] of mobileTargets) {
    await page.goto(route, { waitUntil: "domcontentloaded", timeout: 45000 });
    await settlePage(page);
    await page.screenshot({
      path: path.join(mobileDir, `${name}.png`),
      fullPage: true,
    });
    summary.passed.push({ label: `Captured ${name}`, route });
    writeSummary();
  }

  await page.goto("/events", { waitUntil: "domcontentloaded", timeout: 45000 });
  await settlePage(page);
  const eventHref = await clickFirstDetailLink(page, "/events/", "Mobile event detail");
  if (eventHref) {
    await page.screenshot({
      path: path.join(mobileDir, "mobile-event-detail.png"),
      fullPage: true,
    });
    summary.passed.push({
      label: "Captured mobile event detail",
      route: eventHref,
    });
    writeSummary();
  }

  await page.goto("/matches", {
    waitUntil: "domcontentloaded",
    timeout: 45000,
  });
  await settlePage(page);
  const matchHref = await clickFirstDetailLink(page, "/matches/", "Mobile match detail");
  if (matchHref) {
    await page.screenshot({
      path: path.join(mobileDir, "mobile-match-detail.png"),
      fullPage: true,
    });
    summary.passed.push({
      label: "Captured mobile match detail",
      route: matchHref,
    });
    writeSummary();
  }

  await context.close();
});

test.afterAll(async () => {
  writeSummary();
});
