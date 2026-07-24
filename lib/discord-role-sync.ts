import "server-only";
import type { User } from "@supabase/supabase-js";
import { extractDiscordUserId } from "./discord-auth";
import { writeAuditLog } from "./audit-logs";
import { getSupabaseServiceRoleClient } from "./supabase/service-role-client";
import {
  DISCORD_ROLE_PRIORITY,
  resolveApprovedDiscordRole,
  resolveDiscordRoleIds,
} from "./discord-role-mapping";

export class DiscordRoleSyncError extends Error {
  constructor(public readonly category: string, message: string, public readonly status = 403) {
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
      503
    );
  }
  const mappings = DISCORD_ROLE_PRIORITY.flatMap(([envName, appRole]) => {
    const roleId = process.env[envName]?.trim();
    return roleId ? [{ roleId, appRole }] : [];
  });
  const duplicates = mappings.filter((mapping, index) =>
    mappings.findIndex((candidate) => candidate.roleId === mapping.roleId) !== index
  );
  if (duplicates.length > 0) {
    throw new DiscordRoleSyncError("unavailable", "Discord role verification is temporarily unavailable. Please try again later or use email login.", 503);
  }
  return {
    guildId,
    botToken,
    mappings,
    bannedRoleIds: [
      process.env.DISCORD_ROLE_BANNED_ID?.trim(),
      process.env.DISCORD_ROLE_SUSPENDED_ID?.trim(),
    ].filter((value): value is string => Boolean(value)),
  };
}

export async function syncDiscordRoles(user: User) {
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
    throw new DiscordRoleSyncError("unavailable", "Discord role verification is temporarily unavailable. Please try again later or use email login.", 503);
  }
  if (response.status === 404) {
    throw new DiscordRoleSyncError("not_member", "You must be a member of the official Bravo Gaming Esports Discord server to use this login option.");
  }
  if (!response.ok) {
    throw new DiscordRoleSyncError("unavailable", "Discord role verification is temporarily unavailable. Please try again later or use email login.", 503);
  }
  const member = (await response.json()) as { roles?: unknown };
  const roleIds = Array.isArray(member.roles) ? member.roles.filter((role): role is string => typeof role === "string") : [];
  const suspended = config.bannedRoleIds.some((roleId) => roleIds.includes(roleId));
  const { mappedRoles, primaryRole } = resolveDiscordRoleIds(roleIds, config.mappings);

  const client = getSupabaseServiceRoleClient();
  const { data: profile, error } = await client
    .from("profiles")
    .select("id,role,role_source,team_id,player_id,is_active")
    .eq("auth_user_id", user.id)
    .single();
  if (error || !profile) throw new DiscordRoleSyncError("profile_missing", "Your account has not been fully configured. Please contact Bravo Admin.");

  const { role: nextRole, manuallyProtected, adminApprovalPending } = resolveApprovedDiscordRole(
    primaryRole,
    profile.role,
    profile.role_source
  );
  const nextActive = suspended ? false : profile.is_active;
  const syncedAt = new Date().toISOString();
  const { error: updateError } = await client.from("profiles").update({
    discord_user_id: discordUserId,
    discord_guild_id: config.guildId,
    discord_role_ids: roleIds,
    discord_mapped_roles: mappedRoles,
    discord_role_synced_at: syncedAt,
    role: nextRole,
    role_source: manuallyProtected ? profile.role_source : "discord_sync",
    is_active: nextActive,
    updated_at: syncedAt,
  }).eq("id", profile.id);
  if (updateError) throw updateError;

  await writeAuditLog({
    actorId: profile.id,
    action: adminApprovalPending ? "discord_admin_approval_pending" : "discord_roles_synchronized",
    entityType: "profile",
    entityId: profile.id,
    oldValue: { role: profile.role, active: profile.is_active },
    newValue: { role: nextRole, active: nextActive, mappedRoles, guildVerified: true },
  });

  if (suspended) throw new DiscordRoleSyncError("suspended", "Your Bravo portal access is currently suspended. Please contact Bravo Admin.");
  if (adminApprovalPending) {
    throw new DiscordRoleSyncError(
      "admin_pending",
      "Your Discord Admin role was verified, but website admin access is awaiting owner approval."
    );
  }
  if (nextRole === "viewer") throw new DiscordRoleSyncError("no_role", "Your Discord account was verified, but you do not currently have an approved Bravo portal role.");
  if (["team_manager", "team_igl", "coach"].includes(nextRole) && !profile.team_id) {
    throw new DiscordRoleSyncError("team_missing", "Your Discord role was verified, but your account is not linked to an active Bravo team.");
  }
  if (nextRole === "player" && !profile.player_id) {
    throw new DiscordRoleSyncError("player_missing", "Your Player role was verified, but your Bravo player profile is not linked yet.");
  }
  const redirectTo = ["admin", "organizer", "moderator", "super_admin"].includes(nextRole)
    ? "/admin"
    : ["team_manager", "team_igl", "coach"].includes(nextRole)
      ? "/team"
      : nextRole === "player" && profile.player_id ? `/pubg/players/${profile.player_id}` : "/";
  return { profileId: profile.id, role: nextRole, mappedRoles, redirectTo };
}
