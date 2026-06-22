import {
  buildFallbackTeamNameFromSlot,
  canonicalizeBravoTeamName,
  compareBravoTeamSlotOrder,
  parseBravoSlotNumber,
  resolveBravoTeamIdentity,
} from "./bravo-teams";
import {
  compareMatchSequenceOrder,
  comparePlayerLeaderboardPerformance,
  compareTeamLeaderboardPerformance,
  sortScrimDayStandings,
} from "./ranking-sort";
import { buildSeasonLeaderboard, seasonLeaderboardToRows } from "./season-standings";
import type {
  CurrentSeasonOverview,
  LeaderboardRow,
  MatchPlayerResult,
  Player,
  Scrim,
  ScrimDayResult,
  ScrimDayStanding,
  Team,
  Tournament,
  TournamentMatch,
  TournamentStanding,
  Season,
} from "./types";

const kathmanduDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kathmandu",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const kathmanduDayFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Kathmandu",
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
});

function compareIsoDateDesc(firstValue?: string, secondValue?: string) {
  return (secondValue ?? "").localeCompare(firstValue ?? "");
}

export function getCurrentSeasonFromCollections(seasons: Season[]) {
  return (
    seasons.find((season) => season.status === "active") ??
    seasons.find((season) => season.status === "planned") ??
    [...seasons].sort((firstSeason, secondSeason) => {
      const dateComparison = compareIsoDateDesc(firstSeason.startDate, secondSeason.startDate);
      if (dateComparison !== 0) return dateComparison;
      return (secondSeason.seasonNumber ?? 0) - (firstSeason.seasonNumber ?? 0);
    })[0] ??
    null
  );
}

function sortTournamentsByDay(firstTournament: Tournament, secondTournament: Tournament) {
  return (
    (firstTournament.seasonDayNumber ?? Number.POSITIVE_INFINITY) -
      (secondTournament.seasonDayNumber ?? Number.POSITIVE_INFINITY) ||
    firstTournament.startDate.localeCompare(secondTournament.startDate)
  );
}

function sortPlayers(firstPlayer: Player, secondPlayer: Player) {
  return comparePlayerLeaderboardPerformance(firstPlayer, secondPlayer);
}

function sortStandings(firstStanding: TournamentStanding, secondStanding: TournamentStanding) {
  return compareTeamLeaderboardPerformance(firstStanding, secondStanding);
}

function sortTeams(firstTeam: Team, secondTeam: Team) {
  return compareBravoTeamSlotOrder(firstTeam, secondTeam);
}

function hasTrackedTeamActivity(team: Team) {
  return (
    (team.matches ?? 0) > 0 ||
    (team.totalPoints ?? 0) > 0 ||
    (team.kills ?? 0) > 0 ||
    (team.killPoints ?? 0) > 0 ||
    (team.placementPoints ?? 0) > 0 ||
    (team.chickenDinners ?? 0) > 0 ||
    (team.seasonDayNumbers?.length ?? 0) > 0
  );
}

function hasManagedTeamProfile(team: Team) {
  return Boolean(
    (team.playerIds?.length ?? 0) > 0 ||
    team.logoUrl?.trim() ||
    team.logo?.trim() ||
    team.country?.trim() ||
    team.captainName?.trim() ||
    team.captainDiscord?.trim() ||
    team.captainEmail?.trim() ||
    team.captainPhone?.trim()
  );
}

function isPubliclyVisibleSeasonTeam(team: Team) {
  if (team.scope === "tournament") return false;
  if ((team.sourceProvider ?? "").trim() !== "season_bootstrap") return true;
  return hasTrackedTeamActivity(team) || hasManagedTeamProfile(team);
}

function normalizeTeam(team: Team): Team {
  const resolvedTeam = resolveBravoTeamIdentity(team.name ?? team.id ?? team.sourceTeamName);
  const inferredSlotNumber =
    resolvedTeam?.slotNumber ?? team.slotNumber ?? parseBravoSlotNumber(team.name) ?? parseBravoSlotNumber(team.sourceTeamName);

  return {
    ...team,
    name: resolvedTeam?.name ?? buildFallbackTeamNameFromSlot(inferredSlotNumber) ?? team.name,
    tag: resolvedTeam?.tag ?? team.tag,
    slotNumber: inferredSlotNumber,
  };
}

