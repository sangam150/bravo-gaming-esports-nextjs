import { test, expect } from "@playwright/test";
import { defaultBroadcastTemplate } from "../lib/broadcast-template.ts";
import { BROADCAST_GRAPHICS } from "../lib/broadcast.ts";

const baseURL = process.env.QA_BASE_URL || "http://localhost:3000";
const originalGraphics = [
  "scoreboard",
  "results",
  "winner",
  "mvp",
  "top-fragger",
  "top-damage",
  "headshots",
  "players",
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
];
const graphics = [...new Set([...originalGraphics, ...BROADCAST_GRAPHICS])];
// Browser fixtures are intercepted in Playwright only; no seed or database write.
function snapshot(graphic = "scoreboard") {
  const players = [
    {
      playerId: "qa-player",
      playerName: "QA PLAYER",
      teamName: "QA TEAM",
      kills: 8,
      assists: 3,
      knocks: 9,
      damage: 1200,
      survivalTime: 1500,
    },
  ];
  const data = {
    control: { revision: 1, graphic, visible: true, lowerTitle: "QA Caster", lowerSubtitle: "QA broadcast", revealId: 1, page: 0 },
    tournament: { id: "qa-event", title: "QA BROADCAST EVENT", startDate: "2026-11-04T14:15:00Z", mapRotation: ["Erangel", "Miramar"] },
    match: { id: "qa-match", matchNumber: 1, map: "Erangel", status: "published", dataSource: "manual_correction", pointSystemName: "QA scoring" },
    results: Array.from({ length: 24 }, (_, index) => ({
      rank: index + 1,
      teamId: `qa-${index}`,
      teamName: `QA TEAM ${index + 1}`,
      placement: index + 1,
      kills: 24 - index,
      killPoints: 24 - index,
      placementPoints: 10,
      totalPoints: 34 - index,
    })),
    standings: Array.from({ length: 24 }, (_, index) => ({
      rank: index + 1,
      teamId: `qa-${index}`,
      teamName: `QA TEAM ${index + 1}`,
      matches: 3,
      wins: index === 0 ? 1 : 0,
      kills: 24 - index,
      killPoints: 24 - index,
      placementPoints: 10,
      totalPoints: 34 - index,
    })),
    players,
    mvp: players[0],
    topFragger: players[0],
    topDamage: players[0],
    selectedPlayer: players[0],
    winner: { teamName: "QA TEAM 1", kills: 24 },
    sponsors: [{ id: "qa-sponsor", name: "QA SPONSOR" }],
    headshotLeader: null,
    eliminations: [],
    schedule: { startDate: "2026-11-04T14:15:00Z", mapRotation: ["Erangel", "Miramar"] },
    timeZone: "Asia/Kathmandu",
    scheduledMatches: Array.from({ length: 6 }, (_, i) => ({
      matchNumber: i + 1,
      map: i % 2 ? "Miramar" : "Erangel",
      scheduledAt: "2026-11-04T14:15:00Z",
      status: "upcoming",
    })),
    registeredTeams: Array.from({ length: 24 }, (_, i) => ({ id: `qa-${i}`, name: `QA TEAM ${i + 1}` })),
    slotScrim: { id: "qa-slot-scrim", title: "QA Saved Scrim", date: "2026-11-06", capacity: 16, locked: true },
    teamSlots: Array.from({ length: 16 }, (_, i) => ({ slotNumber: i + 1, occupied: i === 6, ...(i === 6 ? { teamId: "qa-7", teamName: "QA SAVED SLOT TEAM" } : {}) })),
    casters: Array.from({ length: 4 }, (_, i) => ({ id: `qa-caster-${i}`, name: `QA CASTER ${i + 1}`, role: "QA ANALYST", handle: "" })),
    selectedTeam: {
      id: "qa-0",
      name: "QA TEAM 1",
      scope: "match",
      players: Array.from({ length: 4 }, (_, i) => ({ ...players[0], playerId: `qa-player-${i}`, playerName: `QA PLAYER ${i + 1}` })),
    },
  };
  data.control.scope = { stage: true, group: true, day: true };
  data.finalResults = true;
  data.champion = data.standings[0];
  data.advancement = { count: 12, final: false, teams: data.standings.slice(0, 12) };
  data.comparisonPlayers = [players[0], { ...players[0], playerId: "qa-player-second", playerName: "QA PLAYER SECOND", kills: 3, damage: 500 }];
  return data;
}

