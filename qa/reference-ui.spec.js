import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const baseURL = process.env.QA_BASE_URL || "http://localhost:3000";
const artifactRoot = path.join(process.cwd(), "qa-artifacts", "reference-ui");
const routes = [
  { path: "/", name: "home" },
  { path: "/players", name: "players" },
  { path: "/events", name: "events" },
  { path: "/media", name: "media" },
  { path: "/news", name: "news" },
  { path: "/pubg/leaderboards", name: "leaderboards" },
  { path: "/teams", name: "teams" },
  { path: "/sponsors", name: "sponsors" },
];
const viewports = [
  { width: 320, height: 568 },
  { width: 375, height: 667 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1280, height: 720 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
];
const checkedInternalDestinations = new Set();
const checkedExternalDestinations = new Set();

fs.mkdirSync(artifactRoot, { recursive: true });

function observePage(page) {
  const issues = [];
  const onConsole = (message) => {
    if (message.type() === "error") issues.push(`console: ${message.text()}`);
  };
  const onPageError = (error) => issues.push(`page: ${error.message}`);
  const onResponse = (response) => {
    if (response.status() >= 400) {
      issues.push(`response: ${response.status()} ${response.request().method()} ${response.url()}`);
    }
  };
  const onRequestFailed = (request) => {
    const message = request.failure()?.errorText ?? "request failed";
    if (!message.includes("ERR_ABORTED") && !request.url().includes("_rsc=")) {
      issues.push(`request: ${request.method()} ${request.url()} ${message}`);
    }
  };

  page.on("console", onConsole);
  page.on("pageerror", onPageError);
  page.on("response", onResponse);
  page.on("requestfailed", onRequestFailed);

  return {
    issues,
    dispose() {
      page.off("console", onConsole);
      page.off("pageerror", onPageError);
      page.off("response", onResponse);
      page.off("requestfailed", onRequestFailed);
    },
  };
}

async function verifyPage(page, route, viewport) {
  const response = await page.goto(`${baseURL}${route.path}`, {
    waitUntil: "domcontentloaded",
    timeout: 45_000,
  });
  await page.waitForTimeout(250);

  expect(response?.status(), `${route.path} returned an unsuccessful response at ${viewport.width}px`).toBeLessThan(400);
  await expect(page.locator("h1:visible"), `${route.path} must expose exactly one H1 at ${viewport.width}px`).toHaveCount(1);
  await expect(page.locator("header").first()).toBeVisible();
  await expect(page.locator("footer").first()).toBeVisible();

  const overflow = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth);
  expect(overflow, `${route.path} overflows horizontally at ${viewport.width}px`).toBeLessThanOrEqual(2);

  const invalidLinks = await page.locator('main a[href=""], main a[href="#"], main a[href^="javascript:"]').count();
  expect(invalidLinks, `${route.path} contains nonfunctional links`).toBe(0);

  const missingFragmentTargets = await page.locator('main a[href*="#"]').evaluateAll((links) =>
    links
      .map((link) => {
        const href = link.getAttribute("href");
        if (!href) return null;
        const target = new URL(href, window.location.href);
        if (target.origin !== window.location.origin || target.pathname !== window.location.pathname || !target.hash) return null;
        const id = decodeURIComponent(target.hash.slice(1));
        return document.getElementById(id) ? null : href;
      })
      .filter(Boolean),
  );
  expect(missingFragmentTargets, `${route.path} contains links to missing page fragments`).toEqual([]);

  if (viewport.width === 1440) {
    const destinations = await page.locator("a[href]:visible").evaluateAll((links) =>
      links
        .map((link) => link.getAttribute("href")?.trim() ?? "")
        .filter(Boolean)
        .filter((href) => !href.startsWith("#")),
    );

    for (const href of new Set(destinations)) {
      const destination = new URL(href, baseURL);

      if (destination.origin !== new URL(baseURL).origin) {
        expect(["https:", "mailto:", "tel:"], `${route.path} contains an unsafe external link protocol: ${destination.protocol}`).toContain(
          destination.protocol,
        );
        if (destination.protocol === "https:" && !checkedExternalDestinations.has(destination.toString())) {
          checkedExternalDestinations.add(destination.toString());
          const destinationResponse = await page.request.get(destination.toString(), {
            failOnStatusCode: false,
            timeout: 30_000,
          });
          const destinationStatus = destinationResponse.status();
          await destinationResponse.dispose();
          expect(destinationStatus, `${route.path} links to an unavailable external destination`).toBeLessThan(500);
          expect([404, 410], `${route.path} links to a missing external destination`).not.toContain(destinationStatus);
        }
        continue;
      }

      destination.hash = "";
      const normalizedDestination = destination.toString();
      if (checkedInternalDestinations.has(normalizedDestination)) continue;
      checkedInternalDestinations.add(normalizedDestination);

      const destinationResponse = await page.request.get(normalizedDestination, {
        failOnStatusCode: false,
        timeout: 30_000,
      });
      const destinationStatus = destinationResponse.status();
      await destinationResponse.dispose();

      expect(destinationStatus, `${route.path} links to ${destination.pathname}, which returned HTTP ${destinationStatus}`).toBeLessThan(
        400,
      );
    }
  }

  const unnamedControls = await page
    .locator("main button:visible, main input:visible, main select:visible, main textarea:visible")
    .evaluateAll((controls) =>
      controls
        .filter((control) => {
          const ariaLabel = control.getAttribute("aria-label")?.trim();
          const labelledBy = control.getAttribute("aria-labelledby")?.trim();
          const text = control.textContent?.trim();
          const labels =
            "labels" in control && control.labels
              ? Array.from(control.labels)
                  .map((label) => label.textContent?.trim())
                  .filter(Boolean)
              : [];
          return !ariaLabel && !labelledBy && !text && labels.length === 0;
        })
        .map((control) => control.outerHTML.slice(0, 180)),
    );
  expect(unnamedControls, `${route.path} has unnamed visible controls at ${viewport.width}px`).toEqual([]);

  await page.evaluate(async () => {
    const pageHeight = document.documentElement.scrollHeight;
    const step = Math.max(window.innerHeight, 480);
    for (let offset = 0; offset < pageHeight; offset += step) {
      window.scrollTo(0, offset);
      await new Promise((resolve) => window.setTimeout(resolve, 20));
    }
    window.scrollTo(0, 0);
  });
  await page.locator("img:visible").evaluateAll(async (images) => {
    await Promise.all(
      images.map(
        (image) =>
          new Promise((resolve) => {
            if (image.complete) {
              resolve();
              return;
            }
            const finish = () => resolve();
            image.addEventListener("load", finish, { once: true });
            image.addEventListener("error", finish, { once: true });
            window.setTimeout(finish, 5_000);
          }),
      ),
    );
  });
  const brokenVisibleImages = await page
    .locator("img:visible")
    .evaluateAll((images) =>
      images.filter((image) => !image.complete || image.naturalWidth === 0).map((image) => image.currentSrc || image.getAttribute("src")),
    );
  expect(brokenVisibleImages, `${route.path} has broken visible images at ${viewport.width}px`).toEqual([]);
}

