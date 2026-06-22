"use client";

import { useEffect, useMemo, useState } from "react";
import {
  buildFallbackTeamNameFromSlot,
  canonicalizeBravoTeamName,
  parseBravoSlotNumber,
  resolveBravoTeamIdentity,
} from "./bravo-teams";
import {
  compareMatchSequenceOrder,
  compareMvpRankingPlayers,
  comparePlayerLeaderboardPerformance,
} from "./ranking-sort";
import { getUserFacingTeamLabel } from "./user-facing-errors";
import { buildCurrentSeasonOverviewFromCollections, buildFallbackLeaderboardRows, buildScrimDayResultsFromCollections, buildTournamentLeaderboardGroups } from "./bravo-live-derivations";
import { COLLECTIONS } from "./document-store-collections";
import { getSupabaseBrowserClient } from "./supabase/browser-client";
import { isSupabaseConfigured } from "./supabase/env";
import {
  SUPABASE_DOCUMENT_STORE_TABLE,
  mapSupabaseDocumentStoreRow,
} from "./supabase/document-store";
import type {
  Announcement,
  CurrentSeasonOverview,
  ErrorLogRecord,
  LeaderboardRow,
  MatchPlayerRecord,
  MatchPlayerResult,
  Player,
  PubgImportWatcher,
  Scrim,
  ScrimDayResult,
  Season,
  SiteStats,
  SponsorItem,
  StreamSchedule,
  Team,
  TeamMatchResult,
  Tournament,
  TournamentMatch,
  TournamentStanding,
  UploadRecord,
  VideoItem,
} from "./types";

type DocumentRecord = { id: string };

