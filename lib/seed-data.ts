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

export const seedStats: SiteStats = {
  teamsRegistered: 0,
  matchesHosted: 0,
  tournamentsCompleted: 0,
  prizePoolsAwarded: "Not imported yet",
  communityMembers: 0,
  youtubeViews: "Not imported yet",
};

export const seedTournaments: Tournament[] = [];

export const seedTeams: Team[] = [];

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
