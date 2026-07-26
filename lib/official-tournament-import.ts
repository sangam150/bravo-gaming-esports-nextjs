import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { Client } from "pg";
import { compareBravoTeamSlotOrder } from "./bravo-teams";
import { COLLECTIONS } from "./document-store-collections";
import { normalizeMapName, toTeamMatchResults } from "./tournament-standings";
import type { Player, SourceImportAuditRecord, Team, Tournament, TournamentMatch, TournamentStanding } from "./types";

const FIRST_OFFICIAL_TOURNAMENT_SOURCE_URL = "https://www.birajlamsal0.com.np/tournaments/53821?tab=leaderboard";
const SOURCE_PROVIDER = "birajlamsal0.com.np";
const IMPORTER_VERSION = "official-tournament-import/v1";
const PUBLIC_TOURNAMENT_ID = "pubg-mahasangram-53821";
const APP_DOCUMENTS_TABLE = "app_documents";

type SourceTournamentTeam = {
  id: string;
  name: string;
  teamKey?: string | null;
};

type SourceTournamentMatchResult = {
  matchId: string;
  teamId?: string | null;
  teamName: string;
  placement: number;
  kills: number;
};

type SourceTournamentMatch = {
  id: string;
  tournamentId: string;
  sequenceNumber?: number | null;
  mapName?: string | null;
  scheduledAt?: string | null;
  results: SourceTournamentMatchResult[];
};

type SourceStandingRow = {
  teamId?: string | null;
  teamName: string;
  matchesPlayed: number;
  totalKills: number;
  chickenDinners: number;
  placementPoints: number;
  totalPoints: number;
  bestPlacement: number;
  rank: number;
};

type SourcePlayerStandingRow = {
  playerId?: string | null;
  playerName: string;
  teamId?: string | null;
  teamName: string;
  matchesPlayed: number;
  totalKills: number;
  totalAssists: number;
  totalKnocks: number;
  totalDamageDealt: number;
  placementPoints: number;
  totalPoints: number;
  averageDamageDealt: number;
  bestPlacement: number;
  rank: number;
};

type SourceTournamentPayload = {
  tournament: {
    id: string;
    code: string;
    name: string;
    description?: string | null;
    status?: string | null;
    createdAt: string;
    teamCount?: number | null;
    matchCount?: number | null;
    teams?: SourceTournamentTeam[] | null;
    matches?: SourceTournamentMatch[] | null;
    maxSlots?: number | null;
    tier?: string | null;
    region?: string | null;
    mode?: string | null;
    perspective?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    prizePool?: number | null;
    registrationStatus?: string | null;
    rules?: string | null;
    bannerUrl?: string | null;
  };
  standings: SourceStandingRow[];
  playerStandings: SourcePlayerStandingRow[];
  tournamentState?: string | null;
  showCompetitionSections?: boolean;
  playersTabEnabled?: boolean;
  rulesTabEnabled?: boolean;
  initialTab?: string | null;
  slug?: string | null;
};

type ResolvedTeamRecord = {
  id: string;
  sourceTeamId?: string;
  teamName: string;
  normalizedName: string;
  slotNumber?: number;
};

type PersistedRecordCounts = {
  tournamentsCreated: number;
  tournamentsUpdated: number;
  matchesCreated: number;
  matchesUpdated: number;
  standingsCreated: number;
  standingsUpdated: number;
  teamsCreated: number;
  teamsUpdated: number;
  playersCreated: number;
  playersUpdated: number;
  auditsCreated: number;
  auditsUpdated: number;
};

