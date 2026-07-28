import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs";
import path from "node:path";

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

async function collectAccessibilityIssues(page, route) {
  return page.evaluate((currentRoute) => {
    const issues = [];

    function isExposed(element) {
      if (element.closest('[hidden], [aria-hidden="true"]')) return false;
      const style = window.getComputedStyle(element);
      return style.display !== "none" && style.visibility !== "hidden";
    }

    function referencedText(element, attribute) {
      return (element.getAttribute(attribute) ?? "")
        .split(/\s+/)
        .filter(Boolean)
        .map((id) => document.getElementById(id)?.textContent?.trim() ?? "")
        .filter(Boolean)
        .join(" ");
    }

    function explicitName(element) {
      return (
        element.getAttribute("aria-label")?.trim() ||
        referencedText(element, "aria-labelledby") ||
        element.getAttribute("title")?.trim() ||
        ""
      );
    }

    function labelText(control) {
      if (!("labels" in control) || !control.labels) return "";
      return Array.from(control.labels)
        .map((label) => label.textContent?.trim() ?? "")
        .filter(Boolean)
        .join(" ");
    }

    const mainCount = Array.from(document.querySelectorAll("main")).filter(isExposed).length;
    if (mainCount !== 1) {
      issues.push(`Expected one exposed main landmark on ${currentRoute}; found ${mainCount}`);
    }

    const ids = new Map();
    document.querySelectorAll("[id]").forEach((element) => {
      const id = element.id.trim();
      if (!id) return;
      ids.set(id, (ids.get(id) ?? 0) + 1);
    });
    const duplicateIds = Array.from(ids.entries())
      .filter(([, count]) => count > 1)
      .map(([id]) => id);
    if (duplicateIds.length > 0) {
      issues.push(`Duplicate element IDs on ${currentRoute}: ${duplicateIds.join(", ")}`);
    }

    document.querySelectorAll("input:not([type=hidden]), select, textarea").forEach((control) => {
      if (!isExposed(control)) return;
      if (!explicitName(control) && !labelText(control)) {
        const descriptor = control.getAttribute("name") || control.getAttribute("type") || control.tagName.toLowerCase();
        issues.push(`Visible form control "${descriptor}" has no accessible name on ${currentRoute}`);
      }
    });

    document.querySelectorAll("button, a[href]").forEach((interactive) => {
      if (!isExposed(interactive)) return;
      const contentName = interactive.textContent?.trim() || interactive.querySelector("img[alt]")?.getAttribute("alt")?.trim() || "";
      if (!explicitName(interactive) && !contentName) {
        issues.push(`Visible ${interactive.tagName.toLowerCase()} has no accessible name on ${currentRoute}`);
      }
    });

    document.querySelectorAll("img").forEach((image) => {
      if (!image.hasAttribute("alt")) {
        issues.push(`Image is missing an alt attribute on ${currentRoute}`);
      }
    });

    document.querySelectorAll("table").forEach((table, tableIndex) => {
      if (!isExposed(table)) return;
      const caption = table.querySelector(":scope > caption")?.textContent?.trim() ?? "";
      if (!caption && !explicitName(table)) {
        issues.push(`Table ${tableIndex + 1} has no accessible caption or name on ${currentRoute}`);
      }
      table.querySelectorAll("th").forEach((header) => {
        if (!["col", "row", "colgroup", "rowgroup"].includes(header.getAttribute("scope") ?? "")) {
          issues.push(`Table header "${header.textContent?.trim() || "unnamed"}" has no valid scope on ${currentRoute}`);
        }
      });
    });

    document.querySelectorAll('[role="dialog"], dialog').forEach((dialog) => {
      if (isExposed(dialog) && !explicitName(dialog)) {
        issues.push(`Visible dialog has no accessible name on ${currentRoute}`);
      }
    });

    return issues;
  }, route);
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

    const title = (await page.title()).trim();
    if (!title) {
      routeIssues.push(`Missing document title on ${route}`);
    }

    await page
      .locator("h1")
      .first()
      .waitFor({ state: "visible", timeout: 5000 })
      .catch(() => undefined);
    const visibleHeadingCount = await page.locator("h1:visible").count();
    if (visibleHeadingCount !== 1) {
      routeIssues.push(`Expected exactly one visible H1 on ${route}; found ${visibleHeadingCount}`);
    }

    if (
      !(await page
        .locator("header")
        .first()
        .isVisible()
        .catch(() => false))
    ) {
      routeIssues.push(`Visible site header missing on ${route}`);
    }

    if (
      !(await page
        .locator("footer")
        .first()
        .isVisible()
        .catch(() => false))
    ) {
      routeIssues.push(`Visible site footer missing on ${route}`);
    }

    const horizontalOverflow = await page.evaluate(
      () => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth,
    );
    if (horizontalOverflow > 2) {
      routeIssues.push(`Horizontal overflow of ${horizontalOverflow}px detected on ${route}`);
    }

    routeIssues.push(...(await collectAccessibilityIssues(page, route)));

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
    pushUnique(summary.notes, `No published ${label.toLowerCase()} link was available; verified the route's not-found state instead.`);
    writeSummary();
    return null;
  }

  const href = await link.getAttribute("href");
  if (!href) {
    throw new Error(`${label} detail link did not have an href.`);
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

async function verifyDynamicRouteNotFound(page, prefix, label) {
  const route = `${prefix}qa-route-verification-missing`;
  const response = await page.goto(`${baseURL}${route}`, {
    waitUntil: "domcontentloaded",
    timeout: 45000,
  });
  await settlePage(page);
  expect(response?.status(), `${label} missing-record route must return HTTP 404`).toBe(404);
  await expect(page.locator("h1:visible"), `${label} not-found page must have one visible H1`).toHaveCount(1);
  await expect(page.locator("header").first(), `${label} not-found page is missing the site header`).toBeVisible();
  await expect(page.locator("footer").first(), `${label} not-found page is missing the site footer`).toBeVisible();
  const bodyText = await page.locator("body").innerText();
  expect(bodyText, `${label} missing-record route rendered a runtime failure`).not.toMatch(
    /Application error|Internal Server Error|Unhandled Runtime Error/i,
  );
  summary.passed.push({ label: `${label} not-found state`, route });
  writeSummary();
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
    { name: "Home", url: "/" },
    { name: "PUBG", url: "/pubg" },
    { name: "Events", url: "/events" },
    { name: "Leaderboards", url: "/pubg/leaderboards" },
    { name: "News", url: "/news" },
    { name: "Media", url: "/media" },
    { name: "Sponsors", url: "/sponsors" },
    { name: "About", url: "/about" },
  ];

  for (const item of navClicks) {
    await page.goto(`${baseURL}/`, {
      waitUntil: "domcontentloaded",
      timeout: 45000,
    });
    await settlePage(page);
    const primaryNavigation = page.locator("header").getByRole("navigation", { name: "Primary navigation" });
    const link = primaryNavigation.getByRole("link", { name: item.name, exact: true });
    await expect(link, `Required header link ${item.name} is missing`).toBeVisible();
    await link.click();
    await page.waitForURL((url) => url.pathname === item.url, { timeout: 15000 });
    await settlePage(page);
    await expect(
      page.locator("header").getByRole("navigation", { name: "Primary navigation" }).getByRole("link", {
        name: item.name,
        exact: true,
      }),
    ).toHaveAttribute("aria-current", "page");
    pushUnique(summary.notes, `Clicked header nav item ${item.name}.`);
    writeSummary();
  }

  await page.goto(`${baseURL}/`, {
    waitUntil: "domcontentloaded",
    timeout: 45000,
  });
  await settlePage(page);
  const siteHeader = page.locator("header");
  const watchLiveLink = siteHeader.getByRole("link", { name: "Watch Live", exact: true });
  const registerTeamLink = siteHeader.getByRole("link", { name: "Register Team", exact: true });
  await expect(watchLiveLink, "Watch Live header action is missing").toHaveAttribute("href", "/live-stream");
  await expect(registerTeamLink, "Register Team header action is missing").toHaveAttribute("href", "/teams/register");

  const loginMenuButton = siteHeader.getByRole("button", { name: "Login", exact: true });
  await expect(loginMenuButton, "Login dropdown trigger is missing").toBeVisible();
  await expect(loginMenuButton).toHaveAttribute("aria-controls", "desktop-account-access-menu");
  await loginMenuButton.click();
  await expect(loginMenuButton).toHaveAttribute("aria-expanded", "true");
  const accessMenu = page.locator("#desktop-account-access-menu");
  await expect(accessMenu).toBeVisible();
  for (const accessLink of [
    ["General Login", "/login"],
    ["Team Portal", "/team/login"],
    ["Player Portal", "/player/login"],
    ["Admin Portal", "/admin/login"],
  ]) {
    await expect(accessMenu.getByRole("link", { name: accessLink[0], exact: true })).toHaveAttribute("href", accessLink[1]);
  }
  await page.keyboard.press("Escape");
  await expect(accessMenu).toBeHidden();
  await expect(loginMenuButton).toBeFocused();
  pushUnique(summary.notes, "Verified required desktop navigation, actions, access links, and Escape behavior.");
  writeSummary();

  const footer = page.locator("footer");
  await expect(footer.getByRole("heading", { name: "Quick Links", exact: true })).toBeVisible();
  await expect(footer.getByRole("heading", { name: "Competition", exact: true })).toBeVisible();
  await expect(footer.getByRole("heading", { name: "Support", exact: true })).toBeVisible();
  await expect(footer.getByRole("heading", { name: "Follow Us", exact: true })).toBeVisible();
  await expect(footer.locator('a[href="#"]')).toHaveCount(0);
  const supportColumn = footer.locator("section").filter({ hasText: "Support" });
  const supportHrefs = await supportColumn
    .getByRole("link")
    .evaluateAll((links) => links.map((link) => link.getAttribute("href")).filter(Boolean));
  expect(new Set(supportHrefs).size, "Footer support links must have distinct destinations").toBe(supportHrefs.length);
  pushUnique(summary.notes, "Verified compact footer groups, real destinations, and no placeholder links.");
  writeSummary();

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
  const contactForm = page.locator("form").first();
  await expect(contactForm, "Public contact form is missing").toBeVisible();
  const timestamp = Date.now();
  let submittedContactPayload = null;
  await page.route("**/api/contact", async (route) => {
    submittedContactPayload = route.request().postDataJSON();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true }),
    });
  });
  await contactForm.locator('input[name="name"]').fill("QA Browser Runner");
  await contactForm.locator('input[name="email"]').fill(`qa-browser-${timestamp}@example.com`);
  await contactForm.locator('select[name="subject"]').selectOption({ label: "General inquiry" });
  await contactForm.locator('textarea[name="message"]').fill("Browser automation contact-form QA submission.");
  await contactForm.locator('button[type="submit"]').click();
  await expect(page.getByText(/Message received|Feedback received/i)).toBeVisible();
  expect(submittedContactPayload).toMatchObject({
    kind: "contact",
    name: "QA Browser Runner",
    subject: "General inquiry",
    message: "Browser automation contact-form QA submission.",
  });
  pushUnique(summary.notes, "Verified the public contact form request and success state with an isolated browser transport.");
  writeSummary();

  const detailRoutes = [
    ["/events", "/events/", "Event detail"],
    ["/games", "/games/", "Game detail"],
    ["/matches", "/matches/", "Match detail"],
    ["/media", "/media/", "Media detail"],
    ["/news", "/news/", "News detail"],
    ["/organizations", "/organizations/", "Organization detail"],
    ["/players", "/players/", "Player detail"],
    ["/pubg/events", "/pubg/events/", "PUBG event detail"],
    ["/pubg/results", "/pubg/matches/", "PUBG match detail"],
    ["/pubg/players", "/pubg/players/", "PUBG player detail"],
    ["/pubg/seasons/current", "/pubg/seasons/", "PUBG season detail"],
    ["/pubg/teams", "/pubg/teams/", "PUBG team detail"],
    ["/results", "/results/matches/", "Result detail"],
    ["/sponsors", "/sponsors/", "Sponsor detail"],
    ["/teams", "/teams/", "Team detail"],
    ["/tournaments", "/tournaments/", "Tournament detail"],
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
    } else {
      await verifyDynamicRouteNotFound(page, prefix, label);
    }
  }
});

