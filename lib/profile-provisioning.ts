import type { User } from "@supabase/supabase-js";
import "server-only";
import { writeAuditLog } from "./audit-logs";
import { getSupabaseServiceRoleClient } from "./supabase/service-role-client";

function readDisplayName(user: User) {
  const value = user.user_metadata?.display_name ?? user.user_metadata?.full_name ?? user.user_metadata?.name;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function ensureViewerProfile(user: User, discordUserId?: string | null) {
  if (!user.id || !user.email) {
    throw new Error("A verified email identity is required.");
  }

  const client = getSupabaseServiceRoleClient();
  const { data: existing, error: lookupError } = await client
    .from("profiles")
    .select("id,auth_user_id,email,role,is_active")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (lookupError) throw lookupError;
  if (existing) return existing;

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
    .select("id,auth_user_id,email,role,is_active")
    .single();
  if (insertError) {
    const { data: concurrentProfile, error: concurrentLookupError } = await client
      .from("profiles")
      .select("id,auth_user_id,email,role,is_active")
      .eq("auth_user_id", user.id)
      .maybeSingle();
    if (concurrentLookupError || !concurrentProfile) throw insertError;
    return concurrentProfile;
  }

  await writeAuditLog({
    action: "profile_system_provisioned",
    entityType: "profile",
    entityId: profile.id,
    newValue: {
      authUserId: user.id,
      role: "viewer",
      source: "verified_auth_identity",
    },
  });
  return profile;
}
