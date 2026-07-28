import { requireAdmin, requirePlatformAdmin } from "@/lib/admin-auth";
import { writeRequiredAuditLogFromRequest } from "@/lib/audit-logs";
import { prepareCanonicalPublicImageUpload } from "@/lib/canonical-image-upload";
import { CanonicalTeamError, getCanonicalAdminTeam, mergeTeamSourceMetadata, replaceCanonicalTeamLogoWithCas } from "@/lib/canonical-teams";
import { sanitizeJsonObject } from "@/lib/json-utils";
import {
  deleteFromStorageByUrl,
  deletePrivateObjectByKey,
  deletePublicObjectByKey,
  getManagedUploadRecord,
  getPrivateObject,
  isR2ObjectMissingError,
  readObjectBodyAsBuffer,
  uploadPublicObjectAtKey,
  verifyPublicObjectDelivery,
} from "@/lib/r2/storage";
import { enforceRateLimit } from "@/lib/rate-limit";
import { revalidateTeamAssetPaths } from "@/lib/revalidate-public";
import { requireSameOrigin } from "@/lib/request-origin";
import { logServerError } from "@/lib/server-monitoring";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/service-role-client";
import { assertTeamLogoCandidateOwnership, reviewPendingTeamLogoRequest, TeamLogoApprovalError } from "@/lib/team-logo-approval";
import { replaceTeamLogoAtomically } from "@/lib/team-logo-service";
import { createUploadRecord, deleteUploadRecord } from "@/lib/upload-records";
import { getUserFacingTeamLabel, toUserFacingErrorMessage } from "@/lib/user-facing-errors";
import type { Json, Tables } from "@/types/database.types";
import { randomUUID } from "node:crypto";

type RosterRequestRow = Pick<
  Tables<"roster_requests">,
  | "id"
  | "team_id"
  | "requested_by"
  | "request_type"
  | "status"
  | "admin_note"
  | "old_player_id"
  | "new_player_name"
  | "new_player_pubg_name"
  | "payload"
  | "created_at"
  | "updated_at"
  | "reviewed_at"
>;

type MossSubmissionRow = Pick<
  Tables<"moss_submissions">,
  | "id"
  | "event_id"
  | "match_id"
  | "team_id"
  | "player_id"
  | "file_url"
  | "external_link"
  | "status"
  | "admin_note"
  | "created_at"
  | "updated_at"
>;

type PlayerRow = Pick<Tables<"players">, "id" | "pubg_name" | "display_name">;
type ProfileRow = Pick<Tables<"profiles">, "id" | "display_name" | "email">;
type EventRow = Pick<Tables<"events">, "id" | "name" | "title">;

type RosterRequestStatus = Tables<"roster_requests">["status"];
type MossSubmissionStatus = Tables<"moss_submissions">["status"];

const ROSTER_REQUEST_STATUSES: ReadonlySet<string> = new Set(["pending", "approved", "rejected", "review_later"]);
const MOSS_SUBMISSION_STATUSES: ReadonlySet<string> = new Set(["submitted", "approved", "rejected"]);
const ROSTER_REQUEST_SELECT =
  "id,team_id,requested_by,request_type,status,admin_note,old_player_id,new_player_name,new_player_pubg_name,payload,created_at,updated_at,reviewed_at";
const LOGO_REVIEW_CLAIM_KEY = "adminLogoReviewClaim";
const LOGO_REVIEW_CLAIM_TTL_MS = 5 * 60 * 1000;
const LOGO_REVIEW_MAX_CLOCK_SKEW_MS = 60 * 1000;

type LogoReviewClaim = {
  candidateUploadId: string;
  claimedAt: string;
  decision: "approved" | "rejected";
  expectedContentHash: string;
  originalStatus: "pending" | "review_later";
  token: string;
};

function jsonObject(value: Json | null | undefined): Record<string, Json | undefined> {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value : {};
}

function jsonString(value: Json | undefined) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function isRosterRequestStatus(value: string): value is RosterRequestStatus {
  return ROSTER_REQUEST_STATUSES.has(value);
}

