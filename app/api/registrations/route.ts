import { requireAdmin, requirePlatformAdmin } from "@/lib/admin-auth";
import { writeRequiredAuditLogFromRequest } from "@/lib/audit-logs";
import { CanonicalTeamError } from "@/lib/canonical-teams";
import {
  createRegistration,
  getRegistration,
  getRegistrations,
  getRegistrationTeamCandidates,
  updateRegistrationStatus,
} from "@/lib/data";
import { COLLECTIONS, DocumentWriteConflictError, getDocument } from "@/lib/document-store";
import { ImageDecodeError } from "@/lib/image-validation";
import { getManagedUploadRecord } from "@/lib/r2/storage";
import { enforceRateLimit } from "@/lib/rate-limit";
import {
  approveCanonicalTeamRegistration,
  cleanupPendingRegistrationLogoCandidates,
  RegistrationApprovalError,
  RegistrationApprovalRollbackError,
} from "@/lib/registration-approval";
import {
  isDefinitiveRegistrationSubmissionRejection,
  registrationSubmissionMatchesExpectation,
  type RegistrationSubmissionExpectation,
} from "@/lib/registration-submission-state";
import { requireSameOrigin } from "@/lib/request-origin";
import { logServerError } from "@/lib/server-monitoring";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/service-role-client";
import { findTeamDuplicateCandidates } from "@/lib/team-onboarding";
import { isValidDiscordHandle, RegistrationValidationError, validateRegistrationTarget } from "@/lib/team-registration";
import { claimUploadRecordForEntity, releaseUploadRecordEntityClaim } from "@/lib/upload-records";
import { jsonErrorResponse, USER_FACING_ERROR_MESSAGES } from "@/lib/user-facing-errors";
import type { TeamRegistration } from "@/lib/types";
import { randomUUID } from "node:crypto";

function normalizeOptionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

class RegistrationSubmissionRecoveryError extends Error {
  constructor(message: string, options: { cause: unknown }) {
    super(message, options);
    this.name = "RegistrationSubmissionRecoveryError";
  }
}

export async function GET(request: Request) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;
  const data = await getRegistrations();
  return Response.json({ success: true, data });
}

