import type { NextRequest } from "next/server";

const ADMIN_ROLES = new Set(["super_admin", "admin", "moderator", "organizer"]);
const TEAM_ROLES = new Set(["team_igl", "team_manager", "coach"]);

export type EdgeIdentity = {
  uid: string;
  role: string;
  teamId: string | null;
  isActive: boolean;
};

export async function resolveEdgeIdentity(request: NextRequest): Promise<EdgeIdentity | null> {
  const token = request.cookies.get("bravo_session")?.value;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publicKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!token || !url || !publicKey || !serviceRoleKey) return null;

  try {
    const authResponse = await fetch(`${url}/auth/v1/user`, {
      headers: { apikey: publicKey, Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!authResponse.ok) return null;
    const user = (await authResponse.json()) as { id?: string };
    if (!user.id) return null;

    const query = new URLSearchParams({
      select: "role,team_id,is_active",
      auth_user_id: `eq.${user.id}`,
      limit: "1",
    });
    const profileResponse = await fetch(`${url}/rest/v1/profiles?${query}`, {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });
    if (!profileResponse.ok) return null;
    const profiles = (await profileResponse.json()) as Array<{
      role?: string;
      team_id?: string | null;
      is_active?: boolean;
    }>;
    const profile = profiles[0];
    if (!profile?.role || !profile.is_active) return null;

    return {
      uid: user.id,
      role: profile.role,
      teamId: profile.team_id ?? null,
      isActive: true,
    };
  } catch {
    return null;
  }
}

export function hasEdgeAdminAccess(identity: EdgeIdentity | null) {
  return Boolean(identity && ADMIN_ROLES.has(identity.role));
}

export function hasEdgeTeamAccess(identity: EdgeIdentity | null) {
  return Boolean(identity && TEAM_ROLES.has(identity.role) && identity.teamId);
}
