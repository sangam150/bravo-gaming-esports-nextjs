import type { User } from "@supabase/supabase-js";
import "server-only";
import { writeAuditLog } from "./audit-log-writer";
import { getSupabaseServiceRoleClient } from "./supabase/service-role-client";

function readDisplayName(user: User) {
  const value = user.user_metadata?.display_name ?? user.user_metadata?.full_name ?? user.user_metadata?.name;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

type ServiceRoleClient = ReturnType<typeof getSupabaseServiceRoleClient>;

const PROFILE_FIELDS = "id,auth_user_id,email,role,is_active,discord_user_id" as const;

async function findDiscordIdentityConflict(client: ServiceRoleClient, discordUserId: string, profileId?: string) {
  let query = client.from("profiles").select("id").eq("discord_user_id", discordUserId);
  if (profileId) {
    query = query.neq("id", profileId);
  }
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data;
}

async function attachVerifiedDiscordIdentity(
  client: ServiceRoleClient,
  profile: {
    id: string;
    auth_user_id: string | null;
    email: string;
    role: string;
    is_active: boolean;
    discord_user_id: string | null;
  },
  discordUserId?: string | null,
) {
  if (!discordUserId || profile.discord_user_id === discordUserId) {
    return profile;
  }
  if (profile.discord_user_id) {
    throw new Error("This Bravo profile is already linked to a different Discord identity.");
  }
  if (await findDiscordIdentityConflict(client, discordUserId, profile.id)) {
    throw new Error("This Discord identity is already linked to another Bravo profile.");
  }

  const { data: linkedProfile, error: linkError } = await client
    .from("profiles")
    .update({
      discord_user_id: discordUserId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", profile.id)
    .is("discord_user_id", null)
    .select(PROFILE_FIELDS)
    .maybeSingle();
  if (linkError) {
    if (linkError.code === "23505") {
      throw new Error("This Discord identity is already linked to another Bravo profile.");
    }
    throw linkError;
  }

  if (!linkedProfile) {
    const { data: currentProfile, error: currentProfileError } = await client
      .from("profiles")
      .select(PROFILE_FIELDS)
      .eq("id", profile.id)
      .single();
    if (currentProfileError) throw currentProfileError;
    if (currentProfile.discord_user_id !== discordUserId) {
      throw new Error("This Bravo profile could not be linked to the verified Discord identity.");
    }
    return currentProfile;
  }

  await writeAuditLog({
    actorId: profile.id,
    action: "discord_identity_linked",
    entityType: "profile",
    entityId: profile.id,
    oldValue: { discordUserId: null },
    newValue: {
      discordUserId,
      source: "verified_discord_oauth",
    },
  });
  return linkedProfile;
}

export async function ensureViewerProfile(user: User, discordUserId?: string | null) {
  if (!user.id || !user.email) {
    throw new Error("A verified email identity is required.");
  }

  const client = getSupabaseServiceRoleClient();
  const { data: existing, error: lookupError } = await client
    .from("profiles")
    .select(PROFILE_FIELDS)
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (lookupError) throw lookupError;
  if (existing) return attachVerifiedDiscordIdentity(client, existing, discordUserId);

  if (discordUserId && (await findDiscordIdentityConflict(client, discordUserId))) {
    throw new Error("This Discord identity is already linked to another Bravo profile.");
  }

  const { data: profile, error: insertError } = await client
    .from("profiles")
    .insert({
      auth_user_id: user.id,
      email: user.email.toLowerCase(),
      display_name: readDisplayName(user),
      role: "viewer",
      role_source: "system_provisioned",
      is_active: true,
      discord_user_id: discordUserId ?? null,
    })
    .select(PROFILE_FIELDS)
    .single();
  if (insertError) {
    const { data: concurrentProfile, error: concurrentLookupError } = await client
      .from("profiles")
      .select(PROFILE_FIELDS)
      .eq("auth_user_id", user.id)
      .maybeSingle();
    if (concurrentLookupError || !concurrentProfile) {
      if (insertError.code === "23505") {
        throw new Error("This Discord identity is already linked to another Bravo profile.");
      }
      throw insertError;
    }
    return attachVerifiedDiscordIdentity(client, concurrentProfile, discordUserId);
  }

  await writeAuditLog({
    action: "profile_system_provisioned",
    entityType: "profile",
    entityId: profile.id,
    newValue: {
      authUserId: user.id,
      role: "viewer",
      source: "verified_auth_identity",
      discordLinked: Boolean(discordUserId),
    },
  });
  return profile;
}
