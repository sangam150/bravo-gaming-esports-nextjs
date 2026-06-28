import { randomUUID } from "crypto";
import { buildPrivateUploadUrl, deleteFromStorageByUrl, uploadPrivateFile } from "@/lib/r2/storage";
import { createUploadRecord } from "@/lib/upload-records";
import { enforceRateLimit } from "@/lib/rate-limit";
import { logServerError } from "@/lib/server-monitoring";
import { resolveUploadContentType, validateUpload } from "@/lib/upload-validation";
import {
  jsonErrorResponse,
  USER_FACING_ERROR_MESSAGES,
} from "@/lib/user-facing-errors";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const limited = enforceRateLimit(request, { key: "team-registration-logo-upload", maxRequests: 8, windowMs: 60_000 });
  if (limited) return limited;

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const teamName = (formData.get("teamName") as string | null)?.trim() || "registration";
    const previousUrl = (formData.get("previousUrl") as string | null) ?? undefined;

    if (!file) {
      return Response.json({ error: "Choose a team logo before uploading." }, { status: 400 });
    }

    const validationError = validateUpload({
      audience: "team",
      contentType: file.type,
      fileName: file.name,
      size: file.size,
      type: "team_logo",
    });

    if (validationError) {
      return Response.json({ error: validationError }, { status: 400 });
    }

    const contentType =
      resolveUploadContentType("team_logo", file.name, file.type, { audience: "team" }) ||
      "application/octet-stream";
    const buffer = Buffer.from(await file.arrayBuffer());
    const uploadRecordId = randomUUID();
    const uploadResult = await uploadPrivateFile("team_logo_pending", teamName, file.name, buffer, contentType);
    const privateUrl = buildPrivateUploadUrl(uploadRecordId);
    const record = await createUploadRecord({
      fileUrl: privateUrl,
      filePath: uploadResult.path,
      fileType: "team_logo_pending",
      id: uploadRecordId,
      relatedType: "team_registration",
      relatedId: null,
      fileName: file.name,
      contentType,
      sizeBytes: file.size,
      uploadedBy: null,
    });

    if (previousUrl && previousUrl !== privateUrl) {
      await deleteFromStorageByUrl(previousUrl).catch(() => undefined);
    }

    return Response.json({
      success: true,
      id: record.id,
      path: uploadResult.path,
      url: privateUrl,
    });
  } catch (error: unknown) {
    await logServerError("registrations.logo.upload", error, request);
    return jsonErrorResponse(error, {
      status: 500,
      fallback: USER_FACING_ERROR_MESSAGES.registration,
    });
  }
}
