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

export const seedStats: SiteStats = {
  teamsRegistered: 64,
  matchesHosted: 500,
  tournamentsCompleted: 25,
  prizePoolsAwarded: "NPR 500,000+",
  communityMembers: 2000,
  youtubeViews: "1M+",
};

export const seedTournaments: Tournament[] = [
  {
    id: "48333",
    title: "Bravo Weekend Championship",
    tier: "A-TIER",
    status: "LIVE",
    prizePool: "NPR 75,000",
    teamCount: 24,
    maxTeams: 32,
    startDate: "2026-05-24",
    format: "TPP Squad",
    mode: "PUBG PC",
    server: "Asia",
    description: "The ultimate weekend battle where top teams compete for glory and prize money.",
  },
  {
    id: "61945",
    title: "Bravo Community Scrim",
    tier: "B-TIER",
    status: "OPEN",
    prizePool: "NPR 15,000",
    teamCount: 18,
    maxTeams: 32,
    startDate: "2026-05-28",
    format: "TPP Squad",
    mode: "PUBG PC",
    server: "Asia",
    description: "Community-driven scrim tournament open to all registered teams.",
  },
  {
    id: "71170",
    title: "Bravo Elite Series",
    tier: "C-TIER",
    status: "REGISTERING",
    prizePool: "NPR 32,000",
    teamCount: 12,
    maxTeams: 24,
    startDate: "2026-06-02",
    format: "TPP Squad",
    mode: "PUBG PC",
    server: "Asia",
    description: "Elite series for top-performing squads from weekly scrims.",
  },
  {
    id: "82001",
    title: "Bravo Invitational Cup",
    tier: "S-TIER",
    status: "UPCOMING",
    prizePool: "NPR 1,00,000",
    teamCount: 16,
    maxTeams: 16,
    startDate: "2026-06-10",
    format: "TPP Squad",
    mode: "PUBG PC",
    server: "Asia",
    description: "Invite-only championship featuring Nepal's top squads.",
  },
];

export const seedTeams: Team[] = [
  { id: "bravo-official", name: "Bravo Official", tag: "BRV", rank: 1, totalPoints: 384, kills: 152, matches: 24, placementPoints: 232, status: "active" },
  { id: "dead-eyes", name: "DeadEyes Guys", tag: "DE", rank: 2, totalPoints: 342, kills: 128, matches: 24, placementPoints: 214, status: "active" },
  { id: "horaa", name: "Horaa Esports", tag: "HOR", rank: 3, totalPoints: 308, kills: 110, matches: 24, placementPoints: 198, status: "active" },
  { id: "4k-gaming", name: "4K Gaming Nepal", tag: "4K", rank: 4, totalPoints: 272, kills: 96, matches: 24, placementPoints: 176, status: "active" },
  { id: "team-insane", name: "Team Insane", tag: "INS", rank: 5, totalPoints: 250, kills: 88, matches: 24, placementPoints: 162, status: "active" },
  { id: "elementrix", name: "Elementrix", tag: "ELM", rank: 6, totalPoints: 226, kills: 78, matches: 24, placementPoints: 148, status: "active" },
  { id: "aslaa", name: "Aslaa Esports", tag: "ASL", rank: 7, totalPoints: 208, kills: 72, matches: 24, placementPoints: 136, status: "active" },
  { id: "ruthless", name: "Ruthless Esports", tag: "RTH", rank: 8, totalPoints: 194, kills: 66, matches: 24, placementPoints: 128, status: "active" },
  { id: "nepali-ho", name: "Nepali Ho Ni Bro", tag: "NHB", rank: 9, totalPoints: 186, kills: 60, matches: 24, placementPoints: 116, status: "active" },
  { id: "t2k", name: "T2K Esports", tag: "T2K", rank: 10, totalPoints: 166, kills: 56, matches: 24, placementPoints: 108, status: "active" },
];

export const seedPlayers: Player[] = [
  { id: "bravosangam", name: "BravoSangam", teamId: "bravo-official", teamName: "Bravo Official", kills: 990, damage: 124580, mvpCount: 15, chickenDinners: 24, matches: 532, rating: 9.8, winRate: 0.78, isMvpOfWeek: true },
  { id: "bravorex", name: "BravoRex", teamId: "bravo-official", teamName: "Bravo Official", kills: 930, damage: 98230, mvpCount: 10, chickenDinners: 20, matches: 412, rating: 9.6, winRate: 0.72 },
  { id: "dedhantey", name: "De Dhantey", teamId: "dead-eyes", teamName: "DeadEyes Guys", kills: 910, damage: 95420, mvpCount: 8, chickenDinners: 18, matches: 398, rating: 9.4, winRate: 0.70 },
  { id: "horaa4flash", name: "Horaa4FLASH", teamId: "horaa", teamName: "Horaa Esports", kills: 910, damage: 89760, mvpCount: 7, chickenDinners: 16, matches: 376, rating: 9.2, winRate: 0.68 },
  { id: "insane4kyyy", name: "Insane4kyyy", teamId: "bravo-official", teamName: "Bravo Official", kills: 910, damage: 90120, mvpCount: 6, chickenDinners: 15, matches: 352, rating: 9.0, winRate: 0.65 },
  { id: "4kamafia", name: "4kAmafia", teamId: "4k-gaming", teamName: "4K Gaming Nepal", kills: 330, damage: 79230, mvpCount: 6, chickenDinners: 8, matches: 238, rating: 8.8, winRate: 0.64 },
  { id: "elementkjiran", name: "ElementkJiran", teamId: "elementrix", teamName: "Elementrix", kills: 310, damage: 78540, mvpCount: 5, chickenDinners: 7, matches: 230, rating: 8.6, winRate: 0.63 },
  { id: "aslaaanova", name: "AsLaaANova", teamId: "aslaa", teamName: "Aslaa Esports", kills: 310, damage: 72310, mvpCount: 5, chickenDinners: 6, matches: 305, rating: 8.4, winRate: 0.60 },
  { id: "ruthydemon", name: "RuthyDemon", teamId: "ruthless", teamName: "Ruthless Esports", kills: 395, damage: 69420, mvpCount: 4, chickenDinners: 9, matches: 290, rating: 8.2, winRate: 0.58 },
  { id: "t2kaction", name: "T2kAction", teamId: "t2k", teamName: "T2K Esports", kills: 395, damage: 64120, mvpCount: 4, chickenDinners: 8, matches: 278, rating: 8.0, winRate: 0.56 },
];

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
