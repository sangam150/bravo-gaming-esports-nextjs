import { writeAuditLogFromRequest } from "@/lib/audit-logs";
import { requireAdmin } from "@/lib/admin-auth";
import {
  createRegistration,
  getRegistration,
  getRegistrations,
  getTeam,
  getTeams,
  saveTeam,
  updateRegistrationStatus,
} from "@/lib/data";
import { getManagedUploadRecord, getPrivateObject, readObjectBodyAsBuffer, uploadPublicFile } from "@/lib/r2/storage";
import { enforceRateLimit } from "@/lib/rate-limit";
import { revalidateCompetitionPaths, revalidateTeamPaths } from "@/lib/revalidate-public";
import { logServerError } from "@/lib/server-monitoring";
import { createUploadRecord } from "@/lib/upload-records";
import {
  jsonErrorResponse,
  USER_FACING_ERROR_MESSAGES,
} from "@/lib/user-facing-errors";

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function normalizeOptionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

async function promotePendingTeamLogo(options: {
  fallbackLogoUrl?: string;
  fallbackLogoPath?: string;
  fallbackUploadId?: string;
  teamId: string;
  teamName: string;
}) {
  const uploadId = normalizeOptionalString(options.fallbackUploadId);
  if (!uploadId) {
    return {
      logoPath: normalizeOptionalString(options.fallbackLogoPath),
      logoUploadId: normalizeOptionalString(options.fallbackUploadId),
      logoUrl: normalizeOptionalString(options.fallbackLogoUrl),
    };
  }

  const existingUpload = await getManagedUploadRecord(uploadId).catch(() => null);
  if (!existingUpload?.filePath || existingUpload.fileType !== "team_logo_pending") {
    return {
      logoPath: normalizeOptionalString(options.fallbackLogoPath),
      logoUploadId: normalizeOptionalString(options.fallbackUploadId),
      logoUrl: normalizeOptionalString(options.fallbackLogoUrl),
    };
  }

  const privateObject = await getPrivateObject(existingUpload.filePath);
  const buffer = await readObjectBodyAsBuffer(privateObject.Body);
  if (!buffer) {
    throw new Error("Pending team logo could not be loaded from private storage.");
  }

  const contentType = privateObject.ContentType ?? existingUpload.contentType ?? "application/octet-stream";
  const promotedUpload = await uploadPublicFile(
    "team_logo",
    options.teamId,
    existingUpload.fileName ?? `${options.teamName}.png`,
    buffer,
    contentType
  );
  const publicRecord = await createUploadRecord({
    fileUrl: promotedUpload.url,
    filePath: promotedUpload.path,
    fileType: "team_logo",
    relatedType: "team_registration_approved",
    relatedId: options.teamId,
    fileName: existingUpload.fileName,
    contentType,
    sizeBytes: existingUpload.sizeBytes,
  });

  return {
    logoPath: promotedUpload.path,
    logoUploadId: publicRecord.id,
    logoUrl: promotedUpload.url,
  };
}

export async function GET(request: Request) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;
  const data = await getRegistrations();
  return Response.json({ success: true, data });
}

export async function POST(request: Request) {
  const limited = enforceRateLimit(request, { key: "team-registration", maxRequests: 5, windowMs: 60_000 });
  if (limited) return limited;

  try {
    const body = await request.json();
    if (!body.teamName || !body.captainName || !body.captainDiscord) {
      return Response.json(
        { error: "Please provide the team name, captain name, and captain Discord before submitting." },
        { status: 400 }
      );
    }
    if (!body.logoUrl || !body.logoPath || !body.logoUploadId) {
      return Response.json(
        { error: "Upload the team logo before you submit this registration." },
        { status: 400 }
      );
    }
    const result = await createRegistration({
      teamName: body.teamName,
      captainName: body.captainName,
      captainDiscord: body.captainDiscord,
      playerNames: body.playerNames ?? [],
      tournamentId: body.tournamentId,
      logoUrl: body.logoUrl,
      logoPath: body.logoPath,
      logoUploadId: body.logoUploadId,
    });
    return Response.json({ success: true, data: result });
  } catch (error: unknown) {
    await logServerError("registrations.create", error, request);
    return jsonErrorResponse(error, {
      status: 500,
      fallback: USER_FACING_ERROR_MESSAGES.registration,
    });
  }
}