function isMossSubmissionStatus(value: string): value is MossSubmissionStatus {
  return MOSS_SUBMISSION_STATUSES.has(value);
}

function readLogoCandidateDescriptor(requestRow: RosterRequestRow) {
  const payload = jsonObject(requestRow.payload);
  const asset = jsonObject(payload.asset);
  const candidateUploadId = jsonString(payload.candidateUploadId);
  const candidatePath = jsonString(payload.candidatePath);
  const expectedContentHash = jsonString(asset.contentHash);
  const expectedUpdatedAt = jsonString(asset.updatedAt);

  if (!candidateUploadId || !candidatePath || !expectedContentHash) {
    throw new TeamLogoApprovalError("This legacy logo request has no verified candidate. Ask the team to submit it again.", {
      code: "missing_team_logo_candidate",
      status: 409,
    });
  }

  return {
    candidatePath,
    candidateUploadId,
    expectedContentHash,
    expectedUpdatedAt,
  };
}

function getActiveTeamLogoHash(sourceMetadata: Json) {
  const assets = jsonObject(jsonObject(sourceMetadata).assets);
  return jsonString(jsonObject(assets.logo).contentHash);
}

function readLogoReviewClaim(requestRow: RosterRequestRow): LogoReviewClaim | null {
  const claim = jsonObject(jsonObject(requestRow.payload)[LOGO_REVIEW_CLAIM_KEY]);
  const token = jsonString(claim.token);
  const decision = jsonString(claim.decision);
  const candidateUploadId = jsonString(claim.candidateUploadId);
  const claimedAt = jsonString(claim.claimedAt);
  const expectedContentHash = jsonString(claim.expectedContentHash);
  const originalStatus = jsonString(claim.originalStatus);
  if (
    !token ||
    (decision !== "approved" && decision !== "rejected") ||
    !candidateUploadId ||
    !claimedAt ||
    !expectedContentHash ||
    (originalStatus !== "pending" && originalStatus !== "review_later")
  ) {
    return null;
  }
  return {
    candidateUploadId,
    claimedAt,
    decision,
    expectedContentHash,
    originalStatus,
    token,
  };
}

function hasLogoReviewClaimPayload(requestRow: RosterRequestRow) {
  return Object.prototype.hasOwnProperty.call(jsonObject(requestRow.payload), LOGO_REVIEW_CLAIM_KEY);
}

function isLogoReviewClaimFresh(claimedAt: string, now = Date.now()) {
  const claimedAtMs = Date.parse(claimedAt);
  if (!Number.isFinite(claimedAtMs)) {
    return false;
  }

  const claimAgeMs = now - claimedAtMs;
  return claimAgeMs >= -LOGO_REVIEW_MAX_CLOCK_SKEW_MS && claimAgeMs < LOGO_REVIEW_CLAIM_TTL_MS;
}

function withoutLogoReviewClaim(payload: Json) {
  const nextPayload = { ...jsonObject(payload) };
  delete nextPayload[LOGO_REVIEW_CLAIM_KEY];
  return sanitizeJsonObject(nextPayload);
}

async function cleanCandidateUpload(teamId: string, candidateUploadId: string) {
  const upload = await getManagedUploadRecord(candidateUploadId);
  if (!upload) return true;
  const ownedUpload = assertTeamLogoCandidateOwnership(teamId, candidateUploadId, upload);

  try {
    await deletePrivateObjectByKey(ownedUpload.filePath);
  } catch (error) {
    if (!isR2ObjectMissingError(error)) throw error;
  }
  await deleteUploadRecord(ownedUpload.id);
  return true;
}

