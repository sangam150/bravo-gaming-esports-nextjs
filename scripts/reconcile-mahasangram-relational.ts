import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { Client, type QueryResultRow } from "pg";

const TOURNAMENT_ID = "pubg-mahasangram-53821";
const PLACEHOLDER_EVENT_ID = "d142f95d-ca76-4cf7-b602-b6559b293e2c";
const EXPECTED_PROJECT_REF = "hldppfhtkfgthainismr";
const EXPECTED_TEAM_COUNT = 19;
const EXPECTED_PLAYER_COUNT = 91;
const EXPECTED_MATCH_COUNT = 12;
const SUPABASE_ROOT_CA = readFileSync(new URL("../config/certs/supabase-prod-ca-2021.crt", import.meta.url), "utf8");
const TOURNAMENT_APPROVAL_OVERLAY_KEYS = [
  "lifecycleStatus",
  "ownerApprovedAt",
  "publicationStatus",
  "published",
  "reviewNote",
  "reviewStatus",
  "slug",
] as const;
const TOURNAMENT_APPROVAL_OVERLAY_KEY_SET = new Set<string>(TOURNAMENT_APPROVAL_OVERLAY_KEYS);

type JsonObject = Record<string, unknown>;

type DocumentRow = QueryResultRow & {
  id: string;
  data: unknown;
  updated_at: string;
};

type SourceTournament = {
  id: string;
  title: string;
  status: string;
  published: boolean;
  startDate: string;
  endDate?: string;
  tier?: string;
  prizePool?: string;
  maxTeams: number;
  format: string;
  mode: string;
  server: string;
  perspective?: string;
  description?: string;
  rules?: string;
  bannerUrl?: string;
  sourceUrl?: string;
  sourceProvider: string;
  sourceId: string;
  updatedAt: string;
};

type SourceTeam = {
  id: string;
  name: string;
  slotNumber?: number;
};

type SourcePlayer = {
  id: string;
  name: string;
  teamId: string;
  matches: number;
  kills: number;
  assists: number;
  knocks: number;
  damage: number;
  placementPoints: number;
  totalPoints: number;
  bestPlacement?: number;
  sourceRank?: number;
  sourceProvider: string;
  updatedAt: string;
};

type SourceTeamResult = {
  teamId: string;
  teamName: string;
  slotNumber?: number;
  placement: number;
  kills: number;
  placementPoints: number;
  killPoints: number;
  totalPoints: number;
};

type SourceMatch = {
  id: string;
  pubgMatchId: string;
  externalMatchId?: string;
  matchNumber: number;
  map: string;
  playedAt: string;
  sourceUrl?: string;
  publishedAt: string;
  data: JsonObject;
  teamResults: SourceTeamResult[];
};

type CanonicalTeamRow = QueryResultRow & {
  id: string;
  name: string;
  slug: string | null;
  slot_number: number | null;
};

type CanonicalTeamLinkRow = CanonicalTeamRow & {
  historical_name: string | null;
  source_identifier: string;
};

type EventRow = QueryResultRow & {
  id: string;
  name: string | null;
  title: string;
  slug: string | null;
  season_id: string | null;
  published: boolean;
  published_at: string | null;
};

