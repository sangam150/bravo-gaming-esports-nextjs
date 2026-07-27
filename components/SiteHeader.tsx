import SiteHeaderClient from "@/components/SiteHeaderClient";
import { getServerAuthenticatedSession } from "@/lib/admin-auth";
import { resolveAuthorizedAuthDestination } from "@/lib/auth-destinations";

function formatRoleLabel(role: string) {
  return role
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default async function SiteHeader() {
  const session = await getServerAuthenticatedSession().catch(() => null);
  const dashboardHref = resolveAuthorizedAuthDestination(session ?? {});
  const profileHref = session?.playerId ? `/players/${session.playerId}` : session?.teamId ? `/teams/${session.teamId}` : undefined;
  const account = session
    ? {
        identity: session.displayName || session.email,
        email: session.email,
        roleLabel: formatRoleLabel(session.role),
        statusLabel: "Active",
        dashboardHref,
        profileHref,
      }
    : null;

  return <SiteHeaderClient watchLiveHref="/live-stream" account={account} />;
}
