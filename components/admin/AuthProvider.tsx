"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import { getClientAuth, isClientFirebaseConfigured } from "@/lib/firebase-client";

type AuthContextValue = {
  user: User | null;
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
  const [loading, setLoading] = useState(true);
  const configured = isClientFirebaseConfigured();

  const establishSession = useCallback(async (idToken: string) => {
    await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
      credentials: "include",
    });
  }, []);

  const clearSession = useCallback(async () => {
    await fetch("/api/auth/session", { method: "DELETE", credentials: "include" });
  }, []);

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }

    const auth = getClientAuth();
    const unsub = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      if (nextUser) {
        try {
          const token = await nextUser.getIdToken();
          await establishSession(token);
        } catch {
          /* session cookie optional fallback */
        }
      }
      setLoading(false);
    });
    return () => unsub();
  }, [configured, establishSession]);

  const login = useCallback(
    async (email: string, password: string) => {
      if (!configured) throw new Error("Firebase client is not configured");
      const auth = getClientAuth();
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const token = await cred.user.getIdToken();
      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: token }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        await signOut(auth);
        throw new Error(data.error || "Admin login failed");
      }
      setUser(cred.user);
    },
    [configured]
  );

  const logout = useCallback(async () => {
    await clearSession();
    if (configured) await signOut(getClientAuth());
    setUser(null);
  }, [configured, clearSession]);

  const value = useMemo(
    () => ({ user, loading, configured, login, logout }),
    [user, loading, configured, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
