import { test, expect } from "@playwright/test";
import { build } from "esbuild";
import { DEFAULT_EVENT_PRODUCTION } from "../lib/event-production.ts";
import { scoreMatchResults } from "../lib/competition-scoring.ts";
import { parsePointSystemInput } from "../lib/point-system-input.ts";
import { buildTournamentStandings } from "../lib/tournament-standings.ts";

// Actual components with browser-only service fixtures; never staging proof.
const team = { id: "qa-team-a", name: "QA TEAM A", totalPoints: 0, kills: 0, matches: 0 };
const player = {
  id: "qa-player-a",
  name: "QA PLAYER A",
  teamId: team.id,
  kills: 0,
  damage: 0,
  assists: 0,
  matches: 0,
  mvpCount: 0,
  chickenDinners: 0,
};
const tournament = {
  id: "qa-event",
  title: "QA INTERNATIONAL EVENT",
  published: true,
  status: "LIVE",
  tier: "",
  prizePool: "1000",
  teamCount: 1,
  maxTeams: 24,
  startDate: "2026-11-05",
  format: "Squad",
  mode: "Squad",
  server: "Global",
  registeredTeamIds: [team.id],
};
const points = { id: "qa-rules", ...parsePointSystemInput({ name: "QA version", kill_points: 2.5, placement_points: { 1: 12.25 } }) };
const production = {
  ...DEFAULT_EVENT_PRODUCTION,
  organizerName: "QA ORGANIZER",
  timeZone: "Europe/London",
  stages: [{ id: "finals", name: "Grand Finals", order: 0, archived: false, advanceCount: 1, pointSystemId: points.id }],
  groups: [{ id: "group-a", name: "Group A", stageId: "finals", order: 0, archived: false, teamIds: [team.id] }],
  days: [
    { id: "day-1", name: "Day 1", stageId: "finals", date: "2026-11-05", order: 0, archived: false },
    { id: "day-2", name: "Day 2", stageId: "finals", date: "2026-11-06", order: 1, archived: false },
  ],
};
const schedule = {
  version: 1,
  stage: "Finals",
  timeZone: "Europe/London",
  matches: [
    {
      matchNumber: 1,
      matchId: "qa-match",
      map: "Erangel",
      scheduledAt: "2026-11-05T18:00:00Z",
      status: "completed",
      stageId: "finals",
      groupId: "group-a",
      dayId: "day-1",
    },
    {
      matchNumber: 2,
      map: "Miramar",
      scheduledAt: "2026-11-06T19:00:00Z",
      status: "scheduled",
      stageId: "finals",
      groupId: "group-a",
      dayId: "day-2",
    },
  ],
};
const scored = scoreMatchResults(
  [{ teamId: team.id, teamName: team.name, placement: 1, kills: 5, damage: 800, placementPoints: 0, killPoints: 0, totalPoints: 0 }],
  [
    {
      playerId: player.id,
      playerName: player.name,
      teamId: team.id,
      teamName: team.name,
      placement: 1,
      kills: 5,
      damage: 800,
      assists: 0,
      knocks: 5,
      survivalTime: 1200,
      placementPoints: 0,
      totalPoints: 0,
    },
  ],
  points,
);
const match = {
  id: "qa-match",
  tournamentId: tournament.id,
  matchNumber: 1,
  pubgMatchId: "QA-MANUAL-REFERENCE",
  map: "Erangel",
  status: "published",
  dataSource: "manual_correction",
  winner: scored.winner,
  points: scored.totalPoints,
  knockouts: scored.totalKills,
  ...scored,
};
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
      sourcefile: "master-harness.tsx",
      loader: "tsx",
      contents: `import {createRoot} from 'react-dom/client';import Match from './components/admin/AdminMatchManager';import Points from './components/admin/PointSystemManager';import Tournament from './components/tournaments/TournamentDetailClient';const seed=window.QA_SEED;createRoot(document.getElementById('root')).render(location.pathname==='/match'?<Match tournaments={[seed.tournament]} scrims={[]} knownTeams={[seed.team]} knownPlayers={[seed.player]} initialTournamentId={seed.tournament.id}/>:location.pathname==='/scoring'?<Points onCreated={()=>{}}/>:<Tournament {...seed.workspace} tournament={seed.workspace}/>);`,
    },
    plugins: [
      {
        name: "fixture-next",
        setup(builder) {
          builder.onResolve({ filter: /^next\/(image|link)$/ }, (args) => ({ path: args.path, namespace: "fixture" }));
          builder.onLoad({ filter: /.*/, namespace: "fixture" }, (args) => ({
            loader: "jsx",
            resolveDir: process.cwd(),
            contents: args.path.endsWith("image")
              ? "export default function Image({unoptimized,fill,priority,fetchPriority,...props}){return <img {...props}/>;}"
              : "export default function Link({children,prefetch,...props}){return <a {...props}>{children}</a>;}",
          }));
        },
      },
    ],
  });
  script = result.outputFiles[0].text;
});
async function fixture(page) {
  const server = {
    writes: [],
    matches: [],
    publicStatus: 200,
    workspace: {
      ...tournament,
      schedule: JSON.stringify(schedule),
      serverTime: Date.parse("2026-11-05T10:00:00Z"),
      matches: [match],
      teams: [team],
      players: [player],
      standings: buildTournamentStandings(tournament.id, tournament.title, [match]),
      production,
      sponsors: [{ id: "qa-sponsor", name: "QA EVENT PARTNER" }],
      announcements: [
        { id: "qa-notice", title: "QA OFFICIAL NOTICE", detail: "Approved event notice.", date: "2026-11-05", published: true },
      ],
    },
  };
  await page.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (["/match", "/scoring", "/event"].includes(url.pathname))
      return route.fulfill({
        contentType: "text/html",
        body: `<html><body><div id="root"></div><script>window.QA_SEED=${JSON.stringify({ tournament, team, player, workspace: server.workspace })}</script><script src="/bundle.js"></script></body></html>`,
      });
    if (url.pathname === "/bundle.js") return route.fulfill({ contentType: "text/javascript", body: script });
    if (url.pathname === "/api/tournaments/qa-event")
      return route.fulfill({
        status: server.publicStatus,
        json: server.publicStatus === 200 ? { success: true, data: server.workspace } : { error: "QA withdrawn" },
      });
    if (url.pathname === "/api/admin/point-systems") {
      server.writes.push(request.postDataJSON());
      return route.fulfill({ json: { success: true, data: points } });
    }
    if (url.pathname === "/api/admin/matches" && request.method() === "GET")
      return route.fulfill({ json: { success: true, data: { matches: server.matches, uploads: [], pointSystems: [points] } } });
    if (["/api/admin/matches", "/api/admin/matches/preview"].includes(url.pathname)) {
      const body = request.postDataJSON();
      server.writes.push(body);
      if (Array.isArray(body.matches)) {
        const data = body.matches.map((entry, index) => ({
          ...entry,
          id: `qa-shell-${index}`,
          ...scoreMatchResults(entry.teamResults, entry.playerResults, points),
          status: "draft",
        }));
        server.matches = data;
        return route.fulfill({ json: { success: true, data } });
      }
      const calculation = scoreMatchResults(body.teamResults, body.playerResults, points);
      const data = {
        ...body,
        id: body.id || "qa-new-match",
        pubgMatchId: body.pubgMatchId || "QA-MANUAL",
        eventName: tournament.title,
        eventSlug: "qa-event",
        ...calculation,
        status: url.pathname.endsWith("preview") ? "draft" : body.status,
        updatedAt: "2026-11-05T10:00:00Z",
      };
      if (!url.pathname.endsWith("preview")) server.matches = [data];
      return route.fulfill({ json: { success: true, data } });
    }
    return route.abort("blockedbyclient");
  });
  return server;
}
test("manual results retain canonical identities and require a fresh preview", async ({ page }) => {
  const server = await fixture(page);
  await page.goto("http://qa-master.test/match");
  await page.getByRole("button", { name: "Add team result", exact: true }).click();
  await page.getByLabel("Team 1", { exact: true }).selectOption(team.id);
  await page.getByLabel("Team 1 kills", { exact: true }).fill("5");
  await page.getByLabel("Team 1 damage", { exact: true }).fill("800");
  await page.getByRole("button", { name: "Add player statistics", exact: true }).click();
  await page.getByLabel("Player 1", { exact: true }).selectOption(player.id);
  await page.getByLabel("Player 1 kills", { exact: true }).fill("5");
  await page.getByLabel("Player 1 damage", { exact: true }).fill("800");
  const publish = page.getByRole("button", { name: "Create & Publish", exact: true });
  await expect(publish).toBeDisabled();
  await page.getByRole("button", { name: "Preview", exact: true }).click();
  await expect(publish).toBeEnabled();
  await page.getByLabel("Team 1 kills", { exact: true }).fill("6");
  await expect(publish).toBeDisabled();
  await page.getByRole("button", { name: "Preview", exact: true }).click();
  await expect(publish).toBeEnabled();
  await publish.click();
  await expect(page.getByRole("status")).toContainText("created and published");
  const saved = server.writes.at(-1);
  expect(saved.teamResults[0].teamId).toBe(team.id);
  expect(saved.playerResults[0].playerId).toBe(player.id);
  expect(saved.playerResults[0].teamId).toBe(team.id);
  expect(saved.teamResults[0].kills).toBe(6);
});
test("organizer selects versioned tie-break and MVP sequences through forms", async ({ page }) => {
  const server = await fixture(page);
  await page.goto("http://qa-master.test/scoring");
  await page.getByText("Configure scoring", { exact: true }).click();
  await page.getByLabel("Version name", { exact: true }).fill("QA RULES V2");
  await page.getByRole("button", { name: "Move damage up in Match MVP criteria", exact: true }).click();
  await page.getByRole("button", { name: "Create scoring version", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Scoring version saved");
  expect(server.writes[0].rules_json.awardCriteria[0]).toBe("damage");
  expect(server.writes[0].rules_json.version).toBe(2);
});
test("bulk match shells inherit event scoring unless the operator explicitly selects a version", async ({ page }) => {
  const server = await fixture(page);
  await page.goto("http://qa-master.test/match");
  const bulk = page.locator("form").filter({ has: page.getByRole("button", { name: "Create Multiple Matches", exact: true }) });
  const scoring = bulk.getByLabel("Point system", { exact: true });
  await expect(scoring).toHaveValue("");
  await bulk.getByLabel("PUBG match IDs", { exact: true }).fill("QA-SHELL-1\nQA-SHELL-2");
  await bulk.getByLabel("Event", { exact: true }).selectOption(tournament.id);
  await bulk.getByRole("button", { name: "Create Multiple Matches", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("2 match shells created");
  const inherited = server.writes.at(-1).matches;
  expect(inherited).toHaveLength(2);
  for (const entry of inherited) {
    expect(entry.pointSystemId).toBeUndefined();
    expect(entry.tournamentId).toBe(tournament.id);
    expect(entry.status).toBe("draft");
  }
  await expect(scoring).toHaveValue("");
  await bulk.getByLabel("PUBG match IDs", { exact: true }).fill("QA-SHELL-3");
  await bulk.getByLabel("Event", { exact: true }).selectOption(tournament.id);
  await scoring.selectOption(points.id);
  await bulk.getByRole("button", { name: "Create Multiple Matches", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("1 match shell created");
  expect(server.writes.at(-1).matches[0].pointSystemId).toBe(points.id);
});
test("public event separates schedules/results, scopes standings and withdraws stale data", async ({ page }) => {
  await page.clock.install();
  const server = await fixture(page);
  await page.goto("http://qa-master.test/event");
  await expect(page.getByRole("heading", { name: tournament.title, exact: true })).toBeVisible();
  await expect(page.getByText("Organizer: QA ORGANIZER", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Schedule", exact: true }).click();
  await expect(page.getByRole("table", { name: "Published event match schedule", exact: true }).locator("tbody tr")).toHaveCount(2);
  await expect(page.getByText("Results published", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Results", exact: true }).click();
  await expect(page.getByRole("link", { name: "Open Match Page", exact: true })).toHaveAttribute("href", "/results/matches/qa-match");
  await expect(page.getByText("24.75", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Standings", exact: true }).click();
  await page.getByRole("combobox", { name: "Match day", exact: true }).selectOption("day-2");
  await expect(page.getByText("Verified day standings have not been published.", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Partners", exact: true }).click();
  await expect(page.getByRole("heading", { name: "QA EVENT PARTNER", exact: true })).toBeVisible();
  server.publicStatus = 404;
  await page.clock.fastForward(16_000);
  await expect(page.getByRole("alert")).toContainText("no longer published");
  await expect(page.getByRole("table")).toHaveCount(0);
});
