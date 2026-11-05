import "server-only";

import { getSupabaseServiceRoleClient } from "@/lib/supabase/service-role-client";

const PLAYER_AVATAR_SELECT =
  "id,pubg_name,display_name,current_team_id,avatar_url,photo_url,pubg_account_id,is_active,slug,created_at,updated_at";

type CanonicalPlayerAvatarRow = {
  avatar_url: string | null;
  created_at: string;
  current_team_id: string | null;
  display_name: string | null;
  id: string;
  is_active: boolean;
  photo_url: string | null;
  pubg_account_id: string | null;
  pubg_name: string;
  slug: string | null;
  updated_at: string;
};

export class PlayerAvatarMutationError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(message: string, options: { code: string; status: number }) {
    super(message);
    this.name = "PlayerAvatarMutationError";
    this.code = options.code;
    this.status = options.status;
  }
}

export async function getCanonicalPlayerForAvatar(playerId: string, teamId?: string) {
  const client = getSupabaseServiceRoleClient();
  let query = client.from("players").select(PLAYER_AVATAR_SELECT).eq("id", playerId).is("deleted_at", null);
  if (teamId) query = query.eq("current_team_id", teamId);
  const { data, error } = await query.maybeSingle<CanonicalPlayerAvatarRow>();
  if (error) throw error;
  return data;
}

export async function replaceCanonicalPlayerAvatarWithCas(input: {
  clearPhotoUrl?: boolean;
  expectedAvatarUrl: string | null;
  expectedPhotoUrl?: string | null;
  expectedUpdatedAt: string;
  playerId: string;
  teamId?: string;
  avatarUrl: string | null;
}) {
  const client = getSupabaseServiceRoleClient();
  let query = client
    .from("players")
    .update({
      avatar_url: input.avatarUrl,
      ...(input.clearPhotoUrl ? { photo_url: null } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.playerId)
    .eq("updated_at", input.expectedUpdatedAt)
    .is("deleted_at", null);
  if (input.teamId) query = query.eq("current_team_id", input.teamId);
  query = input.expectedAvatarUrl ? query.eq("avatar_url", input.expectedAvatarUrl) : query.is("avatar_url", null);
  if (input.clearPhotoUrl) {
    query = input.expectedPhotoUrl ? query.eq("photo_url", input.expectedPhotoUrl) : query.is("photo_url", null);
  }

  const { data, error } = await query.select(PLAYER_AVATAR_SELECT).maybeSingle<CanonicalPlayerAvatarRow>();
  if (error) {
    try {
      const current = await getCanonicalPlayerForAvatar(input.playerId, input.teamId);
      if (current?.avatar_url === input.avatarUrl && (!input.clearPhotoUrl || current.photo_url === null)) return current;
    } catch {
      // The activation state is unknown. Callers must retain the new object.
    }
    throw new PlayerAvatarMutationError(
      "The avatar activation result could not be confirmed. The uploaded version was retained for safe recovery.",
      { code: "player_avatar_activation_unconfirmed", status: 503 },
    );
  }

  if (!data) {
    const current = await getCanonicalPlayerForAvatar(input.playerId, input.teamId);
    if (current?.avatar_url === input.avatarUrl && (!input.clearPhotoUrl || current.photo_url === null)) return current;
    throw new PlayerAvatarMutationError("This player changed while the avatar was uploading. Refresh and try again.", {
      code: "player_avatar_version_conflict",
      status: 409,
    });
  }

  return data;
}
