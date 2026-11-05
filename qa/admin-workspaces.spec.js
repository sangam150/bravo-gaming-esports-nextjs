import { test, expect } from "@playwright/test";
import { build } from "esbuild";
import { parseBroadcastState } from "../lib/broadcast.ts";
import { transitionBroadcastStudio } from "../lib/broadcast-studio.ts";
import { DEFAULT_EVENT_PRODUCTION } from "../lib/event-production.ts";

// Actual components with intercepted offline endpoints. No live service writes.
let script;
test.beforeAll(async () => {
  const result = await build({
    bundle: true,
    write: false,
    platform: "browser",
    jsx: "automatic",
    define: { "process.env.NODE_ENV": '"development"', "process.env": "{}" },
    stdin: {
      resolveDir: process.cwd(),
      sourcefile: "workspaces-harness.tsx",
      loader: "tsx",
      contents: `
      import {createRoot} from 'react-dom/client'; import {useState} from 'react';
      import Sidebar from './components/admin/AdminSidebar'; import Tabs from './components/admin/AdminWorkspaceTabs';
      import Studio from './components/admin/BroadcastControlRoom';
      import Schedule from './components/admin/CompetitionScheduleEditor';
      import Production from './components/admin/EventProductionSettings';
      function Harness(){const [section,setSection]=useState('dashboard');return <>
        <Sidebar active={section} onChange={setSection} dataConnected={false} canManagePlatformAdmin={false}/>
        <Tabs section={section} onChange={setSection} canManagePlatformAdmin={false}/>
        <span data-testid="section">{section}</span>
        {location.pathname==='/studio'?<Studio/>:null}
        {location.pathname==='/schedule'?<Schedule tournament={{id:'qa-event',title:'QA EVENT',schedule:'',published:false}} onSaved={()=>{}}/>:null}
        {location.pathname==='/production'?<Production tournamentId="qa-event" teams={[]} canApprove={false}/>:null}
      </>};createRoot(document.getElementById('root')).render(<Harness/>);`,
    },
    plugins: [
      {
        name: "offline-image",
        setup(builder) {
          builder.onResolve({ filter: /^next\/image$/ }, () => ({ path: "image", namespace: "offline" }));
          builder.onLoad({ filter: /.*/, namespace: "offline" }, () => ({
            loader: "jsx",
            contents: "export default function Image({unoptimized,fill,priority,...props}){return <img {...props}/>}",
            resolveDir: process.cwd(),
          }));
        },
      },
    ],
  });
  script = result.outputFiles[0].text;
});
async function fixture(page) {
  page.on("pageerror", (error) => console.log("Offline workspace browser error:", error.message));
  const state = {
    revision: 3,
    tournamentId: "qa-event",
    matchId: "qa-match",
    playerId: "",
    graphic: "scoreboard",
    visible: false,
    lowerTitle: "",
    lowerSubtitle: "",
    revealId: 0,
    page: 0,
  };
  const writes = [];
  const server = { state, writes, conflict: false };
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (["/", "/studio", "/schedule", "/production"].includes(url.pathname))
      return route.fulfill({
        contentType: "text/html",
        body: '<html><body><div id="root"></div><script src="/bundle.js"></script></body></html>',
      });
    if (url.pathname === "/bundle.js") return route.fulfill({ contentType: "text/javascript", body: script });
    if (url.pathname === "/api/admin/broadcast") {
      if (route.request().method() === "PUT") {
        const body = route.request().postDataJSON();
        writes.push(body);
        if (server.conflict)
          return route.fulfill({
            status: 409,
            json: { error: "Another operator changed the program. Reload controls before continuing." },
          });
        expect(body.revision).toBe(server.state.revision);
        server.state = transitionBroadcastStudio(server.state, parseBroadcastState(body), body.action);
      }
      return route.fulfill({ json: { success: true, data: server.state } });
    }
    if (url.pathname === "/api/tournaments")
      return route.fulfill({ json: { success: true, data: [{ id: "qa-event", title: "QA EVENT" }] } });
    if (url.pathname === "/api/admin/sponsors") return route.fulfill({ json: { success: true, data: [] } });
    if (url.pathname === "/api/admin/point-systems") return route.fulfill({ json: { success: true, data: [] } });
    if (url.pathname === "/api/tournaments/qa-event") {
      if (route.request().method() === "PUT") {
        const body = route.request().postDataJSON();
        writes.push(body);
        if (body.productionAction) return route.fulfill({ json: { success: true, data: { revision: body.productionRevision + 1, draft: body.production } } });
        return route.fulfill({ json: { success: true } });
      }
      if (url.searchParams.has("production")) return route.fulfill({ json: { success: true, data: { revision: 0, draft: DEFAULT_EVENT_PRODUCTION, approved: null } } });
      return route.fulfill({
        json: {
          success: true,
          data: {
            matches: [{ id: "qa-match", tournamentId: "qa-event", matchNumber: 1, map: "Erangel", playerResults: [], teamResults: [] }],
          },
        },
      });
    }
    if (url.pathname.startsWith("/overlay/")) return route.fulfill({ contentType: "text/html", body: "<p>Offline preview transport</p>" });
    return route.abort("blockedbyclient");
  });
  return server;
}
test("eight workspaces preserve contextual tabs and restrict privileged tools", async ({ page }) => {
  await fixture(page);
  await page.goto("http://qa-workspaces.test/");
  const primary = page.getByRole("navigation", { name: "Admin navigation", exact: true });
  await expect(primary).toBeVisible();
  expect(await primary.getByRole("button").allTextContents()).toEqual([
    "Dashboard",
    "Competitions",
    "Scrims",
    "Teams & Players",
    "Match Results",
    "Broadcast Studio",
    "Content",
    "Settings",
  ]);
  await primary.getByRole("button", { name: "Competitions", exact: true }).click();
  const competition = page.getByRole("navigation", { name: "Competitions tools" });
  for (const label of ["Overview", "Teams", "Schedule", "Results", "Standings", "Broadcast", "Settings"])
    await expect(competition.getByRole("button", { name: label, exact: true })).toBeVisible();
  await competition.getByRole("button", { name: "Schedule", exact: true }).click();
  await expect(page.getByTestId("section")).toHaveText("competitionSchedule");
  await expect(primary.getByRole("button", { name: "Competitions", exact: true })).toHaveAttribute("aria-current", "page");
  await primary.getByRole("button", { name: "Teams & Players", exact: true }).click();
  await expect(page.getByRole("button", { name: "Player assignments", exact: true })).toHaveCount(0);
});
test("private preview, readiness, PGM restore and revision conflicts", async ({ page }) => {
  const server = await fixture(page);
  await page.goto("http://qa-workspaces.test/studio");
  await page.getByLabel("Graphic", { exact: true }).selectOption("road-to-finals");
  await page.getByRole("button", { name: "Save & preview", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("live program is unchanged");
  expect(server.state.graphic).toBe("scoreboard");
  expect(server.writes.at(-1).visible).toBe(false);
  await expect(page.getByTitle("Published graphic preview")).toHaveAttribute("src", "/overlay/program?studio=1");
  await page.getByRole("button", { name: "Preview next page", exact: true }).click();
  await expect(page.getByLabel("Graphic", { exact: true })).toHaveValue("road-to-finals-2");
  await expect(page.getByRole("button", { name: "Show graphic", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Mark ready", exact: true }).click();
  await expect(page.getByRole("button", { name: "Show graphic", exact: true })).toBeEnabled();
  await page.getByLabel("Main title", { exact: true }).fill("Broadcast-only title");
  await expect(page.getByRole("button", { name: "Show graphic", exact: true })).toBeDisabled();
  expect(server.state.graphic).toBe("scoreboard");
  await page.getByRole("button", { name: "Mark ready", exact: true }).click();
  await page.getByRole("button", { name: "Show graphic", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("on air");
  expect(server.state.visible).toBe(true);
  expect(server.state.templates["road-to-finals-2"].title).toBe("Broadcast-only title");
  await page.getByLabel("Graphic", { exact: true }).selectOption("mvp");
  await page.getByRole("button", { name: "Refresh overlay data", exact: true }).click();
  await expect(page.getByLabel("Graphic", { exact: true })).toHaveValue("road-to-finals-2");
  expect(server.state.graphic).toBe("road-to-finals-2");
  await page.getByRole("button", { name: "Restore previous graphic", exact: true }).click();
  await expect(page.getByLabel("Graphic", { exact: true })).toHaveValue("scoreboard");
  expect(server.state.graphic).toBe("scoreboard");
  server.conflict = true;
  await page.getByRole("button", { name: "Hide graphic", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Another operator");
  expect(server.state.visible).toBe(true);
});
test("event branding drafts retain approval gate and event timezone", async ({ page }) => {
  const server = await fixture(page);
  await page.goto("http://qa-workspaces.test/production");
  await page.getByLabel("Short tournament name", { exact: true }).fill("国際大会");
  await page.getByLabel("Event timezone", { exact: true }).fill("Europe/London");
  await expect(page.getByRole("button", { name: "Approve settings", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Save draft settings", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Public graphics are unchanged");
  const payload = server.writes.at(-1);
  expect(payload.productionAction).toBe("draft");
  expect(payload.production.shortName).toBe("国際大会");
  expect(payload.production.timeZone).toBe("Europe/London");
  expect(payload.published).toBeUndefined();
});
test("schedule editor writes explicit UTC and keeps a draft competition private", async ({ page }) => {
  const server = await fixture(page);
  await page.goto("http://qa-workspaces.test/schedule");
  await page.getByRole("button", { name: "Add scheduled match" }).click();
  await page.getByLabel("Start time (Asia/Kathmandu)", { exact: true }).fill("2026-11-04T20:00");
  await page.getByRole("button", { name: "Save schedule", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Schedule saved");
  const payload = server.writes.at(-1);
  expect(payload.published).toBeUndefined();
  expect(Object.keys(payload)).toEqual(["schedule"]);
  expect(JSON.parse(payload.schedule).matches[0].scheduledAt).toBe("2026-11-04T14:15:00.000Z");
});
