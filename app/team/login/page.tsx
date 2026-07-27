import LoginHubClient from "@/components/auth/LoginHubClient";
import { getServerAuthenticatedSession } from "@/lib/admin-auth";
import { hasTeamWorkspaceAccess } from "@/lib/authz";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Team Login",
  description: "Supabase team login for Bravo Gaming Esports coaches, team managers, and team IGLs.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function TeamLoginPage() {
  const session = await getServerAuthenticatedSession();

  if (session && hasTeamWorkspaceAccess(session.role, session.isAdmin) && session.teamId) {
    redirect("/team");
  }

  return (
    <Suspense fallback={null}>
      <LoginHubClient variant="team" />
    </Suspense>
  );
}
