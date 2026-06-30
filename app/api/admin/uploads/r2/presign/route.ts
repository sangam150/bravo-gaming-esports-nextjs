import { requireAdmin } from "@/lib/admin-auth";
import { writeAuditLogFromRequest } from "@/lib/audit-logs";
import { createPresignedPublicUpload } from "@/lib/r2/storage";
import { enforceRateLimit } from "@/lib/rate-limit";
import { logServerError } from "@/lib/server-monitoring";
import { getUploadFolder, isPrivateUploadType, normalizeUploadFolder, normalizeUploadType } from "@/lib/upload-config";
import { resolveUploadContentType, validateUpload } from "@/lib/upload-validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  const limited = enforceRateLimit(request, { key: "admin-upload-r2-presign", maxRequests: 30, windowMs: 60_000 });
  if (limited) return limited;

  try {
    const body = (await request.json()) as {
      contentType?: string;
      entityId?: string;
      fileName?: string;
      folder?: string;
      size?: number;
      type?: string;
    };

    const type = normalizeUploadType(body.type ?? null);
    const entityId = typeof body.entityId === "string" && body.entityId.trim() ? body.entityId : "general";
    const fileName = typeof body.fileName === "string" ? body.fileName.trim() : "";
    const contentType = typeof body.contentType === "string" ? body.contentType.trim() : "";
    const folder = normalizeUploadFolder(body.folder ?? null);
    const size = typeof body.size === "number" ? body.size : Number(body.size);

    if (!type || !fileName || !contentType || !Number.isFinite(size)) {
      return Response.json({ success: false, error: "type, fileName, contentType, and size are required" }, { status: 400 });
    }

    if (isPrivateUploadType(type)) {
      return Response.json({ success: false, error: "Private uploads must go through the authenticated server upload route." }, { status: 400 });
    }

    const expectedFolder = getUploadFolder(type);
    if (folder && folder !== expectedFolder) {
      return Response.json({ success: false, error: "Upload folder does not match the selected upload type." }, { status: 400 });
    }

    const validationError = validateUpload({
      audience: "admin",
      contentType,
      fileName,
      size,
      type,
    });

    if (validationError) {
      return Response.json({ success: false, error: validationError }, { status: 400 });
    }

    const resolvedContentType =
      resolveUploadContentType(type, fileName, contentType, { audience: "admin" }) || "application/octet-stream";
    const presignedUpload = await createPresignedPublicUpload(type, entityId, fileName, resolvedContentType);

    await writeAuditLogFromRequest(request, {
      action: "presign_upload",
      entityType: "upload",
      newValue: {
        entityId,
        expiresAt: presignedUpload.expiresAt,
        fileName,
        fileType: type,
        folder: expectedFolder,
        path: presignedUpload.path,
      },
    });

    return Response.json({ success: true, ...presignedUpload, key: presignedUpload.path, folder: expectedFolder });
  } catch (error: unknown) {
    await logServerError("admin.upload.r2.presign", error, request);
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}
