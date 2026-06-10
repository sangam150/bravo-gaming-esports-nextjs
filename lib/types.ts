import type { UploadType } from "./upload-config";

export type TournamentStatus = "LIVE" | "OPEN" | "REGISTERING" | "UPCOMING" | "COMPLETED";
export type RegistrationStatus = "pending" | "approved" | "rejected";
export type PlayerRole = "IGL" | "Assaulter" | "Support" | "Sniper" | "Substitute";
export type PlayerStatus = "active" | "inactive";
export type ScrimStatus = "scheduled" | "live" | "completed" | "waiting_for_data";
export type ScrimDayStatus = ScrimStatus | "mixed";
export type MatchDataSource = "pubg_api" | "manual_correction";

export interface Tournament {
  id: string;
  title: string;
  tier: string;
  status: TournamentStatus;
  prizePool: string;
  teamCount: number;
  maxTeams: number;
  startDate: string;
  endDate?: string;
  format: string;
  mode: string;
  server: string;
  description?: string;
  rules?: string;
  schedule?: string;
  mapRotation?: string[];
  bannerUrl?: string;
  registeredTeamIds?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface TournamentMatch {
  id: string;
  tournamentId?: string;
  scrimId?: string;
  pubgMatchId: string;
  map: string;
  winner: string;
  points: number;
  knockouts: number;
  placementPoints?: number;
  killPoints?: number;
  playedAt?: string;
  resultScreenshotUrl?: string;
  dataSource: MatchDataSource;
  syncedAt?: string;
  teamResults?: TeamMatchResult[];
}

export interface TeamMatchResult {
  teamId?: string;
  teamName: string;
  placement: number;
  kills: number;
  damage: number;
  placementPoints: number;
  killPoints: number;
  totalPoints: number;
}

export interface Team {
  id: string;
  name: string;
  tag?: string;
  slotNumber?: number;
  logo?: string;
  logoUrl?: string;
  country?: string;
  rank?: number;
  totalPoints: number;
  kills: number;
  matches: number;
  placementPoints?: number;
  status?: "active" | "pending" | "inactive";
  registrationStatus?: RegistrationStatus;
  playerIds?: string[];
  captainName?: string;
  captainDiscord?: string;
  captainPhone?: string;
  captainEmail?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Player {
  id: string;
  name: string;
  realName?: string;
  inGameName?: string;
  teamId?: string;
  teamName?: string;
  avatar?: string;
  avatarUrl?: string;
  pubgId?: string;
  pubgName?: string;
  role?: PlayerRole;
  discord?: string;
  phone?: string;
  email?: string;
  nationality?: string;
  playerStatus?: PlayerStatus;
  kills: number;
  damage: number;
  mvpCount: number;
  chickenDinners: number;
  matches: number;
  rating?: number;
  winRate?: number;
  isMvpOfWeek?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Scrim {
  id: string;
  title: string;
  date: string;
  map: string;
  lobbyTime: string;
  roomId?: string;
  roomPassword?: string;
  teamIds: string[];
  pubgMatchId?: string;
  pubgMatchIds?: string[];
  status: ScrimStatus;
  announcement?: string;
  mapRotation?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ScrimDayStanding {
  teamId?: string;
  teamName: string;
  matches: number;
  wins: number;
  kills: number;
  killPoints: number;
  placementPoints: number;
  totalPoints: number;
  bestPlacement: number;
  averagePlacement: number;
}

export interface ScrimDayResult {
  id: string;
  dayNumber: number;
  label: string;
  date: string;
  displayDate: string;
  status: ScrimDayStatus;
  scrimCount: number;
  completedMatches: number;
  pendingMatches: number;
  matchIds: string[];
  scrims: Scrim[];
  matches: TournamentMatch[];
  leaderboard: ScrimDayStanding[];
  announcements: string[];
  lastUpdatedAt?: string;
}

export interface Announcement {
  id: string;
  title: string;
  detail: string;
  date: string;
  category?: string;
  published?: boolean;
}

export interface TeamRegistration {
  id: string;
  teamName: string;
  captainName: string;
  captainDiscord: string;
  captainPhone?: string;
  captainEmail?: string;
  playerNames: string[];
  tournamentId?: string;
  status: RegistrationStatus;
  createdAt: string;
}

export interface SiteStats {
  teamsRegistered: number;
  matchesHosted: number;
  tournamentsCompleted: number;
  prizePoolsAwarded: string;
  communityMembers: number;
  youtubeViews: string;
}

export interface LeaderboardRow {
  rank: number;
  teamId: string;
  team: string;
  matches: number;
  kills: number;
  placement: number;
  points: number;
}

export interface StreamSchedule {
  id: string;
  time: string;
  title: string;
  platform?: string;
  isLive?: boolean;
  description?: string;
  viewers?: string;
  embedUrl?: string;
  channelUrl?: string;
  supportUrl?: string;
}

export interface VideoItem {
  id: string;
  title: string;
  category: string;
  duration: string;
  url?: string;
}

export interface UploadRecord {
  id: string;
  path: string;
  url: string;
  type: UploadType;
  entityId?: string;
  fileName?: string;
  contentType?: string;
  sizeBytes?: number;
  uploadedAt: string;
}

export interface ErrorLogRecord {
  id: string;
  scope: string;
  message: string;
  errorName?: string;
  stack?: string;
  method?: string;
  pathname?: string;
  search?: string;
  createdAt: string;
  details?: Record<string, unknown>;
}

export interface PubgMatchImport {
  id: string;
  pubgMatchId: string;
  mapName: string;
  gameMode: string;
  createdAt: string;
  duration?: number;
  tournamentId?: string;
  scrimId?: string;
  syncedAt: string;
  teamResults: TeamMatchResult[];
  dataSource: MatchDataSource;
}
