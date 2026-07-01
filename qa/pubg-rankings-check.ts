import assert from "node:assert/strict";
import { getPubgDashboardData, getPubgHubDataset } from "../lib/pubg-hub";
import { buildPubgPlayerBoardRows, buildPubgTeamBoardRows, comparePubgPlayers, comparePubgTeams, getRankedPlayers, getRankedTeams } from "../lib/pubg-rankings";

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
      `Lower-point team ranked above higher-point team: ${previous.name} (${previous.totalPoints}) < ${current.name} (${current.totalPoints})`
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

async function main() {
  const [dataset, dashboard] = await Promise.all([getPubgHubDataset(), getPubgDashboardData()]);
  const teamLookup = new Map(dataset.teams.map((team) => [team.id, team] as const));
  const playerLookup = new Map(dataset.players.map((player) => [player.id, player] as const));

  const rankedTeams = getRankedTeams(dataset.teams);
  const rankedPlayers = getRankedPlayers(dataset.players);
  const teamBoard = buildPubgTeamBoardRows(dataset.matches, teamLookup);
  const playerBoard = buildPubgPlayerBoardRows(dataset.matches, playerLookup);

  assert.deepEqual(
    dataset.teams.map((team) => team.id),
    rankedTeams.map((team) => team.id),
    "Dataset team order no longer matches the shared team ranking helper"
  );
  assert.deepEqual(
    dataset.players.map((player) => player.id),
    rankedPlayers.map((player) => player.id),
    "Dataset player order no longer matches the shared player ranking helper"
  );

  assert.deepEqual(
    rankedTeams.slice(0, 5).map((team) => team.id),
    teamBoard.slice(0, 5).map((row) => row.teamId),
    "Homepage and full leaderboard team top 5 are out of sync"
  );
  assert.deepEqual(
    rankedTeams.slice(0, 4).map((team) => team.id),
    teamBoard.slice(0, 4).map((row) => row.teamId),
    "Top Teams cards no longer match the full leaderboard top 4"
  );
  assert.deepEqual(
    dashboard.topTeams.map((team) => team.id),
    rankedTeams.slice(0, 6).map((team) => team.id),
    "PUBG hub top teams no longer match the official leaderboard top 6"
  );
  assert.deepEqual(
    dashboard.topTeams.slice(0, 4).map((team) => team.id),
    rankedTeams.slice(0, 4).map((team) => team.id),
    "PUBG hub top team cards no longer match the full leaderboard top 4"
  );
  assert.deepEqual(
    dashboard.topTeams.slice(0, 3).map((team) => team.id),
    rankedTeams.slice(0, 3).map((team) => team.id),
    "PUBG hub sidebar standings no longer match the full leaderboard top 3"
  );
  assert.deepEqual(
    rankedPlayers.slice(0, 4).map((player) => player.id),
    playerBoard.slice(0, 4).map((row) => row.playerId),
    "Top player cards no longer match the full player leaderboard top 4"
  );
  assert.deepEqual(
    dashboard.topPlayers.map((player) => player.id),
    rankedPlayers.slice(0, 6).map((player) => player.id),
    "PUBG hub player preview no longer matches the full player leaderboard top 6"
  );

  assertSequentialRanks("Team board", teamBoard.map((row) => row.rank));
  assertSequentialRanks("Player board", playerBoard.map((row) => row.rank));
  assertSortedTeams(rankedTeams);
  assertSortedTeams(teamBoard);
  assertSortedPlayers(rankedPlayers);
  assertSortedPlayers(playerBoard);

  console.log("PUBG ranking QA passed");
  console.log(`Top 5 teams: ${teamBoard.slice(0, 5).map((row) => `#${row.rank} ${row.name} (${row.totalPoints})`).join(" | ")}`);
  console.log(`Top 5 players: ${playerBoard.slice(0, 5).map((row) => `#${row.rank} ${row.pubgName} (${row.kills} kills)`).join(" | ")}`);
}

main().catch((error) => {
  console.error("PUBG ranking QA failed");
  console.error(error);
  process.exitCode = 1;
});
