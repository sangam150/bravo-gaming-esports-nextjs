import { requireTeamWorkspaceUser } from "@/lib/admin-auth";
import { writeRequiredAuditLogFromRequest } from "@/lib/audit-logs";
import { prepareCanonicalPublicImageUpload } from "@/lib/canonical-image-upload";
import { COLLECTIONS, getDocument, saveDocument } from "@/lib/document-store";
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
import { USER_FACING_ERROR_MESSAGES, toUserFacingErrorMessage } from "@/lib/user-facing-errors";
import { randomUUID } from "crypto";

type RouteContext = {
  params: Promise<{ playerId: string }>;
};

export const runtime = "nodejs";

export async function POST(request: Request, { params }: RouteContext) {
  const invalidOrigin = requireSameOrigin(request);
  if (invalidOrigin) return invalidOrigin;
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

    const playerRow = await getCanonicalPlayerForAvatar(normalizedPlayerId, auth.session.teamId);
    if (!playerRow) {
      return Response.json(
        {
          success: false,
          error: "You can only update player images for your own roster.",
        },
        { status: 403 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const preparedImage = await prepareCanonicalPublicImageUpload({
      altText: `${playerRow.display_name ?? playerRow.pubg_name} avatar`,
      assetName: "avatar",
      buffer,
      declaredContentType: file.type,
      entityId: normalizedPlayerId,
      fileName: file.name,
      type: "player_avatar",
    });
    const { metadata, objectKey, publicUrl } = preparedImage;
    const currentAvatarUrl = playerRow.avatar_url ?? playerRow.photo_url ?? null;
    const verifyDelivery = () =>
      verifyPublicObjectDelivery(objectKey, {
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
          filePath: objectKey,
          fileType: "player_avatar",
          fileUrl: publicUrl,
          id: randomUUID(),
          relatedId: normalizedPlayerId,
          relatedType: "player_profile",
          sizeBytes: preparedImage.decoded.sizeBytes,
          uploadedBy: auth.session.profileId,
        }),
      deleteNewObject: () => deletePublicObjectByKey(objectKey),
      deletePreviousObject: async () => {
        if (!currentAvatarUrl || currentAvatarUrl === publicUrl) return true;
        return (await cleanupUnreferencedPublicAssetByUrl(currentAvatarUrl)).deleted;
      },
      deleteUploadRecord,
      revalidate: () => {
        revalidatePlayerPaths(normalizedPlayerId);
        revalidateCompetitionPaths();
      },
      rollbackCanonicalTeam: async (activatedPlayer) => {
        await replaceCanonicalPlayerAvatarWithCas({
          avatarUrl: currentAvatarUrl,
          expectedAvatarUrl: publicUrl,
          expectedUpdatedAt: activatedPlayer.updated_at,
          playerId: normalizedPlayerId,
          teamId: auth.session.teamId,
        });
      },
      updateCanonicalTeam: async () => {
        return replaceCanonicalPlayerAvatarWithCas({
          avatarUrl: publicUrl,
          clearPhotoUrl: Boolean(playerRow.photo_url),
          expectedAvatarUrl: playerRow.avatar_url,
          expectedPhotoUrl: playerRow.photo_url,
          expectedUpdatedAt: playerRow.updated_at,
          playerId: normalizedPlayerId,
          teamId: auth.session.teamId,
        });
      },
      uploadNewObject: () =>
        uploadPublicObjectAtKey(objectKey, preparedImage.buffer, preparedImage.decoded.contentType).then(() => undefined),
      verifyActivatedDelivery: () => verifyDelivery(),
      verifyNewObject: () => verifyDelivery(),
      writeDeliveryFailureAudit: (failure) =>
        writeRequiredAuditLogFromRequest(request, {
          action: "player_avatar_delivery_failed",
          entityId: normalizedPlayerId,
          entityType: "team_player_avatar",
          oldValue: {
            avatarUrl: publicUrl,
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
          action: "player_avatar_replace_requested",
          entityId: normalizedPlayerId,
          entityType: "team_player_avatar",
          oldValue: {
            avatarUrl: currentAvatarUrl,
            playerId: normalizedPlayerId,
          },
          newValue: {
            asset: metadata,
            playerId: normalizedPlayerId,
            teamId: auth.session.teamId,
            uploadRecordId,
          },
        }).then(() => undefined),
    });

    const existingPlayer = await getDocument(COLLECTIONS.players, normalizedPlayerId).catch(() => null);
    if (existingPlayer) {
      await saveDocument(COLLECTIONS.players, normalizedPlayerId, {
        avatar: publicUrl,
        avatarUrl: publicUrl,
      }).catch(() => undefined);
    }

    return Response.json({
      success: true,
      cleanupPending: result.cleanupPending,
      id: result.uploadRecordId,
      key: objectKey,
      metadata,
      path: objectKey,
      url: publicUrl,
    });
  } catch (error: unknown) {
    await logServerError("team.players.avatar.upload", error, request);
    if (error instanceof ImageDecodeError) {
      return Response.json({ success: false, error: error.message, code: "invalid_image_signature" }, { status: 400 });
    }
    if (error instanceof ActiveAssetDeliveryError) {
      return Response.json(
        { success: false, error: error.message, code: error.code, rollbackConfirmed: error.rollbackConfirmed },
        { status: error.status },
      );
    }
    if (error instanceof PlayerAvatarMutationError) {
      return Response.json({ success: false, error: error.message, code: error.code }, { status: error.status });
    }
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
