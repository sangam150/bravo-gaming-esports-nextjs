import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import LoginHubClient from "@/components/auth/LoginHubClient";
import { hasTeamWorkspaceAccess } from "@/lib/authz";
import { getServerAuthenticatedSession } from "@/lib/admin-auth";

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

  if (session && hasTeamWorkspaceAccess(session.role, session.isAdmin)) {
    redirect("/team");
  }

  return (
    <Suspense fallback={null}>
      <LoginHubClient variant="team" />
    </Suspense>
  );
}
