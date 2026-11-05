import { getRequestSession, requireAdmin } from "@/lib/admin-auth";
import { writeRequiredAuditLogFromRequest } from "@/lib/audit-logs";
import { prepareCanonicalPublicImageUpload, type CanonicalImageAssetMetadata } from "@/lib/canonical-image-upload";
import { ImageDecodeError } from "@/lib/image-validation";
import {
  buildPrivateUploadUrl,
  deletePrivateObjectByKey,
  deletePublicObjectByKey,
  uploadPrivateFile,
  uploadPublicObjectAtKey,
  verifyPublicObjectDelivery,
} from "@/lib/r2/storage";
import { enforceRateLimit } from "@/lib/rate-limit";
import { requireSameOrigin } from "@/lib/request-origin";
import { logServerError } from "@/lib/server-monitoring";
import { cleanupOneAbandonedAdminUpload, cleanupStagedAdminUpload, ManagedAssetCleanupError } from "@/lib/public-asset-cleanup";
import { isImageUploadType, isPrivateUploadType, normalizeUploadType } from "@/lib/upload-config";
import { createUploadRecord, deleteUploadRecord } from "@/lib/upload-records";
import { resolveUploadContentType, validateUpload } from "@/lib/upload-validation";
import { toUserFacingErrorMessage } from "@/lib/user-facing-errors";
import { randomUUID } from "crypto";
import { after } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const invalidOrigin = requireSameOrigin(request);
  if (invalidOrigin) return invalidOrigin;
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  const session = await getRequestSession(request);
  const limited = await enforceRateLimit(request, {
    key: "admin-upload-r2",
    maxRequests: 20,
    windowMs: 60_000,
  });
  if (limited) return limited;

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const type = normalizeUploadType(formData.get("type") as string | null);
    const entityId = (formData.get("entityId") as string) || "general";

    if (!file || !type) {
      return Response.json({ success: false, error: "file and type are required" }, { status: 400 });
    }
    if (type === "team_logo") {
      return Response.json(
        {
          success: false,
          error: "Use the official team logo uploader after the team has been created.",
          code: "canonical_team_logo_route_required",
        },
        { status: 400 },
      );
    }
    if (type === "team_logo_pending") {
      return Response.json(
        {
          success: false,
          error: "Pending registration logos must use the protected registration upload route.",
          code: "registration_logo_route_required",
        },
        { status: 400 },
      );
    }

    const validationError = validateUpload({
      audience: "admin",
      contentType: file.type,
      fileName: file.name,
      size: file.size,
      type,
    });

    if (validationError) {
      return Response.json({ success: false, error: validationError }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const uploadRecordId = randomUUID();
    let contentType: string;
    let imageMetadata: CanonicalImageAssetMetadata | null = null;
    let path: string;
    let persistedUploadRecordId: string | null = null;
    let privateObjectKey: string | null = null;
    let publicObjectKey: string | null = null;
    let url: string;
    let visibility: "private" | "public";
    let storedSizeBytes = buffer.byteLength;

    try {
      if (isImageUploadType(type) && !isPrivateUploadType(type)) {
        const preparedImage = await prepareCanonicalPublicImageUpload({
          buffer,
          declaredContentType: file.type,
          entityId,
          fileName: file.name,
          type,
        });
        contentType = preparedImage.decoded.contentType;
        imageMetadata = preparedImage.metadata;
        path = preparedImage.objectKey;
        publicObjectKey = path;
        url = preparedImage.publicUrl;
        visibility = "public";
        storedSizeBytes = preparedImage.buffer.byteLength;
        await uploadPublicObjectAtKey(path, preparedImage.buffer, contentType);
        await verifyPublicObjectDelivery(path, {
          contentType,
          deliveryOrigin: new URL(request.url).origin,
          sizeBytes: preparedImage.decoded.sizeBytes,
        });
      } else {
        contentType =
          resolveUploadContentType(type, file.name, file.type, {
            audience: "admin",
          }) || "application/octet-stream";
        const uploadResult = await uploadPrivateFile(type, entityId, file.name, buffer, contentType);
        path = uploadResult.path;
        privateObjectKey = path;
        url = buildPrivateUploadUrl(uploadRecordId);
        visibility = "private";
      }

      const record = await createUploadRecord({
        contentType,
        fileName: file.name,
        filePath: path,
        fileType: type,
        fileUrl: url,
        id: uploadRecordId,
        relatedId: entityId,
        relatedType: "admin_upload",
        sizeBytes: storedSizeBytes,
        uploadedBy: session?.profileId ?? null,
      });
      persistedUploadRecordId = record.id;

      await writeRequiredAuditLogFromRequest(request, {
        action: "upload",
        entityId: record.id,
        entityType: "upload",
        newValue: {
          asset: imageMetadata,
          fileType: type,
          fileUrl: url,
          path,
          visibility,
        },
      });
      after(async () => {
        try {
          await cleanupOneAbandonedAdminUpload(record.id);
        } catch (cleanupError) {
          await logServerError("admin.upload.r2.abandoned_cleanup", cleanupError, request);
        }
      });

      return Response.json({
        success: true,
        id: record.id,
        key: path,
        metadata: imageMetadata,
        path,
        url,
      });
    } catch (error) {
      let objectDeleted = !publicObjectKey && !privateObjectKey;
      if (publicObjectKey) {
        try {
          await deletePublicObjectByKey(publicObjectKey);
          objectDeleted = true;
        } catch {
          objectDeleted = false;
        }
      }
      if (privateObjectKey) {
        try {
          await deletePrivateObjectByKey(privateObjectKey);
          objectDeleted = true;
        } catch {
          objectDeleted = false;
        }
      }
      if (persistedUploadRecordId && objectDeleted) {
        await deleteUploadRecord(persistedUploadRecordId).catch(() => undefined);
      }
      throw error;
    }
  } catch (error: unknown) {
    await logServerError("admin.upload.r2", error, request);
    if (error instanceof ImageDecodeError) {
      return Response.json({ success: false, error: error.message, code: "invalid_image_signature" }, { status: 400 });
    }
    return Response.json(
      {
        success: false,
        error: toUserFacingErrorMessage(error, {
          status: 500,
          fallback: "We couldn't upload that image right now. Please try again shortly.",
        }),
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  const invalidOrigin = requireSameOrigin(request);
  if (invalidOrigin) return invalidOrigin;
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;
  const limited = await enforceRateLimit(request, {
    key: "admin-upload-r2-cleanup",
    maxRequests: 30,
    windowMs: 60_000,
  });
  if (limited) return limited;

  try {
    const body = (await request.json().catch(() => null)) as {
      objectKey?: unknown;
      uploadId?: unknown;
    } | null;
    const objectKey = typeof body?.objectKey === "string" ? body.objectKey.trim() : "";
    const uploadId = typeof body?.uploadId === "string" ? body.uploadId.trim() : "";
    const result = await cleanupStagedAdminUpload({ objectKey, uploadId });

    await writeRequiredAuditLogFromRequest(request, {
      action: result.deleted ? "staged_upload_deleted" : "staged_upload_cleanup_skipped",
      entityId: uploadId,
      entityType: "upload",
      oldValue: {
        objectKey,
      },
      newValue: {
        deleted: result.deleted,
        referenced: result.referenced,
      },
    });

    return Response.json({
      success: true,
      deleted: result.deleted,
      referenced: result.referenced,
    });
  } catch (error: unknown) {
    await logServerError("admin.upload.r2.cleanup", error, request);
    if (error instanceof ManagedAssetCleanupError) {
      return Response.json({ success: false, code: error.code, error: error.message }, { status: error.status });
    }
    return Response.json(
      {
        success: false,
        code: "staged_upload_cleanup_failed",
        error: "The staged upload was preserved because safe cleanup could not be confirmed.",
      },
      { status: 500 },
    );
  }
}
