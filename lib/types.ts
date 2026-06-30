import type { UploadType } from "./upload-config";

export type PlatformRole =
  | "super_admin"
  | "admin"
  | "moderator"
  | "organizer"
  | "coach"
  | "team_manager"
  | "team_igl"
  | "player"
  | "caster"
  | "viewer";
export type TournamentStatus = "LIVE" | "OPEN" | "REGISTERING" | "UPCOMING" | "COMPLETED";
export type RegistrationStatus = "pending" | "approved" | "rejected";
export type PlayerRole = "IGL" | "Assaulter" | "Support" | "Sniper" | "Substitute";
export type PlayerStatus = "active" | "inactive";
export type ScrimStatus = "scheduled" | "live" | "completed" | "waiting_for_data";
export type ScrimDayStatus = ScrimStatus | "mixed";
export type MatchDataSource = "pubg_api" | "manual_correction" | "external_feed";
export type SeasonStatus = "active" | "completed" | "archived" | "planned";
export type SeasonLength = 15 | 30 | number;

export interface Season {
  id: string;
  title: string;
  slug: string;
  seriesTitle: string;
  seasonNumber: number;
  status: SeasonStatus;
  startDate: string;
  configuredDays: SeasonLength;
  currentDay: number;
  currentTournamentId?: string;
  endDate?: string;
  completedAt?: string;
  archivedAt?: string;
  endedEarly?: boolean;
  notes?: string;
  description?: string;
  tournamentIds?: string[];
  game?: string;
  format?: string;
  region?: string;
  perspective?: string;
  sourceProvider?: string;
  createdAt?: string;
  updatedAt?: string;
}

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
  perspective?: string;
  description?: string;
  rules?: string;
  schedule?: string;
  mapRotation?: string[];
  bannerUrl?: string;
  registeredTeamIds?: string[];
  seasonId?: string;
  seasonTitle?: string;
  seasonNumber?: number;
  seasonDayNumber?: number;
  dayNumber?: number;
  matchCount?: number;
  sourceId?: string;
  sourceName?: string;
  sourceStatus?: string;
  sourceUrl?: string;
  sourceProvider?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TournamentMatch {
  id: string;
  tournamentId?: string;
  scrimId?: string;
  pubgMatchId: string;
  externalMatchId?: string;
  sequenceNumber?: number;
  matchNumber?: number;
  map: string;
  eventName?: string;
  eventSlug?: string;
  status?: "draft" | "published";
  winner: string;
  points: number;
  knockouts: number;
  placementPoints?: number;
  killPoints?: number;
  playedAt?: string;
  vodUrl?: string;
  resultScreenshotUrl?: string;
  scoreboardImageUrl?: string;
  resultImageUrl?: string;
  screenshotUrls?: string[];
  sourceUrl?: string;
  dataSource: MatchDataSource;
  syncedAt?: string;
  publishedAt?: string;
  deletedAt?: string;
  pointSystemId?: string;
  pointSystemName?: string;
  createdAt?: string;
  updatedAt?: string;
  teamResults?: TeamMatchResult[];
  playerResults?: MatchPlayerResult[];
}

export interface TeamMatchResult {
  teamId?: string;
  teamName: string;
  slotNumber?: number;
  placement: number;
  kills: number;
  damage: number;
  placementPoints: number;
  killPoints: number;
  totalPoints: number;
}

export interface MatchPlayerResult {
  playerId: string;
  playerName: string;
  pubgPlayerId?: string;
  teamId?: string;
  teamName: string;
  slotNumber?: number;
  placement: number;
  kills: number;
  assists: number;
  knocks: number;
  damage: number;
  survivalTime: number;
  placementPoints: number;
  totalPoints: number;
}

