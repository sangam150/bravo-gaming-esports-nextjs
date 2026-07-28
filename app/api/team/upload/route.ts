import { requireTeamWorkspaceUser } from "@/lib/admin-auth";
import { writeRequiredAuditLogFromRequest } from "@/lib/audit-logs";
import { prepareCanonicalImage } from "@/lib/canonical-image-upload";
import { CanonicalTeamError, getCanonicalAdminTeam, isCanonicalTeamId } from "@/lib/canonical-teams";
import { ImageDecodeError } from "@/lib/image-validation";
import {
  buildPrivateUploadUrl,
  deletePrivateObjectByKey,
  uploadPrivateFile,
  uploadPrivateObjectAtKey,
  verifyPrivateObject,
} from "@/lib/r2/storage";
import { enforceRateLimit } from "@/lib/rate-limit";
import { requireSameOrigin } from "@/lib/request-origin";
import { logServerError } from "@/lib/server-monitoring";
import type { VerifiedSession } from "@/lib/supabase-auth-server";
import { createPendingTeamLogoRequest, TeamLogoApprovalError } from "@/lib/team-logo-approval";
import { createTeamRosterRequest } from "@/lib/team-workspace";
import { normalizeUploadType, type UploadType } from "@/lib/upload-config";
import { createUploadRecord, deleteUploadRecord } from "@/lib/upload-records";
import { resolveUploadContentType, validateUpload } from "@/lib/upload-validation";
import { USER_FACING_ERROR_MESSAGES, toUserFacingErrorMessage } from "@/lib/user-facing-errors";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

const TEAM_UPLOAD_TYPES = new Set<UploadType>(["team_logo", "moss_file"]);

async function createWorkspaceTeamLogoRequest(
  request: Request,
  input: {
    file: File;
    session: VerifiedSession & { teamId: string };
  },
) {
  if (!isCanonicalTeamId(input.session.teamId)) {
    throw new CanonicalTeamError("Your profile is not linked to a valid official team.", {
      code: "invalid_team_id",
      status: 403,
    });
  }
  const team = await getCanonicalAdminTeam(input.session.teamId);
  if (!team || team.id !== input.session.teamId) {
    throw new CanonicalTeamError("Your linked official team could not be found.", {
      code: "team_not_found",
      status: 404,
    });
  }

  const buffer = Buffer.from(await input.file.arrayBuffer());
  const preparedImage = await prepareCanonicalImage({
    altText: `${team.name} logo`,
    buffer,
    declaredContentType: input.file.type,
    fileName: input.file.name,
  });
  const uploadRecordId = randomUUID();
  const candidatePath = `teams/${team.id}/pending/logo-${preparedImage.metadata.version}.${preparedImage.decoded.extension}`;
  const candidateUrl = buildPrivateUploadUrl(uploadRecordId);
  const candidateMetadata = {
    ...preparedImage.metadata,
    objectKey: candidatePath,
    privateUrl: candidateUrl,
    status: "pending_review",
  } as const;

  const result = await createPendingTeamLogoRequest({
    createUploadRecord: () =>
      createUploadRecord({
        contentType: preparedImage.decoded.contentType,
        fileName: input.file.name,
        filePath: candidatePath,
        fileType: "team_logo_pending",
        fileUrl: candidateUrl,
        id: uploadRecordId,
        relatedId: team.id,
        relatedType: "team_logo_candidate",
        sizeBytes: preparedImage.decoded.sizeBytes,
        uploadedBy: input.session.profileId,
      }),
    createRequest: (candidateUploadId) =>
      createTeamRosterRequest(input.session, {
        requestType: "logo_update",
        payload: {
          asset: candidateMetadata,
          candidatePath,
          candidateUploadId,
          candidateUrl,
          fileName: input.file.name,
        },
      }),
    deleteCandidateObject: () => deletePrivateObjectByKey(candidatePath),
    deleteUploadRecord,
    uploadCandidate: () => uploadPrivateObjectAtKey(candidatePath, buffer, preparedImage.decoded.contentType).then(() => undefined),
    verifyCandidate: () =>
      verifyPrivateObject(candidatePath, {
        contentType: preparedImage.decoded.contentType,
        sizeBytes: preparedImage.decoded.sizeBytes,
      }).then(() => undefined),
    writeRequiredAudit: (uploadRecordId) =>
      writeRequiredAuditLogFromRequest(request, {
        action: "team_logo_candidate_requested",
        entityId: team.id,
        entityType: "team",
        oldValue: {
          logoUrl: team.logoUrl,
        },
        newValue: {
          candidate: candidateMetadata,
          uploadRecordId,
        },
      }).then(() => undefined),
  });

  return Response.json({
    success: true,
    data: result.request,
    id: result.uploadRecordId,
    key: candidatePath,
    metadata: candidateMetadata,
    path: candidatePath,
    status: "pending_review",
    url: candidateUrl,
  });
}