type FirstOfficialTournamentImportResult = {
  sourceUrl: string;
  fetchedAt: string;
  sourceDataType: "HTML / JSON / API";
  rawSourceSaved: boolean;
  normalizedSourceSaved: boolean;
  tournamentName: string;
  sourceTournamentCode: string;
  sourceTournamentUuid: string;
  tournamentSlug: string;
  eventStatus: Tournament["status"];
  game: string;
  mode: string;
  perspective: string;
  startDate?: string | null;
  endDate?: string | null;
  teamsImported: number;
  playersImported: number;
  matchesImported: number;
  leaderboardRowsImported: number;
  winner: string | null;
  top3Teams: string[];
  topFragger: string | null;
  prizePoolAvailable: string | null;
  pointSystemAvailable: boolean;
  sourceRankPreserved: boolean;
  importAuditId: string;
  importStatus: SourceImportAuditRecord["importStatus"];
  duplicateSummary: string;
  reviewNotes: string[];
  fieldsUnavailableFromSource: string[];
  created: PersistedRecordCounts;
  updated: PersistedRecordCounts;
  artifactPaths: {
    rawHtmlPath: string;
    rawJsonPath: string;
    normalizedJsonPath: string;
  };
};

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function normalizeKey(value?: string | null) {
  return (
    value
      ?.toLowerCase()
      .replace(/[()[\]#]/g, " ")
      .replace(/[^a-z0-9]+/g, " ")
      .trim() ?? ""
  );
}

function cleanString(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function toOptionalNumber(value: unknown) {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : undefined;
}

function inferTeamTag(teamName: string) {
  const bracketMatch = teamName.match(/\(([^)]+)\)/);
  if (bracketMatch?.[1]) {
    const candidate = bracketMatch[1].replace(/[^A-Za-z0-9]/g, "").toUpperCase();
    if (candidate.length >= 2 && candidate.length <= 6) {
      return candidate;
    }
  }

  const compactUppercase = teamName.replace(/[^A-Za-z0-9]/g, "");
  if (compactUppercase && compactUppercase === compactUppercase.toUpperCase() && compactUppercase.length <= 6) {
    return compactUppercase;
  }

  const words = teamName
    .replace(/\([^)]*\)/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .filter((word) => !["the", "of", "and", "esports"].includes(word.toLowerCase()));

  if (words.length === 0) {
    return undefined;
  }

  if (words[0] && words[0].length >= 2 && words.length === 1) {
    return words[0].slice(0, 5).toUpperCase();
  }

  return words
    .slice(0, 4)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 5);
}

function normalizeTournamentStatus(
  sourceStatus: string | undefined,
  startDate: string | undefined,
  endDate: string | undefined,
  fetchedAt: string,
): Tournament["status"] {
  const normalizedSourceStatus = sourceStatus?.trim().toLowerCase() ?? "";
  if (normalizedSourceStatus === "completed" || normalizedSourceStatus === "finished") {
    return "COMPLETED";
  }

  const now = Date.parse(fetchedAt);
  const endTime = endDate ? Date.parse(endDate) : Number.NaN;
  const startTime = startDate ? Date.parse(startDate) : Number.NaN;

  if (Number.isFinite(endTime) && endTime < now) {
    return "COMPLETED";
  }

  if (normalizedSourceStatus === "ongoing" || normalizedSourceStatus === "live" || normalizedSourceStatus === "active") {
    return "LIVE";
  }

  if (Number.isFinite(startTime) && startTime > now) {
    return "UPCOMING";
  }

  return "UPCOMING";
}

function extractBalancedObject(source: string, marker: string) {
  const startIndex = source.indexOf(marker);
  if (startIndex < 0) {
    return null;
  }

  let depth = 0;
  let insideString = false;
  let escaped = false;

  for (let index = startIndex; index < source.length; index += 1) {
    const character = source[index];

    if (insideString) {
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === '"') {
        insideString = false;
      }
      continue;
    }

    if (character === '"') {
      insideString = true;
      continue;
    }

    if (character === "{") {
      depth += 1;
    } else if (character === "}") {
      depth -= 1;
      if (depth === 0) {
        return source.slice(startIndex, index + 1);
      }
    }
  }

  return null;
}