function toFiniteNumber(value?: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function getNormalizedTeamName(rawTeamName: string | undefined, inferredSlotNumber?: number, resolvedTeamName?: string | null) {
  if (resolvedTeamName) return resolvedTeamName;
  const trimmedTeamName = rawTeamName?.trim();
  if (trimmedTeamName) return trimmedTeamName;
  return getUserFacingTeamLabel(buildFallbackTeamNameFromSlot(inferredSlotNumber));
}

function normalizeRealtimeTeam(team: Team): Team {
  const resolvedTeam = resolveBravoTeamIdentity(team.name ?? team.sourceTeamName);
  const inferredSlotNumber =
    resolvedTeam?.slotNumber ??
    toFiniteNumber(team.slotNumber) ??
    parseBravoSlotNumber(team.name) ??
    parseBravoSlotNumber(team.sourceTeamName);
  const normalizedTeamName = getNormalizedTeamName(team.name, inferredSlotNumber, resolvedTeam?.name);

  return {
    ...team,
    name: normalizedTeamName,
    tag: resolvedTeam?.tag ?? team.tag,
    slotNumber: inferredSlotNumber,
    sourceTeamName: team.sourceTeamName ? canonicalizeBravoTeamName(team.sourceTeamName) : team.sourceTeamName,
  };
}

function normalizeRealtimePlayer(player: Player): Player {
  const resolvedTeam = resolveBravoTeamIdentity(player.teamName);
  const normalizedTeamName =
    resolvedTeam?.name ?? player.teamName?.trim() ?? undefined;

  return {
    ...player,
    teamName: normalizedTeamName,
  };
}

function normalizeRealtimeStanding(standing: TournamentStanding): TournamentStanding {
  const resolvedTeam = resolveBravoTeamIdentity(standing.teamName);
  const inferredSlotNumber =
    resolvedTeam?.slotNumber ?? toFiniteNumber(standing.slotNumber) ?? parseBravoSlotNumber(standing.teamName);
  const normalizedTeamName = getNormalizedTeamName(standing.teamName, inferredSlotNumber, resolvedTeam?.name);

  return {
    ...standing,
    teamName: normalizedTeamName,
    slotNumber: inferredSlotNumber,
  };
}

function normalizeRealtimeTeamResult(teamResult: TeamMatchResult): TeamMatchResult {
  const resolvedTeam = resolveBravoTeamIdentity(teamResult.teamName);
  const inferredSlotNumber =
    resolvedTeam?.slotNumber ?? toFiniteNumber(teamResult.slotNumber) ?? parseBravoSlotNumber(teamResult.teamName);
  const normalizedTeamName = getNormalizedTeamName(teamResult.teamName, inferredSlotNumber, resolvedTeam?.name);

  return {
    ...teamResult,
    teamName: normalizedTeamName,
    slotNumber: inferredSlotNumber,
  };
}

function normalizeRealtimePlayerResult(playerResult: MatchPlayerResult): MatchPlayerResult {
  const resolvedTeam = resolveBravoTeamIdentity(playerResult.teamName);
  const inferredSlotNumber =
    resolvedTeam?.slotNumber ?? toFiniteNumber(playerResult.slotNumber) ?? parseBravoSlotNumber(playerResult.teamName);
  const normalizedTeamName = getNormalizedTeamName(playerResult.teamName, inferredSlotNumber, resolvedTeam?.name);

  return {
    ...playerResult,
    teamName: normalizedTeamName,
    slotNumber: inferredSlotNumber,
  };
}

function normalizeRealtimeMatch(match: TournamentMatch): TournamentMatch {
  return {
    ...match,
    winner: canonicalizeBravoTeamName(match.winner),
    teamResults: (match.teamResults ?? []).map((teamResult) => normalizeRealtimeTeamResult(teamResult)),
    playerResults: (match.playerResults ?? []).map((playerResult) => normalizeRealtimePlayerResult(playerResult)),
  };
}

function normalizeRealtimeMatchPlayerRecord(matchPlayer: MatchPlayerRecord): MatchPlayerRecord {
  const resolvedTeam = resolveBravoTeamIdentity(matchPlayer.teamName);
  const inferredSlotNumber =
    resolvedTeam?.slotNumber ?? toFiniteNumber(matchPlayer.slotNumber) ?? parseBravoSlotNumber(matchPlayer.teamName);
  const normalizedTeamName = getNormalizedTeamName(matchPlayer.teamName, inferredSlotNumber, resolvedTeam?.name);

  return {
    ...matchPlayer,
    teamName: normalizedTeamName,
    slotNumber: inferredSlotNumber,
  };
}

function canUseSupabaseRealtime() {
  return isSupabaseConfigured();
}

function getRealtimeErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "object" && error && "message" in error && typeof error.message === "string") {
    return error.message;
  }

  return String(error);
}

async function fetchSupabaseCollectionSnapshot<T extends DocumentRecord>(collectionName: string, limit = 1000) {
  const { data, error } = await getSupabaseBrowserClient()
    .from(SUPABASE_DOCUMENT_STORE_TABLE)
    .select("collection_name,id,data,created_at,updated_at")
    .eq("collection_name", collectionName)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => mapSupabaseDocumentStoreRow<T>(row));
}

async function fetchSupabaseDocumentSnapshot<T extends DocumentRecord>(collectionName: string, id: string) {
  const { data, error } = await getSupabaseBrowserClient()
    .from(SUPABASE_DOCUMENT_STORE_TABLE)
    .select("collection_name,id,data,created_at,updated_at")
    .eq("collection_name", collectionName)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapSupabaseDocumentStoreRow<T>(data) : null;
}

function matchesSupabaseFieldValue(record: Record<string, unknown>, field: string, value: string) {
  return record[field] === value;
}

async function fetchSupabaseWhereSnapshot<T extends DocumentRecord>(
  collectionName: string,
  field: string,
  value: string,
  limit = 1000
) {
  const records = await fetchSupabaseCollectionSnapshot<T>(collectionName, limit);
  return records.filter((record) => matchesSupabaseFieldValue(record as Record<string, unknown>, field, value));
}