async function reviewTeamLogoRequest(
  request: Request,
  input: {
    actorProfileId: string;
    adminNote: string;
    decision: "approved" | "rejected";
    requestRow: RosterRequestRow;
  },
) {
  const descriptor = readLogoCandidateDescriptor(input.requestRow);
  const client = getSupabaseServiceRoleClient();
  const team = await getCanonicalAdminTeam(input.requestRow.team_id);
  if (!team) {
    throw new TeamLogoApprovalError("The official team linked to this request no longer exists.", {
      code: "team_not_found",
      status: 404,
    });
  }

  let candidateUpload = await getManagedUploadRecord(descriptor.candidateUploadId);
  const alreadyActive = Boolean(team.logoUrl) && getActiveTeamLogoHash(team.sourceMetadata) === descriptor.expectedContentHash;
  if (candidateUpload) {
    candidateUpload = assertTeamLogoCandidateOwnership(team.id, descriptor.candidateUploadId, candidateUpload);
    if (candidateUpload.filePath !== descriptor.candidatePath) {
      throw new TeamLogoApprovalError("The pending logo metadata does not match the protected upload record.", {
        code: "team_logo_candidate_mismatch",
        status: 409,
      });
    }
  } else if (!alreadyActive && input.decision !== "rejected") {
    throw new TeamLogoApprovalError("The pending logo upload is missing. Ask the team to submit it again.", {
      code: "team_logo_candidate_missing",
      status: 409,
    });
  }

  const existingClaim = readLogoReviewClaim(input.requestRow);
  if (existingClaim) {
    if (
      existingClaim.decision !== input.decision ||
      existingClaim.candidateUploadId !== descriptor.candidateUploadId ||
      existingClaim.expectedContentHash !== descriptor.expectedContentHash
    ) {
      throw new TeamLogoApprovalError("This logo request is already being reviewed with a different decision or candidate.", {
        code: "request_conflict",
        status: 409,
      });
    }
    if (isLogoReviewClaimFresh(existingClaim.claimedAt)) {
      throw new TeamLogoApprovalError("This logo request is already being reviewed. Refresh after the current review finishes.", {
        code: "request_in_progress",
        status: 409,
      });
    }
  }
  if (input.requestRow.status !== "pending" && input.requestRow.status !== "review_later") {
    throw new TeamLogoApprovalError("This logo request is no longer available for review.", {
      code: "request_conflict",
      status: 409,
    });
  }
  const claimTime = new Date().toISOString();
  const claim: LogoReviewClaim = {
    candidateUploadId: descriptor.candidateUploadId,
    claimedAt: claimTime,
    decision: input.decision,
    expectedContentHash: descriptor.expectedContentHash,
    originalStatus: existingClaim?.originalStatus ?? input.requestRow.status,
    token: randomUUID(),
  };
  await writeRequiredAuditLogFromRequest(request, {
    action: "team_logo_review_claim_requested",
    entityId: input.requestRow.id,
    entityType: "team_request",
    oldValue: input.requestRow,
    newValue: {
      decision: claim.decision,
      status: "review_later",
    },
  });
  const claimPayload = sanitizeJsonObject({
    ...jsonObject(input.requestRow.payload),
    [LOGO_REVIEW_CLAIM_KEY]: {
      ...claim,
      actorProfileId: input.actorProfileId,
    },
  });
  const { data: claimedRequest, error: claimError } = await client
    .from("roster_requests")
    .update({
      payload: claimPayload,
      status: "review_later",
      updated_at: claimTime,
    })
    .eq("id", input.requestRow.id)
    .eq("team_id", team.id)
    .eq("status", input.requestRow.status)
    .eq("updated_at", input.requestRow.updated_at)
    .select(ROSTER_REQUEST_SELECT)
    .maybeSingle<RosterRequestRow>();
  if (claimError) throw claimError;
  if (!claimedRequest) {
    throw new TeamLogoApprovalError("This logo request changed while it was being reviewed. Refresh and try again.", {
      code: "request_conflict",
      status: 409,
    });
  }

  let activationCleanupPending = false;
  let activationCompleted = false;
  let reviewedData: RosterRequestRow | null = null;
  try {
    const reviewResult = await reviewPendingTeamLogoRequest(input.decision, {
      activateCandidate: async () => {
        if (alreadyActive) {
          activationCompleted = true;
          return team;
        }
        if (!candidateUpload?.filePath) {
          throw new TeamLogoApprovalError("The pending logo upload is missing.", {
            code: "team_logo_candidate_missing",
            status: 409,
          });
        }

        const candidateObject = await getPrivateObject(candidateUpload.filePath);
        const buffer = await readObjectBodyAsBuffer(candidateObject.Body);
        if (!buffer) {
          throw new TeamLogoApprovalError("The pending logo file could not be read.", {
            code: "team_logo_candidate_missing",
            status: 409,
          });
        }
        const expectedDate = descriptor.expectedUpdatedAt ? new Date(descriptor.expectedUpdatedAt) : null;
        const preparedImage = await prepareCanonicalPublicImageUpload({
          altText: `${team.name} logo`,
          assetName: "logo",
          buffer,
          declaredContentType: candidateUpload.contentType ?? candidateObject.ContentType,
          entityId: team.id,
          fileName: candidateUpload.fileName ?? "team-logo.png",
          ...(expectedDate && Number.isFinite(expectedDate.getTime()) ? { now: expectedDate } : {}),
          type: "team_logo",
        });
        if (preparedImage.metadata.contentHash !== descriptor.expectedContentHash) {
          throw new TeamLogoApprovalError("The pending logo contents do not match the audited request.", {
            code: "team_logo_candidate_hash_mismatch",
            status: 409,
          });
        }

        const currentMetadata = jsonObject(team.sourceMetadata);
        const currentAssets = jsonObject(currentMetadata.assets);
        const { metadata, objectKey, publicUrl } = preparedImage;
        const activationId = randomUUID();
        const activationMetadata = {
          ...metadata,
          activationId,
        };
        const activationResult = await replaceTeamLogoAtomically({
          cleanupNewArtifactsOnError: (error) =>
            !(error instanceof CanonicalTeamError && error.code === "team_logo_activation_unconfirmed"),
          createUploadRecord: () =>
            createUploadRecord({
              contentType: preparedImage.decoded.contentType,
              fileName: candidateUpload?.fileName ?? "team-logo.png",
              filePath: objectKey,
              fileType: "team_logo",
              fileUrl: publicUrl,
              id: randomUUID(),
              relatedId: team.id,
              relatedType: "team_logo",
              sizeBytes: preparedImage.decoded.sizeBytes,
              uploadedBy: input.actorProfileId,
            }),
          deleteNewObject: () => deletePublicObjectByKey(objectKey),
          deletePreviousObject: async () => {
            if (!team.logoUrl || team.logoUrl === publicUrl) return true;
            return deleteFromStorageByUrl(team.logoUrl);
          },
          deleteUploadRecord,
          revalidate: () => revalidateTeamAssetPaths(team.id, team.slug),
          updateCanonicalTeam: () =>
            replaceCanonicalTeamLogoWithCas(team.id, {
              expectedLogoUrl: team.logoUrl,
              expectedUpdatedAt: team.updatedAt,
              logoUrl: publicUrl,
              sourceMetadata: mergeTeamSourceMetadata(team.sourceMetadata, {
                assets: {
                  ...currentAssets,
                  logo: activationMetadata,
                },
              }),
            }),
          uploadNewObject: () => uploadPublicObjectAtKey(objectKey, buffer, preparedImage.decoded.contentType).then(() => undefined),
          verifyNewObject: () =>
            verifyPublicObjectDelivery(objectKey, {
              contentType: preparedImage.decoded.contentType,
              sizeBytes: preparedImage.decoded.sizeBytes,
            }),
          writeRequiredAudit: (uploadRecordId) =>
            writeRequiredAuditLogFromRequest(request, {
              action: "team_logo_approval_requested",
              entityId: team.id,
              entityType: "team",
              oldValue: {
                logoUrl: team.logoUrl,
              },
              newValue: {
                activationId,
                logo: activationMetadata,
                requestId: claimedRequest.id,
                uploadRecordId,
              },
            }).then(() => undefined),
        });
        activationCleanupPending = activationResult.cleanupPending;
        activationCompleted = true;
        return activationResult.team;
      },
      cleanupCandidate: () => cleanCandidateUpload(team.id, descriptor.candidateUploadId),
      markReviewed: async (decision) => {
        const now = new Date().toISOString();
        await writeRequiredAuditLogFromRequest(request, {
          action: `team_logo_request_${decision}_requested`,
          entityId: claimedRequest.id,
          entityType: "team_request",
          oldValue: claimedRequest,
          newValue: {
            adminNote: input.adminNote || null,
            status: decision,
          },
        });
        const { data, error } = await client
          .from("roster_requests")
          .update({
            admin_note: input.adminNote || null,
            payload: withoutLogoReviewClaim(claimedRequest.payload),
            reviewed_at: now,
            status: decision,
            updated_at: now,
          })
          .eq("id", claimedRequest.id)
          .eq("team_id", team.id)
          .eq("status", "review_later")
          .eq("updated_at", claimedRequest.updated_at)
          .select(ROSTER_REQUEST_SELECT)
          .maybeSingle<RosterRequestRow>();
        if (error) throw error;
        if (!data) {
          throw new TeamLogoApprovalError("This logo request changed while it was being finalized.", {
            code: "request_conflict",
            status: 409,
          });
        }
        reviewedData = data;
      },
    });

    return {
      cleanupPending: activationCleanupPending || reviewResult.cleanupPending,
      data: reviewedData,
      team: reviewResult.team,
    };
  } catch (error) {
    const activationMayBeCommitted =
      activationCompleted || (error instanceof CanonicalTeamError && error.code === "team_logo_activation_unconfirmed");
    if (!activationMayBeCommitted) {
      try {
        await client
          .from("roster_requests")
          .update({
            payload: withoutLogoReviewClaim(claimedRequest.payload),
            status: claim.originalStatus,
            updated_at: new Date().toISOString(),
          })
          .eq("id", claimedRequest.id)
          .eq("team_id", team.id)
          .eq("status", "review_later")
          .eq("updated_at", claimedRequest.updated_at);
      } catch {
        // A failed best-effort release leaves the scoped claim available for a
        // same-decision retry instead of permitting a competing review.
      }
    }
    throw error;
  }
}

