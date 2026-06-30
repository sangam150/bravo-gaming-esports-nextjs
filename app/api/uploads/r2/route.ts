import { randomUUID } from "crypto";
import { hasTeamWorkspaceAccess } from "@/lib/authz";
import { requireAuthenticatedUser } from "@/lib/admin-auth";
import { writeAuditLogFromRequest } from "@/lib/audit-logs";
import { enforceRateLimit } from "@/lib/rate-limit";
import {
  buildPrivateUploadUrl,
  deleteFromStorageByUrl,
  getPublicObject,
  isR2ObjectMissingError,
  normalizeManagedPublicObjectKey,
  toReadableStream,
  uploadPrivateFile,
  uploadPublicFile,
} from "@/lib/r2/storage";
import { logServerError } from "@/lib/server-monitoring";
import { createUploadRecord } from "@/lib/upload-records";
import { isPrivateUploadType, normalizeUploadType, type UploadType } from "@/lib/upload-config";
import { resolveUploadContentType, validateUpload } from "@/lib/upload-validation";
import { toUserFacingErrorMessage, USER_FACING_ERROR_MESSAGES } from "@/lib/user-facing-errors";

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
    const stream = toReadableStream(object.Body);

    if (!stream) {
      return Response.json({ error: "Public upload not found." }, { status: 404 });
    }

    const headers = new Headers();
    headers.set("Cache-Control", object.CacheControl ?? "public, max-age=31536000, immutable");
    headers.set("Content-Type", object.ContentType ?? "application/octet-stream");

    if (typeof object.ContentLength === "number") {
      headers.set("Content-Length", String(object.ContentLength));
    }

    return new Response(stream as unknown as BodyInit, { headers });
  } catch (error: unknown) {
    if (isR2ObjectMissingError(error)) {
      return Response.json({ error: "Public upload not found." }, { status: 404 });
    }

    await logServerError("uploads.r2.public.get", error, request);
    return Response.json(
      {
        error: toUserFacingErrorMessage(error, {
          status: 500,
          fallback: "We couldn't load that public upload right now. Please try again shortly.",
        }),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const limited = enforceRateLimit(request, { key: "shared-upload-r2", maxRequests: 20, windowMs: 60_000 });
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
    const previousUrl = (formData.get("previousUrl") as string | null) ?? undefined;
    const requestedEntityId = (formData.get("entityId") as string | null)?.trim() || "general";

    if (!file || !type) {
      return Response.json({ success: false, error: "file and type are required" }, { status: 400 });
    }

    if (!auth.session.isAdmin) {
      if (!auth.session.teamId) {
        return Response.json({ success: false, error: "This account is not linked to a team yet." }, { status: 403 });
      }

      if (!TEAM_UPLOAD_TYPES.has(type)) {
        const error =
          type === "player_avatar" || type === "player_photo"
            ? "Use the roster-scoped player image upload route for player images."
            : "Unsupported team upload type.";
        return Response.json({ success: false, error }, { status: 400 });
      }
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
    const contentType = resolveUploadContentType(type, file.name, file.type, { audience }) || "application/octet-stream";
    const buffer = Buffer.from(await file.arrayBuffer());
    const uploadRecordId = randomUUID();
    const uploadResult = isPrivateUploadType(type)
      ? await uploadPrivateFile(type, entityId, file.name, buffer, contentType)
      : await uploadPublicFile(type, entityId, file.name, buffer, contentType);
    const url =
      uploadResult.visibility === "private" ? buildPrivateUploadUrl(uploadRecordId) : uploadResult.url;

    const record = await createUploadRecord({
      id: uploadRecordId,
      fileUrl: url,
      filePath: uploadResult.path,
      fileType: type,
      relatedType: auth.session.isAdmin ? "shared_upload" : type === "moss_file" ? "moss_submission" : "team_asset",
      relatedId: entityId,
      uploadedBy: auth.session.profileId,
      fileName: file.name,
      contentType,
      sizeBytes: file.size,
    });

    if (previousUrl && previousUrl !== url) {
      await deleteFromStorageByUrl(previousUrl).catch(() => undefined);
    }

    await writeAuditLogFromRequest(request, {
      action: "upload",
      entityId: record.id,
      entityType: "upload",
      newValue: {
        fileType: type,
        fileUrl: url,
        key: uploadResult.path,
        visibility: uploadResult.visibility,
        scopedAs: auth.session.isAdmin ? "admin" : "team",
        teamId: auth.session.teamId,
      },
    });

    return Response.json({
      success: true,
      id: record.id,
      key: uploadResult.path,
      path: uploadResult.path,
      url,
    });
  } catch (error: unknown) {
    await logServerError("uploads.r2", error, request);
    return Response.json(
      {
        success: false,
        error: toUserFacingErrorMessage(error, {
          status: 500,
          fallback: "We couldn't upload that file right now. Please try again shortly.",
        }),
      },
      { status: 500 }
    );
  }
}
