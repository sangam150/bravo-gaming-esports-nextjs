"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { MessageCircle } from "lucide-react";
import { useEffect, useState } from "react";

export function useDiscordProviderEnabled(skipDetection = false) {
  const [providerEnabled, setProviderEnabled] = useState(false);

  useEffect(() => {
    if (skipDetection) return;

    let active = true;
    void (async () => {
      for (let attempt = 0; attempt < 2 && active; attempt += 1) {
        const response = await fetch("/api/auth/providers", { cache: "no-store", credentials: "same-origin" });
        if (response.ok) {
          const payload: unknown = await response.json();
          const discordEnabled =
            payload !== null &&
            typeof payload === "object" &&
            !Array.isArray(payload) &&
            (payload as { discord?: unknown }).discord === true;
          if (discordEnabled) {
            setProviderEnabled(true);
            return;
          }
        }
        if (attempt === 0) await new Promise((resolve) => window.setTimeout(resolve, 350));
      }
      if (active) setProviderEnabled(false);
    })().catch(() => undefined);

    return () => {
      active = false;
    };
  }, [skipDetection]);

  return providerEnabled;
}

function readCallbackUrl(payload: unknown) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return "";
  const callbackUrl = (payload as { callbackUrl?: unknown }).callbackUrl;
  return typeof callbackUrl === "string" ? callbackUrl : "";
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

    try {
      const intentResponse = await fetch("/api/auth/discord-intent", {
        method: "POST",
        cache: "no-store",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ next: "/" }),
      });
      const callbackUrl = readCallbackUrl(await intentResponse.json().catch(() => null));
      const parsedCallbackUrl = callbackUrl ? new URL(callbackUrl) : null;
      if (!intentResponse.ok || parsedCallbackUrl?.origin !== window.location.origin || parsedCallbackUrl.pathname !== "/auth/callback") {
        throw new Error("Discord sign-in intent could not be created.");
      }

      const { error: oauthError } = await getSupabaseBrowserClient().auth.signInWithOAuth({
        provider: "discord",
        options: {
          redirectTo: parsedCallbackUrl.toString(),
          scopes: "identify email",
        },
      });
      if (oauthError) throw oauthError;
    } catch {
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
