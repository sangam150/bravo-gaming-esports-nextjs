import type { User } from "@supabase/supabase-js";

export const DISCORD_OAUTH_INTENT_COOKIE = "bravo_discord_oauth_intent";

function normalizeTextValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function extractDiscordUserId(user: Pick<User, "identities"> | null | undefined) {
  const identities = Array.isArray(user?.identities) ? user.identities : [];

  for (const identity of identities) {
    if (identity.provider !== "discord") {
      continue;
    }

    const identityData =
      identity.identity_data && typeof identity.identity_data === "object" ? (identity.identity_data as Record<string, unknown>) : null;

    return (
      normalizeTextValue(identityData?.sub) ??
      normalizeTextValue(identityData?.provider_id) ??
      normalizeTextValue(identity.identity_id) ??
      normalizeTextValue(identity.id)
    );
  }

  return null;
}

export function buildDiscordAuthCallbackUrl(origin: string, nextPath: string, intent: string) {
  const callbackUrl = new URL("/auth/callback", origin);
  callbackUrl.searchParams.set("flow", "discord");
  callbackUrl.searchParams.set("intent", intent);
  callbackUrl.searchParams.set("next", nextPath);
  return callbackUrl.toString();
}
