import type {
  Announcement,
  LeaderboardRow,
  Player,
  SiteStats,
  SponsorItem,
  StreamSchedule,
  Team,
  Tournament,
  TournamentMatch,
  VideoItem,
} from "./types";
import { getBravoCanonicalTeams } from "./bravo-teams";

export const seedStats: SiteStats = {
  teamsRegistered: 0,
  matchesHosted: 0,
  tournamentsCompleted: 0,
  prizePoolsAwarded: "Season updates soon",
  communityMembers: 0,
  youtubeViews: "Channel updates soon",
};

export const seedTournaments: Tournament[] = [];

export const seedTeams: Team[] = getBravoCanonicalTeams().map((team) => ({
  id: team.id,
  name: team.name,
  tag: team.tag,
  slotNumber: team.slotNumber,
  totalPoints: 0,
  kills: 0,
  matches: 0,
  placementPoints: 0,
  killPoints: 0,
  averagePlacement: 0,
  chickenDinners: 0,
  status: "active",
  registrationStatus: "approved",
}));

export const seedPlayers: Player[] = [];

export const seedLeaderboard: LeaderboardRow[] = seedTeams.map((t, i) => ({
  rank: i + 1,
  teamId: t.id,
  team: t.name,
  matches: t.matches,
  kills: t.kills,
  placement: t.placementPoints ?? 0,
  points: t.totalPoints,
}));

export const seedAnnouncements: Announcement[] = [];

export const seedStreams: StreamSchedule[] = [];

export const seedVideos: VideoItem[] = [];

export const seedSponsors: SponsorItem[] = [];

/** Match results are imported from live PUBG API only — no seed match data. */
export const seedTournamentMatches: Record<string, TournamentMatch[]> = {};
