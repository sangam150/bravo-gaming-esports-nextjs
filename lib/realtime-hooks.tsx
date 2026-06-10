"use client";

import { useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
  type DocumentData,
  type FirestoreError,
} from "firebase/firestore";
import { buildCurrentSeasonOverviewFromCollections, buildFallbackLeaderboardRows, buildScrimDayResultsFromCollections, buildTournamentLeaderboardGroups } from "./bravo-live-derivations";
import { COLLECTIONS } from "./firestore-collections";
import { getClientFirestore, isClientFirebaseConfigured } from "./firebase-client";
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
  Tournament,
  TournamentMatch,
  TournamentStanding,
  UploadRecord,
  VideoItem,
} from "./types";

type FirestoreRecord = { id: string };

function useCollectionSnapshot<T extends FirestoreRecord>(collectionName: string, initialData: T[]) {
  const [data, setData] = useState<T[]>(initialData);
  const [loading, setLoading] = useState(isClientFirebaseConfigured());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isClientFirebaseConfigured()) {
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      collection(getClientFirestore(), collectionName),
      (snapshot) => {
        setData(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as T));
        setLoading(false);
        setError(null);
      },
      (snapshotError: FirestoreError) => {
        setLoading(false);
        setError(snapshotError.message);
      }
    );

    return unsubscribe;
  }, [collectionName]);

  return { data, loading, error };
}

function useWhereSnapshot<T extends FirestoreRecord>(
  collectionName: string,
  field: string,
  value: string | undefined,
  initialData: T[]
) {
  const [data, setData] = useState<T[]>(initialData);
  const [loading, setLoading] = useState(Boolean(value) && isClientFirebaseConfigured());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!value || !isClientFirebaseConfigured()) {
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      query(collection(getClientFirestore(), collectionName), where(field, "==", value)),
      (snapshot) => {
        setData(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as T));
        setLoading(false);
        setError(null);
      },
      (snapshotError: FirestoreError) => {
        setLoading(false);
        setError(snapshotError.message);
      }
    );

    return unsubscribe;
  }, [collectionName, field, value]);

  return { data, loading, error };
}

