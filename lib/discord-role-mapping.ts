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

export type DiscordMappingType =
  | "access"
  | "team_function"
  | "team_identity"
  | "verification"
  | "cosmetic"
  | "bot"
  | "deny"
  | "ignored";

export type DiscordRoleMapping = {
  roleId: string;
  roleName?: string;
  mappingType: DiscordMappingType;
  appRole?: DiscordMappedRole | null;
  teamId?: string | null;
  priority?: number;
  denyAccess?: boolean;
  enabled?: boolean;
};

const APPLICATION_ROLE_PRIORITY: DiscordMappedRole[] = [
  "admin",
  "organizer",
  "moderator",
  "team_manager",
  "team_igl",
  "coach",
  "player",
  "viewer",
];

export type DiscordMemberResolution = {
  denied: boolean;
  primaryRole: DiscordMappedRole | "viewer";
  mappedRoles: DiscordMappedRole[];
  teamId: string | null;
  teamRoleId: string | null;
  teamState: "not_required" | "resolved" | "missing" | "ambiguous";
  verificationRoleIds: string[];
  candidateTeamIds: string[];
  matchedRoleIds: string[];
};

export function resolveDiscordMemberRoles(
  memberRoleIds: string[],
  mappings: DiscordRoleMapping[]
): DiscordMemberResolution {
  const roleSet = new Set(memberRoleIds);
  const matched = mappings.filter((mapping) =>
    mapping.enabled !== false && roleSet.has(mapping.roleId)
  );
  const denied = matched.some(
    (mapping) => mapping.denyAccess || mapping.mappingType === "deny"
  );
  const mappedRoles = Array.from(
    new Set(
      matched
        .filter((mapping) =>
          mapping.mappingType === "access" || mapping.mappingType === "team_function"
        )
        .map((mapping) => mapping.appRole)
        .filter((role): role is DiscordMappedRole => Boolean(role))
    )
  ).sort(
    (first, second) =>
      APPLICATION_ROLE_PRIORITY.indexOf(first) - APPLICATION_ROLE_PRIORITY.indexOf(second)
  );
  const teamMappings = matched.filter(
    (mapping) => mapping.mappingType === "team_identity" && mapping.teamId
  );
  const candidateTeamIds = Array.from(
    new Set(teamMappings.map((mapping) => mapping.teamId).filter((teamId): teamId is string => Boolean(teamId)))
  );
  const requiresTeam = mappedRoles.some((role) =>
    ["team_manager", "team_igl", "coach", "player"].includes(role)
  );
  const teamState = !requiresTeam
    ? "not_required"
    : candidateTeamIds.length === 0
      ? "missing"
      : candidateTeamIds.length > 1
        ? "ambiguous"
        : "resolved";
  const teamId = teamState === "resolved" ? candidateTeamIds[0] : null;
  const teamRoleId =
    teamState === "resolved"
      ? teamMappings.find((mapping) => mapping.teamId === teamId)?.roleId ?? null
      : null;

  return {
    denied,
    primaryRole: mappedRoles[0] ?? "viewer",
    mappedRoles,
    teamId,
    teamRoleId,
    teamState,
    verificationRoleIds: matched
      .filter((mapping) => mapping.mappingType === "verification")
      .map((mapping) => mapping.roleId),
    candidateTeamIds,
    matchedRoleIds: matched.map((mapping) => mapping.roleId),
  };
}

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
