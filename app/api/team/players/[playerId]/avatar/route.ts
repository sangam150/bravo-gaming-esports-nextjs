import { requireTeamWorkspaceUser } from "@/lib/admin-auth";
import { writeAuditLogFromRequest } from "@/lib/audit-logs";
import { getPlayer, savePlayer } from "@/lib/data";
import { deleteFromStorageByUrl, uploadPublicFile } from "@/lib/r2/storage";
import { enforceRateLimit } from "@/lib/rate-limit";
import { revalidateCompetitionPaths, revalidatePlayerPaths } from "@/lib/revalidate-public";
import { logServerError } from "@/lib/server-monitoring";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/service-role-client";
import { createUploadRecord } from "@/lib/upload-records";
import { resolveUploadContentType, validateUpload } from "@/lib/upload-validation";
import { USER_FACING_ERROR_MESSAGES, toUserFacingErrorMessage } from "@/lib/user-facing-errors";
import { randomUUID } from "crypto";

type RouteContext = {
  params: Promise<{ playerId: string }>;
};

export const runtime = "nodejs";

export async function POST(request: Request, { params }: RouteContext) {
  const limited = await enforceRateLimit(request, {
    key: "team-player-avatar-upload",
    maxRequests: 12,
    windowMs: 60_000,
  });
  if (limited) return limited;

  const auth = await requireTeamWorkspaceUser(request);
  if (auth.response || !auth.session) {
    return auth.response ?? Response.json({ error: USER_FACING_ERROR_MESSAGES.session }, { status: 401 });
  }

  try {
    const { playerId } = await params;
    const normalizedPlayerId = playerId.trim();
    if (!normalizedPlayerId) {
      return Response.json({ success: false, error: "Player ID is required." }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const previousUrl = (formData.get("previousUrl") as string | null) ?? undefined;

    if (!file) {
      return Response.json({ success: false, error: "Choose a player image before uploading." }, { status: 400 });
    }

    const validationError = validateUpload({
      audience: "team",
      contentType: file.type,
      fileName: file.name,
      size: file.size,
      type: "player_avatar",
    });

    if (validationError) {
      return Response.json({ success: false, error: validationError }, { status: 400 });
    }

    const client = getSupabaseServiceRoleClient();
    const { data: playerRow, error: playerError } = await client
      .from("players")
      .select("id,pubg_name,display_name,current_team_id,avatar_url,photo_url,pubg_account_id,is_active,slug,created_at,updated_at")
      .eq("id", normalizedPlayerId)
      .eq("current_team_id", auth.session.teamId)
      .is("deleted_at", null)
      .maybeSingle();

    if (playerError) {
      throw playerError;
    }

    if (!playerRow) {
      return Response.json(
        {
          success: false,
          error: "You can only update player images for your own roster.",
        },
        { status: 403 },
      );
    }

    const contentType =
      resolveUploadContentType("player_avatar", file.name, file.type, {
        audience: "team",
      }) || "application/octet-stream";
    const buffer = Buffer.from(await file.arrayBuffer());
    const uploadRecordId = randomUUID();
    const uploadResult = await uploadPublicFile("player_avatar", normalizedPlayerId, file.name, buffer, contentType);

    const record = await createUploadRecord({
      id: uploadRecordId,
      fileUrl: uploadResult.url,
      filePath: uploadResult.path,
      fileType: "player_avatar",
      relatedType: "player_profile",
      relatedId: normalizedPlayerId,
      uploadedBy: auth.session.profileId,
      fileName: file.name,
      contentType,
      sizeBytes: file.size,
    });

    const now = new Date().toISOString();
    const { error: updateError } = await client
      .from("players")
      .update({
        avatar_url: uploadResult.url,
        updated_at: now,
      })
      .eq("id", normalizedPlayerId)
      .eq("current_team_id", auth.session.teamId);

    if (updateError) {
      throw updateError;
    }

    const existingPlayer = await getPlayer(normalizedPlayerId).catch(() => null);
    if (existingPlayer) {
      await savePlayer(
        {
          ...existingPlayer,
          avatar: uploadResult.url,
          avatarUrl: uploadResult.url,
          name: existingPlayer.name ?? playerRow.display_name ?? playerRow.pubg_name,
        },
        normalizedPlayerId,
      ).catch(() => undefined);
    }

    const currentAvatarUrl = previousUrl ?? playerRow.avatar_url ?? playerRow.photo_url ?? null;
    if (currentAvatarUrl && currentAvatarUrl !== uploadResult.url) {
      await deleteFromStorageByUrl(currentAvatarUrl).catch(() => undefined);
    }

    revalidatePlayerPaths(normalizedPlayerId);
    revalidateCompetitionPaths();

    await writeAuditLogFromRequest(request, {
      action: "upload",
      entityId: record.id,
      entityType: "team_player_avatar",
      oldValue: {
        avatarUrl: playerRow.avatar_url ?? playerRow.photo_url ?? null,
        playerId: normalizedPlayerId,
      },
      newValue: {
        avatarUrl: uploadResult.url,
        fileType: "player_avatar",
        path: uploadResult.path,
        playerId: normalizedPlayerId,
        teamId: auth.session.teamId,
      },
    });

    return Response.json({
      success: true,
      id: record.id,
      key: uploadResult.path,
      path: uploadResult.path,
      url: uploadResult.url,
    });
  } catch (error: unknown) {
    await logServerError("team.players.avatar.upload", error, request);
    return Response.json(
      {
        success: false,
        error: toUserFacingErrorMessage(error, {
          status: 500,
          fallback: "We couldn't upload that player image right now. Please try again shortly.",
        }),
      },
      { status: 500 },
    );
  }
}
