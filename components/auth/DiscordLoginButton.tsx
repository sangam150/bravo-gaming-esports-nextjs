"use client";

import { MessageCircle } from "lucide-react";
import { useState } from "react";
import { buildDiscordAuthCallbackUrl } from "@/lib/discord-auth";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";

export default function DiscordLoginButton({ className = "" }: { className?: string }) {
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

  return (
    <div>
      <button type="button" onClick={() => void connect()} disabled={loading} className={`btn-secondary w-full justify-center disabled:opacity-60 ${className}`}>
        <MessageCircle className="h-[18px] w-[18px]" aria-hidden="true" />
        {loading ? "Connecting to Discord…" : "Continue with Discord"}
      </button>
      {error ? <p role="alert" aria-live="assertive" className="mt-3 text-sm text-red-200">{error}</p> : null}
    </div>
  );
}
