"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function PasswordRecoveryClient() {
  const [recoverySession, setRecoverySession] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const client = getSupabaseBrowserClient();
    void client.auth.getSession().then(({ data }) => setRecoverySession(Boolean(data.session)));
    const { data } = client.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setRecoverySession(true);
    });
    return () => data.subscription.unsubscribe();
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
    await getSupabaseBrowserClient().auth.signOut();
    setMessage("Password updated. You can now sign in with your new password.");
    setRecoverySession(false);
    setPassword("");
    setConfirmPassword("");
    setLoading(false);
  }

  return (
    <main className="page-shell pb-12 pt-6">
      <div className="mx-auto max-w-xl">
        <form onSubmit={recoverySession ? updatePassword : requestReset} className="esports-card space-y-5 p-6 sm:p-8">
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

          {recoverySession ? (
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

          <button disabled={loading} className="btn-primary w-full justify-center disabled:opacity-60">
            {loading ? "Please wait..." : recoverySession ? "Update Password" : "Send Recovery Link"}
          </button>
          <Link href="/login" className="btn-secondary w-full justify-center">
            Back to Login
          </Link>
        </form>
      </div>
    </main>
  );
}