function normalizeTournamentMatch(match: TournamentMatch): TournamentMatch {
  return {
    ...match,
    winner: canonicalizeBravoTeamName(match.winner),
    teamResults: (match.teamResults ?? []).map((teamResult) => {
      const resolvedTeam = resolveBravoTeamIdentity(teamResult.teamName);
      const inferredSlotNumber =
        resolvedTeam?.slotNumber ?? teamResult.slotNumber ?? parseBravoSlotNumber(teamResult.teamName);

      return {
        ...teamResult,
        teamId: resolvedTeam?.id ?? teamResult.teamId,
        teamName: resolvedTeam?.name ?? buildFallbackTeamNameFromSlot(inferredSlotNumber) ?? teamResult.teamName,
        slotNumber: inferredSlotNumber,
      };
    }),
    playerResults: (match.playerResults ?? []).map((playerResult) => {
      const resolvedTeam = resolveBravoTeamIdentity(playerResult.teamName);
      const inferredSlotNumber =
        resolvedTeam?.slotNumber ?? playerResult.slotNumber ?? parseBravoSlotNumber(playerResult.teamName);

      return {
        ...playerResult,
        teamId: resolvedTeam?.id ?? playerResult.teamId,
        teamName:
          resolvedTeam?.name ?? buildFallbackTeamNameFromSlot(inferredSlotNumber) ?? playerResult.teamName,
        slotNumber: inferredSlotNumber,
      };
    }),
  };
}

export function buildFallbackLeaderboardRows(teams: Team[]): LeaderboardRow[] {
  return [...teams]
    .map(normalizeTeam)
    .filter((team) => team.scope !== "tournament" && (team.matches ?? 0) > 0)
    .sort((firstTeam, secondTeam) => compareTeamLeaderboardPerformance(firstTeam, secondTeam))
    .map((team, index) => ({
      rank: index + 1,
      teamId: team.id,
      team: team.name,
      slotNumber: team.slotNumber,
      matches: team.matches,
      kills: team.kills,
      killPoints: team.killPoints ?? team.kills,
      placement: team.placementPoints ?? 0,
      points: team.totalPoints,
      averagePlacement: team.averagePlacement,
      chickenDinners: team.chickenDinners,
      logoUrl: team.logoUrl ?? team.logo,
      scope: team.scope ?? "season",
    }));
}

export function buildCurrentSeasonOverviewFromCollections(input: {
  seasons: Season[];
  tournaments: Tournament[];
  standings: TournamentStanding[];
  teams: Team[];
  players: Player[];
}): CurrentSeasonOverview | null {
  const currentSeason = getCurrentSeasonFromCollections(input.seasons);
  if (!currentSeason) return null;

  const seasonTournaments = input.tournaments
    .filter((tournament) => tournament.seasonId === currentSeason.id)
    .sort(sortTournamentsByDay);

  const seasonStandings = input.standings
    .filter((standing) => standing.seasonId === currentSeason.id && standing.scope !== "season")
    .sort(sortStandings);

  const seasonTeams = input.teams
    .filter((team) => team.seasonId === currentSeason.id && team.scope === "season")
    .map(normalizeTeam)
    .filter(isPubliclyVisibleSeasonTeam)
    .sort(sortTeams);

  const seasonPlayers = input.players
    .filter((player) => player.seasonId === currentSeason.id && player.scope === "season")
    .sort(sortPlayers);

  const teamsById = new Map(seasonTeams.map((team) => [team.id, team]));
  const seasonLeaderboard = seasonLeaderboardToRows(buildSeasonLeaderboard(seasonStandings, teamsById));
  const currentTournament =
    seasonTournaments.find((tournament) => tournament.id === currentSeason.currentTournamentId) ??
    seasonTournaments.find((tournament) => tournament.seasonDayNumber === currentSeason.currentDay) ??
    null;

  const matchesPlayed = seasonTournaments.reduce(
    (totalMatches, tournament) => totalMatches + (tournament.matchCount ?? 0),
    0
  );
  const completedDays = seasonTournaments.filter((tournament) => (tournament.matchCount ?? 0) > 0).length;

  return {
    season: currentSeason,
    tournaments: seasonTournaments,
    leaderboard: seasonLeaderboard,
    teams: seasonTeams,
    players: seasonPlayers,
    currentTournament,
    registeredTeams: seasonTeams.length,
    matchesPlayed,
    completedDays,
    recentResults: seasonTournaments
      .filter((tournament) => (tournament.matchCount ?? 0) > 0)
      .slice(-3)
      .reverse(),
  };
}

