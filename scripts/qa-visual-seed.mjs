import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import nextEnv from "@next/env";

const QA_MARKER = "QA VISUAL TEST - DO NOT USE";
const ARTIFACT_DIR = path.resolve(process.cwd(), "qa-artifacts");
const MANIFEST_PATH = path.resolve(ARTIFACT_DIR, "qa-visual-test-records.json");

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SECRET_KEY?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL.");
  }

  if (!serviceRoleKey) {
    throw new Error("Missing SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY.");
  }

  return { url, serviceRoleKey };
}

function toSlug(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

async function run() {
  const { url, serviceRoleKey } = getSupabaseConfig();
  const client = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const now = new Date();
  const nowIso = now.toISOString();
  const dateOnly = nowIso.slice(0, 10);
  const runTag = nowIso.replace(/[-:.TZ]/g, "").slice(0, 14);

  const seasonId = randomUUID();
  const eventId = randomUUID();
  const teamId = randomUUID();
  const playerId = randomUUID();
  const matchId = randomUUID();

  const seasonName = `${QA_MARKER} SEASON ${runTag}`;
  const eventTitle = `${QA_MARKER} EVENT ${runTag}`;
  const teamName = `${QA_MARKER} TEAM ${runTag}`;
  const playerName = `${QA_MARKER} PLAYER ${runTag}`;

  const seasonSlug = toSlug(seasonName);
  const eventSlug = toSlug(eventTitle);
  const teamSlug = toSlug(teamName);
  const playerSlug = toSlug(playerName);

  const matchExternalId = `qa-visual-match-${runTag}`;
  const playerPubgAccountId = `qa-visual-player-${runTag}`;

  const { error: seasonError } = await client.from("seasons").insert({
    id: seasonId,
    name: seasonName,
    slug: seasonSlug,
    series_title: seasonName,
    season_number: 9999,
    status: "archived",
    start_date: dateOnly,
    end_date: dateOnly,
    current_day_number: 1,
    configured_days: 1,
    completed_at: nowIso,
    notes: QA_MARKER,
    description: QA_MARKER,
    game: "PUBG PC",
    format: "Squad",
    region: "QA",
    perspective: "TPP",
    type: "scrims",
    created_at: nowIso,
    updated_at: nowIso,
  });
  if (seasonError) throw seasonError;

  const { error: eventError } = await client.from("events").insert({
    id: eventId,
    season_id: seasonId,
    title: eventTitle,
    name: eventTitle,
    slug: eventSlug,
    event_type: "tournament",
    type: "tournament",
    game: "PUBG PC",
    mode: "Squad",
    perspective: "TPP",
    status: "completed",
    competition_status: "COMPLETED",
    description: QA_MARKER,
    start_date: nowIso,
    end_date: nowIso,
    region: "QA",
    server: "QA",
    tier: "QA",
    prize_pool: "N/A",
    rules: QA_MARKER,
    schedule: QA_MARKER,
    map_rotation: ["Erangel"],
    max_teams: 1,
    team_count: 1,
    season_day_number: 1,
    match_count: 1,
    published: true,
    published_at: nowIso,
    created_at: nowIso,
    updated_at: nowIso,
  });
  if (eventError) throw eventError;

  const { error: teamError } = await client.from("teams").insert({
    id: teamId,
    name: teamName,
    slug: teamSlug,
    short_name: "QAVT",
    tag: "QAVT",
    description: QA_MARKER,
    status: "active",
    is_active: true,
    region: "QA",
    created_at: nowIso,
    updated_at: nowIso,
  });
  if (teamError) throw teamError;

  const { error: playerError } = await client.from("players").insert({
    id: playerId,
    pubg_account_id: playerPubgAccountId,
    pubg_name: playerName,
    display_name: playerName,
    current_team_id: teamId,
    slug: playerSlug,
    is_active: true,
    created_at: nowIso,
    updated_at: nowIso,
  });
  if (playerError) throw playerError;

  const { error: eventTeamError } = await client.from("event_teams").insert({
    event_id: eventId,
    team_id: teamId,
    slot_number: 1,
    status: "registered",
    created_at: nowIso,
    updated_at: nowIso,
  });
  if (eventTeamError) throw eventTeamError;

  const matchSnapshot = {
    qaMarker: QA_MARKER,
    matchNumber: 1,
    map: "Erangel",
    status: "published",
    winner: teamName,
    playedAt: nowIso,
    dataSource: "manual_correction",
    eventName: eventTitle,
    eventSlug,
    teamResults: [
      {
        teamId,
        teamName,
        slotNumber: 1,
        placement: 1,
        kills: 8,
        damage: 1400,
        placementPoints: 10,
        killPoints: 8,
        totalPoints: 18,
      },
    ],
    playerResults: [
      {
        playerId,
        playerName,
        pubgPlayerId: playerPubgAccountId,
        teamId,
        teamName,
        slotNumber: 1,
        placement: 1,
        kills: 8,
        assists: 2,
        knocks: 4,
        damage: 1400,
        survivalTime: 1800,
        placementPoints: 10,
        totalPoints: 18,
      },
    ],
  };

  const { error: matchError } = await client.from("matches").insert({
    id: matchId,
    season_id: seasonId,
    day_id: null,
    event_id: eventId,
    match_id: matchExternalId,
    external_match_id: matchExternalId,
    match_number: 1,
    map: "Erangel",
    map_name: "Erangel",
    match_date: nowIso,
    start_time: nowIso,
    status: "published",
    raw_json: matchSnapshot,
    source_url: null,
    vod_url: null,
    data_source: "manual_correction",
    scoreboard_image_url: null,
    result_image_url: null,
    screenshot_urls: [],
    published_at: nowIso,
    deleted_at: null,
    point_system_id: null,
    created_at: nowIso,
    updated_at: nowIso,
  });
  if (matchError) throw matchError;

  const { error: matchTeamResultError } = await client.from("match_team_results").insert({
    match_id: matchId,
    team_id: teamId,
    team_name: teamName,
    slot_number: 1,
    placement: 1,
    kills: 8,
    placement_points: 10,
    kill_points: 8,
    total_points: 18,
    wwcd: true,
    created_at: nowIso,
    updated_at: nowIso,
  });
  if (matchTeamResultError) throw matchTeamResultError;

  const { error: matchPlayerResultError } = await client.from("match_player_results").insert({
    match_id: matchId,
    player_id: playerId,
    player_name: playerName,
    pubg_account_id: playerPubgAccountId,
    team_id: teamId,
    team_name: teamName,
    slot_number: 1,
    placement: 1,
    kills: 8,
    assists: 2,
    knocks: 4,
    damage: 1400,
    survival_time: 1800,
    placement_points: 10,
    total_points: 18,
    created_at: nowIso,
    updated_at: nowIso,
  });
  if (matchPlayerResultError) throw matchPlayerResultError;

  const manifest = {
    marker: QA_MARKER,
    createdAt: nowIso,
    records: {
      seasonId,
      eventId,
      teamId,
      playerId,
      matchId,
    },
    lookup: {
      seasonName,
      eventTitle,
      teamName,
      playerName,
      matchExternalId,
    },
    routes: {
      match: `/pubg/matches/${matchId}`,
      team: `/pubg/teams/${teamSlug}`,
      player: `/pubg/players/${playerSlug}`,
    },
    cleanup: {
      command: "npm run qa:visual:cleanup",
      note: "Run cleanup after screenshots to remove QA data.",
    },
  };

  await mkdir(ARTIFACT_DIR, { recursive: true });
  await writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  console.log("QA visual test records created.");
  console.log(`Manifest: ${MANIFEST_PATH}`);
  console.log(`Match route: ${manifest.routes.match}`);
  console.log(`Team route: ${manifest.routes.team}`);
  console.log(`Player route: ${manifest.routes.player}`);
}

run().catch((error) => {
  console.error("Failed to seed QA visual test data.");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
