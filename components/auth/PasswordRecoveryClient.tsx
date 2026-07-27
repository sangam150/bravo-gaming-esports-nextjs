"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { clearBravoSession } from "@/lib/login-client";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function PasswordRecoveryClient() {
  const [recoverySession, setRecoverySession] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [checkingRecovery, setCheckingRecovery] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const client = getSupabaseBrowserClient();
    let active = true;
    const { data } = client.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === "PASSWORD_RECOVERY" && session) {
        setRecoverySession(true);
        setError(null);
      } else if (event === "SIGNED_OUT") {
        setRecoverySession(false);
      }
    });

    void (async () => {
      const recoveryUrl = new URL(window.location.href);
      const code = recoveryUrl.searchParams.get("code");
      const providerError = recoveryUrl.searchParams.get("error");
      const hashParameters = new URLSearchParams(recoveryUrl.hash.replace(/^#/, ""));
      const implicitRecovery = hashParameters.get("type") === "recovery";

      if (providerError) {
        if (active) {
          setError("This recovery link is invalid or expired. Request a new password reset.");
        }
      } else if (code) {
        const { data: exchangeData, error: exchangeError } = await client.auth.exchangeCodeForSession(code);
        if (active) {
          if (exchangeError || !exchangeData.session) {
            setError("This recovery link is invalid or expired. Request a new password reset.");
          } else {
            setRecoverySession(true);
          }
        }
      } else if (implicitRecovery) {
        const { data: sessionData } = await client.auth.getSession();
        if (active && sessionData.session) {
          setRecoverySession(true);
        }
      }

      if (code || providerError || implicitRecovery) {
        window.history.replaceState(window.history.state, "", "/reset-password");
      }
      if (active) {
        setCheckingRecovery(false);
      }
    })().catch(() => {
      if (active) {
        setError("This recovery link could not be verified. Request a new password reset.");
        setCheckingRecovery(false);
      }
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  async function requestReset(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/auth/password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        message?: string;
        error?: string;
      };
      if (!response.ok) throw new Error(data.error || "Password recovery is temporarily unavailable.");
      setMessage(data.message || "If an account exists for that email, a recovery link has been sent.");
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Password recovery is temporarily unavailable.");
    } finally {
      setLoading(false);
    }
  }

  async function updatePassword(event: React.FormEvent) {
    event.preventDefault();
    if (password.length < 10) {
      setError("Use a password with at least 10 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }
    setLoading(true);
    setError(null);
    const { error: updateError } = await getSupabaseBrowserClient().auth.updateUser({ password });
    if (updateError) {
      setError("This recovery link is invalid or expired. Request a new password reset.");
      setLoading(false);
      return;
    }
    await getSupabaseBrowserClient().auth.signOut({ scope: "local" });
    await clearBravoSession();
    setMessage("Password updated. You can now sign in with your new password.");
    setRecoverySession(false);
    setPassword("");
    setConfirmPassword("");
    setLoading(false);
  }

  return (
    <main className="page-shell pb-12 pt-6">
      <div className="mx-auto max-w-xl">
        <form
          onSubmit={recoverySession ? updatePassword : requestReset}
          className="esports-card space-y-5 p-6 sm:p-8"
          aria-busy={checkingRecovery || loading}
        >
          <p className="section-title">Password Recovery</p>
          <h1 className="font-display text-3xl font-black uppercase text-white">
            {recoverySession ? "Choose a new password" : "Reset your password"}
          </h1>
          <p className="text-sm leading-7 text-text-muted">
            {recoverySession
              ? "Enter a new password for your Bravo account."
              : "Enter your account email. The response is the same whether or not an account exists."}
          </p>

          {error ? (
            <div role="alert" aria-live="assertive" className="rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200">
              {error}
            </div>
          ) : null}
          {message ? (
            <div
              role="status"
              aria-live="polite"
              className="rounded-xl border border-green-400/30 bg-green-500/10 p-4 text-sm text-green-100"
            >
              {message}
            </div>
          ) : null}

          {checkingRecovery ? (
            <div role="status" aria-live="polite" className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-text-muted">
              Verifying password recovery access...
            </div>
          ) : recoverySession ? (
            <>
              <label className="block">
                <span className="mb-2 block text-sm text-text-muted">New password</span>
                <input
                  className="input-esports"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="new-password"
                  required
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm text-text-muted">Confirm new password</span>
                <input
                  className="input-esports"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  autoComplete="new-password"
                  required
                />
              </label>
            </>
          ) : (
            <label className="block">
              <span className="mb-2 block text-sm text-text-muted">Email address</span>
              <input
                className="input-esports"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
              />
            </label>
          )}

          <button disabled={checkingRecovery || loading} className="btn-primary w-full justify-center disabled:opacity-60">
            {checkingRecovery ? "Verifying..." : loading ? "Please wait..." : recoverySession ? "Update Password" : "Send Recovery Link"}
          </button>
          <Link href="/login" className="btn-secondary w-full justify-center">
            Back to Login
          </Link>
        </form>
      </div>
    </main>
  );
}