function useDocumentSnapshot<T extends FirestoreRecord>(
  collectionName: string,
  id: string | undefined,
  initialData: T | null
) {
  const [data, setData] = useState<T | null>(initialData);
  const [loading, setLoading] = useState(Boolean(id) && isClientFirebaseConfigured());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || !isClientFirebaseConfigured()) {
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      doc(getClientFirestore(), collectionName, id),
      (snapshot) => {
        setData(snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as T) : null);
        setLoading(false);
        setError(null);
      },
      (snapshotError: FirestoreError) => {
        setLoading(false);
        setError(snapshotError.message);
      }
    );

    return unsubscribe;
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
}) {
  const seasonsState = useCollectionSnapshot<Season>(COLLECTIONS.seasons, initial?.seasons ?? []);
  const tournamentsState = useCollectionSnapshot<Tournament>(COLLECTIONS.tournaments, initial?.tournaments ?? []);
  const standingsState = useCollectionSnapshot<TournamentStanding>(COLLECTIONS.standings, initial?.standings ?? []);
  const teamsState = useCollectionSnapshot<Team>(COLLECTIONS.teams, initial?.teams ?? []);
  const playersState = useCollectionSnapshot<Player>(COLLECTIONS.players, initial?.players ?? []);
  const scrimsState = useCollectionSnapshot<Scrim>(COLLECTIONS.scrims, initial?.scrims ?? []);
  const matchesState = useCollectionSnapshot<TournamentMatch>(COLLECTIONS.matches, initial?.matches ?? []);
  const matchResultsState = useCollectionSnapshot<TournamentMatch>(COLLECTIONS.matchResults, initial?.matchResults ?? []);

  const overview = useMemo(
    () =>
      buildCurrentSeasonOverviewFromCollections({
        seasons: seasonsState.data,
        tournaments: tournamentsState.data,
        standings: standingsState.data,
        teams: teamsState.data,
        players: playersState.data,
      }),
    [playersState.data, seasonsState.data, standingsState.data, teamsState.data, tournamentsState.data]
  );

  const leaderboardRows = useMemo<LeaderboardRow[]>(
    () => overview?.leaderboard ?? buildFallbackLeaderboardRows(teamsState.data),
    [overview, teamsState.data]
  );

  const tournamentLeaderboards = useMemo(
    () =>
      buildTournamentLeaderboardGroups({
        tournaments: overview?.tournaments ?? tournamentsState.data,
        standings: standingsState.data,
      }),
    [overview?.tournaments, standingsState.data, tournamentsState.data]
  );

  const scrimDayResults = useMemo<ScrimDayResult[]>(
    () => buildScrimDayResultsFromCollections(scrimsState.data, [matchesState.data, matchResultsState.data]),
    [matchesState.data, matchResultsState.data, scrimsState.data]
  );

  return {
    configured: isClientFirebaseConfigured(),
    seasons: seasonsState.data,
    tournaments: tournamentsState.data,
    standings: standingsState.data,
    teams: teamsState.data,
    players: playersState.data,
    scrims: scrimsState.data,
    matches: matchesState.data,
    matchResults: matchResultsState.data,
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
  return useDocumentSnapshot<SiteStats & FirestoreRecord>(
    COLLECTIONS.siteStats,
    "main",
    initialStats ? ({ id: "main", ...initialStats } as SiteStats & FirestoreRecord) : null
  );
}

export function useRealtimeTournament(tournamentId: string, initialTournament: Tournament | null) {
  return useDocumentSnapshot<Tournament>(COLLECTIONS.tournaments, tournamentId, initialTournament);
}

export function useRealtimeTeams(initialTeams: Team[] = []) {
  return useCollectionSnapshot<Team>(COLLECTIONS.teams, initialTeams);
}

export function useRealtimePlayers(initialPlayers: Player[] = []) {
  return useCollectionSnapshot<Player>(COLLECTIONS.players, initialPlayers);
}

export function useRealtimeTournaments(initialTournaments: Tournament[] = []) {
  return useCollectionSnapshot<Tournament>(COLLECTIONS.tournaments, initialTournaments);
}

export function useRealtimeMatches(initialMatches: TournamentMatch[] = []) {
  return useCollectionSnapshot<TournamentMatch>(COLLECTIONS.matches, initialMatches);
}

export function useRealtimeTeam(teamId: string, initialTeam: Team | null) {
  return useDocumentSnapshot<Team>(COLLECTIONS.teams, teamId, initialTeam);
}

export function useRealtimePlayer(playerId: string, initialPlayer: Player | null) {
  return useDocumentSnapshot<Player>(COLLECTIONS.players, playerId, initialPlayer);
}

export function useRealtimeTournamentMatches(
  tournamentId: string | undefined,
  initialMatches: TournamentMatch[] = []
) {
  return useWhereSnapshot<TournamentMatch>(COLLECTIONS.matches, "tournamentId", tournamentId, initialMatches);
}

export function useRealtimeTournamentStandings(
  tournamentId: string | undefined,
  initialStandings: TournamentStanding[] = []
) {
  return useWhereSnapshot<TournamentStanding>(COLLECTIONS.standings, "tournamentId", tournamentId, initialStandings);
}

export function useRealtimeTournamentTeams(tournamentId: string | undefined, initialTeams: Team[] = []) {
  return useWhereSnapshot<Team>(COLLECTIONS.teams, "sourceTournamentId", tournamentId, initialTeams);
}

export function useRealtimeTournamentPlayers(tournamentId: string | undefined, initialPlayers: Player[] = []) {
  return useWhereSnapshot<Player>(COLLECTIONS.players, "sourceTournamentId", tournamentId, initialPlayers);
}

export function useRealtimeMatchPlayersByTeamName(
  teamName: string | undefined,
  initialMatchPlayers: MatchPlayerRecord[] = []
) {
  return useWhereSnapshot<MatchPlayerRecord>(COLLECTIONS.matchPlayers, "teamName", teamName, initialMatchPlayers);
}

export function useRealtimeMatchPlayersBySourcePlayerId(
  sourcePlayerId: string | undefined,
  initialMatchPlayers: MatchPlayerRecord[] = []
) {
  return useWhereSnapshot<MatchPlayerRecord>(
    COLLECTIONS.matchPlayers,
    "sourcePlayerId",
    sourcePlayerId,
    initialMatchPlayers
  );
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
  return [...players].sort(
    (firstPlayer, secondPlayer) =>
      (secondPlayer.totalPoints ?? secondPlayer.rating ?? 0) - (firstPlayer.totalPoints ?? firstPlayer.rating ?? 0) ||
      firstPlayer.name.localeCompare(secondPlayer.name)
  );
}

export function sortTournamentMatches(matches: TournamentMatch[]) {
  return [...matches].sort(
    (firstMatch, secondMatch) =>
      (firstMatch.sequenceNumber ?? Number.POSITIVE_INFINITY) - (secondMatch.sequenceNumber ?? Number.POSITIVE_INFINITY) ||
      (firstMatch.playedAt ?? "").localeCompare(secondMatch.playedAt ?? "")
  );
}

export function getMvpPlayer(players: Player[]) {
  return players.find((player) => player.isMvpOfWeek) ?? players[0] ?? null;
}

export function getLiveFeedFromStreams(streams: StreamSchedule[]) {
  return streams.find((stream) => stream.isLive) ?? streams[0] ?? null;
}
