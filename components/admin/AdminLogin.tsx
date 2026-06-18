"use client";

import { useState } from "react";
import { useAdminAuth } from "./AuthProvider";
import BravoLogo from "@/components/ui/BravoLogo";

export default function AdminLogin() {
  const { login, configured } = useAdminAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
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
            Supabase auth is not configured. Add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or `NEXT_PUBLIC_SUPABASE_ANON_KEY`), and your admin user records.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="esports-card w-full max-w-md space-y-5 p-8">
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
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>
    </div>
  );
}