test("Auth entry-point smoke QA", async ({ page }) => {
  test.setTimeout(120000);
  await page.goto(`${baseURL}/admin/login`, {
    waitUntil: "domcontentloaded",
    timeout: 45000,
  });
  await settlePage(page);
  await expect(page.getByRole("heading", { name: /Admin Login/i })).toBeVisible();
  summary.passed.push({ label: "Admin login screen renders", route: "/admin/login" });
  writeSummary();

  await page.getByLabel("Admin email", { exact: true }).fill(`qa-invalid-${Date.now()}@example.com`);
  await page.getByLabel("Password", { exact: true }).fill("InvalidQA-Credential-Only!");
  const [loginResponse] = await Promise.all([
    page.waitForResponse((response) => response.url().includes("/api/auth/login") && response.request().method() === "POST"),
    page.locator('button[type="submit"]').click(),
  ]);
  expect([401, 403, 429]).toContain(loginResponse.status());
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: /email|password|credentials|access|attempts|sign in/i })
      .first(),
  ).toBeVisible();
  expect(new URL(page.url()).pathname).toBe("/admin/login");
  summary.passed.push({ label: "Unauthorized admin login rejected safely", route: "/admin/login" });
  writeSummary();

  await page.goto(`${baseURL}/team/login`, {
    waitUntil: "domcontentloaded",
    timeout: 45000,
  });
  await settlePage(page);
  await expect(page.getByRole("heading", { name: /Open the Bravo team workspace/i })).toBeVisible();
  await expect(page.getByRole("button", { name: "Open Team Workspace" })).toBeVisible();
  summary.passed.push({ label: "Team login screen renders", route: "/team/login" });
  writeSummary();

  await page.goto(`${baseURL}/player/login`, {
    waitUntil: "domcontentloaded",
    timeout: 45000,
  });
  await settlePage(page);
  await expect(page.getByRole("heading", { name: /Open your Bravo player access/i })).toBeVisible();
  await expect(page.getByRole("button", { name: "Open Player Dashboard" })).toBeVisible();
  summary.passed.push({ label: "Player login screen renders", route: "/player/login" });
  writeSummary();
});

