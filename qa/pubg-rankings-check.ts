import assert from "node:assert/strict";
import { getPubgDashboardData, getPubgHubDataset } from "../lib/pubg-hub";
import {
  buildPubgAggregatePlayerBoardRows,
  buildPubgPlayerBoardRows,
  buildPubgTeamBoardRows,
  comparePubgPlayers,
  comparePubgTeams,
  getRankedPlayers,
  getRankedTeams,
} from "../lib/pubg-rankings";

function assertSequentialRanks(label: string, ranks: number[]) {
  ranks.forEach((rank, index) => {
    assert.equal(rank, index + 1, `${label} rank sequence broke at position ${index + 1}`);
  });
}

function assertSortedTeams<T extends Parameters<typeof comparePubgTeams>[0]>(teams: T[]) {
  for (let index = 1; index < teams.length; index += 1) {
    const previous = teams[index - 1];
    const current = teams[index];
    assert.ok(comparePubgTeams(previous, current) <= 0, `Team order drifted between ${previous.name} and ${current.name}`);
    assert.ok(
      !(previous.totalPoints < current.totalPoints),
      `Lower-point team ranked above higher-point team: ${previous.name} (${previous.totalPoints}) < ${current.name} (${current.totalPoints})`,
    );
  }
}

function assertSortedPlayers<T extends Parameters<typeof comparePubgPlayers>[0]>(players: T[]) {
  for (let index = 1; index < players.length; index += 1) {
    const previous = players[index - 1];
    const current = players[index];
    assert.ok(comparePubgPlayers(previous, current) <= 0, `Player order drifted between ${previous.pubgName} and ${current.pubgName}`);
  }
}

function assertDeterministicRankingFixtures() {
  const rankedTeams = getRankedTeams([
    { id: "team-c", name: "Charlie", totalPoints: 40, kills: 20, wins: 1, placementPoints: 20, avgPlacement: 4 },
    { id: "team-a", name: "Alpha", totalPoints: 60, kills: 15, wins: 2, placementPoints: 30, avgPlacement: 3 },
    { id: "team-b", name: "Bravo", totalPoints: 60, kills: 18, wins: 1, placementPoints: 35, avgPlacement: 2 },
  ]);
  assert.deepEqual(
    rankedTeams.map((team) => team.id),
    ["team-b", "team-a", "team-c"],
  );

  const rankedPlayers = getRankedPlayers([
    { id: "player-c", pubgName: "Charlie", kills: 8, damage: 1_500, knocks: 5, assists: 3, avgKills: 2 },
    { id: "player-a", pubgName: "Alpha", kills: 12, damage: 1_900, knocks: 7, assists: 4, avgKills: 3 },
    { id: "player-b", pubgName: "Bravo", kills: 12, damage: 2_100, knocks: 6, assists: 2, avgKills: 3 },
  ]);
  assert.deepEqual(
    rankedPlayers.map((player) => player.id),
    ["player-b", "player-a", "player-c"],
  );
}

async function main() {
  assertDeterministicRankingFixtures();
  const [dataset, dashboard] = await Promise.all([getPubgHubDataset(), getPubgDashboardData()]);
  const teamLookup = new Map(dataset.teams.map((team) => [team.id, team] as const));
  const playerLookup = new Map(dataset.players.map((player) => [player.id, player] as const));

  const rankedTeams = getRankedTeams(dataset.teams);
  const rankedPlayers = getRankedPlayers(dataset.players);
  const trackedRankedTeams = rankedTeams.filter((team) => team.statsTracked);
  const trackedRankedPlayers = rankedPlayers.filter((player) => player.statsTracked);
  const teamBoard = buildPubgTeamBoardRows(dataset.matches, teamLookup);
  const matchPlayerBoard = buildPubgPlayerBoardRows(dataset.matches, playerLookup);
  const playerBoard = matchPlayerBoard.length > 0 ? matchPlayerBoard : buildPubgAggregatePlayerBoardRows(dataset.players);

  assert.deepEqual(
    dataset.teams.map((team) => team.id),
    rankedTeams.map((team) => team.id),
    "Dataset team order no longer matches the shared team ranking helper",
  );
  assert.deepEqual(
    dataset.players.map((player) => player.id),
    rankedPlayers.map((player) => player.id),
    "Dataset player order no longer matches the shared player ranking helper",
  );

  assert.deepEqual(
    trackedRankedTeams.slice(0, 5).map((team) => team.id),
    teamBoard.slice(0, 5).map((row) => row.teamId),
    "Homepage and full leaderboard team top 5 are out of sync",
  );
  assert.deepEqual(
    trackedRankedTeams.slice(0, 4).map((team) => team.id),
    teamBoard.slice(0, 4).map((row) => row.teamId),
    "Top Teams cards no longer match the full leaderboard top 4",
  );
  assert.deepEqual(
    dashboard.topTeams.map((team) => team.id),
    trackedRankedTeams.slice(0, 6).map((team) => team.id),
    "PUBG hub top teams no longer match the official leaderboard top 6",
  );
  assert.deepEqual(
    dashboard.topTeams.slice(0, 4).map((team) => team.id),
    trackedRankedTeams.slice(0, 4).map((team) => team.id),
    "PUBG hub top team cards no longer match the full leaderboard top 4",
  );
  assert.deepEqual(
    dashboard.topTeams.slice(0, 3).map((team) => team.id),
    trackedRankedTeams.slice(0, 3).map((team) => team.id),
    "PUBG hub sidebar standings no longer match the full leaderboard top 3",
  );
  assert.deepEqual(
    trackedRankedPlayers.slice(0, 4).map((player) => player.id),
    playerBoard.slice(0, 4).map((row) => row.playerId),
    "Top player cards no longer match the full player leaderboard top 4",
  );
  assert.deepEqual(
    dashboard.topPlayers.map((player) => player.id),
    trackedRankedPlayers.slice(0, 6).map((player) => player.id),
    "PUBG hub player preview no longer matches the full player leaderboard top 6",
  );

  assertSequentialRanks(
    "Team board",
    teamBoard.map((row) => row.rank),
  );
  assertSequentialRanks(
    "Player board",
    playerBoard.map((row) => row.rank),
  );
  assertSortedTeams(rankedTeams);
  assertSortedTeams(teamBoard);
  assertSortedPlayers(rankedPlayers);
  assertSortedPlayers(playerBoard);

  console.log("PUBG ranking QA passed");
}

main().catch((error) => {
  console.error("PUBG ranking QA failed");
  console.error(error);
  process.exitCode = 1;
});
