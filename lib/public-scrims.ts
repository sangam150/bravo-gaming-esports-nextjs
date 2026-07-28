import { buildScrimDayResultsFromCollections } from "./bravo-live-derivations";
import type { Scrim, ScrimDayResult } from "./types";
import { hasPublicDemoMarker } from "./public-content";
import { isExplicitlyPublishedMatch, sanitizePublicMatch } from "./public-match";

export type PublicScrim = Pick<
  Scrim,
  "id" | "title" | "date" | "map" | "lobbyTime" | "teamIds" | "pubgMatchId" | "pubgMatchIds" | "status" | "mapRotation"
>;

export type PublicScrimDayResult = Omit<ScrimDayResult, "scrims"> & {
  scrims: PublicScrim[];
};

export function isPublicScrim(scrim: Scrim) {
  return (
    scrim.published === true && !scrim.deletedAt && !hasPublicDemoMarker(scrim.id, scrim.title, scrim.announcement, scrim.seasonTitle)
  );
}

export function selectPublicScrims(scrims: readonly Scrim[]) {
  return scrims.filter(isPublicScrim);
}

export function toPublicScrim(scrim: Scrim): PublicScrim {
  return {
    id: scrim.id,
    title: scrim.title,
    date: scrim.date,
    map: scrim.map,
    lobbyTime: scrim.lobbyTime,
    teamIds: [...scrim.teamIds],
    pubgMatchId: scrim.pubgMatchId,
    pubgMatchIds: scrim.pubgMatchIds ? [...scrim.pubgMatchIds] : undefined,
    status: scrim.status,
    mapRotation: scrim.mapRotation ? [...scrim.mapRotation] : undefined,
  };
}

function toPublicScrimDayResult(day: ScrimDayResult): PublicScrimDayResult {
  return {
    id: day.id,
    dayNumber: day.dayNumber,
    seasonDayNumber: day.seasonDayNumber,
    label: day.label,
    date: day.date,
    displayDate: day.displayDate,
    status: day.status,
    scrimCount: day.scrimCount,
    completedMatches: day.completedMatches,
    pendingMatches: day.pendingMatches,
    matchIds: [...day.matchIds],
    scrims: selectPublicScrims(day.scrims).map(toPublicScrim),
    matches: day.matches.map((match) => sanitizePublicMatch(match)),
    leaderboard: day.leaderboard.map((standing) => ({ ...standing })),
    announcements: [...day.announcements],
    lastUpdatedAt: day.lastUpdatedAt,
  };
}

export function selectPublicScrimDays(days: readonly ScrimDayResult[]) {
  const publicScrims = selectPublicScrims(days.flatMap((day) => day.scrims));
  if (publicScrims.length === 0) return [];

  const publicScrimIds = new Set(publicScrims.map((scrim) => scrim.id));
  const publicMatchIds = new Set(
    publicScrims.flatMap((scrim) => [...(scrim.pubgMatchIds ?? []), scrim.pubgMatchId].filter((value): value is string => Boolean(value))),
  );
  const publicMatches = days
    .flatMap((day) => day.matches)
    .filter(
      (match) =>
        isExplicitlyPublishedMatch(match) &&
        ((match.scrimId ? publicScrimIds.has(match.scrimId) : false) || publicMatchIds.has(match.pubgMatchId)),
    )
    .map((match) => sanitizePublicMatch(match));

  return buildScrimDayResultsFromCollections(publicScrims, [publicMatches]).map(toPublicScrimDayResult);
}
