import { readFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import nextEnv from "@next/env";

const QA_MARKER = "QA VISUAL TEST - DO NOT USE";
const MANIFEST_PATH = path.resolve(process.cwd(), "qa-artifacts", "qa-visual-test-records.json");

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey =
    process.env.SUPABASE_SECRET_KEY?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL.");
  }

  if (!serviceRoleKey) {
    throw new Error("Missing SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY.");
  }

  return { url, serviceRoleKey };
}

async function loadManifest() {
  try {
    const raw = await readFile(MANIFEST_PATH, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function run() {
  const { url, serviceRoleKey } = getSupabaseConfig();
  const client = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const manifest = await loadManifest();
  const recordIds = manifest?.records ?? {};

  const matchId = recordIds.matchId ?? null;
  const playerId = recordIds.playerId ?? null;
  const teamId = recordIds.teamId ?? null;
  const eventId = recordIds.eventId ?? null;
  const seasonId = recordIds.seasonId ?? null;

  if (matchId) {
    await client.from("match_player_results").delete().eq("match_id", matchId);
    await client.from("match_team_results").delete().eq("match_id", matchId);
    await client.from("matches").delete().eq("id", matchId);
  }

  if (eventId && teamId) {
    await client.from("event_teams").delete().eq("event_id", eventId).eq("team_id", teamId);
  }

  if (playerId) {
    await client.from("players").delete().eq("id", playerId);
  }

  if (teamId) {
    await client.from("teams").delete().eq("id", teamId);
  }

  if (eventId) {
    await client.from("events").delete().eq("id", eventId);
  }

  if (seasonId) {
    await client.from("seasons").delete().eq("id", seasonId);
  }

  // Safety sweep for any stray QA rows that include the explicit marker.
  await client.from("match_player_results").delete().ilike("player_name", `%${QA_MARKER}%`);
  await client.from("match_team_results").delete().ilike("team_name", `%${QA_MARKER}%`);
  await client.from("matches").delete().ilike("match_id", "qa-visual-match-%");
  await client.from("players").delete().ilike("pubg_name", `%${QA_MARKER}%`);
  await client.from("teams").delete().ilike("name", `%${QA_MARKER}%`);
  await client.from("events").delete().ilike("title", `%${QA_MARKER}%`);
  await client.from("seasons").delete().ilike("name", `%${QA_MARKER}%`);

  console.log("QA visual test records cleaned up.");
}

run().catch((error) => {
  console.error("Failed to clean QA visual test data.");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
