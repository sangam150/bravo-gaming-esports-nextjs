import type { User } from "@supabase/supabase-js";
import "server-only";
import { syncDiscordRoles, verifyDiscordGuildMembership } from "./discord-role-sync";
import { ensureViewerProfile } from "./profile-provisioning";

export async function completeDiscordLogin(user: User) {
  const verifiedMember = await verifyDiscordGuildMembership(user);
  await ensureViewerProfile(user, verifiedMember.discordUserId);
  return syncDiscordRoles(user, verifiedMember);
}
