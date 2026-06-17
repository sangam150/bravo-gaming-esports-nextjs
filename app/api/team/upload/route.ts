import { requireAuthenticatedUser } from "@/lib/admin-auth";
import { enforceRateLimit } from "@/lib/rate-limit";
import { logServerError } from "@/lib/server-monitoring";
import { buildStoragePath, deleteFromStorageByUrl, uploadToStorage } from "@/lib/supabase-storage";
import { createUploadRecord } from "@/lib/upload-records";
import { normalizeUploadType, resolveUploadContentType, validateUpload } from "@/lib/upload-config";

export const runtime = "nodejs";

const TEAM_UPLOAD_TYPES = new Set(["team_logo", "moss_file"]);

export async function POST(request: Request) {
  const limited = enforceRateLimit(request, { key: "team-upload", maxRequests: 12, windowMs: 60_000 });
  if (limited) return limited;

  const auth = await requireAuthenticatedUser(request);
  if (auth.response || !auth.session) {
    return auth.response ?? Response.json({ error: "Unauthorized. Login required." }, { status: 401 });
  }

  if (!(auth.session.isAdmin || auth.session.role === "team_igl")) {
    return Response.json({ error: "Only admins and team IGL users can upload team assets." }, { status: 403 });
  }

  if (!auth.session.teamId) {
    return Response.json({ error: "This account is not linked to a team yet." }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const type = normalizeUploadType(formData.get("type") as string | null);
    const previousUrl = (formData.get("previousUrl") as string | null) ?? undefined;

    if (!file || !type) {
      return Response.json({ error: "file and type are required" }, { status: 400 });
    }

    if (!TEAM_UPLOAD_TYPES.has(type)) {
      return Response.json({ error: "Unsupported team upload type." }, { status: 400 });
    }

    const validationError = validateUpload({
      type,
      fileName: file.name,
      contentType: file.type,
      size: file.size,
    });

    if (validationError) {
      return Response.json({ error: validationError }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const contentType = resolveUploadContentType(type, file.name, file.type) || "application/octet-stream";
    const { bucket, path } = buildStoragePath(type, auth.session.teamId, file.name);
    const url = await uploadToStorage(bucket, path, buffer, contentType);

    const record = await createUploadRecord({
      fileUrl: url,
      filePath: path,
      fileType: type,
      relatedType: type === "moss_file" ? "moss_submission" : "team_asset",
      relatedId: auth.session.teamId,
      uploadedBy: auth.session.profileId,
      fileName: file.name,
      contentType,
      sizeBytes: file.size,
    });

    if (previousUrl && previousUrl !== url && type === "team_logo") {
      await deleteFromStorageByUrl(previousUrl).catch(() => undefined);
    }

    return Response.json({ success: true, url, path, id: record.id });
  } catch (error: unknown) {
    await logServerError("team.upload", error, request);
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 500 });
  }
}
