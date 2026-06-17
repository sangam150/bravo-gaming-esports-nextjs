"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

type AuthContextValue = {
  user: User | null;
  role: string | null;
  isAdmin: boolean;
  loading: boolean;
  configured: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAdminAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAdminAuth must be used within AuthProvider");
  return ctx;
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const configured = isSupabaseConfigured();

  const establishSession = useCallback(async (accessToken: string) => {
    const response = await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken }),
      credentials: "include",
    });
    return response.json().catch(() => ({ success: false })) as Promise<{
      success?: boolean;
      user?: {
        role?: string;
        isAdmin?: boolean;
      };
    }>;
  }, []);

  const clearSession = useCallback(async () => {
    await fetch("/api/auth/session", { method: "DELETE", credentials: "include" });
  }, []);

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }

    const supabase = getSupabaseBrowserClient();
    let active = true;

    void supabase.auth.getSession().then(async ({ data, error }) => {
      if (!active) return;

      if (error) {
        setLoading(false);
        return;
      }

      const nextUser = data.session?.user ?? null;
      setUser(nextUser);

      if (data.session?.access_token) {
        try {
          const sessionData = await establishSession(data.session.access_token);
          setRole(sessionData.user?.role ?? null);
        } catch {
          /* browser session can stay active even if the admin cookie refresh fails */
          setRole(null);
        }
      } else {
        setRole(null);
      }

      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!active) return;

      setUser(session?.user ?? null);

      try {
        if (session?.access_token) {
          const sessionData = await establishSession(session.access_token);
          setRole(sessionData.user?.role ?? null);
        } else {
          await clearSession();
          setRole(null);
        }
      } catch {
        /* cookie sync failure should not crash the auth provider */
        setRole(null);
      }

      setLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [configured, establishSession]);

  const login = useCallback(
    async (email: string, password: string) => {
      if (!configured) throw new Error("Supabase is not configured");

      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      if (!data.session?.access_token || !data.user) {
        throw new Error("Admin login failed");
      }

      const sessionResponse = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken: data.session.access_token }),
        credentials: "include",
      });
      const sessionData = await sessionResponse.json().catch(() => ({}));

      if (!sessionResponse.ok) {
        await supabase.auth.signOut();
        throw new Error(sessionData.error || "Admin login failed");
      }

      if (!sessionData.user?.isAdmin) {
        await clearSession();
        await supabase.auth.signOut();
        throw new Error("This account does not have admin access.");
      }

      setUser(data.user);
      setRole(sessionData.user?.role ?? null);
    },
    [configured, clearSession]
  );

  const logout = useCallback(async () => {
    await clearSession();
    if (configured) {
      await getSupabaseBrowserClient().auth.signOut();
    }
    setUser(null);
    setRole(null);
  }, [configured, clearSession]);

  const value = useMemo(
    () => ({ user, role, isAdmin: role === "super_admin" || role === "admin" || role === "moderator", loading, configured, login, logout }),
    [user, role, loading, configured, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