export async function POST(request: Request) {
  const invalidOrigin = requireSameOrigin(request);
  if (invalidOrigin) return invalidOrigin;
  const limited = await enforceRateLimit(request, {
    key: "team-upload",
    maxRequests: 12,
    windowMs: 60_000,
  });
  if (limited) return limited;

  const auth = await requireTeamWorkspaceUser(request);
  if (auth.response || !auth.session) {
    return auth.response ?? Response.json({ error: USER_FACING_ERROR_MESSAGES.session }, { status: 401 });
  }

  let pendingMossObjectPath: string | null = null;
  let pendingMossUploadRecordId: string | null = null;
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const type = normalizeUploadType(formData.get("type") as string | null);

    if (!file || !type) {
      return Response.json(
        {
          success: false,
          error: "Please choose a file and upload type before continuing.",
        },
        { status: 400 },
      );
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

    if (type === "team_logo") {
      return await createWorkspaceTeamLogoRequest(request, {
        file,
        session: auth.session,
      });
    }

    const contentType =
      resolveUploadContentType(type, file.name, file.type, {
        audience: "team",
      }) || "application/octet-stream";
    const buffer = Buffer.from(await file.arrayBuffer());
    const uploadRecordId = randomUUID();
    const uploadResult = await uploadPrivateFile("moss_file", auth.session.teamId, file.name, buffer, contentType);
    pendingMossObjectPath = uploadResult.path;
    await verifyPrivateObject(uploadResult.path, {
      contentType,
      sizeBytes: buffer.byteLength,
    });
    const url = buildPrivateUploadUrl(uploadRecordId);

    const record = await createUploadRecord({
      fileUrl: url,
      filePath: uploadResult.path,
      fileType: type,
      id: uploadRecordId,
      relatedType: "moss_submission",
      relatedId: auth.session.teamId,
      uploadedBy: auth.session.profileId,
      fileName: file.name,
      contentType,
      sizeBytes: file.size,
    });
    pendingMossUploadRecordId = record.id;

    await writeRequiredAuditLogFromRequest(request, {
      action: "team_upload_created",
      entityId: record.id,
      entityType: "team_upload",
      newValue: {
        fileType: type,
        fileUrl: url,
        path: uploadResult.path,
        teamId: auth.session.teamId,
        visibility: "private",
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
    if (pendingMossUploadRecordId) {
      await deleteUploadRecord(pendingMossUploadRecordId).catch(() => undefined);
    }
    if (pendingMossObjectPath) {
      await deletePrivateObjectByKey(pendingMossObjectPath).catch(() => undefined);
    }
    await logServerError("team.upload", error, request);
    if (error instanceof CanonicalTeamError) {
      return Response.json({ success: false, error: error.message, code: error.code }, { status: error.status });
    }
    if (error instanceof ImageDecodeError) {
      return Response.json({ success: false, error: error.message, code: "invalid_image_signature" }, { status: 400 });
    }
    if (error instanceof TeamLogoApprovalError) {
      return Response.json({ success: false, error: error.message, code: error.code }, { status: error.status });
    }
    return Response.json(
      {
        success: false,
        error: toUserFacingErrorMessage(error, {
          status: 500,
          fallback: "We couldn't upload that team file right now. Please try again shortly.",
        }),
      },
      { status: 500 },
    );
  }
}
