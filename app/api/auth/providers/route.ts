import { requireSupabaseEnv } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

function isDiscordAuthorizationRedirect(location: string | null) {
  if (!location) return false;

  try {
    const hostname = new URL(location).hostname.toLowerCase();
    return hostname === "discord.com" || hostname === "www.discord.com";
  } catch {
    return false;
  }
}

async function canStartDiscordAuthorization() {
  const { url, publicKey } = requireSupabaseEnv();
  const authorizeUrl = new URL("/auth/v1/authorize", url);
  authorizeUrl.searchParams.set("provider", "discord");
  authorizeUrl.searchParams.set("scopes", "identify email");

  const response = await fetch(authorizeUrl, {
    headers: { apikey: publicKey },
    redirect: "manual",
    cache: "no-store",
  });

  return response.status >= 300 && response.status < 400 && isDiscordAuthorizationRedirect(response.headers.get("location"));
}

export async function GET() {
  let discord = false;

  try {
    discord = await canStartDiscordAuthorization();
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
