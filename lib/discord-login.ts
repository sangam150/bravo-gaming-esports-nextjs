import type { User } from "@supabase/supabase-js";
import "server-only";
import { syncDiscordRoles, verifyDiscordGuildMembership } from "./discord-role-sync";
import { ensureViewerProfile } from "./profile-provisioning";

export async function completeDiscordLogin(user: User) {
  const { discordUserId } = await verifyDiscordGuildMembership(user);
  await ensureViewerProfile(user, discordUserId);
  return syncDiscordRoles(user);
}
