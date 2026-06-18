"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

type SessionResponse = {
  user?: {
    role?: string;
    isAdmin?: boolean;
  };
  error?: string;
};

export default function LoginHubClient() {
  const configured = isSupabaseConfigured();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!configured) return;

    setLoading(true);
    setError(null);

    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        throw signInError;
      }

      if (!data.session?.access_token) {
        throw new Error("Unable to establish your session.");
      }

      const sessionResponse = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken: data.session.access_token }),
        credentials: "include",
      });
      const sessionData = (await sessionResponse.json().catch(() => ({}))) as SessionResponse;

      if (!sessionResponse.ok) {
        throw new Error(sessionData.error || "Unable to start your session.");
      }

      const redirectTarget =
        searchParams.get("redirect") ||
        (sessionData.user?.isAdmin
          ? "/admin"
          : sessionData.user?.role === "team_igl"
            ? "/team"
            : "/dashboard/player");

      router.push(redirectTarget);
      router.refresh();
    } catch (submissionError: unknown) {
      setError(submissionError instanceof Error ? submissionError.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  if (!configured) {
    return (
      <main className="page-shell pb-12 pt-6">
        <div className="page-stack">
          <section className="hero-banner overflow-hidden p-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_18%,_rgba(29,155,240,0.18),_transparent_30%),radial-gradient(circle_at_84%_18%,_rgba(0,230,118,0.14),_transparent_30%),linear-gradient(135deg,rgba(8,15,30,0.98),rgba(8,15,30,0.82))]" />
            <div className="relative z-10 max-w-3xl">
              <span className="brand-badge">Login</span>
              <h1 className="hero-h1 mt-5">Supabase auth needs to be configured</h1>
              <p className="mt-4 text-sm leading-relaxed text-text-muted">
                Add the Bravo Supabase environment variables to enable player, team, and admin logins from this hub.
              </p>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="page-shell pb-12 pt-6">
      <div className="page-stack">
        <section className="hero-banner overflow-hidden p-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_18%,_rgba(29,155,240,0.18),_transparent_30%),radial-gradient(circle_at_84%_18%,_rgba(0,230,118,0.14),_transparent_30%),linear-gradient(135deg,rgba(8,15,30,0.98),rgba(8,15,30,0.82))]" />
          <div className="relative z-10 grid gap-8 xl:grid-cols-[1.05fr,0.95fr]">
            <div>
              <span className="brand-badge">Platform Login</span>
              <h1 className="hero-h1 mt-5">
                Enter Bravo through
                <br />
                a real working auth hub
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-relaxed text-text-muted">
                Sign in with your Supabase account and Bravo will route you to the right workspace for admin, team IGL,
                or player access.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                <Link href="/admin" className="btn-secondary">
                  Admin Panel
                </Link>
                <Link href="/team" className="btn-secondary">
                  Team IGL Panel
                </Link>
                <Link href="/dashboard/player" className="btn-secondary">
                  Player Dashboard
                </Link>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="rounded-card border border-white/[0.08] bg-bg-primary/75 p-6">
              <p className="section-title">Email Login</p>
              <h2 className="mt-2 font-display text-2xl font-black uppercase text-white">Sign in</h2>
              <p className="mt-3 text-sm text-text-muted">
                Use the same Supabase credentials assigned to your Bravo role.
              </p>

              {error ? (
                <div className="mt-5 rounded-2xl border border-bravoRed/30 bg-bravoRed/10 px-4 py-3 text-sm text-red-200">
                  {error}
                </div>
              ) : null}

              <div className="mt-5 space-y-4">
                <input
                  className="input-esports"
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  required
                />
                <input
                  className="input-esports"
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button type="submit" disabled={loading} className="btn-primary w-full justify-center disabled:opacity-60">
                  {loading ? "Signing in..." : "Sign In"}
                </button>
              </div>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
