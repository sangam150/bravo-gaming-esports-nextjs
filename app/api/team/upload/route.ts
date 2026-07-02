import { randomUUID } from "crypto";
import { requireTeamWorkspaceUser } from "@/lib/admin-auth";
import { writeAuditLogFromRequest } from "@/lib/audit-logs";
import { enforceRateLimit } from "@/lib/rate-limit";
import { buildPrivateUploadUrl, deleteFromStorageByUrl, uploadPrivateFile, uploadPublicFile } from "@/lib/r2/storage";
import { logServerError } from "@/lib/server-monitoring";
import { createUploadRecord } from "@/lib/upload-records";
import { normalizeUploadType, type UploadType } from "@/lib/upload-config";
import { resolveUploadContentType, validateUpload } from "@/lib/upload-validation";
import {
  USER_FACING_ERROR_MESSAGES,
  toUserFacingErrorMessage,
} from "@/lib/user-facing-errors";

export const runtime = "nodejs";

const TEAM_UPLOAD_TYPES = new Set<UploadType>(["team_logo", "moss_file"]);

export async function POST(request: Request) {
  const limited = await enforceRateLimit(request, { key: "team-upload", maxRequests: 12, windowMs: 60_000 });
  if (limited) return limited;

  const auth = await requireTeamWorkspaceUser(request);
  if (auth.response || !auth.session) {
    return auth.response ??
      Response.json({ error: USER_FACING_ERROR_MESSAGES.session }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const type = normalizeUploadType(formData.get("type") as string | null);
    const previousUrl = (formData.get("previousUrl") as string | null) ?? undefined;

    if (!file || !type) {
      return Response.json({ success: false, error: "Please choose a file and upload type before continuing." }, { status: 400 });
    }

    if (!TEAM_UPLOAD_TYPES.has(type)) {
      return Response.json({ success: false, error: "Unsupported team upload type." }, { status: 400 });
    }

    const validationError = validateUpload({
      audience: "team",
      contentType: file.type,
      fileName: file.name,
      size: file.size,
      type,
    });

    if (validationError) {
      return Response.json({ success: false, error: validationError }, { status: 400 });
    }

    const contentType =
      resolveUploadContentType(type, file.name, file.type, { audience: "team" }) || "application/octet-stream";
    const buffer = Buffer.from(await file.arrayBuffer());
    const uploadRecordId = randomUUID();
    const uploadResult =
      type === "moss_file"
        ? await uploadPrivateFile(type, auth.session.teamId, file.name, buffer, contentType)
        : await uploadPublicFile(type, auth.session.teamId, file.name, buffer, contentType);
    const url =
      uploadResult.visibility === "private" ? buildPrivateUploadUrl(uploadRecordId) : uploadResult.url;

    const record = await createUploadRecord({
      fileUrl: url,
      filePath: uploadResult.path,
      fileType: type,
      id: uploadRecordId,
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

    await writeAuditLogFromRequest(request, {
      action: "upload",
      entityId: record.id,
      entityType: "team_upload",
      newValue: {
        fileType: type,
        fileUrl: url,
        path: uploadResult.path,
        teamId: auth.session.teamId,
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
    await logServerError("team.upload", error, request);
    return Response.json(
      {
        success: false,
        error: toUserFacingErrorMessage(error, {
          status: 500,
          fallback: "We couldn't upload that team file right now. Please try again shortly.",
        }),
      },
      { status: 500 }
    );
  }
}