export function buildTournamentLeaderboardGroups(input: {
  tournaments: Tournament[];
  standings: TournamentStanding[];
}) {
  return input.tournaments
    .filter((tournament) => typeof (tournament.seasonDayNumber ?? tournament.dayNumber) === "number")
    .sort(
      (firstTournament, secondTournament) =>
        (firstTournament.seasonDayNumber ?? firstTournament.dayNumber ?? 99) -
        (secondTournament.seasonDayNumber ?? secondTournament.dayNumber ?? 99)
    )
    .map((tournament) => ({
      id: tournament.id,
      title: `Day ${tournament.seasonDayNumber ?? tournament.dayNumber ?? "?"}`,
      subtitle: tournament.title,
      rows: input.standings
        .filter((standing) => standing.tournamentId === tournament.id)
        .sort(sortStandings)
        .map((standing) => ({
          rank: standing.rank,
          teamId: standing.teamId,
          team: canonicalizeBravoTeamName(standing.teamName),
          slotNumber: standing.slotNumber ?? resolveBravoTeamIdentity(standing.teamName)?.slotNumber,
          matches: standing.matches,
          kills: standing.kills,
          killPoints: standing.killPoints,
          placement: standing.placementPoints,
          points: standing.totalPoints,
          averagePlacement: standing.averagePlacement,
          chickenDinners: standing.wins,
          scope: "tournament" as const,
        })),
    }));
}

function toKathmanduDateKey(value?: string) {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) return null;

  const dateParts = kathmanduDateFormatter.formatToParts(parsedDate);
  const year = dateParts.find((part) => part.type === "year")?.value;
  const month = dateParts.find((part) => part.type === "month")?.value;
  const day = dateParts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) return null;
  return `${year}-${month}-${day}`;
}

function formatKathmanduDate(value: string) {
  const parsedDate = new Date(`${value}T00:00:00+05:45`);
  if (Number.isNaN(parsedDate.getTime())) return value;
  return kathmanduDayFormatter.format(parsedDate);
}

function getScrimLinkedMatchIds(scrim: Pick<Scrim, "pubgMatchId" | "pubgMatchIds">) {
  return Array.from(
    new Set([...(scrim.pubgMatchIds ?? []), scrim.pubgMatchId].filter((matchId): matchId is string => Boolean(matchId)))
  );
}

function buildScrimDayStatus(scrims: Scrim[]): ScrimDayResult["status"] {
  const uniqueStatuses = Array.from(new Set(scrims.map((scrim) => scrim.status)));

  if (uniqueStatuses.length === 1) {
    return uniqueStatuses[0] ?? "scheduled";
  }

  if (uniqueStatuses.includes("live")) return "live";
  if (uniqueStatuses.includes("waiting_for_data")) return "waiting_for_data";
  return "mixed";
}

function resolveScrimDayNumber(scrims: Scrim[], fallbackDayNumber: number) {
  const explicitDayNumbers = scrims
    .map((scrim) => scrim.seasonDayNumber)
    .filter((dayNumber): dayNumber is number => Number.isFinite(dayNumber));

  if (explicitDayNumbers.length === 0) {
    return fallbackDayNumber;
  }

  return Math.max(...explicitDayNumbers);
}

