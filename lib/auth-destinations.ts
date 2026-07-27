import { hasPlayerDashboardAccess, hasTeamWorkspaceAccess } from "./authz";

const AUTH_DESTINATIONS = ["/", "/login", "/admin", "/team", "/dashboard/player"] as const;

export type AuthDestination = (typeof AUTH_DESTINATIONS)[number];

type DestinationProfile = {
  role?: string | null;
  isAdmin?: boolean;
  teamId?: string | null;
  playerId?: string | null;
};

export function readSafeAuthDestination(value: unknown): AuthDestination | null {
  if (typeof value !== "string") {
    return null;
  }

  return AUTH_DESTINATIONS.find((destination) => destination === value.trim()) ?? null;
}

export function resolveAuthorizedAuthDestination(profile: DestinationProfile, requested?: unknown): AuthDestination {
  const defaultDestination: AuthDestination = profile.isAdmin
    ? "/admin"
    : hasTeamWorkspaceAccess(profile.role, profile.isAdmin) && profile.teamId
      ? "/team"
      : hasPlayerDashboardAccess(profile.role, profile.isAdmin) && profile.playerId
        ? "/dashboard/player"
        : "/";
  const requestedDestination = readSafeAuthDestination(requested);

  if (!requestedDestination || requestedDestination === "/") {
    return requestedDestination ?? defaultDestination;
  }
  if (requestedDestination === "/login") {
    return defaultDestination;
  }
  if (requestedDestination === "/admin" && profile.isAdmin) {
    return requestedDestination;
  }
  if (requestedDestination === "/team" && hasTeamWorkspaceAccess(profile.role, profile.isAdmin) && Boolean(profile.teamId)) {
    return requestedDestination;
  }
  if (
    requestedDestination === "/dashboard/player" &&
    hasPlayerDashboardAccess(profile.role, profile.isAdmin) &&
    Boolean(profile.playerId)
  ) {
    return requestedDestination;
  }

  return defaultDestination;
}
