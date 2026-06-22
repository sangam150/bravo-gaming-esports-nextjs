"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import {
  getResponseErrorMessage,
  toUserFacingErrorMessage,
  USER_FACING_ERROR_MESSAGES,
} from "@/lib/user-facing-errors";

type SessionResponse = {
  user?: {
    role?: string;
    isAdmin?: boolean;
  };
  error?: string;
};

type LoginVariant = "hub" | "team" | "player";

type LoginHubClientProps = {
  variant?: LoginVariant;
};

function hasTeamWorkspaceAccess(role?: string, isAdmin?: boolean) {
  return Boolean(isAdmin || role === "team_igl" || role === "team_manager");
}

function getVariantContent(variant: LoginVariant) {
  switch (variant) {
    case "team":
      return {
        badge: "Team Login",
        title: "Open the Bravo team workspace",
        description:
          "Use your Supabase team manager or team IGL account to manage roster requests, uploads, and team operations.",
        buttonLabel: "Open Team Workspace",
      };
    case "player":
      return {
        badge: "Player Login",
        title: "Open the Bravo player dashboard",
        description:
          "Use your Supabase player account to access your profile, stats, and player dashboard once your account is approved.",
        buttonLabel: "Open Player Dashboard",
      };
    default:
      return {
        badge: "Platform Login",
        title: "Sign in to the Bravo platform",
        description:
          "Use your Supabase account and Bravo will route you to the right workspace for admin, team, or player access.",
        buttonLabel: "Sign In",
      };
  }
}

export default function LoginHubClient({ variant = "hub" }: LoginHubClientProps) {
  const configured = isSupabaseConfigured();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const content = getVariantContent(variant);

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
        throw new Error(
          getResponseErrorMessage(sessionResponse, sessionData.error, {
            fallback: USER_FACING_ERROR_MESSAGES.session,
          })
        );
      }

      const isTeamUser = hasTeamWorkspaceAccess(sessionData.user?.role, sessionData.user?.isAdmin);
      const isPlayerUser = Boolean(sessionData.user?.isAdmin || sessionData.user?.role === "player");

      if (variant === "team" && !isTeamUser) {
        await fetch("/api/auth/session", { method: "DELETE", credentials: "include" }).catch(() => undefined);
        await supabase.auth.signOut().catch(() => undefined);
        throw new Error("This account does not have team workspace access.");
      }

      if (variant === "player" && !isPlayerUser) {
        await fetch("/api/auth/session", { method: "DELETE", credentials: "include" }).catch(() => undefined);
        await supabase.auth.signOut().catch(() => undefined);
        throw new Error("This account does not have player dashboard access.");
      }

      const redirectTarget =
        searchParams.get("redirect") ||
        (variant === "team"
          ? "/team"
          : variant === "player"
            ? "/dashboard/player"
            : sessionData.user?.isAdmin
              ? "/admin"
              : isTeamUser
                ? "/team"
                : "/dashboard/player");

      router.push(redirectTarget);
      router.refresh();
    } catch (submissionError: unknown) {
      setError(
        toUserFacingErrorMessage(submissionError, {
          fallback: USER_FACING_ERROR_MESSAGES.login,
        })
      );
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
              <span className="brand-badge">{content.badge}</span>
              <h1 className="hero-h1 mt-5">Sign-in is temporarily unavailable</h1>
              <p className="mt-4 text-sm leading-relaxed text-text-muted">
                Bravo login will return here automatically once Supabase authentication is fully connected for this environment.
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
              <span className="brand-badge">{content.badge}</span>
              <h1 className="hero-h1 mt-5">{content.title}</h1>
              <p className="mt-4 max-w-3xl text-sm leading-relaxed text-text-muted">
                {content.description}
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {variant === "hub" ? (
                  <>
                    <Link href="/admin/login" className="btn-secondary">
                      Admin Login
                    </Link>
                    <Link href="/team/login" className="btn-secondary">
                      Team Login
                    </Link>
                    <Link href="/player/login" className="btn-secondary">
                      Player Login
                    </Link>
                  </>
                ) : (
                  <>
                    <Link href="/login" className="btn-secondary">
                      Login Hub
                    </Link>
                    {variant !== "team" ? (
                      <Link href="/team/login" className="btn-secondary">
                        Team Login
                      </Link>
                    ) : null}
                    {variant !== "player" ? (
                      <Link href="/player/login" className="btn-secondary">
                        Player Login
                      </Link>
                    ) : null}
                  </>
                )}
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
                  {loading ? "Checking access..." : content.buttonLabel}
                </button>
              </div>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
