import { requireAuthenticatedUser } from "@/lib/admin-auth";
import { writeRequiredAuditLogFromRequest } from "@/lib/audit-logs";
import { hasTeamWorkspaceAccess } from "@/lib/authz";
import { prepareCanonicalPublicImageUpload, type CanonicalImageAssetMetadata } from "@/lib/canonical-image-upload";
import { ImageDecodeError } from "@/lib/image-validation";
import {
  buildPrivateUploadUrl,
  deletePrivateObjectByKey,
  deletePublicObjectByKey,
  getPublicObject,
  isR2ObjectMissingError,
  normalizeManagedPublicObjectKey,
  readObjectBodyAsBuffer,
  uploadPrivateFile,
  uploadPublicObjectAtKey,
  verifyPublicObjectDelivery,
} from "@/lib/r2/storage";
import { enforceRateLimit } from "@/lib/rate-limit";
import { requireSameOrigin } from "@/lib/request-origin";
import { logServerError } from "@/lib/server-monitoring";
import { isImageUploadType, isPrivateUploadType, normalizeUploadType, type UploadType } from "@/lib/upload-config";
import { createUploadRecord, deleteUploadRecord } from "@/lib/upload-records";
import { resolveUploadContentType, validateUpload } from "@/lib/upload-validation";
import { toUserFacingErrorMessage, USER_FACING_ERROR_MESSAGES } from "@/lib/user-facing-errors";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

const TEAM_UPLOAD_TYPES = new Set<UploadType>(["team_logo", "moss_file"]);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const objectKey = normalizeManagedPublicObjectKey(searchParams.get("key") ?? "");

    if (!objectKey) {
      return Response.json({ error: "Public upload not found." }, { status: 404 });
    }

    const object = await getPublicObject(objectKey);
    const body = await readObjectBodyAsBuffer(object.Body);

    if (!body) {
      return Response.json({ error: "Public upload not found." }, { status: 404, headers: { "Cache-Control": "public, max-age=60" } });
    }

    const headers = new Headers();
    headers.set("Cache-Control", object.CacheControl ?? "public, max-age=31536000, immutable");
    headers.set("Content-Type", object.ContentType ?? "application/octet-stream");

    headers.set("Content-Length", String(body.byteLength));

    return new Response(new Uint8Array(body), { headers });
  } catch (error: unknown) {
    if (isR2ObjectMissingError(error)) {
      return Response.json({ error: "Public upload not found." }, { status: 404, headers: { "Cache-Control": "public, max-age=60" } });
    }

    await logServerError("uploads.r2.public.get", error, request);
    return Response.json(
      {
        error: toUserFacingErrorMessage(error, {
          status: 500,
          fallback: "We couldn't load that public upload right now. Please try again shortly.",
        }),
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const invalidOrigin = requireSameOrigin(request);
  if (invalidOrigin) return invalidOrigin;
  const limited = await enforceRateLimit(request, {
    key: "shared-upload-r2",
    maxRequests: 20,
    windowMs: 60_000,
  });
  if (limited) return limited;

  const auth = await requireAuthenticatedUser(request);
  if (auth.response || !auth.session) {
    return auth.response ?? Response.json({ success: false, error: USER_FACING_ERROR_MESSAGES.session }, { status: 401 });
  }

  const canUseTeamScope = hasTeamWorkspaceAccess(auth.session.role, auth.session.isAdmin);
  if (!auth.session.isAdmin && !canUseTeamScope) {
    return Response.json({ success: false, error: USER_FACING_ERROR_MESSAGES.permission }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const type = normalizeUploadType(formData.get("type") as string | null);
    const requestedEntityId = (formData.get("entityId") as string | null)?.trim() || "general";

    if (!file || !type) {
      return Response.json({ success: false, error: "file and type are required" }, { status: 400 });
    }

    if (!auth.session.isAdmin) {
      if (!auth.session.teamId) {
        return Response.json(
          {
            success: false,
            error: "This account is not linked to a team yet.",
          },
          { status: 403 },
        );
      }

      if (!TEAM_UPLOAD_TYPES.has(type)) {
        const error =
          type === "player_avatar" || type === "player_photo"
            ? "Use the roster-scoped player image upload route for player images."
            : "Unsupported team upload type.";
        return Response.json({ success: false, error }, { status: 400 });
      }
    }

    if (type === "team_logo") {
      return Response.json(
        {
          success: false,
          error: auth.session.isAdmin
            ? "Use the official team logo uploader after selecting a canonical team."
            : "Use the team workspace logo uploader so the official team record is updated safely.",
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

    const audience = auth.session.isAdmin ? "admin" : "team";
    const validationError = validateUpload({
      audience,
      contentType: file.type,
      fileName: file.name,
      size: file.size,
      type,
    });

    if (validationError) {
      return Response.json({ success: false, error: validationError }, { status: 400 });
    }

    const entityId = auth.session.isAdmin ? requestedEntityId : auth.session.teamId!;
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
        contentType = resolveUploadContentType(type, file.name, file.type, { audience }) || "application/octet-stream";
        const uploadResult = await uploadPrivateFile(type, entityId, file.name, buffer, contentType);
        path = uploadResult.path;
        privateObjectKey = path;
        url = buildPrivateUploadUrl(uploadRecordId);
        visibility = "private";
      }

      const record = await createUploadRecord({
        id: uploadRecordId,
        fileUrl: url,
        filePath: path,
        fileType: type,
        relatedType: auth.session.isAdmin ? "shared_upload" : type === "moss_file" ? "moss_submission" : "team_asset",
        relatedId: entityId,
        uploadedBy: auth.session.profileId,
        fileName: file.name,
        contentType,
        sizeBytes: buffer.byteLength,
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
          key: path,
          visibility,
          scopedAs: auth.session.isAdmin ? "admin" : "team",
          teamId: auth.session.teamId,
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
    await logServerError("uploads.r2", error, request);
    if (error instanceof ImageDecodeError) {
      return Response.json({ success: false, error: error.message, code: "invalid_image_signature" }, { status: 400 });
    }
    return Response.json(
      {
        success: false,
        error: toUserFacingErrorMessage(error, {
          status: 500,
          fallback: "We couldn't upload that file right now. Please try again shortly.",
        }),
      },
      { status: 500 },
    );
  }
}
