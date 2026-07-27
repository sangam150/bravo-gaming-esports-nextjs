import type { Json } from "@/types/database.types";
import type { User } from "@supabase/supabase-js";
import "server-only";
import { writeAuditLog } from "./audit-logs";
import { extractDiscordUserId } from "./discord-auth";
import {
  DISCORD_ROLE_PRIORITY,
  type DiscordRoleMapping,
  resolveApprovedDiscordRole,
  resolveDiscordMemberRoles,
} from "./discord-role-mapping";
import { getSupabaseServiceRoleClient } from "./supabase/service-role-client";

export class DiscordRoleSyncError extends Error {
  constructor(
    public readonly category: string,
    message: string,
    public readonly status = 403,
  ) {
    super(message);
    this.name = "DiscordRoleSyncError";
  }
}

function getConfig() {
  const guildId = process.env.BRAVO_DISCORD_GUILD_ID?.trim();
  const botToken = process.env.DISCORD_BOT_TOKEN?.trim();
  if (!guildId || !botToken) {
    throw new DiscordRoleSyncError(
      "unavailable",
      "Discord role verification is temporarily unavailable. Please try again later or use email login.",
      503,
    );
  }
  const mappings = DISCORD_ROLE_PRIORITY.flatMap(([envName, appRole]) => {
    const roleId = process.env[envName]?.trim();
    return roleId ? [{ roleId, appRole }] : [];
  });
  const duplicates = mappings.filter((mapping, index) => mappings.findIndex((candidate) => candidate.roleId === mapping.roleId) !== index);
  if (duplicates.length > 0) {
    throw new DiscordRoleSyncError(
      "unavailable",
      "Discord role verification is temporarily unavailable. Please try again later or use email login.",
      503,
    );
  }
  return {
    guildId,
    botToken,
    mappings,
    bannedRoleIds: [process.env.DISCORD_ROLE_BANNED_ID?.trim(), process.env.DISCORD_ROLE_SUSPENDED_ID?.trim()].filter(
      (value): value is string => Boolean(value),
    ),
  };
}

