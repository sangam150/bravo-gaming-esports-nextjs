import { requirePlatformAdmin } from "@/lib/admin-auth";
import { writeRequiredAuditLogFromRequest } from "@/lib/audit-logs";
import { prepareCanonicalPublicImageUpload } from "@/lib/canonical-image-upload";
import { ImageDecodeError } from "@/lib/image-validation";
import { getCanonicalPlayerForAvatar, PlayerAvatarMutationError, replaceCanonicalPlayerAvatarWithCas } from "@/lib/player-avatar-service";
import { cleanupUnreferencedPublicAssetByUrl } from "@/lib/public-asset-cleanup";
import { deletePublicObjectByKey, uploadPublicObjectAtKey, verifyPublicObjectDelivery } from "@/lib/r2/storage";
import { enforceRateLimit } from "@/lib/rate-limit";
import { revalidateCompetitionPaths, revalidatePlayerPaths } from "@/lib/revalidate-public";
import { requireSameOrigin } from "@/lib/request-origin";
import { logServerError } from "@/lib/server-monitoring";
import { ActiveAssetDeliveryError, replaceTeamLogoAtomically } from "@/lib/team-logo-service";
import { createUploadRecord, deleteUploadRecord } from "@/lib/upload-records";
import { validateUpload } from "@/lib/upload-validation";
import { toUserFacingErrorMessage } from "@/lib/user-facing-errors";
import { randomUUID } from "node:crypto";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function revalidatePlayerAsset(playerId: string) {
  revalidatePlayerPaths(playerId);
  revalidateCompetitionPaths();
}

function mutationErrorResponse(error: unknown) {
  if (error instanceof ImageDecodeError) {
    return Response.json({ success: false, error: error.message, code: "invalid_image_signature" }, { status: 400 });
  }
  if (error instanceof PlayerAvatarMutationError) {
    return Response.json({ success: false, error: error.message, code: error.code }, { status: error.status });
  }
  if (error instanceof ActiveAssetDeliveryError) {
    return Response.json(
      { success: false, error: error.message, code: error.code, rollbackConfirmed: error.rollbackConfirmed },
      { status: error.status },
    );
  }
  return Response.json(
    {
      success: false,
      code: "player_avatar_mutation_failed",
      error: toUserFacingErrorMessage(error, {
        status: 500,
        fallback: "We couldn't update that player image right now. Please try again shortly.",
      }),
    },
    { status: 500 },
  );
}

async function authorize(request: Request, rateLimitKey: string) {
  const invalidOrigin = requireSameOrigin(request);
  if (invalidOrigin) return { response: invalidOrigin, session: null };
  const auth = await requirePlatformAdmin(request);
  if (auth.response || !auth.session) return auth;
  const limited = await enforceRateLimit(request, {
    key: rateLimitKey,
    maxRequests: 20,
    windowMs: 60_000,
  });
  return limited ? { response: limited, session: null } : auth;
}

