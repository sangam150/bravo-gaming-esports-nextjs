import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import LoginHubClient from "@/components/auth/LoginHubClient";
import { hasPlayerDashboardAccess } from "@/lib/authz";
import { getServerAuthenticatedSession } from "@/lib/admin-auth";

export const metadata: Metadata = {
  title: "Player Login",
  description: "Supabase player login for Bravo Gaming Esports player dashboard access.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function PlayerLoginPage() {
  const session = await getServerAuthenticatedSession();

  if (session && hasPlayerDashboardAccess(session.role, session.isAdmin)) {
    redirect("/dashboard/player");
  }

  return (
    <Suspense fallback={null}>
      <LoginHubClient variant="player" />
    </Suspense>
  );
}
