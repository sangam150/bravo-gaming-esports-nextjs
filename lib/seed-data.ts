import type {
  Announcement,
  LeaderboardRow,
  Player,
  SiteStats,
  StreamSchedule,
  Team,
  Tournament,
  TournamentMatch,
  VideoItem,
} from "./types";
import { getBravoCanonicalTeams } from "./bravo-teams";

export const seedStats: SiteStats = {
  teamsRegistered: getBravoCanonicalTeams().length,
  matchesHosted: 0,
  tournamentsCompleted: 0,
  prizePoolsAwarded: "Not imported yet",
  communityMembers: 0,
  youtubeViews: "Not imported yet",
};

export const seedTournaments: Tournament[] = [];

export const seedTeams: Team[] = getBravoCanonicalTeams().map((team) => ({
  ...team,
  totalPoints: 0,
  kills: 0,
  matches: 0,
  killPoints: 0,
  placementPoints: 0,
  registrationStatus: "approved",
  status: "active",
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

export const seedAnnouncements: Announcement[] = [
  { id: "ann-1", title: "Bravo Elite Series Announced!", detail: "Registration opens tomorrow for our biggest tournament yet.", date: "MAY 20, 2024", published: true },
  { id: "ann-2", title: "New Season Rewards & Rank Reset", detail: "Check out the new season rewards and rank reset details.", date: "MAY 18, 2024", published: true },
  { id: "ann-3", title: "Weekly Scrim Schedule Update", detail: "New timings and format for this week's scrims.", date: "MAY 16, 2024", published: true },
];

export const seedStreams: StreamSchedule[] = [
  {
    id: "stream-1",
    time: "Today, 8:00 PM",
    title: "PUBG PC Daily Scrims",
    platform: "YouTube",
    description: "Daily community scrims with live casting and standings updates.",
    channelUrl: "https://www.youtube.com/@bravogamingnepal7981",
    supportUrl: "https://kamaucha.me/bravo",
  },
  {
    id: "stream-2",
    time: "Tomorrow, 7:00 PM",
    title: "Tournament Practice",
    platform: "YouTube",
    description: "Practice lobby coverage and team comms highlights.",
    channelUrl: "https://www.youtube.com/@bravogamingnepal7981",
  },
  {
    id: "stream-3",
    time: "May 22, 8:00 PM",
    title: "Weekly Finals Review",
    platform: "YouTube",
    description: "Best plays, breakdowns, and review from the weekly finals.",
    channelUrl: "https://www.youtube.com/@bravogamingnepal7981",
  },
];

export const seedVideos: VideoItem[] = [
  { id: "vid-1", title: "Bravo Weekend Finals Highlights", category: "Highlights", duration: "24:35" },
  { id: "vid-2", title: "Insane 1v4 Clutches", category: "PUBG PC", duration: "18:42" },
  { id: "vid-3", title: "Best Moments #15", category: "Best Plays", duration: "15:20" },
  { id: "vid-4", title: "Tournament Champions", category: "Bravo Elite", duration: "12:08" },
];

/** Match results are imported from live PUBG API only — no seed match data. */
export const seedTournamentMatches: Record<string, TournamentMatch[]> = {};