test.use({ viewport: { width: 1920, height: 1080 }, reducedMotion: "reduce" });

test("standings show saved penalties, bonuses and DQ without changing official totals", async ({ page }) => {
  const data = snapshot("standings");
  Object.assign(data.standings[0], { penaltyPoints: 4, bonusPoints: 2.5, adjustmentPoints: -1.5, disqualifications: 1, totalPoints: 28 });
  await page.route("**/api/broadcast", route => route.fulfill({ json: { success: true, data } }));
  await page.goto(`${baseURL}/overlay/standings`);
  const table = page.getByRole("table", { name: "Broadcast standings and match results" });
  await expect(table.getByRole("columnheader", { name: "Penalties / bonuses", exact: true })).toBeVisible();
  const first = table.locator("tbody tr").first();
  await expect(first).toContainText("-4 / +2.5 · 1 DQ");
  await expect(first.locator(".broadcast-points")).toHaveText("28");
  await expect(table.locator("tbody tr").nth(1)).toContainText("-0 / +0");
  await expect(table).not.toContainText("NaN");
  const bounds = await table.boundingBox();
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(1920);
});

test("all broadcast graphics render within the transparent OBS canvas", async ({ page }) => {
  test.setTimeout(180_000);
  let data = snapshot();
  await page.route("**/api/broadcast", (route) => route.fulfill({ headers: { "x-broadcast-time": String(Date.parse("2026-11-04T14:00:00Z")) }, json: { success: true, data } }));
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const graphic of graphics) {
    data = snapshot(graphic);
    const response = await page.goto(`${baseURL}/overlay/${graphic}`);
    expect(response.status()).toBe(200);
    expect(response.headers()["x-frame-options"]).toBe("SAMEORIGIN");
    await expect(page.locator(".broadcast-panel, .broadcast-scene")).toBeVisible();
    await page
      .locator(".broadcast-content")
      .evaluate((element) => Promise.all(element.getAnimations().map((animation) => animation.finished.catch(() => undefined))));
    await expect(page.locator("[data-site-chrome]").first()).toBeHidden();
    await expect(page.locator("[data-site-chrome]").last()).toBeHidden();
    const bounds = await page.locator(".broadcast-panel, .broadcast-scene").boundingBox();
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.y).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(1920);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(1080);
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe("rgba(0, 0, 0, 0)");
    expect(await page.evaluate(() => getComputedStyle(document.body, "::before").display)).toBe("none");
    expect(await page.evaluate(() => getComputedStyle(document.body, "::after").display)).toBe("none");
    if (
      [
        "scoreboard",
        "winner",
        "mvp",
        "road-to-finals",
        "road-to-finals-2",
        "todays-matches",
        "map-intro",
        "countdown",
        "casters",
        "team-stats",
      ].includes(graphic)
    )
      await page.screenshot({ path: `qa-artifacts/broadcast/${graphic}.png`, omitBackground: true });
    if (graphic === "scoreboard") {
      await expect(page.locator("tbody tr")).toHaveCount(24);
      const finalRow = await page.locator("tbody tr").last().boundingBox();
      expect(finalRow.y + finalRow.height).toBeLessThan(1040);
    }
    if (graphic === "headshots")
      await expect(page.getByText("Verified headshot statistics are not available for this match.")).toBeVisible();
    if (graphic === "killfeed") await expect(page.getByText("No reliable live elimination event source is connected.")).toBeVisible();
    if (graphic.startsWith("road-to-finals")) {
      await expect(page.locator("tbody tr")).toHaveCount(12);
      await expect(page.locator("tbody tr").first()).toContainText(graphic.endsWith("-2") ? "QA TEAM 13" : "QA TEAM 1");
      const last = await page.locator("tbody tr").last().boundingBox();
      expect(last.y + last.height).toBeLessThan(970);
    }
    if (graphic === "casters") await expect(page.locator(".scene-casters article")).toHaveCount(4);
    if (graphic === "team-stats") await expect(page.locator(".scene-roster article")).toHaveCount(4);
    if (graphic === "todays-matches") {
      await expect(page.locator(".scene-schedule article")).toHaveCount(5);
      await expect(page.locator(".scene-schedule article").first()).toContainText("Erangel");
      await expect(page.locator(".scene-schedule article").first()).toContainText("20:00");
    }
    if (graphic === "team-slots") {
      await expect(page.locator(".scene-team-slots article")).toHaveCount(16);
      await expect(page.getByLabel("Slot 7", { exact: true })).toContainText("QA SAVED SLOT TEAM");
      await expect(page.getByLabel("Slot 1", { exact: true })).toContainText("Available");
      await page.screenshot({ path: "qa-artifacts/broadcast/team-slots.png", omitBackground: true });
    }
    {
      const overflow = await page.locator(".broadcast-scene").evaluateAll((scenes) =>
        scenes.flatMap((scene) =>
          Array.from(scene.querySelectorAll("header, article, footer, h1, h2, img"))
            .filter((element) => {
              const rect = element.getBoundingClientRect();
              return rect.x < 0 || rect.y < 0 || rect.right > 1921 || rect.bottom > 1081;
            })
            .map((element) => element.tagName + ":" + element.className),
        ),
      );
      expect(overflow, `Content overflow in ${graphic}`).toEqual([]);
    }
  }
  expect(errors).toEqual([]);
});