function useCollectionSnapshot<T extends DocumentRecord>(collectionName: string, initialData: T[], enabled = true) {
  const [data, setData] = useState<T[]>(initialData);
  const [loading, setLoading] = useState(enabled && canUseSupabaseRealtime());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !canUseSupabaseRealtime()) {
      setLoading(false);
      return;
    }

    let active = true;
    const client = getSupabaseBrowserClient();
    const channel = client.channel(`app-documents:${collectionName}`);

    const load = async () => {
      try {
        const rows = await fetchSupabaseCollectionSnapshot<T>(collectionName, 2000);
        if (!active) return;
        setData(rows);
        setLoading(false);
        setError(null);
      } catch (snapshotError: unknown) {
        if (!active) return;
        setLoading(false);
        setError(getRealtimeErrorMessage(snapshotError));
      }
    };

    void load();

    channel
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: SUPABASE_DOCUMENT_STORE_TABLE,
        filter: `collection_name=eq.${collectionName}`,
      }, () => {
        void load();
      })
      .subscribe();

    return () => {
      active = false;
      void client.removeChannel(channel);
    };
  }, [collectionName, enabled]);

  return { data, loading, error };
}

function useWhereSnapshot<T extends DocumentRecord>(
  collectionName: string,
  field: string,
  value: string | undefined,
  initialData: T[]
) {
  const [data, setData] = useState<T[]>(initialData);
  const [loading, setLoading] = useState(Boolean(value) && canUseSupabaseRealtime());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!value || !canUseSupabaseRealtime()) {
      setLoading(false);
      return;
    }

    let active = true;
    const client = getSupabaseBrowserClient();
    const channel = client.channel(`app-documents:${collectionName}:${field}:${value}`);

    const load = async () => {
      try {
        const rows = await fetchSupabaseWhereSnapshot<T>(collectionName, field, value, 2500);
        if (!active) return;
        setData(rows);
        setLoading(false);
        setError(null);
      } catch (snapshotError: unknown) {
        if (!active) return;
        setLoading(false);
        setError(getRealtimeErrorMessage(snapshotError));
      }
    };

    void load();

    channel
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: SUPABASE_DOCUMENT_STORE_TABLE,
        filter: `collection_name=eq.${collectionName}`,
      }, () => {
        void load();
      })
      .subscribe();

    return () => {
      active = false;
      void client.removeChannel(channel);
    };
  }, [collectionName, field, value]);

  return { data, loading, error };
}

function useDocumentSnapshot<T extends DocumentRecord>(
  collectionName: string,
  id: string | undefined,
  initialData: T | null
) {
  const [data, setData] = useState<T | null>(initialData);
  const [loading, setLoading] = useState(Boolean(id) && canUseSupabaseRealtime());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || !canUseSupabaseRealtime()) {
      setLoading(false);
      return;
    }

    let active = true;
    const client = getSupabaseBrowserClient();
    const channel = client.channel(`app-documents:${collectionName}:${id}`);

    const load = async () => {
      try {
        const document = await fetchSupabaseDocumentSnapshot<T>(collectionName, id);
        if (!active) return;
        setData(document);
        setLoading(false);
        setError(null);
      } catch (snapshotError: unknown) {
        if (!active) return;
        setLoading(false);
        setError(getRealtimeErrorMessage(snapshotError));
      }
    };

    void load();

    channel
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: SUPABASE_DOCUMENT_STORE_TABLE,
        filter: `collection_name=eq.${collectionName}`,
      }, () => {
        void load();
      })
      .subscribe();

    return () => {
      active = false;
      void client.removeChannel(channel);
    };
  }, [collectionName, id]);

  return { data, loading, error };
}

