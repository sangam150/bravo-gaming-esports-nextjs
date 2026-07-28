import assert from "node:assert/strict";
import { buildEventTeamDamageTotals, isPublicPubgMatchStatus } from "../lib/pubg-hub";
import { getCanonicalPublicEventHref } from "../lib/public-links";
import { resolvePublicEventPolicy } from "../lib/public-event-policy";

const eventSlug = "pubg-mahasangram-53821";
const publicationTime = Date.parse("2026-07-28T12:00:00.000Z");

const policy = resolvePublicEventPolicy(
  {
    status: "completed",
    published: true,
    startDate: "2026-07-01T12:00:00.000Z",
    endDate: "2026-07-03T12:00:00.000Z",
    registrationOpen: false,
  },
  publicationTime,
);

assert.equal(policy.lifecycle, "completed");
assert.equal(policy.published, true);
assert.equal(policy.registrationOpen, false);
assert.equal(getCanonicalPublicEventHref({ gameSlug: "pubg-pc", slug: eventSlug }), `/pubg/events/${eventSlug}`);

assert.equal(isPublicPubgMatchStatus("published"), true);
assert.equal(isPublicPubgMatchStatus("approved"), true);
assert.equal(isPublicPubgMatchStatus("completed"), true);
assert.equal(isPublicPubgMatchStatus("draft"), false);
assert.equal(isPublicPubgMatchStatus("rejected"), false);
assert.equal(isPublicPubgMatchStatus("deleted"), false);

const damageTotals = buildEventTeamDamageTotals([
  { playerId: "m8-player-1", teamId: "M8", damage: 8_000 },
  { playerId: "m8-player-2", teamId: "M8", damage: 7_000 },
  { playerId: "m8-player-3", teamId: "M8", damage: 5_000 },
  { playerId: "m8-player-4", teamId: "M8", damage: 3_071 },
  { playerId: "m8-player-4", teamId: "M8", damage: 3_000 },
  { playerId: "haku-player-1", teamId: "Team HAKU", damage: 9_000 },
  { playerId: "haku-player-2", teamId: "Team HAKU", damage: 8_536 },
]);

assert.equal(damageTotals.get("M8"), 23_071);
assert.equal(damageTotals.get("Team HAKU"), 17_536);

console.log("Offline Mahasangram publication policy QA passed.");