export async function GET(request: Request) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  const client = getSupabaseServiceRoleClient();
  const [rosterRequestsResponse, mossSubmissionsResponse, teamsResponse, playersResponse, profilesResponse, eventsResponse] =
    await Promise.all([
      client
        .from("roster_requests")
        .select(
          "id,team_id,requested_by,request_type,status,admin_note,old_player_id,new_player_name,new_player_pubg_name,payload,created_at,updated_at,reviewed_at",
        )
        .order("created_at", { ascending: false }),
      client
        .from("moss_submissions")
        .select("id,event_id,match_id,team_id,player_id,file_url,external_link,status,admin_note,created_at,updated_at")
        .order("created_at", { ascending: false }),
      client.from("teams").select("id,name"),
      client.from("players").select("id,pubg_name,display_name"),
      client.from("profiles").select("id,display_name,email"),
      client.from("events").select("id,name,title"),
    ]);

  if (rosterRequestsResponse.error) {
    throw rosterRequestsResponse.error;
  }
  if (mossSubmissionsResponse.error) {
    throw mossSubmissionsResponse.error;
  }
  if (teamsResponse.error) {
    throw teamsResponse.error;
  }
  if (playersResponse.error) {
    throw playersResponse.error;
  }
  if (profilesResponse.error) {
    throw profilesResponse.error;
  }
  if (eventsResponse.error) {
    throw eventsResponse.error;
  }

  const teamNameById = new Map((teamsResponse.data ?? []).map((team) => [team.id, team.name] as const));
  const playerNameById = new Map(
    ((playersResponse.data ?? []) as PlayerRow[]).map((player) => [player.id, player.display_name ?? player.pubg_name] as const),
  );
  const profileById = new Map(
    ((profilesResponse.data ?? []) as ProfileRow[]).map(
      (profile) => [profile.id, { name: profile.display_name ?? profile.email, email: profile.email }] as const,
    ),
  );
  const eventNameById = new Map(((eventsResponse.data ?? []) as EventRow[]).map((event) => [event.id, event.name ?? event.title] as const));

  const data = {
    rosterRequests: ((rosterRequestsResponse.data ?? []) as RosterRequestRow[]).map((requestRow) => ({
      id: requestRow.id,
      teamId: requestRow.team_id,
      teamName: getUserFacingTeamLabel(teamNameById.get(requestRow.team_id)),
      requestedByName: requestRow.requested_by ? (profileById.get(requestRow.requested_by)?.name ?? null) : null,
      requestedByEmail: requestRow.requested_by ? (profileById.get(requestRow.requested_by)?.email ?? null) : null,
      requestType: requestRow.request_type,
      status: requestRow.status,
      adminNote: requestRow.admin_note,
      oldPlayerName: requestRow.old_player_id ? (playerNameById.get(requestRow.old_player_id) ?? null) : null,
      newPlayerName: requestRow.new_player_name,
      newPlayerPubgName: requestRow.new_player_pubg_name,
      payload: requestRow.payload,
      createdAt: requestRow.created_at,
      updatedAt: requestRow.updated_at ?? requestRow.reviewed_at,
    })),
    mossSubmissions: ((mossSubmissionsResponse.data ?? []) as MossSubmissionRow[]).map((submissionRow) => ({
      id: submissionRow.id,
      eventId: submissionRow.event_id,
      eventName: submissionRow.event_id ? (eventNameById.get(submissionRow.event_id) ?? null) : null,
      matchId: submissionRow.match_id,
      teamId: submissionRow.team_id,
      teamName: getUserFacingTeamLabel(teamNameById.get(submissionRow.team_id)),
      playerId: submissionRow.player_id,
      playerName: submissionRow.player_id ? (playerNameById.get(submissionRow.player_id) ?? null) : null,
      fileUrl: submissionRow.file_url,
      externalLink: submissionRow.external_link,
      status: submissionRow.status,
      adminNote: submissionRow.admin_note,
      createdAt: submissionRow.created_at,
      updatedAt: submissionRow.updated_at ?? null,
    })),
  };

  return Response.json({ success: true, data });
}

