import "server-only";

import { randomUUID } from "crypto";
import {
  compareMatchPlayerResults,
  compareMatchTeamResults,
  comparePlayerLeaderboardPerformance,
  compareTeamLeaderboardPerformance,
} from "./ranking-sort";
import { readJsonObject, sanitizeJsonValue } from "./json-utils";
import { DEFAULT_POINT_SYSTEM_ID, scoreMatchResults, type PointSystemRecord } from "./competition-scoring";
import { getSupabaseServiceRoleClient } from "./supabase/service-role-client";
import type {
  LeaderboardRow,
  MatchDataSource,
  MatchPlayerResult,
  Player,
  Season,
  Team,
  TeamMatchResult,
  Tournament,
  TournamentMatch,
} from "./types";
import type { Json, Tables, TablesInsert, TablesUpdate, Views } from "@/types/database.types";

type MatchSnapshot = Partial<TournamentMatch> & {
  teamResults?: TeamMatchResult[];
  playerResults?: MatchPlayerResult[];
};

type SaveCompetitionMatchOptions = {
  publish?: boolean;
};

const MATCH_SOURCE_MANUAL = "manual";

function cleanString(value?: string | null) {
  const normalizedValue = value?.trim();
  return normalizedValue ? normalizedValue : undefined;
}

function cleanStringArray(values?: string[] | null) {
  if (!values?.length) {
    return [];
  }

  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function toFiniteNumber(value: unknown, fallback = 0) {
  const numericValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
}

function toOptionalNumber(value: unknown) {
  const numericValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numericValue) ? numericValue : undefined;
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function looksLikeUuid(value?: string | null) {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value));
}

function normalizeMatchDataSource(value?: MatchDataSource | string | null) {
  if (value === "pubg_api" || value === "external_feed") {
    return value;
  }

  return "manual_correction" satisfies MatchDataSource;
}

function fromDatabaseMatchStatus(value: Tables<"matches">["status"] | null | undefined) {
  return value === "published" || value === "approved" ? "published" : "draft";
}

function toDatabaseMatchStatus(status?: "draft" | "published", publish = false): Tables<"matches">["status"] {
  if (publish || status === "published") {
    return "published";
  }

  return "pending";
}

function toTournamentStatus(row: Tables<"events">) {
  const competitionStatus = cleanString((row as Tables<"events"> & { competition_status?: string | null }).competition_status);
  if (
    competitionStatus === "LIVE" ||
    competitionStatus === "OPEN" ||
    competitionStatus === "REGISTERING" ||
    competitionStatus === "UPCOMING" ||
    competitionStatus === "COMPLETED"
  ) {
    return competitionStatus;
  }

  if (row.status === "completed") {
    return "COMPLETED";
  }

  if (row.status === "active") {
    return "LIVE";
  }

  return "UPCOMING";
}

function toEventStatus(value: Tournament["status"]): Tables<"events">["status"] {
  if (value === "LIVE") {
    return "active";
  }

  if (value === "COMPLETED") {
    return "completed";
  }

  return "draft";
}

function generateInternalMatchReference(eventName?: string) {
  const label = cleanString(eventName) ? slugify(eventName as string) : "match";
  return `manual-${label}-${randomUUID().slice(0, 8)}`;
}

function parseMatchSnapshot(rawJson: Json | null): MatchSnapshot | null {
  const snapshot = readJsonObject(rawJson);
  if (!snapshot) {
    return null;
  }

  return snapshot as MatchSnapshot;
}

function normalizeInputTeamResults(teamResults?: TeamMatchResult[] | null) {
  return (teamResults ?? []).map((teamResult) => ({
    ...teamResult,
    teamId: cleanString(teamResult.teamId),
    teamName: teamResult.teamName.trim(),
    slotNumber: toOptionalNumber(teamResult.slotNumber),
    placement: toFiniteNumber(teamResult.placement),
    kills: toFiniteNumber(teamResult.kills),
    damage: toFiniteNumber(teamResult.damage),
    placementPoints: toFiniteNumber(teamResult.placementPoints),
    killPoints: toFiniteNumber(teamResult.killPoints),
    totalPoints: toFiniteNumber(teamResult.totalPoints),
  }));
}

function normalizeInputPlayerResults(playerResults?: MatchPlayerResult[] | null) {
  return (playerResults ?? [])
    .filter((playerResult) => cleanString(playerResult.playerName))
    .map((playerResult) => ({
      ...playerResult,
      playerId: cleanString(playerResult.playerId) ?? "",
      playerName: playerResult.playerName.trim(),
      pubgPlayerId: cleanString(playerResult.pubgPlayerId),
      teamId: cleanString(playerResult.teamId),
      teamName: cleanString(playerResult.teamName) ?? "Team Pending",
      slotNumber: toOptionalNumber(playerResult.slotNumber),
      placement: toFiniteNumber(playerResult.placement),
      kills: toFiniteNumber(playerResult.kills),
      assists: toFiniteNumber(playerResult.assists),
      knocks: toFiniteNumber(playerResult.knocks),
      damage: toFiniteNumber(playerResult.damage),
      survivalTime: toFiniteNumber(playerResult.survivalTime),
      placementPoints: toFiniteNumber(playerResult.placementPoints),
      totalPoints: toFiniteNumber(playerResult.totalPoints),
    }));
}

function normalizeMatchInput(input: Partial<TournamentMatch>) {
  const playedAt = cleanString(input.playedAt) ?? new Date().toISOString();
  const eventName = cleanString(input.eventName);

  return {
    id: cleanString(input.id),
    tournamentId: cleanString(input.tournamentId),
    scrimId: cleanString(input.scrimId),
    pubgMatchId: cleanString(input.pubgMatchId) ?? generateInternalMatchReference(eventName),
    externalMatchId: cleanString(input.externalMatchId),
    sequenceNumber: toOptionalNumber(input.sequenceNumber),
    matchNumber: Math.max(1, toFiniteNumber(input.matchNumber ?? input.sequenceNumber, 1)),
    map: cleanString(input.map) ?? "Unknown",
    eventName,
    eventSlug: cleanString(input.eventSlug),
    status: input.status === "published" ? "published" : "draft",
    playedAt,
    vodUrl: cleanString(input.vodUrl),
    sourceUrl: cleanString(input.sourceUrl),
    scoreboardImageUrl: cleanString(input.scoreboardImageUrl),
    resultImageUrl: cleanString(input.resultImageUrl ?? input.resultScreenshotUrl),
    screenshotUrls: cleanStringArray(input.screenshotUrls),
    pointSystemId: cleanString(input.pointSystemId),
    pointSystemName: cleanString(input.pointSystemName),
    dataSource: normalizeMatchDataSource(input.dataSource),
    teamResults: normalizeInputTeamResults(input.teamResults),
    playerResults: normalizeInputPlayerResults(input.playerResults),
  } satisfies MatchSnapshot & {
    pubgMatchId: string;
    map: string;
    matchNumber: number;
    playedAt: string;
    status: "draft" | "published";
    dataSource: MatchDataSource;
  };
}

