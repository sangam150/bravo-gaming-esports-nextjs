import { COLLECTIONS, fetchDocumentCollection, isDocumentStoreConfigured } from "./document-store";
import { getSupabaseServiceRoleClient } from "./supabase/service-role-client";
import { isSupabaseServiceRoleConfigured } from "./supabase/server-env";
import { placementPoints, totalPoints } from "./pubg";
import {
  buildPubgPlayerBoardRows,
  buildPubgTeamBoardRows,
  comparePubgPlayers,
  comparePubgTeams,
  getRankedPlayers,
  getRankedTeams,
  type PubgPlayerBoardRow,
  type PubgTeamBoardRow,
} from "./pubg-rankings";
import { BRAVO_DISCORD_URL } from "./brand-links";
import { hasPublicDemoMarker, hasPublicDemoSeedTag, sanitizePublicAssetUrl, sanitizePublicCopy } from "./public-content";
import { normalizeMapName } from "./tournament-standings";
import { getUserFacingPlayerLabel, getUserFacingTeamLabel } from "./user-facing-errors";
import type { Player, Scrim, Team, Tournament, TournamentMatch } from "./types";
import type { Database } from "@/types/database.types";

export type PubgHubSource = "supabase" | "launch_seed" | "empty";
export type PubgHubEventStatus = "upcoming" | "ongoing" | "finished";
export type PubgHubEventState = "published" | "locked" | "draft";

export interface PubgHubRosterEntry {
  playerId: string;
  pubgName: string;
  avatarUrl?: string | null;
  role: string;
  active: boolean;
}

export interface PubgHubRosterHistoryEntry {
  playerId: string;
  pubgName: string;
  startDate: string;
  endDate?: string | null;
  status: string;
}

export interface PubgHubMapStat {
  map: string;
  matches: number;
  kills: number;
  points: number;
  wins: number;
  avgPlacement: number;
  damage: number;
}

export interface PubgHubRecentMatch {
  matchId: string;
  eventId: string;
  eventSlug: string;
  eventName: string;
  matchNumber: number;
  mapName: string;
  startTime: string;
  placement: number;
  kills: number;
  totalPoints: number;
  wwcd: boolean;
  damage?: number;
  assists?: number;
  knocks?: number;
  teamId: string;
  teamName: string;
  playerId?: string;
  playerName?: string;
  vodUrl?: string | null;
}

export interface PubgHubEventStandingRow {
  rank: number;
  teamId: string;
  teamName: string;
  tag?: string | null;
  logoUrl?: string | null;
  slotNumber?: number | null;
  matches: number;
  wins: number;
  kills: number;
  killPoints: number;
  placementPoints: number;
  totalPoints: number;
  avgPlacement: number;
  bestPlacement: number;
  trend: number[];
}

export interface PubgHubEventPlayerRow {
  rank: number;
  playerId: string;
  pubgName: string;
  teamId?: string | null;
  teamName?: string | null;
  avatarUrl?: string | null;
  matches: number;
  kills: number;
  assists: number;
  knocks: number;
  damage: number;
  avgKills: number;
  avgDamage: number;
  mvpCount: number;
  trend: number[];
}

export interface PubgHubTeamEventStat {
  eventId: string;
  eventSlug: string;
  eventName: string;
  eventType: string;
  eventStatus: PubgHubEventStatus;
  state: PubgHubEventState;
  matches: number;
  kills: number;
  wins: number;
  totalPoints: number;
  avgPlacement: number;
  rank?: number;
}

export interface PubgHubPlayerEventStat {
  eventId: string;
  eventSlug: string;
  eventName: string;
  eventStatus: PubgHubEventStatus;
  matches: number;
  kills: number;
  assists: number;
  knocks: number;
  damage: number;
  avgKills: number;
  avgDamage: number;
  rank?: number;
}

export interface PubgHubMatchTeamResult {
  teamId: string;
  teamName: string;
  tag?: string | null;
  slotNumber?: number | null;
  logoUrl?: string | null;
  placement: number;
  kills: number;
  placementPoints: number;
  killPoints: number;
  totalPoints: number;
  wwcd: boolean;
}

export interface PubgHubMatchPlayerResult {
  playerId: string;
  pubgName: string;
  teamId: string;
  teamName: string;
  avatarUrl?: string | null;
  placement: number;
  kills: number;
  assists: number;
  knocks: number;
  damage: number;
  survivalTime: number;
}

export interface PubgHubMatch {
  id: string;
  eventId: string;
  eventSlug: string;
  eventName: string;
  eventStatus: PubgHubEventStatus;
  matchNumber: number;
  mapName: string;
  startTime: string;
  status: string;
  vodUrl?: string | null;
  teamResults: PubgHubMatchTeamResult[];
  playerResults: PubgHubMatchPlayerResult[];
  winnerTeamId?: string;
  winnerTeamName?: string;
  totalKills: number;
  totalDamage: number;
}

export interface PubgHubTeam {
  id: string;
  slug: string;
  name: string;
  tag?: string | null;
  logoUrl?: string | null;
  region?: string | null;
  slotNumber?: number | null;
  active: boolean;
  matches: number;
  wins: number;
  kills: number;
  damage: number;
  placementPoints: number;
  killPoints: number;
  totalPoints: number;
  avgPlacement: number;
  formScore: number;
  formLabel: string;
  currentRoster: PubgHubRosterEntry[];
  rosterHistory: PubgHubRosterHistoryEntry[];
  recentPlacements: number[];
  recentPoints: number[];
  recentKills: number[];
  recentMatches: PubgHubRecentMatch[];
  mapStats: PubgHubMapStat[];
  eventStats: PubgHubTeamEventStat[];
}

export interface PubgHubPlayer {
  id: string;
  slug: string;
  pubgName: string;
  avatarUrl?: string | null;
  currentTeamId?: string | null;
  currentTeamName?: string | null;
  currentTeamTag?: string | null;
  currentTeamLogoUrl?: string | null;
  active: boolean;
  matches: number;
  kills: number;
  assists: number;
  knocks: number;
  damage: number;
  avgKills: number;
  avgDamage: number;
  wins: number;
  mvpCount: number;
  formScore: number;
  formLabel: string;
  bestMatch?: PubgHubRecentMatch | null;
  recentTrend: number[];
  recentDamageTrend: number[];
  recentMatches: PubgHubRecentMatch[];
  previousTeams: string[];
  eventStats: PubgHubPlayerEventStat[];
  mapStats: PubgHubMapStat[];
}

export interface PubgHubEvent {
  id: string;
  name: string;
  slug: string;
  type: string;
  status: PubgHubEventStatus;
  state: PubgHubEventState;
  syncStatus: "synced" | "awaiting_approval" | "scheduled" | "draft";
  region: string;
  game: string;
  mode: string;
  perspective: string;
  prizePool: string;
  startDate: string;
  endDate?: string | null;
  bannerUrl?: string | null;
  description?: string | null;
  rules?: string | null;
  streamUrl?: string | null;
  discordUrl?: string | null;
  teamCount: number;
  matchCount: number;
  teamIds: string[];
  topTeamId?: string;
  topPlayerId?: string;
  standings: PubgHubEventStandingRow[];
  playerTable: PubgHubEventPlayerRow[];
  matches: PubgHubMatch[];
  mapStats: PubgHubMapStat[];
}

export interface PubgHubFantasyEvent {
  eventId: string;
  eventName: string;
  eventSlug: string;
  region: string;
  startDate: string;
  locked: boolean;
  statusLabel: string;
}

export interface PubgHubFantasyPlayer {
  rank: number;
  playerId: string;
  pubgName: string;
  teamName?: string | null;
  score: number;
  kills: number;
  knocks: number;
  assists: number;
  damage: number;
  matches: number;
  tier: string;
}

export interface PubgHubDataset {
  source: PubgHubSource;
  generatedAt: string;
  communities: string[];
  summary: {
    trackedMatches: number;
    activeEvents: number;
    teamsInForm: number;
    recentEvents: number;
    communitiesActive: number;
  };
  teams: PubgHubTeam[];
  players: PubgHubPlayer[];
  events: PubgHubEvent[];
  matches: PubgHubMatch[];
  fantasy: {
    enabled: boolean;
    events: PubgHubFantasyEvent[];
    leaderboard: PubgHubFantasyPlayer[];
  };
}

type BaseTeamRow = {
  id: string;
  slug: string;
  name: string;
  tag?: string | null;
  logoUrl?: string | null;
  region?: string | null;
  slotNumber?: number | null;
  active: boolean;
};

type BasePlayerRow = {
  id: string;
  slug: string;
  pubgName: string;
  avatarUrl?: string | null;
  teamId?: string | null;
  active: boolean;
};

type BaseRosterRow = {
  teamId: string;
  playerId: string;
  startDate: string;
  endDate?: string | null;
  status: string;
};

type BaseEventRow = {
  id: string;
  name: string;
  slug: string;
  type: string;
  status: PubgHubEventStatus;
  state: PubgHubEventState;
  region: string;
  game: string;
  mode: string;
  perspective: string;
  prizePool: string;
  startDate: string;
  endDate?: string | null;
  bannerUrl?: string | null;
  description?: string | null;
  rules?: string | null;
  streamUrl?: string | null;
  discordUrl?: string | null;
  published: boolean;
};

type BaseEventTeamRow = {
  eventId: string;
  teamId: string;
  slotNumber?: number | null;
  status: string;
};

type BaseMatchRow = {
  id: string;
  eventId: string;
  matchNumber: number;
  mapName: string;
  startTime: string;
  status: string;
  vodUrl?: string | null;
};

type BaseTeamResultRow = {
  id: string;
  matchId: string;
  teamId: string;
  placement: number;
  kills: number;
  placementPoints: number;
  killPoints: number;
  totalPoints: number;
  wwcd: boolean;
};

type BasePlayerResultRow = {
  id: string;
  matchId: string;
  playerId: string;
  teamId: string;
  kills: number;
  assists: number;
  knocks: number;
  damage: number;
  survivalTime: number;
};

type BaseDataset = {
  source: PubgHubSource;
  teams: BaseTeamRow[];
  players: BasePlayerRow[];
  rosterHistory: BaseRosterRow[];
  events: BaseEventRow[];
  eventTeams: BaseEventTeamRow[];
  matches: BaseMatchRow[];
  teamResults: BaseTeamResultRow[];
  playerResults: BasePlayerResultRow[];
};

type TeamDefinition = {
  id: string;
  name: string;
  tag: string;
  slotNumber: number;
  region: string;
};

type TeamPalette = {
  primary: string;
  secondary: string;
  accent: string;
};

const BRAVO_TEAM_DEFINITIONS: TeamDefinition[] = [
  { id: "fyb-esports", name: "FYB Esports", tag: "FYB", slotNumber: 1, region: "Kathmandu" },
  { id: "mandem-boyz", name: "Mandem BoyZ", tag: "MBZ", slotNumber: 2, region: "Pokhara" },
  { id: "the-lost-mc-esports", name: "The Lost MC Esports", tag: "LMC", slotNumber: 3, region: "Lalitpur" },
  { id: "omega-tactix", name: "Omega Tactix", tag: "OTX", slotNumber: 4, region: "Kathmandu" },
  { id: "npl", name: "NPL", tag: "NPL", slotNumber: 5, region: "Biratnagar" },
  { id: "near-edge-protocol", name: "N3P", tag: "N3P", slotNumber: 6, region: "Chitwan" },
  { id: "team-haku", name: "Team HAKU", tag: "HAKU", slotNumber: 7, region: "Kathmandu" },
  { id: "loot-addicts", name: "Loot Addicts", tag: "LA", slotNumber: 8, region: "Pokhara" },
  { id: "mujuverse", name: "Mujuverse", tag: "MV", slotNumber: 9, region: "Lalitpur" },
  { id: "lang-tang-gang", name: "LTG", tag: "LTG", slotNumber: 10, region: "Chitwan" },
  { id: "kds", name: "KDS", tag: "KDS", slotNumber: 11, region: "Butwal" },
  { id: "bir-gorkhali", name: "Bir Gorkhali", tag: "BG", slotNumber: 12, region: "Kathmandu" },
  { id: "illumaniti-gamers", name: "Illumaniti Gamers", tag: "IG", slotNumber: 13, region: "Dharan" },
  { id: "sons-of-nepal", name: "Sons of Nepal", tag: "SONS", slotNumber: 14, region: "Bhaktapur" },
  { id: "ace", name: "Ace", tag: "ACE", slotNumber: 15, region: "Lalitpur" },
  { id: "m8", name: "M8", tag: "M8", slotNumber: 16, region: "Kathmandu" },
  { id: "69-esports", name: "69 Esports", tag: "69E", slotNumber: 17, region: "Pokhara" },
  { id: "arabpati-esports", name: "Arabpati Esports", tag: "AE", slotNumber: 18, region: "Birgunj" },
  { id: "fam", name: "Fam", tag: "FAM", slotNumber: 19, region: "Chitwan" },
  { id: "families", name: "Families", tag: "FMLS", slotNumber: 20, region: "Kathmandu" },
];

