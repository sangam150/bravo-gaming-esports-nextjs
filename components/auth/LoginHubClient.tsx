"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { hasTeamWorkspaceAccess } from "@/lib/authz";
import { BRAVO_DISCORD_URL } from "@/lib/brand-links";
import DiscordLoginButton from "@/components/auth/DiscordLoginButton";
import {
  clearBravoSession,
  createBravoSession,
  reportLoginFailure,
} from "@/lib/login-client";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import {
  getLoginFailureDetails,
  LOGIN_ERROR_MESSAGES,
  validateLoginCredentials,
} from "@/lib/user-facing-errors";

type LoginVariant = "hub" | "team";

type LoginHubClientProps = {
  variant?: LoginVariant;
};

function getVariantContent(variant: LoginVariant) {
  switch (variant) {
    case "team":
      return {
        badge: "Team Login",
        title: "Open the Bravo team workspace",
        description:
          "Use your Supabase coach, team manager, or team IGL account to manage roster requests, uploads, and team operations.",
        buttonLabel: "Open Team Workspace",
      };
    default:
      return {
        badge: "Platform Login",
        title: "Sign in to the Bravo platform",
        description:
          "Use your Supabase account and Bravo will route you to the correct admin or team workspace.",
        buttonLabel: "Sign In",
      };
  }
}

export default function LoginHubClient({ variant = "hub" }: LoginHubClientProps) {
  const configured = isSupabaseConfigured();
  const discordAuthEnabled = true;
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const content = getVariantContent(variant);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!configured) return;
    const requestVariant = variant === "team" ? "team" : "hub";

    const credentialError = validateLoginCredentials(email, password);
    if (credentialError) {
      await reportLoginFailure({
        variant: requestVariant,
        category: "missing_credentials",
        stage: "credentials",
      });
      setError(credentialError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const supabase = getSupabaseBrowserClient();
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        const details = getLoginFailureDetails(authError, {
          variant: requestVariant,
          stage: "credentials",
        });
        throw new Error(details.message);
      }

      if (!authData.session?.access_token || !authData.session.refresh_token) {
        const details = getLoginFailureDetails(new Error("Unable to establish your session."), {
          variant: requestVariant,
          stage: "session",
        });
        throw new Error(details.message);
      }

      const { response, data } = await createBravoSession(
        authData.session.access_token,
        authData.session.refresh_token
      );
      if (!response.ok || !data.success) {
        await supabase.auth.signOut().catch(() => undefined);
        throw new Error(data.error || LOGIN_ERROR_MESSAGES.backendUnavailable);
      }

      const isTeamUser = hasTeamWorkspaceAccess(data.user?.role, data.user?.isAdmin);
      const isAdminUser = Boolean(data.user?.isAdmin);
      if (variant === "team" && !isTeamUser) {
        await clearBravoSession().catch(() => undefined);
        await supabase.auth.signOut().catch(() => undefined);
        throw new Error(LOGIN_ERROR_MESSAGES.teamRoleMismatch);
      }
      if (variant === "team" && !data.user?.teamId) {
        await clearBravoSession().catch(() => undefined);
        await supabase.auth.signOut().catch(() => undefined);
        throw new Error(LOGIN_ERROR_MESSAGES.teamMembershipMissing);
      }

      const redirectTarget =
        variant === "team"
          ? "/team"
          : searchParams.get("redirect") ||
            (isAdminUser
              ? "/admin"
              : isTeamUser
                ? "/team"
                : "/login");

      window.location.assign(redirectTarget);
    } catch (submissionError: unknown) {
      setError(submissionError instanceof Error ? submissionError.message : LOGIN_ERROR_MESSAGES.invalidCredentials);
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
                {LOGIN_ERROR_MESSAGES.backendUnavailable}
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
                  </>
                )}
              </div>
            </div>

            <form onSubmit={handleSubmit} noValidate className="rounded-card border border-white/[0.08] bg-bg-primary/75 p-6">
              <p className="section-title">Email Login</p>
              <h2 className="mt-2 font-display text-2xl font-black uppercase text-white">Sign in</h2>
              <p className="mt-3 text-sm text-text-muted">
                Use the same Supabase credentials assigned to your Bravo role.
              </p>

              {error ? (
                <div role="alert" aria-live="assertive" className="form-message mt-5 rounded-2xl border border-bravoRed/30 bg-bravoRed/10 px-4 py-3 text-sm text-red-200">
                  {error}
                </div>
              ) : null}

              <div className="mt-5 space-y-4">
                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
                    Email address
                  </span>
                  <input
                    className="input-esports"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="email"
                    required
                    aria-invalid={Boolean(error)}
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
                    Password
                  </span>
                  <input
                    className="input-esports"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="current-password"
                    required
                    aria-invalid={Boolean(error)}
                  />
                </label>
                <button type="submit" disabled={loading} aria-busy={loading} className="btn-primary w-full justify-center disabled:opacity-60">
                  {loading ? "Checking access..." : content.buttonLabel}
                </button>
              </div>

              {discordAuthEnabled ? (
                <div className="mt-5 border-t border-white/10 pt-5">
                  <div className="mb-4 flex items-center gap-3" aria-hidden="true">
                    <span className="h-px flex-1 bg-white/10" />
                    <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">Or continue with</span>
                    <span className="h-px flex-1 bg-white/10" />
                  </div>
                  <p className="mt-2 text-sm text-text-muted">
                    Discord verifies your identity; Bravo then checks your official server roles and approved team or player linkage.
                  </p>
                  <DiscordLoginButton className="mt-4" />
                </div>
              ) : null}

              <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/10 pt-4 text-sm">
                <span className="text-text-muted">Need help with your password?</span>
                <Link href="/reset-password" className="text-accent-blue transition hover:text-white hover:underline">
                  Password recovery
                </Link>
              </div>

              <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-sm text-text-muted">
                <p className="font-semibold text-white">Need help logging in?</p>
                <p className="mt-2">Contact Bravo Admin or join Discord for support.</p>
                <div className="mt-3 flex flex-wrap gap-3">
                  <Link href="/contact" className="text-accent-blue transition hover:text-white hover:underline">
                    Contact Bravo Admin
                  </Link>
                  <a href={BRAVO_DISCORD_URL} target="_blank" rel="noreferrer" className="text-accent-blue transition hover:text-white hover:underline">
                    Join Discord
                  </a>
                </div>
              </div>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