export function useBravoRealtimeData(initial?: {
  seasons?: Season[];
  tournaments?: Tournament[];
  standings?: TournamentStanding[];
  teams?: Team[];
  players?: Player[];
  scrims?: Scrim[];
  matches?: TournamentMatch[];
  matchResults?: TournamentMatch[];
}, options?: {
  seasons?: boolean;
  tournaments?: boolean;
  standings?: boolean;
  teams?: boolean;
  players?: boolean;
  scrims?: boolean;
  matches?: boolean;
  matchResults?: boolean;
}) {
  const seasonsState = useCollectionSnapshot<Season>(COLLECTIONS.seasons, initial?.seasons ?? [], options?.seasons !== false);
  const tournamentsState = useCollectionSnapshot<Tournament>(
    COLLECTIONS.tournaments,
    initial?.tournaments ?? [],
    options?.tournaments !== false
  );
  const standingsState = useCollectionSnapshot<TournamentStanding>(
    COLLECTIONS.standings,
    initial?.standings ?? [],
    options?.standings !== false
  );
  const teamsState = useCollectionSnapshot<Team>(COLLECTIONS.teams, initial?.teams ?? [], options?.teams !== false);
  const playersState = useCollectionSnapshot<Player>(
    COLLECTIONS.players,
    initial?.players ?? [],
    options?.players !== false
  );
  const scrimsState = useCollectionSnapshot<Scrim>(COLLECTIONS.scrims, initial?.scrims ?? [], options?.scrims !== false);
  const matchesState = useCollectionSnapshot<TournamentMatch>(
    COLLECTIONS.matches,
    initial?.matches ?? [],
    options?.matches !== false
  );
  const matchResultsState = useCollectionSnapshot<TournamentMatch>(
    COLLECTIONS.matchResults,
    initial?.matchResults ?? [],
    options?.matchResults !== false
  );

  const normalizedStandings = useMemo(
    () => standingsState.data.map((standing) => normalizeRealtimeStanding(standing)),
    [standingsState.data]
  );
  const normalizedTeams = useMemo(
    () => teamsState.data.map((team) => normalizeRealtimeTeam(team)),
    [teamsState.data]
  );
  const normalizedPlayers = useMemo(
    () => playersState.data.map((player) => normalizeRealtimePlayer(player)),
    [playersState.data]
  );
  const normalizedMatches = useMemo(
    () => matchesState.data.map((match) => normalizeRealtimeMatch(match)),
    [matchesState.data]
  );
  const normalizedMatchResults = useMemo(
    () => matchResultsState.data.map((match) => normalizeRealtimeMatch(match)),
    [matchResultsState.data]
  );

  const overview = useMemo(
    () =>
      buildCurrentSeasonOverviewFromCollections({
        seasons: seasonsState.data,
        tournaments: tournamentsState.data,
        standings: normalizedStandings,
        teams: normalizedTeams,
        players: normalizedPlayers,
      }),
    [normalizedPlayers, normalizedStandings, normalizedTeams, seasonsState.data, tournamentsState.data]
  );

  const leaderboardRows = useMemo<LeaderboardRow[]>(
    () => overview?.leaderboard ?? buildFallbackLeaderboardRows(normalizedTeams),
    [normalizedTeams, overview]
  );

  const tournamentLeaderboards = useMemo(
    () =>
      buildTournamentLeaderboardGroups({
        tournaments: overview?.tournaments ?? tournamentsState.data,
        standings: normalizedStandings,
      }),
    [normalizedStandings, overview?.tournaments, tournamentsState.data]
  );

  const scrimDayResults = useMemo<ScrimDayResult[]>(
    () => buildScrimDayResultsFromCollections(scrimsState.data, [normalizedMatches, normalizedMatchResults]),
    [normalizedMatchResults, normalizedMatches, scrimsState.data]
  );

  return {
    configured: canUseSupabaseRealtime(),
    seasons: seasonsState.data,
    tournaments: tournamentsState.data,
    standings: normalizedStandings,
    teams: normalizedTeams,
    players: normalizedPlayers,
    scrims: scrimsState.data,
    matches: normalizedMatches,
    matchResults: normalizedMatchResults,
    overview,
    leaderboardRows,
    tournamentLeaderboards,
    scrimDayResults,
    loading:
      seasonsState.loading ||
      tournamentsState.loading ||
      standingsState.loading ||
      teamsState.loading ||
      playersState.loading ||
      scrimsState.loading ||
      matchesState.loading ||
      matchResultsState.loading,
    error:
      seasonsState.error ??
      tournamentsState.error ??
      standingsState.error ??
      teamsState.error ??
      playersState.error ??
      scrimsState.error ??
      matchesState.error ??
      matchResultsState.error,
  };
}

