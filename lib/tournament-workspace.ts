import "server-only";
import { unstable_cache } from "next/cache";
import { getAnnouncements, getPublicTournament, getSponsors, getTournamentMatches, getTournamentPlayers, getTournamentTeams } from "./data";
import { getEventProduction } from "./event-production-server";
import { buildBroadcastSnapshot, DEFAULT_BROADCAST_STATE, type BroadcastSnapshot } from "./broadcast";
import { buildTournamentStandings } from "./tournament-standings";
import type { EventProduction } from "./event-production";
import type { Announcement, Player, Team, Tournament, TournamentMatch, TournamentStanding } from "./types";
export type PublicTournamentWorkspace = Tournament & { serverTime: number; matches: TournamentMatch[]; teams: Team[]; players: Player[]; standings: TournamentStanding[]; production: EventProduction | null; sponsors: BroadcastSnapshot["sponsors"]; announcements: Announcement[] };
const readWorkspace = unstable_cache(async (id: string) => {
  const tournament = await getPublicTournament(id);
  if (!tournament) return { data: null, generatedAt: Date.now() };
  const [matches, teams, players, productionRecord, sponsors, announcements] = await Promise.all([getTournamentMatches(tournament.id), getTournamentTeams(tournament.id), getTournamentPlayers(tournament.id), getEventProduction(tournament.id), getSponsors(), getAnnouncements()]);
  const production = productionRecord.approved;
  const graphics = buildBroadcastSnapshot({ state: { ...DEFAULT_BROADCAST_STATE, tournamentId: tournament.id }, tournament, matches, teams, players, production, sponsors });
  const data: PublicTournamentWorkspace = { ...tournament, serverTime: Date.now(), matches, teams, players, standings: buildTournamentStandings(tournament.id, tournament.title, matches), production, sponsors: graphics.sponsors, announcements: announcements.filter(row => row.published === true && production?.announcementIds.includes(row.id)) };
  return { data, generatedAt: Date.now() };
}, ["public-tournament-workspace-v1"], { revalidate: 10, tags: ["broadcast"] });
export async function getPublicTournamentWorkspace(id: string) {
  const result = await readWorkspace(id);
  // A cached absence remains a safe 404 while it revalidates. Only stale
  // positive snapshots could expose withdrawn results and must fail closed.
  if (result.data && Date.now() - result.generatedAt > 20_000) throw new Error("Published tournament snapshot freshness expired.");
  return result.data;
}