export async function PATCH(request: Request) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  const limited = enforceRateLimit(request, { key: "registration-admin-update", maxRequests: 30, windowMs: 60_000 });
  if (limited) return limited;

  try {
    const body = await request.json();
    if (!body.id || !body.status) {
      return Response.json({ error: "id and status are required" }, { status: 400 });
    }

    if (!["pending", "approved", "rejected"].includes(body.status)) {
      return Response.json({ error: "Unsupported registration status." }, { status: 400 });
    }

    const registration = await getRegistration(String(body.id));
    if (!registration) {
      return Response.json({ error: "Registration not found." }, { status: 404 });
    }

    let approvedTeam: Awaited<ReturnType<typeof saveTeam>> | null = null;
    let approvedLogo = {
      logoPath: normalizeOptionalString(registration.logoPath),
      logoUploadId: normalizeOptionalString(registration.logoUploadId),
      logoUrl: normalizeOptionalString(registration.logoUrl),
    };

    if (body.status === "approved") {
      const existingTeam =
        (registration.approvedTeamId ? await getTeam(registration.approvedTeamId) : null) ??
        (await getTeams()).find(
          (team) => team.name.trim().toLowerCase() === registration.teamName.trim().toLowerCase()
        ) ??
        null;

      const teamId = existingTeam?.id ?? registration.approvedTeamId ?? slugify(registration.teamName);
      approvedLogo = await promotePendingTeamLogo({
        fallbackLogoUrl: registration.logoUrl,
        fallbackLogoPath: registration.logoPath,
        fallbackUploadId: registration.logoUploadId,
        teamId,
        teamName: registration.teamName,
      });

      approvedTeam = await saveTeam(
        {
          name: registration.teamName,
          logo: approvedLogo.logoUrl,
          logoUrl: approvedLogo.logoUrl,
          captainName: registration.captainName,
          captainDiscord: registration.captainDiscord,
          captainPhone: registration.captainPhone,
          captainEmail: registration.captainEmail,
          playerIds: existingTeam?.playerIds ?? [],
          status: "active",
          registrationStatus: "approved",
          totalPoints: existingTeam?.totalPoints ?? 0,
          kills: existingTeam?.kills ?? 0,
          matches: existingTeam?.matches ?? 0,
          killPoints: existingTeam?.killPoints,
          placementPoints: existingTeam?.placementPoints,
          averagePlacement: existingTeam?.averagePlacement,
          chickenDinners: existingTeam?.chickenDinners,
          country: existingTeam?.country,
          tag: existingTeam?.tag,
          slotNumber: existingTeam?.slotNumber,
          scope: existingTeam?.scope,
          seasonId: existingTeam?.seasonId,
          seasonTitle: existingTeam?.seasonTitle,
          seasonDayNumbers: existingTeam?.seasonDayNumbers,
          sourceTournamentId: existingTeam?.sourceTournamentId,
          sourceTournamentTitle: existingTeam?.sourceTournamentTitle,
          sourceTeamName: existingTeam?.sourceTeamName,
          sourceProvider: existingTeam?.sourceProvider,
          createdAt: existingTeam?.createdAt,
        },
        teamId
      );

      revalidateTeamPaths(approvedTeam.id);
      revalidateCompetitionPaths();
    }

    const result = await updateRegistrationStatus(String(body.id), body.status, {
      approvedTeamId: approvedTeam?.id ?? normalizeOptionalString(registration.approvedTeamId),
      logoPath: approvedLogo.logoPath,
      logoUploadId: approvedLogo.logoUploadId,
      logoUrl: approvedLogo.logoUrl,
      tournamentId: registration.tournamentId,
    });

    await writeAuditLogFromRequest(request, {
      action: "update",
      entityId: String(body.id),
      entityType: "team_registration",
      oldValue: { status: registration.status },
      newValue: {
        approvedTeamId: approvedTeam?.id ?? registration.approvedTeamId ?? null,
        status: body.status,
      },
    });

    return Response.json({
      success: true,
      data: result,
      team: approvedTeam,
      message:
        body.status === "approved"
          ? `Registration approved. ${approvedTeam?.name ?? registration.teamName} is now live.`
          : body.status === "rejected"
            ? "Registration rejected."
            : "Registration moved back to pending.",
    });
  } catch (error: unknown) {
    await logServerError("registrations.update", error, request);
    return jsonErrorResponse(error, {
      status: 500,
      fallback: USER_FACING_ERROR_MESSAGES.admin,
    });
  }
}