export async function POST(request: Request) {
  const invalidOrigin = requireSameOrigin(request);
  if (invalidOrigin) return invalidOrigin;
  const limited = await enforceRateLimit(request, {
    key: "team-registration",
    maxRequests: 5,
    windowMs: 60_000,
  });
  if (limited) return limited;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const logoUrl = normalizeOptionalString(body.logoUrl);
    const logoPath = normalizeOptionalString(body.logoPath);
    const logoUploadId = normalizeOptionalString(body.logoUploadId);
    const teamName = normalizeOptionalString(body.teamName);
    const captainName = normalizeOptionalString(body.captainName);
    const captainDiscord = normalizeOptionalString(body.captainDiscord);
    const tournamentId = normalizeOptionalString(body.tournamentId);
    const playerNames = Array.isArray(body.playerNames)
      ? body.playerNames.filter((value: unknown): value is string => typeof value === "string" && value.trim().length > 0)
      : [];
    if (!teamName || !captainName || !captainDiscord) {
      return Response.json(
        {
          error: "Please provide the team name, IGL or manager name, and Discord contact before submitting.",
        },
        { status: 400 },
      );
    }
    if (playerNames.length > 4) {
      return Response.json(
        {
          error: "Team registrations support up to 4 player names in this form.",
        },
        { status: 400 },
      );
    }
    if (!isValidDiscordHandle(captainDiscord)) {
      return Response.json(
        {
          error: "Enter a valid Discord username so Bravo admins can contact your team after review.",
        },
        { status: 400 },
      );
    }
    const hasAnyLogoField = Boolean(logoUrl || logoPath || logoUploadId);
    if (hasAnyLogoField) {
      if (!logoUrl || !logoPath || !logoUploadId) {
        return Response.json(
          {
            error: "Finish the team logo upload before you submit, or submit the form without a logo.",
          },
          { status: 400 },
        );
      }

      const pendingUploadRecord = await getManagedUploadRecord(logoUploadId).catch(() => null);
      if (
        !pendingUploadRecord ||
        pendingUploadRecord.fileType !== "team_logo_pending" ||
        pendingUploadRecord.relatedType !== "team_registration" ||
        pendingUploadRecord.relatedId !== null ||
        pendingUploadRecord.filePath !== logoPath ||
        pendingUploadRecord.url !== logoUrl
      ) {
        return Response.json(
          {
            error: "Upload the team logo again before you submit this registration.",
          },
          { status: 400 },
        );
      }
    }
    const registrationTarget = await validateRegistrationTarget({
      tournamentId,
      teamName,
      captainDiscord,
    });
    const [officialTeams, existingRegistrations] = await Promise.all([getRegistrationTeamCandidates(), getRegistrations()]);
    const duplicateCandidates = findTeamDuplicateCandidates(
      {
        name: teamName,
        tag: normalizeOptionalString(body.teamTag),
        captainDiscord,
        playerNames,
      },
      [
        ...officialTeams.map((team) => ({
          id: team.id,
          name: team.name,
          tag: team.tag,
          captainDiscord: team.captainDiscord,
          playerNames: team.playerIds,
          status: team.status,
        })),
        ...existingRegistrations
          .filter((registration) => registration.status !== "rejected")
          .map((registration) => ({
            id: registration.id,
            name: registration.teamName,
            tag: registration.teamTag,
            captainDiscord: registration.captainDiscord,
            playerNames: registration.playerNames,
            status: registration.status,
          })),
      ],
    );
    const registrationId = randomUUID();
    let claimedLogoUpload = false;
    if (logoUploadId && logoPath && logoUrl) {
      const claimedUpload = await claimUploadRecordForEntity({
        id: logoUploadId,
        relatedType: "team_registration",
        relatedId: registrationId,
        filePath: logoPath,
        fileUrl: logoUrl,
      });
      if (!claimedUpload) {
        return Response.json(
          {
            error: "This logo upload is already linked to another registration. Upload the logo again before submitting.",
          },
          { status: 409 },
        );
      }
      claimedLogoUpload = true;
    }

    const registrationInput = {
      teamName,
      teamTag: normalizeOptionalString(body.teamTag),
      captainName,
      captainDiscord,
      playerNames,
      tournamentId: registrationTarget?.id ?? tournamentId,
      tournamentTitle: registrationTarget?.title,
      logoUrl,
      logoPath,
      logoUploadId,
    };
    const expectedRegistration: RegistrationSubmissionExpectation = {
      ...registrationInput,
      approvedTeamId: undefined,
      id: registrationId,
      status: "pending",
    };
    let result;
    try {
      result = await createRegistration(registrationInput, { id: registrationId });
    } catch (createError) {
      let confirmedRegistration: TeamRegistration | null;
      try {
        confirmedRegistration = await getDocument<TeamRegistration>(COLLECTIONS.registrations, registrationId);
      } catch (confirmationError) {
        throw new RegistrationSubmissionRecoveryError(
          "The registration response failed and its saved state could not be verified. The logo claim was retained for safe recovery.",
          {
            cause: { confirmationError, createError },
          },
        );
      }

      if (confirmedRegistration && registrationSubmissionMatchesExpectation(confirmedRegistration, expectedRegistration)) {
        result = confirmedRegistration;
      } else if (confirmedRegistration) {
        throw new RegistrationSubmissionRecoveryError(
          "The registration response failed and the saved state is ambiguous. The logo claim was retained for safe recovery.",
          {
            cause: { confirmedRegistration, createError },
          },
        );
      } else {
        if (!isDefinitiveRegistrationSubmissionRejection(createError)) {
          throw new RegistrationSubmissionRecoveryError(
            "The registration response failed without a definitive database rejection. Any linked logo claim was retained for safe recovery.",
            {
              cause: createError,
            },
          );
        }
        if (claimedLogoUpload && logoUploadId) {
          await releaseUploadRecordEntityClaim({
            id: logoUploadId,
            relatedType: "team_registration",
            relatedId: registrationId,
          }).catch(() => undefined);
        }
        throw createError;
      }
    }
    if (duplicateCandidates.length > 0) {
      const client = getSupabaseServiceRoleClient();
      const candidateTeamIds = duplicateCandidates
        .map((candidate) => candidate.team.id)
        .filter((id): id is string => Boolean(id && /^[0-9a-f-]{36}$/i.test(id)));
      await client.from("discord_access_reviews").insert({
        discord_user_id: `registration:${result.id}`,
        discord_guild_id: process.env.BRAVO_DISCORD_GUILD_ID?.trim() || "registration",
        category: "duplicate_team",
        candidate_team_ids: candidateTeamIds,
        details: {
          registrationId: result.id,
          submittedName: teamName,
          candidates: duplicateCandidates.slice(0, 10),
        },
      });
      if (/^[0-9a-f-]{36}$/i.test(result.id)) {
        await client
          .from("registrations")
          .update({
            onboarding_status: "under_review",
            duplicate_candidates: duplicateCandidates.slice(0, 10),
          })
          .eq("id", result.id);
      }
    }
    return Response.json({ success: true, data: result });
  } catch (error: unknown) {
    if (error instanceof RegistrationValidationError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof RegistrationSubmissionRecoveryError) {
      await logServerError("registrations.create.recovery_required", error, request);
      return Response.json(
        {
          success: false,
          error: error.message,
          code: "registration_submission_recovery_required",
        },
        { status: 503 },
      );
    }

    await logServerError("registrations.create", error, request);
    return jsonErrorResponse(error, {
      status: 500,
      fallback: USER_FACING_ERROR_MESSAGES.registration,
    });
  }
}

