"use client";

import { useMemo } from "react";
import {
  buildCurrentSeasonOverviewFromCollections,
  buildFallbackLeaderboardRows,
  buildScrimDayResultsFromCollections,
  buildTournamentLeaderboardGroups,
} from "./bravo-live-derivations";
import { buildFallbackTeamNameFromSlot, canonicalizeBravoTeamName, parseBravoSlotNumber, resolveBravoTeamIdentity } from "./bravo-teams";
import { COLLECTIONS } from "./document-store-collections";
import { compareMatchSequenceOrder, comparePlayerLeaderboardPerformance } from "./ranking-sort";
import type {
  LeaderboardRow,
  MatchPlayerResult,
  Player,
  Scrim,
  ScrimDayResult,
  Season,
  Team,
  TeamMatchResult,
  Tournament,
  TournamentMatch,
  TournamentStanding,
} from "./types";
import { getUserFacingTeamLabel } from "./user-facing-errors";

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
  const normalizedTeamName = resolvedTeam?.name ?? player.teamName?.trim() ?? undefined;

  return {
    ...player,
    teamName: normalizedTeamName,
  };
}

function normalizeRealtimeStanding(standing: TournamentStanding): TournamentStanding {
  const resolvedTeam = resolveBravoTeamIdentity(standing.teamName);
  const inferredSlotNumber = resolvedTeam?.slotNumber ?? toFiniteNumber(standing.slotNumber) ?? parseBravoSlotNumber(standing.teamName);
  const normalizedTeamName = getNormalizedTeamName(standing.teamName, inferredSlotNumber, resolvedTeam?.name);

  return {
    ...standing,
    teamName: normalizedTeamName,
    slotNumber: inferredSlotNumber,
  };
}

