import {
  COLLECTIONS,
  createFirestoreDocument,
  fetchFirestoreCollection,
  getFirestoreDocument,
  queryFirestoreCollection,
  saveFirestoreDocument,
} from "./firebase";
import { pubgFetch, PUBG_SHARD, summarizeMatch } from "./pubg";
import { aggregateTeamResults, parseMatchParticipants } from "./pubg-match-parser";
import type { Player, PubgMatchImport, Team, TeamMatchResult, TournamentMatch } from "./types";

export async function importPubgMatch(
  matchId: string,
  options?: { tournamentId?: string; scrimId?: string; screenshotUrl?: string }
) {
  const matchData = await pubgFetch(`/shards/${PUBG_SHARD}/matches/${matchId}`);
  const summary = summarizeMatch(matchData);
  const players = parseMatchParticipants(matchData);
  let teamResults = aggregateTeamResults(players);

  const teams = await fetchFirestoreCollection<Team>(COLLECTIONS.teams, 200);
  teamResults = teamResults.map((tr) => {
    const matched = teams.find(
      (t) =>
        t.name.toLowerCase() === tr.teamName.toLowerCase() ||
        t.tag?.toLowerCase() === tr.teamName.toLowerCase()
    );
    return { ...tr, teamId: matched?.id };
  });

  const winner = teamResults.find((t) => t.placement === 1)?.teamName ?? teamResults[0]?.teamName ?? "Unknown";
  const now = new Date().toISOString();

  const matchRecord: TournamentMatch = {
    id: matchId,
    pubgMatchId: matchId,
    tournamentId: options?.tournamentId,
    scrimId: options?.scrimId,
    map: summary.mapName ?? "Unknown",
    winner,
    points: teamResults[0]?.totalPoints ?? 0,
    knockouts: teamResults.reduce((s, t) => s + t.kills, 0),
    placementPoints: teamResults[0]?.placementPoints ?? 0,
    killPoints: teamResults[0]?.killPoints ?? 0,
    playedAt: summary.createdAt ?? now,
    resultScreenshotUrl: options?.screenshotUrl,
    dataSource: "pubg_api",
    syncedAt: now,
    teamResults,
  };

  const importRecord: PubgMatchImport = {
    id: matchId,
    pubgMatchId: matchId,
    mapName: summary.mapName ?? "Unknown",
    gameMode: summary.gameMode ?? "unknown",
    createdAt: summary.createdAt ?? now,
    duration: summary.duration,
    tournamentId: options?.tournamentId,
    scrimId: options?.scrimId,
    syncedAt: now,
    teamResults,
    dataSource: "pubg_api",
  };

  await saveFirestoreDocument(COLLECTIONS.pubgMatches, matchId, { ...summary, ...importRecord });
  await saveFirestoreDocument(COLLECTIONS.matchResults, matchId, matchRecord as unknown as Record<string, unknown>);
  await saveFirestoreDocument(COLLECTIONS.tournamentMatches, matchId, matchRecord as unknown as Record<string, unknown>);

  await updateTeamsFromResults(teamResults);
  await updatePlayersFromStats(players, teams);

  if (options?.scrimId) {
    await saveFirestoreDocument(COLLECTIONS.scrims, options.scrimId, {
      pubgMatchId: matchId,
      status: "completed",
      updatedAt: now,
    });
  }

  return { summary, teamResults, matchRecord, players: players.length };
}

async function updateTeamsFromResults(results: TeamMatchResult[]) {
  for (const result of results) {
    if (!result.teamId) continue;
    const team = await getFirestoreDocument<Team>(COLLECTIONS.teams, result.teamId);
    if (!team) continue;
    await saveFirestoreDocument(COLLECTIONS.teams, result.teamId, {
      kills: (team.kills ?? 0) + result.kills,
      matches: (team.matches ?? 0) + 1,
      placementPoints: (team.placementPoints ?? 0) + result.placementPoints,
      totalPoints: (team.totalPoints ?? 0) + result.totalPoints,
      updatedAt: new Date().toISOString(),
    });
  }
  await recalculateRanks();
}

async function updatePlayersFromStats(
  parsed: ReturnType<typeof parseMatchParticipants>,
  teams: Team[]
) {
  const allPlayers = await fetchFirestoreCollection<Player>(COLLECTIONS.players, 500);
  for (const stat of parsed) {
    const player = allPlayers.find(
      (p) =>
        (p.pubgName || p.inGameName || p.name)?.toLowerCase() === stat.playerName.toLowerCase() ||
        p.pubgId === stat.playerId
    );
    if (!player) continue;
    await saveFirestoreDocument(COLLECTIONS.players, player.id, {
      kills: (player.kills ?? 0) + stat.kills,
      damage: (player.damage ?? 0) + stat.damage,
      matches: (player.matches ?? 0) + 1,
      updatedAt: new Date().toISOString(),
    });
  }
}

async function recalculateRanks() {
  const teams = await fetchFirestoreCollection<Team>(COLLECTIONS.teams, 200);
  const sorted = [...teams].sort((a, b) => (b.totalPoints ?? 0) - (a.totalPoints ?? 0));
  for (let i = 0; i < sorted.length; i++) {
    await saveFirestoreDocument(COLLECTIONS.teams, sorted[i].id, { rank: i + 1 });
  }
}

export async function getLiveMatchResults(limit = 20) {
  try {
    const docs = await fetchFirestoreCollection<TournamentMatch>(COLLECTIONS.matchResults, limit);
    return docs.sort((a, b) => (b.syncedAt ?? "").localeCompare(a.syncedAt ?? ""));
  } catch {
    return [];
  }
}

export async function getMatchResult(matchId: string) {
  return getFirestoreDocument<TournamentMatch>(COLLECTIONS.matchResults, matchId);
}
