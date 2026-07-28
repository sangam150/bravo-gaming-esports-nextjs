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
import { isImageUploadType, isPrivateUploadType, normalizeUploadType } from "@/lib/upload-config";
import { createUploadRecord, deleteUploadRecord } from "@/lib/upload-records";
import { resolveUploadContentType, validateUpload } from "@/lib/upload-validation";
import { toUserFacingErrorMessage } from "@/lib/user-facing-errors";
import { randomUUID } from "crypto";

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
        await uploadPublicObjectAtKey(path, buffer, contentType);
        await verifyPublicObjectDelivery(path, {
          contentType,
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
        sizeBytes: buffer.byteLength,
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

      return Response.json({
        success: true,
        id: record.id,
        key: path,
        metadata: imageMetadata,
        path,
        url,
      });
    } catch (error) {
      if (persistedUploadRecordId) {
        await deleteUploadRecord(persistedUploadRecordId).catch(() => undefined);
      }
      if (publicObjectKey) {
        await deletePublicObjectByKey(publicObjectKey).catch(() => undefined);
      }
      if (privateObjectKey) {
        await deletePrivateObjectByKey(privateObjectKey).catch(() => undefined);
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