function aggregateScrimDayLeaderboard(matches: TournamentMatch[]): ScrimDayStanding[] {
  const standingsMap = new Map<
    string,
    ScrimDayStanding & {
      placementTotal: number;
      latestPlayedAt?: string;
      sequenceNumber?: number;
    }
  >();

  for (const match of matches) {
    for (const teamResult of match.teamResults ?? []) {
      const teamKey = teamResult.teamId ?? teamResult.teamName.toLowerCase();
      const currentStanding = standingsMap.get(teamKey) ?? {
        teamId: teamResult.teamId,
        teamName: teamResult.teamName,
        slotNumber: teamResult.slotNumber ?? resolveBravoTeamIdentity(teamResult.teamName)?.slotNumber,
        matches: 0,
        wins: 0,
        kills: 0,
        killPoints: 0,
        placementPoints: 0,
        totalPoints: 0,
        bestPlacement: Number.POSITIVE_INFINITY,
        averagePlacement: 0,
        placementTotal: 0,
        latestPlayedAt: match.playedAt,
        sequenceNumber: match.sequenceNumber,
      };

      currentStanding.matches += 1;
      currentStanding.wins += teamResult.placement === 1 ? 1 : 0;
      currentStanding.kills += teamResult.kills;
      currentStanding.killPoints += teamResult.killPoints ?? teamResult.kills;
      currentStanding.placementPoints += teamResult.placementPoints ?? 0;
      currentStanding.totalPoints += teamResult.totalPoints;
      currentStanding.bestPlacement = Math.min(currentStanding.bestPlacement, teamResult.placement);
      currentStanding.placementTotal += teamResult.placement;
      if ((match.playedAt ?? "").localeCompare(currentStanding.latestPlayedAt ?? "") >= 0) {
        currentStanding.latestPlayedAt = match.playedAt;
      }
      if ((match.sequenceNumber ?? Number.NEGATIVE_INFINITY) >= (currentStanding.sequenceNumber ?? Number.NEGATIVE_INFINITY)) {
        currentStanding.sequenceNumber = match.sequenceNumber;
      }

      standingsMap.set(teamKey, currentStanding);
    }
  }

  return sortScrimDayStandings(
    Array.from(standingsMap.values())
    .map(({ placementTotal, ...standing }) => ({
      ...standing,
      averagePlacement: Number((placementTotal / standing.matches).toFixed(2)),
    }))
  );
}

export function mergeUniqueMatches(matchCollections: TournamentMatch[][]) {
  const uniqueMatches = new Map<string, TournamentMatch>();

  for (const matches of matchCollections) {
    for (const match of matches) {
      uniqueMatches.set(match.id, match);
    }
  }

  return Array.from(uniqueMatches.values());
}

