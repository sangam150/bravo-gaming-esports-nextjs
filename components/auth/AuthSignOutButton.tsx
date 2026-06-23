"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

type AuthSignOutButtonProps = {
  className?: string;
  label?: string;
  pendingLabel?: string;
  redirectTo?: string;
};

export default function AuthSignOutButton({
  className = "btn-secondary",
  label = "Sign Out",
  pendingLabel = "Signing Out...",
  redirectTo = "/login",
}: AuthSignOutButtonProps) {
  const configured = isSupabaseConfigured();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);

    try {
      await fetch("/api/auth/session", { method: "DELETE", credentials: "include" });

      if (configured) {
        await getSupabaseBrowserClient().auth.signOut();
      }
    } finally {
      router.push(redirectTo);
      router.refresh();
      setLoading(false);
    }
  }

  return (
    <button type="button" onClick={handleClick} disabled={loading} className={className}>
      {loading ? pendingLabel : label}
    </button>
  );
}