test("program follows show, hide, reveal and connection loss", async ({ page }) => {
  test.setTimeout(60_000);
  let data = snapshot();
  data.control.visible = false;
  let failing = false;
  await page.route("**/api/broadcast", (route) =>
    failing ? route.fulfill({ status: 503, json: { error: "QA simulated outage" } }) : route.fulfill({ json: { success: true, data } }),
  );
  await page.goto(`${baseURL}/overlay/program`);
  await expect(page.locator(".broadcast-stage[data-connected=true]")).toBeAttached();
  await expect(page.locator(".broadcast-panel")).toHaveCount(0);
  data = snapshot("mvp");
  await expect(page.getByRole("heading", { name: "Match MVP", exact: true })).toBeVisible({ timeout: 10_000 });
  data = snapshot("winner");
  data.control.revealId = 2;
  await expect(page.getByRole("heading", { name: "Winner winner. Chicken dinner." })).toBeVisible({ timeout: 10_000 });
  failing = true;
  await expect(page.locator(".broadcast-panel")).toHaveCount(0, { timeout: 10_000 });
  await expect(page.locator(".broadcast-stage[data-connected=false]")).toBeAttached();
  failing = false;
  await expect(page.getByRole("heading", { name: "Winner winner. Chicken dinner." })).toBeVisible({ timeout: 15_000 });
  await expect(page.locator(".broadcast-stage[data-connected=true]")).toBeAttached();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Winner winner. Chicken dinner." })).toBeVisible();
});

test("saved slot changes and reduced capacity recover without a stale empty page", async ({ page }) => {
  const data = snapshot("team-slots");
  data.control.page = 3;
  await page.route("**/api/broadcast", route => route.fulfill({ json: { success: true, data } }));
  await page.goto(`${baseURL}/overlay/program`);
  await expect(page.locator(".scene-team-slots article")).toHaveCount(16);
  await expect(page.getByLabel("Slot 7", { exact: true })).toContainText("QA SAVED SLOT TEAM");
  data.teamSlots[6] = { slotNumber: 7, occupied: false };
  data.teamSlots[2] = { slotNumber: 3, occupied: true, teamId: "qa-7", teamName: "QA SAVED SLOT TEAM" };
  await expect(page.getByLabel("Slot 7", { exact: true })).toContainText("Available", { timeout: 10_000 });
  await expect(page.getByLabel("Slot 3", { exact: true })).toContainText("QA SAVED SLOT TEAM");
});