export async function syncDiscordRoles(user: User) {
  const discordUserId = extractDiscordUserId(user);
  if (!discordUserId) {
    throw new DiscordRoleSyncError("identity_missing", "Discord identity verification could not be completed.");
  }
  const config = getConfig();
  const relationalTeamAuthEnabled = process.env.DISCORD_RELATIONAL_TEAM_AUTH_ENABLED?.trim().toLowerCase() === "true";
  let response: Response;
  try {
    response = await fetch(`https://discord.com/api/v10/guilds/${config.guildId}/members/${discordUserId}`, {
      headers: { Authorization: `Bot ${config.botToken}` },
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
  } catch {
    throw new DiscordRoleSyncError(
      "unavailable",
      "Discord role verification is temporarily unavailable. Please try again later or use email login.",
      503,
    );
  }
  if (response.status === 404) {
    throw new DiscordRoleSyncError(
      "not_member",
      "You must be a member of the official Bravo Gaming Esports Discord server to use this login option.",
    );
  }
  if (!response.ok) {
    throw new DiscordRoleSyncError(
      "unavailable",
      "Discord role verification is temporarily unavailable. Please try again later or use email login.",
      503,
    );
  }
  const member = (await response.json()) as { roles?: unknown };
  const roleIds = Array.isArray(member.roles) ? member.roles.filter((role): role is string => typeof role === "string") : [];
  const client = getSupabaseServiceRoleClient();
  const { data: storedMappings, error: mappingError } = await client
    .from("discord_role_mappings")
    .select("discord_role_id,discord_role_name,mapping_type,application_role,team_id,priority,deny_access,enabled")
    .eq("discord_guild_id", config.guildId)
    .eq("enabled", true);
  if (mappingError && mappingError.code !== "42P01") {
    throw new DiscordRoleSyncError(
      "unavailable",
      "Discord role verification is temporarily unavailable. Please try again later or use email login.",
      503,
    );
  }
  const databaseMappings: DiscordRoleMapping[] = (storedMappings ?? []).map((mapping) => ({
    roleId: mapping.discord_role_id,
    roleName: mapping.discord_role_name,
    mappingType: mapping.mapping_type as DiscordRoleMapping["mappingType"],
    appRole: mapping.application_role as DiscordRoleMapping["appRole"],
    teamId: mapping.team_id,
    priority: mapping.priority,
    denyAccess: mapping.deny_access,
    enabled: mapping.enabled,
  }));
  const configuredRoleIds = new Set(databaseMappings.map((mapping) => mapping.roleId));
  const fallbackMappings: DiscordRoleMapping[] = config.mappings
    .filter((mapping) => !configuredRoleIds.has(mapping.roleId))
    .map((mapping) => ({
      roleId: mapping.roleId,
      mappingType: ["team_manager", "team_igl", "coach", "player"].includes(mapping.appRole) ? "team_function" : "access",
      appRole: mapping.appRole,
      enabled: true,
    }));
  for (const bannedRoleId of config.bannedRoleIds) {
    if (!configuredRoleIds.has(bannedRoleId)) {
      fallbackMappings.push({
        roleId: bannedRoleId,
        mappingType: "deny",
        denyAccess: true,
        enabled: true,
      });
    }
  }
  const resolution = resolveDiscordMemberRoles(roleIds, [...databaseMappings, ...fallbackMappings]);
  const { mappedRoles, primaryRole } = resolution;

  const { data: profile, error } = await client
    .from("profiles")
    .select("id,role,role_source,team_id,player_id,is_active")
    .eq("auth_user_id", user.id)
    .single();
  if (error || !profile)
    throw new DiscordRoleSyncError("profile_missing", "Your account has not been fully configured. Please contact Bravo Admin.");
  const profileId = profile.id;
  const verifiedDiscordUserId = discordUserId;

  async function queueReview(category: "ambiguous_team" | "team_missing" | "team_mismatch" | "player_link_missing", details: Json) {
    const { error: reviewError } = await client.from("discord_access_reviews").insert({
      profile_id: profileId,
      discord_user_id: verifiedDiscordUserId,
      discord_guild_id: config.guildId,
      category,
      discord_role_ids: roleIds,
      candidate_team_ids: resolution.candidateTeamIds,
      details,
    });
    if (reviewError && !["42P01", "23505"].includes(reviewError.code)) throw reviewError;
  }

  const {
    role: nextRole,
    manuallyProtected,
    adminApprovalPending,
  } = resolveApprovedDiscordRole(primaryRole, profile.role, profile.role_source);
  const nextActive = resolution.denied ? false : profile.is_active;
  const syncedAt = new Date().toISOString();
  const teamRole = ["team_manager", "team_igl", "coach"].includes(nextRole);
  const playerLinkMissing = nextRole === "player" && !profile.player_id;
  const teamMismatch = resolution.teamState === "resolved" && Boolean(profile.team_id) && profile.team_id !== resolution.teamId;
  let mappedTeamUnavailable = false;
  if (resolution.teamState === "resolved" && resolution.teamId) {
    const { data: mappedTeam, error: mappedTeamError } = await client
      .from("teams")
      .select("id,is_active,deleted_at")
      .eq("id", resolution.teamId)
      .maybeSingle();
    if (mappedTeamError) throw mappedTeamError;
    mappedTeamUnavailable = !mappedTeam || !mappedTeam.is_active || Boolean(mappedTeam.deleted_at);
  }
  let approvedMembership = false;
  if (relationalTeamAuthEnabled && resolution.teamState === "resolved" && resolution.teamId) {
    const { data: membership, error: membershipError } = await client
      .from("team_memberships")
      .select("id,membership_role,membership_status")
      .eq("profile_id", profile.id)
      .eq("team_id", resolution.teamId)
      .eq("membership_role", nextRole)
      .eq("membership_status", "active")
      .maybeSingle();
    if (membershipError) throw membershipError;
    approvedMembership = Boolean(membership);
  }
  const teamResolutionBlocked =
    teamRole &&
    (!relationalTeamAuthEnabled ||
      resolution.teamState !== "resolved" ||
      !profile.team_id ||
      teamMismatch ||
      mappedTeamUnavailable ||
      !approvedMembership);
  const roleResolutionBlocked = teamResolutionBlocked || playerLinkMissing;
  const effectiveRole = roleResolutionBlocked && !manuallyProtected ? "viewer" : nextRole;
  const { error: updateError } = await client
    .from("profiles")
    .update({
      discord_user_id: discordUserId,
      discord_guild_id: config.guildId,
      discord_role_ids: roleIds,
      discord_mapped_roles: mappedRoles,
      discord_role_synced_at: syncedAt,
      discord_team_role_id:
        relationalTeamAuthEnabled && resolution.teamState === "resolved" && !teamMismatch ? resolution.teamRoleId : undefined,
      discord_team_verified_at: relationalTeamAuthEnabled && resolution.teamState === "resolved" && !teamMismatch ? syncedAt : undefined,
      role: effectiveRole,
      role_source: manuallyProtected ? profile.role_source : "discord_sync",
      is_active: nextActive,
      updated_at: syncedAt,
    })
    .eq("id", profile.id);
  if (updateError) throw updateError;

  await writeAuditLog({
    actorId: profile.id,
    action: adminApprovalPending ? "discord_admin_approval_pending" : "discord_roles_synchronized",
    entityType: "profile",
    entityId: profile.id,
    oldValue: { role: profile.role, active: profile.is_active },
    newValue: {
      role: effectiveRole,
      active: nextActive,
      mappedRoles,
      guildVerified: true,
      teamState: resolution.teamState,
      resolvedTeamId: resolution.teamId,
      relationalTeamAuthEnabled,
      approvedMembership,
    },
  });

  if (resolution.denied)
    throw new DiscordRoleSyncError("suspended", "Your Bravo portal access is currently suspended. Please contact Bravo Admin.");
  if (adminApprovalPending) {
    throw new DiscordRoleSyncError(
      "admin_pending",
      "Your Discord Admin role was verified, but website admin access is awaiting owner approval.",
    );
  }
  if (relationalTeamAuthEnabled && teamRole && resolution.teamState === "ambiguous") {
    await queueReview("ambiguous_team", {
      mappedRoles,
      candidateTeamIds: resolution.candidateTeamIds,
    });
    throw new DiscordRoleSyncError(
      "team_ambiguous",
      "Multiple team roles were detected on your Discord account. Please contact Bravo Admin to confirm your active team.",
    );
  }
  if (relationalTeamAuthEnabled && teamRole && resolution.teamState === "missing") {
    await queueReview("team_missing", { mappedRoles });
    throw new DiscordRoleSyncError(
      "team_missing",
      "Your Discord role was verified, but no team role is linked to your Discord account. Please contact Bravo Admin.",
    );
  }
  if (relationalTeamAuthEnabled && teamRole && !profile.team_id) {
    await queueReview("team_missing", {
      mappedRoles,
      resolvedTeamId: resolution.teamId,
      approvalRequired: true,
    });
    throw new DiscordRoleSyncError(
      "team_approval_pending",
      "Your team role was verified and is awaiting Bravo Admin approval before team access is enabled.",
    );
  }
  if (
    relationalTeamAuthEnabled &&
    teamRole &&
    resolution.teamState === "resolved" &&
    !teamMismatch &&
    !mappedTeamUnavailable &&
    !approvedMembership
  ) {
    await queueReview("team_mismatch", {
      resolvedTeamId: resolution.teamId,
      teamRoleId: resolution.teamRoleId,
      reason: "approved_membership_missing",
    });
    throw new DiscordRoleSyncError(
      "membership_approval_pending",
      "Your Discord team role is verified, but an approved team membership is required before access is enabled.",
    );
  }
  if (relationalTeamAuthEnabled && teamMismatch) {
    await queueReview("team_mismatch", {
      currentTeamId: profile.team_id,
      resolvedTeamId: resolution.teamId,
      teamRoleId: resolution.teamRoleId,
    });
    throw new DiscordRoleSyncError(
      "team_mismatch",
      "Your Discord team role changed and requires Bravo Admin approval before access can continue.",
    );
  }
  if (relationalTeamAuthEnabled && mappedTeamUnavailable) {
    await queueReview("team_mismatch", {
      resolvedTeamId: resolution.teamId,
      teamRoleId: resolution.teamRoleId,
      reason: "mapped_team_inactive_or_archived",
    });
    throw new DiscordRoleSyncError(
      "team_unavailable",
      "Your Discord team role is linked to an inactive Bravo team. Please contact Bravo Admin.",
    );
  }
  if (nextRole === "player" && !profile.player_id) {
    await queueReview("player_link_missing", {
      resolvedTeamId: resolution.teamId,
    });
  }
  const notice =
    !relationalTeamAuthEnabled && teamRole
      ? "team_approval_pending"
      : playerLinkMissing
        ? "player_link_pending"
        : nextRole === "viewer"
          ? "viewer_access"
          : null;
  const redirectTo =
    notice && notice !== "viewer_access"
      ? "/login"
      : ["admin", "organizer", "moderator", "super_admin"].includes(effectiveRole)
        ? "/admin"
        : ["team_manager", "team_igl", "coach"].includes(effectiveRole) && profile.team_id
          ? "/team"
          : effectiveRole === "player" && profile.player_id
            ? "/dashboard/player"
            : "/";
  return {
    profileId: profile.id,
    role: effectiveRole,
    mappedRoles,
    redirectTo,
    notice,
  };
}

export async function verifyDiscordGuildMembership(user: User) {
  const discordUserId = extractDiscordUserId(user);
  if (!discordUserId) {
    throw new DiscordRoleSyncError("identity_missing", "Discord identity verification could not be completed.");
  }

  const config = getConfig();
  let response: Response;
  try {
    response = await fetch(`https://discord.com/api/v10/guilds/${config.guildId}/members/${discordUserId}`, {
      headers: { Authorization: `Bot ${config.botToken}` },
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
  } catch {
    throw new DiscordRoleSyncError(
      "unavailable",
      "Discord verification is temporarily unavailable. Please try again later or use email login.",
      503,
    );
  }

  if (response.status === 404) {
    throw new DiscordRoleSyncError(
      "not_member",
      "You must be a member of the official Bravo Gaming Esports Discord server to use Discord login.",
    );
  }
  if (!response.ok) {
    throw new DiscordRoleSyncError(
      "unavailable",
      "Discord verification is temporarily unavailable. Please try again later or use email login.",
      503,
    );
  }

  const member = (await response.json()) as { roles?: unknown };
  const roleIds = Array.isArray(member.roles) ? member.roles.filter((role): role is string => typeof role === "string") : [];
  if (config.bannedRoleIds.some((roleId) => roleIds.includes(roleId))) {
    throw new DiscordRoleSyncError("banned", "This Discord account is not permitted to access Bravo Gaming Esports.");
  }

  return { discordUserId, roleIds };
}
