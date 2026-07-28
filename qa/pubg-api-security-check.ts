import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  isTrustedPubgTelemetryUrl,
  isPubgNotFoundError,
  normalizePubgMatchId,
  normalizePubgPlayerName,
  toPublicPubgMatchSummary,
  toPublicPubgPlayer,
} from "../lib/pubg-public";
import { validateSameOriginRequest } from "../lib/request-origin";

const matchId = "2ef1a48f-4cbd-4d20-8e34-24dabf028839";
const accountId = "account.123456789";
const telemetryUrl = "https://telemetry-cdn.pubg.com/bluehole-pubg/example";

const playerDocument = {
  data: [
    {
      id: accountId,
      type: "player",
      attributes: {
        name: "BravoPlayer",
        shardId: "steam",
      },
      relationships: {
        matches: {
          data: [{ id: matchId }],
        },
      },
    },
  ],
};

const matchDocument = {
  data: {
    id: matchId,
    type: "match",
    attributes: {
      mapName: "Baltic_Main",
      gameMode: "squad",
      createdAt: "2026-07-29T12:00:00.000Z",
      duration: 1_800,
    },
  },
  included: [
    {
      id: accountId,
      type: "participant",
      attributes: { name: "BravoPlayer" },
    },
    {
      id: "asset-1",
      type: "asset",
      attributes: { URL: telemetryUrl },
    },
  ],
};

assert.deepEqual(toPublicPubgPlayer(playerDocument), { name: "BravoPlayer" });
assert.deepEqual(toPublicPubgMatchSummary(matchDocument, matchId), {
  id: matchId,
  mapName: "Baltic_Main",
  gameMode: "squad",
  createdAt: "2026-07-29T12:00:00.000Z",
  duration: 1_800,
});

const publicPayload = JSON.stringify({
  player: toPublicPubgPlayer(playerDocument),
  summary: toPublicPubgMatchSummary(matchDocument, matchId),
});
assert.doesNotMatch(publicPayload, /account\.|telemetry|relationships|included|shardId|recentMatches|raw/i);
assert.equal(normalizePubgPlayerName(" BravoPlayer "), "BravoPlayer");
assert.equal(normalizePubgPlayerName("one,two"), null);
assert.equal(normalizePubgPlayerName("bad\u0000name"), null);
assert.equal(normalizePubgMatchId(matchId), matchId);
assert.equal(normalizePubgMatchId("../private"), null);
assert.equal(isTrustedPubgTelemetryUrl(telemetryUrl), true);
assert.equal(isTrustedPubgTelemetryUrl("https://attacker.invalid/telemetry"), false);
assert.equal(isTrustedPubgTelemetryUrl("http://telemetry-cdn.pubg.com/example"), false);
assert.equal(isPubgNotFoundError(new Error("PUBG API error 404: provider details")), true);
assert.equal(isPubgNotFoundError(new Error("PUBG API error 500: provider details")), false);

const sameOriginGet = new Request("https://bravo.example/api/pubg/telemetry", {
  headers: { "sec-fetch-site": "same-origin" },
});
const crossOriginGet = new Request("https://bravo.example/api/pubg/telemetry", {
  headers: {
    origin: "https://attacker.invalid",
    "sec-fetch-site": "cross-site",
  },
});
const headerlessGet = new Request("https://bravo.example/api/pubg/telemetry");
assert.equal(validateSameOriginRequest(sameOriginGet, { includeSafeMethods: true }), null);
assert.equal(validateSameOriginRequest(crossOriginGet, { includeSafeMethods: true }), "A same-origin request is required.");
assert.equal(validateSameOriginRequest(headerlessGet, { includeSafeMethods: true }), "A same-origin request is required.");
assert.equal(validateSameOriginRequest(headerlessGet), null);

async function main() {
  const playerRoute = await readFile(new URL("../app/api/pubg/players/route.ts", import.meta.url), "utf8");
  assert.match(playerRoute, /toPublicPubgPlayer/);
  assert.match(playerRoute, /enforceRateLimit/);
  assert.doesNotMatch(playerRoute, /NextResponse\.json\(data\)|error instanceof Error \? error\.message/);

  const matchRoute = await readFile(new URL("../app/api/pubg/matches/[matchId]/route.ts", import.meta.url), "utf8");
  assert.match(matchRoute, /toPublicPubgMatchSummary/);
  assert.match(matchRoute, /enforceRateLimit/);
  assert.doesNotMatch(matchRoute, /summarizeMatch|raw:\s*data|error instanceof Error \? error\.message/);

  for (const relativePath of ["../app/api/pubg/telemetry/route.ts", "../app/api/pubg/sync-player/route.ts"]) {
    const operationalRoute = await readFile(new URL(relativePath, import.meta.url), "utf8");
    assert.match(operationalRoute, /requirePlatformAdmin/);
    assert.match(operationalRoute, /requireSameOrigin\(req, \{ includeSafeMethods: true \}\)/);
    assert.match(operationalRoute, /private, no-store, max-age=0/);
    assert.match(operationalRoute, /enforceRateLimit/);
  }

  console.log("Offline PUBG API exposure, authorization, and response-projection QA passed.");
}

void main();