test("dedicated sources stay hidden for other selected graphics; preview works while hidden", async ({ page }) => {
  const data = snapshot("winner");
  data.control.visible = false;
  await page.route("**/api/broadcast", (route) => route.fulfill({ json: { success: true, data } }));
  await page.goto(`${baseURL}/overlay/mvp`);
  await expect(page.locator(".broadcast-panel")).toHaveCount(0);
  await page.goto(`${baseURL}/overlay/mvp?preview=1`);
  await expect(page.getByRole("heading", { name: "Match MVP", exact: true })).toBeVisible();
});

test("admin mutations reject unauthenticated callers", async ({ request }) => {
  expect((await request.get(`${baseURL}/api/tournaments?admin=true`)).status()).toBe(401);
  expect((await request.get(`${baseURL}/api/admin/broadcast?preview=1`)).status()).toBe(401);
  expect((await request.get(`${baseURL}/api/tournaments/qa-event?production=true`)).status()).toBe(401);
  for (const path of ["/api/admin/broadcast", "/api/admin/point-systems", "/api/admin/scrims"]) {
    const read = await request.get(`${baseURL}${path}`);
    expect(read.status()).toBe(401);
    const mutation =
      path === "/api/admin/broadcast"
        ? await request.put(`${baseURL}${path}`, { data: {}, headers: { Origin: baseURL } })
        : await request.post(`${baseURL}${path}`, { data: {}, headers: { Origin: baseURL } });
    expect(mutation.status()).toBe(401);
  }
});

test("template edits, long Unicode names and smaller pages stay inside the canvas", async ({ page }) => {
  const data = snapshot("scoreboard");
  data.control.presentation = { ...defaultBroadcastTemplate("scoreboard"), title: "国際PUBG大会 · Grand Finals — Stage Two", subtitle: "Approved broadcast presentation override", rows: 12, hiddenColumns: ["kills", "killPoints"], accent: "#2f8cff", layout: "transparent", alignment: "right", safeMargin: 96 };
  data.results[0].teamName = "国際チーム · A very long competing organization name that must remain within its cell";
  await page.route("**/api/broadcast", route => route.fulfill({ json: { success: true, data } }));
  await page.goto(`${baseURL}/overlay/program`);
  await expect(page.getByRole("heading", { name: data.control.presentation.title, exact: true })).toBeVisible();
  await expect(page.locator("tbody tr")).toHaveCount(12);
  await expect(page.locator(".broadcast-panel")).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await expect(page.locator(".broadcast-heading")).toHaveCSS("text-align", "right");
  await expect(page.getByRole("columnheader", { name: "Kill pts", exact: true })).toHaveCount(0);
  await expect(page.getByRole("columnheader", { name: "Kills", exact: true })).toHaveCount(0);
  data.control.page = 1;
  await expect(page.locator("tbody tr").first()).toContainText("QA TEAM 13", { timeout: 10_000 });
  data.control.graphic = "casters";
  data.control.presentation = { ...defaultBroadcastTemplate("casters"), title: "A very long international tournament title ".repeat(3), subtitle: "Long title clips safely while preserving the approved layout", layout: "clean", portraitX: 20, portraitY: 80, safeMargin: 96 };
  await expect(page.locator(".scene-casters article")).toHaveCount(4, { timeout: 10_000 });
  const overflow = await page.locator(".broadcast-scene header, .broadcast-scene article, .broadcast-scene h1, .broadcast-scene h2").evaluateAll(elements => elements.filter(element => { const rect = element.getBoundingClientRect(); return rect.x < 0 || rect.y < 0 || rect.right > 1921 || rect.bottom > 1081; }).map(element => element.className));
  expect(overflow).toEqual([]);
  await page.screenshot({ path: "qa-artifacts/broadcast/template-long-names.png", omitBackground: true });
});