function mapSeasonRow(row: Tables<"seasons">): Season {
  return {
    id: row.id,
    title: row.name,
    slug: row.slug ?? slugify(row.name),
    seriesTitle: row.series_title ?? row.name,
    seasonNumber: row.season_number,
    status: row.status,
    startDate: row.start_date,
    configuredDays: row.configured_days,
    currentDay: row.current_day_number,
    currentTournamentId: row.current_event_id ?? undefined,
    endDate: row.end_date ?? undefined,
    completedAt: row.completed_at ?? undefined,
    archivedAt: row.archived_at ?? undefined,
    endedEarly: row.ended_early,
    notes: row.notes ?? undefined,
    description: row.description ?? undefined,
    game: row.game,
    format: row.format,
    region: row.region,
    perspective: row.perspective,
    sourceProvider: "supabase_relational",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapEventRow(row: Tables<"events">, registeredTeamIds: string[]): Tournament {
  return {
    id: row.id,
    title: row.name ?? row.title,
    tier: (row as Tables<"events"> & { tier?: string | null }).tier ?? "OPEN",
    status: toTournamentStatus(row),
    prizePool: row.prize_pool ?? "TBD",
    teamCount: Math.max((row as Tables<"events"> & { team_count?: number }).team_count ?? 0, registeredTeamIds.length),
    maxTeams: Math.max(1, (row as Tables<"events"> & { max_teams?: number }).max_teams ?? 32),
    startDate: row.start_date ?? new Date().toISOString(),
    endDate: row.end_date ?? undefined,
    format: row.mode ?? "Squad",
    mode: row.game,
    server: (row as Tables<"events"> & { server?: string | null }).server ?? row.region ?? "Global",
    perspective: row.perspective ?? undefined,
    description: row.description ?? undefined,
    rules: row.rules ?? undefined,
    schedule: (row as Tables<"events"> & { schedule?: string | null }).schedule ?? undefined,
    mapRotation: Array.isArray((row as Tables<"events"> & { map_rotation?: Json | null }).map_rotation)
      ? ((row as Tables<"events"> & { map_rotation?: Json | null }).map_rotation as string[])
      : [],
    bannerUrl: row.banner_url ?? undefined,
    registeredTeamIds,
    seasonId: row.season_id ?? undefined,
    seasonDayNumber: (row as Tables<"events"> & { season_day_number?: number | null }).season_day_number ?? undefined,
    dayNumber: (row as Tables<"events"> & { season_day_number?: number | null }).season_day_number ?? undefined,
    matchCount: (row as Tables<"events"> & { match_count?: number | null }).match_count ?? undefined,
    sourceUrl: (row as Tables<"events"> & { source_url?: string | null }).source_url ?? undefined,
    sourceProvider: "supabase_relational",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapTeamRow(
  row: Tables<"teams">,
  standing?: Views<"team_leaderboard"> | null,
  playerIds?: string[]
): Team {
  const normalizedStatus = row.status === "pending" || row.status === "inactive" ? row.status : "active";

  return {
    id: row.id,
    slug: row.slug ?? slugify(row.name),
    name: row.name,
    tag: row.tag ?? undefined,
    slotNumber: row.slot_number ?? undefined,
    logo: row.logo_url ?? undefined,
    logoUrl: row.logo_url ?? undefined,
    country: row.region ?? undefined,
    rank: standing?.rank ?? undefined,
    totalPoints: standing?.total_points ?? 0,
    kills: standing?.total_kills ?? 0,
    matches: standing?.matches_played ?? 0,
    placementPoints: standing?.placement_points ?? undefined,
    chickenDinners: standing?.chicken_dinners ?? undefined,
    status: normalizedStatus,
    registrationStatus: "approved",
    playerIds: playerIds ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapPlayerRow(
  row: Tables<"players">,
  leaderboard?: Views<"player_leaderboard"> | null,
  mvpRanking?: Views<"mvp_rankings"> | null
): Player {
  return {
    id: row.id,
    slug: row.slug ?? slugify(row.pubg_name),
    name: row.display_name ?? row.pubg_name,
    inGameName: row.display_name ?? row.pubg_name,
    teamId: row.current_team_id ?? undefined,
    teamName: leaderboard?.team_name ?? undefined,
    avatar: row.avatar_url ?? row.photo_url ?? undefined,
    avatarUrl: row.avatar_url ?? row.photo_url ?? undefined,
    pubgId: row.pubg_account_id ?? undefined,
    pubgName: row.pubg_name,
    kills: leaderboard?.total_kills ?? 0,
    assists: leaderboard?.total_assists ?? 0,
    damage: leaderboard?.total_damage ?? 0,
    matches: leaderboard?.matches_played ?? 0,
    mvpCount: mvpRanking?.mvp_awards ?? 0,
    chickenDinners: 0,
    rating: leaderboard?.total_kills ?? 0,
    playerStatus: row.is_active ? "active" : "inactive",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getEventTeamMap(eventIds: string[]) {
  const client = getSupabaseServiceRoleClient();
  if (eventIds.length === 0) {
    return new Map<string, string[]>();
  }

  const { data, error } = await client.from("event_teams").select("event_id,team_id").in("event_id", eventIds);
  if (error) {
    throw error;
  }

  const teamMap = new Map<string, string[]>();
  for (const row of data ?? []) {
    const currentValue = teamMap.get(row.event_id) ?? [];
    currentValue.push(row.team_id);
    teamMap.set(row.event_id, currentValue);
  }

  return teamMap;
}

async function getPointSystem(pointSystemId?: string | null, fallbackPointSystemId?: string | null): Promise<PointSystemRecord> {
  const client = getSupabaseServiceRoleClient();
  const requestedIds = [pointSystemId, fallbackPointSystemId, DEFAULT_POINT_SYSTEM_ID].filter(
    (value): value is string => Boolean(value)
  );

  for (const id of requestedIds) {
    const { data, error } = await client
      .from("point_systems")
      .select("id,name,kill_points,placement_points,rules_json")
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (data) {
      return data as PointSystemRecord;
    }
  }

  const { data, error } = await client
    .from("point_systems")
    .select("id,name,kill_points,placement_points,rules_json")
    .eq("active", true)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("No active point system is configured.");
  }

  return data as PointSystemRecord;
}

export async function listCompetitionPointSystems() {
  const client = getSupabaseServiceRoleClient();
  const { data, error } = await client
    .from("point_systems")
    .select("id,name,kill_points,placement_points,rules_json,active")
    .is("deleted_at", null)
    .order("active", { ascending: false })
    .order("updated_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as Array<PointSystemRecord & { active: boolean }>;
}

export async function listCompetitionSeasons() {
  const client = getSupabaseServiceRoleClient();
  const { data, error } = await client.from("seasons").select("*").order("start_date", { ascending: false });

  if (error) {
    throw error;
  }

  return ((data ?? []) as Tables<"seasons">[]).map(mapSeasonRow);
}

export async function getCompetitionSeason(idOrSlug: string) {
  const client = getSupabaseServiceRoleClient();
  const value = idOrSlug.trim();
  const byId = looksLikeUuid(value)
    ? await client.from("seasons").select("*").eq("id", value).maybeSingle()
    : { data: null, error: null };

  if (byId.error) {
    throw byId.error;
  }

  if (byId.data) {
    return mapSeasonRow(byId.data as Tables<"seasons">);
  }

  const { data, error } = await client.from("seasons").select("*").eq("slug", value.toLowerCase()).maybeSingle();
  if (error) {
    throw error;
  }

  return data ? mapSeasonRow(data as Tables<"seasons">) : null;
}

export async function getCurrentCompetitionSeason() {
  const seasons = await listCompetitionSeasons();
  return seasons.find((season) => season.status === "active") ?? seasons.find((season) => season.status === "planned") ?? seasons[0] ?? null;
}

export async function saveCompetitionSeason(data: Partial<Season> & { title: string }, id?: string) {
  const client = getSupabaseServiceRoleClient();
  const now = new Date().toISOString();
  const payload: TablesInsert<"seasons"> = {
    id: id ?? data.id ?? randomUUID(),
    name: data.title.trim(),
    slug: cleanString(data.slug) ?? slugify(data.title),
    series_title: cleanString(data.seriesTitle) ?? data.title.trim(),
    season_number: Math.max(1, toFiniteNumber(data.seasonNumber, 1)),
    status: data.status ?? "planned",
    start_date: cleanString(data.startDate) ?? new Date().toISOString().slice(0, 10),
    end_date: cleanString(data.endDate) ?? null,
    current_day_number: Math.max(0, toFiniteNumber(data.currentDay, 0)),
    configured_days: Math.max(1, toFiniteNumber(data.configuredDays, 15)),
    current_event_id: cleanString(data.currentTournamentId) ?? null,
    completed_at: cleanString(data.completedAt) ?? null,
    archived_at: cleanString(data.archivedAt) ?? null,
    ended_early: Boolean(data.endedEarly),
    notes: cleanString(data.notes) ?? null,
    description: cleanString(data.description) ?? null,
    game: cleanString(data.game) ?? "PUBG PC",
    format: cleanString(data.format) ?? "Squad",
    region: cleanString(data.region) ?? "Global",
    perspective: cleanString(data.perspective) ?? "TPP",
    created_at: data.createdAt ?? now,
    updated_at: now,
    type: "scrims",
  };

  const { data: result, error } = await client.from("seasons").upsert(payload).select("*").single();
  if (error) {
    throw error;
  }

  return mapSeasonRow(result as Tables<"seasons">);
}

export async function deleteCompetitionSeason(id: string) {
  const client = getSupabaseServiceRoleClient();
  const { error } = await client.from("seasons").delete().eq("id", id);
  if (error) {
    throw error;
  }

  return { id, deleted: true };
}

export async function listCompetitionEvents(status?: Tournament["status"]) {
  const client = getSupabaseServiceRoleClient();
  const { data, error } = await client
    .from("events")
    .select("*")
    .is("deleted_at", null)
    .order("start_date", { ascending: false });

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as Tables<"events">[];
  const teamMap = await getEventTeamMap(rows.map((row) => row.id));
  const tournaments = rows.map((row) => mapEventRow(row, teamMap.get(row.id) ?? []));

  return status ? tournaments.filter((tournament) => tournament.status === status) : tournaments;
}

export async function getCompetitionEvent(idOrSlug: string) {
  const client = getSupabaseServiceRoleClient();
  const value = idOrSlug.trim();
  const byId = looksLikeUuid(value)
    ? await client.from("events").select("*").eq("id", value).is("deleted_at", null).maybeSingle()
    : { data: null, error: null };

  if (byId.error) {
    throw byId.error;
  }

  const row = byId.data
    ? (byId.data as Tables<"events">)
    : (
        (
          await client.from("events").select("*").eq("slug", value.toLowerCase()).is("deleted_at", null).maybeSingle()
        ).data as Tables<"events"> | null
      );

  if (!row) {
    return null;
  }

  const teamMap = await getEventTeamMap([row.id]);
  return mapEventRow(row, teamMap.get(row.id) ?? []);
}

export async function saveCompetitionEvent(data: Partial<Tournament> & { title: string }, id?: string) {
  const client = getSupabaseServiceRoleClient();
  const now = new Date().toISOString();
  const registeredTeamIds = cleanStringArray(data.registeredTeamIds);
  const eventId = id ?? data.id ?? randomUUID();
  const competitionStatus = data.status ?? "UPCOMING";
  const payload: TablesInsert<"events"> = {
    id: eventId,
    season_id: cleanString(data.seasonId) ?? null,
    title: data.title.trim(),
    name: data.title.trim(),
    slug: cleanString((data as Partial<Tournament> & { slug?: string }).slug) ?? slugify(data.title),
    event_type: data.seasonDayNumber ? "scrim_day" : "tournament",
    type: data.seasonDayNumber ? "scrim_day" : "tournament",
    game: cleanString(data.mode) ?? "PUBG PC",
    mode: cleanString(data.format) ?? "Squad",
    perspective: cleanString(data.perspective) ?? null,
    status: toEventStatus(competitionStatus),
    description: cleanString(data.description) ?? null,
    banner_url: cleanString(data.bannerUrl) ?? null,
    start_date: cleanString(data.startDate) ?? now,
    end_date: cleanString(data.endDate) ?? null,
    region: cleanString((data as Tournament & { region?: string }).region) ?? cleanString(data.server) ?? "Global",
    tier: cleanString(data.tier) ?? "OPEN",
    competition_status: competitionStatus,
    prize_pool: cleanString(data.prizePool) ?? "TBD",
    rules: cleanString(data.rules) ?? null,
    server: cleanString(data.server) ?? null,
    schedule: cleanString(data.schedule) ?? null,
    map_rotation: sanitizeJsonValue(cleanStringArray(data.mapRotation)) ?? [],
    max_teams: Math.max(1, toFiniteNumber(data.maxTeams, 32)),
    team_count: Math.max(registeredTeamIds.length, toFiniteNumber(data.teamCount, registeredTeamIds.length)),
    season_day_number: toOptionalNumber(data.seasonDayNumber ?? data.dayNumber) ?? null,
    match_count: Math.max(0, toFiniteNumber(data.matchCount, 0)),
    source_url: cleanString(data.sourceUrl) ?? null,
    published: true,
    published_at: now,
    created_at: data.createdAt ?? now,
    updated_at: now,
  };

  const { data: result, error } = await client.from("events").upsert(payload).select("*").single();
  if (error) {
    throw error;
  }

  await client.from("event_teams").delete().eq("event_id", eventId);
  if (registeredTeamIds.length > 0) {
    const eventTeams: TablesInsert<"event_teams">[] = registeredTeamIds.map((teamId, index) => ({
      event_id: eventId,
      team_id: teamId,
      slot_number: index + 1,
      status: "registered",
    }));

    const { error: eventTeamsError } = await client.from("event_teams").insert(eventTeams);
    if (eventTeamsError) {
      throw eventTeamsError;
    }
  }

  return mapEventRow(result as Tables<"events">, registeredTeamIds);
}

export async function deleteCompetitionEvent(id: string) {
  const client = getSupabaseServiceRoleClient();
  const { error } = await client
    .from("events")
    .update({
      deleted_at: new Date().toISOString(),
      published: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    throw error;
  }

  return { id, deleted: true };
}

async function getCompetitionTeamLookup() {
  const client = getSupabaseServiceRoleClient();
  const { data, error } = await client.from("teams").select("*").is("deleted_at", null);
  if (error) {
    throw error;
  }

  const byId = new Map<string, Tables<"teams">>();
  const byName = new Map<string, Tables<"teams">[]>();
  const bySlug = new Map<string, Tables<"teams">[]>();

  for (const team of (data ?? []) as Tables<"teams">[]) {
    byId.set(team.id, team);
    const normalizedName = team.name.trim().toLowerCase();
    const nameEntries = byName.get(normalizedName) ?? [];
    nameEntries.push(team);
    byName.set(normalizedName, nameEntries);

    if (team.slug) {
      const normalizedSlug = team.slug.trim().toLowerCase();
      const slugEntries = bySlug.get(normalizedSlug) ?? [];
      slugEntries.push(team);
      bySlug.set(normalizedSlug, slugEntries);
    }
  }

  return { byId, byName, bySlug };
}

function resolveTeamCandidate(
  candidates: Tables<"teams">[] | undefined,
  eventTeamIds?: ReadonlySet<string>
) {
  if (!candidates?.length) {
    return null;
  }

  if (eventTeamIds?.size) {
    const eventScopedMatch = candidates.find((team) => eventTeamIds.has(team.id));
    if (eventScopedMatch) {
      return eventScopedMatch;
    }
  }

  return candidates[0] ?? null;
}

async function getCompetitionPlayerLookup() {
  const client = getSupabaseServiceRoleClient();
  const { data, error } = await client.from("players").select("*").is("deleted_at", null);
  if (error) {
    throw error;
  }

  const byId = new Map<string, Tables<"players">>();
  const byPubgAccountId = new Map<string, Tables<"players">>();
  const byName = new Map<string, Tables<"players">>();

  for (const player of (data ?? []) as Tables<"players">[]) {
    byId.set(player.id, player);
    if (player.pubg_account_id) {
      byPubgAccountId.set(player.pubg_account_id.trim().toLowerCase(), player);
    }

    byName.set(player.pubg_name.trim().toLowerCase(), player);
    if (player.display_name) {
      byName.set(player.display_name.trim().toLowerCase(), player);
    }
  }

  return { byId, byPubgAccountId, byName };
}

async function findOrCreateTeam(
  teamResult: TeamMatchResult,
  createIfMissing: boolean,
  teamLookup: Awaited<ReturnType<typeof getCompetitionTeamLookup>>,
  options: {
    eventTeamIds?: ReadonlySet<string>;
    region?: string | null;
  } = {}
) {
  const existingTeam =
    (looksLikeUuid(teamResult.teamId) ? teamLookup.byId.get(teamResult.teamId as string) : null) ??
    resolveTeamCandidate(teamLookup.byName.get(teamResult.teamName.trim().toLowerCase()), options.eventTeamIds) ??
    resolveTeamCandidate(teamLookup.bySlug.get(slugify(teamResult.teamName)), options.eventTeamIds);

  if (existingTeam) {
    return existingTeam;
  }

  if (!createIfMissing) {
    return null;
  }

  const client = getSupabaseServiceRoleClient();
  const payload: TablesInsert<"teams"> = {
    id: randomUUID(),
    name: teamResult.teamName,
    slug: slugify(teamResult.teamName),
    tag: null,
    slot_number: teamResult.slotNumber ?? null,
    region: cleanString(options.region) ?? "Global",
    is_active: true,
    status: "active",
  };

  const { data, error } = await client.from("teams").insert(payload).select("*").single();
  if (error) {
    const fallbackLookup = await getCompetitionTeamLookup();
    return (
      resolveTeamCandidate(fallbackLookup.byName.get(teamResult.teamName.trim().toLowerCase()), options.eventTeamIds) ??
      resolveTeamCandidate(fallbackLookup.bySlug.get(slugify(teamResult.teamName)), options.eventTeamIds) ??
      null
    );
  }

  const team = data as Tables<"teams">;
  teamLookup.byId.set(team.id, team);
  const normalizedName = team.name.trim().toLowerCase();
  const nameEntries = teamLookup.byName.get(normalizedName) ?? [];
  nameEntries.push(team);
  teamLookup.byName.set(normalizedName, nameEntries);
  if (team.slug) {
    const normalizedSlug = team.slug.trim().toLowerCase();
    const slugEntries = teamLookup.bySlug.get(normalizedSlug) ?? [];
    slugEntries.push(team);
    teamLookup.bySlug.set(normalizedSlug, slugEntries);
  }

  return team;
}

async function findOrCreatePlayer(
  playerResult: MatchPlayerResult,
  resolvedTeamId: string | null,
  createIfMissing: boolean,
  playerLookup: Awaited<ReturnType<typeof getCompetitionPlayerLookup>>
) {
  const normalizedPubgAccountId = cleanString(playerResult.pubgPlayerId)?.toLowerCase();
  const existingPlayerById = looksLikeUuid(playerResult.playerId)
    ? playerLookup.byId.get(playerResult.playerId)
    : undefined;
  const existingPlayerByPubgAccountId = normalizedPubgAccountId
    ? playerLookup.byPubgAccountId.get(normalizedPubgAccountId)
    : undefined;
  const existingPlayer =
    existingPlayerById ??
    existingPlayerByPubgAccountId ??
    playerLookup.byName.get(playerResult.playerName.trim().toLowerCase()) ??
    null;

  if (existingPlayer) {
    const client = getSupabaseServiceRoleClient();
    if (resolvedTeamId && existingPlayer.current_team_id !== resolvedTeamId) {
      await client.from("players").update({ current_team_id: resolvedTeamId, updated_at: new Date().toISOString() }).eq("id", existingPlayer.id);
    }

    return existingPlayer;
  }

  if (!createIfMissing) {
    return null;
  }

  const client = getSupabaseServiceRoleClient();
  const payload: TablesInsert<"players"> = {
    id: randomUUID(),
    pubg_account_id: cleanString(playerResult.pubgPlayerId) ?? null,
    pubg_name: playerResult.playerName,
    display_name: playerResult.playerName,
    current_team_id: resolvedTeamId,
    avatar_url: null,
    is_active: true,
    slug: slugify(playerResult.playerName),
  };

  const { data, error } = await client.from("players").insert(payload).select("*").single();
  if (error) {
    const fallbackLookup = await getCompetitionPlayerLookup();
    const fallbackPlayerByPubgAccountId = normalizedPubgAccountId
      ? fallbackLookup.byPubgAccountId.get(normalizedPubgAccountId)
      : undefined;
    return (
      fallbackPlayerByPubgAccountId ??
      fallbackLookup.byName.get(playerResult.playerName.trim().toLowerCase()) ??
      null
    );
  }

  const player = data as Tables<"players">;
  playerLookup.byId.set(player.id, player);
  if (player.pubg_account_id) {
    playerLookup.byPubgAccountId.set(player.pubg_account_id.trim().toLowerCase(), player);
  }
  playerLookup.byName.set(player.pubg_name.trim().toLowerCase(), player);
  if (player.display_name) {
    playerLookup.byName.set(player.display_name.trim().toLowerCase(), player);
  }

  return player;
}

async function getMatchRows(matchIds: string[]) {
  const client = getSupabaseServiceRoleClient();
  if (matchIds.length === 0) {
    return {
      teamResults: [] as Tables<"match_team_results">[],
      playerResults: [] as Tables<"match_player_results">[],
    };
  }

  const [{ data: teamResults, error: teamResultsError }, { data: playerResults, error: playerResultsError }] = await Promise.all([
    client.from("match_team_results").select("*").in("match_id", matchIds),
    client.from("match_player_results").select("*").in("match_id", matchIds),
  ]);

  if (teamResultsError) {
    throw teamResultsError;
  }

  if (playerResultsError) {
    throw playerResultsError;
  }

  return {
    teamResults: (teamResults ?? []) as Tables<"match_team_results">[],
    playerResults: (playerResults ?? []) as Tables<"match_player_results">[],
  };
}

async function hydrateCompetitionMatches(matchRows: Tables<"matches">[]) {
  const client = getSupabaseServiceRoleClient();
  const matchIds = matchRows.map((row) => row.id);
  const { teamResults, playerResults } = await getMatchRows(matchIds);
  const eventIds = Array.from(new Set(matchRows.map((row) => row.event_id).filter((value): value is string => Boolean(value))));
  const pointSystemIds = Array.from(new Set(matchRows.map((row) => row.point_system_id).filter((value): value is string => Boolean(value))));
  const teamIds = Array.from(new Set(teamResults.map((row) => row.team_id).filter((value): value is string => Boolean(value))));
  const playerIds = Array.from(new Set(playerResults.map((row) => row.player_id).filter((value): value is string => Boolean(value))));

  const [{ data: events }, { data: pointSystems }, { data: teams }, { data: players }] = await Promise.all([
    eventIds.length > 0 ? client.from("events").select("*").in("id", eventIds) : Promise.resolve({ data: [] as Tables<"events">[] }),
    pointSystemIds.length > 0
      ? client.from("point_systems").select("id,name").in("id", pointSystemIds)
      : Promise.resolve({ data: [] as Array<Pick<Tables<"point_systems">, "id" | "name">> }),
    teamIds.length > 0 ? client.from("teams").select("id,name").in("id", teamIds) : Promise.resolve({ data: [] as Array<Pick<Tables<"teams">, "id" | "name">> }),
    playerIds.length > 0
      ? client.from("players").select("id,pubg_name,display_name,pubg_account_id").in("id", playerIds)
      : Promise.resolve({ data: [] as Array<Pick<Tables<"players">, "id" | "pubg_name" | "display_name" | "pubg_account_id">> }),
  ]);

  const eventById = new Map(((events ?? []) as Tables<"events">[]).map((event) => [event.id, event] as const));
  const pointSystemNameById = new Map((pointSystems ?? []).map((pointSystem) => [pointSystem.id, pointSystem.name] as const));
  const teamNameById = new Map((teams ?? []).map((team) => [team.id, team.name] as const));
  const playerById = new Map((players ?? []).map((player) => [player.id, player] as const));

  const teamResultsByMatchId = new Map<string, TeamMatchResult[]>();
  for (const teamResult of teamResults) {
    const currentValue = teamResultsByMatchId.get(teamResult.match_id) ?? [];
    currentValue.push({
      teamId: teamResult.team_id ?? undefined,
      teamName: teamResult.team_name ?? (teamResult.team_id ? teamNameById.get(teamResult.team_id) ?? "Team Pending" : "Team Pending"),
      slotNumber: teamResult.slot_number ?? undefined,
      placement: teamResult.placement,
      kills: teamResult.kills,
      damage: 0,
      placementPoints: teamResult.placement_points,
      killPoints: teamResult.kill_points,
      totalPoints: teamResult.total_points,
    });
    teamResultsByMatchId.set(teamResult.match_id, currentValue);
  }

  const playerResultsByMatchId = new Map<string, MatchPlayerResult[]>();
  for (const playerResult of playerResults) {
    const currentValue = playerResultsByMatchId.get(playerResult.match_id) ?? [];
    const player = playerResult.player_id ? playerById.get(playerResult.player_id) ?? null : null;
    currentValue.push({
      playerId: playerResult.player_id ?? playerResult.pubg_account_id ?? slugify(playerResult.player_name ?? "player"),
      playerName: playerResult.player_name ?? player?.display_name ?? player?.pubg_name ?? "Player Pending",
      pubgPlayerId: playerResult.pubg_account_id ?? player?.pubg_account_id ?? undefined,
      teamId: playerResult.team_id ?? undefined,
      teamName: playerResult.team_name ?? (playerResult.team_id ? teamNameById.get(playerResult.team_id) ?? "Team Pending" : "Team Pending"),
      slotNumber: playerResult.slot_number ?? undefined,
      placement: playerResult.placement,
      kills: playerResult.kills,
      assists: playerResult.assists,
      knocks: playerResult.knocks,
      damage: playerResult.damage,
      survivalTime: playerResult.survival_time,
      placementPoints: playerResult.placement_points,
      totalPoints: playerResult.total_points,
    });
    playerResultsByMatchId.set(playerResult.match_id, currentValue);
  }

  return matchRows.map((row) => {
    const snapshot = parseMatchSnapshot(row.raw_json);
    const storedTeamResults = teamResultsByMatchId.get(row.id);
    const storedPlayerResults = playerResultsByMatchId.get(row.id);
    const event = row.event_id ? eventById.get(row.event_id) ?? null : null;
    const teamResultsValue = storedTeamResults && storedTeamResults.length > 0 ? storedTeamResults : normalizeInputTeamResults(snapshot?.teamResults);
    const playerResultsValue =
      storedPlayerResults && storedPlayerResults.length > 0 ? storedPlayerResults : normalizeInputPlayerResults(snapshot?.playerResults);
    teamResultsValue.sort((firstValue, secondValue) => compareMatchTeamResults(firstValue, secondValue));
    playerResultsValue.sort((firstValue, secondValue) => compareMatchPlayerResults(firstValue, secondValue));
    const winner = teamResultsValue[0]?.teamName ?? cleanString(snapshot?.winner) ?? "Winner Pending";

    return {
      id: row.id,
      tournamentId: row.event_id ?? undefined,
      scrimId: cleanString(snapshot?.scrimId),
      pubgMatchId: row.match_id,
      externalMatchId: row.external_match_id ?? undefined,
      sequenceNumber: row.match_number,
      matchNumber: row.match_number,
      map: row.map_name ?? row.map,
      eventName: event?.name ?? event?.title ?? cleanString(snapshot?.eventName),
      eventSlug: event?.slug ?? cleanString(snapshot?.eventSlug),
      status: fromDatabaseMatchStatus(row.status),
      winner,
      points: teamResultsValue[0]?.totalPoints ?? toFiniteNumber(snapshot?.points),
      knockouts: teamResultsValue.reduce((sum, teamResult) => sum + teamResult.kills, 0),
      placementPoints: teamResultsValue[0]?.placementPoints ?? toFiniteNumber(snapshot?.placementPoints),
      killPoints: teamResultsValue[0]?.killPoints ?? toFiniteNumber(snapshot?.killPoints),
      playedAt: row.start_time ?? row.match_date,
      vodUrl: row.vod_url ?? cleanString(snapshot?.vodUrl),
      sourceUrl: row.source_url ?? cleanString(snapshot?.sourceUrl),
      scoreboardImageUrl: row.scoreboard_image_url ?? cleanString(snapshot?.scoreboardImageUrl),
      resultImageUrl: row.result_image_url ?? cleanString(snapshot?.resultImageUrl),
      screenshotUrls: Array.isArray(row.screenshot_urls)
        ? (row.screenshot_urls as string[])
        : cleanStringArray(snapshot?.screenshotUrls),
      pointSystemId: row.point_system_id ?? cleanString(snapshot?.pointSystemId),
      pointSystemName:
        (row.point_system_id ? pointSystemNameById.get(row.point_system_id) : undefined) ??
        cleanString(snapshot?.pointSystemName),
      dataSource: row.data_source === "pubg_api" || row.data_source === "external_feed" ? row.data_source : "manual_correction",
      syncedAt: row.updated_at,
      publishedAt: row.published_at ?? undefined,
      deletedAt: row.deleted_at ?? undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      teamResults: teamResultsValue,
      playerResults: playerResultsValue,
    } satisfies TournamentMatch;
  });
}

export async function listCompetitionMatches(limit = 200) {
  const client = getSupabaseServiceRoleClient();
  const { data, error } = await client
    .from("matches")
    .select("*")
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return hydrateCompetitionMatches((data ?? []) as Tables<"matches">[]);
}

export async function getCompetitionMatch(id: string) {
  const client = getSupabaseServiceRoleClient();
  const { data, error } = await client.from("matches").select("*").eq("id", id).is("deleted_at", null).maybeSingle();
  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const [match] = await hydrateCompetitionMatches([data as Tables<"matches">]);
  return match ?? null;
}

export async function getCompetitionMatchesForEvent(eventId: string, options: { includeDrafts?: boolean } = {}) {
  const client = getSupabaseServiceRoleClient();
  let query = client.from("matches").select("*").eq("event_id", eventId).is("deleted_at", null).order("match_number", { ascending: true });
  if (!options.includeDrafts) {
    query = query.in("status", ["approved", "published"]);
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  return hydrateCompetitionMatches((data ?? []) as Tables<"matches">[]);
}

export async function previewCompetitionMatch(input: Partial<TournamentMatch>) {
  const client = getSupabaseServiceRoleClient();
  const normalizedInput = normalizeMatchInput(input);
  if (!normalizedInput.tournamentId) {
    throw new Error("An event is required before previewing a match.");
  }

  const { data: event, error: eventError } = await client
    .from("events")
    .select("*")
    .eq("id", normalizedInput.tournamentId)
    .is("deleted_at", null)
    .maybeSingle();

  if (eventError) {
    throw eventError;
  }

  if (!event) {
    throw new Error("The selected event could not be found.");
  }

  const pointSystem = await getPointSystem(normalizedInput.pointSystemId, event.point_system_id);
  const scored = scoreMatchResults(normalizedInput.teamResults, normalizedInput.playerResults, pointSystem);

  return {
    id: normalizedInput.id ?? undefined,
    tournamentId: normalizedInput.tournamentId,
    scrimId: normalizedInput.scrimId,
    pubgMatchId: normalizedInput.pubgMatchId,
    externalMatchId: normalizedInput.externalMatchId,
    matchNumber: normalizedInput.matchNumber,
    sequenceNumber: normalizedInput.matchNumber,
    map: normalizedInput.map,
    eventName: event.name ?? event.title,
    eventSlug: event.slug ?? undefined,
    status: normalizedInput.status,
    winner: scored.winner,
    points: scored.totalPoints,
    knockouts: scored.totalKills,
    placementPoints: scored.placementPoints,
    killPoints: scored.killPoints,
    playedAt: normalizedInput.playedAt,
    vodUrl: normalizedInput.vodUrl,
    sourceUrl: normalizedInput.sourceUrl,
    scoreboardImageUrl: normalizedInput.scoreboardImageUrl,
    resultImageUrl: normalizedInput.resultImageUrl,
    screenshotUrls: normalizedInput.screenshotUrls,
    pointSystemId: pointSystem.id,
    pointSystemName: pointSystem.name,
    dataSource: normalizedInput.dataSource,
    teamResults: scored.teamResults,
    playerResults: scored.playerResults,
  } satisfies TournamentMatch;
}

function buildStoredMatchSnapshot(match: TournamentMatch) {
  return (sanitizeJsonValue({
    tournamentId: match.tournamentId,
    scrimId: match.scrimId,
    pubgMatchId: match.pubgMatchId,
    externalMatchId: match.externalMatchId,
    matchNumber: match.matchNumber,
    sequenceNumber: match.sequenceNumber,
    map: match.map,
    eventName: match.eventName,
    eventSlug: match.eventSlug,
    status: match.status,
    winner: match.winner,
    points: match.points,
    knockouts: match.knockouts,
    placementPoints: match.placementPoints,
    killPoints: match.killPoints,
    playedAt: match.playedAt,
    vodUrl: match.vodUrl,
    sourceUrl: match.sourceUrl,
    scoreboardImageUrl: match.scoreboardImageUrl,
    resultImageUrl: match.resultImageUrl,
    screenshotUrls: match.screenshotUrls,
    pointSystemId: match.pointSystemId,
    pointSystemName: match.pointSystemName,
    dataSource: match.dataSource,
    teamResults: match.teamResults,
    playerResults: match.playerResults,
  }) ?? null) as Json | null;
}

async function replaceMatchResults(
  matchId: string,
  preview: TournamentMatch,
  options: { publish: boolean; region?: string | null; eventId: string }
) {
  const client = getSupabaseServiceRoleClient();
  const teamLookup = await getCompetitionTeamLookup();
  const playerLookup = await getCompetitionPlayerLookup();
  const createMissingEntities = options.publish;
  const eventTeamMap = await getEventTeamMap([options.eventId]);
  const eventTeamIds = new Set(eventTeamMap.get(options.eventId) ?? []);

  const teamRows: TablesInsert<"match_team_results">[] = [];
  const playerRows: TablesInsert<"match_player_results">[] = [];
  const publishedTeamIds: string[] = [];

  for (const teamResult of preview.teamResults ?? []) {
    const resolvedTeam = await findOrCreateTeam(teamResult, createMissingEntities, teamLookup, {
      eventTeamIds,
      region: options.region,
    });
    if (resolvedTeam?.id) {
      publishedTeamIds.push(resolvedTeam.id);
    }

    teamRows.push({
      match_id: matchId,
      team_id: resolvedTeam?.id ?? (looksLikeUuid(teamResult.teamId) ? teamResult.teamId ?? null : null),
      team_name: teamResult.teamName,
      slot_number: teamResult.slotNumber ?? null,
      placement: teamResult.placement,
      kills: teamResult.kills,
      placement_points: Math.round(teamResult.placementPoints),
      kill_points: teamResult.killPoints,
      total_points: teamResult.totalPoints,
      wwcd: teamResult.placement === 1,
    });
  }

  for (const playerResult of preview.playerResults ?? []) {
    const teamMatch = teamRows.find(
      (teamRow) =>
        (teamRow.team_id && playerResult.teamId && teamRow.team_id === playerResult.teamId) ||
        (teamRow.slot_number && playerResult.slotNumber && teamRow.slot_number === playerResult.slotNumber) ||
        (teamRow.team_name && teamRow.team_name.trim().toLowerCase() === playerResult.teamName.trim().toLowerCase())
    );
    const resolvedPlayer = await findOrCreatePlayer(
      playerResult,
      teamMatch?.team_id ?? null,
      createMissingEntities,
      playerLookup
    );

    playerRows.push({
      match_id: matchId,
      player_id: resolvedPlayer?.id ?? (looksLikeUuid(playerResult.playerId) ? playerResult.playerId : null),
      player_name: playerResult.playerName,
      pubg_account_id: cleanString(playerResult.pubgPlayerId) ?? null,
      team_id: teamMatch?.team_id ?? null,
      team_name: playerResult.teamName,
      slot_number: playerResult.slotNumber ?? null,
      placement: playerResult.placement,
      kills: playerResult.kills,
      assists: playerResult.assists,
      knocks: playerResult.knocks,
      damage: Math.round(playerResult.damage),
      survival_time: Math.round(playerResult.survivalTime),
      placement_points: Math.round(playerResult.placementPoints),
      total_points: playerResult.totalPoints,
    });
  }

  const { error: deleteTeamResultsError } = await client.from("match_team_results").delete().eq("match_id", matchId);
  if (deleteTeamResultsError) {
    throw deleteTeamResultsError;
  }

  const { error: deletePlayerResultsError } = await client.from("match_player_results").delete().eq("match_id", matchId);
  if (deletePlayerResultsError) {
    throw deletePlayerResultsError;
  }

  if (teamRows.length > 0) {
    const { error } = await client.from("match_team_results").insert(teamRows);
    if (error) {
      throw error;
    }
  }

  if (playerRows.length > 0) {
    const { error } = await client.from("match_player_results").insert(playerRows);
    if (error) {
      throw error;
    }
  }

  if (options.publish && publishedTeamIds.length > 0) {
    const uniqueTeamIds = Array.from(new Set(publishedTeamIds));
    const eventTeams: TablesInsert<"event_teams">[] = uniqueTeamIds.map((teamId) => ({
      event_id: options.eventId,
      team_id: teamId,
      status: "registered",
    }));
    const { error } = await client.from("event_teams").upsert(eventTeams, { onConflict: "event_id,team_id" });
    if (error) {
      throw error;
    }
  }
}

export async function saveCompetitionMatch(input: Partial<TournamentMatch>, options: SaveCompetitionMatchOptions = {}) {
  const client = getSupabaseServiceRoleClient();
  const preview = await previewCompetitionMatch(input);
  const normalizedInput = normalizeMatchInput(input);
  const event = await getCompetitionEvent(preview.tournamentId ?? "");

  if (!event?.seasonId) {
    throw new Error("The selected event must be linked to a season before saving match results.");
  }

  const now = new Date().toISOString();
  const matchId = normalizedInput.id ?? randomUUID();
  const publish = options.publish ?? preview.status === "published";
  const existingMatch = normalizedInput.id ? await getCompetitionMatch(normalizedInput.id).catch(() => null) : null;
  const payload: TablesInsert<"matches"> = {
    id: matchId,
    season_id: event.seasonId,
    event_id: preview.tournamentId ?? null,
    day_id: null,
    match_id: preview.pubgMatchId,
    external_match_id: preview.externalMatchId ?? null,
    match_number: preview.matchNumber ?? 1,
    map: preview.map,
    map_name: preview.map,
    match_date: preview.playedAt ?? now,
    start_time: preview.playedAt ?? now,
    status: toDatabaseMatchStatus(preview.status, publish),
    raw_json: buildStoredMatchSnapshot(preview),
    point_system_id: preview.pointSystemId ?? null,
    source_url: preview.sourceUrl ?? null,
    vod_url: preview.vodUrl ?? null,
    scoreboard_image_url: preview.scoreboardImageUrl ?? null,
    result_image_url: preview.resultImageUrl ?? null,
    screenshot_urls: sanitizeJsonValue(preview.screenshotUrls) ?? [],
    published_at: publish ? existingMatch?.publishedAt ?? now : null,
    deleted_at: null,
    created_at: existingMatch?.createdAt ?? now,
    updated_at: now,
    data_source:
      preview.dataSource === "pubg_api" || preview.dataSource === "external_feed"
        ? preview.dataSource
        : MATCH_SOURCE_MANUAL,
  };

  const { error } = await client.from("matches").upsert(payload);
  if (error) {
    throw error;
  }

  await replaceMatchResults(matchId, preview, {
    publish,
    region: event.server,
    eventId: event.id,
  });

  const savedMatch = await getCompetitionMatch(matchId);
  if (!savedMatch) {
    throw new Error("The match was saved but could not be reloaded.");
  }

  await client
    .from("events")
    .update({ match_count: await countPublishedMatchesForEvent(event.id), updated_at: now })
    .eq("id", event.id);

  return savedMatch;
}

async function countPublishedMatchesForEvent(eventId: string) {
  const client = getSupabaseServiceRoleClient();
  const { count, error } = await client
    .from("matches")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId)
    .in("status", ["approved", "published"])
    .is("deleted_at", null);

  if (error) {
    throw error;
  }

  return count ?? 0;
}

export async function setCompetitionMatchPublishedState(id: string, published: boolean) {
  const client = getSupabaseServiceRoleClient();
  const match = await getCompetitionMatch(id);
  if (!match) {
    throw new Error("Match not found.");
  }

  const now = new Date().toISOString();
  const { error } = await client
    .from("matches")
    .update({
      status: published ? "published" : "pending",
      published_at: published ? now : null,
      updated_at: now,
    })
    .eq("id", id);

  if (error) {
    throw error;
  }

  if (match.tournamentId) {
    await client
      .from("events")
      .update({ match_count: await countPublishedMatchesForEvent(match.tournamentId), updated_at: now })
      .eq("id", match.tournamentId);
  }

  const updatedMatch = await getCompetitionMatch(id);
  if (!updatedMatch) {
    throw new Error("Match state changed but the record could not be reloaded.");
  }

  return updatedMatch;
}

export async function recalculateCompetitionMatch(id: string) {
  const match = await getCompetitionMatch(id);
  if (!match) {
    throw new Error("Match not found.");
  }

  return saveCompetitionMatch(match, { publish: match.status === "published" });
}

export async function restoreCompetitionMatchFromSnapshot(snapshot: TournamentMatch) {
  return saveCompetitionMatch(snapshot, { publish: snapshot.status === "published" });
}

export async function deleteCompetitionMatch(id: string) {
  const client = getSupabaseServiceRoleClient();
  const match = await getCompetitionMatch(id);
  if (!match) {
    return { id, deleted: true };
  }

  const now = new Date().toISOString();
  const { error } = await client
    .from("matches")
    .update({
      deleted_at: now,
      status: "rejected",
      published_at: null,
      updated_at: now,
    })
    .eq("id", id);

  if (error) {
    throw error;
  }

  if (match.tournamentId) {
    await client
      .from("events")
      .update({ match_count: await countPublishedMatchesForEvent(match.tournamentId), updated_at: now })
      .eq("id", match.tournamentId);
  }

  return { id, deleted: true };
}

export async function getCompetitionSeasonLeaderboardRows(seasonId: string): Promise<LeaderboardRow[]> {
  const client = getSupabaseServiceRoleClient();
  const { data, error } = await client.from("team_leaderboard").select("*").eq("season_id", seasonId);
  if (error) {
    throw error;
  }

  return ((data ?? []) as Views<"team_leaderboard">[])
    .sort((firstValue, secondValue) => (firstValue.rank ?? Number.POSITIVE_INFINITY) - (secondValue.rank ?? Number.POSITIVE_INFINITY))
    .map((row) => ({
      rank: row.rank ?? 0,
      teamId: row.team_id ?? "",
      team: row.team_name ?? "Team Pending",
      slotNumber: row.slot_number ?? undefined,
      matches: row.matches_played ?? 0,
      kills: row.total_kills ?? 0,
      placement: row.placement_points ?? 0,
      points: row.total_points ?? 0,
      chickenDinners: row.chicken_dinners ?? undefined,
      scope: "season",
    }));
}

export async function getCompetitionSeasonTeams(seasonId: string): Promise<Team[]> {
  const client = getSupabaseServiceRoleClient();
  const [leaderboardRows, eventsResponse] = await Promise.all([
    client.from("team_leaderboard").select("*").eq("season_id", seasonId),
    client.from("events").select("id").eq("season_id", seasonId).is("deleted_at", null),
  ]);

  if (leaderboardRows.error) {
    throw leaderboardRows.error;
  }
  if (eventsResponse.error) {
    throw eventsResponse.error;
  }

  const eventIds = ((eventsResponse.data ?? []) as Array<Pick<Tables<"events">, "id">>).map((event) => event.id);
  const teamMap = await getEventTeamMap(eventIds);
  const seasonTeamIds = new Set<string>();
  for (const teamIds of teamMap.values()) {
    for (const teamId of teamIds) {
      seasonTeamIds.add(teamId);
    }
  }
  for (const row of (leaderboardRows.data ?? []) as Views<"team_leaderboard">[]) {
    if (row.team_id) {
      seasonTeamIds.add(row.team_id);
    }
  }

  if (seasonTeamIds.size === 0) {
    return [];
  }

  const { data: teams, error: teamsError } = await client.from("teams").select("*").in("id", Array.from(seasonTeamIds)).is("deleted_at", null);
  if (teamsError) {
    throw teamsError;
  }

  const { data: players } = await client.from("players").select("id,current_team_id").in("current_team_id", Array.from(seasonTeamIds));
  const playerIdsByTeamId = new Map<string, string[]>();
  for (const player of players ?? []) {
    if (!player.current_team_id) {
      continue;
    }

    const currentValue = playerIdsByTeamId.get(player.current_team_id) ?? [];
    currentValue.push(player.id);
    playerIdsByTeamId.set(player.current_team_id, currentValue);
  }

  const standingsByTeamId = new Map(
    ((leaderboardRows.data ?? []) as Views<"team_leaderboard">[]).map((row) => [row.team_id ?? "", row] as const)
  );

  return ((teams ?? []) as Tables<"teams">[])
    .map((team) => mapTeamRow(team, standingsByTeamId.get(team.id) ?? null, playerIdsByTeamId.get(team.id) ?? []))
    .sort((firstValue, secondValue) => compareTeamLeaderboardPerformance(firstValue, secondValue));
}

export async function getCompetitionSeasonPlayers(seasonId: string): Promise<Player[]> {
  const client = getSupabaseServiceRoleClient();
  const [{ data: leaderboardRows, error: leaderboardError }, { data: mvpRows, error: mvpError }] = await Promise.all([
    client.from("player_leaderboard").select("*").eq("season_id", seasonId),
    client.from("mvp_rankings").select("*").eq("season_id", seasonId),
  ]);

  if (leaderboardError) {
    throw leaderboardError;
  }
  if (mvpError) {
    throw mvpError;
  }

  const playerIds = Array.from(
    new Set(((leaderboardRows ?? []) as Views<"player_leaderboard">[]).map((row) => row.player_id).filter((value): value is string => Boolean(value)))
  );

  if (playerIds.length === 0) {
    return [];
  }

  const { data: players, error } = await client.from("players").select("*").in("id", playerIds).is("deleted_at", null);
  if (error) {
    throw error;
  }

  const leaderboardByPlayerId = new Map(
    ((leaderboardRows ?? []) as Views<"player_leaderboard">[]).map((row) => [row.player_id ?? "", row] as const)
  );
  const mvpByPlayerId = new Map(((mvpRows ?? []) as Views<"mvp_rankings">[]).map((row) => [row.player_id ?? "", row] as const));

  return ((players ?? []) as Tables<"players">[])
    .map((player) => mapPlayerRow(player, leaderboardByPlayerId.get(player.id) ?? null, mvpByPlayerId.get(player.id) ?? null))
    .sort((firstValue, secondValue) => comparePlayerLeaderboardPerformance(firstValue, secondValue));
}

export async function listCompetitionTeams(): Promise<Team[]> {
  const currentSeason = await getCurrentCompetitionSeason();
  if (currentSeason) {
    const seasonTeams = await getCompetitionSeasonTeams(currentSeason.id);
    if (seasonTeams.length > 0) {
      return seasonTeams;
    }
  }

  const client = getSupabaseServiceRoleClient();
  const { data, error } = await client.from("teams").select("*").is("deleted_at", null).order("name", { ascending: true });
  if (error) {
    throw error;
  }

  return ((data ?? []) as Tables<"teams">[]).map((team) => mapTeamRow(team));
}

export async function listCompetitionPlayers(): Promise<Player[]> {
  const currentSeason = await getCurrentCompetitionSeason();
  if (currentSeason) {
    const seasonPlayers = await getCompetitionSeasonPlayers(currentSeason.id);
    if (seasonPlayers.length > 0) {
      return seasonPlayers;
    }
  }

  const client = getSupabaseServiceRoleClient();
  const { data, error } = await client.from("players").select("*").is("deleted_at", null).order("pubg_name", { ascending: true });
  if (error) {
    throw error;
  }

  return ((data ?? []) as Tables<"players">[]).map((player) => mapPlayerRow(player));
}
