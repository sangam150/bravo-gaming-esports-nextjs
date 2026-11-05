import assert from "node:assert/strict";
import { buildBroadcastSnapshot, DEFAULT_BROADCAST_STATE } from "../lib/broadcast";
import { resolvePublicEventPolicy } from "../lib/public-event-policy";
import { hasPublicDemoMarker } from "../lib/public-content";

async function main() {
  const originalFetch = globalThis.fetch;
  const environment = { ...process.env };
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://offline-boundary.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "offline-boundary-public";
  process.env.SUPABASE_SECRET_KEY = "offline-boundary-server";
  const eventId = "00000000-0000-4000-8000-000000000001";
  const matchId = "00000000-0000-4000-8000-000000000002";
  const teamId = "00000000-0000-4000-8000-000000000003";
  const account = "account.PRIVATE_BOUNDARY";
  let revisionRace = false;
  let hidden = false;
  let documentReads = 0;
  let requests = 0;
  const now = new Date(Date.now() - 86_400_000).toISOString();
  globalThis.fetch = async (input, init) => {
    requests++;
    const url = new URL(input instanceof Request ? input.url : String(input));
    assert.equal(url.origin, "https://offline-boundary.supabase.co", "No real service access permitted");
    const table = url.pathname.split("/").at(-1);
    const singular = new Headers(init?.headers).get("accept")?.includes("object+json");
    const reply = (rows: object[]) => Response.json(singular ? rows[0] ?? null : rows);
    if (table === "events") {
      if (hidden && url.searchParams.has("published")) return reply([]);
      return reply([{ id: eventId, name: "Bravo Boundary Event", title: "Bravo Boundary Event", slug: "bravo-boundary", published: true, published_at: now, deleted_at: null, demo_seed_tag: null, season_id: null, start_date: now, status: "active", max_teams: 24, format: "Squad", server: "Global" }]);
    }
    if (table === "event_teams" || table === "seasons" || table === "point_systems" || table === "players") return reply([]);
    if (table === "matches") {
      if (url.searchParams.get("select") === "id,revision") return reply([{ id: matchId, revision: revisionRace ? 2 : 1 }]);
      return reply([{ id: matchId, event_id: eventId, season_id: null, match_id: "BOUNDARY-MANUAL", map: "Erangel", match_number: 1, status: "published", published_at: now, match_date: now, created_at: now, updated_at: now, demo_seed_tag: null, deleted_at: null, revision: 1, scoring_rules: {}, raw_json: { private: "PRIVATE_SNAPSHOT" } }]);
    }
    if (table === "teams") return reply([{ id: teamId, name: "Bravo Boundary Team", is_active: true, status: "active", archived_at: null, merged_into_team_id: null, deleted_at: null, demo_seed_tag: null }]);
    if (table === "match_team_results") return reply([{ id: "team-row", match_id: matchId, team_id: teamId, team_name: "Bravo Boundary Team", placement: 1, kills: 3, damage: 500, placement_points: 10, kill_points: 3, total_points: 13, adjustment_points: 0, decision_reason: "", disqualified: false, demo_seed_tag: null }]);
    if (table === "match_player_results") return reply([{ id: "player-row", match_id: matchId, player_id: null, pubg_account_id: account, player_name: "Bravo Boundary Player", team_id: teamId, team_name: "Bravo Boundary Team", placement: 1, kills: 3, assists: 0, knocks: 3, damage: 500, survival_time: 1200, placement_points: 10, total_points: 13, link_eligibility: "eligible", demo_seed_tag: null }]);
    if (table === "app_documents") { documentReads++; return reply([]); }
    throw new Error(`Unexpected offline query: ${table}`);
  };
  try {
    const { getTournamentMatches, getTournamentStandings, getTournament, isExplicitlyPublishedContent } = await import("../lib/data");
    const publicMatches = await getTournamentMatches(eventId);
    assert.equal(publicMatches.length, 1);
    assert.doesNotMatch(JSON.stringify(publicMatches), /PRIVATE_BOUNDARY|PRIVATE_SNAPSHOT/);
    const broadcastMatches = await getTournamentMatches(eventId, { preserveResultIdentity: true });
    assert.equal(broadcastMatches[0].playerResults![0].playerId, account, "Selection identity remains server-side until final projection");
    const tournament = (await getTournament(eventId))!;
    const internal = (await getTournament(eventId, { includeInternal: true }))!;
    assert.ok(isExplicitlyPublishedContent(internal, { requirePublishedAt: true }));
    assert.equal(hasPublicDemoMarker(internal.id, internal.title, internal.sourceProvider), false);
    assert.notEqual(resolvePublicEventPolicy(internal).lifecycle, "archived");
    assert.ok(tournament, `Fixture event must pass the actual public event policy: ${JSON.stringify(await getTournament(eventId, { includeInternal: true }))}`);
    assert.equal(tournament.published, true, "Public DTO must retain its verified publication marker for broadcast eligibility");
    const snapshot = buildBroadcastSnapshot({ state: { ...DEFAULT_BROADCAST_STATE, tournamentId: eventId, matchId, playerId: account }, tournament, matches: broadcastMatches, teams: [], players: [], sponsors: [] });
    assert.ok(snapshot.selectedPlayer, "Actual data-reader output must preserve unmapped operator selection");
    assert.doesNotMatch(JSON.stringify(snapshot), /PRIVATE_BOUNDARY|PRIVATE_SNAPSHOT/);
    revisionRace = true;
    await assert.rejects(getTournamentMatches(eventId), /revision conflict/);
    await assert.rejects(getTournamentStandings(eventId), /revision conflict/);
    assert.equal(documentReads, 0, "Revision conflicts must not fall back to stale compatibility documents");
    revisionRace = false; hidden = true;
    assert.equal(await getTournament(eventId), null);
    assert.deepEqual(await getTournamentMatches(eventId), []);
    assert.deepEqual(await getTournamentStandings(eventId), []);
    assert.equal(documentReads, 0, "Hidden canonical events must not resurrect compatibility results");
    const { resetImportedPubgMatch, repairImportedPubgMatchFromCache } = await import("../lib/pubg-import-relational");
    const beforeRequests = requests;
    for (const reference of ["match,external_match_id.eq.other", "match)or(id.eq.other)", 'match"', "match\\other"]) {
      await assert.rejects(resetImportedPubgMatch(reference), /Invalid match reference/);
      await assert.rejects(repairImportedPubgMatchFromCache(reference), /Invalid match reference/);
    }
    assert.equal(requests, beforeRequests, "Malformed maintenance references must fail before any query or mutation");
    console.log("PASS: installed-SDK tournament reader publication boundary, raw-ID masking, server broadcast selection, revision-conflict propagation, hidden canonical ownership and malformed maintenance reference denial. Offline intercepted services only.");
  } finally {
    globalThis.fetch = originalFetch;
    for (const key of Object.keys(process.env)) if (!(key in environment)) delete process.env[key];
    Object.assign(process.env, environment);
  }
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
