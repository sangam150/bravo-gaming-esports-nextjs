import { requirePlatformAdmin } from "@/lib/admin-auth";
import {
  getPlayerTeamLinkingAdminDashboard,
  isPlayerTeamLinkingUnavailableResult,
  updatePlayerTeamLinkSettings,
  type PlayerTeamLinkSettings,
} from "@/lib/player-team-linking";
import { enforceRateLimit } from "@/lib/rate-limit";
import { requireSameOrigin } from "@/lib/request-origin";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function stringArray(value: unknown) {
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
    return null;
  }
  const values = value.map((item) => item.trim()).filter(Boolean);
  return values.every((item) => UUID_PATTERN.test(item)) ? values : null;
}

function parseSettings(value: unknown): PlayerTeamLinkSettings | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const input = value as Record<string, unknown>;
  const allowedEventIds = stringArray(input.allowedEventIds);
  const allowedSeasonIds = stringArray(input.allowedSeasonIds);
  if (
    typeof input.enabled !== "boolean" ||
    input.requireSameSlot !== true ||
    typeof input.requiredMatchCount !== "number" ||
    !Number.isInteger(input.requiredMatchCount) ||
    input.requiredMatchCount !== 5 ||
    (input.activationMode !== "global" && input.activationMode !== "allowlist") ||
    (input.membershipMode !== "auto_activate" && input.membershipMode !== "pending_review") ||
    !allowedEventIds ||
    !allowedSeasonIds
  ) {
    return null;
  }

  return {
    enabled: input.enabled,
    requireSameSlot: input.requireSameSlot,
    requiredMatchCount: input.requiredMatchCount,
    activationMode: input.activationMode,
    membershipMode: input.membershipMode,
    allowedEventIds,
    allowedSeasonIds,
  };
}

export async function GET(request: Request) {
  const auth = await requirePlatformAdmin(request);
  if (auth.response) {
    return auth.response;
  }
  const originResponse = requireSameOrigin(request);
  if (originResponse) {
    return originResponse;
  }

  try {
    return Response.json({ data: await getPlayerTeamLinkingAdminDashboard() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load player/team linking data.";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const auth = await requirePlatformAdmin(request);
  if (auth.response) {
    return auth.response;
  }
  const originResponse = requireSameOrigin(request);
  if (originResponse) {
    return originResponse;
  }
  const rateLimitResponse = await enforceRateLimit(request, {
    key: "admin:player-team-linking:settings",
    maxRequests: 20,
    windowMs: 60_000,
  });
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const settings = parseSettings(await request.json().catch(() => null));
  if (!settings) {
    return Response.json({ error: "Invalid player/team linking settings." }, { status: 400 });
  }

  try {
    const data = await updatePlayerTeamLinkSettings(settings, auth.session.profileId);
    if (isPlayerTeamLinkingUnavailableResult(data)) {
      return Response.json(
        { success: false, available: false, error: "Migration 022 is not applied; player/team linking remains safely disabled.", data },
        { status: 503 },
      );
    }
    return Response.json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update player/team linking settings.";
    return Response.json({ error: message }, { status: 500 });
  }
}
