import {
  COLLECTIONS,
  fetchDocumentCollection,
  getDocument,
  isDocumentStoreConfigured,
  saveDocument,
} from "./document-store";
import { filterSoftDeleted, isSoftDeletedRecord, softDeleteDocumentEntity } from "./document-entities";
import { compareMatchSequenceOrder } from "./ranking-sort";
import type { MatchPlayerResult, TeamMatchResult, TournamentMatch } from "./types";

function cleanString(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function cleanStringArray(values?: string[] | string | null) {
  const normalizedValues = Array.isArray(values)
    ? values
    : typeof values === "string"
      ? values.split(/[\n,]+/g)
      : [];

  return Array.from(new Set(normalizedValues.map((value) => value.trim()).filter(Boolean)));
}

function toFiniteNumber(value: unknown, fallback = 0) {
  const numericValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
}

function normalizeTeamResults(teamResults?: TeamMatchResult[] | null) {
  return (teamResults ?? [])
    .map((teamResult) => ({
      teamId: cleanString(teamResult.teamId),
      teamName: teamResult.teamName.trim(),
      slotNumber: Number.isFinite(teamResult.slotNumber) ? Number(teamResult.slotNumber) : undefined,
      placement: toFiniteNumber(teamResult.placement),
      kills: toFiniteNumber(teamResult.kills),
      damage: toFiniteNumber(teamResult.damage),
      placementPoints: toFiniteNumber(teamResult.placementPoints),
      killPoints: toFiniteNumber(teamResult.killPoints, toFiniteNumber(teamResult.kills)),
      totalPoints:
        Number.isFinite(teamResult.totalPoints)
          ? Number(teamResult.totalPoints)
          : toFiniteNumber(teamResult.placementPoints) + toFiniteNumber(teamResult.killPoints, toFiniteNumber(teamResult.kills)),
    }))
    .sort((firstResult, secondResult) => firstResult.placement - secondResult.placement || secondResult.totalPoints - firstResult.totalPoints);
}

function normalizePlayerResults(playerResults?: MatchPlayerResult[] | null) {
  return (playerResults ?? [])
    .filter((playerResult) => cleanString(playerResult.playerName))
    .map((playerResult) => ({
      playerId: cleanString(playerResult.playerId) ?? cleanString(playerResult.pubgPlayerId) ?? `player-${playerResult.playerName}`,
      playerName: playerResult.playerName.trim(),
      pubgPlayerId: cleanString(playerResult.pubgPlayerId),
      teamId: cleanString(playerResult.teamId),
      teamName: playerResult.teamName.trim(),
      slotNumber: Number.isFinite(playerResult.slotNumber) ? Number(playerResult.slotNumber) : undefined,
      placement: toFiniteNumber(playerResult.placement),
      kills: toFiniteNumber(playerResult.kills),
      assists: toFiniteNumber(playerResult.assists),
      knocks: toFiniteNumber(playerResult.knocks),
      damage: toFiniteNumber(playerResult.damage),
      survivalTime: toFiniteNumber(playerResult.survivalTime),
      placementPoints: toFiniteNumber(playerResult.placementPoints),
      totalPoints:
        Number.isFinite(playerResult.totalPoints)
          ? Number(playerResult.totalPoints)
          : toFiniteNumber(playerResult.kills) + toFiniteNumber(playerResult.assists) + toFiniteNumber(playerResult.knocks),
    }))
    .sort(
      (firstResult, secondResult) =>
        secondResult.totalPoints - firstResult.totalPoints ||
        secondResult.kills - firstResult.kills ||
        secondResult.damage - firstResult.damage
    );
}

function normalizeStoredMatch(match: TournamentMatch) {
  return {
    ...match,
    status: match.status === "draft" ? "draft" : "published",
    matchNumber: match.matchNumber ?? match.sequenceNumber,
    sequenceNumber: match.sequenceNumber ?? match.matchNumber,
    vodUrl: cleanString(match.vodUrl ?? match.sourceUrl),
    resultScreenshotUrl: cleanString(match.resultScreenshotUrl),
    scoreboardImageUrl: cleanString(match.scoreboardImageUrl),
    resultImageUrl: cleanString(match.resultImageUrl ?? match.resultScreenshotUrl),
    screenshotUrls: cleanStringArray(match.screenshotUrls),
    pointSystemId: cleanString(match.pointSystemId),
    pointSystemName: cleanString(match.pointSystemName),
    teamResults: normalizeTeamResults(match.teamResults),
    playerResults: normalizePlayerResults(match.playerResults),
  } satisfies TournamentMatch;
}

function normalizeAdminMatchPayload(input: Partial<TournamentMatch> & { pubgMatchId: string; map: string }) {
  const now = new Date().toISOString();
  const teamResults = normalizeTeamResults(input.teamResults);
  const playerResults = normalizePlayerResults(input.playerResults);
  const winner =
    teamResults.find((teamResult) => teamResult.placement === 1)?.teamName ??
    teamResults[0]?.teamName ??
    cleanString(input.winner) ??
    "Winner Pending";
  const topTeam = teamResults[0];
  const matchNumber =
    typeof input.matchNumber === "number"
      ? input.matchNumber
      : typeof input.sequenceNumber === "number"
        ? input.sequenceNumber
        : 1;
  const status = input.status === "draft" ? "draft" : "published";

  return normalizeStoredMatch({
    id: cleanString(input.id) ?? input.pubgMatchId.trim(),
    tournamentId: cleanString(input.tournamentId),
    scrimId: cleanString(input.scrimId),
    pubgMatchId: input.pubgMatchId.trim(),
    externalMatchId: cleanString(input.externalMatchId),
    sequenceNumber: matchNumber,
    matchNumber,
    map: input.map.trim(),
    eventName: cleanString(input.eventName),
    eventSlug: cleanString(input.eventSlug),
    status,
    winner,
    points: topTeam?.totalPoints ?? toFiniteNumber(input.points),
    knockouts: teamResults.reduce((sum, teamResult) => sum + teamResult.kills, 0),
    placementPoints: topTeam?.placementPoints ?? toFiniteNumber(input.placementPoints),
    killPoints: topTeam?.killPoints ?? toFiniteNumber(input.killPoints),
    playedAt: cleanString(input.playedAt) ?? now,
    vodUrl: cleanString(input.vodUrl),
    resultScreenshotUrl: cleanString(input.resultScreenshotUrl),
    scoreboardImageUrl: cleanString(input.scoreboardImageUrl),
    resultImageUrl: cleanString(input.resultImageUrl ?? input.resultScreenshotUrl),
    screenshotUrls: cleanStringArray(input.screenshotUrls),
    sourceUrl: cleanString(input.sourceUrl),
    dataSource: input.dataSource ?? "manual_correction",
    syncedAt: cleanString(input.syncedAt) ?? now,
    publishedAt: status === "published" ? cleanString(input.publishedAt) ?? now : undefined,
    deletedAt: cleanString(input.deletedAt),
    pointSystemId: cleanString(input.pointSystemId),
    pointSystemName: cleanString(input.pointSystemName),
    teamResults,
    playerResults,
  });
}

export async function listAdminMatches(limit = 150) {
  if (!isDocumentStoreConfigured()) {
    return [];
  }

  try {
    const [matchResults, matches, tournamentMatches] = await Promise.all([
      fetchDocumentCollection<TournamentMatch>(COLLECTIONS.matchResults, limit),
      fetchDocumentCollection<TournamentMatch>(COLLECTIONS.matches, limit).catch(() => []),
      fetchDocumentCollection<TournamentMatch>(COLLECTIONS.tournamentMatches, limit).catch(() => []),
    ]);

    const uniqueMatches = new Map<string, TournamentMatch>();
    for (const match of [...matches, ...tournamentMatches, ...matchResults]) {
      uniqueMatches.set(match.id, normalizeStoredMatch(match));
    }

    return filterSoftDeleted(Array.from(uniqueMatches.values())).sort((firstMatch, secondMatch) =>
      compareMatchSequenceOrder(firstMatch, secondMatch)
    );
  } catch {
    return [];
  }
}

export async function getAdminMatch(id: string) {
  const storedMatch =
    (await getDocument<TournamentMatch>(COLLECTIONS.matchResults, id)) ??
    (await getDocument<TournamentMatch>(COLLECTIONS.matches, id)) ??
    (await getDocument<TournamentMatch>(COLLECTIONS.tournamentMatches, id));

  if (!storedMatch || isSoftDeletedRecord(storedMatch)) {
    return null;
  }

  return normalizeStoredMatch(storedMatch);
}

export async function saveAdminMatch(input: Partial<TournamentMatch> & { pubgMatchId: string; map: string }) {
  const payload = normalizeAdminMatchPayload(input);
  const now = new Date().toISOString();
  const nextPayload = {
    ...payload,
    deletedAt: undefined,
    updatedAt: now,
    createdAt: payload.createdAt ?? now,
  };

  if (isDocumentStoreConfigured()) {
    await Promise.all([
      saveDocument(COLLECTIONS.matchResults, nextPayload.id, nextPayload as unknown as Record<string, unknown>),
      saveDocument(COLLECTIONS.matches, nextPayload.id, nextPayload as unknown as Record<string, unknown>),
      saveDocument(COLLECTIONS.tournamentMatches, nextPayload.id, nextPayload as unknown as Record<string, unknown>),
    ]);
  }

  return nextPayload;
}

export async function saveAdminMatches(
  matches: Array<Partial<TournamentMatch> & { pubgMatchId: string; map: string }>
) {
  const savedMatches: TournamentMatch[] = [];

  for (const match of matches) {
    savedMatches.push(await saveAdminMatch(match));
  }

  return savedMatches;
}

export async function deleteAdminMatch(id: string) {
  if (isDocumentStoreConfigured()) {
    await Promise.all([
      softDeleteDocumentEntity(COLLECTIONS.matchResults, id).catch(() => null),
      softDeleteDocumentEntity(COLLECTIONS.matches, id).catch(() => null),
      softDeleteDocumentEntity(COLLECTIONS.tournamentMatches, id).catch(() => null),
    ]);
  }

  return { id, deleted: true };
}
