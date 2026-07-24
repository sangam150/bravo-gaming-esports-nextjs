"use client";

import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { extractDiscordUserId } from "@/lib/discord-auth";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import {
  getResponseErrorMessage,
  toUserFacingErrorMessage,
  USER_FACING_ERROR_MESSAGES,
} from "@/lib/user-facing-errors";

type SessionResponse = {
  success?: boolean;
  authenticated?: boolean;
  role?: string;
  isAdmin?: boolean;
  user?: {
    role?: string;
    isAdmin?: boolean;
  };
  error?: string;
  redirectTo?: string;
};

type CallbackState =
  | {
      status: "loading";
    }
  | {
      status: "denied" | "error";
      message: string;
      discordUserId: string | null;
    };

function getSafeNextPath(nextPath: string | null) {
  if (nextPath && nextPath.startsWith("/")) {
    return nextPath;
  }

  return "/team";
}

export default function DiscordAuthCallbackPage() {
  return (
    <Suspense fallback={<CallbackPageShell state={{ status: "loading" }} />}>
      <DiscordAuthCallbackContent />
    </Suspense>
  );
}

function CallbackPageShell({ state }: { state: CallbackState }) {
  return (
    <main className="page-shell pb-12 pt-6">
      <div className="page-stack">
        <section className="hero-banner overflow-hidden p-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_18%,_rgba(29,155,240,0.18),_transparent_30%),radial-gradient(circle_at_84%_18%,_rgba(0,230,118,0.14),_transparent_30%),linear-gradient(135deg,rgba(8,15,30,0.98),rgba(8,15,30,0.82))]" />
          <div className="relative z-10 max-w-3xl">
            <span className="brand-badge">Discord Callback</span>
            <h1 className="hero-h1 mt-5">
              {state.status === "loading" ? "Completing Discord sign-in" : state.status === "denied" ? "Discord access needs admin linking" : "Discord sign-in could not finish"}
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-text-muted">
              {state.status === "loading"
                ? "Bravo is validating your Discord session and checking whether this account is linked to a team-access profile."
                : state.message}
            </p>

            {state.status !== "loading" && state.discordUserId ? (
              <div className="mt-6 rounded-card border border-white/10 bg-bg-primary/75 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-muted">Discord user ID</p>
                <p className="mt-3 break-all font-mono text-sm text-white">{state.discordUserId}</p>
                <p className="mt-3 text-sm text-text-muted">
                  Share this ID with a Bravo admin so it can be linked to your team profile.
                </p>
              </div>
            ) : null}

            {state.status !== "loading" ? (
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/team/login" className="btn-primary">
                  Back to Team Login
                </Link>
                <Link href="/login" className="btn-secondary">
                  Open Login Hub
                </Link>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}

function DiscordAuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasStartedRef = useRef(false);
  const [state, setState] = useState<CallbackState>({
    status: "loading",
  });

  useEffect(() => {
    if (hasStartedRef.current) {
      return;
    }

    hasStartedRef.current = true;

    async function finishDiscordAuth() {
      const supabase = getSupabaseBrowserClient();

      try {
        let {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.access_token) {
          const code = searchParams.get("code");
          if (!code) {
            throw new Error("The Discord sign-in callback did not include an authorization code.");
          }

          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            throw error;
          }

          session = data.session ?? null;
        }

        if (!session?.access_token) {
          throw new Error("Unable to establish your Discord session.");
        }

        const {
          data: { user },
        } = await supabase.auth.getUser();
        const discordUserId = extractDiscordUserId(user ?? session.user ?? null);

        const sessionResponse = await fetch("/api/auth/discord/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accessToken: session.access_token, refreshToken: session.refresh_token }),
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

        router.replace(getSafeNextPath(sessionData.redirectTo ?? null));
        router.refresh();
      } catch (error: unknown) {
        const {
          data: { user },
        } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
        setState({
          status: "error",
          message: toUserFacingErrorMessage(error, { fallback: USER_FACING_ERROR_MESSAGES.login }),
          discordUserId: extractDiscordUserId(user),
        });
      }
    }

    void finishDiscordAuth();
  }, [router, searchParams]);

  return <CallbackPageShell state={state} />;
}
