import { requireSupabaseEnv } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

const PROVIDER_SETTINGS_TIMEOUT_MS = 4_000;

function isDiscordEnabled(settings: unknown) {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
    return false;
  }

  const external = (settings as { external?: unknown }).external;
  return Boolean(
    external && typeof external === "object" && !Array.isArray(external) && (external as { discord?: unknown }).discord === true,
  );
}

async function readDiscordProviderSetting() {
  const { url, publicKey } = requireSupabaseEnv();
  const settingsUrl = new URL("/auth/v1/settings", url);

  const response = await fetch(settingsUrl, {
    headers: {
      Accept: "application/json",
      apikey: publicKey,
    },
    cache: "no-store",
    signal: AbortSignal.timeout(PROVIDER_SETTINGS_TIMEOUT_MS),
  });
  if (!response.ok) {
    return false;
  }

  return isDiscordEnabled(await response.json());
}

export async function GET() {
  let discord = false;

  try {
    discord = await readDiscordProviderSetting();
  } catch {
    // Provider discovery must fail closed without taking email login offline.
  }

  return Response.json(
    { discord },
    {
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
      },
    },
  );
}