const PLAYER_NAMES_BY_TEAM: Record<string, string[]> = {
  "fyb-esports": ["FYB_Slice", "FYB_Arc", "FYB_Veon", "FYB_Mantle"],
  "mandem-boyz": ["MBZ_Howl", "MBZ_Ghost", "MBZ_Karma", "MBZ_Orbit"],
  "the-lost-mc-esports": ["LMC_Rogue", "LMC_Ash", "LMC_Flint", "LMC_Mox"],
  "omega-tactix": ["OTX_Quartz", "OTX_Pyro", "OTX_Fable", "OTX_Jett"],
  npl: ["NPL_Saber", "NPL_Raze", "NPL_Halo", "NPL_Edge"],
  "near-edge-protocol": ["N3P_Vanta", "N3P_Mesh", "N3P_Kilo", "N3P_Reign"],
  "team-haku": ["HAKU_Yeti", "HAKU_Zen", "HAKU_Mora", "HAKU_Pulse"],
  "loot-addicts": ["LA_Jynx", "LA_Hexa", "LA_Burst", "LA_Trek"],
  mujuverse: ["MV_Sundown", "MV_Spire", "MV_Coda", "MV_Frost"],
  "lang-tang-gang": ["LTG_Shadow", "LTG_Monk", "LTG_Cinder", "LTG_Bloom"],
  kds: ["KDS_Drift", "KDS_Wisp", "KDS_Delta", "KDS_Rook"],
  "bir-gorkhali": ["BG_Valor", "BG_Raptor", "BG_Pinn", "BG_Titan"],
  "illumaniti-gamers": ["IG_Wave", "IG_Mercy", "IG_Surge", "IG_Crown"],
  "sons-of-nepal": ["SONS_Nova", "SONS_Myth", "SONS_Void", "SONS_Ridge"],
  ace: ["ACE_Blade", "ACE_Harbor", "ACE_Yarn", "ACE_Nyx"],
  m8: ["TommyVercettio_o", "M8_Rush", "M8_Snipez", "M8_Draco"],
  "69-esports": ["69E_Volt", "69E_Peak", "69E_Scout", "69E_Tempo"],
  "arabpati-esports": ["AE_Cash", "AE_Dagger", "AE_Solid", "AE_Torque"],
  fam: ["FAM_Crux", "FAM_Rune", "FAM_Rocket", "FAM_Warden"],
  families: ["FMLS_Glow", "FMLS_Motion", "FMLS_Leaf", "FMLS_Rally"],
};

const TEAM_PALETTES: Record<string, TeamPalette> = {
  "fyb-esports": { primary: "#00c6ff", secondary: "#005bea", accent: "#9be7ff" },
  "mandem-boyz": { primary: "#ff8a00", secondary: "#ff3d00", accent: "#ffd180" },
  "the-lost-mc-esports": { primary: "#6d28d9", secondary: "#312e81", accent: "#c4b5fd" },
  "omega-tactix": { primary: "#14b8a6", secondary: "#0f766e", accent: "#99f6e4" },
  npl: { primary: "#ff512f", secondary: "#dd2476", accent: "#ffc8dd" },
  "near-edge-protocol": { primary: "#00e676", secondary: "#00897b", accent: "#b9f6ca" },
  "team-haku": { primary: "#3b82f6", secondary: "#1d4ed8", accent: "#bfdbfe" },
  "loot-addicts": { primary: "#f97316", secondary: "#b91c1c", accent: "#fed7aa" },
  mujuverse: { primary: "#8b5cf6", secondary: "#4c1d95", accent: "#ddd6fe" },
  "lang-tang-gang": { primary: "#22c55e", secondary: "#166534", accent: "#bbf7d0" },
  kds: { primary: "#facc15", secondary: "#ca8a04", accent: "#fef08a" },
  "bir-gorkhali": { primary: "#ef4444", secondary: "#7f1d1d", accent: "#fecaca" },
  "illumaniti-gamers": { primary: "#38bdf8", secondary: "#0f172a", accent: "#bae6fd" },
  "sons-of-nepal": { primary: "#fb7185", secondary: "#9f1239", accent: "#fecdd3" },
  ace: { primary: "#f59e0b", secondary: "#78350f", accent: "#fde68a" },
  m8: { primary: "#10b981", secondary: "#0f766e", accent: "#a7f3d0" },
  "69-esports": { primary: "#a855f7", secondary: "#581c87", accent: "#e9d5ff" },
  "arabpati-esports": { primary: "#f43f5e", secondary: "#881337", accent: "#fecdd3" },
  fam: { primary: "#f97316", secondary: "#7c2d12", accent: "#fdba74" },
  families: { primary: "#06b6d4", secondary: "#164e63", accent: "#a5f3fc" },
};

const MAP_SEQUENCE = ["Rondo", "Erangel", "Miramar", "Taego", "Erangel", "Rondo"] as const;

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function encodeSvg(svg: string) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function getTeamPalette(team: Pick<TeamDefinition, "id" | "tag">): TeamPalette {
  const preset = TEAM_PALETTES[team.id];
  if (preset) {
    return preset;
  }

  const hash = Array.from(team.tag).reduce((sum, character) => sum + character.charCodeAt(0), 0);
  const hue = hash % 360;
  return {
    primary: `hsl(${hue} 85% 52%)`,
    secondary: `hsl(${(hue + 28) % 360} 78% 24%)`,
    accent: `hsl(${(hue + 12) % 360} 92% 84%)`,
  };
}

