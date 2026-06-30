import { requireAuthenticatedUser } from "@/lib/admin-auth";
import { hasTeamWorkspaceAccess } from "@/lib/authz";
import { getManagedUploadRecord, getPrivateObject, isR2ObjectMissingError, toReadableStream } from "@/lib/r2/storage";
import { logServerError } from "@/lib/server-monitoring";
import { getUploadVisibility, normalizeUploadType } from "@/lib/upload-config";
import { jsonErrorResponse } from "@/lib/user-facing-errors";

type RouteContext = {
  params: Promise<{ uploadId: string }>;
};

export const runtime = "nodejs";

function sanitizeFileName(fileName: string) {
  return fileName.replace(/["\\\r\n]/g, "_");
}

export async function GET(request: Request, { params }: RouteContext) {
  const auth = await requireAuthenticatedUser(request);
  if (auth.response || !auth.session) {
    return auth.response ?? Response.json({ error: "Unauthorized. Login required." }, { status: 401 });
  }

  try {
    const { uploadId } = await params;
    const uploadRecord = await getManagedUploadRecord(uploadId);

    if (!uploadRecord?.filePath) {
      return Response.json({ error: "Upload not found." }, { status: 404 });
    }

    const uploadType = normalizeUploadType(uploadRecord.fileType);
    if (!uploadType || getUploadVisibility(uploadType) !== "private") {
      return Response.json({ error: "Upload not found." }, { status: 404 });
    }

    const canAccessAsAdmin = auth.session.isAdmin;
    const canAccessAsTeamUser =
      hasTeamWorkspaceAccess(auth.session.role, auth.session.isAdmin) &&
      Boolean(auth.session.teamId) &&
      auth.session.teamId === uploadRecord.relatedId;

    if (!canAccessAsAdmin && !canAccessAsTeamUser) {
      return Response.json({ error: "Access denied." }, { status: 403 });
    }

    const object = await getPrivateObject(uploadRecord.filePath);
    const stream = toReadableStream(object.Body);

    if (!stream) {
      return Response.json({ error: "Upload not found." }, { status: 404 });
    }

    const headers = new Headers();
    headers.set("Cache-Control", "private, no-store");
    headers.set("Content-Type", object.ContentType ?? uploadRecord.contentType ?? "application/octet-stream");

    if (typeof object.ContentLength === "number") {
      headers.set("Content-Length", String(object.ContentLength));
    }

    if (uploadRecord.fileName) {
      headers.set("Content-Disposition", `inline; filename="${sanitizeFileName(uploadRecord.fileName)}"`);
    }

    return new Response(stream as unknown as BodyInit, { headers });
  } catch (error: unknown) {
    if (isR2ObjectMissingError(error)) {
      return Response.json({ error: "Upload not found." }, { status: 404 });
    }

    await logServerError("uploads.private.get", error, request);
    return jsonErrorResponse(error, {
      fallback: "We couldn't open that private upload right now. Please try again shortly.",
      status: 500,
    });
  }
}
