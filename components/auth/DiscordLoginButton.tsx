"use client";

import { buildDiscordAuthCallbackUrl } from "@/lib/discord-auth";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { MessageCircle } from "lucide-react";
import { useEffect, useState } from "react";

export function useDiscordProviderEnabled(skipDetection = false) {
  const [providerEnabled, setProviderEnabled] = useState(false);

  useEffect(() => {
    if (skipDetection) {
      return;
    }

    let active = true;
    void (async () => {
      const response = await fetch("/api/auth/providers", { cache: "no-store" });
      if (!response.ok) return;
      const providers = (await response.json()) as {
        discord?: boolean;
      };
      if (active) setProviderEnabled(providers.discord === true);
    })().catch(() => undefined);

    return () => {
      active = false;
    };
  }, [skipDetection]);

  return providerEnabled;
}

export default function DiscordLoginButton({ className = "", enabled }: { className?: string; enabled?: boolean }) {
  const detectedProviderEnabled = useDiscordProviderEnabled(enabled !== undefined);
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
      setError("Discord sign-in could not start. Please try again or use email login.");
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
