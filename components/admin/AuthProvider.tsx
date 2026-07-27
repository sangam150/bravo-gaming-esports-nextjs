"use client";

import { isAdminRole } from "@/lib/authz";
import { clearBravoSession, createBravoSession, performPasswordLogin } from "@/lib/login-client";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getLoginFailureDetails, validateLoginCredentials } from "@/lib/user-facing-errors";
import type { User } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

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

function buildSessionUser(
  user?: {
    uid?: string;
    email?: string;
  } | null,
): User | null {
  if (!user?.uid) {
    return null;
  }

  return {
    id: user.uid,
    email: user.email ?? "",
  } as User;
}

export function useAdminAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAdminAuth must be used within AuthProvider");
  return ctx;
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const configured = isSupabaseConfigured();
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(configured);

  const establishSession = useCallback(async (accessToken: string, refreshToken?: string) => {
    const { data } = await createBravoSession(accessToken, refreshToken);
    return data;
  }, []);

  const clearSession = useCallback(async () => {
    await clearBravoSession();
  }, []);

  const hydrateFromCookieSession = useCallback(async () => {
    const response = await fetch("/api/auth/me", {
      method: "GET",
      credentials: "include",
    });
    const data = (await response.json().catch(() => ({}))) as {
      authenticated?: boolean;
      user?: {
        uid?: string;
        email?: string;
        role?: string;
      };
    };

    if (!response.ok || !data.authenticated || !data.user?.uid) {
      return false;
    }

    setUser(buildSessionUser(data.user));
    setRole(data.user.role ?? null);
    return true;
  }, []);

  useEffect(() => {
    if (!configured) {
      return;
    }

    const supabase = getSupabaseBrowserClient();
    let active = true;

    void supabase.auth.getSession().then(async ({ data, error }) => {
      if (!active) return;

      if (error) {
        await hydrateFromCookieSession().catch(() => false);
        setLoading(false);
        return;
      }

      const nextUser = data.session?.user ?? null;

      if (data.session?.access_token) {
        setUser(nextUser);
        try {
          const sessionData = await establishSession(data.session.access_token, data.session.refresh_token);
          setRole(sessionData.user?.role ?? null);
        } catch {
          /* browser session can stay active even if the admin cookie refresh fails */
          setRole(null);
        }
      } else {
        const hydrated = await hydrateFromCookieSession().catch(() => false);
        if (!hydrated) {
          setUser(null);
          setRole(null);
        }
      }

      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!active) return;

      setUser(session?.user ?? null);

      try {
        if (session?.access_token) {
          setUser(session.user ?? null);
          const sessionData = await establishSession(session.access_token, session.refresh_token);
          setRole(sessionData.user?.role ?? null);
        } else if (event === "SIGNED_OUT") {
          await clearSession();
          setUser(null);
          setRole(null);
        } else {
          const hydrated = await hydrateFromCookieSession().catch(() => false);
          if (!hydrated) {
            setUser(null);
            setRole(null);
          }
        }
      } catch {
        /* cookie sync failure should not crash the auth provider */
        const hydrated = await hydrateFromCookieSession().catch(() => false);
        if (!hydrated) {
          setUser(null);
          setRole(null);
        }
      }

      setLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [configured, establishSession, clearSession, hydrateFromCookieSession]);

  const login = useCallback(
    async (email: string, password: string) => {
      if (!configured) throw new Error("Supabase is not configured");

      const credentialError = validateLoginCredentials(email, password);
      if (credentialError) {
        throw new Error(credentialError);
      }

      const { response, data } = await performPasswordLogin({
        email,
        password,
        variant: "admin",
      });

      if (!response.ok || !data.success) {
        const details = getLoginFailureDetails(
          data.error
            ? {
                message: data.error,
                status: data.status ?? response.status,
              }
            : { status: data.status ?? response.status },
          {
            variant: "admin",
            stage: "credentials",
          },
        );
        throw new Error(details.message);
      }

      setUser(buildSessionUser(data.user));
      setRole(data.user?.role ?? null);
    },
    [configured],
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
    () => ({
      user,
      role,
      isAdmin: isAdminRole(role),
      loading,
      configured,
      login,
      logout,
    }),
    [user, role, loading, configured, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
