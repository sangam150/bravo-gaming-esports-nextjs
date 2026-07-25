export const ADMIN_ROLES = new Set(["super_admin", "admin", "moderator", "organizer"]);
export const TEAM_WORKSPACE_ROLES = new Set(["coach", "team_igl", "team_manager"]);
export const PLAYER_DASHBOARD_ROLES = new Set(["player"]);
export const PLATFORM_ROLES = new Set([
  "super_admin",
  "admin",
  "moderator",
  "organizer",
  "coach",
  "team_manager",
  "team_igl",
  "player",
  "caster",
  "viewer",
]);

export function isPlatformRole(role: string | null | undefined) {
  return Boolean(role && PLATFORM_ROLES.has(role));
}

export function isAdminRole(role: string | null | undefined) {
  return Boolean(role && ADMIN_ROLES.has(role));
}

export function hasTeamWorkspaceAccess(role: string | null | undefined, _isAdmin = false) {
  return Boolean(role && TEAM_WORKSPACE_ROLES.has(role));
}

export function hasPlayerDashboardAccess(role: string | null | undefined, isAdmin = false) {
  return Boolean(isAdmin || (role && PLAYER_DASHBOARD_ROLES.has(role)));
}