export function useRealtimeAnnouncements(initialAnnouncements: Announcement[] = []) {
  return useCollectionSnapshot<Announcement>(COLLECTIONS.announcements, initialAnnouncements);
}

export function useRealtimeStreams(initialStreams: StreamSchedule[] = []) {
  return useCollectionSnapshot<StreamSchedule>(COLLECTIONS.streams, initialStreams);
}

export function useRealtimeVideos(initialVideos: VideoItem[] = []) {
  return useCollectionSnapshot<VideoItem>(COLLECTIONS.videos, initialVideos);
}

export function useRealtimeSponsors(initialSponsors: SponsorItem[] = []) {
  return useCollectionSnapshot<SponsorItem>(COLLECTIONS.sponsors, initialSponsors);
}

export function useRealtimeSiteStats(initialStats: SiteStats | null) {
  return useDocumentSnapshot<SiteStats & DocumentRecord>(
    COLLECTIONS.siteStats,
    "main",
    initialStats ? ({ id: "main", ...initialStats } as SiteStats & DocumentRecord) : null
  );
}

export function useRealtimeTournament(tournamentId: string, initialTournament: Tournament | null) {
  return useDocumentSnapshot<Tournament>(COLLECTIONS.tournaments, tournamentId, initialTournament);
}

export function useRealtimeTeams(initialTeams: Team[] = []) {
  const state = useCollectionSnapshot<Team>(COLLECTIONS.teams, initialTeams);
  const data = useMemo(() => state.data.map((team) => normalizeRealtimeTeam(team)), [state.data]);
  return { ...state, data };
}

export function useRealtimePlayers(initialPlayers: Player[] = []) {
  const state = useCollectionSnapshot<Player>(COLLECTIONS.players, initialPlayers);
  const data = useMemo(() => state.data.map((player) => normalizeRealtimePlayer(player)), [state.data]);
  return { ...state, data };
}

export function useRealtimeTournaments(initialTournaments: Tournament[] = []) {
  return useCollectionSnapshot<Tournament>(COLLECTIONS.tournaments, initialTournaments);
}

export function useRealtimeMatches(initialMatches: TournamentMatch[] = []) {
  const state = useCollectionSnapshot<TournamentMatch>(COLLECTIONS.matches, initialMatches);
  const data = useMemo(() => state.data.map((match) => normalizeRealtimeMatch(match)), [state.data]);
  return { ...state, data };
}

export function useRealtimeMatchResult(matchId: string, initialMatch: TournamentMatch | null) {
  const state = useDocumentSnapshot<TournamentMatch>(COLLECTIONS.matchResults, matchId, initialMatch);
  const data = useMemo(() => (state.data ? normalizeRealtimeMatch(state.data) : null), [state.data]);
  return { ...state, data };
}

export function useRealtimeTeam(teamId: string, initialTeam: Team | null) {
  const state = useDocumentSnapshot<Team>(COLLECTIONS.teams, teamId, initialTeam);
  const data = useMemo(() => (state.data ? normalizeRealtimeTeam(state.data) : null), [state.data]);
  return { ...state, data };
}

export function useRealtimePlayer(playerId: string, initialPlayer: Player | null) {
  const state = useDocumentSnapshot<Player>(COLLECTIONS.players, playerId, initialPlayer);
  const data = useMemo(() => (state.data ? normalizeRealtimePlayer(state.data) : null), [state.data]);
  return { ...state, data };
}