function toNumber(value: unknown, fallback = 0) {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function toOptionalNumber(value: unknown) {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function toText(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function toOptionalText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function toBoolean(value: unknown, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (value === "true") return true;
    if (value === "false") return false;
  }
  return fallback;
}

function isHiddenPublicStatus(status: string | null | undefined) {
  const normalizedStatus = status?.trim().toLowerCase() ?? "";
  return ["inactive", "pending", "draft", "private", "archived"].includes(normalizedStatus);
}

function sortByNewest<T extends { startTime?: string; startDate?: string }>(firstValue: T, secondValue: T) {
  return (secondValue.startTime ?? secondValue.startDate ?? "").localeCompare(firstValue.startTime ?? firstValue.startDate ?? "");
}

function buildEventStatus(rawStatus: string, startDate?: string | null, endDate?: string | null): PubgHubEventStatus {
  const normalizedStatus = rawStatus.trim().toLowerCase();
  if (["finished", "completed", "archived"].includes(normalizedStatus)) {
    return "finished";
  }
  if (["ongoing", "active", "live"].includes(normalizedStatus)) {
    return "ongoing";
  }

  const now = Date.now();
  const startTime = startDate ? new Date(startDate).getTime() : Number.NaN;
  const endTime = endDate ? new Date(endDate).getTime() : Number.NaN;

  if (Number.isFinite(startTime) && startTime > now) {
    return "upcoming";
  }

  if (Number.isFinite(endTime) && endTime < now) {
    return "finished";
  }

  return "upcoming";
}

function buildEventState(published: boolean, status: PubgHubEventStatus): PubgHubEventState {
  if (!published) return "draft";
  if (status === "ongoing" || status === "finished") return "locked";
  return "published";
}

function getFormLabel(score: number) {
  if (score >= 16) return "Surging";
  if (score >= 11) return "Steady";
  if (score >= 7) return "Rising";
  return "Developing";
}

function buildPlacementOrder(primary: string[], allTeamIds: string[], offset = 0) {
  const primarySet = new Set(primary);
  const remaining = allTeamIds.filter((teamId) => !primarySet.has(teamId));
  const rotatedRemaining = remaining.map((_, index) => remaining[(index + offset) % remaining.length]);
  return [...primary, ...rotatedRemaining];
}

function buildKillValue(placement: number, boost = 0) {
  const base = Math.max(0, 11 - placement + Math.max(0, 6 - Math.floor(placement / 2)));
  return Math.max(0, base + boost);
}

function buildTeamLogo(team: TeamDefinition) {
  const palette = getTeamPalette(team);
  return encodeSvg(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" fill="none">
      <defs>
        <linearGradient id="bg" x1="18" y1="18" x2="142" y2="142" gradientUnits="userSpaceOnUse">
          <stop stop-color="${palette.primary}"/>
          <stop offset="1" stop-color="${palette.secondary}"/>
        </linearGradient>
      </defs>
      <rect width="160" height="160" rx="36" fill="#090d16"/>
      <rect x="12" y="12" width="136" height="136" rx="30" fill="url(#bg)"/>
      <rect x="20" y="20" width="120" height="120" rx="24" fill="rgba(7,12,22,0.56)" stroke="rgba(255,255,255,0.18)"/>
      <path d="M80 30 116 48v30c0 26-15 44-36 54-21-10-36-28-36-54V48l36-18Z" fill="rgba(255,255,255,0.08)" stroke="${palette.accent}"/>
      <text x="80" y="88" text-anchor="middle" fill="white" font-family="Arial, Helvetica, sans-serif" font-size="34" font-weight="800" letter-spacing="2">${team.tag}</text>
      <text x="80" y="116" text-anchor="middle" fill="${palette.accent}" font-family="Arial, Helvetica, sans-serif" font-size="10" font-weight="700" letter-spacing="4">BRAVO</text>
    </svg>
  `);
}

function buildPlayerAvatar(playerName: string, team: TeamDefinition) {
  const palette = getTeamPalette(team);
  const initials = playerName.replace(/[^a-zA-Z0-9]/g, "").slice(0, 2).toUpperCase() || team.tag.slice(0, 2);

  return encodeSvg(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" fill="none">
      <defs>
        <linearGradient id="playerBg" x1="12" y1="10" x2="84" y2="86" gradientUnits="userSpaceOnUse">
          <stop stop-color="${palette.primary}"/>
          <stop offset="1" stop-color="${palette.secondary}"/>
        </linearGradient>
      </defs>
      <rect width="96" height="96" rx="28" fill="#0b1020"/>
      <rect x="8" y="8" width="80" height="80" rx="24" fill="url(#playerBg)"/>
      <rect x="14" y="14" width="68" height="68" rx="20" fill="rgba(5,10,18,0.45)" stroke="rgba(255,255,255,0.12)"/>
      <text x="48" y="54" text-anchor="middle" fill="white" font-family="Arial, Helvetica, sans-serif" font-size="26" font-weight="800" letter-spacing="1.2">${initials}</text>
      <text x="48" y="73" text-anchor="middle" fill="${palette.accent}" font-family="Arial, Helvetica, sans-serif" font-size="8" font-weight="700" letter-spacing="3">${team.tag}</text>
    </svg>
  `);
}

function buildEventBanner(title: string, subtitle: string, accentA: string, accentB: string) {
  return encodeSvg(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 480" fill="none">
      <defs>
        <linearGradient id="bannerBg" x1="96" y1="72" x2="1184" y2="420" gradientUnits="userSpaceOnUse">
          <stop stop-color="#0a1220"/>
          <stop offset="1" stop-color="#06090f"/>
        </linearGradient>
        <linearGradient id="bannerAccent" x1="188" y1="74" x2="1050" y2="436" gradientUnits="userSpaceOnUse">
          <stop stop-color="${accentA}" stop-opacity="0.75"/>
          <stop offset="1" stop-color="${accentB}" stop-opacity="0.34"/>
        </linearGradient>
      </defs>
      <rect width="1280" height="480" rx="36" fill="url(#bannerBg)"/>
      <circle cx="220" cy="98" r="190" fill="${accentA}" fill-opacity="0.16"/>
      <circle cx="1060" cy="390" r="220" fill="${accentB}" fill-opacity="0.18"/>
      <rect x="36" y="36" width="1208" height="408" rx="28" fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.1)"/>
      <path d="M840 72h264l-96 96H744l96-96Z" fill="url(#bannerAccent)" fill-opacity="0.7"/>
      <path d="M898 220h240l-96 96H802l96-96Z" fill="${accentA}" fill-opacity="0.16"/>
      <text x="92" y="118" fill="${accentA}" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="700" letter-spacing="7">BRAVO GAMING ESPORTS</text>
      <text x="92" y="222" fill="white" font-family="Arial, Helvetica, sans-serif" font-size="58" font-weight="900">${title}</text>
      <text x="92" y="278" fill="#cbd5e1" font-family="Arial, Helvetica, sans-serif" font-size="24">${subtitle}</text>
      <text x="92" y="360" fill="white" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="700" letter-spacing="5">NEPAL PREMIER ESPORTS STAGE</text>
      <text x="92" y="400" fill="#7dd3fc" font-family="Arial, Helvetica, sans-serif" font-size="16" font-weight="700" letter-spacing="4">TRACK RESULTS • WATCH LIVE • FOLLOW THE SCENE</text>
    </svg>
  `);
}

function distributeKills(teamId: string, matchIndex: number, totalKillsForTeam: number, players: BasePlayerRow[]) {
  if (players.length === 0) {
    return [];
  }

  if (teamId === "m8") {
    const tommyTarget = [9, 8, 10, 8, 9, 9][matchIndex] ?? 7;
    const cappedTommyKills = Math.min(tommyTarget, totalKillsForTeam);
    const remaining = Math.max(0, totalKillsForTeam - cappedTommyKills);
    const supportingKills = [Math.floor(remaining * 0.4), Math.floor(remaining * 0.35), 0];
    supportingKills[2] = Math.max(0, remaining - supportingKills[0] - supportingKills[1]);

    return players.map((player, index) => ({
      player,
      kills: index === 0 ? cappedTommyKills : supportingKills[index - 1] ?? 0,
    }));
  }

  const weights = [0.34, 0.28, 0.22, 0.16];
  const allocated = players.map((player, index) => ({
    player,
    kills: Math.floor(totalKillsForTeam * (weights[index] ?? 0.12)),
  }));

  let remainder = totalKillsForTeam - allocated.reduce((sum, currentValue) => sum + currentValue.kills, 0);
  let pointer = 0;
  while (remainder > 0) {
    allocated[pointer % allocated.length].kills += 1;
    pointer += 1;
    remainder -= 1;
  }

  return allocated;
}

function buildFallbackSeedBaseDataset(): BaseDataset {
  const teams: BaseTeamRow[] = BRAVO_TEAM_DEFINITIONS.map((team) => ({
    id: team.id,
    slug: team.id,
    name: team.name,
    tag: team.tag,
    logoUrl: buildTeamLogo(team),
    region: team.region,
    slotNumber: team.slotNumber,
    active: true,
  }));

  const players: BasePlayerRow[] = [];
  const rosterHistory: BaseRosterRow[] = [];

  for (const team of BRAVO_TEAM_DEFINITIONS) {
    const rosterNames = PLAYER_NAMES_BY_TEAM[team.id] ?? [
      `${team.tag}_Anchor`,
      `${team.tag}_Scout`,
      `${team.tag}_Entry`,
      `${team.tag}_Flex`,
    ];

    rosterNames.forEach((playerName, index) => {
      const playerId = slugify(`${team.id}-${playerName}`);
      players.push({
        id: playerId,
        slug: playerId,
        pubgName: playerName,
        avatarUrl: buildPlayerAvatar(playerName, team),
        teamId: team.id,
        active: true,
      });
      rosterHistory.push({
        teamId: team.id,
        playerId,
        startDate: "2026-05-20",
        endDate: null,
        status: index === 0 ? "igl" : "active",
      });
    });
  }

  const archivedHistoryPlayers = [
    { teamId: "m8", pubgName: "M8_Vintage", startDate: "2026-04-10", endDate: "2026-05-18" },
    { teamId: "team-haku", pubgName: "HAKU_Shift", startDate: "2026-04-12", endDate: "2026-05-16" },
    { teamId: "near-edge-protocol", pubgName: "N3P_Legacy", startDate: "2026-04-08", endDate: "2026-05-15" },
  ];

  archivedHistoryPlayers.forEach((entry) => {
    const playerId = slugify(`${entry.teamId}-${entry.pubgName}`);
    players.push({
      id: playerId,
      slug: playerId,
      pubgName: entry.pubgName,
      teamId: null,
      active: false,
    });
    rosterHistory.push({
      teamId: entry.teamId,
      playerId,
      startDate: entry.startDate,
      endDate: entry.endDate,
      status: "replaced",
    });
  });

  const events: BaseEventRow[] = [
    {
      id: "pubg-mahasangram-2026",
      name: "PUBG MAHASANGRAM",
      slug: "pubg-mahasangram-2026",
      type: "tournament",
      status: "finished",
      state: "locked",
      region: "Nepal",
      game: "PUBG PC",
      mode: "Squad",
      perspective: "TPP",
      prizePool: "NPR 100,000",
      startDate: "2026-06-01T20:00:00+05:45",
      endDate: "2026-06-03T23:15:00+05:45",
      bannerUrl: buildEventBanner("PUBG MAHASANGRAM", "Flagship Bravo tournament with Nepal's sharpest rosters", "#00c6ff", "#00e676"),
      description:
        "Bravo Gaming Esports Nepal flagship PUBG PC tournament with six custom matches, full competitive review, and MOSS enforcement for every roster.",
      rules:
        "Squad TPP. Lobby opens at 7:45 PM NPT. Stream delay required. MOSS mandatory. Admin decision final.",
      streamUrl: "https://www.youtube.com/@bravogamingnepal7981",
      discordUrl: BRAVO_DISCORD_URL,
      published: true,
    },
    {
      id: "daily-scrims-day-6",
      name: "Bravo Gaming Daily PUBG PC Scrims - Day 6",
      slug: "daily-scrims-day-6",
      type: "scrim",
      status: "finished",
      state: "locked",
      region: "Nepal",
      game: "PUBG PC",
      mode: "Squad",
      perspective: "TPP",
      prizePool: "Community Points",
      startDate: "2026-06-10T20:00:00+05:45",
      endDate: "2026-06-10T22:30:00+05:45",
      bannerUrl: buildEventBanner("BRAVO DAILY SCRIMS 6", "Nightly PUBG PC lobby with form tracking and published result flow", "#22c55e", "#3b82f6"),
      description: "Bravo Gaming's nightly PUBG PC scrim block used to track team form, rotation control, and pressure heading into bigger event windows.",
      rules: "Four-map Bravo daily scrim format. Stream delay remains required and results publish after admin approval.",
      streamUrl: "https://www.youtube.com/@bravogamingnepal7981",
      discordUrl: BRAVO_DISCORD_URL,
      published: true,
    },
    {
      id: "daily-scrims-day-7",
      name: "Bravo Gaming Daily PUBG PC Scrims - Day 7",
      slug: "daily-scrims-day-7",
      type: "scrim",
      status: "ongoing",
      state: "locked",
      region: "Nepal",
      game: "PUBG PC",
      mode: "Squad",
      perspective: "TPP",
      prizePool: "Community Points",
      startDate: "2026-06-17T20:00:00+05:45",
      endDate: "2026-06-17T22:15:00+05:45",
      bannerUrl: buildEventBanner("BRAVO DAILY SCRIMS 7", "Nightly Bravo lobby with published standings, review gates, and live team form", "#ef4444", "#f59e0b"),
      description: "An active Bravo Gaming nightly scrim window with live standings pressure, late-circle trade tracking, and leaderboard movement for M8, Team HAKU, N3P, FYB Esports, and NPL.",
      rules: "Standard Bravo daily scrim policy. Results publish after admin review and approval.",
      streamUrl: "https://www.youtube.com/@bravogamingnepal7981",
      discordUrl: BRAVO_DISCORD_URL,
      published: true,
    },
    {
      id: "daily-scrims-day-8",
      name: "Bravo Gaming Daily PUBG PC Scrims - Day 8",
      slug: "daily-scrims-day-8",
      type: "scrim",
      status: "upcoming",
      state: "published",
      region: "Nepal",
      game: "PUBG PC",
      mode: "Squad",
      perspective: "TPP",
      prizePool: "Community Points",
      startDate: "2026-06-18T20:00:00+05:45",
      endDate: "2026-06-18T22:15:00+05:45",
      bannerUrl: buildEventBanner("BRAVO DAILY SCRIMS 8", "Tonight's PUBG PC block for Nepal's active Bravo squads", "#06b6d4", "#8b5cf6"),
      description: "The next Bravo nightly scrim session with full roster tracking, match imports, and ready-to-publish standings across Nepal's active PUBG lineups.",
      rules: "Lobby opens 7:45 PM NPT. Results publish after admin approval.",
      streamUrl: "https://www.youtube.com/@bravogamingnepal7981",
      discordUrl: BRAVO_DISCORD_URL,
      published: true,
    },
    {
      id: "monsoon-circuit-open",
      name: "Monsoon Circuit Open",
      slug: "monsoon-circuit-open",
      type: "tournament",
      status: "upcoming",
      state: "draft",
      region: "Nepal",
      game: "PUBG PC",
      mode: "Squad",
      perspective: "TPP",
      prizePool: "TBD",
      startDate: "2026-06-24T20:00:00+05:45",
      endDate: "2026-06-26T22:30:00+05:45",
      bannerUrl: buildEventBanner("MONSOON CIRCUIT OPEN", "Multi-day Bravo competition lane with sponsor-ready presentation", "#f97316", "#3b82f6"),
      description: "Bravo's next featured tournament lane is staged for approval with full branding, roster visibility, and analytics support.",
      rules: "Rules will publish with the final approved format.",
      streamUrl: null,
      discordUrl: BRAVO_DISCORD_URL,
      published: false,
    },
  ];

  const eventTeams: BaseEventTeamRow[] = events.flatMap((event) =>
    teams.map((team) => ({
      eventId: event.id,
      teamId: team.id,
      slotNumber: team.slotNumber,
      status: event.state === "draft" ? "pending" : "approved",
    }))
  );

  const matches: BaseMatchRow[] = [];
  const teamResults: BaseTeamResultRow[] = [];
  const playerResults: BasePlayerResultRow[] = [];

  const teamIds = teams.map((team) => team.id);
  const playersByTeamId = new Map<string, BasePlayerRow[]>();
  for (const player of players) {
    if (!player.teamId) continue;
    const currentTeamPlayers = playersByTeamId.get(player.teamId) ?? [];
    currentTeamPlayers.push(player);
    playersByTeamId.set(player.teamId, currentTeamPlayers);
  }

  const eventMatchPlans = [
    {
      eventId: "pubg-mahasangram-2026",
      matches: [
        ["m8", "team-haku", "near-edge-protocol", "lang-tang-gang", "fam"],
        ["team-haku", "near-edge-protocol", "m8", "omega-tactix", "ace"],
        ["near-edge-protocol", "m8", "fyb-esports", "team-haku", "arabpati-esports"],
        ["m8", "kds", "team-haku", "near-edge-protocol", "69-esports"],
        ["m8", "team-haku", "near-edge-protocol", "npl", "loot-addicts"],
        ["m8", "team-haku", "near-edge-protocol", "bir-gorkhali", "families"],
      ],
      matchDatePrefix: "2026-06-0",
      startHour: 20,
      teamBoosts: {
        m8: [10, 7, 8, 9, 11, 10],
        "team-haku": [7, 9, 6, 7, 8, 8],
        "near-edge-protocol": [6, 8, 9, 7, 8, 7],
      } as Record<string, number[]>,
    },
    {
      eventId: "daily-scrims-day-6",
      matches: [
        ["omega-tactix", "npl", "m8", "team-haku", "fam"],
        ["m8", "loot-addicts", "near-edge-protocol", "omega-tactix", "ace"],
        ["team-haku", "arabpati-esports", "families", "lang-tang-gang", "npl"],
      ],
      matchDatePrefix: "2026-06-10",
      startHour: 20,
      teamBoosts: {
        "omega-tactix": [7, 6, 4],
        m8: [6, 8, 5],
        "team-haku": [5, 6, 8],
      } as Record<string, number[]>,
    },
    {
      eventId: "daily-scrims-day-7",
      matches: [
        ["npl", "m8", "69-esports", "fam", "mandem-boyz"],
        ["arabpati-esports", "team-haku", "near-edge-protocol", "families", "fyb-esports"],
      ],
      matchDatePrefix: "2026-06-17",
      startHour: 20,
      teamBoosts: {
        npl: [8, 3],
        m8: [7, 6],
        "arabpati-esports": [4, 8],
      } as Record<string, number[]>,
    },
  ];

  let globalMatchIndex = 0;

  for (const eventPlan of eventMatchPlans) {
    eventPlan.matches.forEach((primaryTeams, matchIndex) => {
      const placementOrder = buildPlacementOrder(primaryTeams, teamIds, matchIndex * 2);
      const mapName = MAP_SEQUENCE[(globalMatchIndex + matchIndex) % MAP_SEQUENCE.length];
      const startDate =
        eventPlan.matchDatePrefix.length === 10
          ? `${eventPlan.matchDatePrefix}T${String(eventPlan.startHour + matchIndex).padStart(2, "0")}:00:00+05:45`
          : `${eventPlan.matchDatePrefix}${matchIndex + 1}T${String(eventPlan.startHour).padStart(2, "0")}:00:00+05:45`;
      const matchId = `${eventPlan.eventId}-match-${matchIndex + 1}`;

      matches.push({
        id: matchId,
        eventId: eventPlan.eventId,
        matchNumber: matchIndex + 1,
        mapName,
        startTime: startDate,
        status: eventPlan.eventId === "daily-scrims-day-7" && matchIndex === 1 ? "awaiting_approval" : "published",
        vodUrl: "https://www.youtube.com/@bravogamingnepal7981",
      });

      placementOrder.forEach((teamId, placementIndex) => {
        const placement = placementIndex + 1;
        const boost = eventPlan.teamBoosts[teamId]?.[matchIndex] ?? Math.max(0, 4 - Math.floor(placement / 5));
        const kills = buildKillValue(placement, boost);
        const rowId = `${matchId}-${teamId}`;

        teamResults.push({
          id: rowId,
          matchId,
          teamId,
          placement,
          kills,
          placementPoints: placementPoints(placement),
          killPoints: kills,
          totalPoints: totalPoints(placement, kills),
          wwcd: placement === 1,
        });

        const teamPlayers = playersByTeamId.get(teamId) ?? [];
        const allocatedPlayers = distributeKills(teamId, matchIndex, kills, teamPlayers);

        allocatedPlayers.forEach(({ player, kills: playerKills }, playerIndex) => {
          const assists = Math.max(0, playerKills + (playerIndex % 2 === 0 ? 1 : 0) - (placement > 10 ? 1 : 0));
          const knocks = Math.max(playerKills, playerKills + (playerIndex === 0 ? 1 : 0));
          const damage = playerKills * 182 + assists * 64 + Math.max(0, 38 - placement * 2) + playerIndex * 11;
          const survivalTime = Math.max(420, 2100 - placement * 76 - playerIndex * 24);

          playerResults.push({
            id: `${matchId}-${player.id}`,
            matchId,
            playerId: player.id,
            teamId,
            kills: playerKills,
            assists,
            knocks,
            damage,
            survivalTime,
          });
        });
      });

      globalMatchIndex += 1;
    });
  }

  return {
    source: "launch_seed",
    teams,
    players,
    rosterHistory,
    events,
    eventTeams,
    matches,
    teamResults,
    playerResults,
  };
}

function buildEmptyBaseDataset(): BaseDataset {
  return {
    source: "empty",
    teams: [],
    players: [],
    rosterHistory: [],
    events: [],
    eventTeams: [],
    matches: [],
    teamResults: [],
    playerResults: [],
  };
}

function buildHiddenLaunchSeedDataset(): PubgHubDataset {
  return {
    source: "launch_seed",
    generatedAt: new Date().toISOString(),
    communities: [],
    summary: {
      trackedMatches: 0,
      activeEvents: 0,
      teamsInForm: 0,
      recentEvents: 0,
      communitiesActive: 0,
    },
    teams: [],
    players: [],
    events: [],
    matches: [],
    fantasy: {
      enabled: false,
      events: [],
      leaderboard: [],
    },
  };
}

async function fetchSupabaseRows<TableName extends keyof Database["public"]["Tables"]>(tableName: TableName) {
  const client = getSupabaseServiceRoleClient();
  const { data, error } = await client.from(tableName).select("*");
  if (error) {
    throw error;
  }
  return (data ?? []) as unknown as Array<Database["public"]["Tables"][TableName]["Row"]>;
}

async function buildSupabaseBaseDataset(): Promise<BaseDataset | null> {
  if (!isSupabaseServiceRoleConfigured()) {
    return null;
  }

  try {
    const [
      seasonRows,
      teamRows,
      playerRows,
      eventRows,
      eventTeamRows,
      matchRows,
      matchTeamResultRows,
      matchPlayerResultRows,
      rosterHistoryRows,
    ] = await Promise.all([
      fetchSupabaseRows("seasons").catch(() => []),
      fetchSupabaseRows("teams").catch(() => []),
      fetchSupabaseRows("players").catch(() => []),
      fetchSupabaseRows("events").catch(() => []),
      fetchSupabaseRows("event_teams").catch(() => []),
      fetchSupabaseRows("matches").catch(() => []),
      fetchSupabaseRows("match_team_results").catch(() => []),
      fetchSupabaseRows("match_player_results").catch(() => []),
      fetchSupabaseRows("team_roster_history").catch(() => []),
    ]);

    const hiddenSeasonIds = new Set(
      seasonRows
        .filter((row) =>
          hasPublicDemoMarker(
            toOptionalText(row.name),
            toOptionalText(row.slug),
            toOptionalText(row.series_title)
          )
        )
        .map((row) => toText(row.id))
        .filter(Boolean)
    );

    const teams: BaseTeamRow[] = teamRows.map<BaseTeamRow | null>((row) => {
      const normalizedStatus = toText(row.status, "active");
      const isActiveFlag = toBoolean(row.is_active, normalizedStatus.toLowerCase() !== "inactive");
      const isDeleted = Boolean(toOptionalText(row.deleted_at));

      return {
        id: toText(row.id),
        slug: toText(row.slug, slugify(toText(row.name))),
        name: toText(row.name),
        tag: toOptionalText(row.tag ?? row.short_name),
        logoUrl: toOptionalText(row.logo_url),
        region: toOptionalText(row.region),
        slotNumber: toOptionalNumber(row.slot_number),
        active: isActiveFlag && !isDeleted && !isHiddenPublicStatus(normalizedStatus),
      };
    }).filter((team): team is BaseTeamRow => Boolean(team?.id && team.name));

    const players: BasePlayerRow[] = playerRows.map<BasePlayerRow | null>((row) => {
      return {
        id: toText(row.id),
        slug: toText(row.slug, slugify(toText(row.pubg_name ?? row.display_name))),
        pubgName: toText(row.pubg_name ?? row.display_name),
        avatarUrl: toOptionalText(row.avatar_url ?? row.photo_url),
        teamId: toOptionalText(row.current_team_id),
        active: toBoolean(row.is_active, true) && !Boolean(toOptionalText(row.deleted_at)),
      };
    }).filter((player): player is BasePlayerRow => Boolean(player?.id && player.pubgName));

    const events: BaseEventRow[] = eventRows.map<BaseEventRow | null>((row) => {
      if (toOptionalText(row.season_id) && hiddenSeasonIds.has(toText(row.season_id))) {
        return null;
      }

      const eventName = toText(row.name ?? row.title);
      const startDate = toText(row.start_date);
      const endDate = toOptionalText(row.end_date);
      const status = buildEventStatus(toText(row.status, "upcoming"), startDate, endDate);
      const published = toBoolean(row.published, true);

      return {
        id: toText(row.id),
        name: eventName,
        slug: toText(row.slug, slugify(eventName)),
        type: toText(row.type ?? row.event_type, "scrim"),
        status,
        state: buildEventState(published, status),
        region: toText(row.region, "Nepal"),
        game: toText(row.game, "PUBG PC"),
        mode: toText(row.mode, "Squad"),
        perspective: toText(row.perspective, "TPP"),
        prizePool: toText(row.prize_pool, "TBD"),
        startDate,
        endDate,
        bannerUrl: toOptionalText(row.banner_url),
        description: toOptionalText(row.description),
        rules: toOptionalText(row.rules),
        streamUrl: toOptionalText(row.stream_url),
        discordUrl: toOptionalText(row.discord_url),
        published,
      };
    }).filter((event): event is BaseEventRow => Boolean(event?.id && event.name));

    const eventTeams: BaseEventTeamRow[] = eventTeamRows.map<BaseEventTeamRow | null>((row) => {
      return {
        eventId: toText(row.event_id),
        teamId: toText(row.team_id),
        slotNumber: toOptionalNumber(row.slot_number),
        status: toText(row.status, "approved"),
      };
    }).filter((row): row is BaseEventTeamRow => Boolean(row?.eventId && row.teamId));

    const matches: BaseMatchRow[] = matchRows.map<BaseMatchRow | null>((row) => {
      if (toOptionalText(row.season_id) && hiddenSeasonIds.has(toText(row.season_id))) {
        return null;
      }

      return {
        id: toText(row.id),
        eventId: toText(row.event_id),
        matchNumber: toNumber(row.match_number, 0),
        mapName: normalizeMapName(toText(row.map_name ?? row.map, "Unknown")),
        startTime: toText(row.start_time ?? row.match_date),
        status: toText(row.status, "published"),
        vodUrl: toOptionalText(row.vod_url),
      };
    }).filter((match): match is BaseMatchRow => Boolean(match?.id && match.eventId));

    const teamResults: BaseTeamResultRow[] = matchTeamResultRows.map<BaseTeamResultRow | null>((row) => {
      return {
        id: toText(row.id),
        matchId: toText(row.match_id),
        teamId: toText(row.team_id),
        placement: toNumber(row.placement, 0),
        kills: toNumber(row.kills, 0),
        placementPoints: toNumber(row.placement_points, 0),
        killPoints: toNumber(row.kill_points, toNumber(row.kills, 0)),
        totalPoints: toNumber(row.total_points, 0),
        wwcd: toBoolean(row.wwcd, toNumber(row.placement, 0) === 1),
      };
    }).filter((row): row is BaseTeamResultRow => Boolean(row?.id && row.matchId && row.teamId));

    const playerResults: BasePlayerResultRow[] = matchPlayerResultRows.map<BasePlayerResultRow | null>((row) => {
      return {
        id: toText(row.id),
        matchId: toText(row.match_id),
        playerId: toText(row.player_id),
        teamId: toText(row.team_id),
        kills: toNumber(row.kills, 0),
        assists: toNumber(row.assists, 0),
        knocks: toNumber(row.knocks, 0),
        damage: toNumber(row.damage, 0),
        survivalTime: toNumber(row.survival_time, 0),
      };
    }).filter((row): row is BasePlayerResultRow => Boolean(row?.id && row.matchId && row.playerId));

    const rosterHistory: BaseRosterRow[] = rosterHistoryRows.map<BaseRosterRow | null>((row) => {
      return {
        teamId: toText(row.team_id),
        playerId: toText(row.player_id),
        startDate: toText(row.start_date),
        endDate: toOptionalText(row.end_date),
        status: toText(row.status, "active"),
      };
    }).filter((row): row is BaseRosterRow => Boolean(row?.teamId && row.playerId));

    if (teams.length === 0 && events.length === 0 && matches.length === 0) {
      return null;
    }

    return {
      source: "supabase",
      teams,
      players,
      rosterHistory,
      events,
      eventTeams,
      matches,
      teamResults,
      playerResults,
    };
  } catch {
    return null;
  }
}

function mapTournamentStatusToHubStatus(status?: string): PubgHubEventStatus {
  const normalizedStatus = status?.trim().toLowerCase() ?? "";
  if (normalizedStatus === "live") return "ongoing";
  if (normalizedStatus === "completed") return "finished";
  return "upcoming";
}

function mapScrimStatusToHubStatus(status?: string): PubgHubEventStatus {
  const normalizedStatus = status?.trim().toLowerCase() ?? "";
  if (normalizedStatus === "live") return "ongoing";
  if (normalizedStatus === "completed") return "finished";
  return "upcoming";
}

async function buildDocumentStoreBaseDataset(): Promise<BaseDataset | null> {
  if (!isDocumentStoreConfigured()) {
    return null;
  }

  try {
    const [teamsDocs, playersDocs, tournamentDocs, scrimDocs, resultDocs, matchDocs, tournamentMatchDocs] = await Promise.all([
      fetchDocumentCollection<Team>(COLLECTIONS.teams, 800).catch(() => []),
      fetchDocumentCollection<Player>(COLLECTIONS.players, 2000).catch(() => []),
      fetchDocumentCollection<Tournament>(COLLECTIONS.tournaments, 300).catch(() => []),
      fetchDocumentCollection<Scrim>(COLLECTIONS.scrims, 400).catch(() => []),
      fetchDocumentCollection<TournamentMatch>(COLLECTIONS.matchResults, 500).catch(() => []),
      fetchDocumentCollection<TournamentMatch>(COLLECTIONS.matches, 500).catch(() => []),
      fetchDocumentCollection<TournamentMatch>(COLLECTIONS.tournamentMatches, 500).catch(() => []),
    ]);

    const teams: BaseTeamRow[] = teamsDocs
      .filter((team) => team.id && team.name && team.scope !== "tournament")
      .map((team) => ({
        id: team.id,
        slug: team.slug ?? slugify(team.name),
        name: team.name,
        tag: team.tag ?? null,
        logoUrl: team.logoUrl ?? team.logo ?? null,
        region: team.country ?? "Nepal",
        slotNumber: team.slotNumber ?? null,
        active: (team.status ?? "active") !== "inactive",
      }));

    const players: BasePlayerRow[] = playersDocs
      .filter((player) => player.id && player.name && player.scope !== "tournament")
      .map((player) => ({
        id: player.id,
        slug: player.slug ?? slugify(player.pubgName ?? player.inGameName ?? player.name),
        pubgName: player.pubgName ?? player.inGameName ?? player.name,
        avatarUrl: player.avatarUrl ?? player.avatar ?? null,
        teamId: player.teamId ?? null,
        active: (player.playerStatus ?? "active") !== "inactive",
      }));

    const tournaments = tournamentDocs.filter((tournament) => tournament.id && tournament.title);
    const scrims = scrimDocs.filter((scrim) => scrim.id && scrim.title);
    const eventsById = new Map<string, BaseEventRow>();

    for (const tournament of tournaments) {
      const status = mapTournamentStatusToHubStatus(tournament.status);
      eventsById.set(tournament.id, {
        id: tournament.id,
        name: tournament.title,
        slug: tournament.id,
        type: "tournament",
        status,
        state: buildEventState(true, status),
        region: tournament.server || "Nepal",
        game: tournament.mode || "PUBG PC",
        mode: tournament.format || "Squad",
        perspective: tournament.perspective || "TPP",
        prizePool: tournament.prizePool || "TBD",
        startDate: tournament.startDate,
        endDate: tournament.endDate ?? null,
        bannerUrl: tournament.bannerUrl ?? null,
        description: tournament.description ?? null,
        rules: tournament.rules ?? null,
        streamUrl: null,
        discordUrl: null,
        published: true,
      });
    }

    for (const scrim of scrims) {
      if (eventsById.has(scrim.id)) continue;
      const status = mapScrimStatusToHubStatus(scrim.status);
      eventsById.set(scrim.id, {
        id: scrim.id,
        name: scrim.title,
        slug: scrim.id,
        type: "scrim",
        status,
        state: buildEventState(true, status),
        region: "Nepal",
        game: "PUBG PC",
        mode: "Squad",
        perspective: "TPP",
        prizePool: "TBD",
        startDate: scrim.date,
        endDate: null,
        bannerUrl: null,
        description: scrim.announcement ?? null,
        rules: null,
        streamUrl: null,
        discordUrl: null,
        published: true,
      });
    }

    const uniqueMatches = new Map<string, TournamentMatch>();
    for (const match of [...matchDocs, ...tournamentMatchDocs, ...resultDocs]) {
      uniqueMatches.set(match.id, match);
    }

    for (const match of uniqueMatches.values()) {
      const eventId = match.tournamentId ?? match.scrimId ?? match.eventSlug ?? match.id;
      if (!eventsById.has(eventId)) {
        const status = match.status === "draft" ? "upcoming" : "finished";
        eventsById.set(eventId, {
          id: eventId,
          name: match.eventName ?? "Published Match Event",
          slug: match.eventSlug ?? eventId,
          type: "match-group",
          status,
          state: buildEventState(match.status !== "draft", status),
          region: "Nepal",
          game: "PUBG PC",
          mode: "Squad",
          perspective: "TPP",
          prizePool: "TBD",
          startDate: match.playedAt ?? match.syncedAt ?? new Date().toISOString(),
          endDate: null,
          bannerUrl: null,
          description: null,
          rules: null,
          streamUrl: null,
          discordUrl: null,
          published: match.status !== "draft",
        });
      }
    }

    const eventTeams: BaseEventTeamRow[] = [
      ...tournaments.flatMap((tournament) =>
        (tournament.registeredTeamIds ?? []).map((teamId) => ({
          eventId: tournament.id,
          teamId,
          slotNumber: teams.find((team) => team.id === teamId)?.slotNumber ?? null,
          status: "approved",
        }))
      ),
      ...scrims.flatMap((scrim) =>
        (scrim.teamIds ?? []).map((teamId) => ({
          eventId: scrim.id,
          teamId,
          slotNumber: teams.find((team) => team.id === teamId)?.slotNumber ?? null,
          status: "approved",
        }))
      ),
      ...Array.from(uniqueMatches.values()).flatMap((match) => {
        const eventId = match.tournamentId ?? match.scrimId ?? match.eventSlug ?? match.id;
        return (match.teamResults ?? []).map((teamResult) => ({
          eventId,
          teamId: teamResult.teamId ?? teamResult.teamName,
          slotNumber: teamResult.slotNumber ?? null,
          status: "approved",
        }));
      }),
    ].filter((eventTeam) => eventTeam.eventId && eventTeam.teamId);

    const matches: BaseMatchRow[] = Array.from(uniqueMatches.values())
      .filter((match) => (match.status ?? "published") !== "draft")
      .map((match) => ({
        id: match.id,
        eventId: match.tournamentId ?? match.scrimId ?? match.eventSlug ?? match.id,
        matchNumber: match.matchNumber ?? match.sequenceNumber ?? 1,
        mapName: normalizeMapName(match.map || "Unknown"),
        startTime: match.playedAt ?? match.syncedAt ?? new Date().toISOString(),
        status: match.status ?? "published",
        vodUrl: match.vodUrl ?? null,
      }));

    const teamResults: BaseTeamResultRow[] = Array.from(uniqueMatches.values())
      .filter((match) => (match.status ?? "published") !== "draft")
      .flatMap((match) =>
        (match.teamResults ?? []).map((teamResult, index) => ({
          id: `${match.id}-${teamResult.teamId ?? teamResult.teamName}-${index}`,
          matchId: match.id,
          teamId: teamResult.teamId ?? teamResult.teamName,
          placement: teamResult.placement,
          kills: teamResult.kills,
          placementPoints: teamResult.placementPoints,
          killPoints: teamResult.killPoints,
          totalPoints: teamResult.totalPoints,
          wwcd: teamResult.placement === 1,
        }))
      );

    const playerResults: BasePlayerResultRow[] = Array.from(uniqueMatches.values())
      .filter((match) => (match.status ?? "published") !== "draft")
      .flatMap((match) =>
        (match.playerResults ?? []).map((playerResult, index) => ({
          id: `${match.id}-${playerResult.playerId}-${index}`,
          matchId: match.id,
          playerId: playerResult.playerId,
          teamId: playerResult.teamId ?? "",
          kills: playerResult.kills,
          assists: playerResult.assists,
          knocks: playerResult.knocks,
          damage: playerResult.damage,
          survivalTime: playerResult.survivalTime,
        }))
      );

    const rosterHistory: BaseRosterRow[] = players
      .filter((player) => player.teamId)
      .map((player) => ({
        teamId: player.teamId ?? "",
        playerId: player.id,
        startDate: "2026-01-01",
        endDate: null,
        status: "active",
      }));

    const events = Array.from(eventsById.values()).filter((event) => event.published);

    if (teams.length === 0 && events.length === 0 && matches.length === 0) {
      return null;
    }

    return {
      source: "supabase",
      teams,
      players,
      rosterHistory,
      events,
      eventTeams,
      matches,
      teamResults,
      playerResults,
    };
  } catch {
    return null;
  }
}

function mergeRecords<T>(records: T[], getKey: (record: T) => string) {
  const mergedRecords = new Map<string, T>();

  for (const record of records) {
    mergedRecords.set(getKey(record), record);
  }

  return Array.from(mergedRecords.values());
}

function mergeBaseDatasets(primary: BaseDataset | null, secondary: BaseDataset | null): BaseDataset | null {
  if (!primary && !secondary) return null;
  if (!primary) return secondary;
  if (!secondary) return primary;

  return {
    source: primary.source,
    teams: mergeRecords([...primary.teams, ...secondary.teams], (record) => record.id),
    players: mergeRecords([...primary.players, ...secondary.players], (record) => record.id),
    rosterHistory: mergeRecords(
      [...primary.rosterHistory, ...secondary.rosterHistory],
      (record) => `${record.teamId}-${record.playerId}-${record.startDate}-${record.status}`
    ),
    events: mergeRecords([...primary.events, ...secondary.events], (record) => record.id),
    eventTeams: mergeRecords(
      [...primary.eventTeams, ...secondary.eventTeams],
      (record) => `${record.eventId}-${record.teamId}`
    ),
    matches: mergeRecords([...primary.matches, ...secondary.matches], (record) => record.id),
    teamResults: mergeRecords(
      [...primary.teamResults, ...secondary.teamResults],
      (record) => `${record.matchId}-${record.teamId}`
    ),
    playerResults: mergeRecords(
      [...primary.playerResults, ...secondary.playerResults],
      (record) => `${record.matchId}-${record.playerId}`
    ),
  };
}

function aggregateMapStats(values: Array<{ mapName: string; placement: number; kills: number; totalPoints: number; damage: number; wwcd: boolean }>) {
  const groupedMaps = new Map<
    string,
    { map: string; matches: number; placementTotal: number; kills: number; points: number; wins: number; damage: number }
  >();

  for (const value of values) {
    const existingMap = groupedMaps.get(value.mapName) ?? {
      map: value.mapName,
      matches: 0,
      placementTotal: 0,
      kills: 0,
      points: 0,
      wins: 0,
      damage: 0,
    };

    existingMap.matches += 1;
    existingMap.placementTotal += value.placement;
    existingMap.kills += value.kills;
    existingMap.points += value.totalPoints;
    existingMap.wins += value.wwcd ? 1 : 0;
    existingMap.damage += value.damage;

    groupedMaps.set(value.mapName, existingMap);
  }

  return Array.from(groupedMaps.values())
    .map((value) => ({
      map: value.map,
      matches: value.matches,
      kills: value.kills,
      points: value.points,
      wins: value.wins,
      avgPlacement: Number((value.placementTotal / Math.max(value.matches, 1)).toFixed(2)),
      damage: value.damage,
    }))
    .sort((firstValue, secondValue) => secondValue.points - firstValue.points || firstValue.avgPlacement - secondValue.avgPlacement);
}

function isPublicMatchStatus(status: string) {
  const normalizedStatus = status.trim().toLowerCase();
  return normalizedStatus === "approved" || normalizedStatus === "published" || normalizedStatus === "completed";
}

function buildDataset(base: BaseDataset): PubgHubDataset {
  if (base.source === "launch_seed") {
    return buildHiddenLaunchSeedDataset();
  }

  const teamsById = new Map(base.teams.map((team) => [team.id, team] as const));
  const playersById = new Map(base.players.map((player) => [player.id, player] as const));
  const publicEvents = base.events.filter((event) => event.published);
  const eventsById = new Map(publicEvents.map((event) => [event.id, event] as const));
  const eventTeamIds = new Map<string, Set<string>>();

  for (const eventTeam of base.eventTeams) {
    const currentEventTeams = eventTeamIds.get(eventTeam.eventId) ?? new Set<string>();
    currentEventTeams.add(eventTeam.teamId);
    eventTeamIds.set(eventTeam.eventId, currentEventTeams);
  }

  const publicBaseMatches = base.matches.filter((match) => eventsById.has(match.eventId) && isPublicMatchStatus(match.status));
  const publicMatchesById = new Map(publicBaseMatches.map((match) => [match.id, match] as const));

  const teamResultsByMatchId = new Map<string, BaseTeamResultRow[]>();
  for (const teamResult of base.teamResults) {
    if (!publicMatchesById.has(teamResult.matchId)) {
      continue;
    }

    const currentResults = teamResultsByMatchId.get(teamResult.matchId) ?? [];
    currentResults.push(teamResult);
    teamResultsByMatchId.set(teamResult.matchId, currentResults);

    const match = publicMatchesById.get(teamResult.matchId);
    if (match) {
      const currentEventTeams = eventTeamIds.get(match.eventId) ?? new Set<string>();
      currentEventTeams.add(teamResult.teamId);
      eventTeamIds.set(match.eventId, currentEventTeams);
    }
  }

  const playerResultsByMatchId = new Map<string, BasePlayerResultRow[]>();
  for (const playerResult of base.playerResults) {
    if (!publicMatchesById.has(playerResult.matchId)) {
      continue;
    }

    const currentResults = playerResultsByMatchId.get(playerResult.matchId) ?? [];
    currentResults.push(playerResult);
    playerResultsByMatchId.set(playerResult.matchId, currentResults);
  }

  const matches: PubgHubMatch[] = publicBaseMatches
    .map((match) => {
      const event = eventsById.get(match.eventId);
      if (!event) return null;

      const teamResults = (teamResultsByMatchId.get(match.id) ?? [])
        .map((teamResult) => {
          const team = teamsById.get(teamResult.teamId);

          return {
            teamId: teamResult.teamId,
            teamName: getUserFacingTeamLabel(team?.name),
            tag: team?.tag ?? null,
            slotNumber: team?.slotNumber ?? null,
            logoUrl: team?.logoUrl ?? null,
            placement: teamResult.placement,
            kills: teamResult.kills,
            placementPoints: teamResult.placementPoints,
            killPoints: teamResult.killPoints,
            totalPoints: teamResult.totalPoints,
            wwcd: teamResult.wwcd,
          } satisfies PubgHubMatchTeamResult;
        })
        .sort((firstValue, secondValue) => firstValue.placement - secondValue.placement || secondValue.totalPoints - firstValue.totalPoints);

      const placementByTeamId = new Map(teamResults.map((result) => [result.teamId, result.placement] as const));

      const playerResults = (playerResultsByMatchId.get(match.id) ?? [])
        .map((playerResult) => {
          const player = playersById.get(playerResult.playerId);
          const team = teamsById.get(playerResult.teamId);

          return {
            playerId: playerResult.playerId,
            pubgName: getUserFacingPlayerLabel(player?.pubgName),
            teamId: playerResult.teamId,
            teamName: getUserFacingTeamLabel(team?.name),
            avatarUrl: player?.avatarUrl ?? null,
            placement: placementByTeamId.get(playerResult.teamId) ?? 0,
            kills: playerResult.kills,
            assists: playerResult.assists,
            knocks: playerResult.knocks,
            damage: playerResult.damage,
            survivalTime: playerResult.survivalTime,
          } satisfies PubgHubMatchPlayerResult;
        })
        .sort((firstValue, secondValue) => secondValue.kills - firstValue.kills || secondValue.damage - firstValue.damage);

      const winner = teamResults[0];

      return {
        id: match.id,
        eventId: event.id,
        eventSlug: event.slug,
        eventName: event.name,
        eventStatus: event.status,
        matchNumber: match.matchNumber,
        mapName: match.mapName,
        startTime: match.startTime,
        status: match.status,
        vodUrl: match.vodUrl ?? null,
        teamResults,
        playerResults,
        winnerTeamId: winner?.teamId,
        winnerTeamName: winner?.teamName,
        totalKills: teamResults.reduce((sum, currentValue) => sum + currentValue.kills, 0),
        totalDamage: playerResults.reduce((sum, currentValue) => sum + currentValue.damage, 0),
      } satisfies PubgHubMatch;
    })
    .sort(sortByNewest);

  const matchesByEventId = new Map<string, PubgHubMatch[]>();
  for (const match of matches) {
    const currentMatches = matchesByEventId.get(match.eventId) ?? [];
    currentMatches.push(match);
    matchesByEventId.set(match.eventId, currentMatches);
  }

  const playerMatchCountById = new Map<string, number>();
  const playerMvpById = new Map<string, number>();
  matches.forEach((match) => {
    const topPlayer = match.playerResults[0];
    if (topPlayer) {
      playerMvpById.set(topPlayer.playerId, (playerMvpById.get(topPlayer.playerId) ?? 0) + 1);
    }
    match.playerResults.forEach((playerResult) => {
      playerMatchCountById.set(playerResult.playerId, (playerMatchCountById.get(playerResult.playerId) ?? 0) + 1);
    });
  });

  const events: PubgHubEvent[] = publicEvents
    .map((event) => {
      const eventMatches = (matchesByEventId.get(event.id) ?? []).sort(sortByNewest);
      const standingsMap = new Map<
        string,
        {
          teamId: string;
          teamName: string;
          tag?: string | null;
          logoUrl?: string | null;
          slotNumber?: number | null;
          matches: number;
          wins: number;
          kills: number;
          killPoints: number;
          placementPoints: number;
          totalPoints: number;
          placementTotal: number;
          bestPlacement: number;
          trend: number[];
        }
      >();

      const playerMap = new Map<
        string,
        {
          playerId: string;
          pubgName: string;
          teamId?: string | null;
          teamName?: string | null;
          avatarUrl?: string | null;
          matches: number;
          kills: number;
          assists: number;
          knocks: number;
          damage: number;
          mvpCount: number;
          trend: number[];
        }
      >();

      for (const match of eventMatches) {
        for (const teamResult of match.teamResults) {
          const currentValue = standingsMap.get(teamResult.teamId) ?? {
            teamId: teamResult.teamId,
            teamName: teamResult.teamName,
            tag: teamResult.tag ?? null,
            logoUrl: teamResult.logoUrl ?? null,
            slotNumber: teamResult.slotNumber ?? null,
            matches: 0,
            wins: 0,
            kills: 0,
            killPoints: 0,
            placementPoints: 0,
            totalPoints: 0,
            placementTotal: 0,
            bestPlacement: Number.POSITIVE_INFINITY,
            trend: [],
          };

          currentValue.matches += 1;
          currentValue.wins += teamResult.wwcd ? 1 : 0;
          currentValue.kills += teamResult.kills;
          currentValue.killPoints += teamResult.killPoints;
          currentValue.placementPoints += teamResult.placementPoints;
          currentValue.totalPoints += teamResult.totalPoints;
          currentValue.placementTotal += teamResult.placement;
          currentValue.bestPlacement = Math.min(currentValue.bestPlacement, teamResult.placement);
          currentValue.trend.push(teamResult.totalPoints);

          standingsMap.set(teamResult.teamId, currentValue);
        }

        const topPlayerId = match.playerResults[0]?.playerId;
        for (const playerResult of match.playerResults) {
          const currentValue = playerMap.get(playerResult.playerId) ?? {
            playerId: playerResult.playerId,
            pubgName: playerResult.pubgName,
            teamId: playerResult.teamId,
            teamName: playerResult.teamName,
            avatarUrl: playerResult.avatarUrl ?? null,
            matches: 0,
            kills: 0,
            assists: 0,
            knocks: 0,
            damage: 0,
            mvpCount: 0,
            trend: [],
          };

          currentValue.matches += 1;
          currentValue.kills += playerResult.kills;
          currentValue.assists += playerResult.assists;
          currentValue.knocks += playerResult.knocks;
          currentValue.damage += playerResult.damage;
          currentValue.trend.push(playerResult.kills);
          if (playerResult.playerId === topPlayerId) {
            currentValue.mvpCount += 1;
          }

          playerMap.set(playerResult.playerId, currentValue);
        }
      }

      const standings = Array.from(standingsMap.values())
        .map((value) => ({
          rank: 0,
          teamId: value.teamId,
          teamName: value.teamName,
          tag: value.tag ?? null,
          logoUrl: value.logoUrl ?? null,
          slotNumber: value.slotNumber ?? null,
          matches: value.matches,
          wins: value.wins,
          kills: value.kills,
          killPoints: value.killPoints,
          placementPoints: value.placementPoints,
          totalPoints: value.totalPoints,
          avgPlacement: Number((value.placementTotal / Math.max(value.matches, 1)).toFixed(2)),
          bestPlacement: Number.isFinite(value.bestPlacement) ? value.bestPlacement : 0,
          trend: value.trend.slice(-5),
        }))
        .sort(
          (firstValue, secondValue) =>
            comparePubgTeams(
              {
                id: firstValue.teamId,
                name: firstValue.teamName,
                totalPoints: firstValue.totalPoints,
                kills: firstValue.kills,
                wins: firstValue.wins,
                placementPoints: firstValue.placementPoints,
                avgPlacement: firstValue.avgPlacement,
                slotNumber: firstValue.slotNumber ?? null,
              },
              {
                id: secondValue.teamId,
                name: secondValue.teamName,
                totalPoints: secondValue.totalPoints,
                kills: secondValue.kills,
                wins: secondValue.wins,
                placementPoints: secondValue.placementPoints,
                avgPlacement: secondValue.avgPlacement,
                slotNumber: secondValue.slotNumber ?? null,
              }
            )
        )
        .map((value, index) => ({
          ...value,
          rank: index + 1,
        }));

      const playerTable = Array.from(playerMap.values())
        .map((value) => ({
          rank: 0,
          playerId: value.playerId,
          pubgName: value.pubgName,
          teamId: value.teamId ?? null,
          teamName: value.teamName ?? null,
          avatarUrl: value.avatarUrl ?? null,
          matches: value.matches,
          kills: value.kills,
          assists: value.assists,
          knocks: value.knocks,
          damage: value.damage,
          avgKills: Number((value.kills / Math.max(value.matches, 1)).toFixed(2)),
          avgDamage: Number((value.damage / Math.max(value.matches, 1)).toFixed(2)),
          mvpCount: value.mvpCount,
          trend: value.trend.slice(-5),
        }))
        .sort(
          (firstValue, secondValue) =>
            comparePubgPlayers(
              {
                id: firstValue.playerId,
                pubgName: firstValue.pubgName,
                kills: firstValue.kills,
                damage: firstValue.damage,
                knocks: firstValue.knocks,
                assists: firstValue.assists,
                avgKills: firstValue.avgKills,
              },
              {
                id: secondValue.playerId,
                pubgName: secondValue.pubgName,
                kills: secondValue.kills,
                damage: secondValue.damage,
                knocks: secondValue.knocks,
                assists: secondValue.assists,
                avgKills: secondValue.avgKills,
              }
            )
        )
        .map((value, index) => ({
          ...value,
          rank: index + 1,
        }));

      const derivedTeamIds = Array.from(eventTeamIds.get(event.id) ?? new Set<string>());
      const teamCount = derivedTeamIds.length > 0 ? derivedTeamIds.length : standings.length;

      const mapStats = aggregateMapStats(
        eventMatches.flatMap((match) =>
          match.teamResults.map((teamResult) => ({
            mapName: match.mapName,
            placement: teamResult.placement,
            kills: teamResult.kills,
            totalPoints: teamResult.totalPoints,
            damage: match.playerResults
              .filter((playerResult) => playerResult.teamId === teamResult.teamId)
              .reduce((sum, currentValue) => sum + currentValue.damage, 0),
            wwcd: teamResult.wwcd,
          }))
        )
      );

      const syncStatus =
        event.state === "draft"
          ? "draft"
          : eventMatches.length === 0
            ? "scheduled"
            : eventMatches.every((match) => ["published", "approved", "completed"].includes(match.status.toLowerCase()))
              ? "synced"
              : "awaiting_approval";

      return {
        id: event.id,
        name: event.name,
        slug: event.slug,
        type: event.type,
        status: event.status,
        state: event.state,
        syncStatus,
        region: event.region,
        game: event.game,
        mode: event.mode,
        perspective: event.perspective,
        prizePool: event.prizePool,
        startDate: event.startDate,
        endDate: event.endDate ?? null,
        bannerUrl: event.bannerUrl ?? null,
        description: event.description ?? null,
        rules: event.rules ?? null,
        streamUrl: event.streamUrl ?? null,
        discordUrl: event.discordUrl ?? null,
        teamCount,
        matchCount: eventMatches.length,
        teamIds: derivedTeamIds,
        topTeamId: standings[0]?.teamId,
        topPlayerId: playerTable[0]?.playerId,
        standings,
        playerTable,
        matches: eventMatches,
        mapStats,
      } satisfies PubgHubEvent;
    })
    .sort(sortByNewest);

  const eventsByIdDetailed = new Map(events.map((event) => [event.id, event] as const));
  const publicBaseTeams = base.teams.filter((team) => team.active);

  const teamSummaryMap = new Map<
    string,
    {
      id: string;
      name: string;
      tag?: string | null;
      logoUrl?: string | null;
      region?: string | null;
      slotNumber?: number | null;
      active: boolean;
      matches: number;
      wins: number;
      kills: number;
      damage: number;
      placementPoints: number;
      killPoints: number;
      totalPoints: number;
      placementTotal: number;
      recentPlacements: number[];
      recentPoints: number[];
      recentKills: number[];
      recentMatches: PubgHubRecentMatch[];
      mapInputs: Array<{ mapName: string; placement: number; kills: number; totalPoints: number; damage: number; wwcd: boolean }>;
    }
  >();

  function createTeamSummaryEntry(input: {
    id: string;
    name: string;
    tag?: string | null;
    logoUrl?: string | null;
    region?: string | null;
    slotNumber?: number | null;
    active: boolean;
  }) {
    return {
      id: input.id,
      name: input.name,
      tag: input.tag ?? null,
      logoUrl: input.logoUrl ?? null,
      region: input.region ?? null,
      slotNumber: input.slotNumber ?? null,
      active: input.active,
      matches: 0,
      wins: 0,
      kills: 0,
      damage: 0,
      placementPoints: 0,
      killPoints: 0,
      totalPoints: 0,
      placementTotal: 0,
      recentPlacements: [],
      recentPoints: [],
      recentKills: [],
      recentMatches: [],
      mapInputs: [],
    };
  }

  for (const team of publicBaseTeams) {
    teamSummaryMap.set(team.id, createTeamSummaryEntry(team));
  }

  const teamPreviousRosterMap = new Map<string, PubgHubRosterHistoryEntry[]>();
  base.rosterHistory.forEach((historyRow) => {
    const player = playersById.get(historyRow.playerId);
    const currentHistory = teamPreviousRosterMap.get(historyRow.teamId) ?? [];
    currentHistory.push({
      playerId: historyRow.playerId,
      pubgName: getUserFacingPlayerLabel(player?.pubgName),
      startDate: historyRow.startDate,
      endDate: historyRow.endDate ?? null,
      status: historyRow.status,
    });
    teamPreviousRosterMap.set(historyRow.teamId, currentHistory);
  });

  for (const match of matches) {
    for (const teamResult of match.teamResults) {
      const team = teamsById.get(teamResult.teamId);
      if (team && !team.active) {
        continue;
      }

      const currentValue = teamSummaryMap.get(teamResult.teamId) ?? createTeamSummaryEntry({
        id: teamResult.teamId,
        name: team?.name ?? teamResult.teamName,
        tag: team?.tag ?? null,
        logoUrl: team?.logoUrl ?? null,
        region: team?.region ?? null,
        slotNumber: team?.slotNumber ?? null,
        active: team?.active ?? true,
      });

      const teamDamage = match.playerResults
        .filter((playerResult) => playerResult.teamId === teamResult.teamId)
        .reduce((sum, currentValue) => sum + currentValue.damage, 0);

      currentValue.matches += 1;
      currentValue.wins += teamResult.wwcd ? 1 : 0;
      currentValue.kills += teamResult.kills;
      currentValue.damage += teamDamage;
      currentValue.placementPoints += teamResult.placementPoints;
      currentValue.killPoints += teamResult.killPoints;
      currentValue.totalPoints += teamResult.totalPoints;
      currentValue.placementTotal += teamResult.placement;
      currentValue.recentPlacements.unshift(teamResult.placement);
      currentValue.recentPoints.unshift(teamResult.totalPoints);
      currentValue.recentKills.unshift(teamResult.kills);
      currentValue.recentMatches.unshift({
        matchId: match.id,
        eventId: match.eventId,
        eventSlug: match.eventSlug,
        eventName: match.eventName,
        matchNumber: match.matchNumber,
        mapName: match.mapName,
        startTime: match.startTime,
        placement: teamResult.placement,
        kills: teamResult.kills,
        totalPoints: teamResult.totalPoints,
        wwcd: teamResult.wwcd,
        teamId: teamResult.teamId,
        teamName: teamResult.teamName,
        vodUrl: match.vodUrl ?? null,
      });
      currentValue.mapInputs.push({
        mapName: match.mapName,
        placement: teamResult.placement,
        kills: teamResult.kills,
        totalPoints: teamResult.totalPoints,
        damage: teamDamage,
        wwcd: teamResult.wwcd,
      });

      teamSummaryMap.set(teamResult.teamId, currentValue);
    }
  }

  const teams: PubgHubTeam[] = getRankedTeams(
    Array.from(teamSummaryMap.values())
    .map((value) => {
      const roster = base.players
        .filter((player) => player.teamId === value.id && player.active)
        .map((player, index) => ({
          playerId: player.id,
          pubgName: player.pubgName,
          avatarUrl: player.avatarUrl ?? null,
          role: index === 0 ? "IGL" : index === 3 ? "Support" : "Fragger",
          active: true,
        }))
        .sort((firstValue, secondValue) => firstValue.pubgName.localeCompare(secondValue.pubgName));

      const currentHistory = (teamPreviousRosterMap.get(value.id) ?? [])
        .sort((firstValue, secondValue) => (secondValue.endDate ?? secondValue.startDate).localeCompare(firstValue.endDate ?? firstValue.startDate));

      const eventStats = events
        .filter((event) => event.teamIds.includes(value.id) || event.standings.some((standing) => standing.teamId === value.id))
        .map((event) => {
          const standing = event.standings.find((row) => row.teamId === value.id);
          return {
            eventId: event.id,
            eventSlug: event.slug,
            eventName: event.name,
            eventType: event.type,
            eventStatus: event.status,
            state: event.state,
            matches: standing?.matches ?? 0,
            kills: standing?.kills ?? 0,
            wins: standing?.wins ?? 0,
            totalPoints: standing?.totalPoints ?? 0,
            avgPlacement: standing?.avgPlacement ?? 0,
            rank: standing?.rank,
          } satisfies PubgHubTeamEventStat;
        })
        .sort((firstValue, secondValue) => {
          const firstEvent = eventsByIdDetailed.get(firstValue.eventId);
          const secondEvent = eventsByIdDetailed.get(secondValue.eventId);
          return sortByNewest(
            { startDate: firstEvent?.startDate },
            { startDate: secondEvent?.startDate }
          );
        });

      const trimmedPlacements = value.recentPlacements.slice(0, 6).reverse();
      const trimmedPoints = value.recentPoints.slice(0, 6).reverse();
      const formScore =
        trimmedPoints.reduce((sum, currentValue) => sum + currentValue, 0) / Math.max(trimmedPoints.length, 1) * 0.35 +
        trimmedPlacements.reduce((sum, currentValue) => sum + (17 - currentValue), 0) / Math.max(trimmedPlacements.length, 1) * 0.9;

      return {
        id: value.id,
        slug: teamsById.get(value.id)?.slug ?? slugify(value.name),
        name: value.name,
        tag: value.tag ?? null,
        logoUrl: value.logoUrl ?? null,
        region: value.region ?? "Nepal",
        slotNumber: value.slotNumber ?? null,
        active: value.active,
        matches: value.matches,
        wins: value.wins,
        kills: value.kills,
        damage: value.damage,
        placementPoints: value.placementPoints,
        killPoints: value.killPoints,
        totalPoints: value.totalPoints,
        avgPlacement: Number((value.placementTotal / Math.max(value.matches, 1)).toFixed(2)),
        formScore: Number(formScore.toFixed(2)),
        formLabel: getFormLabel(formScore),
        currentRoster: roster,
        rosterHistory: currentHistory,
        recentPlacements: trimmedPlacements,
        recentPoints: trimmedPoints,
        recentKills: value.recentKills.slice(0, 6).reverse(),
        recentMatches: value.recentMatches.slice(0, 10),
        mapStats: aggregateMapStats(value.mapInputs),
        eventStats,
      } satisfies PubgHubTeam;
    })
  );

  const playerSummaryMap = new Map<
    string,
    {
      id: string;
      pubgName: string;
      avatarUrl?: string | null;
      teamId?: string | null;
      teamName?: string | null;
      matches: number;
      kills: number;
      assists: number;
      knocks: number;
      damage: number;
      wins: number;
      recentTrend: number[];
      recentDamageTrend: number[];
      recentMatches: PubgHubRecentMatch[];
      mapInputs: Array<{ mapName: string; placement: number; kills: number; totalPoints: number; damage: number; wwcd: boolean }>;
      previousTeams: Set<string>;
      bestMatch?: PubgHubRecentMatch | null;
    }
  >();

  for (const player of base.players) {
    if (!player.active) {
      continue;
    }

    const currentTeam = player.teamId ? teamsById.get(player.teamId) : null;
    if (currentTeam && !currentTeam.active) {
      continue;
    }

    playerSummaryMap.set(player.id, {
      id: player.id,
      pubgName: player.pubgName,
      avatarUrl: player.avatarUrl ?? null,
      teamId: currentTeam?.id ?? player.teamId ?? null,
      teamName: currentTeam?.name ?? null,
      matches: 0,
      kills: 0,
      assists: 0,
      knocks: 0,
      damage: 0,
      wins: 0,
      recentTrend: [],
      recentDamageTrend: [],
      recentMatches: [],
      mapInputs: [],
      previousTeams: new Set<string>(),
      bestMatch: null,
    });
  }

  for (const match of matches) {
    const topPlayerId = match.playerResults[0]?.playerId;

    for (const playerResult of match.playerResults) {
      const currentTeam = teamsById.get(playerResult.teamId);
      if (currentTeam && !currentTeam.active) {
        continue;
      }

      const currentValue = playerSummaryMap.get(playerResult.playerId) ?? {
        id: playerResult.playerId,
        pubgName: playerResult.pubgName,
        avatarUrl: playerResult.avatarUrl ?? null,
        teamId: playerResult.teamId,
        teamName: playerResult.teamName,
        matches: 0,
        kills: 0,
        assists: 0,
        knocks: 0,
        damage: 0,
        wins: 0,
        recentTrend: [],
        recentDamageTrend: [],
        recentMatches: [],
        mapInputs: [],
        previousTeams: new Set<string>(),
        bestMatch: null,
      };

      currentValue.matches += 1;
      currentValue.kills += playerResult.kills;
      currentValue.assists += playerResult.assists;
      currentValue.knocks += playerResult.knocks;
      currentValue.damage += playerResult.damage;
      currentValue.wins += playerResult.placement === 1 ? 1 : 0;
      currentValue.recentTrend.unshift(playerResult.kills);
      currentValue.recentDamageTrend.unshift(playerResult.damage);
      currentValue.recentMatches.unshift({
        matchId: match.id,
        eventId: match.eventId,
        eventSlug: match.eventSlug,
        eventName: match.eventName,
        matchNumber: match.matchNumber,
        mapName: match.mapName,
        startTime: match.startTime,
        placement: playerResult.placement,
        kills: playerResult.kills,
        totalPoints: playerResult.kills + playerResult.assists + playerResult.knocks,
        wwcd: playerResult.placement === 1,
        damage: playerResult.damage,
        assists: playerResult.assists,
        knocks: playerResult.knocks,
        teamId: playerResult.teamId,
        teamName: playerResult.teamName,
        playerId: playerResult.playerId,
        playerName: playerResult.pubgName,
        vodUrl: match.vodUrl ?? null,
      });
      currentValue.mapInputs.push({
        mapName: match.mapName,
        placement: playerResult.placement,
        kills: playerResult.kills,
        totalPoints: playerResult.kills + playerResult.assists + playerResult.knocks,
        damage: playerResult.damage,
        wwcd: playerResult.placement === 1,
      });

      if (currentValue.teamName && currentValue.teamName !== playerResult.teamName) {
        currentValue.previousTeams.add(currentValue.teamName);
      }

      const currentBestMatch = currentValue.bestMatch;
      if (
        !currentBestMatch ||
        playerResult.kills > currentBestMatch.kills ||
        (playerResult.kills === currentBestMatch.kills && playerResult.damage > (currentBestMatch.damage ?? 0))
      ) {
        currentValue.bestMatch = {
          matchId: match.id,
          eventId: match.eventId,
          eventSlug: match.eventSlug,
          eventName: match.eventName,
          matchNumber: match.matchNumber,
          mapName: match.mapName,
          startTime: match.startTime,
          placement: playerResult.placement,
          kills: playerResult.kills,
          totalPoints: playerResult.kills + playerResult.assists + playerResult.knocks,
          wwcd: playerResult.placement === 1,
          damage: playerResult.damage,
          assists: playerResult.assists,
          knocks: playerResult.knocks,
          teamId: playerResult.teamId,
          teamName: playerResult.teamName,
          playerId: playerResult.playerId,
          playerName: playerResult.pubgName,
          vodUrl: match.vodUrl ?? null,
        };
      }

      currentValue.teamId = playerResult.teamId;
      currentValue.teamName = playerResult.teamName;

      playerSummaryMap.set(playerResult.playerId, currentValue);
    }

    if (topPlayerId) {
      // noop; counted later via playerMvpById map
    }
  }

  const players = getRankedPlayers(
    Array.from(playerSummaryMap.values())
    .map((value) => {
      const team = value.teamId ? teamsById.get(value.teamId) : null;
      const eventStats = events
        .map((event) => {
          const row = event.playerTable.find((playerRow) => playerRow.playerId === value.id);
          if (!row) return null;
          return {
            eventId: event.id,
            eventSlug: event.slug,
            eventName: event.name,
            eventStatus: event.status,
            matches: row.matches,
            kills: row.kills,
            assists: row.assists,
            knocks: row.knocks,
            damage: row.damage,
            avgKills: row.avgKills,
            avgDamage: row.avgDamage,
            rank: row.rank,
          } satisfies PubgHubPlayerEventStat;
        })
        .filter(Boolean)
        .sort((firstValue, secondValue) => {
          const firstEvent = eventsByIdDetailed.get(firstValue.eventId);
          const secondEvent = eventsByIdDetailed.get(secondValue.eventId);
          return sortByNewest(
            { startDate: firstEvent?.startDate },
            { startDate: secondEvent?.startDate }
          );
        });

      const recentKills = value.recentTrend.slice(0, 6).reverse();
      const formScore =
        recentKills.reduce((sum, currentValue) => sum + currentValue, 0) / Math.max(recentKills.length, 1) * 1.8 +
        value.recentDamageTrend.slice(0, 6).reduce((sum, currentValue) => sum + currentValue, 0) / Math.max(recentKills.length, 1) / 260;

      return {
        id: value.id,
        slug: playersById.get(value.id)?.slug ?? slugify(value.pubgName),
        pubgName: value.pubgName,
        avatarUrl: value.avatarUrl ?? null,
        currentTeamId: value.teamId ?? null,
        currentTeamName: value.teamName ?? null,
        currentTeamTag: team?.tag ?? null,
        currentTeamLogoUrl: team?.logoUrl ?? null,
        active: playersById.get(value.id)?.active ?? true,
        matches: value.matches,
        kills: value.kills,
        assists: value.assists,
        knocks: value.knocks,
        damage: value.damage,
        avgKills: Number((value.kills / Math.max(value.matches, 1)).toFixed(2)),
        avgDamage: Number((value.damage / Math.max(value.matches, 1)).toFixed(2)),
        wins: value.wins,
        mvpCount: playerMvpById.get(value.id) ?? 0,
        formScore: Number(formScore.toFixed(2)),
        formLabel: getFormLabel(formScore / 2),
        bestMatch: value.bestMatch ?? null,
        recentTrend: recentKills,
        recentDamageTrend: value.recentDamageTrend.slice(0, 6).reverse(),
        recentMatches: value.recentMatches.slice(0, 10),
        previousTeams: Array.from(value.previousTeams.values()),
        eventStats,
        mapStats: aggregateMapStats(value.mapInputs),
      } satisfies PubgHubPlayer;
    })
  );

  const fantasyEvents = events
    .filter((event) => event.state !== "draft")
    .slice(0, 4)
    .map((event) => ({
      eventId: event.id,
      eventName: event.name,
      eventSlug: event.slug,
      region: event.region,
      startDate: event.startDate,
      locked: event.status !== "upcoming",
      statusLabel: event.status === "upcoming" ? "Picks Open" : event.status === "ongoing" ? "Live Lock" : "Locked",
    })) satisfies PubgHubFantasyEvent[];

  const fantasyLeaderboard = players
    .map((player) => {
      const score = player.kills * 2 + player.assists * 1.15 + player.knocks * 0.9 + player.damage / 120 + player.wins * 5;
      return {
        rank: 0,
        playerId: player.id,
        pubgName: player.pubgName,
        teamName: player.currentTeamName ?? null,
        score: Number(score.toFixed(1)),
        kills: player.kills,
        knocks: player.knocks,
        assists: player.assists,
        damage: player.damage,
        matches: player.matches,
        tier: score >= 260 ? "Diamond" : score >= 200 ? "Platinum" : score >= 140 ? "Gold" : "Silver",
      } satisfies PubgHubFantasyPlayer;
    })
    .sort((firstValue, secondValue) => secondValue.score - firstValue.score || secondValue.kills - firstValue.kills)
    .slice(0, 30)
    .map((player, index) => ({
      ...player,
      rank: index + 1,
    }));

  const communities = Array.from(
    new Set(
      teams
        .map((team) => team.region)
        .filter((region): region is string => Boolean(region))
    )
  ).sort((firstValue, secondValue) => firstValue.localeCompare(secondValue));

  return {
    source: base.source,
    generatedAt: new Date().toISOString(),
    communities,
    summary: {
      trackedMatches: matches.length,
      activeEvents: events.filter((event) => event.status === "ongoing" || event.status === "upcoming").length,
      teamsInForm: teams.filter((team) => team.formScore >= 10).length,
      recentEvents: events.filter((event) => event.matchCount > 0).length,
      communitiesActive: communities.length,
    },
    teams,
    players,
    events,
    matches,
    fantasy: {
      enabled: false,
      events: fantasyEvents,
      leaderboard: fantasyLeaderboard,
    },
  } satisfies PubgHubDataset;
}

function resequenceRanks<T extends { rank: number }>(rows: T[]) {
  return rows.map((row, index) => ({
    ...row,
    rank: index + 1,
  }));
}

function hasVisibleTeamProfile(team: PubgHubTeam) {
  return Boolean(sanitizePublicAssetUrl(team.logoUrl ?? undefined));
}

function hasVisibleTeamActivity(
  team: PubgHubTeam,
  visibleEventTeamIds: ReadonlySet<string>,
  visibleMatchTeamIds: ReadonlySet<string>
) {
  return visibleEventTeamIds.has(team.id) || visibleMatchTeamIds.has(team.id);
}

function hasVisiblePlayerProfile(player: PubgHubPlayer) {
  return Boolean(sanitizePublicAssetUrl(player.avatarUrl ?? undefined));
}

function hasVisiblePlayerActivity(player: PubgHubPlayer, visibleMatchPlayerIds: ReadonlySet<string>) {
  return visibleMatchPlayerIds.has(player.id);
}

function sanitizePubgDatasetForPublicDisplay(dataset: PubgHubDataset): PubgHubDataset {
  const candidateEvents = dataset.events.filter(
    (event) => !hasPublicDemoMarker(event.name, event.slug, event.region, event.type)
  );
  const visibleEventIds = new Set(candidateEvents.map((event) => event.id));
  const visibleEventTeamIds = new Set<string>();
  for (const event of candidateEvents) {
    event.teamIds.forEach((teamId) => visibleEventTeamIds.add(teamId));
    event.standings.forEach((row) => visibleEventTeamIds.add(row.teamId));
  }
  const rawCandidateMatches = dataset.matches.filter(
    (match) => visibleEventIds.has(match.eventId) && !hasPublicDemoMarker(match.eventName, match.eventSlug)
  );
  const visibleMatchTeamIds = new Set<string>();
  const visibleMatchPlayerIds = new Set<string>();
  for (const match of rawCandidateMatches) {
    match.teamResults.forEach((teamResult) => {
      if (!hasPublicDemoMarker(teamResult.teamName, teamResult.tag ?? undefined)) {
        visibleMatchTeamIds.add(teamResult.teamId);
      }
    });
    match.playerResults.forEach((playerResult) => {
      if (!hasPublicDemoMarker(playerResult.pubgName, playerResult.teamName)) {
        visibleMatchPlayerIds.add(playerResult.playerId);
      }
    });
  }

  const teams = dataset.teams
    .filter((team) => {
      if (hasPublicDemoMarker(team.name, team.tag ?? undefined, team.slug, team.region ?? undefined)) {
        return false;
      }

      return hasVisibleTeamActivity(team, visibleEventTeamIds, visibleMatchTeamIds) || hasVisibleTeamProfile(team);
    })
    .map((team) => ({
      ...team,
      logoUrl: sanitizePublicAssetUrl(team.logoUrl ?? undefined) ?? null,
      currentRoster: team.currentRoster
        .filter((player) => !hasPublicDemoMarker(player.pubgName))
        .map((player) => ({
          ...player,
          avatarUrl: sanitizePublicAssetUrl(player.avatarUrl ?? undefined) ?? null,
        })),
      rosterHistory: team.rosterHistory.filter((player) => !hasPublicDemoMarker(player.pubgName)),
      recentMatches: team.recentMatches.filter(
        (match) =>
          visibleEventIds.has(match.eventId) &&
          !hasPublicDemoMarker(match.eventName, match.eventSlug, match.teamName, match.playerName)
      ),
      eventStats: team.eventStats.filter(
        (event) => visibleEventIds.has(event.eventId) && !hasPublicDemoMarker(event.eventName, event.eventSlug)
      ),
    }));
  const teamIds = new Set(teams.map((team) => team.id));

  const players = dataset.players
    .filter((player) => {
      if (hasPublicDemoMarker(player.pubgName, player.slug, player.currentTeamName ?? undefined)) {
        return false;
      }

      const belongsToVisibleTeam = !player.currentTeamId || teamIds.has(player.currentTeamId);
      if (!belongsToVisibleTeam) {
        return false;
      }

      return hasVisiblePlayerActivity(player, visibleMatchPlayerIds) || Boolean(player.currentTeamId && teamIds.has(player.currentTeamId) && hasVisiblePlayerProfile(player));
    })
    .map((player) => ({
      ...player,
      avatarUrl: sanitizePublicAssetUrl(player.avatarUrl ?? undefined) ?? null,
      currentTeamLogoUrl: sanitizePublicAssetUrl(player.currentTeamLogoUrl ?? undefined) ?? null,
      recentMatches: player.recentMatches.filter(
        (match) =>
          visibleEventIds.has(match.eventId) &&
          !hasPublicDemoMarker(match.eventName, match.eventSlug, match.teamName, match.playerName)
      ),
      eventStats: player.eventStats.filter(
        (event) => visibleEventIds.has(event.eventId) && !hasPublicDemoMarker(event.eventName, event.eventSlug)
      ),
      previousTeams: player.previousTeams.filter((teamName) => !hasPublicDemoMarker(teamName)),
    }));
  const playerIds = new Set(players.map((player) => player.id));

  const candidateMatches = rawCandidateMatches
    .map((match) => {
      const teamResults = match.teamResults.filter(
        (teamResult) =>
          teamIds.has(teamResult.teamId) && !hasPublicDemoMarker(teamResult.teamName, teamResult.tag ?? undefined)
      );
      const playerResults = match.playerResults.filter(
        (playerResult) =>
          playerIds.has(playerResult.playerId) &&
          teamIds.has(playerResult.teamId) &&
          !hasPublicDemoMarker(playerResult.pubgName, playerResult.teamName)
      );

      if (teamResults.length === 0) {
        return null;
      }

      const winner = teamResults.find((teamResult) => teamResult.placement === 1) ?? teamResults[0];

      return {
        ...match,
        teamResults,
        playerResults,
        winnerTeamId: winner?.teamId ?? undefined,
        winnerTeamName: winner?.teamName ?? undefined,
        totalKills:
          playerResults.length > 0
            ? playerResults.reduce((sum, playerResult) => sum + playerResult.kills, 0)
            : teamResults.reduce((sum, teamResult) => sum + teamResult.kills, 0),
        totalDamage: playerResults.reduce((sum, playerResult) => sum + playerResult.damage, 0),
      };
    })
    .filter((match): match is NonNullable<typeof match> => Boolean(match));

  const candidateMatchesByEventId = new Map<string, PubgHubMatch[]>();
  for (const match of candidateMatches) {
    const currentMatches = candidateMatchesByEventId.get(match.eventId) ?? [];
    currentMatches.push(match);
    candidateMatchesByEventId.set(match.eventId, currentMatches);
  }

  const events = candidateEvents
    .map((event) => {
      const standings = resequenceRanks(
        event.standings.filter(
          (row) => teamIds.has(row.teamId) && !hasPublicDemoMarker(row.teamName, row.tag ?? undefined)
        )
      );
      const playerTable = resequenceRanks(
        event.playerTable.filter(
          (row) =>
            playerIds.has(row.playerId) &&
            !hasPublicDemoMarker(row.pubgName, row.teamName ?? undefined)
        )
      );
      const matches = candidateMatchesByEventId.get(event.id) ?? [];
      const teamIdList = event.teamIds.filter((teamId) => teamIds.has(teamId));

      return {
        ...event,
        bannerUrl: sanitizePublicAssetUrl(event.bannerUrl ?? undefined) ?? null,
        description: sanitizePublicCopy(event.description) ?? null,
        rules: sanitizePublicCopy(event.rules) ?? null,
        teamCount: teamIdList.length > 0 ? teamIdList.length : standings.length,
        matchCount: matches.length,
        teamIds: teamIdList,
        topTeamId: standings[0]?.teamId,
        topPlayerId: playerTable[0]?.playerId,
        standings,
        playerTable,
        matches,
      };
    });
  const eventIds = new Set(events.map((event) => event.id));

  const matches = candidateMatches.filter((match) => eventIds.has(match.eventId));

  const communities = Array.from(
    new Set(teams.map((team) => team.region).filter((region): region is string => Boolean(region)))
  ).sort((firstValue, secondValue) => firstValue.localeCompare(secondValue));

  return {
    ...dataset,
    communities,
    summary: {
      trackedMatches: matches.length,
      activeEvents: events.filter((event) => event.status === "ongoing" || event.status === "upcoming").length,
      teamsInForm: teams.filter((team) => team.formScore >= 10).length,
      recentEvents: events.filter((event) => event.matchCount > 0).length,
      communitiesActive: communities.length,
    },
    teams,
    players,
    events,
    matches,
    fantasy: {
      ...dataset.fantasy,
      events: dataset.fantasy.events.filter(
        (event) => eventIds.has(event.eventId) && !hasPublicDemoMarker(event.eventName, event.eventSlug, event.region)
      ),
      leaderboard: dataset.fantasy.leaderboard.filter(
        (player) => playerIds.has(player.playerId) && !hasPublicDemoMarker(player.pubgName, player.teamName ?? undefined)
      ),
    },
  };
}

export async function getPubgHubDataset() {
  const liveDataset = await buildSupabaseBaseDataset();
  const documentStoreDataset = await buildDocumentStoreBaseDataset();
  const mergedDataset = mergeBaseDatasets(liveDataset, documentStoreDataset);

  if (mergedDataset) {
    const aggregatedLive = sanitizePubgDatasetForPublicDisplay(buildDataset(mergedDataset));
    if (
      aggregatedLive.matches.length > 0 ||
      aggregatedLive.events.length > 0 ||
      aggregatedLive.teams.length > 0 ||
      aggregatedLive.players.length > 0
    ) {
      return aggregatedLive;
    }
  }

  return sanitizePubgDatasetForPublicDisplay(buildDataset(buildEmptyBaseDataset()));
}

export async function getPubgDashboardData() {
  const dataset = await getPubgHubDataset();
  const topTeams = getRankedTeams(dataset.teams).slice(0, 6);
  const topPlayers = getRankedPlayers(dataset.players).slice(0, 6);
  const activeEvents = dataset.events.filter((event) => event.status !== "finished").slice(0, 4);
  const recentEvents = [...dataset.events].sort(sortByNewest).slice(0, 5);
  const recentMatches = dataset.matches.slice(0, 8);
  const mapPulse = aggregateMapStats(
    dataset.matches.flatMap((match) =>
      match.teamResults.map((teamResult) => ({
        mapName: match.mapName,
        placement: teamResult.placement,
        kills: teamResult.kills,
        totalPoints: teamResult.totalPoints,
        damage: match.playerResults
          .filter((playerResult) => playerResult.teamId === teamResult.teamId)
          .reduce((sum, currentValue) => sum + currentValue.damage, 0),
        wwcd: teamResult.wwcd,
      }))
    )
  );

  return {
    ...dataset,
    topTeams,
    topPlayers,
    activeEvents,
    recentEvents,
    recentMatches,
    mapPulse,
  };
}

export async function getPubgEventBySlug(slug: string) {
  const dataset = await getPubgHubDataset();
  return dataset.events.find((event) => event.slug === slug) ?? null;
}

function buildPublicTeamLookup(teams: readonly PubgHubTeam[]) {
  return new Map(teams.map((team) => [team.id, team] as const));
}

function buildPublicPlayerLookup(players: readonly PubgHubPlayer[]) {
  return new Map(players.map((player) => [player.id, player] as const));
}

function getFallbackFormLabel(matches: number, hotSignal: number) {
  if (matches <= 0) {
    return "Pending";
  }

  if (hotSignal >= 15) {
    return "Hot";
  }

  if (hotSignal >= 8) {
    return "Active";
  }

  return "Building";
}

function mergePublicTeamWithBoardRow(team: PubgHubTeam, boardRow: PubgTeamBoardRow): PubgHubTeam {
  const recentPoints = boardRow.trend.length > 0 ? boardRow.trend : team.recentPoints;
  const fallbackFormScore =
    recentPoints.reduce((sum, value) => sum + value, 0) / Math.max(recentPoints.length, 1);

  return {
    ...team,
    slug: team.slug || boardRow.slug,
    name: team.name || boardRow.name,
    tag: team.tag ?? boardRow.tag ?? null,
    logoUrl: team.logoUrl ?? boardRow.logoUrl ?? null,
    slotNumber: team.slotNumber ?? null,
    matches: boardRow.matches,
    wins: boardRow.wins,
    kills: boardRow.kills,
    damage: boardRow.damage,
    placementPoints: boardRow.placementPoints,
    killPoints: boardRow.killPoints,
    totalPoints: boardRow.totalPoints,
    avgPlacement: boardRow.avgPlacement,
    formScore: team.formScore > 0 ? team.formScore : Number(fallbackFormScore.toFixed(2)),
    formLabel: team.formLabel || getFallbackFormLabel(boardRow.matches, fallbackFormScore),
    recentPoints,
  };
}

function createPublicTeamFromBoardRow(boardRow: PubgTeamBoardRow): PubgHubTeam {
  const fallbackFormScore =
    boardRow.trend.reduce((sum, value) => sum + value, 0) / Math.max(boardRow.trend.length, 1);

  return {
    id: boardRow.teamId,
    slug: boardRow.slug || slugify(boardRow.name),
    name: boardRow.name,
    tag: boardRow.tag ?? null,
    logoUrl: boardRow.logoUrl ?? null,
    region: null,
    slotNumber: null,
    active: true,
    matches: boardRow.matches,
    wins: boardRow.wins,
    kills: boardRow.kills,
    damage: boardRow.damage,
    placementPoints: boardRow.placementPoints,
    killPoints: boardRow.killPoints,
    totalPoints: boardRow.totalPoints,
    avgPlacement: boardRow.avgPlacement,
    formScore: Number(fallbackFormScore.toFixed(2)),
    formLabel: getFallbackFormLabel(boardRow.matches, fallbackFormScore),
    currentRoster: [],
    rosterHistory: [],
    recentPlacements: [],
    recentPoints: boardRow.trend,
    recentKills: [],
    recentMatches: [],
    mapStats: [],
    eventStats: [],
  };
}

function mergePublicPlayerWithBoardRow(
  player: PubgHubPlayer,
  boardRow: PubgPlayerBoardRow,
  publicTeamLookup: Map<string, PubgHubTeam>
): PubgHubPlayer {
  const currentTeam = boardRow.teamId ? publicTeamLookup.get(boardRow.teamId) ?? null : null;
  const recentTrend = boardRow.trend.length > 0 ? boardRow.trend : player.recentTrend;
  const recentDamageTrend = player.recentDamageTrend.length > 0 ? player.recentDamageTrend : [];
  const fallbackFormScore =
    recentTrend.reduce((sum, value) => sum + value, 0) / Math.max(recentTrend.length, 1);

  return {
    ...player,
    slug: player.slug || boardRow.slug,
    pubgName: player.pubgName || boardRow.pubgName,
    avatarUrl: player.avatarUrl ?? boardRow.avatarUrl ?? null,
    currentTeamId: boardRow.teamId ?? player.currentTeamId ?? null,
    currentTeamName: boardRow.teamName ?? player.currentTeamName ?? null,
    currentTeamTag: currentTeam?.tag ?? player.currentTeamTag ?? null,
    currentTeamLogoUrl: currentTeam?.logoUrl ?? player.currentTeamLogoUrl ?? null,
    matches: boardRow.matches,
    wins: boardRow.wins,
    kills: boardRow.kills,
    assists: boardRow.assists,
    knocks: boardRow.knocks,
    damage: boardRow.damage,
    avgKills: boardRow.avgKills,
    avgDamage: boardRow.avgDamage,
    formScore: player.formScore > 0 ? player.formScore : Number(fallbackFormScore.toFixed(2)),
    formLabel: player.formLabel || getFallbackFormLabel(boardRow.matches, fallbackFormScore),
    bestMatch: player.bestMatch ?? boardRow.bestMatch ?? null,
    recentTrend,
    recentMatches: player.recentMatches.length > 0 ? player.recentMatches : boardRow.bestMatch ? [boardRow.bestMatch] : [],
    recentDamageTrend,
  };
}

function createPublicPlayerFromBoardRow(
  boardRow: PubgPlayerBoardRow,
  publicTeamLookup: Map<string, PubgHubTeam>
): PubgHubPlayer {
  const currentTeam = boardRow.teamId ? publicTeamLookup.get(boardRow.teamId) ?? null : null;
  const fallbackFormScore =
    boardRow.trend.reduce((sum, value) => sum + value, 0) / Math.max(boardRow.trend.length, 1);

  return {
    id: boardRow.playerId,
    slug: boardRow.slug || slugify(boardRow.pubgName),
    pubgName: boardRow.pubgName,
    avatarUrl: boardRow.avatarUrl ?? null,
    currentTeamId: boardRow.teamId ?? null,
    currentTeamName: boardRow.teamName ?? null,
    currentTeamTag: currentTeam?.tag ?? null,
    currentTeamLogoUrl: currentTeam?.logoUrl ?? null,
    active: true,
    matches: boardRow.matches,
    kills: boardRow.kills,
    assists: boardRow.assists,
    knocks: boardRow.knocks,
    damage: boardRow.damage,
    avgKills: boardRow.avgKills,
    avgDamage: boardRow.avgDamage,
    wins: boardRow.wins,
    mvpCount: 0,
    formScore: Number(fallbackFormScore.toFixed(2)),
    formLabel: getFallbackFormLabel(boardRow.matches, fallbackFormScore),
    bestMatch: boardRow.bestMatch ?? null,
    recentTrend: boardRow.trend,
    recentDamageTrend: [],
    recentMatches: boardRow.bestMatch ? [boardRow.bestMatch] : [],
    previousTeams: [],
    eventStats: [],
    mapStats: [],
  };
}

export function getPublicPubgTeams(dataset: PubgHubDataset) {
  const rankedTeams = getRankedTeams(dataset.teams);
  const boardRows = buildPubgTeamBoardRows(dataset.matches, buildPublicTeamLookup(rankedTeams));

  if (boardRows.length === 0) {
    return rankedTeams;
  }

  const boardRowsById = new Map(boardRows.map((row) => [row.teamId, row] as const));
  const mergedTeams = rankedTeams.map((team) => {
    const boardRow = boardRowsById.get(team.id);
    return boardRow ? mergePublicTeamWithBoardRow(team, boardRow) : team;
  });
  const knownTeamIds = new Set(mergedTeams.map((team) => team.id));

  for (const boardRow of boardRows) {
    if (knownTeamIds.has(boardRow.teamId)) {
      continue;
    }

    mergedTeams.push(createPublicTeamFromBoardRow(boardRow));
  }

  return getRankedTeams(mergedTeams);
}

export function getPublicPubgPlayers(dataset: PubgHubDataset, publicTeams = getPublicPubgTeams(dataset)) {
  const rankedPlayers = getRankedPlayers(dataset.players);
  const publicTeamLookup = buildPublicTeamLookup(publicTeams);
  const boardRows = buildPubgPlayerBoardRows(dataset.matches, buildPublicPlayerLookup(rankedPlayers));

  if (boardRows.length === 0) {
    return rankedPlayers;
  }

  const boardRowsById = new Map(boardRows.map((row) => [row.playerId, row] as const));
  const mergedPlayers = rankedPlayers.map((player) => {
    const boardRow = boardRowsById.get(player.id);
    return boardRow ? mergePublicPlayerWithBoardRow(player, boardRow, publicTeamLookup) : player;
  });
  const knownPlayerIds = new Set(mergedPlayers.map((player) => player.id));

  for (const boardRow of boardRows) {
    if (knownPlayerIds.has(boardRow.playerId)) {
      continue;
    }

    mergedPlayers.push(createPublicPlayerFromBoardRow(boardRow, publicTeamLookup));
  }

  return getRankedPlayers(mergedPlayers);
}

export function findPublicPubgTeam(dataset: PubgHubDataset, teamIdOrSlug: string) {
  const normalizedValue = teamIdOrSlug.trim().toLowerCase();
  return getPublicPubgTeams(dataset).find((team) => team.id === teamIdOrSlug || team.slug.toLowerCase() === normalizedValue) ?? null;
}

export function findPublicPubgPlayer(dataset: PubgHubDataset, playerIdOrSlug: string) {
  const normalizedValue = playerIdOrSlug.trim().toLowerCase();
  return (
    getPublicPubgPlayers(dataset).find((player) => player.id === playerIdOrSlug || player.slug.toLowerCase() === normalizedValue) ?? null
  );
}

export async function getPubgTeamById(teamIdOrSlug: string) {
  const dataset = await getPubgHubDataset();
  return findPublicPubgTeam(dataset, teamIdOrSlug);
}

export async function getPubgPlayerById(playerIdOrSlug: string) {
  const dataset = await getPubgHubDataset();
  return findPublicPubgPlayer(dataset, playerIdOrSlug);
}