test("presentation messages update private preview only and never write control state", async ({ page }) => {
  const data = snapshot("casters");
  const writes = [];
  await page.route("**/api/admin/broadcast?preview=1", route => { if (route.request().method() !== "GET") writes.push(route.request().method()); return route.fulfill({ json: { success: true, data } }); });
  await page.route("**/api/broadcast", route => route.fulfill({ json: { success: true, data } }));
  const message = { type: "bravo:studio:presentation", graphic: "casters", presentation: { ...defaultBroadcastTemplate("casters"), title: "PRIVATE UNSAVED TITLE", accent: "#00aaff" }, lowerTitle: "", lowerSubtitle: "" };
  await page.goto(`${baseURL}/overlay/program?studio=1`);
  await expect(page.getByRole("heading", { name: "Caster & Analyst Desk", exact: true })).toBeVisible();
  await page.evaluate(value => window.postMessage(value, location.origin), message);
  await expect(page.getByRole("heading", { name: "PRIVATE UNSAVED TITLE", exact: true })).toBeVisible();
  await page.goto(`${baseURL}/overlay/program`);
  await expect(page.getByRole("heading", { name: "Caster & Analyst Desk", exact: true })).toBeVisible();
  await page.evaluate(value => window.postMessage(value, location.origin), message);
  await expect(page.getByRole("heading", { name: "PRIVATE UNSAVED TITLE", exact: true })).toHaveCount(0);
  expect(writes).toEqual([]);
});

test("scoreboards page larger tournament fields without dropping teams", async ({ page }) => {
  const data = snapshot();
  data.results.push(
    ...data.results.map((row) => ({ ...row, teamId: `${row.teamId}-second`, rank: row.rank + 24, teamName: `QA TEAM ${row.rank + 24}` })),
  );
  data.control.page = 1;
  await page.route("**/api/broadcast", (route) => route.fulfill({ json: { success: true, data } }));
  await page.goto(`${baseURL}/overlay/scoreboard`);
  await expect(page.locator("tbody tr").first()).toContainText("QA TEAM 25");
  await expect(page.locator("tbody tr").last()).toContainText("QA TEAM 48");
  await expect(page.getByText(/Page 2 of 2/)).toBeVisible();
  data.control.page = 0;
  await expect(page.locator("tbody tr").first()).toContainText("QA TEAM 1", { timeout: 10_000 });
});

test("player portraits recover from a failed asset when the database URL changes", async ({ page }) => {
  const data = snapshot("mvp");
  data.mvp.avatarUrl = "/qa-missing-portrait.png";
  await page.route("**/api/broadcast", (route) => route.fulfill({ json: { success: true, data } }));
  await page.route("**/qa-missing-portrait.png", (route) => route.fulfill({ status: 404, body: "" }));
  await page.goto(`${baseURL}/overlay/program`);
  await expect(page.getByLabel("QA PLAYER: image unavailable", { exact: true })).toBeVisible();
  data.mvp.avatarUrl = "/images/bravo-logo-mark.webp";
  const image = page.getByRole("img", { name: "QA PLAYER", exact: true });
  await expect(image).toBeVisible({ timeout: 10_000 });
  await expect(image).toHaveAttribute("src", /\/images\/bravo-logo-mark\.webp$/);
  data.mvp.avatarUrl = "/images/bravo-logo.png";
  await expect(image).toHaveAttribute("src", /\/images\/bravo-logo\.png$/, { timeout: 10_000 });
});

test("countdown follows server time and schedule corrections without a page reload", async ({ page }) => {
  const data = snapshot("countdown");
  const epoch = Date.parse("2026-11-04T14:00:00Z");
  data.scheduledMatches[0].scheduledAt = "2026-11-04T14:02:00Z";
  await page.route("**/api/broadcast", (route) =>
    route.fulfill({ headers: { "x-broadcast-time": String(epoch) }, json: { success: true, data } }),
  );
  await page.goto(`${baseURL}/overlay/program`);
  await expect(page.getByLabel("Countdown", { exact: true })).toHaveText(/00:0[12]:\d\d/);
  data.scheduledMatches[0].scheduledAt = "2026-11-04T14:04:00Z";
  await expect(page.getByLabel("Countdown", { exact: true })).toHaveText(/00:0[34]:\d\d/, { timeout: 10_000 });
  data.control.countdownTarget = "2026-11-04T14:06:00Z";
  await expect(page.getByLabel("Countdown", { exact: true })).toHaveText(/00:0[56]:\d\d/, { timeout: 10_000 });
});