export async function PATCH(request: Request) {
  const invalidOrigin = requireSameOrigin(request);
  if (invalidOrigin) return invalidOrigin;
  const auth = await requirePlatformAdmin(request);
  if (auth.response) return auth.response;
  const limited = await enforceRateLimit(request, {
    key: "admin-team-request-review",
    maxRequests: 30,
    windowMs: 60_000,
  });
  if (limited) return limited;

  try {
    const body = await request.json();
    const kind = body.kind === "moss_submission" ? "moss_submission" : body.kind === "roster_request" ? "roster_request" : null;
    const id = typeof body.id === "string" ? body.id.trim() : "";
    const status = typeof body.status === "string" ? body.status.trim() : "";
    const adminNote = typeof body.adminNote === "string" ? body.adminNote.trim() : "";

    if (!kind || !id) {
      return Response.json({ error: "kind and id are required" }, { status: 400 });
    }

    const client = getSupabaseServiceRoleClient();
    const now = new Date().toISOString();

    if (kind === "roster_request") {
      if (!isRosterRequestStatus(status)) {
        return Response.json({ error: "Invalid roster request status" }, { status: 400 });
      }

      const { data: existingRequest, error: existingRequestError } = await client
        .from("roster_requests")
        .select(ROSTER_REQUEST_SELECT)
        .eq("id", id)
        .maybeSingle<RosterRequestRow>();
      if (existingRequestError) throw existingRequestError;
      if (!existingRequest) {
        return Response.json({ error: "Team request not found." }, { status: 404 });
      }
      if ((existingRequest.status === "approved" || existingRequest.status === "rejected") && status !== existingRequest.status) {
        return Response.json(
          {
            success: false,
            error: `This request is already ${existingRequest.status} and cannot be changed to ${status}.`,
            code: "team_request_already_reviewed",
          },
          { status: 409 },
        );
      }
      if ((existingRequest.status === "approved" || existingRequest.status === "rejected") && status === existingRequest.status) {
        let cleanupPending = false;
        if (existingRequest.request_type === "logo_update") {
          const candidateUploadId = jsonString(jsonObject(existingRequest.payload).candidateUploadId);
          if (candidateUploadId) {
            try {
              cleanupPending = !(await cleanCandidateUpload(existingRequest.team_id, candidateUploadId));
            } catch {
              cleanupPending = true;
            }
          }
        }
        return Response.json({ success: true, cleanupPending, data: existingRequest, team: null });
      }

      if (existingRequest.request_type === "logo_update" && existingRequest.status === "review_later" && status === "review_later") {
        return Response.json({
          success: true,
          cleanupPending: false,
          data: existingRequest,
          team: null,
          message: "This logo request is already set aside for later review.",
        });
      }
      if (
        existingRequest.request_type === "logo_update" &&
        hasLogoReviewClaimPayload(existingRequest) &&
        status !== "approved" &&
        status !== "rejected"
      ) {
        return Response.json(
          {
            success: false,
            error: "This logo request has an active review decision and cannot be moved to another intermediate state.",
            code: "request_in_progress",
          },
          { status: 409 },
        );
      }

      if (existingRequest.request_type === "logo_update" && (status === "approved" || status === "rejected")) {
        const result = await reviewTeamLogoRequest(request, {
          actorProfileId: auth.session.profileId,
          adminNote,
          decision: status,
          requestRow: existingRequest,
        });
        return Response.json({ success: true, ...result });
      }

      await writeRequiredAuditLogFromRequest(request, {
        action: "team_request_review_requested",
        entityType: "team_request",
        entityId: id,
        oldValue: existingRequest,
        newValue: {
          adminNote: adminNote || null,
          status,
        },
      });
      const { data, error } = await client
        .from("roster_requests")
        .update({
          status,
          admin_note: adminNote || null,
          reviewed_at: status === "pending" ? null : now,
          updated_at: now,
        })
        .eq("id", id)
        .eq("updated_at", existingRequest.updated_at)
        .select(ROSTER_REQUEST_SELECT)
        .maybeSingle();

      if (error) {
        throw error;
      }
      if (!data) {
        return Response.json(
          { success: false, error: "This request changed while it was being reviewed. Refresh and try again.", code: "request_conflict" },
          { status: 409 },
        );
      }

      return Response.json({ success: true, data });
    }

    if (!isMossSubmissionStatus(status)) {
      return Response.json({ error: "Invalid MOSS submission status" }, { status: 400 });
    }

    const mossSelect = "id,event_id,match_id,team_id,player_id,file_url,external_link,status,admin_note,created_at,updated_at";
    const { data: existingSubmission, error: existingSubmissionError } = await client
      .from("moss_submissions")
      .select(mossSelect)
      .eq("id", id)
      .maybeSingle<MossSubmissionRow>();
    if (existingSubmissionError) throw existingSubmissionError;
    if (!existingSubmission) {
      return Response.json({ error: "MOSS submission not found." }, { status: 404 });
    }
    if ((existingSubmission.status === "approved" || existingSubmission.status === "rejected") && status !== existingSubmission.status) {
      return Response.json(
        {
          success: false,
          error: `This submission is already ${existingSubmission.status} and cannot be changed to ${status}.`,
          code: "moss_submission_already_reviewed",
        },
        { status: 409 },
      );
    }
    await writeRequiredAuditLogFromRequest(request, {
      action: "moss_submission_review_requested",
      entityType: "moss_submission",
      entityId: id,
      oldValue: existingSubmission,
      newValue: {
        adminNote: adminNote || null,
        status,
      },
    });
    const { data, error } = await client
      .from("moss_submissions")
      .update({
        status,
        admin_note: adminNote || null,
        updated_at: now,
      })
      .eq("id", id)
      .eq("updated_at", existingSubmission.updated_at)
      .select(mossSelect)
      .maybeSingle();

    if (error) {
      throw error;
    }
    if (!data) {
      return Response.json(
        { success: false, error: "This submission changed while it was being reviewed. Refresh and try again.", code: "request_conflict" },
        { status: 409 },
      );
    }

    return Response.json({ success: true, data });
  } catch (error: unknown) {
    await logServerError("admin.team-requests.review", error, request);
    if (error instanceof TeamLogoApprovalError) {
      return Response.json({ success: false, error: error.message, code: error.code }, { status: error.status });
    }
    return Response.json(
      {
        error: toUserFacingErrorMessage(error, {
          status: 500,
          fallback: "The team request could not be reviewed right now.",
        }),
      },
      { status: 500 },
    );
  }
}