export async function POST(request: Request, { params }: RouteContext) {
  const auth = await authorize(request, "admin-player-avatar-replace");
  if (auth.response || !auth.session) return auth.response;

  const { id } = await params;
  if (!UUID_PATTERN.test(id)) {
    return Response.json({ success: false, error: "Select a valid canonical player.", code: "invalid_player_id" }, { status: 400 });
  }

  try {
    const player = await getCanonicalPlayerForAvatar(id);
    if (!player) {
      return Response.json({ success: false, error: "The player could not be found.", code: "player_not_found" }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return Response.json({ success: false, error: "Choose a player image before uploading.", code: "missing_file" }, { status: 400 });
    }

    const validationError = validateUpload({
      audience: "admin",
      contentType: file.type,
      fileName: file.name,
      size: file.size,
      type: "player_avatar",
    });
    if (validationError) {
      return Response.json({ success: false, error: validationError, code: "invalid_player_avatar" }, { status: 400 });
    }

    const inputBuffer = Buffer.from(await file.arrayBuffer());
    const preparedImage = await prepareCanonicalPublicImageUpload({
      altText: `${player.display_name ?? player.pubg_name} avatar`,
      assetName: "avatar",
      buffer: inputBuffer,
      declaredContentType: file.type,
      entityId: id,
      fileName: file.name,
      type: "player_avatar",
    });
    const currentAvatarUrl = player.avatar_url ?? player.photo_url ?? null;
    const verifyDelivery = () =>
      verifyPublicObjectDelivery(preparedImage.objectKey, {
        contentType: preparedImage.decoded.contentType,
        deliveryOrigin: new URL(request.url).origin,
        sizeBytes: preparedImage.decoded.sizeBytes,
      });
    const result = await replaceTeamLogoAtomically({
      cleanupNewArtifactsOnError: (error) =>
        !(error instanceof PlayerAvatarMutationError && error.code === "player_avatar_activation_unconfirmed"),
      createUploadRecord: () =>
        createUploadRecord({
          contentType: preparedImage.decoded.contentType,
          fileName: file.name,
          filePath: preparedImage.objectKey,
          fileType: "player_avatar",
          fileUrl: preparedImage.publicUrl,
          id: randomUUID(),
          relatedId: id,
          relatedType: "player_profile",
          sizeBytes: preparedImage.decoded.sizeBytes,
          uploadedBy: auth.session.profileId,
        }),
      deleteNewObject: () => deletePublicObjectByKey(preparedImage.objectKey),
      deletePreviousObject: async () => {
        if (!currentAvatarUrl || currentAvatarUrl === preparedImage.publicUrl) return true;
        return (await cleanupUnreferencedPublicAssetByUrl(currentAvatarUrl)).deleted;
      },
      deleteUploadRecord,
      revalidate: () => revalidatePlayerAsset(id),
      rollbackCanonicalTeam: async (activatedPlayer) => {
        await replaceCanonicalPlayerAvatarWithCas({
          avatarUrl: currentAvatarUrl,
          expectedAvatarUrl: preparedImage.publicUrl,
          expectedUpdatedAt: activatedPlayer.updated_at,
          playerId: id,
        });
      },
      updateCanonicalTeam: () =>
        replaceCanonicalPlayerAvatarWithCas({
          avatarUrl: preparedImage.publicUrl,
          clearPhotoUrl: Boolean(player.photo_url),
          expectedAvatarUrl: player.avatar_url,
          expectedPhotoUrl: player.photo_url,
          expectedUpdatedAt: player.updated_at,
          playerId: id,
        }),
      uploadNewObject: () =>
        uploadPublicObjectAtKey(preparedImage.objectKey, preparedImage.buffer, preparedImage.decoded.contentType).then(() => undefined),
      verifyActivatedDelivery: () => verifyDelivery(),
      verifyNewObject: () => verifyDelivery(),
      writeDeliveryFailureAudit: (failure) =>
        writeRequiredAuditLogFromRequest(request, {
          action: "admin_player_avatar_delivery_failed",
          entityId: id,
          entityType: "player",
          oldValue: {
            avatarUrl: preparedImage.publicUrl,
            uploadRecordId: failure.uploadRecordId,
          },
          newValue: {
            avatarUrl: failure.rollbackConfirmed ? currentAvatarUrl : "unconfirmed",
            deliveryErrorName: failure.deliveryError instanceof Error ? failure.deliveryError.name : "UnknownError",
            rollbackConfirmed: failure.rollbackConfirmed,
            rollbackErrorName:
              failure.rollbackError instanceof Error ? failure.rollbackError.name : failure.rollbackError ? "UnknownError" : null,
          },
        }).then(() => undefined),
      writeRequiredAudit: (uploadRecordId) =>
        writeRequiredAuditLogFromRequest(request, {
          action: "admin_player_avatar_replace_requested",
          entityId: id,
          entityType: "player",
          oldValue: { avatarUrl: currentAvatarUrl },
          newValue: {
            asset: preparedImage.metadata,
            uploadRecordId,
          },
        }).then(() => undefined),
    });

    return Response.json({
      success: true,
      cleanupPending: result.cleanupPending,
      id: result.uploadRecordId,
      key: preparedImage.objectKey,
      metadata: preparedImage.metadata,
      path: preparedImage.objectKey,
      player: result.team,
      url: preparedImage.publicUrl,
    });
  } catch (error: unknown) {
    await logServerError("admin.players.avatar.replace", error, request);
    return mutationErrorResponse(error);
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const auth = await authorize(request, "admin-player-avatar-delete");
  if (auth.response || !auth.session) return auth.response;

  const { id } = await params;
  if (!UUID_PATTERN.test(id)) {
    return Response.json({ success: false, error: "Select a valid canonical player.", code: "invalid_player_id" }, { status: 400 });
  }

  try {
    const player = await getCanonicalPlayerForAvatar(id);
    if (!player) {
      return Response.json({ success: false, error: "The player could not be found.", code: "player_not_found" }, { status: 404 });
    }
    const currentAvatarUrl = player.avatar_url ?? player.photo_url ?? null;
    if (!currentAvatarUrl) {
      return Response.json({ success: true, cleanupPending: false, player, url: null });
    }

    await writeRequiredAuditLogFromRequest(request, {
      action: "admin_player_avatar_remove_requested",
      entityId: id,
      entityType: "player",
      oldValue: { avatarUrl: currentAvatarUrl },
      newValue: { avatarUrl: null },
    });
    const updatedPlayer = await replaceCanonicalPlayerAvatarWithCas({
      avatarUrl: null,
      clearPhotoUrl: true,
      expectedAvatarUrl: player.avatar_url,
      expectedPhotoUrl: player.photo_url,
      expectedUpdatedAt: player.updated_at,
      playerId: id,
    });

    let cleanupPending = false;
    try {
      revalidatePlayerAsset(id);
    } catch {
      cleanupPending = true;
    }
    if (!cleanupPending) {
      try {
        cleanupPending = !(await cleanupUnreferencedPublicAssetByUrl(currentAvatarUrl)).deleted;
      } catch {
        cleanupPending = true;
      }
    }

    return Response.json({ success: true, cleanupPending, player: updatedPlayer, url: null });
  } catch (error: unknown) {
    await logServerError("admin.players.avatar.delete", error, request);
    return mutationErrorResponse(error);
  }
}
