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
import { cleanupUnreferencedPublicAssetByUrl } from "@/lib/public-asset-cleanup";
import { deletePublicObjectByKey, uploadPublicObjectAtKey, verifyPublicObjectDelivery } from "@/lib/r2/storage";
import { enforceRateLimit } from "@/lib/rate-limit";
import { revalidateTeamAssetPaths } from "@/lib/revalidate-public";
import { requireSameOrigin } from "@/lib/request-origin";
import { logServerError } from "@/lib/server-monitoring";
import { ActiveAssetDeliveryError, replaceTeamLogoAtomically } from "@/lib/team-logo-service";
import { validateUpload } from "@/lib/upload-validation";
import { createUploadRecord, deleteUploadRecord } from "@/lib/upload-records";
import type { Json } from "@/types/database.types";
import { randomUUID } from "node:crypto";

type RouteParams = { params: Promise<{ id: string }> };

function jsonObject(value: Json) {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value : {};
}

function errorResponse(error: unknown) {
  if (error instanceof CanonicalTeamError) {
    return Response.json({ success: false, error: error.message, code: error.code }, { status: error.status });
  }
  if (error instanceof ImageDecodeError) {
    return Response.json({ success: false, error: error.message, code: "invalid_image_signature" }, { status: 400 });
  }
  if (error instanceof ActiveAssetDeliveryError) {
    return Response.json(
      {
        success: false,
        error: error.message,
        code: error.code,
        rollbackConfirmed: error.rollbackConfirmed,
      },
      { status: error.status },
    );
  }
  return Response.json(
    {
      success: false,
      error: "The team logo could not be replaced. The previous logo remains active.",
      code: "team_logo_replace_failed",
    },
    { status: 500 },
  );
}

