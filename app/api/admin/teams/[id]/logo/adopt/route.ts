import { requirePlatformAdmin } from "@/lib/admin-auth";
import { writeRequiredAuditLogFromRequest } from "@/lib/audit-logs";
import { prepareCanonicalPublicImageUpload } from "@/lib/canonical-image-upload";
import {
  CanonicalTeamError,
  getCanonicalAdminTeam,
  isCanonicalTeamId,
  mergeTeamSourceMetadata,
  replaceCanonicalTeamLogoWithCas,
} from "@/lib/canonical-teams";
import { ImageDecodeError } from "@/lib/image-validation";
import { cleanupStagedAdminUpload, cleanupUnreferencedPublicAssetByUrl } from "@/lib/public-asset-cleanup";
import {
  deletePublicObjectByKey,
  getManagedUploadRecord,
  getPublicObject,
  normalizeManagedPublicObjectKey,
  readObjectBodyAsBuffer,
  uploadPublicObjectAtKey,
  verifyPublicObjectDelivery,
} from "@/lib/r2/storage";
import { enforceRateLimit } from "@/lib/rate-limit";
import { revalidateTeamAssetPaths } from "@/lib/revalidate-public";
import { requireSameOrigin } from "@/lib/request-origin";
import { logServerError } from "@/lib/server-monitoring";
import { ActiveAssetDeliveryError, replaceTeamLogoAtomically } from "@/lib/team-logo-service";
import { createUploadRecord, deleteUploadRecord } from "@/lib/upload-records";
import type { Json } from "@/types/database.types";
import { randomUUID } from "node:crypto";

type RouteParams = { params: Promise<{ id: string }> };

function jsonObject(value: Json) {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value : {};
}

function adoptionError(error: unknown) {
  if (error instanceof CanonicalTeamError) {
    return Response.json({ success: false, error: error.message, code: error.code }, { status: error.status });
  }
  if (error instanceof ImageDecodeError) {
    return Response.json({ success: false, error: error.message, code: "invalid_image_signature" }, { status: 400 });
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
      code: "team_logo_adoption_failed",
      error: "The managed upload could not be adopted. The current team logo remains unchanged.",
    },
    { status: 500 },
  );
}