export interface Team {
  id: string;
  slug?: string;
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
  killPoints?: number;
  placementPoints?: number;
  averagePlacement?: number;
  chickenDinners?: number;
  status?: "active" | "pending" | "inactive";
  registrationStatus?: RegistrationStatus;
  playerIds?: string[];
  captainName?: string;
  captainDiscord?: string;
  captainPhone?: string;
  captainEmail?: string;
  scope?: "season" | "tournament";
  seasonId?: string;
  seasonTitle?: string;
  seasonDayNumbers?: number[];
  sourceTournamentId?: string;
  sourceTournamentTitle?: string;
  sourceTeamName?: string;
  sourceProvider?: string;
  deletedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Player {
  id: string;
  slug?: string;
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
  assists?: number;
  knocks?: number;
  placementPoints?: number;
  totalPoints?: number;
  averageDamage?: number;
  bestPlacement?: number;
  kills: number;
  damage: number;
  mvpCount: number;
  chickenDinners: number;
  matches: number;
  rating?: number;
  winRate?: number;
  isMvpOfWeek?: boolean;
  scope?: "season" | "tournament";
  seasonId?: string;
  seasonTitle?: string;
  seasonDayNumbers?: number[];
  sourceTournamentId?: string;
  sourceTournamentTitle?: string;
  sourcePlayerId?: string;
  sourceProvider?: string;
  deletedAt?: string;
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
  seasonId?: string;
  seasonTitle?: string;
  seasonDayNumber?: number;
  tournamentId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ScrimDayStanding {
  teamId?: string;
  teamName: string;
  slotNumber?: number;
  matches: number;
  wins: number;
  kills: number;
  killPoints: number;
  placementPoints: number;
  totalPoints: number;
  bestPlacement: number;
  averagePlacement: number;
}

export interface TournamentStanding {
  id: string;
  tournamentId: string;
  teamId: string;
  teamName: string;
  slotNumber?: number;
  matches: number;
  wins: number;
  kills: number;
  killPoints: number;
  placementPoints: number;
  totalPoints: number;
  bestPlacement: number;
  averagePlacement: number;
  rank: number;
  seasonId?: string;
  seasonTitle?: string;
  seasonDayNumber?: number;
  scope?: "tournament" | "season";
  sourceTournamentId?: string;
  sourceTournamentTitle?: string;
  sourceProvider?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ScrimDayResult {
  id: string;
  dayNumber: number;
  seasonDayNumber?: number;
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
  logoUrl?: string;
  logoPath?: string;
  logoUploadId?: string;
  approvedTeamId?: string;
  status: RegistrationStatus;
  createdAt: string;
  updatedAt?: string;
}

export interface SiteStats {
  teamsRegistered: number;
  matchesHosted: number;
  tournamentsCompleted: number;
  prizePoolsAwarded: string;
  communityMembers: number;
  youtubeViews: string;
  currentSeasonId?: string;
  currentSeasonTitle?: string;
  currentSeasonStatus?: SeasonStatus;
  currentSeasonStart?: string;
  currentSeasonLength?: SeasonLength;
  currentDay?: number;
}

export interface LeaderboardRow {
  rank: number;
  teamId: string;
  team: string;
  slotNumber?: number;
  matches: number;
  kills: number;
  killPoints?: number;
  placement: number;
  points: number;
  averagePlacement?: number;
  chickenDinners?: number;
  logoUrl?: string;
  scope?: "season" | "tournament";
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
  slug?: string;
  title: string;
  category: string;
  duration: string;
  url?: string;
  kind?: string;
  gameSlug?: string;
  summary?: string;
  imageUrl?: string;
  featured?: boolean;
  published?: boolean;
  source?: string;
  youtubeVideoId?: string;
  publishedAt?: string;
  deletedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type SponsorKind = "sponsor" | "partner" | "design";

export interface SponsorItem {
  id: string;
  name: string;
  kind?: SponsorKind;
  tier: string;
  url?: string;
  websiteUrl?: string;
  socialUrl?: string;
  logoUrl?: string;
  bannerUrl?: string;
  designAssetUrl?: string;
  slug?: string;
  description?: string;
  supportedEvents?: string[];
  eventSlugs?: string[];
  partnershipHistory?: string[];
  visible?: boolean;
  featured?: boolean;
  published?: boolean;
  showOnHomepage?: boolean;
  showOnSponsorsPage?: boolean;
  showOnEventPage?: boolean;
  showOnPubgPage?: boolean;
  deletedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ContactMessage {
  id: string;
  kind: "contact" | "feedback";
  name: string;
  email: string;
  subject?: string;
  message: string;
  status: "new" | "reviewed";
  createdAt: string;
  updatedAt?: string;
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

export interface AuthenticatedUserProfile {
  profileId: string | null;
  uid: string;
  email: string;
  role: PlatformRole | string;
  teamId: string | null;
  playerId: string | null;
  displayName: string | null;
  isAdmin: boolean;
}

export type RosterRequestType =
  | "add_player"
  | "remove_player"
  | "update_pubg_name"
  | "roster_change"
  | "logo_update";

export type ReviewStatus = "pending" | "approved" | "rejected" | "review_later";

export interface TeamRosterRequest {
  id: string;
  teamId: string;
  requestedBy: string | null;
  requestType: RosterRequestType | string;
  status: ReviewStatus;
  adminNote?: string | null;
  oldPlayerId?: string | null;
  newPlayerName?: string | null;
  newPlayerPubgName?: string | null;
  payload?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt?: string | null;
}

export interface MossSubmission {
  id: string;
  eventId?: string | null;
  eventName?: string | null;
  matchId?: string | null;
  teamId: string;
  playerId?: string | null;
  fileUrl?: string | null;
  externalLink?: string | null;
  status: "submitted" | "approved" | "rejected";
  adminNote?: string | null;
  createdAt: string;
}

export interface TeamEventSummary {
  id: string;
  name: string;
  slug?: string | null;
  status: string;
  type?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  rules?: string | null;
}

export interface TeamRecentMatch {
  matchId: string;
  eventName?: string | null;
  matchNumber?: number | null;
  mapName?: string | null;
  startTime?: string | null;
  placement: number;
  kills: number;
  totalPoints: number;
  wwcd: boolean;
  vodUrl?: string | null;
}

export interface TeamWorkspaceData {
  user: AuthenticatedUserProfile;
  team: {
    id: string;
    name: string;
    tag?: string | null;
    logoUrl?: string | null;
    region?: string | null;
    slotNumber?: number | null;
    isActive?: boolean | null;
  } | null;
  roster: Array<{
    id: string;
    pubgName: string;
    avatarUrl?: string | null;
    isActive?: boolean | null;
  }>;
  requests: TeamRosterRequest[];
  mossSubmissions: MossSubmission[];
  upcomingEvents: TeamEventSummary[];
  recentMatches: TeamRecentMatch[];
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
  playerResults?: MatchPlayerResult[];
  dataSource: MatchDataSource;
}

export interface MatchPlayerRecord {
  id: string;
  matchId: string;
  pubgMatchId: string;
  tournamentId?: string;
  scrimId?: string;
  seasonId?: string;
  seasonTitle?: string;
  seasonDayNumber?: number;
  map?: string;
  playedAt?: string;
  dataSource: MatchDataSource;
  sourcePlayerId: string;
  playerId: string;
  playerName: string;
  pubgPlayerId?: string;
  teamId?: string;
  teamName: string;
  slotNumber?: number;
  placement: number;
  kills: number;
  assists: number;
  knocks: number;
  damage: number;
  survivalTime: number;
  placementPoints: number;
  totalPoints: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface PubgPlayerMatchSummary {
  matchId: string;
  mapName: string;
  gameMode: string;
  createdAt: string;
  duration?: number;
  alreadyImported?: boolean;
}

export interface PubgPlayerLookup {
  playerId: string;
  playerName: string;
  shardId: string;
  recentMatches: PubgPlayerMatchSummary[];
}

export interface PubgImportWatcher {
  id: string;
  playerName: string;
  playerId?: string;
  shardId?: string;
  tournamentId?: string;
  scrimId?: string;
  enabled: boolean;
  autoImportNewMatches: boolean;
  autoPublishCandidates?: boolean;
  importedMatchIds?: string[];
  processedMatchIds?: string[];
  lastCheckedAt?: string;
  lastImportedAt?: string;
  lastDetectedAt?: string;
  lastCandidateStatus?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type PubgImportCandidateStatus =
  | "ignored"
  | "candidate"
  | "draft"
  | "needs_review"
  | "auto_published"
  | "failed";

export interface PubgImportCandidateSignal {
  label: string;
  score: number;
  detail?: string;
}

export interface PubgImportCandidate {
  id: string;
  watcherId: string;
  detectedFromPlayer: string;
  detectedFromPlayerId?: string;
  seasonId?: string;
  seasonDayNumber?: number;
  tournamentId?: string;
  tournamentTitle?: string;
  scrimId?: string;
  scrimTitle?: string;
  matchId: string;
  sourceMatchId: string;
  matchNumber?: number;
  targetMatchNumber?: number;
  map?: string;
  matchTime?: string;
  knownTeams: number;
  knownPlayers: number;
  unknownTeams: number;
  unknownPlayers: number;
  expectedTeamCount: number;
  expectedParticipantCount: number;
  actualTeamCount: number;
  actualParticipantCount: number;
  confidenceScore: number;
  confidenceReason: string;
  confidenceSignals: PubgImportCandidateSignal[];
  status: PubgImportCandidateStatus;
  autoPublishEnabled: boolean;
  canAutoPublish: boolean;
  duplicateImportedMatch: boolean;
  seriousRosterConflict: boolean;
  reviewPending?: boolean;
  preview: PubgImportPreview;
  error?: string;
  publishedAt?: string;
  importedDraftAt?: string;
  rejectedAt?: string;
  updatedAt?: string;
  createdAt?: string;
}

export interface PubgImportConflict {
  type: "player_team_mismatch";
  playerName: string;
  pubgPlayerId?: string;
  currentTeamId?: string;
  currentTeamName?: string;
  importedTeamId?: string;
  importedTeamName: string;
}

export type PubgImportWarningType =
  | "duplicate_match"
  | "duplicate_player"
  | "missing_field"
  | "roster_mismatch"
  | "team_assignment_conflict"
  | "unknown_player"
  | "unknown_team";

export type PubgImportPreviewSource = "pubg_api" | "db_cache";

export interface PubgImportWarning {
  type: PubgImportWarningType;
  message: string;
  field?: string;
  matchId?: string;
  playerName?: string;
  pubgPlayerId?: string;
  teamName?: string;
  rosterId?: string;
}

export interface PubgImportPreview {
  matchId: string;
  matchNumber?: number;
  alreadyImported: boolean;
  source: PubgImportPreviewSource;
  summary: {
    id?: string;
    mapName?: string;
    gameMode?: string;
    createdAt?: string;
    duration?: number;
    platform?: string;
    shard?: string;
    telemetryUrl?: string | null;
  };
  tournamentId?: string;
  tournamentTitle?: string;
  scrimId?: string;
  scrimTitle?: string;
  seasonId?: string;
  seasonDayNumber?: number;
  detectedTeams: number;
  detectedPlayers: number;
  teamResults: TeamMatchResult[];
  playerResults: MatchPlayerResult[];
  conflicts: PubgImportConflict[];
  warnings: PubgImportWarning[];
}

export interface PubgImportEdit {
  sourceMatchId: string;
  matchId?: string;
  matchNumber?: number;
  map?: string;
  playedAt?: string;
  teamResults?: TeamMatchResult[];
  playerResults?: MatchPlayerResult[];
}

export type PubgDuplicateMode = "overwrite" | "skip" | "error";

export interface PubgImportContext {
  seasonId?: string;
  seasonTitle?: string;
  seasonDayNumber?: number;
  tournamentId?: string;
  tournamentTitle?: string;
  scrimId?: string;
  scrimTitle?: string;
  createdDay?: boolean;
}

export interface PubgImportIssue {
  matchId: string;
  error: string;
  code:
    | "invalid_match_id"
    | "pubg_api_failed"
    | "scrim_day_missing"
    | "permission_denied"
    | "quota_exceeded"
    | "duplicate_match"
    | "database_write_failed"
    | "unknown_error";
  alreadyImported?: boolean;
}

export interface PubgBulkPreviewResult {
  context: PubgImportContext;
  previews: PubgImportPreview[];
  errors: PubgImportIssue[];
}

export interface PubgBulkImportResultItem {
  matchId: string;
  success: boolean;
  skipped?: boolean;
  alreadyImported?: boolean;
  error?: string;
  code?: PubgImportIssue["code"];
}

export interface PubgBulkImportResult {
  context: PubgImportContext;
  results: PubgBulkImportResultItem[];
  importedCount: number;
  skippedCount: number;
  failedCount: number;
}

export type PubgImportBatchStatus = "pending" | "approved" | "rejected";

export interface PubgImportBatchPreviewMatch {
  sourceMatchId: string;
  matchId: string;
  matchNumber?: number;
  map?: string;
  matchDate?: string;
  matchTime?: string;
  alreadyImported?: boolean;
  source: PubgImportPreviewSource;
  summary: PubgImportPreview["summary"];
  tournamentTitle?: string;
  scrimTitle?: string;
  teamResults: TeamMatchResult[];
  playerResults: MatchPlayerResult[];
  conflicts: PubgImportConflict[];
  warnings: PubgImportWarning[];
}

export interface PubgImportBatch {
  id: string;
  status: PubgImportBatchStatus;
  seasonId?: string;
  seasonTitle?: string;
  seasonDayNumber?: number;
  tournamentId?: string;
  tournamentTitle?: string;
  scrimId?: string;
  scrimTitle?: string;
  dayTitle?: string;
  dayDate?: string;
  dayMap?: string;
  dayLobbyTime?: string;
  dayMapRotation?: string[];
  matchIds: string[];
  duplicateMode: PubgDuplicateMode;
  screenshotUrl?: string;
  previews: PubgImportBatchPreviewMatch[];
  matchEdits: PubgImportEdit[];
  importResult?: PubgBulkImportResult;
  rejectedReason?: string;
  createdAt?: string;
  updatedAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
}

export interface CurrentSeasonOverview {
  season: Season;
  tournaments: Tournament[];
  leaderboard: LeaderboardRow[];
  teams: Team[];
  players: Player[];
  currentTournament: Tournament | null;
  registeredTeams: number;
  matchesPlayed: number;
  completedDays: number;
  recentResults: Tournament[];
}
