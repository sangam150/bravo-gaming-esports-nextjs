"use client";

import { isAdminRole } from "@/lib/authz";
import { clearBravoSession, performPasswordLogin } from "@/lib/login-client";
import { AUTH_SESSION_EVENT, AUTH_SESSION_STORAGE_KEY } from "@/lib/auth-session-events";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getLoginFailureDetails, validateLoginCredentials } from "@/lib/user-facing-errors";
import type { User } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

type AuthContextValue = {
  user: User | null;
  role: string | null;
  isAdmin: boolean;
  loading: boolean;
  configured: boolean;
  authError: string | null;
  refreshSession: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};
const AuthContext = createContext<AuthContextValue | null>(null);

function buildSessionUser(user?: { uid?: string; email?: string } | null): User | null {
  return user?.uid ? ({ id: user.uid, email: user.email ?? "" } as User) : null;
}

export function useAdminAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAdminAuth must be used within AuthProvider");
  return context;
}

export default function AuthProvider({
  children,
  initialUser,
  initialRole = null,
}: {
  children: React.ReactNode;
  initialUser?: { uid: string; email: string } | null;
  initialRole?: string | null;
}) {
  const configured = isSupabaseConfigured();
  const [user, setUser] = useState<User | null>(() => buildSessionUser(initialUser));
  const [role, setRole] = useState<string | null>(initialRole);
  const [loading, setLoading] = useState(configured && !initialUser);
  const [authError, setAuthError] = useState<string | null>(null);
  const revision = useRef(0);
  const pending = useRef<AbortController | null>(null);

  // Password login writes SSR cookies on the server. The browser SDK can still
  // hold an older in-memory session, so only the protected server projection
  // determines the displayed account/role. Never POST old SDK tokens over it.
  const synchronize = useCallback(async () => {
    const current = ++revision.current;
    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;
    const timeout = setTimeout(() => controller.abort(), 10_000);
    try {
      const response = await fetch("/api/auth/me", { credentials: "include", cache: "no-store", signal: controller.signal });
      if (!response.ok) throw new Error("Session verification is temporarily unavailable. Please retry.");
      const data = await response.json();
      if (current !== revision.current) return;
      setUser(data.authenticated === true ? buildSessionUser(data.user) : null);
      setRole(data.authenticated === true ? (data.user?.role ?? null) : null);
      setAuthError(null);
    } catch {
      if (current !== revision.current) return;
      setUser(null);
      setRole(null);
      setAuthError("Session verification is temporarily unavailable. Check your connection and retry.");
    } finally {
      clearTimeout(timeout);
      if (current === revision.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!configured) return;
    const generation = revision;
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(() => void synchronize(), 0);
    };
    const storageChanged = (event: StorageEvent) => {
      if (event.key === AUTH_SESSION_STORAGE_KEY) schedule();
    };
    const visibilityChanged = () => {
      if (document.visibilityState === "visible") schedule();
    };
    // SDK callbacks remain synchronous; reconciliation runs after the SDK
    // releases its auth lock and never starts a competing token session.
    const {
      data: { subscription },
    } = getSupabaseBrowserClient().auth.onAuthStateChange(() => schedule());
    window.addEventListener(AUTH_SESSION_EVENT, schedule);
    window.addEventListener("storage", storageChanged);
    window.addEventListener("focus", schedule);
    document.addEventListener("visibilitychange", visibilityChanged);
    const interval = setInterval(visibilityChanged, 60_000);
    schedule();
    return () => {
      ++generation.current;
      clearTimeout(timer);
      clearInterval(interval);
      pending.current?.abort();
      subscription.unsubscribe();
      window.removeEventListener(AUTH_SESSION_EVENT, schedule);
      window.removeEventListener("storage", storageChanged);
      window.removeEventListener("focus", schedule);
      document.removeEventListener("visibilitychange", visibilityChanged);
    };
  }, [configured, synchronize]);

  const refreshSession = useCallback(async () => {
    setLoading(true);
    await synchronize();
  }, [synchronize]);
  const login = useCallback(
    async (email: string, password: string) => {
      if (!configured) throw new Error("Supabase is not configured");
      const error = validateLoginCredentials(email, password);
      if (error) throw new Error(error);
      ++revision.current;
      pending.current?.abort();
      const { response, data } = await performPasswordLogin({ email, password, variant: "admin" });
      if (!response.ok || !data.success) {
        throw new Error(
          getLoginFailureDetails(
            { message: data.error, status: data.status ?? response.status },
            { variant: "admin", stage: "credentials" },
          ).message,
        );
      }
      setUser(buildSessionUser(data.user));
      setRole(data.user?.role ?? null);
      setAuthError(null);
      setLoading(false);
    },
    [configured],
  );

  const logout = useCallback(async () => {
    ++revision.current;
    pending.current?.abort();
    setLoading(true);
    try {
      await clearBravoSession();
      if (configured)
        await getSupabaseBrowserClient()
          .auth.signOut({ scope: "local" })
          .catch(() => undefined);
      ++revision.current;
      setUser(null);
      setRole(null);
      setAuthError(null);
    } catch {
      setAuthError("Sign-out could not be confirmed. Check your connection and retry.");
    } finally {
      setLoading(false);
    }
  }, [configured]);

  const value = useMemo(
    () => ({ user, role, isAdmin: isAdminRole(role), loading, configured, authError, refreshSession, login, logout }),
    [user, role, loading, configured, authError, refreshSession, login, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