export async function POST(request: Request, { params }: RouteParams) {
  const invalidOrigin = requireSameOrigin(request);
  if (invalidOrigin) return invalidOrigin;
  const auth = await requirePlatformAdmin(request);
  if (auth.response) return auth.response;
  const limited = await enforceRateLimit(request, {
    key: "admin-team-logo-replace",
    maxRequests: 20,
    windowMs: 60_000,
  });
  if (limited) return limited;

  const { id } = await params;
  if (!isCanonicalTeamId(id)) {
    return Response.json({ success: false, error: "Select a valid official team.", code: "invalid_team_id" }, { status: 400 });
  }

  try {
    const team = await getCanonicalAdminTeam(id);
    if (!team) {
      throw new CanonicalTeamError("The official team could not be found.", { code: "team_not_found", status: 404 });
    }
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return Response.json({ success: false, error: "Choose a team logo before uploading.", code: "missing_file" }, { status: 400 });
    }

    const validationError = validateUpload({
      audience: "admin",
      contentType: file.type,
      fileName: file.name,
      size: file.size,
      type: "team_logo",
    });
    if (validationError) {
      return Response.json({ success: false, error: validationError, code: "invalid_upload" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const preparedImage = await prepareCanonicalPublicImageUpload({
      altText: `${team.name} logo`,
      assetName: "logo",
      buffer,
      declaredContentType: file.type,
      entityId: team.id,
      fileName: file.name,
      type: "team_logo",
    });
    const { metadata: logoMetadata, objectKey, publicUrl } = preparedImage;
    const currentMetadata = jsonObject(team.sourceMetadata);
    const currentAssets = jsonObject(currentMetadata.assets ?? {});
    const activationId = randomUUID();
    const activationMetadata = {
      ...logoMetadata,
      activationId,
    };
    const verifyDelivery = () =>
      verifyPublicObjectDelivery(objectKey, {
        contentType: preparedImage.decoded.contentType,
        deliveryOrigin: new URL(request.url).origin,
        sizeBytes: preparedImage.decoded.sizeBytes,
      });

    const result = await replaceTeamLogoAtomically({
      cleanupNewArtifactsOnError: (error) => !(error instanceof CanonicalTeamError && error.code === "team_logo_activation_unconfirmed"),
      createUploadRecord: () =>
        createUploadRecord({
          contentType: preparedImage.decoded.contentType,
          fileName: file.name,
          filePath: objectKey,
          fileType: "team_logo",
          fileUrl: publicUrl,
          id: randomUUID(),
          relatedId: team.id,
          relatedType: "team_logo",
          sizeBytes: preparedImage.decoded.sizeBytes,
          uploadedBy: auth.session.profileId,
        }),
      deleteNewObject: () => deletePublicObjectByKey(objectKey),
      deletePreviousObject: async () => {
        if (!team.logoUrl || team.logoUrl === publicUrl) return true;
        return (await cleanupUnreferencedPublicAssetByUrl(team.logoUrl)).deleted;
      },
      deleteUploadRecord,
      revalidate: () => revalidateTeamAssetPaths(team.id, team.slug),
      rollbackCanonicalTeam: async (activatedTeam) => {
        await replaceCanonicalTeamLogoWithCas(team.id, {
          expectedLogoUrl: publicUrl,
          expectedUpdatedAt: activatedTeam.updatedAt,
          logoUrl: team.logoUrl,
          sourceMetadata: team.sourceMetadata,
        });
      },
      updateCanonicalTeam: () =>
        replaceCanonicalTeamLogoWithCas(team.id, {
          expectedLogoUrl: team.logoUrl,
          expectedUpdatedAt: team.updatedAt,
          logoUrl: publicUrl,
          sourceMetadata: mergeTeamSourceMetadata(team.sourceMetadata, {
            assets: {
              ...currentAssets,
              logo: activationMetadata,
            },
          }),
        }),
      uploadNewObject: async () => {
        await uploadPublicObjectAtKey(objectKey, preparedImage.buffer, preparedImage.decoded.contentType);
      },
      verifyActivatedDelivery: () => verifyDelivery(),
      verifyNewObject: () => verifyDelivery(),
      writeDeliveryFailureAudit: (failure) =>
        writeRequiredAuditLogFromRequest(request, {
          action: "replace_logo_delivery_failed",
          entityId: team.id,
          entityType: "team",
          oldValue: {
            logoUrl: publicUrl,
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
      writeRequiredAudit: (uploadRecordId) =>
        writeRequiredAuditLogFromRequest(request, {
          action: "replace_logo_requested",
          entityId: team.id,
          entityType: "team",
          oldValue: {
            logoUrl: team.logoUrl,
          },
          newValue: {
            activationId,
            logo: activationMetadata,
            uploadRecordId,
          },
        }).then(() => undefined),
    });

    return Response.json({
      success: true,
      cleanupPending: result.cleanupPending,
      id: result.uploadRecordId,
      key: objectKey,
      metadata: logoMetadata,
      path: objectKey,
      team: result.team,
      url: publicUrl,
    });
  } catch (error) {
    await logServerError("admin.teams.logo.replace", error, request);
    return errorResponse(error);
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const invalidOrigin = requireSameOrigin(request);
  if (invalidOrigin) return invalidOrigin;
  const auth = await requirePlatformAdmin(request);
  if (auth.response) return auth.response;
  const limited = await enforceRateLimit(request, {
    key: "admin-team-logo-remove",
    maxRequests: 12,
    windowMs: 60_000,
  });
  if (limited) return limited;

  const { id } = await params;
  if (!isCanonicalTeamId(id)) {
    return Response.json({ success: false, error: "Select a valid official team.", code: "invalid_team_id" }, { status: 400 });
  }

  try {
    const team = await getCanonicalAdminTeam(id);
    if (!team) {
      throw new CanonicalTeamError("The official team could not be found.", { code: "team_not_found", status: 404 });
    }
    if (!team.logoUrl) {
      return Response.json({ success: true, cleanupPending: false, team });
    }

    const currentMetadata = jsonObject(team.sourceMetadata);
    const nextAssets = { ...jsonObject(currentMetadata.assets ?? {}) };
    delete nextAssets.logo;
    const nextMetadata = mergeTeamSourceMetadata(team.sourceMetadata, {
      assets: nextAssets,
    });
    await writeRequiredAuditLogFromRequest(request, {
      action: "remove_logo_requested",
      entityId: team.id,
      entityType: "team",
      oldValue: {
        logoUrl: team.logoUrl,
      },
      newValue: {
        logoUrl: null,
      },
    });
    const updatedTeam = await replaceCanonicalTeamLogoWithCas(team.id, {
      expectedLogoUrl: team.logoUrl,
      expectedUpdatedAt: team.updatedAt,
      logoUrl: null,
      sourceMetadata: nextMetadata,
    });

    let cleanupPending = false;
    try {
      revalidateTeamAssetPaths(team.id, team.slug);
    } catch {
      cleanupPending = true;
    }
    if (!cleanupPending) {
      try {
        cleanupPending = !(await cleanupUnreferencedPublicAssetByUrl(team.logoUrl)).deleted;
      } catch {
        cleanupPending = true;
      }
    }

    return Response.json({ success: true, cleanupPending, team: updatedTeam });
  } catch (error) {
    await logServerError("admin.teams.logo.remove", error, request);
    return errorResponse(error);
  }
}
