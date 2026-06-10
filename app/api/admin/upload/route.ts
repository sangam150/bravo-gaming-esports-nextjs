import { requireAdmin } from "@/lib/admin-auth";
import { COLLECTIONS, createFirestoreDocument } from "@/lib/firebase";
import { buildStoragePath, deleteFromStorageByUrl, uploadToStorage } from "@/lib/firebase-storage";
import { enforceRateLimit } from "@/lib/rate-limit";
import { logServerError } from "@/lib/server-monitoring";
import { normalizeUploadType, resolveImageContentType, validateImageUpload } from "@/lib/upload-config";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  const limited = enforceRateLimit(request, { key: "admin-upload", maxRequests: 20, windowMs: 60_000 });
  if (limited) return limited;

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const type = normalizeUploadType(formData.get("type") as string | null);
    const entityId = (formData.get("entityId") as string) || "general";
    const previousUrl = (formData.get("previousUrl") as string | null) ?? undefined;

    if (!file || !type) {
      return Response.json({ error: "file and type are required" }, { status: 400 });
    }

    const validationError = validateImageUpload({
      type,
      fileName: file.name,
      contentType: file.type,
      size: file.size,
    });

    if (validationError) {
      return Response.json({ error: validationError }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const contentType = resolveImageContentType(file.name, file.type) || "application/octet-stream";
    const path = buildStoragePath(type, entityId, file.name);
    const url = await uploadToStorage(buffer, path, contentType);

    const record = await createFirestoreDocument(COLLECTIONS.uploads, {
      path,
      url,
      type,
      entityId,
      fileName: file.name,
      contentType,
      sizeBytes: file.size,
      uploadedAt: new Date().toISOString(),
    });

    if (previousUrl && previousUrl !== url) {
      await deleteFromStorageByUrl(previousUrl).catch(() => undefined);
    }

    return Response.json({ success: true, url, path, id: record.id });
  } catch (error: unknown) {
    await logServerError("admin.upload", error, request);
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 500 });
  }
}
