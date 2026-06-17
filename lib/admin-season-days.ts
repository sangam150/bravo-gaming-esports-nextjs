import { compareBravoTeamSlotOrder } from "./bravo-teams";
import { getSeason, getSeasonTeams, getSeasonTournaments, getScrims, saveSeason, saveTournament } from "./data";
import { COLLECTIONS, isFirebaseConfigured, saveFirestoreDocument } from "./firebase";
import type { Scrim, Season, Team, Tournament } from "./types";

const DEFAULT_LOBBY_TIME = "8:00 PM NPT";
const DEFAULT_MAP_ROTATION = ["Rondo", "Erangel", "Miramar", "Taego"];

type SeasonDayOverrides = {
  dayTitle?: string;
  dayDate?: string;
  dayMap?: string;
  dayLobbyTime?: string;
  dayMapRotation?: string[];
};

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

function cleanString(value?: string | null) {
  const normalizedValue = value?.trim();
  return normalizedValue ? normalizedValue : undefined;
}

function cleanStringArray(values?: string[] | null) {
  if (!values?.length) return undefined;

  const normalizedValues = Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
  return normalizedValues.length > 0 ? normalizedValues : undefined;
}

function normalizeSeasonDayOverrides(overrides?: SeasonDayOverrides) {
  return {
    dayTitle: cleanString(overrides?.dayTitle),
    dayDate: cleanString(overrides?.dayDate),
    dayMap: cleanString(overrides?.dayMap),
    dayLobbyTime: cleanString(overrides?.dayLobbyTime),
    dayMapRotation: cleanStringArray(overrides?.dayMapRotation),
  } satisfies SeasonDayOverrides;
}

