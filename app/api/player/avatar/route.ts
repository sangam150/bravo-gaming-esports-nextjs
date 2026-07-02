import { randomUUID } from "crypto";
import { requirePlayerDashboardUser } from "@/lib/admin-auth";
import { writeAuditLogFromRequest } from "@/lib/audit-logs";
import { getPlayer, savePlayer } from "@/lib/data";
import { getPubgHubDataset } from "@/lib/pubg-hub";
import { enforceRateLimit } from "@/lib/rate-limit";
import { revalidateCompetitionPaths, revalidatePlayerPaths } from "@/lib/revalidate-public";
import { deleteFromStorageByUrl, uploadPublicFile } from "@/lib/r2/storage";
import { logServerError } from "@/lib/server-monitoring";
import { createUploadRecord } from "@/lib/upload-records";
import { resolveUploadContentType, validateUpload } from "@/lib/upload-validation";
import type { Player } from "@/lib/types";
import {
  jsonErrorResponse,
  USER_FACING_ERROR_MESSAGES,
} from "@/lib/user-facing-errors";

export const runtime = "nodejs";

function buildPlayerSavePayload(player: Player) {
  const { id: _id, ...rest } = player;
  return rest;
}

export async function POST(request: Request) {
  const limited = await enforceRateLimit(request, { key: "player-avatar-upload", maxRequests: 10, windowMs: 60_000 });
  if (limited) return limited;

  const auth = await requirePlayerDashboardUser(request);
  if (auth.response || !auth.session) {
    return auth.response ?? Response.json({ error: USER_FACING_ERROR_MESSAGES.session }, { status: 401 });
  }

  if (!auth.session.playerId) {
    return Response.json({ error: "This account is not linked to a player profile yet." }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return Response.json({ error: "Choose an avatar before uploading." }, { status: 400 });
    }

    const validationError = validateUpload({
      audience: "admin",
      contentType: file.type,
      fileName: file.name,
      size: file.size,
      type: "player_avatar",
    });

    if (validationError) {
      return Response.json({ error: validationError }, { status: 400 });
    }

    const existingPlayer = await getPlayer(auth.session.playerId);
    let playerRecord: Player | null = existingPlayer;

    if (!playerRecord) {
      const pubgHub = await getPubgHubDataset();
      const hubPlayer =
        pubgHub.players.find(
          (player) => player.id === auth.session.playerId || player.slug === auth.session.playerId
        ) ?? null;

      if (!hubPlayer) {
        return Response.json({ error: "Player profile not found." }, { status: 404 });
      }

      playerRecord = {
        id: hubPlayer.id,
        name: hubPlayer.pubgName,
        inGameName: hubPlayer.pubgName,
        pubgName: hubPlayer.pubgName,
        teamId: hubPlayer.currentTeamId ?? undefined,
        teamName: hubPlayer.currentTeamName ?? undefined,
        avatar: hubPlayer.avatarUrl ?? undefined,
        avatarUrl: hubPlayer.avatarUrl ?? undefined,
        kills: hubPlayer.kills,
        damage: hubPlayer.damage,
        mvpCount: hubPlayer.mvpCount,
        chickenDinners: hubPlayer.wins,
        matches: hubPlayer.matches,
      };
    }

    const currentAvatarUrl = playerRecord.avatarUrl ?? playerRecord.avatar ?? null;
    const contentType =
      resolveUploadContentType("player_avatar", file.name, file.type, { audience: "admin" }) ||
      "application/octet-stream";
    const buffer = Buffer.from(await file.arrayBuffer());
    const uploadRecordId = randomUUID();
    const uploadResult = await uploadPublicFile(
      "player_avatar",
      auth.session.playerId,
      file.name,
      buffer,
      contentType
    );

    const record = await createUploadRecord({
      id: uploadRecordId,
      fileUrl: uploadResult.url,
      filePath: uploadResult.path,
      fileType: "player_avatar",
      relatedType: "player_profile",
      relatedId: auth.session.playerId,
      uploadedBy: auth.session.profileId,
      fileName: file.name,
      contentType,
      sizeBytes: file.size,
    });

    await savePlayer(
      {
        ...buildPlayerSavePayload(playerRecord),
        avatar: uploadResult.url,
        avatarUrl: uploadResult.url,
        name:
          playerRecord.name ??
          playerRecord.inGameName ??
          playerRecord.pubgName ??
          auth.session.displayName ??
          auth.session.email,
      },
      auth.session.playerId
    );

    if (currentAvatarUrl && currentAvatarUrl !== uploadResult.url) {
      await deleteFromStorageByUrl(currentAvatarUrl).catch(() => undefined);
    }

    revalidatePlayerPaths(auth.session.playerId);
    revalidateCompetitionPaths();

    await writeAuditLogFromRequest(request, {
      action: "upload",
      entityId: record.id,
      entityType: "player_avatar",
      oldValue: { avatarUrl: currentAvatarUrl },
      newValue: {
        fileType: "player_avatar",
        fileUrl: uploadResult.url,
        path: uploadResult.path,
        playerId: auth.session.playerId,
      },
    });

    return Response.json({
      success: true,
      id: record.id,
      path: uploadResult.path,
      url: uploadResult.url,
    });
  } catch (error: unknown) {
    await logServerError("player.avatar.upload", error, request);
    return jsonErrorResponse(error, {
      status: 500,
      fallback: USER_FACING_ERROR_MESSAGES.playerProfile,
    });
  }
}