function isRecord(value: unknown): value is JsonObject {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function requiredText(value: unknown, field: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Verified source field ${field} is missing.`);
  }
  return value.trim();
}

function optionalText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function requiredTimestamp(value: unknown, field: string) {
  const timestamp = value instanceof Date ? value.toISOString() : requiredText(value, field);
  if (!Number.isFinite(Date.parse(timestamp))) {
    throw new Error(`Verified source field ${field} is not a valid timestamp.`);
  }
  return timestamp;
}

function finiteNumber(value: unknown, field: string) {
  const numericValue = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numericValue)) {
    throw new Error(`Verified source field ${field} is not numeric.`);
  }
  return numericValue;
}

function optionalPositiveInteger(value: unknown, field: string) {
  if (value === undefined || value === null || value === "") return undefined;
  return positiveInteger(value, field);
}

function nonNegativeNumber(value: unknown, field: string) {
  const numericValue = finiteNumber(value, field);
  if (numericValue < 0) {
    throw new Error(`Verified source field ${field} must be non-negative.`);
  }
  return numericValue;
}

function nonNegativeInteger(value: unknown, field: string) {
  const numericValue = finiteNumber(value, field);
  if (!Number.isInteger(numericValue) || numericValue < 0) {
    throw new Error(`Verified source field ${field} must be a non-negative integer.`);
  }
  return numericValue;
}

function positiveInteger(value: unknown, field: string) {
  const numericValue = nonNegativeInteger(value, field);
  if (numericValue < 1) {
    throw new Error(`Verified source field ${field} must be positive.`);
  }
  return numericValue;
}

function slugify(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "record"
  );
}

function requireUnique<T>(values: readonly T[], selector: (value: T) => string, label: string) {
  const seen = new Set<string>();
  for (const value of values) {
    const key = selector(value).trim().toLowerCase();
    if (!key || seen.has(key)) {
      throw new Error(`Verified source contains a missing or duplicate ${label}: ${key || "(empty)"}.`);
    }
    seen.add(key);
  }
}

function stripUpdatedAt(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripUpdatedAt);
  if (!isRecord(value)) return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => key !== "updatedAt")
      .sort(([firstKey], [secondKey]) => firstKey.localeCompare(secondKey))
      .map(([key, entry]) => [key, stripUpdatedAt(entry)]),
  );
}

function stripTournamentApprovalOverlay(value: unknown) {
  const normalizedValue = stripUpdatedAt(value);
  if (!isRecord(normalizedValue)) return normalizedValue;
  return Object.fromEntries(
    Object.entries(normalizedValue)
      .filter(([key]) => !TOURNAMENT_APPROVAL_OVERLAY_KEY_SET.has(key))
      .sort(([firstKey], [secondKey]) => firstKey.localeCompare(secondKey))
      .map(([key, entry]) => [key, key === "title" && typeof entry === "string" ? entry.trim().replace(/\s+/g, " ") : entry]),
  );
}

function materialSignature(values: readonly DocumentRow[], normalize: (value: unknown) => unknown = stripUpdatedAt) {
  return JSON.stringify(
    values.map((row) => ({ id: row.id, data: normalize(row.data) })).sort((first, second) => first.id.localeCompare(second.id)),
  );
}

function topLevelDifferenceKeys(currentValue: unknown, approvedValue: unknown, normalize: (value: unknown) => unknown = stripUpdatedAt) {
  const current = normalize(currentValue);
  const approved = normalize(approvedValue);
  if (!isRecord(current) || !isRecord(approved)) return ["(malformed)"];
  return Array.from(new Set([...Object.keys(current), ...Object.keys(approved)]))
    .filter((key) => JSON.stringify(current[key]) !== JSON.stringify(approved[key]))
    .sort();
}

function validateTournamentApprovalOverlay(currentRow: DocumentRow, auditRow: DocumentRow) {
  if (!isRecord(currentRow.data) || !isRecord(auditRow.data)) {
    throw new Error("The current or approved tournament document is malformed.");
  }

  const auditKeys = new Set(Object.keys(auditRow.data));
  const currentOnlyKeys = Object.keys(currentRow.data)
    .filter((key) => key !== "updatedAt" && !auditKeys.has(key))
    .sort();
  const expectedOverlayKeys = [...TOURNAMENT_APPROVAL_OVERLAY_KEYS].sort();
  if (JSON.stringify(currentOnlyKeys) !== JSON.stringify(expectedOverlayKeys)) {
    throw new Error(`The tournament approval overlay changed unexpectedly: ${currentOnlyKeys.join(", ") || "(empty)"}.`);
  }

  if (
    currentRow.data.published !== true ||
    requiredText(currentRow.data.slug, "tournament.slug") !== TOURNAMENT_ID ||
    requiredText(currentRow.data.lifecycleStatus, "tournament.lifecycleStatus").toLowerCase() !== "completed" ||
    requiredText(currentRow.data.publicationStatus, "tournament.publicationStatus").toLowerCase() !== "published" ||
    requiredText(currentRow.data.reviewStatus, "tournament.reviewStatus").toLowerCase() !== "approved"
  ) {
    throw new Error("The current tournament does not carry the exact approved publication state.");
  }

  // The retained owner approval timestamp is legacy metadata and is not valid
  // ISO input. Its presence, together with the published audit transition, is
  // approval evidence; the audit row's database timestamp is canonical.
  requiredText(currentRow.data.ownerApprovedAt, "tournament.ownerApprovedAt");
  requiredText(currentRow.data.reviewNote, "tournament.reviewNote");
}

function auditDocumentRow(value: unknown, label: string, updatedAt: string): DocumentRow {
  if (!isRecord(value)) throw new Error(`Approved audit ${label} is malformed.`);
  const id = requiredText(value.id, `audit.${label}.id`);
  return { id, data: value, updated_at: updatedAt };
}

function auditDocumentRows(value: unknown, label: string, updatedAt: string) {
  if (!Array.isArray(value)) throw new Error(`Approved audit ${label} collection is malformed.`);
  return value.map((entry, index) => auditDocumentRow(entry, `${label}.${index}`, updatedAt));
}

function parseTournament(row: DocumentRow, options: { publicationApproved?: boolean } = {}): SourceTournament {
  if (!isRecord(row.data)) throw new Error("The verified tournament document is malformed.");
  const data = row.data;
  if (!options.publicationApproved && data.published !== true) {
    throw new Error("The verified tournament document is not explicitly published.");
  }
  const status = requiredText(data.status, "tournament.status").toUpperCase();
  if (status !== "COMPLETED") throw new Error(`Expected a completed source tournament, received ${status}.`);

  return {
    id: row.id,
    title: requiredText(data.title, "tournament.title").replace(/\s+/g, " "),
    status,
    published: true,
    startDate: requiredTimestamp(data.startDate, "tournament.startDate"),
    endDate: data.endDate === undefined || data.endDate === null ? undefined : requiredTimestamp(data.endDate, "tournament.endDate"),
    tier: optionalText(data.tier),
    prizePool: optionalText(data.prizePool),
    maxTeams: positiveInteger(data.maxTeams, "tournament.maxTeams"),
    format: requiredText(data.format, "tournament.format"),
    mode: requiredText(data.mode, "tournament.mode"),
    server: requiredText(data.server, "tournament.server"),
    perspective: optionalText(data.perspective),
    description: optionalText(data.description),
    rules: optionalText(data.rules),
    bannerUrl: optionalText(data.bannerUrl),
    sourceUrl: optionalText(data.sourceUrl),
    sourceProvider: optionalText(data.sourceProvider) ?? "verified_legacy_import",
    sourceId: requiredText(data.sourceId, "tournament.sourceId"),
    updatedAt: requiredTimestamp(optionalText(data.updatedAt) ?? row.updated_at, "tournament.updatedAt"),
  };
}

function parseTeam(row: DocumentRow): SourceTeam {
  if (!isRecord(row.data)) throw new Error(`Team document ${row.id} is malformed.`);
  return {
    id: row.id,
    name: requiredText(row.data.name, `team.${row.id}.name`),
    slotNumber: optionalPositiveInteger(row.data.slotNumber, `team.${row.id}.slotNumber`),
  };
}

function parsePlayer(row: DocumentRow): SourcePlayer {
  if (!isRecord(row.data)) throw new Error(`Player document ${row.id} is malformed.`);
  const name = optionalText(row.data.pubgName) ?? optionalText(row.data.inGameName) ?? requiredText(row.data.name, `player.${row.id}.name`);
  return {
    id: row.id,
    name,
    teamId: requiredText(row.data.teamId, `player.${row.id}.teamId`),
    matches: positiveInteger(row.data.matches, `player.${row.id}.matches`),
    kills: nonNegativeInteger(row.data.kills, `player.${row.id}.kills`),
    assists: nonNegativeInteger(row.data.assists, `player.${row.id}.assists`),
    knocks: nonNegativeInteger(row.data.knocks, `player.${row.id}.knocks`),
    damage: nonNegativeNumber(row.data.damage, `player.${row.id}.damage`),
    placementPoints: finiteNumber(row.data.placementPoints, `player.${row.id}.placementPoints`),
    totalPoints: finiteNumber(row.data.totalPoints, `player.${row.id}.totalPoints`),
    bestPlacement: optionalPositiveInteger(row.data.bestPlacement, `player.${row.id}.bestPlacement`),
    sourceRank: optionalPositiveInteger(row.data.sourceRank, `player.${row.id}.sourceRank`),
    sourceProvider: optionalText(row.data.sourceProvider) ?? "verified_legacy_import",
    updatedAt: requiredTimestamp(optionalText(row.data.updatedAt) ?? row.updated_at, `player.${row.id}.updatedAt`),
  };
}

function parseTeamResult(value: unknown, matchId: string, index: number): SourceTeamResult {
  if (!isRecord(value)) throw new Error(`Match ${matchId} team result ${index + 1} is malformed.`);
  return {
    teamId: requiredText(value.teamId, `match.${matchId}.teamResults.${index}.teamId`),
    teamName: requiredText(value.teamName, `match.${matchId}.teamResults.${index}.teamName`),
    slotNumber: optionalPositiveInteger(value.slotNumber, `match.${matchId}.teamResults.${index}.slotNumber`),
    placement: positiveInteger(value.placement, `match.${matchId}.teamResults.${index}.placement`),
    kills: nonNegativeInteger(value.kills, `match.${matchId}.teamResults.${index}.kills`),
    placementPoints: finiteNumber(value.placementPoints, `match.${matchId}.teamResults.${index}.placementPoints`),
    killPoints: finiteNumber(value.killPoints, `match.${matchId}.teamResults.${index}.killPoints`),
    totalPoints: finiteNumber(value.totalPoints, `match.${matchId}.teamResults.${index}.totalPoints`),
  };
}

function parseMatch(row: DocumentRow): SourceMatch {
  if (!isRecord(row.data)) throw new Error(`Match document ${row.id} is malformed.`);
  if (requiredText(row.data.status, `match.${row.id}.status`).toLowerCase() !== "published") {
    throw new Error(`Match ${row.id} is not explicitly published.`);
  }
  if (!Array.isArray(row.data.teamResults) || row.data.teamResults.length !== EXPECTED_TEAM_COUNT) {
    throw new Error(`Match ${row.id} must contain all ${EXPECTED_TEAM_COUNT} verified team results.`);
  }
  const teamResults = row.data.teamResults.map((value, index) => parseTeamResult(value, row.id, index));
  requireUnique(teamResults, (result) => result.teamId, `team result in ${row.id}`);
  const placements = teamResults.map((result) => result.placement).sort((first, second) => first - second);
  const expectedPlacements = Array.from({ length: EXPECTED_TEAM_COUNT }, (_, index) => index + 1);
  if (JSON.stringify(placements) !== JSON.stringify(expectedPlacements)) {
    throw new Error(`Match ${row.id} does not contain one verified placement for each team.`);
  }

  return {
    id: row.id,
    pubgMatchId: requiredText(row.data.pubgMatchId, `match.${row.id}.pubgMatchId`),
    externalMatchId: optionalText(row.data.externalMatchId),
    matchNumber: positiveInteger(row.data.matchNumber, `match.${row.id}.matchNumber`),
    map: requiredText(row.data.map, `match.${row.id}.map`),
    playedAt: requiredTimestamp(row.data.playedAt, `match.${row.id}.playedAt`),
    sourceUrl: optionalText(row.data.sourceUrl),
    publishedAt: requiredTimestamp(row.data.publishedAt, `match.${row.id}.publishedAt`),
    data: row.data,
    teamResults,
  };
}

function databaseUrl() {
  const value = optionalText(process.env.DIRECT_URL) ?? optionalText(process.env.DATABASE_URL);
  if (!value) throw new Error("DIRECT_URL or DATABASE_URL is required.");

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("The configured database connection URL is invalid.");
  }
  if (!["postgres:", "postgresql:"].includes(parsed.protocol)) {
    throw new Error("The configured database connection URL must use PostgreSQL.");
  }
  const hostname = parsed.hostname.toLowerCase();
  let username: string;
  try {
    username = decodeURIComponent(parsed.username).toLowerCase();
  } catch {
    throw new Error("The configured database connection URL has an invalid username.");
  }
  const belongsToExpectedProject = hostname.split(".").includes(EXPECTED_PROJECT_REF) || username.split(".").includes(EXPECTED_PROJECT_REF);
  if (!belongsToExpectedProject) {
    throw new Error(`Database connection is not scoped to the approved Supabase project ${EXPECTED_PROJECT_REF}.`);
  }
  for (const parameter of ["sslmode", "sslcert", "sslkey", "sslrootcert"]) {
    parsed.searchParams.delete(parameter);
  }
  return parsed.toString();
}

async function fetchDocuments(client: Client, collection: string, sourceTournamentId?: string) {
  if (sourceTournamentId) {
    const result = await client.query<DocumentRow>(
      `select id, data, updated_at
       from public.app_documents
       where collection_name = $1
         and data->>'sourceTournamentId' = $2
       order by id`,
      [collection, sourceTournamentId],
    );
    return result.rows;
  }

  const result = await client.query<DocumentRow>(
    `select id, data, updated_at
     from public.app_documents
     where collection_name = $1
       and id = $2
     limit 1`,
    [collection, TOURNAMENT_ID],
  );
  return result.rows;
}

async function loadVerifiedSource(client: Client) {
  const tournamentRows = await fetchDocuments(client, "tournaments");
  const teamRows = await fetchDocuments(client, "teams", TOURNAMENT_ID);
  const playerRows = await fetchDocuments(client, "players", TOURNAMENT_ID);
  const matchRows = await client.query<DocumentRow>(
    `select id, data, updated_at
       from public.app_documents
       where collection_name = 'matches'
         and data->>'tournamentId' = $1
       order by id`,
    [TOURNAMENT_ID],
  );
  const duplicateMatchRows = await client.query<DocumentRow>(
    `select id, data, updated_at
       from public.app_documents
       where collection_name = 'tournamentMatches'
         and data->>'tournamentId' = $1
       order by id`,
    [TOURNAMENT_ID],
  );
  const approvedAuditRows = await client.query<DocumentRow>(
    `select id, data, updated_at
       from public.app_documents
       where collection_name = 'importAudits'
         and lower(coalesce(data->>'importStatus', '')) = 'published'
         and data->'normalizedImportJson'->'tournament'->>'publicId' = $1
       order by updated_at desc
       limit 1`,
    [TOURNAMENT_ID],
  );

  if (tournamentRows.length !== 1) throw new Error("Exactly one verified Mahasangram tournament document is required.");
  if (teamRows.length !== EXPECTED_TEAM_COUNT) throw new Error(`Expected ${EXPECTED_TEAM_COUNT} source teams, found ${teamRows.length}.`);
  if (playerRows.length !== EXPECTED_PLAYER_COUNT) {
    throw new Error(`Expected ${EXPECTED_PLAYER_COUNT} source players, found ${playerRows.length}.`);
  }
  if (matchRows.rows.length !== EXPECTED_MATCH_COUNT || duplicateMatchRows.rows.length !== EXPECTED_MATCH_COUNT) {
    throw new Error("The two verified match collections are incomplete.");
  }
  const primaryMatchIds = matchRows.rows.map((row) => row.id).sort();
  const duplicateMatchIds = duplicateMatchRows.rows.map((row) => row.id).sort();
  if (JSON.stringify(primaryMatchIds) !== JSON.stringify(duplicateMatchIds)) {
    throw new Error("The verified match collections disagree; reconciliation stopped.");
  }
  if (approvedAuditRows.rows.length !== 1 || !isRecord(approvedAuditRows.rows[0].data)) {
    throw new Error("No owner-approved import audit exists for the verified tournament snapshot.");
  }
  const approvedAudit = approvedAuditRows.rows[0];
  const approvedAuditData = approvedAudit.data;
  if (!isRecord(approvedAuditData)) throw new Error("The approved import audit payload is malformed.");
  const checksum = requiredText(approvedAuditData.checksum, "audit.checksum");
  const rawHtml = requiredText(approvedAuditData.rawHtml, "audit.rawHtml");
  if (!/^[a-f0-9]{64}$/i.test(checksum) || createHash("sha256").update(rawHtml).digest("hex") !== checksum) {
    throw new Error("The approved import audit checksum does not match its retained raw source.");
  }
  const normalizedImport = isRecord(approvedAuditData.normalizedImportJson) ? approvedAuditData.normalizedImportJson : null;
  if (!normalizedImport || requiredText(normalizedImport.checksum, "audit.normalizedImportJson.checksum") !== checksum) {
    throw new Error("The approved normalized snapshot checksum does not match its retained source audit.");
  }
  const auditCounts = normalizedImport && isRecord(normalizedImport.counts) ? normalizedImport.counts : null;
  if (
    !auditCounts ||
    finiteNumber(auditCounts.teams, "audit.counts.teams") !== EXPECTED_TEAM_COUNT ||
    finiteNumber(auditCounts.players, "audit.counts.players") !== EXPECTED_PLAYER_COUNT ||
    finiteNumber(auditCounts.matches, "audit.counts.matches") !== EXPECTED_MATCH_COUNT
  ) {
    throw new Error("The approved import audit counts do not match the verified source snapshot.");
  }

  const auditDocs = normalizedImport && isRecord(normalizedImport.docs) ? normalizedImport.docs : null;
  if (!auditDocs) throw new Error("The approved import audit does not contain normalized source documents.");
  const auditTournamentRow = auditDocumentRow(auditDocs.tournament, "tournament", approvedAudit.updated_at);
  const auditTeamRows = auditDocumentRows(auditDocs.teams, "teams", approvedAudit.updated_at);
  const auditPlayerRows = auditDocumentRows(auditDocs.players, "players", approvedAudit.updated_at);
  const auditMatchRows = auditDocumentRows(auditDocs.matches, "matches", approvedAudit.updated_at);
  if (
    auditTeamRows.length !== EXPECTED_TEAM_COUNT ||
    auditPlayerRows.length !== EXPECTED_PLAYER_COUNT ||
    auditMatchRows.length !== EXPECTED_MATCH_COUNT
  ) {
    throw new Error("The approved audit documents are incomplete.");
  }
  const signatureChecks = {
    tournament:
      materialSignature(tournamentRows, stripTournamentApprovalOverlay) ===
      materialSignature([auditTournamentRow], stripTournamentApprovalOverlay),
    teams: materialSignature(teamRows) === materialSignature(auditTeamRows),
    players: materialSignature(playerRows) === materialSignature(auditPlayerRows),
    matches: materialSignature(matchRows.rows) === materialSignature(auditMatchRows),
    duplicateMatches: materialSignature(duplicateMatchRows.rows) === materialSignature(matchRows.rows),
  };
  const driftedCollections = Object.entries(signatureChecks)
    .filter(([, matchesApprovedSnapshot]) => !matchesApprovedSnapshot)
    .map(([collection]) => collection);
  if (driftedCollections.length > 0) {
    const tournamentDifferenceKeys = signatureChecks.tournament
      ? []
      : topLevelDifferenceKeys(tournamentRows[0]?.data, auditTournamentRow.data, stripTournamentApprovalOverlay);
    const driftDetails = tournamentDifferenceKeys.length > 0 ? ` tournament fields: ${tournamentDifferenceKeys.join(", ")}.` : "";
    throw new Error(
      `Current compatibility documents materially differ from the approved import audit snapshot: ${driftedCollections.join(", ")}.${driftDetails}`,
    );
  }
  validateTournamentApprovalOverlay(tournamentRows[0], auditTournamentRow);

  const tournament = parseTournament(auditTournamentRow, { publicationApproved: true });
  const teams = auditTeamRows.map(parseTeam);
  const players = auditPlayerRows.map(parsePlayer);
  const matches = auditMatchRows.map(parseMatch).sort((first, second) => first.matchNumber - second.matchNumber);
  requireUnique(teams, (team) => team.id, "team ID");
  requireUnique(teams, (team) => team.name, "team name");
  requireUnique(players, (player) => player.id, "player ID");
  requireUnique(players, (player) => player.name, "player name");
  requireUnique(matches, (match) => String(match.matchNumber), "match number");
  requireUnique(matches, (match) => match.pubgMatchId, "PUBG match ID");

  if (tournament.maxTeams < teams.length) {
    throw new Error("The verified tournament capacity is smaller than its approved team field.");
  }
  if (tournament.endDate && Date.parse(tournament.endDate) < Date.parse(tournament.startDate)) {
    throw new Error("The verified tournament end date precedes its start date.");
  }

  const sourceTeamIds = new Set(teams.map((team) => team.id));
  for (const player of players) {
    if (!sourceTeamIds.has(player.teamId)) throw new Error(`Player ${player.id} references unknown team ${player.teamId}.`);
  }
  for (const match of matches) {
    for (const result of match.teamResults) {
      if (!sourceTeamIds.has(result.teamId)) throw new Error(`Match ${match.id} references unknown team ${result.teamId}.`);
    }
  }

  if (tournament.sourceId !== "53821") throw new Error("The approved tournament source identity is not 53821.");

  return {
    tournament,
    teams,
    players,
    matches,
    approvedAuditId: approvedAudit.id,
    auditChecksum: checksum,
    approvedAt: requiredTimestamp(approvedAudit.updated_at, "audit.updated_at"),
  };
}

async function loadCanonicalMapping(client: Client, sourceTeams: readonly SourceTeam[]) {
  const result = await client.query<CanonicalTeamLinkRow>(
    `select
       team_record.id,
       team_record.name,
       team_record.slug,
       team_record.slot_number,
       source_link.source_identifier,
       source_link.historical_name
     from public.team_source_links source_link
     join public.teams team_record on team_record.id = source_link.team_id
     where source_link.source_type = 'compatibility_team'
       and source_link.source_identifier = any($1::text[])
       and team_record.deleted_at is null
       and team_record.archived_at is null
       and team_record.merged_into_team_id is null
       and team_record.is_active
       and team_record.status = 'active'`,
    [sourceTeams.map((team) => team.id)],
  );
  const linkBySourceId = new Map(result.rows.map((row) => [row.source_identifier, row] as const));
  const mapping = new Map<string, CanonicalTeamRow>();
  for (const sourceTeam of sourceTeams) {
    const canonicalTeam = linkBySourceId.get(sourceTeam.id);
    if (!canonicalTeam) throw new Error(`No approved canonical source link exists for source team ${sourceTeam.name}.`);
    if (canonicalTeam.historical_name && canonicalTeam.historical_name.trim().toLowerCase() !== sourceTeam.name.trim().toLowerCase()) {
      throw new Error(`Approved historical team name mismatch for ${sourceTeam.id}.`);
    }
    mapping.set(sourceTeam.id, canonicalTeam);
  }
  if (new Set(Array.from(mapping.values()).map((team) => team.id)).size !== sourceTeams.length) {
    throw new Error("The source-to-canonical team mapping is not one-to-one.");
  }
  return mapping;
}

async function loadTargetEvent(client: Client) {
  const result = await client.query<EventRow>(
    `select id, name, title, slug, season_id, published, published_at
     from public.events
     where deleted_at is null
       and (
         id = $1
         or slug in ($2, 'pubg-mahasangram-2-0')
         or lower(coalesce(name, title)) like '%mahasangram%'
       )
     order by created_at
     for update`,
    [PLACEHOLDER_EVENT_ID, TOURNAMENT_ID],
  );
  if (result.rows.length !== 1) {
    throw new Error(`Expected one canonical Mahasangram event, found ${result.rows.length}.`);
  }
  return result.rows[0];
}

async function ensureNoConflicts(client: Client, event: EventRow, source: Awaited<ReturnType<typeof loadVerifiedSource>>) {
  const slugConflict = await client.query(`select id from public.events where slug = $1 and id <> $2 and deleted_at is null`, [
    TOURNAMENT_ID,
    event.id,
  ]);
  const currentMatches = await client.query<{ id: string; match_id: string; event_id: string | null } & QueryResultRow>(
    `select id, match_id, event_id from public.matches where event_id = $1 and deleted_at is null`,
    [event.id],
  );
  const currentStatistics = await client.query<{ source_player_id: string } & QueryResultRow>(
    `select source_player_id from public.event_player_statistics where event_id = $1`,
    [event.id],
  );
  const playerCandidates = await client.query<
    { id: string; pubg_name: string; slug: string | null; deleted_at: string | null } & QueryResultRow
  >(
    `select id, pubg_name, slug, deleted_at
       from public.players
       where lower(pubg_name) = any($1::text[])
          or slug = any($2::text[])`,
    [source.players.map((player) => player.name.toLowerCase()), source.players.map((player) => slugify(player.name))],
  );

  if (slugConflict.rowCount) throw new Error("The canonical event slug is already owned by another event.");
  const sourceMatchIds = new Set(source.matches.map((match) => match.pubgMatchId));
  if (currentMatches.rows.some((match) => !sourceMatchIds.has(match.match_id))) {
    throw new Error("The target event already contains a non-source match; reconciliation stopped.");
  }
  const sourcePlayerIds = new Set(source.players.map((player) => player.id));
  if (currentStatistics.rows.some((row) => !sourcePlayerIds.has(row.source_player_id))) {
    throw new Error("The target event already contains non-source aggregate player statistics.");
  }

  const candidatesBySourceId = new Map<string, Set<string>>();
  for (const candidate of playerCandidates.rows) {
    if (candidate.deleted_at) throw new Error(`A matching player record is soft-deleted: ${candidate.id}.`);
    for (const sourcePlayer of source.players) {
      const playerSlug = slugify(sourcePlayer.name);
      if (candidate.slug === playerSlug && candidate.pubg_name.trim().toLowerCase() !== sourcePlayer.name.toLowerCase()) {
        throw new Error(`Player slug ${playerSlug} is owned by a different PUBG name.`);
      }
      if (candidate.pubg_name.trim().toLowerCase() === sourcePlayer.name.toLowerCase() || candidate.slug === playerSlug) {
        const ids = candidatesBySourceId.get(sourcePlayer.id) ?? new Set<string>();
        ids.add(candidate.id);
        candidatesBySourceId.set(sourcePlayer.id, ids);
      }
    }
  }
  for (const [sourceId, ids] of candidatesBySourceId) {
    if (ids.size > 1) throw new Error(`Player ${sourceId} has ambiguous relational matches.`);
  }
}

async function ensureSeason(client: Client, tournament: SourceTournament) {
  const existing = await client.query<{ id: string } & QueryResultRow>(`select id from public.seasons where slug = $1 for update`, [
    TOURNAMENT_ID,
  ]);
  if (existing.rows[0]) {
    await client.query(
      `update public.seasons
       set name = $2,
           series_title = $3,
           status = 'completed',
           start_date = $4,
           end_date = $5,
           completed_at = coalesce(completed_at, $5::timestamptz),
           configured_days = greatest(configured_days, 1),
           game = $6,
           format = $7,
           region = $8,
           perspective = $9,
           description = coalesce($10, description),
           updated_at = timezone('utc', now())
       where id = $1`,
      [
        existing.rows[0].id,
        tournament.title,
        "PUBG Mahasangram",
        tournament.startDate,
        tournament.endDate ?? tournament.startDate,
        tournament.mode,
        tournament.format,
        tournament.server,
        tournament.perspective ?? "TPP",
        tournament.description ?? null,
      ],
    );
    return existing.rows[0].id;
  }

  const inserted = await client.query<{ id: string } & QueryResultRow>(
    `insert into public.seasons (
       name, slug, series_title, season_number, status, start_date, end_date,
       configured_days, current_day_number, completed_at, description, game,
       format, region, perspective, type
     ) values ($1, $2, $3, 1, 'completed', $4, $5, 1, 1, $5, $6, $7, $8, $9, $10, 'tournament')
     returning id`,
    [
      tournament.title,
      TOURNAMENT_ID,
      "PUBG Mahasangram",
      tournament.startDate,
      tournament.endDate ?? tournament.startDate,
      tournament.description ?? null,
      tournament.mode,
      tournament.format,
      tournament.server,
      tournament.perspective ?? "TPP",
    ],
  );
  return inserted.rows[0].id;
}

async function upsertPlayers(client: Client, eventId: string, players: readonly SourcePlayer[]) {
  const existingStatistics = await client.query<
    {
      source_player_id: string;
      player_id: string;
      pubg_name: string;
      slug: string | null;
      is_active: boolean;
      demo_seed_tag: string | null;
      deleted_at: string | null;
    } & QueryResultRow
  >(
    `select
       statistics.source_player_id,
       player_record.id as player_id,
       player_record.pubg_name,
       player_record.slug,
       player_record.is_active,
       player_record.demo_seed_tag,
       player_record.deleted_at
     from public.event_player_statistics statistics
     join public.players player_record on player_record.id = statistics.player_id
     where statistics.event_id = $1`,
    [eventId],
  );
  const existingBySourceId = new Map(existingStatistics.rows.map((row) => [row.source_player_id, row] as const));
  const result = new Map<string, string>();
  for (const player of players) {
    const cleanSlug = slugify(player.name);
    const linkedPlayer = existingBySourceId.get(player.id);
    const existing = linkedPlayer
      ? await client.query<
          {
            id: string;
            pubg_name: string;
            slug: string | null;
            is_active: boolean;
            demo_seed_tag: string | null;
            deleted_at: string | null;
          } & QueryResultRow
        >(
          `select id, pubg_name, slug, is_active, demo_seed_tag, deleted_at
           from public.players
           where id = $1
           for update`,
          [linkedPlayer.player_id],
        )
      : await client.query<
          {
            id: string;
            pubg_name: string;
            slug: string | null;
            is_active: boolean;
            demo_seed_tag: string | null;
            deleted_at: string | null;
          } & QueryResultRow
        >(
          `select id, pubg_name, slug, is_active, demo_seed_tag, deleted_at
           from public.players
           where lower(pubg_name) = lower($1)
              or slug = $2
           order by case when lower(pubg_name) = lower($1) then 0 else 1 end
           limit 2
           for update`,
          [player.name, cleanSlug],
        );
    if (existing.rows.length > 1) throw new Error(`Player ${player.id} became ambiguous during reconciliation.`);
    if (existing.rows[0] && existing.rows[0].pubg_name.trim().toLowerCase() !== player.name.toLowerCase()) {
      throw new Error(`Player slug ${cleanSlug} became associated with a different PUBG name.`);
    }
    if (existing.rows[0] && (!existing.rows[0].is_active || existing.rows[0].demo_seed_tag || existing.rows[0].deleted_at)) {
      throw new Error(`Player ${player.id} resolves to an inactive, demo, or deleted canonical record.`);
    }

    let playerId = existing.rows[0]?.id;
    if (playerId) {
      await client.query(
        `update public.players
         set pubg_name = $2,
             display_name = $2,
             slug = coalesce(slug, $3),
             updated_at = timezone('utc', now())
         where id = $1
           and deleted_at is null`,
        [playerId, player.name, cleanSlug],
      );
    } else {
      const inserted = await client.query<{ id: string } & QueryResultRow>(
        `insert into public.players (pubg_account_id, pubg_name, display_name, slug, is_active)
         values (null, $1, $1, $2, true)
         returning id`,
        [player.name, cleanSlug],
      );
      playerId = inserted.rows[0].id;
    }
    result.set(player.id, playerId);
  }
  return result;
}

async function applyReconciliation(
  client: Client,
  source: Awaited<ReturnType<typeof loadVerifiedSource>>,
  event: EventRow,
  teamMapping: ReadonlyMap<string, CanonicalTeamRow>,
) {
  const seasonId = await ensureSeason(client, source.tournament);
  await client.query(
    `update public.events
     set season_id = $2,
         title = $3,
         name = $3,
         slug = $4,
         event_type = 'tournament',
         type = 'tournament',
         game = $5,
         mode = $6,
         perspective = $7,
         status = 'completed',
         lifecycle_status = 'completed',
         competition_status = 'COMPLETED',
         result_status = 'published',
         registration_status = 'closed',
         stream_status = 'ended',
         description = $8,
         banner_url = $9,
         start_date = $10,
         end_date = $11,
         region = $12,
         server = $12,
         tier = $13,
         prize_pool = $14,
         rules = $15,
         max_teams = $16,
         team_count = $17,
         match_count = $18,
         source_url = $19,
         published = true,
          published_at = $20,
         deleted_at = null,
         demo_seed_tag = null,
         updated_at = timezone('utc', now())
     where id = $1`,
    [
      event.id,
      seasonId,
      source.tournament.title,
      TOURNAMENT_ID,
      source.tournament.mode,
      source.tournament.format,
      source.tournament.perspective ?? "TPP",
      source.tournament.description ?? null,
      source.tournament.bannerUrl ?? null,
      source.tournament.startDate,
      source.tournament.endDate ?? null,
      source.tournament.server,
      source.tournament.tier ?? null,
      source.tournament.prizePool ?? null,
      source.tournament.rules ?? null,
      source.tournament.maxTeams,
      source.teams.length,
      source.matches.length,
      source.tournament.sourceUrl ?? null,
      source.approvedAt,
    ],
  );

  for (const sourceTeam of source.teams) {
    const canonicalTeam = teamMapping.get(sourceTeam.id);
    if (!canonicalTeam) throw new Error(`Canonical team mapping disappeared for ${sourceTeam.id}.`);
    await client.query(
      `insert into public.event_teams (event_id, team_id, slot_number, status)
       values ($1, $2, $3, 'approved')
       on conflict (event_id, team_id)
       do update set slot_number = excluded.slot_number, status = 'approved', demo_seed_tag = null`,
      [event.id, canonicalTeam.id, sourceTeam.slotNumber ?? canonicalTeam.slot_number ?? null],
    );
  }

  const playerMapping = await upsertPlayers(client, event.id, source.players);

  for (const match of source.matches) {
    const existing = await client.query<{ id: string; event_id: string | null } & QueryResultRow>(
      `select id, event_id from public.matches where match_id = $1 for update`,
      [match.pubgMatchId],
    );
    if (existing.rows[0]?.event_id && existing.rows[0].event_id !== event.id) {
      throw new Error(`PUBG match ${match.pubgMatchId} already belongs to another event.`);
    }
    const saved = existing.rows[0]
      ? await client.query<{ id: string } & QueryResultRow>(
          `update public.matches
           set season_id = $2,
               event_id = $3,
               day_id = null,
               external_match_id = $4,
               match_number = $5,
               map = $6,
               map_name = $6,
               match_date = $7,
               start_time = $7,
               status = 'published',
               raw_json = $8::jsonb,
               source_url = $9,
               published_at = $10,
               deleted_at = null,
               demo_seed_tag = null,
               data_source = 'external_feed',
               updated_at = timezone('utc', now())
           where id = $1
           returning id`,
          [
            existing.rows[0].id,
            seasonId,
            event.id,
            match.externalMatchId ?? match.pubgMatchId,
            match.matchNumber,
            match.map,
            match.playedAt,
            JSON.stringify(match.data),
            match.sourceUrl ?? source.tournament.sourceUrl ?? null,
            match.publishedAt,
          ],
        )
      : await client.query<{ id: string } & QueryResultRow>(
          `insert into public.matches (
             season_id, event_id, day_id, match_id, external_match_id, match_number,
             map, map_name, match_date, start_time, status, raw_json, source_url,
             published_at, data_source
           ) values ($1, $2, null, $3, $4, $5, $6, $6, $7, $7, 'published', $8::jsonb, $9, $10, 'external_feed')
           returning id`,
          [
            seasonId,
            event.id,
            match.pubgMatchId,
            match.externalMatchId ?? match.pubgMatchId,
            match.matchNumber,
            match.map,
            match.playedAt,
            JSON.stringify(match.data),
            match.sourceUrl ?? source.tournament.sourceUrl ?? null,
            match.publishedAt,
          ],
        );
    const matchId = saved.rows[0].id;

    for (const result of match.teamResults) {
      const team = teamMapping.get(result.teamId);
      if (!team) throw new Error(`Match team mapping disappeared for ${result.teamId}.`);
      await client.query(
        `insert into public.match_team_results (
           match_id, team_id, team_name, slot_number, placement, kills,
           placement_points, kill_points, total_points, wwcd
         ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         on conflict (match_id, team_id)
         do update set
           team_name = excluded.team_name,
           slot_number = excluded.slot_number,
           placement = excluded.placement,
           kills = excluded.kills,
           placement_points = excluded.placement_points,
           kill_points = excluded.kill_points,
           total_points = excluded.total_points,
           wwcd = excluded.wwcd,
           demo_seed_tag = null`,
        [
          matchId,
          team.id,
          team.name,
          result.slotNumber ?? team.slot_number ?? null,
          result.placement,
          result.kills,
          result.placementPoints,
          result.killPoints,
          result.totalPoints,
          result.placement === 1,
        ],
      );
    }
  }

  for (const player of source.players) {
    const playerId = playerMapping.get(player.id);
    const team = teamMapping.get(player.teamId);
    if (!playerId || !team) throw new Error(`Player mapping disappeared for ${player.id}.`);
    await client.query(
      `insert into public.event_player_statistics (
         event_id, player_id, team_id, source_player_id, matches_played, kills, assists, knocks,
         damage, placement_points, total_points, best_placement, source_rank,
         source_provider, source_updated_at
       ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       on conflict (event_id, player_id)
       do update set
         team_id = excluded.team_id,
         source_player_id = excluded.source_player_id,
         matches_played = excluded.matches_played,
         kills = excluded.kills,
         assists = excluded.assists,
         knocks = excluded.knocks,
         damage = excluded.damage,
         placement_points = excluded.placement_points,
         total_points = excluded.total_points,
         best_placement = excluded.best_placement,
         source_rank = excluded.source_rank,
         source_provider = excluded.source_provider,
         source_updated_at = excluded.source_updated_at,
         demo_seed_tag = null`,
      [
        event.id,
        playerId,
        team.id,
        player.id,
        player.matches,
        player.kills,
        player.assists,
        player.knocks,
        player.damage,
        player.placementPoints,
        player.totalPoints,
        player.bestPlacement ?? null,
        player.sourceRank ?? null,
        player.sourceProvider,
        player.updatedAt,
      ],
    );
  }

  await client.query(
    `insert into public.audit_logs (action, entity_type, entity_id, old_data, new_data)
     values ($1, 'event', $2, $3::jsonb, $4::jsonb)`,
    [
      "competition.reconcile_verified_mahasangram",
      event.id,
      JSON.stringify({
        name: event.name,
        title: event.title,
        slug: event.slug,
        seasonId: event.season_id,
        published: event.published,
        publishedAt: event.published_at,
      }),
      JSON.stringify({
        sourceTournamentId: TOURNAMENT_ID,
        seasonId,
        teams: source.teams.length,
        players: source.players.length,
        matches: source.matches.length,
        sourceProvider: source.tournament.sourceProvider,
        approvedAuditId: source.approvedAuditId,
        auditChecksumFingerprint: source.auditChecksum.slice(0, 12),
      }),
    ],
  );

  return { seasonId, playerMapping };
}

async function verifyRelationalResult(client: Client, eventId: string) {
  const event = await client.query<EventRow>(
    `select id, name, title, slug, season_id, published, published_at from public.events where id = $1`,
    [eventId],
  );
  const teams = await client.query(
    `select team_id from public.event_teams where event_id = $1 and status = 'approved' and demo_seed_tag is null`,
    [eventId],
  );
  const matches = await client.query(
    `select id from public.matches where event_id = $1 and status = 'published' and published_at is not null and deleted_at is null`,
    [eventId],
  );
  const results = await client.query(
    `select count(*)::int as count
       from public.match_team_results result
       join public.matches match_record on match_record.id = result.match_id
       where match_record.event_id = $1 and result.demo_seed_tag is null`,
    [eventId],
  );
  const players = await client.query(`select player_id from public.event_player_statistics where event_id = $1 and demo_seed_tag is null`, [
    eventId,
  ]);
  const leaderboard = await client.query<{ name: string; total_points: string; kills: string } & QueryResultRow>(
    `select team_record.name, sum(result.total_points)::text as total_points, sum(result.kills)::text as kills
       from public.match_team_results result
       join public.matches match_record on match_record.id = result.match_id
       join public.teams team_record on team_record.id = result.team_id
       where match_record.event_id = $1 and match_record.status = 'published'
       group by team_record.id, team_record.name
       order by sum(result.total_points) desc, sum(result.kills) desc, team_record.name
       limit 3`,
    [eventId],
  );
  const topPlayer = await client.query<{ pubg_name: string; kills: number } & QueryResultRow>(
    `select player_record.pubg_name, statistics.kills
       from public.event_player_statistics statistics
       join public.players player_record on player_record.id = statistics.player_id
       where statistics.event_id = $1
       order by statistics.kills desc, statistics.damage desc, statistics.source_rank, player_record.pubg_name
       limit 1`,
    [eventId],
  );

  const resultCount = Number((results.rows[0] as { count?: number } | undefined)?.count ?? 0);
  if (event.rows[0]?.slug !== TOURNAMENT_ID || !event.rows[0].published || !event.rows[0].published_at || !event.rows[0].season_id) {
    throw new Error("Canonical event verification failed.");
  }
  if (teams.rowCount !== EXPECTED_TEAM_COUNT) throw new Error("Canonical event team verification failed.");
  if (matches.rowCount !== EXPECTED_MATCH_COUNT) throw new Error("Canonical match verification failed.");
  if (resultCount !== EXPECTED_MATCH_COUNT * EXPECTED_TEAM_COUNT) throw new Error("Canonical match result verification failed.");
  if (players.rowCount !== EXPECTED_PLAYER_COUNT) throw new Error("Canonical aggregate player verification failed.");
  const topThree = leaderboard.rows.map((row) => row.name);
  if (topThree[0] !== "M8" || topThree[1] !== "Team HAKU" || !/Near Edge Protocol|N3P/i.test(topThree[2] ?? "")) {
    throw new Error(`Canonical team order verification failed: ${topThree.join(", ")}.`);
  }
  if (topPlayer.rows[0]?.pubg_name !== "TommyVercettio_o" || Number(topPlayer.rows[0]?.kills) !== 53) {
    throw new Error("Canonical top-player verification failed.");
  }

  return {
    eventId,
    seasonId: event.rows[0].season_id,
    slug: event.rows[0].slug,
    teams: teams.rowCount,
    matches: matches.rowCount,
    teamResults: resultCount,
    aggregatePlayers: players.rowCount,
    topThree,
    topPlayer: { name: topPlayer.rows[0].pubg_name, kills: Number(topPlayer.rows[0].kills) },
  };
}

async function main() {
  const apply = process.argv.includes("--apply");
  const confirmed = process.argv.includes(`--confirm=${TOURNAMENT_ID}`);
  if (apply && !confirmed) {
    throw new Error(`Apply mode requires --confirm=${TOURNAMENT_ID}.`);
  }

  const connectionString = databaseUrl();
  const client = new Client({
    connectionString,
    ssl: {
      ca: SUPABASE_ROOT_CA,
      rejectUnauthorized: true,
      servername: new URL(connectionString).hostname,
    },
  });
  await client.connect();
  try {
    await client.query("begin");
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '90s'");
    await client.query(`select pg_advisory_xact_lock(hashtextextended($1, 0))`, [TOURNAMENT_ID]);
    const tableCheck = await client.query<{ relation: string | null } & QueryResultRow>(
      `select to_regclass('public.event_player_statistics')::text as relation`,
    );
    if (!tableCheck.rows[0]?.relation) {
      throw new Error("Migration 025 must be applied before relational reconciliation.");
    }

    const source = await loadVerifiedSource(client);
    const event = await loadTargetEvent(client);
    const teamMapping = await loadCanonicalMapping(client, source.teams);
    await ensureNoConflicts(client, event, source);
    await applyReconciliation(client, source, event, teamMapping);
    const verified = await verifyRelationalResult(client, event.id);
    if (apply) {
      await client.query("commit");
      console.log(JSON.stringify({ mode: "applied", projectRef: EXPECTED_PROJECT_REF, ...verified }, null, 2));
      return;
    }

    await client.query("rollback");
    console.log(
      JSON.stringify(
        {
          mode: "dry-run",
          projectRef: EXPECTED_PROJECT_REF,
          sourceTournamentId: source.tournament.id,
          approvedAuditId: source.approvedAuditId,
          auditChecksumFingerprint: source.auditChecksum.slice(0, 12),
          canonicalTeamMappings: teamMapping.size,
          readyToApply: true,
          ...verified,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    await client.end().catch(() => undefined);
  }
}

void main().catch((error: unknown) => {
  console.error("Mahasangram relational reconciliation failed.");
  console.error(error instanceof Error ? error.message : "Unknown reconciliation error.");
  process.exitCode = 1;
});
