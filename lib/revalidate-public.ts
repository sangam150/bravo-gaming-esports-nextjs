import { revalidatePath } from "next/cache";

function revalidateMany(paths: Array<string | null | undefined>) {
  for (const path of new Set(paths.filter((value): value is string => Boolean(value)))) {
    revalidatePath(path);
  }
}

function revalidateLayouts(paths: Array<string | null | undefined>) {
  for (const path of new Set(paths.filter((value): value is string => Boolean(value)))) {
    revalidatePath(path, "layout");
  }
}

export function revalidateGamePaths(slug?: string | null) {
  revalidateMany(["/", "/games", slug ? `/games/${slug}` : null]);
  revalidateLayouts(["/games"]);
}

export function revalidatePlatformEventPaths(slug?: string | null) {
  revalidateMany(["/", "/events", "/calendar", "/matches", slug ? `/events/${slug}` : null]);
  revalidateLayouts(["/events", "/calendar", "/matches"]);
}

export function revalidatePlatformMediaPaths(slug?: string | null) {
  revalidateMany(["/", "/media", slug ? `/media/${slug}` : null]);
  revalidateLayouts(["/media"]);
}

export function revalidatePlatformSponsorPaths(slug?: string | null, eventSlugs?: string[] | null) {
  revalidateMany([
    "/",
    "/sponsors",
    "/pubg",
    "/events",
    slug ? `/sponsors/${slug}` : null,
    ...(eventSlugs ?? []).flatMap((eventSlug) => [`/events/${eventSlug}`, `/pubg/events/${eventSlug}`]),
  ]);
  revalidateLayouts(["/sponsors", "/pubg", "/events"]);
}

export function revalidateCompetitionPaths(matchId?: string | null) {
  revalidateMany([
    "/",
    "/current-season",
    "/leaderboard",
    "/statistics",
    "/mvp-ranking",
    "/pubg",
    "/pubg/leaderboards",
    "/pubg/results",
    "/pubg/teams",
    "/pubg/players",
    "/pubg/events",
    "/pubg/hall-of-fame",
    "/pubg/seasons/current",
    "/pubg-scrims",
    "/compare",
    "/pubg/compare",
    "/fantasy",
    "/pubg/fantasy",
    "/matches",
    "/results",
    "/events",
    "/teams",
    "/players",
    "/rankings",
    "/tournaments",
    "/calendar",
    matchId ? `/matches/${matchId}` : null,
    matchId ? `/results/matches/${matchId}` : null,
    matchId ? `/pubg/matches/${matchId}` : null,
  ]);
  revalidateLayouts([
    "/pubg",
    "/pubg/seasons",
    "/pubg/matches",
    "/pubg/events",
    "/pubg/teams",
    "/pubg/players",
    "/matches",
    "/results",
    "/events",
    "/teams",
    "/players",
    "/rankings",
    "/tournaments",
    "/compare",
    "/fantasy",
  ]);
}

export function revalidateTeamPaths(teamId?: string | null) {
  revalidateMany(["/", "/teams", "/pubg/teams", teamId ? `/teams/${teamId}` : null, teamId ? `/pubg/teams/${teamId}` : null]);
  revalidateLayouts(["/teams", "/pubg"]);
}

export function revalidatePlayerPaths(playerId?: string | null) {
  revalidateMany(["/", "/players", "/pubg/players", playerId ? `/players/${playerId}` : null, playerId ? `/pubg/players/${playerId}` : null]);
  revalidateLayouts(["/players", "/pubg"]);
}

export function revalidateTournamentPaths(tournamentId?: string | null) {
  revalidateCompetitionPaths();
  revalidateMany([tournamentId ? `/tournaments/${tournamentId}` : null]);
  revalidateLayouts(["/tournaments"]);
}