function hasSeasonDayOverrides(overrides?: SeasonDayOverrides) {
  const normalizedOverrides = normalizeSeasonDayOverrides(overrides);
  return Boolean(
    normalizedOverrides.dayTitle ||
      normalizedOverrides.dayDate ||
      normalizedOverrides.dayMap ||
      normalizedOverrides.dayLobbyTime ||
      normalizedOverrides.dayMapRotation?.length
  );
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

async function loadSeasonDayCollections(seasonId: string) {
  const [season, seasonTournaments, seasonTeams, allScrims] = await Promise.all([
    getSeason(seasonId),
    getSeasonTournaments(seasonId),
    getSeasonTeams(seasonId),
    getScrims(),
  ]);

  if (!season) {
    throw new Error("Season not found.");
  }

  return {
    season,
    seasonTournaments,
    seasonTeams,
    seasonScrims: allScrims.filter((scrim) => scrim.seasonId === seasonId),
  };
}

function buildScrimPayloadForDay(input: {
  season: Season;
  tournament: Tournament;
  seasonTeams: Team[];
  seasonScrims: Scrim[];
  seasonDayNumber: number;
  overrides?: SeasonDayOverrides;
}) {
  const { season, tournament, seasonTeams, seasonScrims, seasonDayNumber } = input;
  const sortedTeams = [...seasonTeams].sort((firstTeam, secondTeam) => compareBravoTeamSlotOrder(firstTeam, secondTeam));
  const latestScrim = getLatestTemplate(seasonScrims);
  const overrides = normalizeSeasonDayOverrides(input.overrides);
  const mapRotation =
    overrides.dayMapRotation && overrides.dayMapRotation.length > 0
      ? overrides.dayMapRotation
      : latestScrim?.mapRotation && latestScrim.mapRotation.length > 0
      ? latestScrim.mapRotation
      : tournament.mapRotation && tournament.mapRotation.length > 0
        ? tournament.mapRotation
        : DEFAULT_MAP_ROTATION;
  const title = overrides.dayTitle ?? buildDayTitle(season, seasonDayNumber);
  const now = new Date().toISOString();

  return {
    id: buildDayScrimId(season, seasonDayNumber),
    title,
    date: overrides.dayDate ?? tournament.startDate ?? addDays(season.startDate, Math.max(seasonDayNumber - 1, 0)),
    map: overrides.dayMap ?? latestScrim?.map ?? mapRotation[0] ?? "Pending",
    lobbyTime: overrides.dayLobbyTime ?? latestScrim?.lobbyTime ?? DEFAULT_LOBBY_TIME,
    roomId: latestScrim?.roomId,
    roomPassword: latestScrim?.roomPassword,
    teamIds: sortedTeams.map((team) => team.id),
    pubgMatchId: undefined,
    pubgMatchIds: [],
    status: "waiting_for_data" as const,
    announcement: "Matches not imported yet.",
    mapRotation,
    seasonId: season.id,
    seasonTitle: season.seriesTitle ?? season.title,
    seasonDayNumber,
    tournamentId: tournament.id,
    createdAt: now,
    updatedAt: now,
  } satisfies Scrim;
}

export async function getSeasonDayContext(seasonId: string, seasonDayNumber: number) {
  const { season, seasonTournaments, seasonTeams, seasonScrims } = await loadSeasonDayCollections(seasonId);
  const tournament =
    seasonTournaments.find((item) => (item.seasonDayNumber ?? item.dayNumber) === seasonDayNumber) ?? null;
  const scrim =
    seasonScrims.find(
      (item) =>
        item.seasonDayNumber === seasonDayNumber ||
        (tournament ? item.tournamentId === tournament.id : false)
    ) ?? null;

  return {
    season,
    seasonTeams,
    seasonTournaments,
    seasonScrims,
    tournament,
    scrim,
  };
}

async function applySeasonDayOverrides(
  context: {
    tournament: Tournament;
    scrim: Scrim;
  },
  overrides?: SeasonDayOverrides
) {
  if (!hasSeasonDayOverrides(overrides)) {
    return context;
  }

  const normalizedOverrides = normalizeSeasonDayOverrides(overrides);
  const now = new Date().toISOString();
  const updatedTournament = {
    ...context.tournament,
    title: normalizedOverrides.dayTitle ?? context.tournament.title,
    startDate: normalizedOverrides.dayDate ?? context.tournament.startDate,
    mapRotation: normalizedOverrides.dayMapRotation ?? context.tournament.mapRotation,
  } satisfies Tournament;
  const updatedScrim = {
    ...context.scrim,
    title: normalizedOverrides.dayTitle ?? context.scrim.title,
    date: normalizedOverrides.dayDate ?? context.scrim.date,
    map: normalizedOverrides.dayMap ?? context.scrim.map,
    lobbyTime: normalizedOverrides.dayLobbyTime ?? context.scrim.lobbyTime ?? DEFAULT_LOBBY_TIME,
    mapRotation: normalizedOverrides.dayMapRotation ?? context.scrim.mapRotation,
    updatedAt: now,
  } satisfies Scrim;

  await Promise.all([
    saveTournament(updatedTournament, updatedTournament.id),
    saveFirestoreDocument(COLLECTIONS.scrims, updatedScrim.id, updatedScrim as unknown as Record<string, unknown>),
  ]);

  return {
    tournament: updatedTournament,
    scrim: updatedScrim,
  };
}

export async function ensureSeasonDay(
  seasonId: string,
  seasonDayNumber: number,
  options?: { createIfMissing?: boolean; overrides?: SeasonDayOverrides }
) {
  if (!isFirebaseConfigured()) {
    throw new Error("Supabase is not configured. Connect the Supabase data store before creating a new scrim day.");
  }

  if (!Number.isFinite(seasonDayNumber) || seasonDayNumber < 1) {
    throw new Error("A valid scrim day number is required.");
  }

  let created = false;
  let context = await getSeasonDayContext(seasonId, seasonDayNumber);

  if (!context.tournament && options?.createIfMissing !== false) {
    while ((context.season.currentDay ?? 0) < seasonDayNumber) {
      await createNextSeasonDay(seasonId);
      created = true;
      context = await getSeasonDayContext(seasonId, seasonDayNumber);
    }
  }

  if (!context.tournament) {
    throw new Error(`Scrim day missing. Day ${seasonDayNumber} does not exist for this season.`);
  }

  if (!context.scrim) {
    if (options?.createIfMissing === false) {
      throw new Error(`Scrim day missing. Day ${seasonDayNumber} has no scrim record yet.`);
    }

    const scrimPayload = buildScrimPayloadForDay({
      season: context.season,
      tournament: context.tournament,
      seasonTeams: context.seasonTeams,
      seasonScrims: context.seasonScrims,
      seasonDayNumber,
      overrides: options?.overrides,
    });
    await saveFirestoreDocument(COLLECTIONS.scrims, scrimPayload.id, scrimPayload as unknown as Record<string, unknown>);
    created = true;
    context = await getSeasonDayContext(seasonId, seasonDayNumber);
  }

  if (context.tournament && context.scrim) {
    const updatedDay = await applySeasonDayOverrides(
      {
        tournament: context.tournament,
        scrim: context.scrim,
      },
      options?.overrides
    );
    context = {
      ...context,
      tournament: updatedDay.tournament,
      scrim: updatedDay.scrim,
    };
  }

  return {
    season: context.season,
    tournament: context.tournament,
    scrim: context.scrim!,
    created,
  };
}

export async function createNextSeasonDay(seasonId: string, overrides?: SeasonDayOverrides) {
  if (!isFirebaseConfigured()) {
    throw new Error("Supabase is not configured. Connect the Supabase data store before creating a new scrim day.");
  }

  const { season, seasonTournaments, seasonTeams, seasonScrims } = await loadSeasonDayCollections(seasonId);
  const normalizedOverrides = normalizeSeasonDayOverrides(overrides);
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
  const title = normalizedOverrides.dayTitle ?? buildDayTitle(season, nextDayNumber);
  const tournamentId = buildDayTournamentId(season, nextDayNumber);
  const scrimId = buildDayScrimId(season, nextDayNumber);
  const startDate = normalizedOverrides.dayDate ?? addDays(season.startDate, Math.max(nextDayNumber - 1, 0));
  const teamCapacity = Math.max(
    latestTournament?.maxTeams ?? 0,
    latestTournament?.teamCount ?? 0,
    registeredTeamIds.length,
    16
  );
  const mapRotation =
    normalizedOverrides.dayMapRotation && normalizedOverrides.dayMapRotation.length > 0
      ? normalizedOverrides.dayMapRotation
      : latestScrim?.mapRotation && latestScrim.mapRotation.length > 0
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

  const scrimPayload = buildScrimPayloadForDay({
    season,
    tournament,
    seasonTeams,
    seasonScrims,
    seasonDayNumber: nextDayNumber,
    overrides: normalizedOverrides,
  });

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
