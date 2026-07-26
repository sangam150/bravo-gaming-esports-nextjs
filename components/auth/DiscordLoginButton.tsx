"use client";

import { buildDiscordAuthCallbackUrl } from "@/lib/discord-auth";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { MessageCircle } from "lucide-react";
import { useEffect, useState } from "react";

export function useDiscordProviderEnabled() {
  const [providerEnabled, setProviderEnabled] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
      const publicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
      if (!supabaseUrl || !publicKey) return;
      const response = await fetch(`${supabaseUrl}/auth/v1/settings`, {
        headers: { apikey: publicKey },
        cache: "no-store",
      });
      if (!response.ok) return;
      const settings = (await response.json()) as {
        external?: { discord?: boolean };
      };
      if (active) setProviderEnabled(settings.external?.discord === true);
    })().catch(() => undefined);

    return () => {
      active = false;
    };
  }, []);

  return providerEnabled;
}

export default function DiscordLoginButton({ className = "", enabled }: { className?: string; enabled?: boolean }) {
  const detectedProviderEnabled = useDiscordProviderEnabled();
  const providerEnabled = enabled ?? detectedProviderEnabled;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function connect() {
    if (loading) return;
    setLoading(true);
    setError(null);
    const { error: oauthError } = await getSupabaseBrowserClient().auth.signInWithOAuth({
      provider: "discord",
      options: {
        redirectTo: buildDiscordAuthCallbackUrl(window.location.origin, "/"),
        scopes: "identify email",
      },
    });
    if (oauthError) {
      setError("Discord role verification is temporarily unavailable. Please use email login or try again later.");
      setLoading(false);
    }
  }

  if (!providerEnabled) return null;

  return (
    <div>
      <button
        type="button"
        onClick={() => void connect()}
        disabled={loading}
        aria-busy={loading}
        className={`btn-discord w-full justify-center disabled:opacity-60 ${className}`}
      >
        <MessageCircle className="h-[18px] w-[18px]" aria-hidden="true" />
        {loading ? "Connecting to Discord…" : "Continue with Discord"}
      </button>
      {error ? (
        <p role="alert" aria-live="assertive" className="mt-3 text-sm text-red-200">
          {error}
        </p>
      ) : null}
    </div>
  );
}