export function buildScrimDayResultsFromCollections(
  scrims: Scrim[],
  matchCollections: TournamentMatch[][]
): ScrimDayResult[] {
  if (scrims.length === 0) return [];
  const matchResults = mergeUniqueMatches(matchCollections).map(normalizeTournamentMatch);

  const scrimsByDate = new Map<string, Scrim[]>();
  for (const scrim of scrims) {
    const dateKey = toKathmanduDateKey(scrim.date) ?? scrim.date;
    const existingScrims = scrimsByDate.get(dateKey) ?? [];
    existingScrims.push(scrim);
    scrimsByDate.set(dateKey, existingScrims);
  }

  const orderedDateKeys = Array.from(scrimsByDate.keys()).sort((firstDate, secondDate) =>
    firstDate.localeCompare(secondDate)
  );

  return orderedDateKeys
    .map((dateKey, dayIndex) => {
      const dayScrims = [...(scrimsByDate.get(dateKey) ?? [])].sort(
        (firstScrim, secondScrim) =>
          firstScrim.date.localeCompare(secondScrim.date) ||
          (firstScrim.lobbyTime ?? "").localeCompare(secondScrim.lobbyTime ?? "") ||
          firstScrim.title.localeCompare(secondScrim.title)
      );

      const scrimIds = new Set(dayScrims.map((scrim) => scrim.id));
      const linkedMatchIds = new Set(dayScrims.flatMap((scrim) => getScrimLinkedMatchIds(scrim)));

      const dayMatchesMap = new Map<string, TournamentMatch>();
      for (const matchResult of matchResults) {
        const playedAtDateKey = toKathmanduDateKey(matchResult.playedAt);
        const isStandaloneScrimMatch =
          playedAtDateKey === dateKey && !matchResult.tournamentId && !matchResult.scrimId;
        const belongsToDay =
          (matchResult.scrimId ? scrimIds.has(matchResult.scrimId) : false) ||
          linkedMatchIds.has(matchResult.pubgMatchId) ||
          isStandaloneScrimMatch;

        if (belongsToDay) {
          dayMatchesMap.set(matchResult.id, matchResult);
        }
      }

      const dayMatches = Array.from(dayMatchesMap.values()).sort((firstMatch, secondMatch) =>
        compareMatchSequenceOrder(firstMatch, secondMatch)
      );

      const announcements = dayScrims
        .map((scrim) => scrim.announcement?.trim())
        .filter((announcement): announcement is string => Boolean(announcement));

      const syncedScrimIds = new Set(
        dayMatches.map((match) => match.scrimId).filter((scrimId): scrimId is string => Boolean(scrimId))
      );
      const syncedMatchIds = new Set(dayMatches.map((match) => match.pubgMatchId));
      const pendingMatches = dayScrims.reduce((pendingTotal, scrim) => {
        const configuredMatchIds = getScrimLinkedMatchIds(scrim);
        const expectedMatches = configuredMatchIds.length > 0 ? configuredMatchIds.length : 1;
        const syncedConfiguredMatches = configuredMatchIds.filter((matchId) => syncedMatchIds.has(matchId)).length;
        const syncedStandaloneMatch = syncedScrimIds.has(scrim.id) && configuredMatchIds.length === 0 ? 1 : 0;
        return pendingTotal + Math.max(expectedMatches - syncedConfiguredMatches - syncedStandaloneMatch, 0);
      }, 0);

      const latestUpdatedAt = [
        ...dayMatches.map((match) => match.syncedAt),
        ...dayScrims.map((scrim) => scrim.updatedAt),
      ]
        .filter((timestamp): timestamp is string => Boolean(timestamp))
          .sort((firstTimestamp, secondTimestamp) => firstTimestamp.localeCompare(secondTimestamp))
          .at(-1);
      const resolvedDayNumber = resolveScrimDayNumber(dayScrims, dayIndex + 1);

      return {
        id: `scrim-day-${dateKey}`,
        dayNumber: resolvedDayNumber,
        seasonDayNumber: resolvedDayNumber,
        label: `Day ${resolvedDayNumber}`,
        date: dateKey,
        displayDate: formatKathmanduDate(dateKey),
        status: buildScrimDayStatus(dayScrims),
        scrimCount: dayScrims.length,
        completedMatches: dayMatches.length,
        pendingMatches,
        matchIds: Array.from(new Set(dayMatches.map((match) => match.pubgMatchId))),
        scrims: dayScrims,
        matches: dayMatches,
        leaderboard: aggregateScrimDayLeaderboard(dayMatches),
        announcements,
        lastUpdatedAt: latestUpdatedAt,
      } satisfies ScrimDayResult;
    })
    .sort(
      (firstDay, secondDay) =>
        secondDay.dayNumber - firstDay.dayNumber || secondDay.date.localeCompare(firstDay.date)
    );
}

export function getMatchMvp(match: TournamentMatch): MatchPlayerResult | null {
  const playerResults = [...(match.playerResults ?? [])];
  if (playerResults.length === 0) return null;

  return (
    playerResults.sort(
      (firstPlayer, secondPlayer) =>
        secondPlayer.totalPoints - firstPlayer.totalPoints ||
        secondPlayer.kills - firstPlayer.kills ||
        secondPlayer.damage - firstPlayer.damage ||
        secondPlayer.assists - firstPlayer.assists ||
        firstPlayer.playerName.localeCompare(secondPlayer.playerName)
    )[0] ?? null
  );
}
