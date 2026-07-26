import { getRequestSession, requireAdmin } from "@/lib/admin-auth";
import { writeAuditLogFromRequest } from "@/lib/audit-logs";
import { buildPrivateUploadUrl, deleteFromStorageByUrl, uploadPrivateFile, uploadPublicFile } from "@/lib/r2/storage";
import { enforceRateLimit } from "@/lib/rate-limit";
import { logServerError } from "@/lib/server-monitoring";
import { isPrivateUploadType, normalizeUploadType } from "@/lib/upload-config";
import { createUploadRecord } from "@/lib/upload-records";
import { resolveUploadContentType, validateUpload } from "@/lib/upload-validation";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

export async function POST(request: Request) {
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
    const previousUrl = (formData.get("previousUrl") as string | null) ?? undefined;

    if (!file || !type) {
      return Response.json({ success: false, error: "file and type are required" }, { status: 400 });
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

    const contentType =
      resolveUploadContentType(type, file.name, file.type, {
        audience: "admin",
      }) || "application/octet-stream";
    const buffer = Buffer.from(await file.arrayBuffer());
    const uploadRecordId = randomUUID();

    const uploadResult = isPrivateUploadType(type)
      ? await uploadPrivateFile(type, entityId, file.name, buffer, contentType)
      : await uploadPublicFile(type, entityId, file.name, buffer, contentType);

    const url = uploadResult.visibility === "private" ? buildPrivateUploadUrl(uploadRecordId) : uploadResult.url;

    const record = await createUploadRecord({
      contentType,
      fileName: file.name,
      filePath: uploadResult.path,
      fileType: type,
      fileUrl: url,
      id: uploadRecordId,
      relatedId: entityId,
      relatedType: "admin_upload",
      sizeBytes: file.size,
      uploadedBy: session?.profileId ?? null,
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
        path: uploadResult.path,
        visibility: uploadResult.visibility,
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
    await logServerError("admin.upload.r2", error, request);
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}