async function fetchTournamentSourceHtml(sourceUrl: string) {
  const response = await fetch(sourceUrl, {
    headers: {
      "user-agent": "Mozilla/5.0 (compatible; BravoImportBot/1.0; +https://bravo-gaming-esports.vercel.app/)",
      accept: "text/html,application/xhtml+xml",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch source tournament page: ${response.status} ${response.statusText}`);
  }

  return response.text();
}

function extractTournamentPayloadFromHtml(html: string) {
  const inlineScripts = [...html.matchAll(/<script[^>]*>(self\.__next_f\.push\([\s\S]*?\))<\/script>/g)];
  const pushes: unknown[] = [];
  const context = {
    self: {
      __next_f: {
        push(value: unknown) {
          pushes.push(value);
        },
      },
    },
  };

  vm.createContext(context);

  for (const scriptMatch of inlineScripts) {
    try {
      vm.runInContext(scriptMatch[1], context);
    } catch {
      // Some scripts are unrelated to the structured tournament payload.
    }
  }

  const payloadContainer = pushes.find(
    (entry) =>
      Array.isArray(entry) &&
      typeof entry[1] === "string" &&
      entry[1].includes('"tournament"') &&
      entry[1].includes('"standings"') &&
      entry[1].includes('"playerStandings"'),
  );

  if (!payloadContainer || !Array.isArray(payloadContainer) || typeof payloadContainer[1] !== "string") {
    throw new Error("Unable to locate the tournament payload inside the source HTML.");
  }

  const compactPayload = payloadContainer[1].replace(/\\n/g, " ");
  const objectText = extractBalancedObject(compactPayload, '{"tournament"');

  if (!objectText) {
    throw new Error("Unable to extract the structured tournament object from the source HTML.");
  }

  return JSON.parse(objectText.replace(/"\$undefined"/g, "null")) as SourceTournamentPayload;
}

function buildChecksum(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

type AppDocumentRow = {
  collection_name: string;
  id: string;
  data: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

function getDatabaseUrl() {
  const databaseUrl = cleanString(process.env.DATABASE_URL);
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured.");
  }

  return databaseUrl;
}

function toJsonRecord(data: Record<string, unknown>) {
  return JSON.parse(JSON.stringify(data)) as Record<string, unknown>;
}

function mapAppDocumentRow<T>(row: AppDocumentRow) {
  return {
    id: row.id,
    ...((row.data ?? {}) as Record<string, unknown>),
  } as T & { id: string };
}

async function createDatabaseClient() {
  const client = new Client({
    connectionString: getDatabaseUrl(),
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  return client;
}

async function ensureAppDocumentsTable(client: Client) {
  await client.query(`
    create table if not exists public.app_documents (
      collection_name text not null,
      id text not null,
      data jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default timezone('utc', now()),
      updated_at timestamptz not null default timezone('utc', now()),
      primary key (collection_name, id)
    )
  `);

  await client.query(`create index if not exists app_documents_collection_name_idx on public.app_documents (collection_name)`);
  await client.query(
    `create index if not exists app_documents_collection_updated_at_idx on public.app_documents (collection_name, updated_at desc)`,
  );

  await client.query(`notify pgrst, 'reload schema'`).catch(() => undefined);
}

async function fetchCollectionDirect<T>(client: Client, collectionName: string, limit = 1000) {
  const result = await client.query<AppDocumentRow>(
    `
      select collection_name, id, data, created_at, updated_at
      from ${APP_DOCUMENTS_TABLE}
      where collection_name = $1
      order by updated_at desc
      limit $2
    `,
    [collectionName, limit],
  );

  return result.rows.map((row) => mapAppDocumentRow<T>(row));
}

async function getDocumentDirect<T>(client: Client, collectionName: string, docId: string) {
  const result = await client.query<AppDocumentRow>(
    `
      select collection_name, id, data, created_at, updated_at
      from ${APP_DOCUMENTS_TABLE}
      where collection_name = $1
        and id = $2
      limit 1
    `,
    [collectionName, docId],
  );

  if (result.rows.length === 0) {
    return null;
  }

  return mapAppDocumentRow<T>(result.rows[0]);
}

async function saveDocumentDirect(client: Client, collectionName: string, docId: string, data: Record<string, unknown>) {
  const now = new Date().toISOString();
  const existingDocument = await getDocumentDirect<Record<string, unknown>>(client, collectionName, docId);
  const { id: _existingId, ...existingPayload } = existingDocument ?? {};
  const mergedData = toJsonRecord({
    ...existingPayload,
    ...data,
    updatedAt: now,
  });

  await client.query(
    `
      insert into ${APP_DOCUMENTS_TABLE} (collection_name, id, data, created_at, updated_at)
      values ($1, $2, $3::jsonb, $4, $5)
      on conflict (collection_name, id)
      do update
        set data = excluded.data,
            updated_at = excluded.updated_at
    `,
    [collectionName, docId, JSON.stringify(mergedData), (existingDocument as { createdAt?: string } | null)?.createdAt ?? now, now],
  );

  return { id: docId, collection: collectionName };
}

async function deleteDocumentDirect(client: Client, collectionName: string, docId: string) {
  await client.query(
    `
      delete from ${APP_DOCUMENTS_TABLE}
      where collection_name = $1
        and id = $2
    `,
    [collectionName, docId],
  );
}

function buildAuditId(sourceCode: string, fetchedAt: string) {
  return `official-import-${sourceCode}-${fetchedAt.replace(/[:.]/g, "-")}`;
}

function buildArtifactPaths(tournamentId: string, auditId: string) {
  const baseDirectory = path.join(process.cwd(), "qa-artifacts", "official-imports", tournamentId, auditId);
  return {
    baseDirectory,
    rawHtmlPath: path.join(baseDirectory, "raw-source.html"),
    rawJsonPath: path.join(baseDirectory, "raw-source.json"),
    normalizedJsonPath: path.join(baseDirectory, "normalized-import.json"),
  };
}

async function writeArtifacts(
  artifactPaths: ReturnType<typeof buildArtifactPaths>,
  rawHtml: string,
  rawJson: SourceTournamentPayload,
  normalizedImportJson: Record<string, unknown>,
) {
  await mkdir(artifactPaths.baseDirectory, { recursive: true });
  await Promise.all([
    writeFile(artifactPaths.rawHtmlPath, rawHtml, "utf8"),
    writeFile(artifactPaths.rawJsonPath, JSON.stringify(rawJson, null, 2), "utf8"),
    writeFile(artifactPaths.normalizedJsonPath, JSON.stringify(normalizedImportJson, null, 2), "utf8"),
  ]);
}

async function deleteMissingDocuments<T extends { id: string }>(
  client: Client,
  existingDocuments: T[],
  keepIds: ReadonlySet<string>,
  collectionName: string,
) {
  for (const document of existingDocuments) {
    if (keepIds.has(document.id)) {
      continue;
    }

    await deleteDocumentDirect(client, collectionName, document.id);
  }
}

function incrementCounts(target: PersistedRecordCounts, key: keyof PersistedRecordCounts) {
  target[key] += 1;
}

function buildEmptyCounts(): PersistedRecordCounts {
  return {
    tournamentsCreated: 0,
    tournamentsUpdated: 0,
    matchesCreated: 0,
    matchesUpdated: 0,
    standingsCreated: 0,
    standingsUpdated: 0,
    teamsCreated: 0,
    teamsUpdated: 0,
    playersCreated: 0,
    playersUpdated: 0,
    auditsCreated: 0,
    auditsUpdated: 0,
  };
}

function summarizePrizePool(prizePool?: number | null) {
  return typeof prizePool === "number" && prizePool > 0 ? `NPR ${prizePool.toLocaleString("en-US")}` : "TBD";
}

export async function importFirstOfficialTournament(options?: { sourceUrl?: string; importedBy?: string }) {
  const sourceUrl = options?.sourceUrl ?? FIRST_OFFICIAL_TOURNAMENT_SOURCE_URL;
  const fetchedAt = new Date().toISOString();
  const importedBy = cleanString(options?.importedBy) ?? cleanString(process.env.USERNAME) ?? "codex";
  const client = await createDatabaseClient();

  try {
    await ensureAppDocumentsTable(client);
    const rawHtml = await fetchTournamentSourceHtml(sourceUrl);
    const payload = extractTournamentPayloadFromHtml(rawHtml);
    const checksum = buildChecksum(rawHtml);
    const startDate = cleanString(payload.tournament.startDate)?.slice(0, 10);
    const endDate = cleanString(payload.tournament.endDate)?.slice(0, 10);
    const eventStatus = normalizeTournamentStatus(cleanString(payload.tournament.status), startDate, endDate, fetchedAt);
    const publicTournamentTitle = payload.tournament.name.trim();
    const auditId = buildAuditId(payload.tournament.code, fetchedAt);
    const artifactPaths = buildArtifactPaths(PUBLIC_TOURNAMENT_ID, auditId);
    const pointSystemAvailable = payload.standings.every(
      (standing) =>
        typeof standing.placementPoints === "number" &&
        Number.isFinite(standing.placementPoints) &&
        typeof standing.totalPoints === "number" &&
        Number.isFinite(standing.totalPoints),
    );

    const allTeams = await fetchCollectionDirect<Team>(client, COLLECTIONS.teams, 1000);
    const allPlayers = await fetchCollectionDirect<Player>(client, COLLECTIONS.players, 2500);
    const existingTournament = await getDocumentDirect<Tournament>(client, COLLECTIONS.tournaments, PUBLIC_TOURNAMENT_ID);
    const existingMatches = await fetchCollectionDirect<TournamentMatch>(client, COLLECTIONS.matches, 1000);
    const existingTournamentMatches = await fetchCollectionDirect<TournamentMatch>(client, COLLECTIONS.tournamentMatches, 1000);
    const existingStandings = await fetchCollectionDirect<TournamentStanding>(client, COLLECTIONS.standings, 1000);
    const existingTournamentTeams = allTeams;
    const existingTournamentPlayers = allPlayers;
    const scopedExistingMatches = existingMatches.filter((match) => match.tournamentId === PUBLIC_TOURNAMENT_ID);
    const scopedExistingTournamentMatches = existingTournamentMatches.filter((match) => match.tournamentId === PUBLIC_TOURNAMENT_ID);
    const scopedExistingStandings = existingStandings.filter((standing) => standing.tournamentId === PUBLIC_TOURNAMENT_ID);
    const scopedExistingTournamentTeams = existingTournamentTeams.filter((team) => team.sourceTournamentId === PUBLIC_TOURNAMENT_ID);
    const scopedExistingTournamentPlayers = existingTournamentPlayers.filter(
      (player) => player.sourceTournamentId === PUBLIC_TOURNAMENT_ID,
    );

    const teamsBySourceId = new Map<string, SourceTournamentTeam>();
    const teamRecordsByNormalizedKey = new Map<string, ResolvedTeamRecord>();
    const existingTeamsBySourceTeamId = new Map<string, Team>();
    const existingTeamsByName = new Map<string, Team>();
    for (const team of allTeams) {
      if (team.sourceTeamId) {
        existingTeamsBySourceTeamId.set(team.sourceTeamId, team);
      }
      const normalizedExistingTeamName = normalizeKey(team.name);
      if (normalizedExistingTeamName) {
        existingTeamsByName.set(normalizedExistingTeamName, team);
      }
    }

    for (const sourceTeam of payload.tournament.teams ?? []) {
      teamsBySourceId.set(sourceTeam.id, sourceTeam);
    }

    const registerTeamRecord = (teamName: string, sourceTeamId?: string | null) => {
      const normalizedName = normalizeKey(teamName);
      if (!normalizedName) {
        return null;
      }

      const sourceTeam = sourceTeamId ? teamsBySourceId.get(sourceTeamId) : undefined;
      const currentRecord =
        teamRecordsByNormalizedKey.get(normalizedName) ?? (sourceTeamId ? teamRecordsByNormalizedKey.get(sourceTeamId) : undefined) ?? null;

      const existingTeam =
        (sourceTeamId ? existingTeamsBySourceTeamId.get(sourceTeamId) : undefined) ?? existingTeamsByName.get(normalizedName) ?? null;

      const resolvedRecord: ResolvedTeamRecord = {
        id: currentRecord?.id ?? existingTeam?.id ?? slugify(teamName),
        sourceTeamId: sourceTeamId ?? sourceTeam?.id ?? currentRecord?.sourceTeamId,
        teamName: currentRecord?.teamName ?? sourceTeam?.name ?? existingTeam?.name ?? teamName,
        normalizedName,
        slotNumber:
          currentRecord?.slotNumber ??
          toOptionalNumber(sourceTeam?.teamKey) ??
          toOptionalNumber(sourceTeam?.teamKey?.replace(/[^\d]/g, "")) ??
          undefined,
      };

      teamRecordsByNormalizedKey.set(normalizedName, resolvedRecord);
      if (resolvedRecord.sourceTeamId) {
        teamRecordsByNormalizedKey.set(resolvedRecord.sourceTeamId, resolvedRecord);
      }

      return resolvedRecord;
    };

    for (const sourceTeam of payload.tournament.teams ?? []) {
      registerTeamRecord(sourceTeam.name, sourceTeam.id);
    }

    for (const standing of payload.standings) {
      registerTeamRecord(standing.teamName, standing.teamId);
    }

    for (const match of payload.tournament.matches ?? []) {
      for (const result of match.results) {
        registerTeamRecord(result.teamName, result.teamId);
      }
    }

    const teamRecordIndex = new Map<string, ResolvedTeamRecord>();
    for (const record of teamRecordsByNormalizedKey.values()) {
      teamRecordIndex.set(record.id, record);
    }

    const matchDocuments: TournamentMatch[] = (payload.tournament.matches ?? [])
      .slice()
      .sort((firstMatch, secondMatch) => {
        const firstSequence = firstMatch.sequenceNumber ?? Number.POSITIVE_INFINITY;
        const secondSequence = secondMatch.sequenceNumber ?? Number.POSITIVE_INFINITY;
        if (firstSequence !== secondSequence) {
          return firstSequence - secondSequence;
        }
        return (firstMatch.scheduledAt ?? "").localeCompare(secondMatch.scheduledAt ?? "");
      })
      .map((match, index) => {
        const teamResults = toTeamMatchResults(
          match.results.map((result) => {
            const resolvedTeam =
              (result.teamId ? teamRecordsByNormalizedKey.get(result.teamId) : undefined) ??
              teamRecordsByNormalizedKey.get(normalizeKey(result.teamName));

            return {
              teamId: resolvedTeam?.id ?? slugify(result.teamName),
              teamName: resolvedTeam?.teamName ?? result.teamName,
              slotNumber: resolvedTeam?.slotNumber,
              placement: result.placement,
              kills: result.kills,
            };
          }),
        );
        const winner = teamResults.find((teamResult) => teamResult.placement === 1)?.teamName ?? teamResults[0]?.teamName ?? "Unknown";

        return {
          id: `${PUBLIC_TOURNAMENT_ID}--match-${String(index + 1).padStart(2, "0")}`,
          tournamentId: PUBLIC_TOURNAMENT_ID,
          pubgMatchId: match.id,
          externalMatchId: match.id,
          sequenceNumber: match.sequenceNumber ?? undefined,
          matchNumber: index + 1,
          map: normalizeMapName(match.mapName ?? "Unknown"),
          eventName: publicTournamentTitle,
          eventSlug: PUBLIC_TOURNAMENT_ID,
          status: "published",
          winner,
          points: teamResults[0]?.totalPoints ?? 0,
          knockouts: teamResults.reduce((sum, teamResult) => sum + teamResult.kills, 0),
          placementPoints: teamResults[0]?.placementPoints ?? 0,
          killPoints: teamResults[0]?.killPoints ?? 0,
          playedAt: cleanString(match.scheduledAt),
          sourceUrl,
          dataSource: "external_feed",
          syncedAt: fetchedAt,
          publishedAt: fetchedAt,
          pointSystemName: pointSystemAvailable ? "Bravo PUBG Placement + Kills" : undefined,
          teamResults,
        } satisfies TournamentMatch;
      });

    const computedStandingsByTeamId = new Map(
      matchDocuments
        .flatMap((match) => match.teamResults ?? [])
        .reduce<
          Array<{
            teamId: string;
            teamName: string;
            slotNumber?: number;
            placements: number[];
          }>
        >((summary, teamResult) => {
          const current = summary.find((item) => item.teamId === (teamResult.teamId ?? slugify(teamResult.teamName)));
          if (current) {
            current.placements.push(teamResult.placement);
          } else {
            summary.push({
              teamId: teamResult.teamId ?? slugify(teamResult.teamName),
              teamName: teamResult.teamName,
              slotNumber: teamResult.slotNumber,
              placements: [teamResult.placement],
            });
          }
          return summary;
        }, [])
        .map(
          (item) =>
            [
              item.teamId,
              {
                averagePlacement: Number(
                  (item.placements.reduce((sum, placement) => sum + placement, 0) / Math.max(item.placements.length, 1)).toFixed(2),
                ),
              },
            ] as const,
        ),
    );

    const standingDocuments: TournamentStanding[] = payload.standings.map((standing) => {
      const resolvedTeam =
        (standing.teamId ? teamRecordsByNormalizedKey.get(standing.teamId) : undefined) ??
        teamRecordsByNormalizedKey.get(normalizeKey(standing.teamName));
      const teamId = resolvedTeam?.id ?? slugify(standing.teamName);

      return {
        id: `${PUBLIC_TOURNAMENT_ID}--standing-${teamId}`,
        tournamentId: PUBLIC_TOURNAMENT_ID,
        teamId,
        teamName: resolvedTeam?.teamName ?? standing.teamName,
        slotNumber: resolvedTeam?.slotNumber,
        matches: standing.matchesPlayed,
        wins: standing.chickenDinners,
        kills: standing.totalKills,
        killPoints: standing.totalKills,
        placementPoints: standing.placementPoints,
        totalPoints: standing.totalPoints,
        bestPlacement: standing.bestPlacement,
        averagePlacement: computedStandingsByTeamId.get(teamId)?.averagePlacement ?? 0,
        rank: standing.rank,
        sourceRank: standing.rank,
        scope: "tournament",
        sourceTournamentId: PUBLIC_TOURNAMENT_ID,
        sourceTournamentTitle: publicTournamentTitle,
        sourceProvider: SOURCE_PROVIDER,
        createdAt: fetchedAt,
        updatedAt: fetchedAt,
      };
    });

    const existingPlayersBySourcePlayerId = new Map<string, Player>();
    const existingPlayersByName = new Map<string, Player>();
    for (const player of allPlayers) {
      if (player.sourcePlayerId) {
        existingPlayersBySourcePlayerId.set(player.sourcePlayerId, player);
      }
      const normalizedExistingPlayerName = normalizeKey(player.pubgName ?? player.inGameName ?? player.name);
      if (normalizedExistingPlayerName) {
        existingPlayersByName.set(normalizedExistingPlayerName, player);
      }
    }

    const playerDocuments: Player[] = payload.playerStandings.map((playerStanding) => {
      const normalizedPlayerName = normalizeKey(playerStanding.playerName);
      const resolvedTeam =
        (playerStanding.teamId ? teamRecordsByNormalizedKey.get(playerStanding.teamId) : undefined) ??
        teamRecordsByNormalizedKey.get(normalizeKey(playerStanding.teamName));
      const existingPlayer =
        (playerStanding.playerId ? existingPlayersBySourcePlayerId.get(playerStanding.playerId) : undefined) ??
        existingPlayersByName.get(normalizedPlayerName) ??
        null;
      const playerId = existingPlayer?.id ?? cleanString(playerStanding.playerId) ?? slugify(playerStanding.playerName);

      return {
        id: playerId,
        name: playerStanding.playerName,
        inGameName: playerStanding.playerName,
        teamId: resolvedTeam?.id,
        teamName: resolvedTeam?.teamName ?? playerStanding.teamName,
        pubgId: cleanString(playerStanding.playerId),
        pubgName: playerStanding.playerName,
        assists: playerStanding.totalAssists,
        knocks: playerStanding.totalKnocks,
        placementPoints: playerStanding.placementPoints,
        totalPoints: playerStanding.totalPoints,
        averageDamage: Number(playerStanding.averageDamageDealt.toFixed(2)),
        bestPlacement: playerStanding.bestPlacement,
        kills: playerStanding.totalKills,
        damage: Math.round(playerStanding.totalDamageDealt),
        mvpCount: existingPlayer?.mvpCount ?? 0,
        chickenDinners: existingPlayer?.chickenDinners ?? 0,
        matches: playerStanding.matchesPlayed,
        rating: playerStanding.totalPoints,
        scope: "tournament",
        sourceTournamentId: PUBLIC_TOURNAMENT_ID,
        sourceTournamentTitle: publicTournamentTitle,
        sourcePlayerId: cleanString(playerStanding.playerId),
        sourceRank: playerStanding.rank,
        sourceProvider: SOURCE_PROVIDER,
        playerStatus: "active",
        createdAt: existingPlayer?.createdAt ?? fetchedAt,
        updatedAt: fetchedAt,
      };
    });

    const playerIdsByTeamId = new Map<string, string[]>();
    for (const player of playerDocuments) {
      if (!player.teamId) {
        continue;
      }
      const currentPlayerIds = playerIdsByTeamId.get(player.teamId) ?? [];
      currentPlayerIds.push(player.id);
      playerIdsByTeamId.set(player.teamId, currentPlayerIds);
    }

    const standingsByTeamId = new Map(standingDocuments.map((standing) => [standing.teamId, standing] as const));
    const teamDocuments: Array<Partial<Team> & { id: string; name: string }> = Array.from(teamRecordIndex.values())
      .sort((firstTeam, secondTeam) => compareBravoTeamSlotOrder(firstTeam, secondTeam))
      .map((record) => {
        const standing = standingsByTeamId.get(record.id);

        return {
          id: record.id,
          name: record.teamName,
          tag: inferTeamTag(record.teamName),
          slotNumber: record.slotNumber,
          country: cleanString(payload.tournament.region) ?? "Nepal & South Asia",
          rank: standing?.rank,
          totalPoints: standing?.totalPoints ?? 0,
          kills: standing?.kills ?? 0,
          matches: standing?.matches ?? 0,
          killPoints: standing?.killPoints ?? standing?.kills ?? 0,
          placementPoints: standing?.placementPoints ?? 0,
          averagePlacement: standing?.averagePlacement ?? 0,
          chickenDinners: standing?.wins ?? 0,
          status: "active" as const,
          registrationStatus: "approved" as const,
          playerIds: playerIdsByTeamId.get(record.id) ?? [],
          scope: "tournament" as const,
          sourceTournamentId: PUBLIC_TOURNAMENT_ID,
          sourceTournamentTitle: publicTournamentTitle,
          sourceTeamId: record.sourceTeamId,
          sourceTeamName: record.teamName,
          sourceRank: standing?.rank,
          sourceProvider: SOURCE_PROVIDER,
          createdAt: fetchedAt,
          updatedAt: fetchedAt,
        };
      });

    const uniqueImportedTeamNames = new Set([
      ...payload.standings.map((standing) => normalizeKey(standing.teamName)),
      ...matchDocuments.flatMap((match) => (match.teamResults ?? []).map((teamResult) => normalizeKey(teamResult.teamName))),
    ]);
    const teamCountMismatch =
      typeof payload.tournament.teamCount === "number" && payload.tournament.teamCount !== uniqueImportedTeamNames.size;

    const reviewNotes = [
      eventStatus === "COMPLETED" &&
      (payload.tournament.status?.trim().toLowerCase() === "ongoing" || payload.tournament.status?.trim().toLowerCase() === "live")
        ? `Source status is "${payload.tournament.status}" but the tournament end date ${endDate ?? "unknown"} is already in the past as of ${fetchedAt.slice(0, 10)}. Public event status was normalized to COMPLETED.`
        : null,
      teamCountMismatch
        ? `Source tournament.teamCount is ${payload.tournament.teamCount}, but ${uniqueImportedTeamNames.size} unique teams were parsed from the published standings and match results.`
        : null,
      (payload.tournament.prizePool ?? 0) <= 0
        ? "Prize pool is not available from the source payload. Public prize pool was stored as TBD."
        : null,
      "Per-match player results were not present in the source payload. Player leaderboard rows were imported from the published aggregate player standings only.",
    ].filter((note): note is string => Boolean(note));

    const fieldsUnavailableFromSource = [
      "Per-match player results",
      (payload.tournament.prizePool ?? 0) <= 0 ? "Prize pool" : null,
      cleanString(payload.tournament.rules) ? null : "Rules / point system text",
      "Verified player WWCD counts",
      "Verified player MVP counts",
    ].filter((field): field is string => Boolean(field));

    const tournamentDocument = {
      id: PUBLIC_TOURNAMENT_ID,
      title: publicTournamentTitle,
      tier: cleanString(payload.tournament.tier) ?? "S",
      status: eventStatus,
      prizePool: summarizePrizePool(payload.tournament.prizePool),
      teamCount: uniqueImportedTeamNames.size,
      maxTeams: Math.max(toOptionalNumber(payload.tournament.maxSlots) ?? 0, uniqueImportedTeamNames.size || 1),
      startDate: startDate ?? payload.tournament.createdAt.slice(0, 10),
      endDate,
      format: cleanString(payload.tournament.mode) ?? "Squad",
      mode: "PUBG PC",
      server: cleanString(payload.tournament.region) ?? "Nepal & South Asia",
      perspective: cleanString(payload.tournament.perspective) ?? "TPP",
      description: cleanString(payload.tournament.description),
      rules: cleanString(payload.tournament.rules),
      mapRotation: Array.from(new Set(matchDocuments.map((match) => match.map).filter(Boolean))),
      bannerUrl: cleanString(payload.tournament.bannerUrl),
      registeredTeamIds: teamDocuments.map((team) => team.id),
      matchCount: matchDocuments.length,
      sourceId: payload.tournament.code,
      sourceName: payload.tournament.name.trim(),
      sourceStatus: cleanString(payload.tournament.status),
      sourceUrl,
      sourceProvider: SOURCE_PROVIDER,
      createdAt: payload.tournament.createdAt,
      updatedAt: fetchedAt,
    } satisfies Partial<Tournament> & { id: string; title: string };

    const top3Teams = standingDocuments.slice(0, 3).map((standing) => standing.teamName);
    const topFragger = playerDocuments
      .slice()
      .sort(
        (firstPlayer, secondPlayer) =>
          (secondPlayer.kills ?? 0) - (firstPlayer.kills ?? 0) || firstPlayer.name.localeCompare(secondPlayer.name),
      )[0];
    const normalizedImportJson = {
      sourceUrl,
      sourceProvider: SOURCE_PROVIDER,
      fetchedAt,
      checksum,
      checksumAlgorithm: "sha256",
      tournament: {
        publicId: PUBLIC_TOURNAMENT_ID,
        publicSlug: PUBLIC_TOURNAMENT_ID,
        publicStatus: eventStatus,
        publicTitle: publicTournamentTitle,
        sourceCode: payload.tournament.code,
        sourceUuid: payload.tournament.id,
        sourceStatus: payload.tournament.status,
        startDate: tournamentDocument.startDate,
        endDate: tournamentDocument.endDate ?? null,
        teamCountDeclared: payload.tournament.teamCount ?? null,
        teamCountImported: teamDocuments.length,
        matchCountDeclared: payload.tournament.matchCount ?? null,
        matchCountImported: matchDocuments.length,
        region: tournamentDocument.server,
        mode: tournamentDocument.format,
        perspective: tournamentDocument.perspective ?? null,
        tier: tournamentDocument.tier,
        prizePool: tournamentDocument.prizePool,
      },
      summary: {
        winner: standingDocuments[0]?.teamName ?? null,
        top3Teams,
        topFragger: topFragger ? { playerName: topFragger.pubgName, kills: topFragger.kills } : null,
        fieldsUnavailableFromSource,
        reviewNotes,
      },
      counts: {
        teams: teamDocuments.length,
        players: playerDocuments.length,
        matches: matchDocuments.length,
        standings: standingDocuments.length,
      },
      sourceFlags: {
        playersTabEnabled: payload.playersTabEnabled ?? false,
        rulesTabEnabled: payload.rulesTabEnabled ?? false,
        showCompetitionSections: payload.showCompetitionSections ?? false,
        initialTab: payload.initialTab ?? null,
        tournamentState: payload.tournamentState ?? null,
      },
      docs: {
        tournament: tournamentDocument,
        standings: standingDocuments,
        teams: teamDocuments,
        players: playerDocuments,
        matches: matchDocuments,
      },
    } satisfies Record<string, unknown>;

    await writeArtifacts(artifactPaths, rawHtml, payload, normalizedImportJson);

    const existingTeamsById = new Map(allTeams.map((team) => [team.id, team] as const));
    const existingPlayersById = new Map(allPlayers.map((player) => [player.id, player] as const));
    const previousState = {
      tournament: existingTournament,
      matches: scopedExistingMatches,
      tournamentMatches: scopedExistingTournamentMatches,
      standings: scopedExistingStandings,
      teams: teamDocuments.map((team) => existingTeamsById.get(team.id) ?? null).filter((team): team is Team => Boolean(team)),
      players: playerDocuments
        .map((player) => existingPlayersById.get(player.id) ?? null)
        .filter((player): player is Player => Boolean(player)),
    };

    const auditRecord = {
      id: auditId,
      sourceUrl,
      sourceTournamentId: payload.tournament.code,
      sourceProvider: SOURCE_PROVIDER,
      fetchedAt,
      importerVersion: IMPORTER_VERSION,
      checksum,
      checksumAlgorithm: "sha256",
      importStatus: "needs_review",
      importedBy,
      rawHtml,
      rawJson: payload,
      normalizedImportJson,
      previousState,
      reviewNotes,
      localArtifactPaths: [artifactPaths.rawHtmlPath, artifactPaths.rawJsonPath, artifactPaths.normalizedJsonPath],
      createdAt: fetchedAt,
      updatedAt: fetchedAt,
    } satisfies SourceImportAuditRecord;

    const createdCounts = buildEmptyCounts();
    const updatedCounts = buildEmptyCounts();
    const existingAuditRecord = await getDocumentDirect<SourceImportAuditRecord>(client, COLLECTIONS.importAudits, auditId);

    incrementCounts(existingTournament ? updatedCounts : createdCounts, existingTournament ? "tournamentsUpdated" : "tournamentsCreated");
    incrementCounts(existingAuditRecord ? updatedCounts : createdCounts, existingAuditRecord ? "auditsUpdated" : "auditsCreated");

    for (const matchDocument of matchDocuments) {
      const existingMatch =
        scopedExistingMatches.find((match) => match.id === matchDocument.id) ??
        scopedExistingTournamentMatches.find((match) => match.id === matchDocument.id) ??
        null;
      incrementCounts(existingMatch ? updatedCounts : createdCounts, existingMatch ? "matchesUpdated" : "matchesCreated");
    }

    for (const standingDocument of standingDocuments) {
      const existingStanding = scopedExistingStandings.find((standing) => standing.id === standingDocument.id) ?? null;
      incrementCounts(existingStanding ? updatedCounts : createdCounts, existingStanding ? "standingsUpdated" : "standingsCreated");
    }

    for (const teamDocument of teamDocuments) {
      const existingTeam = existingTeamsById.get(teamDocument.id) ?? null;
      incrementCounts(existingTeam ? updatedCounts : createdCounts, existingTeam ? "teamsUpdated" : "teamsCreated");
    }

    for (const playerDocument of playerDocuments) {
      const existingPlayer = existingPlayersById.get(playerDocument.id) ?? null;
      incrementCounts(existingPlayer ? updatedCounts : createdCounts, existingPlayer ? "playersUpdated" : "playersCreated");
    }

    await saveDocumentDirect(client, COLLECTIONS.importAudits, auditId, auditRecord as unknown as Record<string, unknown>);
    await saveDocumentDirect(
      client,
      COLLECTIONS.tournaments,
      PUBLIC_TOURNAMENT_ID,
      tournamentDocument as unknown as Record<string, unknown>,
    );

    for (const team of teamDocuments) {
      await saveDocumentDirect(client, COLLECTIONS.teams, team.id, team as Record<string, unknown>);
    }

    for (const player of playerDocuments) {
      await saveDocumentDirect(client, COLLECTIONS.players, player.id, player as unknown as Record<string, unknown>);
    }

    for (const match of matchDocuments) {
      await saveDocumentDirect(client, COLLECTIONS.matches, match.id, match as unknown as Record<string, unknown>);
      await saveDocumentDirect(client, COLLECTIONS.tournamentMatches, match.id, match as unknown as Record<string, unknown>);
    }

    for (const standing of standingDocuments) {
      await saveDocumentDirect(client, COLLECTIONS.standings, standing.id, standing as unknown as Record<string, unknown>);
    }

    await deleteMissingDocuments(client, scopedExistingMatches, new Set(matchDocuments.map((match) => match.id)), COLLECTIONS.matches);
    await deleteMissingDocuments(
      client,
      scopedExistingTournamentMatches,
      new Set(matchDocuments.map((match) => match.id)),
      COLLECTIONS.tournamentMatches,
    );
    await deleteMissingDocuments(
      client,
      scopedExistingStandings,
      new Set(standingDocuments.map((standing) => standing.id)),
      COLLECTIONS.standings,
    );
    await deleteMissingDocuments(client, scopedExistingTournamentTeams, new Set(teamDocuments.map((team) => team.id)), COLLECTIONS.teams);
    await deleteMissingDocuments(
      client,
      scopedExistingTournamentPlayers,
      new Set(playerDocuments.map((player) => player.id)),
      COLLECTIONS.players,
    );

    return {
      sourceUrl,
      fetchedAt,
      sourceDataType: "HTML / JSON / API",
      rawSourceSaved: true,
      normalizedSourceSaved: true,
      tournamentName: publicTournamentTitle,
      sourceTournamentCode: payload.tournament.code,
      sourceTournamentUuid: payload.tournament.id,
      tournamentSlug: PUBLIC_TOURNAMENT_ID,
      eventStatus,
      game: "PUBG PC",
      mode: tournamentDocument.format,
      perspective: tournamentDocument.perspective ?? "TPP",
      startDate: tournamentDocument.startDate,
      endDate: tournamentDocument.endDate ?? null,
      teamsImported: teamDocuments.length,
      playersImported: playerDocuments.length,
      matchesImported: matchDocuments.length,
      leaderboardRowsImported: standingDocuments.length,
      winner: standingDocuments[0]?.teamName ?? null,
      top3Teams,
      topFragger: topFragger?.pubgName ?? null,
      prizePoolAvailable: (payload.tournament.prizePool ?? 0) > 0 ? tournamentDocument.prizePool : null,
      pointSystemAvailable,
      sourceRankPreserved: true,
      importAuditId: auditId,
      importStatus: "needs_review",
      duplicateSummary:
        createdCounts.teamsCreated === teamDocuments.length && createdCounts.playersCreated === playerDocuments.length
          ? "No existing tournament-scoped team or player records matched this source import."
          : "Existing team and/or player records were reused when source IDs or normalized names matched.",
      reviewNotes,
      fieldsUnavailableFromSource,
      created: createdCounts,
      updated: updatedCounts,
      artifactPaths: {
        rawHtmlPath: artifactPaths.rawHtmlPath,
        rawJsonPath: artifactPaths.rawJsonPath,
        normalizedJsonPath: artifactPaths.normalizedJsonPath,
      },
    } satisfies FirstOfficialTournamentImportResult;
  } finally {
    await client.end().catch(() => undefined);
  }
}
