export const ADMIN_SECTION_ROUTES = {
  dashboard: "",
  tournaments: "competitions",
  registrations: "competitions",
  competitionSchedule: "competitions",
  competitionMatches: "competitions",
  competitionBroadcast: "competitions",
  competitionStandings: "competitions",
  seasons: "competitions",
  platformEvents: "competitions",
  scrims: "scrims",
  teams: "teams-players",
  players: "teams-players",
  registeredTeams: "teams-players",
  playerTeamLinking: "teams-players",
  teamRequests: "teams-players",
  matchManager: "match-results",
  pubg: "match-results",
  pendingImports: "match-results",
  approvedImports: "match-results",
  matches: "match-results",
  leaderboard: "match-results",
  broadcast: "broadcast",
  news: "content",
  announcements: "content",
  sponsors: "content",
  media: "content",
  homepage: "content",
  footer: "content",
  inbox: "content",
  settings: "settings",
  discordRoles: "settings",
  games: "settings",
  pointSystems: "settings",
} as const;
export type AdminSection = keyof typeof ADMIN_SECTION_ROUTES;
export type AdminTool = { id: AdminSection; label: string; advanced?: boolean; platformAdminOnly?: boolean };
export const ADMIN_WORKSPACES: { id: string; label: string; defaultSection: AdminSection; tools: AdminTool[] }[] = [
  { id: "dashboard", label: "Dashboard", defaultSection: "dashboard", tools: [] },
  {
    id: "competitions",
    label: "Competitions",
    defaultSection: "tournaments",
    tools: [
      { id: "tournaments", label: "Overview" },
      { id: "registrations", label: "Teams" },
      { id: "competitionSchedule", label: "Schedule" },
      { id: "competitionMatches", label: "Results" },
      { id: "competitionStandings", label: "Standings" },
      { id: "competitionBroadcast", label: "Broadcast" },
      { id: "seasons", label: "Settings" },
      { id: "platformEvents", label: "Event catalog", advanced: true },
    ],
  },
  { id: "scrims", label: "Scrims", defaultSection: "scrims", tools: [] },
  {
    id: "teams-players",
    label: "Teams & Players",
    defaultSection: "teams",
    tools: [
      { id: "teams", label: "Teams" },
      { id: "players", label: "Players" },
      { id: "registeredTeams", label: "Roster and access", advanced: true },
      { id: "playerTeamLinking", label: "Player assignments", advanced: true, platformAdminOnly: true },
      { id: "teamRequests", label: "Team requests", advanced: true },
    ],
  },
  {
    id: "match-results",
    label: "Match Results",
    defaultSection: "matchManager",
    tools: [
      { id: "matchManager", label: "Review & publish" },
      { id: "pubg", label: "Import PUBG data" },
      { id: "pendingImports", label: "Import queue", advanced: true },
      { id: "approvedImports", label: "Import history", advanced: true },
      { id: "matches", label: "Statistics", advanced: true },
      { id: "leaderboard", label: "All standings", advanced: true },
    ],
  },
  { id: "broadcast", label: "Broadcast Studio", defaultSection: "broadcast", tools: [] },
  {
    id: "content",
    label: "Content",
    defaultSection: "news",
    tools: [
      { id: "news", label: "News" },
      { id: "announcements", label: "Announcements" },
      { id: "sponsors", label: "Sponsors" },
      { id: "media", label: "Media & videos" },
      { id: "homepage", label: "Homepage" },
      { id: "footer", label: "Footer", advanced: true },
      { id: "inbox", label: "Inbox", advanced: true },
    ],
  },
  {
    id: "settings",
    label: "Settings",
    defaultSection: "settings",
    tools: [
      { id: "settings", label: "Status & audit" },
      { id: "pointSystems", label: "Scoring" },
      { id: "discordRoles", label: "Roles", platformAdminOnly: true },
      { id: "games", label: "Games", advanced: true },
    ],
  },
];
export function getAdminWorkspace(section: AdminSection) {
  return ADMIN_WORKSPACES.find((workspace) => workspace.defaultSection === section || workspace.tools.some((tool) => tool.id === section))!;
}
export function getAdminSectionLabel(section: AdminSection) {
  return getAdminWorkspace(section).label;
}
export function getAdminSectionHref(section: AdminSection) {
  const workspace = getAdminWorkspace(section);
  const path = ADMIN_SECTION_ROUTES[section];
  return `${path ? `/admin/${path}` : "/admin"}${section === workspace.defaultSection ? "" : `?view=${section}`}`;
}