export function useRealtimeTournamentMatches(
  tournamentId: string | undefined,
  initialMatches: TournamentMatch[] = []
) {
  const state = useWhereSnapshot<TournamentMatch>(COLLECTIONS.matches, "tournamentId", tournamentId, initialMatches);
  const data = useMemo(() => state.data.map((match) => normalizeRealtimeMatch(match)), [state.data]);
  return { ...state, data };
}

export function useRealtimeTournamentStandings(
  tournamentId: string | undefined,
  initialStandings: TournamentStanding[] = []
) {
  const state = useWhereSnapshot<TournamentStanding>(COLLECTIONS.standings, "tournamentId", tournamentId, initialStandings);
  const data = useMemo(() => state.data.map((standing) => normalizeRealtimeStanding(standing)), [state.data]);
  return { ...state, data };
}

export function useRealtimeTournamentTeams(tournamentId: string | undefined, initialTeams: Team[] = []) {
  const state = useWhereSnapshot<Team>(COLLECTIONS.teams, "sourceTournamentId", tournamentId, initialTeams);
  const data = useMemo(() => state.data.map((team) => normalizeRealtimeTeam(team)), [state.data]);
  return { ...state, data };
}

export function useRealtimeTournamentPlayers(tournamentId: string | undefined, initialPlayers: Player[] = []) {
  const state = useWhereSnapshot<Player>(COLLECTIONS.players, "sourceTournamentId", tournamentId, initialPlayers);
  const data = useMemo(() => state.data.map((player) => normalizeRealtimePlayer(player)), [state.data]);
  return { ...state, data };
}

export function useRealtimeMatchPlayersByTeamName(
  teamName: string | undefined,
  initialMatchPlayers: MatchPlayerRecord[] = []
) {
  const state = useWhereSnapshot<MatchPlayerRecord>(COLLECTIONS.matchPlayers, "teamName", teamName, initialMatchPlayers);
  const data = useMemo(() => state.data.map((matchPlayer) => normalizeRealtimeMatchPlayerRecord(matchPlayer)), [state.data]);
  return { ...state, data };
}

export function useRealtimeMatchPlayersBySourcePlayerId(
  sourcePlayerId: string | undefined,
  initialMatchPlayers: MatchPlayerRecord[] = []
) {
  const state = useWhereSnapshot<MatchPlayerRecord>(
    COLLECTIONS.matchPlayers,
    "sourcePlayerId",
    sourcePlayerId,
    initialMatchPlayers
  );
  const data = useMemo(() => state.data.map((matchPlayer) => normalizeRealtimeMatchPlayerRecord(matchPlayer)), [state.data]);
  return { ...state, data };
}

export function useRealtimeUploads(initialUploads: UploadRecord[] = []) {
  return useCollectionSnapshot<UploadRecord>(COLLECTIONS.uploads, initialUploads);
}

export function useRealtimeErrors(initialErrors: ErrorLogRecord[] = []) {
  return useCollectionSnapshot<ErrorLogRecord>(COLLECTIONS.errorLogs, initialErrors);
}

export function useRealtimeImportWatchers(initialWatchers: PubgImportWatcher[] = []) {
  return useCollectionSnapshot<PubgImportWatcher>(COLLECTIONS.pubgImportWatchers, initialWatchers);
}

export function sortTournamentPlayers(players: Player[]) {
  return [...players].sort((firstPlayer, secondPlayer) =>
    comparePlayerLeaderboardPerformance(firstPlayer, secondPlayer)
  );
}

export function sortTournamentMatches(matches: TournamentMatch[]) {
  return [...matches].sort((firstMatch, secondMatch) => compareMatchSequenceOrder(firstMatch, secondMatch));
}

export function getMvpPlayer(players: Player[]) {
  return players.find((player) => player.isMvpOfWeek) ?? [...players].sort((firstPlayer, secondPlayer) =>
    compareMvpRankingPlayers(firstPlayer, secondPlayer)
  )[0] ?? null;
}

export function getLiveFeedFromStreams(streams: StreamSchedule[]) {
  return streams.find((stream) => stream.isLive) ?? streams[0] ?? null;
}