test("OAuth provider visibility follows live authorization readiness", async ({ page, request }) => {
  const readinessResponse = await request.get(`${baseURL}/api/auth/providers`);
  expect(readinessResponse.status()).toBe(200);
  expect(readinessResponse.headers()["cache-control"]).toContain("no-store");
  const readiness = await readinessResponse.json();
  expect(typeof readiness.discord).toBe("boolean");
  const expectedDiscordControls = readiness.discord ? 1 : 0;

  const loginReadinessResponse = page.waitForResponse(
    (response) => response.url().endsWith("/api/auth/providers") && response.status() === 200,
  );
  await page.goto(`${baseURL}/login`, {
    waitUntil: "domcontentloaded",
    timeout: 45000,
  });
  await loginReadinessResponse;
  await expect(page.locator('input[type="email"]')).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Continue with Discord", exact: true })).toHaveCount(expectedDiscordControls);
  await expect(page.getByText("Or continue with", { exact: true })).toHaveCount(expectedDiscordControls);

  const adminReadinessResponse = page.waitForResponse(
    (response) => response.url().endsWith("/api/auth/providers") && response.status() === 200,
  );
  await page.goto(`${baseURL}/admin/login`, {
    waitUntil: "domcontentloaded",
    timeout: 45000,
  });
  await adminReadinessResponse;
  await expect(page.locator('input[type="email"]')).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Continue with Discord", exact: true })).toHaveCount(expectedDiscordControls);

  summary.passed.push({
    label: "OAuth controls match live provider readiness",
    route: "/login, /admin/login",
  });
  writeSummary();
});