test.describe.configure({ mode: "serial" });

for (const route of routes) {
  test(`${route.name}: approved responsive viewport matrix`, async ({ browser }) => {
    test.setTimeout(360_000);

    for (const viewport of viewports) {
      const context = await browser.newContext({
        baseURL,
        viewport,
        reducedMotion: "reduce",
      });
      const page = await context.newPage();
      const observer = observePage(page);

      try {
        await verifyPage(page, route, viewport);

        if (viewport.width === 320) {
          const menuButton = page.getByRole("button", { name: "Open menu", exact: true });
          await expect(menuButton).toBeVisible();
          await menuButton.click();
          const drawer = page.locator("#mobile-site-navigation");
          await expect(drawer).toBeVisible();
          await expect(drawer.getByRole("link", { name: "General Login", exact: true })).toBeVisible();
          await page.keyboard.press("Escape");
          await expect(drawer).toBeHidden();
        }

        if (viewport.width === 1440) {
          await expect(page.locator("header").getByRole("button", { name: "Login", exact: true })).toBeVisible();
          await page.screenshot({
            path: path.join(artifactRoot, `${route.name}-desktop-1440.png`),
            fullPage: true,
          });
        }

        if (viewport.width === 390) {
          await page.screenshot({
            path: path.join(artifactRoot, `${route.name}-mobile-390.png`),
            fullPage: true,
          });
        }

        expect(observer.issues, `${route.path} emitted browser failures at ${viewport.width}px`).toEqual([]);
      } finally {
        observer.dispose();
        await context.close();
      }
    }
  });
}