export async function PATCH(request: Request) {
  const invalidOrigin = requireSameOrigin(request);
  if (invalidOrigin) return invalidOrigin;
  const auth = await requirePlatformAdmin(request);
  if (auth.response) return auth.response;

  const limited = await enforceRateLimit(request, {
    key: "registration-admin-update",
    maxRequests: 30,
    windowMs: 60_000,
  });
  if (limited) return limited;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const registrationId = normalizeOptionalString(body.id);
    const requestedStatus = normalizeOptionalString(body.status);
    if (!registrationId || !requestedStatus) {
      return Response.json({ error: "id and status are required" }, { status: 400 });
    }

    if (!["pending", "approved", "rejected"].includes(requestedStatus)) {
      return Response.json({ error: "Unsupported registration status." }, { status: 400 });
    }

    const registration = await getRegistration(registrationId);
    if (!registration) {
      return Response.json({ error: "Registration not found." }, { status: 404 });
    }
    if (registration.status !== "pending") {
      if (requestedStatus === registration.status) {
        const cleanupPending = requestedStatus === "approved" ? await cleanupPendingRegistrationLogoCandidates(registration.id) : false;
        return Response.json({
          success: true,
          cleanupPending,
          data: registration,
          team: null,
          message: `Registration is already ${registration.status}.`,
        });
      }
      return Response.json(
        {
          error: `This registration is already ${registration.status} and cannot be changed to ${requestedStatus}.`,
          code: "registration_already_reviewed",
        },
        { status: 409 },
      );
    }
    if (registration.approvalClaimToken && requestedStatus !== "approved") {
      return Response.json(
        {
          error: "This registration is currently being approved and cannot receive a competing decision.",
          code: "registration_approval_in_progress",
        },
        { status: 409 },
      );
    }
    if (requestedStatus === "pending") {
      return Response.json({
        success: true,
        cleanupPending: false,
        data: registration,
        team: null,
        message: "Registration is already pending.",
      });
    }

    await writeRequiredAuditLogFromRequest(request, {
      action: `${requestedStatus}_requested`,
      entityId: registrationId,
      entityType: "team_registration",
      oldValue: {
        approvedTeamId: registration.approvedTeamId ?? null,
        status: registration.status,
      },
      newValue: {
        status: requestedStatus,
      },
    });

    if (requestedStatus !== "approved") {
      const result = await updateRegistrationStatus(
        registrationId,
        requestedStatus as "pending" | "rejected",
        {
          approvedTeamId: normalizeOptionalString(registration.approvedTeamId),
          logoPath: normalizeOptionalString(registration.logoPath),
          logoUploadId: normalizeOptionalString(registration.logoUploadId),
          logoUrl: normalizeOptionalString(registration.logoUrl),
          tournamentId: registration.tournamentId,
          tournamentTitle: registration.tournamentTitle,
        },
        {
          expectedRegistration: registration,
        },
      );
      return Response.json({
        success: true,
        data: result,
        team: null,
        message: requestedStatus === "rejected" ? "Registration rejected." : "Registration moved back to pending.",
      });
    }

    const approval = await approveCanonicalTeamRegistration(request, {
      actorProfileId: auth.session.profileId,
      registration,
    });
    return Response.json({
      success: true,
      cleanupPending: approval.cleanupPending,
      data: approval.registration,
      team: approval.team,
      message: `Registration approved. ${approval.team.name} is now live.`,
    });
  } catch (error: unknown) {
    await logServerError("registrations.update", error, request);
    if (error instanceof RegistrationApprovalError || error instanceof CanonicalTeamError) {
      return Response.json({ error: error.message, code: error.code }, { status: error.status });
    }
    if (error instanceof DocumentWriteConflictError) {
      return Response.json(
        {
          error: "This registration changed while it was being reviewed. Refresh and try again.",
          code: "registration_conflict",
        },
        { status: 409 },
      );
    }
    if (error instanceof ImageDecodeError) {
      return Response.json({ error: error.message, code: "invalid_image_signature" }, { status: 400 });
    }
    if (error instanceof RegistrationApprovalRollbackError) {
      return Response.json(
        {
          error: error.message,
          code: "registration_approval_rollback_required",
        },
        { status: 503 },
      );
    }
    return Response.json(
      {
        error: USER_FACING_ERROR_MESSAGES.admin,
        code: "registration_approval_failed",
      },
      {
        status: 500,
      },
    );
  }
}
