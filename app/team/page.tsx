import { redirect } from "next/navigation";
import AccessStateCard from "@/components/auth/AccessStateCard";
import TeamPanelClient from "@/components/team/TeamPanelClient";
import { hasTeamWorkspaceAccess } from "@/lib/authz";
import { getServerAuthenticatedSession } from "@/lib/admin-auth";

export default async function TeamPage() {
  const session = await getServerAuthenticatedSession();

  if (!session) {
    redirect("/team/login?redirect=/team");
  }

  if (!hasTeamWorkspaceAccess(session.role, session.isAdmin)) {
    return (
      <AccessStateCard
        badge="Access Denied"
        title="Team workspace access is restricted"
        description="This signed-in account does not have the Bravo team workspace role required to manage roster requests, uploads, and tournament operations."
        actions={[
          { href: "/login", label: "Open Login Hub", tone: "primary" },
          { href: "/contact", label: "Contact Bravo", tone: "secondary" },
        ]}
      />
    );
  }

  if (!session.teamId) {
    return (
      <AccessStateCard
        badge="Team Setup Pending"
        title="This account is not linked to a team yet"
        description="Your Supabase account is authenticated, but Bravo still needs to connect it to the correct team record before the workspace can open fully."
        actions={[
          { href: "/contact", label: "Contact Bravo", tone: "primary" },
          { href: "/team/login", label: "Back to Team Login", tone: "secondary" },
        ]}
      />
    );
  }

  return <TeamPanelClient />;
}
