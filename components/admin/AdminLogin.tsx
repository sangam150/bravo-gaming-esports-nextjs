"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAdminAuth } from "./AuthProvider";
import BravoLogo from "@/components/ui/BravoLogo";
import { BRAVO_DISCORD_URL } from "@/lib/brand-links";
import { reportLoginFailure } from "@/lib/login-client";
import {
  LOGIN_ERROR_MESSAGES,
  validateLoginCredentials,
} from "@/lib/user-facing-errors";

export default function AdminLogin() {
  const { login, configured } = useAdminAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const credentialError = validateLoginCredentials(email, password);
    if (credentialError) {
      await reportLoginFailure({
        variant: "admin",
        category: "missing_credentials",
        stage: "credentials",
      });
      setError(credentialError);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await login(email, password);
      router.replace("/admin");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : LOGIN_ERROR_MESSAGES.invalidCredentials);
    } finally {
      setLoading(false);
    }
  }

  if (!configured) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4">
        <div className="esports-card max-w-md p-8 text-center">
          <div className="mx-auto w-fit"><BravoLogo size={56} /></div>
          <h1 className="mt-4 font-display text-2xl font-black uppercase text-white">Admin Login</h1>
          <p className="mt-3 text-sm text-text-muted">
            {LOGIN_ERROR_MESSAGES.backendUnavailable}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <form onSubmit={handleSubmit} noValidate className="esports-card w-full max-w-md space-y-5 p-8">
        <div className="text-center">
          <div className="mx-auto w-fit"><BravoLogo size={56} /></div>
          <p className="section-title mt-4">Staff Only</p>
          <h1 className="mt-2 font-display text-3xl font-black uppercase text-white">Admin Login</h1>
          <p className="mt-2 text-sm text-text-muted">Sign in with your authorized Supabase admin account.</p>
        </div>

        {error && (
          <div className="rounded-xl border border-bravoRed/30 bg-bravoRed/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <input
          className="input-esports"
          type="email"
          placeholder="Admin email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
        <input
          className="input-esports"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
        />
        <button type="submit" disabled={loading} className="btn-primary w-full justify-center disabled:opacity-60">
          {loading ? "Checking admin access..." : "Sign In"}
        </button>

        <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-4 text-sm">
          <span className="text-text-muted">Need help with your password?</span>
          <Link href="/reset-password" className="text-accent-blue transition hover:text-white hover:underline">
            Password recovery
          </Link>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-4 text-sm text-text-muted">
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
  );
}
