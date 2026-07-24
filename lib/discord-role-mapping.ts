export const DISCORD_ROLE_PRIORITY = [
  ["DISCORD_ROLE_ADMIN_ID", "admin"],
  ["DISCORD_ROLE_ORGANIZER_ID", "organizer"],
  ["DISCORD_ROLE_MODERATOR_ID", "moderator"],
  ["DISCORD_ROLE_TEAM_MANAGER_ID", "team_manager"],
  ["DISCORD_ROLE_IGL_ID", "team_igl"],
  ["DISCORD_ROLE_COACH_ID", "coach"],
  ["DISCORD_ROLE_PLAYER_ID", "player"],
  ["DISCORD_ROLE_VIEWER_ID", "viewer"],
] as const;
export type DiscordMappedRole = (typeof DISCORD_ROLE_PRIORITY)[number][1];
export type BravoApplicationRole = DiscordMappedRole | "super_admin" | "caster";

export function resolveDiscordRoleIds(
  memberRoleIds: string[],
  mappings: Array<{ roleId: string; appRole: DiscordMappedRole }>
) {
  const mappedRoles = mappings
    .filter((mapping) => memberRoleIds.includes(mapping.roleId))
    .map((mapping) => mapping.appRole);
  return { primaryRole: mappedRoles[0] ?? "viewer", mappedRoles };
}

export function resolveApprovedDiscordRole(
  mappedPrimaryRole: DiscordMappedRole | "viewer",
  existingRole: BravoApplicationRole,
  existingRoleSource: string | null
): { role: BravoApplicationRole; manuallyProtected: boolean; adminApprovalPending: boolean } {
  const manuallyProtected = existingRole === "super_admin" || existingRoleSource === "manual";
  if (manuallyProtected) {
    return { role: existingRole, manuallyProtected, adminApprovalPending: false };
  }
  if (mappedPrimaryRole === "admin") {
    return { role: "viewer", manuallyProtected: false, adminApprovalPending: true };
  }
  return { role: mappedPrimaryRole, manuallyProtected: false, adminApprovalPending: false };
}