test("Required responsive viewport and navigation QA", async ({ browser }) => {
  test.setTimeout(300000);
  const requiredViewports = [
    { width: 320, height: 568 },
    { width: 375, height: 667 },
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1024, height: 768 },
    { width: 1280, height: 720 },
    { width: 1440, height: 900 },
    { width: 1920, height: 1080 },
  ];

  for (const viewport of requiredViewports) {
    const context = await browser.newContext({ baseURL, viewport });
    const page = await context.newPage();
    await page.goto("/", { waitUntil: "domcontentloaded", timeout: 45000 });
    await settlePage(page);

    const overflow = await page.evaluate(
      () => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth,
    );
    expect(overflow, `Homepage overflow at ${viewport.width}x${viewport.height}`).toBeLessThanOrEqual(2);

    if (viewport.width < 1280) {
      const menuButton = page.getByRole("button", { name: "Open menu", exact: true });
      await expect(menuButton).toHaveAttribute("aria-controls", "mobile-site-navigation");
      await menuButton.click();
      const drawer = page.locator("#mobile-site-navigation");
      await expect(drawer).toBeVisible();
      await expect(drawer.getByRole("link", { name: "Home", exact: true })).toHaveAttribute("aria-current", "page");
      await expect(page.getByRole("heading", { name: "Access", exact: true })).toBeVisible();
      for (const accessLink of ["General Login", "Team Portal", "Player Portal", "Admin Portal"]) {
        await expect(drawer.getByRole("link", { name: accessLink, exact: true })).toBeVisible();
      }
      expect(await page.evaluate(() => document.body.style.overflow)).toBe("hidden");
      await page.keyboard.press("Escape");
      await expect(drawer).toBeHidden();
      await expect(menuButton).toBeFocused();
      expect(await page.evaluate(() => document.body.style.overflow)).not.toBe("hidden");
    } else {
      await expect(page.locator("header").getByRole("navigation", { name: "Primary navigation" })).toBeVisible();
      await expect(page.locator("header").getByRole("link", { name: "Register Team", exact: true })).toBeVisible();
      await expect(page.locator("header").getByRole("link", { name: "Watch Live", exact: true })).toBeVisible();
      await expect(page.locator("header").getByRole("button", { name: "Login", exact: true })).toBeVisible();
    }

    await page.screenshot({
      path: path.join(mobileDir, `viewport-${viewport.width}x${viewport.height}-homepage.png`),
      fullPage: true,
    });
    summary.passed.push({
      label: `Responsive homepage ${viewport.width}x${viewport.height}`,
      route: "/",
    });
    writeSummary();
    await context.close();
  }

  const compactLoginContext = await browser.newContext({
    baseURL,
    viewport: { width: 320, height: 568 },
  });
  const compactLoginPage = await compactLoginContext.newPage();
  for (const [route, buttonName] of [
    ["/team/login", "Open Team Workspace"],
    ["/player/login", "Open Player Dashboard"],
  ]) {
    await compactLoginPage.goto(route, { waitUntil: "domcontentloaded", timeout: 45000 });
    await settlePage(compactLoginPage);
    const button = compactLoginPage.getByRole("button", { name: buttonName, exact: true });
    await expect(button).toBeVisible();
    const buttonClips = await button.evaluate(
      (element) => element.scrollHeight > element.clientHeight + 1 || element.scrollWidth > element.clientWidth + 1,
    );
    expect(buttonClips, `${route} submit label clips at 320x568`).toBe(false);
    const overflow = await compactLoginPage.evaluate(
      () => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth,
    );
    expect(overflow, `${route} overflow at 320x568`).toBeLessThanOrEqual(2);
  }
  await compactLoginContext.close();

  const context = await browser.newContext({
    baseURL,
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  for (const [route, name] of [
    ["/", "mobile-home"],
    ["/pubg", "mobile-pubg"],
    ["/players", "mobile-players"],
    ["/teams", "mobile-teams"],
    ["/pubg/leaderboards", "mobile-leaderboards"],
    ["/events", "mobile-events"],
    ["/media", "mobile-media"],
    ["/news", "mobile-news"],
    ["/sponsors", "mobile-sponsors"],
    ["/contact", "mobile-contact"],
    ["/login", "mobile-login"],
  ]) {
    await page.goto(route, { waitUntil: "domcontentloaded", timeout: 45000 });
    await settlePage(page);
    const overflow = await page.evaluate(
      () => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth,
    );
    expect(overflow, `${route} overflow at 390x844`).toBeLessThanOrEqual(2);
    await page.screenshot({
      path: path.join(mobileDir, `${name}.png`),
      fullPage: true,
    });
    summary.passed.push({ label: `Captured ${name}`, route });
    writeSummary();
  }
  await context.close();
});

test("Keyboard navigation and tab semantics QA", async ({ page }) => {
  test.setTimeout(120000);
  await page.goto(`${baseURL}/`, {
    waitUntil: "domcontentloaded",
    timeout: 45000,
  });
  await settlePage(page);

  await page.keyboard.press("Tab");
  const skipLink = page.getByRole("link", { name: "Skip to main content" });
  await expect(skipLink).toBeFocused();
  await skipLink.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();

  await page.goto(`${baseURL}/pubg-scrims`, {
    waitUntil: "domcontentloaded",
    timeout: 45000,
  });
  await settlePage(page);
  const tabList = page.getByRole("tablist", { name: "Scrim information sections" });
  const scheduleTab = tabList.getByRole("tab", { name: "Schedule" });
  const rulesTab = tabList.getByRole("tab", { name: "Rules" });
  await expect(scheduleTab).toHaveAttribute("aria-selected", "true");
  await expect(scheduleTab).toHaveAttribute("tabindex", "0");
  await scheduleTab.focus();
  await scheduleTab.press("ArrowRight");
  await expect(rulesTab).toBeFocused();
  await expect(rulesTab).toHaveAttribute("aria-selected", "true");
  await expect(rulesTab).toHaveAttribute("tabindex", "0");

  summary.passed.push({ label: "Keyboard navigation and tab semantics", route: "/, /pubg-scrims" });
  writeSummary();
});

test("Automated WCAG A and AA accessibility QA", async ({ page }) => {
  test.setTimeout(180000);
  for (const route of ["/", "/events", "/pubg/leaderboards", "/contact", "/login", "/pubg-scrims"]) {
    await page.goto(`${baseURL}${route}`, {
      waitUntil: "domcontentloaded",
      timeout: 45000,
    });
    await settlePage(page);
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(
      results.violations,
      `${route} has WCAG A/AA violations:\n${results.violations
        .map((violation) => `${violation.id}: ${violation.help} (${violation.nodes.length} nodes)`)
        .join("\n")}`,
    ).toEqual([]);
  }

  summary.passed.push({
    label: "Automated WCAG A/AA accessibility",
    route: "/, /events, /pubg/leaderboards, /contact, /login, /pubg-scrims",
  });
  writeSummary();
});

test.afterAll(async () => {
  writeSummary();
  expect(summary.failed, `Live QA recorded failures: ${JSON.stringify(summary.failed)}`).toEqual([]);
});