export async function POST(request: Request, { params }: RouteParams) {
  const invalidOrigin = requireSameOrigin(request);
  if (invalidOrigin) return invalidOrigin;
  const auth = await requirePlatformAdmin(request);
  if (auth.response || !auth.session) return auth.response;
  const limited = await enforceRateLimit(request, {
    key: "admin-team-logo-adopt",
    maxRequests: 12,
    windowMs: 60_000,
  });
  if (limited) return limited;

  const { id } = await params;
  if (!isCanonicalTeamId(id)) {
    return Response.json({ success: false, error: "Select a valid official team.", code: "invalid_team_id" }, { status: 400 });
  }

  try {
    const body = (await request.json().catch(() => null)) as { objectKey?: unknown; uploadId?: unknown } | null;
    const uploadId = typeof body?.uploadId === "string" ? body.uploadId.trim() : "";
    const suppliedObjectKey = typeof body?.objectKey === "string" ? body.objectKey.trim() : "";
    const objectKey = normalizeManagedPublicObjectKey(suppliedObjectKey);
    if (!uploadId || !objectKey) {
      return Response.json(
        {
          success: false,
          code: "invalid_adoption_input",
          error: "A managed upload ID and its exact object key are required.",
        },
        { status: 400 },
      );
    }

    const [team, sourceUpload] = await Promise.all([getCanonicalAdminTeam(id), getManagedUploadRecord(uploadId)]);
    if (!team) {
      throw new CanonicalTeamError("The official team could not be found.", { code: "team_not_found", status: 404 });
    }
    if (
      !sourceUpload ||
      sourceUpload.id !== uploadId ||
      sourceUpload.filePath !== objectKey ||
      sourceUpload.fileType !== "team_logo" ||
      sourceUpload.relatedId !== team.id ||
      sourceUpload.relatedType !== "admin_upload"
    ) {
      return Response.json(
        {
          success: false,
          code: "managed_upload_mismatch",
          error: "The selected managed upload is not explicitly linked to this canonical team.",
        },
        { status: 409 },
      );
    }

    const sourceObject = await getPublicObject(objectKey);
    const sourceBuffer = await readObjectBodyAsBuffer(sourceObject.Body);
    if (!sourceBuffer) {
      return Response.json(
        { success: false, code: "managed_upload_missing", error: "The selected managed upload object could not be read." },
        { status: 404 },
      );
    }

    const preparedImage = await prepareCanonicalPublicImageUpload({
      altText: `${team.name} logo`,
      assetName: "logo",
      buffer: sourceBuffer,
      declaredContentType: sourceObject.ContentType ?? sourceUpload.contentType,
      entityId: team.id,
      fileName: sourceUpload.fileName ?? `${team.slug ?? team.id}.png`,
      type: "team_logo",
    });
    const currentMetadata = jsonObject(team.sourceMetadata);
    const currentAssets = jsonObject(currentMetadata.assets ?? {});
    const activationId = randomUUID();
    const activationMetadata = {
      ...preparedImage.metadata,
      activationId,
      adoptedFromUploadId: sourceUpload.id,
    };
    const verifyDelivery = () =>
      verifyPublicObjectDelivery(preparedImage.objectKey, {
        contentType: preparedImage.decoded.contentType,
        deliveryOrigin: new URL(request.url).origin,
        sizeBytes: preparedImage.decoded.sizeBytes,
      });

    const result = await replaceTeamLogoAtomically({
      cleanupNewArtifactsOnError: (error) => !(error instanceof CanonicalTeamError && error.code === "team_logo_activation_unconfirmed"),
      createUploadRecord: () =>
        createUploadRecord({
          contentType: preparedImage.decoded.contentType,
          fileName: sourceUpload.fileName ?? "adopted-team-logo.webp",
          filePath: preparedImage.objectKey,
          fileType: "team_logo",
          fileUrl: preparedImage.publicUrl,
          id: randomUUID(),
          relatedId: team.id,
          relatedType: "team_logo",
          sizeBytes: preparedImage.decoded.sizeBytes,
          uploadedBy: auth.session.profileId,
        }),
      deleteNewObject: () => deletePublicObjectByKey(preparedImage.objectKey),
      deletePreviousObject: async () => {
        if (!team.logoUrl || team.logoUrl === preparedImage.publicUrl) return true;
        return (await cleanupUnreferencedPublicAssetByUrl(team.logoUrl)).deleted;
      },
      deleteUploadRecord,
      revalidate: () => revalidateTeamAssetPaths(team.id, team.slug),
      rollbackCanonicalTeam: async (activatedTeam) => {
        await replaceCanonicalTeamLogoWithCas(team.id, {
          expectedLogoUrl: preparedImage.publicUrl,
          expectedUpdatedAt: activatedTeam.updatedAt,
          logoUrl: team.logoUrl,
          sourceMetadata: team.sourceMetadata,
        });
      },
      updateCanonicalTeam: () =>
        replaceCanonicalTeamLogoWithCas(team.id, {
          expectedLogoUrl: team.logoUrl,
          expectedUpdatedAt: team.updatedAt,
          logoUrl: preparedImage.publicUrl,
          sourceMetadata: mergeTeamSourceMetadata(team.sourceMetadata, {
            assets: {
              ...currentAssets,
              logo: activationMetadata,
            },
          }),
        }),
      uploadNewObject: () =>
        uploadPublicObjectAtKey(preparedImage.objectKey, preparedImage.buffer, preparedImage.decoded.contentType).then(() => undefined),
      verifyActivatedDelivery: () => verifyDelivery(),
      verifyNewObject: () => verifyDelivery(),
      writeDeliveryFailureAudit: (failure) =>
        writeRequiredAuditLogFromRequest(request, {
          action: "adopt_managed_team_logo_delivery_failed",
          entityId: team.id,
          entityType: "team",
          oldValue: {
            logoUrl: preparedImage.publicUrl,
            uploadRecordId: failure.uploadRecordId,
          },
          newValue: {
            deliveryErrorName: failure.deliveryError instanceof Error ? failure.deliveryError.name : "UnknownError",
            logoUrl: failure.rollbackConfirmed ? team.logoUrl : "unconfirmed",
            rollbackConfirmed: failure.rollbackConfirmed,
            rollbackErrorName:
              failure.rollbackError instanceof Error ? failure.rollbackError.name : failure.rollbackError ? "UnknownError" : null,
          },
        }).then(() => undefined),
      writeRequiredAudit: (newUploadRecordId) =>
        writeRequiredAuditLogFromRequest(request, {
          action: "adopt_managed_team_logo_requested",
          entityId: team.id,
          entityType: "team",
          oldValue: { logoUrl: team.logoUrl },
          newValue: {
            activationId,
            adoptedFrom: {
              objectKey,
              uploadId: sourceUpload.id,
            },
            logo: activationMetadata,
            uploadRecordId: newUploadRecordId,
          },
        }).then(() => undefined),
    });

    let sourceCleanupPending = false;
    if (objectKey !== preparedImage.objectKey) {
      try {
        const sourceCleanup = await cleanupStagedAdminUpload({
          objectKey,
          uploadId: sourceUpload.id,
        });
        sourceCleanupPending = !sourceCleanup.deleted;
      } catch {
        sourceCleanupPending = true;
      }
    }

    return Response.json({
      success: true,
      cleanupPending: result.cleanupPending || sourceCleanupPending,
      id: result.uploadRecordId,
      key: preparedImage.objectKey,
      metadata: preparedImage.metadata,
      path: preparedImage.objectKey,
      sourceCleanupPending,
      team: result.team,
      url: preparedImage.publicUrl,
    });
  } catch (error: unknown) {
    await logServerError("admin.teams.logo.adopt", error, request);
    return adoptionError(error);
  }
}
