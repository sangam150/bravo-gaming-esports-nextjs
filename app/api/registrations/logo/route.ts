import { prepareCanonicalImage } from "@/lib/canonical-image-upload";
import { ImageDecodeError } from "@/lib/image-validation";
import { buildPrivateUploadUrl, deletePrivateObjectByKey, uploadPrivateFile } from "@/lib/r2/storage";
import { enforceRateLimit } from "@/lib/rate-limit";
import { requireSameOrigin } from "@/lib/request-origin";
import { logServerError } from "@/lib/server-monitoring";
import { createUploadRecord } from "@/lib/upload-records";
import { validateUpload } from "@/lib/upload-validation";
import { jsonErrorResponse, USER_FACING_ERROR_MESSAGES } from "@/lib/user-facing-errors";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const invalidOrigin = requireSameOrigin(request);
  if (invalidOrigin) return invalidOrigin;
  const limited = await enforceRateLimit(request, {
    key: "team-registration-logo-upload",
    maxRequests: 8,
    windowMs: 60_000,
  });
  if (limited) return limited;

  let pendingObjectKey: string | null = null;
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const teamName = (formData.get("teamName") as string | null)?.trim() || "registration";

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

    const buffer = Buffer.from(await file.arrayBuffer());
    const preparedImage = await prepareCanonicalImage({
      altText: `${teamName} logo`,
      buffer,
      declaredContentType: file.type,
      fileName: file.name,
    });
    const uploadRecordId = randomUUID();
    const candidateFileName = `logo-${preparedImage.metadata.version}.${preparedImage.decoded.extension}`;
    const uploadResult = await uploadPrivateFile(
      "team_logo_pending",
      teamName,
      candidateFileName,
      buffer,
      preparedImage.decoded.contentType,
    );
    pendingObjectKey = uploadResult.path;
    const privateUrl = buildPrivateUploadUrl(uploadRecordId);
    const metadata = {
      ...preparedImage.metadata,
      objectKey: uploadResult.path,
      privateUrl,
      status: "pending_registration",
    } as const;
    const record = await createUploadRecord({
      fileUrl: privateUrl,
      filePath: uploadResult.path,
      fileType: "team_logo_pending",
      id: uploadRecordId,
      relatedType: "team_registration",
      relatedId: null,
      fileName: candidateFileName,
      contentType: preparedImage.decoded.contentType,
      sizeBytes: preparedImage.decoded.sizeBytes,
      uploadedBy: null,
    });

    return Response.json({
      success: true,
      id: record.id,
      metadata,
      path: uploadResult.path,
      url: privateUrl,
    });
  } catch (error: unknown) {
    if (pendingObjectKey) {
      await deletePrivateObjectByKey(pendingObjectKey).catch(() => undefined);
    }
    await logServerError("registrations.logo.upload", error, request);
    if (error instanceof ImageDecodeError) {
      return Response.json({ success: false, error: error.message, code: "invalid_image_signature" }, { status: 400 });
    }
    return jsonErrorResponse(error, {
      status: 500,
      fallback: USER_FACING_ERROR_MESSAGES.registration,
    });
  }
}
