export const SUPABASE_TABLES = {
  users: "users",
  seasons: "seasons",
  days: "days",
  events: "events",
  teams: "teams",
  players: "players",
  matches: "matches",
  matchPlayers: "match_players",
  matchResults: "match_results",
  pendingImports: "pending_imports",
  importLogs: "import_logs",
  rosterRequests: "roster_requests",
  announcements: "announcements",
  sponsors: "sponsors",
  videos: "videos",
  settings: "settings",
} as const;

export const SUPABASE_BUCKETS = {
  teamLogos: "team-logos",
  playerPhotos: "player-photos",
  tournamentBanners: "tournament-banners",
  sponsorLogos: "sponsor-logos",
  websiteAssets: "website-assets",
} as const;

export const SUPABASE_ROLES = [
  "super_admin",
  "admin",
  "moderator",
  "team_igl",
  "viewer",
] as const;

export type SupabaseRole = (typeof SUPABASE_ROLES)[number];
