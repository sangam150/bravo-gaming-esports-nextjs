import type { User } from "@supabase/supabase-js";
import "server-only";
import { hasPlayerDashboardAccess, hasTeamWorkspaceAccess } from "./authz";
import { syncDiscordRoles, verifyDiscordGuildMembership } from "./discord-role-sync";
import { ensureViewerProfile } from "./profile-provisioning";
import { verifyAccessToken } from "./supabase-auth-server";

function getProfileRedirect(role: string, isAdmin: boolean, teamId: string | null, playerId: string | null) {
  if (isAdmin) return "/admin";
  if (hasTeamWorkspaceAccess(role) && teamId) return "/team";
  if (hasPlayerDashboardAccess(role) && playerId) return "/dashboard/player";
  return "/";
}

export async function completeDiscordLogin(user: User, accessToken: string) {
  const relationalAuthorizationEnabled = process.env.DISCORD_RELATIONAL_TEAM_AUTH_ENABLED?.trim().toLowerCase() === "true";

  if (relationalAuthorizationEnabled) {
    return syncDiscordRoles(user);
  }

  const { discordUserId } = await verifyDiscordGuildMembership(user);
  await ensureViewerProfile(user, discordUserId);
  const session = await verifyAccessToken(accessToken);
  return {
    profileId: session.profileId,
    role: session.role,
    redirectTo: getProfileRedirect(session.role, session.isAdmin, session.teamId, session.playerId),
  };
}
