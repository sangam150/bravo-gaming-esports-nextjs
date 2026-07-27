"use client";

import DiscordLoginButton, { useDiscordProviderEnabled } from "@/components/auth/DiscordLoginButton";
import { readSafeAuthDestination } from "@/lib/auth-destinations";
import { BRAVO_DISCORD_URL } from "@/lib/brand-links";
import { scheduleEffectTask } from "@/lib/effect-task";
import { performPasswordLogin, reportLoginFailure } from "@/lib/login-client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { LOGIN_ERROR_MESSAGES, validateLoginCredentials } from "@/lib/user-facing-errors";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

type LoginVariant = "hub" | "team" | "player";

type LoginHubClientProps = {
  variant?: LoginVariant;
};

const CALLBACK_ERROR_MESSAGES: Readonly<Record<string, string>> = {
  oauth_cancelled: "Discord sign-in was cancelled. You can try again or use email login.",
  callback_code_missing: "Discord sign-in could not be completed. Please start again from this page.",
  callback_exchange_failed: "Discord sign-in expired or could not be verified. Please try again.",
  identity_verification_failed: "Discord returned an identity that could not be verified.",
  email_callback_access_denied:
    "The email link was verified, but this account is not linked to an active Bravo profile. Contact Bravo Admin before trying again.",
  discord_identity_missing: "Discord identity verification could not be completed.",
  discord_not_member: "Join the official Bravo Gaming Esports Discord server before using Discord login.",
  discord_unavailable: "Discord verification is temporarily unavailable. Please try again later or use email login.",
  discord_banned: "This Discord account is not permitted to access Bravo Gaming Esports.",
  discord_suspended: "This Discord account is not permitted to access Bravo Gaming Esports.",
  discord_profile_missing: "Your Bravo profile is not ready. Please contact Bravo Admin.",
  discord_access_denied: "Discord access could not be approved. Please contact Bravo Admin if this continues.",
};

const AUTH_NOTICE_MESSAGES: Readonly<Record<string, string>> = {
  team_approval_pending: "Your Discord identity and team function were verified. Private team access remains pending Bravo Admin approval.",
  player_link_pending: "Your Discord Player role was verified, but your Bravo player profile has not been linked yet.",
  viewer_access: "Discord sign-in succeeded. Your account currently has public viewer access.",
};

function getVariantContent(variant: LoginVariant) {
  switch (variant) {
    case "team":
      return {
        badge: "Team Login",
        title: "Open the Bravo team workspace",
        description: "Use your Supabase coach, team manager, or team IGL account to manage roster requests, uploads, and team operations.",
        buttonLabel: "Open Team Workspace",
      };
    case "player":
      return {
        badge: "Player Login",
        title: "Open your Bravo player access",
        description: "Use the confirmed Supabase account linked to your approved Bravo player profile.",
        buttonLabel: "Open Player Dashboard",
      };
    default:
      return {
        badge: "Platform Login",
        title: "Sign in to the Bravo platform",
        description: "Use your confirmed Supabase account and Bravo will route you to your approved destination.",
        buttonLabel: "Sign In",
      };
  }
}

export default function LoginHubClient({ variant = "hub" }: LoginHubClientProps) {
  const configured = isSupabaseConfigured();
  const discordAuthEnabled = useDiscordProviderEnabled();
  const searchParams = useSearchParams();
  const [hydrated, setHydrated] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const content = getVariantContent(variant);

  useEffect(() => scheduleEffectTask(() => setHydrated(true)), []);
  useEffect(() => {
    const callbackError = searchParams.get("error");
    if (callbackError) {
      scheduleEffectTask(() => setError(CALLBACK_ERROR_MESSAGES[callbackError] ?? CALLBACK_ERROR_MESSAGES.discord_access_denied));
    }
    const authNotice = searchParams.get("notice");
    if (authNotice) {
      scheduleEffectTask(() => setNotice(AUTH_NOTICE_MESSAGES[authNotice] ?? null));
    }
  }, [searchParams]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!configured) return;
    const requestVariant = variant === "team" ? "team" : variant === "player" ? "player" : "hub";

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
      const { response, data } = await performPasswordLogin({
        email,
        password,
        variant: requestVariant,
        redirect: searchParams.get("redirect"),
      });
      if (!response.ok || !data.success) {
        throw new Error(data.error || LOGIN_ERROR_MESSAGES.backendUnavailable);
      }

      const redirectTarget = readSafeAuthDestination(data.redirectTo);
      if (!redirectTarget) {
        throw new Error(LOGIN_ERROR_MESSAGES.backendUnavailable);
      }
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
              <p className="mt-4 text-sm leading-relaxed text-text-muted">{LOGIN_ERROR_MESSAGES.backendUnavailable}</p>
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
              <p className="mt-4 max-w-3xl text-sm leading-relaxed text-text-muted">{content.description}</p>
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
                  </>
                )}
              </div>
            </div>

            <form onSubmit={handleSubmit} noValidate className="rounded-card border border-white/[0.08] bg-bg-primary/75 p-6">
              <p className="section-title">Email Login</p>
              <h2 className="mt-2 font-display text-2xl font-black uppercase text-white">Sign in</h2>
              <p className="mt-3 text-sm text-text-muted">Use the same Supabase credentials assigned to your Bravo role.</p>

              {error ? (
                <div
                  role="alert"
                  aria-live="assertive"
                  className="form-message mt-5 rounded-2xl border border-bravoRed/30 bg-bravoRed/10 px-4 py-3 text-sm text-red-200"
                >
                  {error}
                </div>
              ) : null}
              {notice ? (
                <div
                  role="status"
                  aria-live="polite"
                  className="form-message mt-5 rounded-2xl border border-accent-blue/30 bg-accent-blue/10 px-4 py-3 text-sm text-blue-100"
                >
                  {notice}
                </div>
              ) : null}

              <div className="mt-5 space-y-4">
                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">Email address</span>
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
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">Password</span>
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
                <button
                  type="submit"
                  disabled={!hydrated || loading}
                  aria-busy={loading}
                  className="btn-primary h-auto min-h-10 w-full justify-center py-2.5 text-center leading-tight disabled:opacity-60"
                >
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
                  <DiscordLoginButton className="mt-4" enabled={discordAuthEnabled} />
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
                  <a
                    href={BRAVO_DISCORD_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="text-accent-blue transition hover:text-white hover:underline"
                  >
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