function normalizeRealtimeTeamResult(teamResult: TeamMatchResult): TeamMatchResult {
  const resolvedTeam = resolveBravoTeamIdentity(teamResult.teamName);
  const inferredSlotNumber = resolvedTeam?.slotNumber ?? toFiniteNumber(teamResult.slotNumber) ?? parseBravoSlotNumber(teamResult.teamName);
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

function useCollectionSnapshot<T extends DocumentRecord>(collectionName: string, initialData: T[], enabled = true) {
  void collectionName;
  void enabled;
  return { data: initialData, loading: false, error: null as string | null };
}

function useWhereSnapshot<T extends DocumentRecord>(collectionName: string, field: string, value: string | undefined, initialData: T[]) {
  void collectionName;
  void field;
  void value;
  return { data: initialData, loading: false, error: null as string | null };
}

function useDocumentSnapshot<T extends DocumentRecord>(collectionName: string, id: string | undefined, initialData: T | null) {
  void collectionName;
  void id;
  return { data: initialData, loading: false, error: null as string | null };
}

export function useBravoRealtimeData(
  initial?: {
    seasons?: Season[];
    tournaments?: Tournament[];
    standings?: TournamentStanding[];
    teams?: Team[];
    players?: Player[];
    scrims?: Scrim[];
    matches?: TournamentMatch[];
    matchResults?: TournamentMatch[];
  },
  options?: {
    seasons?: boolean;
    tournaments?: boolean;
    standings?: boolean;
    teams?: boolean;
    players?: boolean;
    scrims?: boolean;
    matches?: boolean;
    matchResults?: boolean;
  },
) {
  const seasonsState = useCollectionSnapshot<Season>(COLLECTIONS.seasons, initial?.seasons ?? [], options?.seasons !== false);
  const tournamentsState = useCollectionSnapshot<Tournament>(
    COLLECTIONS.tournaments,
    initial?.tournaments ?? [],
    options?.tournaments !== false,
  );
  const standingsState = useCollectionSnapshot<TournamentStanding>(
    COLLECTIONS.standings,
    initial?.standings ?? [],
    options?.standings !== false,
  );
  const teamsState = useCollectionSnapshot<Team>(COLLECTIONS.teams, initial?.teams ?? [], options?.teams !== false);
  const playersState = useCollectionSnapshot<Player>(COLLECTIONS.players, initial?.players ?? [], options?.players !== false);
  const scrimsState = useCollectionSnapshot<Scrim>(COLLECTIONS.scrims, initial?.scrims ?? [], options?.scrims !== false);
  const matchesState = useCollectionSnapshot<TournamentMatch>(COLLECTIONS.matches, initial?.matches ?? [], options?.matches !== false);
  const matchResultsState = useCollectionSnapshot<TournamentMatch>(
    COLLECTIONS.matchResults,
    initial?.matchResults ?? [],
    options?.matchResults !== false,
  );

  const normalizedStandings = useMemo(
    () => standingsState.data.map((standing) => normalizeRealtimeStanding(standing)),
    [standingsState.data],
  );
  const normalizedTeams = useMemo(() => teamsState.data.map((team) => normalizeRealtimeTeam(team)), [teamsState.data]);
  const normalizedPlayers = useMemo(() => playersState.data.map((player) => normalizeRealtimePlayer(player)), [playersState.data]);
  const normalizedMatches = useMemo(() => matchesState.data.map((match) => normalizeRealtimeMatch(match)), [matchesState.data]);
  const normalizedMatchResults = useMemo(
    () => matchResultsState.data.map((match) => normalizeRealtimeMatch(match)),
    [matchResultsState.data],
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
    [normalizedPlayers, normalizedStandings, normalizedTeams, seasonsState.data, tournamentsState.data],
  );

  const leaderboardRows = useMemo<LeaderboardRow[]>(
    () => overview?.leaderboard ?? buildFallbackLeaderboardRows(normalizedTeams),
    [normalizedTeams, overview],
  );

  const tournamentLeaderboards = useMemo(
    () =>
      buildTournamentLeaderboardGroups({
        tournaments: overview?.tournaments ?? tournamentsState.data,
        standings: normalizedStandings,
      }),
    [normalizedStandings, overview?.tournaments, tournamentsState.data],
  );

  const scrimDayResults = useMemo<ScrimDayResult[]>(
    () => buildScrimDayResultsFromCollections(scrimsState.data, [normalizedMatches, normalizedMatchResults]),
    [normalizedMatchResults, normalizedMatches, scrimsState.data],
  );

  return {
    configured: false,
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

export function useRealtimeTournament(tournamentId: string, initialTournament: Tournament | null) {
  return useDocumentSnapshot<Tournament>(COLLECTIONS.tournaments, tournamentId, initialTournament);
}

export function useRealtimeMatchResult(matchId: string, initialMatch: TournamentMatch | null) {
  const state = useDocumentSnapshot<TournamentMatch>(COLLECTIONS.matchResults, matchId, initialMatch);
  const data = useMemo(() => (state.data ? normalizeRealtimeMatch(state.data) : null), [state.data]);
  return { ...state, data };
}

export function useRealtimeTournamentMatches(tournamentId: string | undefined, initialMatches: TournamentMatch[] = []) {
  const state = useWhereSnapshot<TournamentMatch>(COLLECTIONS.matches, "tournamentId", tournamentId, initialMatches);
  const data = useMemo(() => state.data.map((match) => normalizeRealtimeMatch(match)), [state.data]);
  return { ...state, data };
}

export function useRealtimeTournamentStandings(tournamentId: string | undefined, initialStandings: TournamentStanding[] = []) {
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

export function sortTournamentPlayers(players: Player[]) {
  return [...players].sort((firstPlayer, secondPlayer) => comparePlayerLeaderboardPerformance(firstPlayer, secondPlayer));
}

export function sortTournamentMatches(matches: TournamentMatch[]) {
  return [...matches].sort((firstMatch, secondMatch) => compareMatchSequenceOrder(firstMatch, secondMatch));
}
