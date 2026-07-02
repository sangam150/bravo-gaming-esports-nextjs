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

function resolvePublicAssetKind(objectKey: string) {
  const segments = objectKey.split("/").filter(Boolean);
  const [rootFolder, , nestedFolder] = segments;
  const managedFolder = rootFolder === "demo" ? nestedFolder : rootFolder;

  if (managedFolder === "players") {
    return "PLAYER AVATAR";
  }

  if (managedFolder === "teams") {
    return "TEAM ASSET";
  }

  if (managedFolder === "sponsors") {
    return "SPONSOR ASSET";
  }

  if (managedFolder === "events") {
    return "EVENT ART";
  }

  if (managedFolder === "news") {
    return "NEWS ART";
  }

  if (managedFolder === "media") {
    return "MEDIA ART";
  }

  return "BRAVO ASSET";
}

function buildPublicAssetFallbackResponse(objectKey: string) {
  const kind = resolvePublicAssetKind(objectKey);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720" role="img" aria-label="${kind}">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#07111c" />
          <stop offset="100%" stop-color="#13263d" />
        </linearGradient>
        <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#1d9bf0" />
          <stop offset="100%" stop-color="#56c2ff" />
        </linearGradient>
      </defs>
      <rect width="1280" height="720" rx="40" fill="url(#bg)" />
      <rect x="72" y="72" width="1136" height="576" rx="30" fill="none" stroke="rgba(255,255,255,0.12)" />
      <circle cx="196" cy="182" r="32" fill="url(#accent)" opacity="0.95" />
      <path d="M184 182h188" stroke="url(#accent)" stroke-width="12" stroke-linecap="round" opacity="0.9" />
      <text x="96" y="300" fill="#f8fafc" font-size="92" font-family="Arial, Helvetica, sans-serif" font-weight="700" letter-spacing="8">
        BRAVO GAMING
      </text>
      <text x="96" y="390" fill="#93c5fd" font-size="36" font-family="Arial, Helvetica, sans-serif" font-weight="700" letter-spacing="10">
        ${kind}
      </text>
      <text x="96" y="470" fill="#cbd5e1" font-size="28" font-family="Arial, Helvetica, sans-serif">
        Managed public asset fallback served because the requested upload is unavailable.
      </text>
    </svg>
  `.trim();

  return new Response(svg, {
    headers: {
      "Cache-Control": "public, max-age=300, stale-while-revalidate=86400",
      "Content-Type": "image/svg+xml; charset=utf-8",
    },
  });
}

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
      return buildPublicAssetFallbackResponse(objectKey);
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
      const { searchParams } = new URL(request.url);
      const objectKey = normalizeManagedPublicObjectKey(searchParams.get("key") ?? "");

      if (objectKey) {
        return buildPublicAssetFallbackResponse(objectKey);
      }

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
  const limited = await enforceRateLimit(request, { key: "shared-upload-r2", maxRequests: 20, windowMs: 60_000 });
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

