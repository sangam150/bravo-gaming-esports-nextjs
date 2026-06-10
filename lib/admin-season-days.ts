import { compareBravoTeamSlotOrder } from "./bravo-teams";
import { getSeason, getSeasonTeams, getSeasonTournaments, getScrims, saveSeason, saveTournament } from "./data";
import { COLLECTIONS, isFirebaseConfigured, saveFirestoreDocument } from "./firebase";
import type { Scrim, Season, Team, Tournament } from "./types";

const DEFAULT_LOBBY_TIME = "8:00 PM NPT";
const DEFAULT_MAP_ROTATION = ["Rondo", "Erangel", "Miramar", "Taego"];

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function addDays(startDate: string, dayOffset: number) {
  const [year, month, day] = startDate.split("-").map((value) => Number(value));
  const date = new Date(Date.UTC(year, month - 1, day + dayOffset, 12, 0, 0));
  return date.toISOString().slice(0, 10);
}

function buildDayTitle(season: Season, dayNumber: number) {
  const seriesTitle = season.seriesTitle?.trim() || season.title.trim();
  return `Day ${dayNumber} - ${seriesTitle}`;
}

function buildDayTournamentId(season: Season, dayNumber: number) {
  return `${season.id}--day-${dayNumber}`;
}

function buildDayScrimId(season: Season, dayNumber: number) {
  return `${season.id}--scrim-day-${dayNumber}`;
}

function getLatestTemplate<T extends Tournament | Scrim>(items: T[]) {
  return [...items].sort((firstItem, secondItem) => {
    const firstDay = "seasonDayNumber" in firstItem ? firstItem.seasonDayNumber ?? 0 : 0;
    const secondDay = "seasonDayNumber" in secondItem ? secondItem.seasonDayNumber ?? 0 : 0;
    return secondDay - firstDay;
  })[0] ?? null;
}

export async function createNextSeasonDay(seasonId: string) {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase is not configured. Connect Firestore before creating a new scrim day.");
  }

  const [season, seasonTournaments, seasonTeams, allScrims] = await Promise.all([
    getSeason(seasonId),
    getSeasonTournaments(seasonId),
    getSeasonTeams(seasonId),
    getScrims(),
  ]);

  if (!season) {
    throw new Error("Season not found.");
  }

  const seasonScrims = allScrims.filter((scrim) => scrim.seasonId === seasonId);
  const highestExistingDay = Math.max(
    season.currentDay ?? 0,
    ...seasonTournaments.map((tournament) => tournament.seasonDayNumber ?? tournament.dayNumber ?? 0),
    ...seasonScrims.map((scrim) => scrim.seasonDayNumber ?? 0)
  );
  const nextDayNumber = highestExistingDay + 1;
  const existingTournament = seasonTournaments.find(
    (tournament) => (tournament.seasonDayNumber ?? tournament.dayNumber) === nextDayNumber
  );
  const existingScrim = seasonScrims.find((scrim) => scrim.seasonDayNumber === nextDayNumber);

  if (existingTournament || existingScrim) {
    throw new Error(`Day ${nextDayNumber} already exists for this season.`);
  }

  const sortedTeams = [...seasonTeams].sort((firstTeam, secondTeam) => compareBravoTeamSlotOrder(firstTeam, secondTeam));
  const registeredTeamIds = sortedTeams.map((team) => team.id);
  const latestTournament = getLatestTemplate(seasonTournaments);
  const latestScrim = getLatestTemplate(seasonScrims);
  const title = buildDayTitle(season, nextDayNumber);
  const tournamentId = buildDayTournamentId(season, nextDayNumber);
  const scrimId = buildDayScrimId(season, nextDayNumber);
  const startDate = addDays(season.startDate, Math.max(nextDayNumber - 1, 0));
  const teamCapacity = Math.max(
    latestTournament?.maxTeams ?? 0,
    latestTournament?.teamCount ?? 0,
    registeredTeamIds.length,
    16
  );
  const mapRotation =
    latestScrim?.mapRotation && latestScrim.mapRotation.length > 0
      ? latestScrim.mapRotation
      : latestTournament?.mapRotation && latestTournament.mapRotation.length > 0
        ? latestTournament.mapRotation
        : DEFAULT_MAP_ROTATION;
  const now = new Date().toISOString();

  const previousCurrentTournament =
    seasonTournaments.find((tournament) => tournament.id === season.currentTournamentId) ??
    seasonTournaments.find((tournament) => (tournament.seasonDayNumber ?? tournament.dayNumber) === season.currentDay) ??
    null;
  const previousCurrentScrims = seasonScrims.filter((scrim) => scrim.seasonDayNumber === season.currentDay);

  if (previousCurrentTournament) {
    await saveTournament(
      {
        ...previousCurrentTournament,
        title: previousCurrentTournament.title,
        status: "COMPLETED",
      },
      previousCurrentTournament.id
    );
  }

  await Promise.all(
    previousCurrentScrims.map((scrim) =>
      saveFirestoreDocument(COLLECTIONS.scrims, scrim.id, {
        ...scrim,
        status: "completed",
      } as Record<string, unknown>)
    )
  );

  const tournament = await saveTournament(
    {
      title,
      tier: latestTournament?.tier ?? "OPEN",
      status: "LIVE",
      prizePool: latestTournament?.prizePool ?? "TBD",
      teamCount: registeredTeamIds.length,
      maxTeams: teamCapacity,
      startDate,
      format: latestTournament?.format ?? "TPP Squad",
      mode: latestTournament?.mode ?? "PUBG PC",
      server: latestTournament?.server ?? "Asia",
      perspective: latestTournament?.perspective ?? season.perspective ?? "TPP",
      description: `Official ${title} record for ${season.seriesTitle ?? season.title}.`,
      schedule: latestTournament?.schedule,
      mapRotation,
      registeredTeamIds,
      seasonId: season.id,
      seasonTitle: season.seriesTitle ?? season.title,
      seasonNumber: season.seasonNumber,
      seasonDayNumber: nextDayNumber,
      dayNumber: nextDayNumber,
      matchCount: 0,
      sourceProvider: "admin_manual",
      createdAt: now,
    },
    tournamentId
  );

  const scrimPayload: Scrim = {
    id: scrimId,
    title,
    date: startDate,
    map: latestScrim?.map ?? mapRotation[0] ?? "Pending",
    lobbyTime: latestScrim?.lobbyTime ?? DEFAULT_LOBBY_TIME,
    roomId: latestScrim?.roomId,
    roomPassword: latestScrim?.roomPassword,
    teamIds: registeredTeamIds,
    pubgMatchId: undefined,
    pubgMatchIds: [],
    status: "waiting_for_data",
    announcement: "Matches not imported yet.",
    mapRotation,
    seasonId: season.id,
    seasonTitle: season.seriesTitle ?? season.title,
    seasonDayNumber: nextDayNumber,
    tournamentId: tournament.id,
    createdAt: now,
    updatedAt: now,
  };

  await saveFirestoreDocument(COLLECTIONS.scrims, scrimId, scrimPayload as unknown as Record<string, unknown>);

  const updatedSeason = await saveSeason(
    {
      ...season,
      title: season.title,
      configuredDays: Math.max(season.configuredDays ?? nextDayNumber, nextDayNumber),
      currentDay: nextDayNumber,
      currentTournamentId: tournament.id,
      tournamentIds: Array.from(new Set([...(season.tournamentIds ?? []), tournament.id])),
      status: "active",
    },
    season.id
  );

  return {
    season: updatedSeason,
    tournament,
    scrim: scrimPayload,
    nextDayNumber,
    registeredTeams: sortedTeams.length,
  };
}
