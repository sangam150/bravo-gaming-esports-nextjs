import assert from "node:assert/strict";
import { getPlatformHubData } from "../../lib/platform-hub";
import { getPubgHubDataset, getPubgPlayerById, getPubgTeamById } from "../../lib/pubg-hub";

async function main() {
  const canonicalSlug = "pubg-mahasangram-53821";
  const [hub, pubg] = await Promise.all([getPlatformHubData(), getPubgHubDataset()]);
  const event = hub.events.find((value) => value.slug === canonicalSlug);
  const pubgEvent = pubg.events.find((value) => value.slug === canonicalSlug);

  assert.ok(event, "Canonical Mahasangram event is missing from the platform event collection.");
  assert.ok(pubgEvent, "Canonical Mahasangram event is missing from the PUBG event collection.");
  assert.equal(pubgEvent.teamCount, 19, "All 19 source leaderboard teams must remain published.");
  assert.equal(pubgEvent.playerTable.length, 91, "All 91 aggregate source player rows must remain published.");
  assert.equal(pubgEvent.matchCount, 12, "All 12 imported matches must remain published.");
  assert.equal(pubgEvent.standings[0]?.teamName, "M8");
  assert.equal(pubgEvent.standings[1]?.teamName, "Team HAKU");
  assert.match(pubgEvent.standings[2]?.teamName ?? "", /Near Edge Protocol|N3P/i);
  assert.equal(pubgEvent.playerTable[0]?.pubgName, "TommyVercettio_o");
  assert.equal(pubgEvent.playerTable[0]?.kills, 53);
  assert.ok(
    pubgEvent.matches.every((match) => match.playerResults.length === 0 && match.totalDamage === null),
    "Unavailable per-match player damage must remain null instead of being presented as zero.",
  );

  const [topTeamProfile, topPlayerProfile] = await Promise.all([
    getPubgTeamById(pubg.teams[0].slug),
    getPubgPlayerById(pubg.players[0].slug),
  ]);
  assert.ok(topTeamProfile, "Published team profile lookup failed.");
  assert.ok(topPlayerProfile, "Published player profile lookup failed.");

  console.log("Mahasangram publication QA passed.");
}

void main();
