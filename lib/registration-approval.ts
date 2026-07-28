import "server-only";

import { randomUUID } from "node:crypto";
import { writeRequiredAuditLogFromRequest } from "./audit-logs";
import { prepareCanonicalPublicImageUpload } from "./canonical-image-upload";
import {
  type CanonicalAdminTeam,
  CanonicalTeamError,
  createCanonicalAdminTeam,
  getCanonicalAdminTeam,
  isCanonicalTeamId,
  listCanonicalAdminTeams,
  mergeTeamSourceMetadata,
  replaceCanonicalTeamLogoWithCas,
} from "./canonical-teams";
import { updateRegistrationStatus } from "./data";
import { COLLECTIONS, DocumentWriteConflictError, getDocument } from "./document-store";
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
} from "./r2/storage";
import {
  buildRegistrationApprovalExpectation,
  classifyRegistrationApprovalReread,
  type RegistrationApprovalUpdates,
} from "./registration-approval-state";
import { revalidateCompetitionPaths, revalidateTeamPaths } from "./revalidate-public";
import { getSupabaseServiceRoleClient } from "./supabase/service-role-client";
import { replaceTeamLogoAtomically } from "./team-logo-service";
import { normalizeCanonicalTeamIdentity } from "./team-reconciliation";
import type { TeamRegistration } from "./types";
import { createUploadRecord, deleteUploadRecord, listPendingRegistrationLogoUploadRecords } from "./upload-records";
import type { Json, Tables } from "@/types/database.types";

type RegistrationApprovalResult = Awaited<ReturnType<typeof updateRegistrationStatus>> | TeamRegistration;
type TeamLifecycleRow = Pick<
  Tables<"teams">,
  "archived_at" | "deleted_at" | "id" | "is_active" | "merged_into_team_id" | "name" | "normalized_name" | "status" | "tag"
>;
const REGISTRATION_APPROVAL_CLAIM_TTL_MS = 5 * 60 * 1000;

export class RegistrationApprovalError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(message: string, options: { code: string; status: number }) {
    super(message);
    this.name = "RegistrationApprovalError";
    this.code = options.code;
    this.status = options.status;
  }
}

export class RegistrationApprovalRollbackError extends Error {
  readonly preserveNewLogoArtifacts = true;

  constructor(message: string, options: { cause: unknown }) {
    super(message, options);
    this.name = "RegistrationApprovalRollbackError";
  }
}

function normalizeOptionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function jsonObject(value: Json) {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value : {};
}

function isActiveCanonicalTeam(team: CanonicalAdminTeam) {
  return team.isActive && team.status.trim().toLowerCase() === "active" && !team.archivedAt && !team.mergedIntoTeamId;
}

function assertActiveCanonicalTeam(team: CanonicalAdminTeam) {
  if (!isActiveCanonicalTeam(team)) {
    throw new RegistrationApprovalError(
      "This registration matches an inactive, archived, or merged official team. Reconcile that team explicitly before approval.",
      {
        code: "canonical_team_inactive",
        status: 409,
      },
    );
  }
  return team;
}

async function listMatchingTeamLifecycleRows(teamName: string, teamTag?: string) {
  const client = getSupabaseServiceRoleClient();
  const { data, error } = await client
    .from("teams")
    .select("id,name,tag,normalized_name,status,is_active,archived_at,merged_into_team_id,deleted_at");
  if (error) throw error;

  const normalizedName = normalizeCanonicalTeamIdentity(teamName);
  const normalizedTag = teamTag ? normalizeCanonicalTeamIdentity(teamTag) : "";
  return ((data ?? []) as TeamLifecycleRow[]).filter((team) => {
    const identities = [team.normalized_name, team.name, team.tag]
      .filter((value): value is string => Boolean(value?.trim()))
      .map((value) => normalizeCanonicalTeamIdentity(value));
    return identities.includes(normalizedName) || Boolean(normalizedTag && identities.includes(normalizedTag));
  });
}

async function resolveCanonicalTeamForApproval(registration: TeamRegistration) {
  if (registration.approvedTeamId) {
    if (!isCanonicalTeamId(registration.approvedTeamId)) {
      throw new RegistrationApprovalError(
        "This registration has a legacy team reference. Reconcile it with an official team before approval.",
        {
          code: "legacy_team_reference",
          status: 409,
        },
      );
    }
    const linkedTeam = await getCanonicalAdminTeam(registration.approvedTeamId);
    if (!linkedTeam) {
      const unavailableRows = await listMatchingTeamLifecycleRows(registration.teamName, registration.teamTag);
      const deletedLinkedTeam = unavailableRows.find((team) => team.id === registration.approvedTeamId && team.deleted_at);
      throw new RegistrationApprovalError(
        deletedLinkedTeam
          ? "The official team linked to this registration was deleted and cannot be restored by approval."
          : "The official team linked to this registration no longer exists. Reconcile it before approval.",
        {
          code: deletedLinkedTeam ? "canonical_team_deleted" : "canonical_team_missing",
          status: 409,
        },
      );
    }
    return {
      created: false,
      team: assertActiveCanonicalTeam(linkedTeam),
    };
  }

  const normalizedName = normalizeCanonicalTeamIdentity(registration.teamName);
  const normalizedTag = registration.teamTag ? normalizeCanonicalTeamIdentity(registration.teamTag) : "";
  const identityCandidates = (await listCanonicalAdminTeams()).filter((team) => {
    const identities = [team.normalizedName, team.name, team.tag, team.slug, ...team.aliases.map((alias) => alias.normalizedAlias)]
      .filter((value): value is string => Boolean(value?.trim()))
      .map((value) => normalizeCanonicalTeamIdentity(value));
    return identities.includes(normalizedName) || Boolean(normalizedTag && identities.includes(normalizedTag));
  });
  const canonicalCandidates = identityCandidates.filter(isActiveCanonicalTeam);
  if (canonicalCandidates.length > 1) {
    throw new RegistrationApprovalError("More than one official team matches this registration. Reconcile the duplicate before approval.", {
      code: "canonical_team_ambiguous",
      status: 409,
    });
  }
  if (canonicalCandidates[0]) {
    return {
      created: false,
      team: assertActiveCanonicalTeam(canonicalCandidates[0]),
    };
  }

  if (identityCandidates.length > 0) {
    throw new RegistrationApprovalError(
      "This registration matches an inactive, archived, or merged official team. Reconcile that record explicitly before approval.",
      {
        code: "canonical_team_unavailable",
        status: 409,
      },
    );
  }

  const lifecycleMatches = await listMatchingTeamLifecycleRows(registration.teamName, registration.teamTag);
  if (lifecycleMatches.length > 0) {
    throw new RegistrationApprovalError(
      "This registration matches a deleted, inactive, archived, or merged official team. Reconcile that record explicitly before approval.",
      {
        code: "canonical_team_unavailable",
        status: 409,
      },
    );
  }

  try {
    const team = await createCanonicalAdminTeam({
      isActive: true,
      name: registration.teamName,
      sourceMetadata: {
        registration: {
          approvedRegistrationId: registration.id,
          source: "public_team_registration",
        },
      },
      status: "active",
      tag: registration.teamTag ?? null,
      verificationStatus: "registered",
    });
    if (!isCanonicalTeamId(team.id)) {
      throw new RegistrationApprovalError("The official team registry returned an invalid identifier.", {
        code: "invalid_canonical_team_id",
        status: 500,
      });
    }
    return {
      created: true,
      team,
    };
  } catch (error) {
    const concurrentMatches = await listMatchingTeamLifecycleRows(registration.teamName, registration.teamTag);
    if (concurrentMatches.length === 1 && !concurrentMatches[0].deleted_at) {
      const concurrentTeam = await getCanonicalAdminTeam(concurrentMatches[0].id);
      if (concurrentTeam) {
        return {
          created: false,
          team: assertActiveCanonicalTeam(concurrentTeam),
        };
      }
    }
    throw error;
  }
}

function shouldPreserveUnconfirmedLogoArtifacts(error: unknown) {
  return (
    error instanceof RegistrationApprovalRollbackError ||
    (error instanceof CanonicalTeamError && error.code === "team_logo_activation_unconfirmed")
  );
}

export async function cleanupPendingRegistrationLogoCandidates(registrationId: string) {
  let candidateUploads;
  try {
    candidateUploads = await listPendingRegistrationLogoUploadRecords(registrationId);
  } catch {
    return true;
  }

  let cleanupPending = false;
  for (const candidateUpload of candidateUploads) {
    if (!candidateUpload.path) {
      cleanupPending = true;
      continue;
    }

    let candidateObjectDeleted = false;
    try {
      await deletePrivateObjectByKey(candidateUpload.path);
      candidateObjectDeleted = true;
    } catch (error) {
      if (isR2ObjectMissingError(error)) {
        candidateObjectDeleted = true;
      } else {
        cleanupPending = true;
      }
    }

    if (candidateObjectDeleted) {
      try {
        await deleteUploadRecord(candidateUpload.id);
      } catch {
        cleanupPending = true;
      }
    }
  }

  return cleanupPending;
}

function registrationLinkUpdates(registration: TeamRegistration): Partial<Omit<TeamRegistration, "id" | "status" | "createdAt">> {
  return {
    approvedTeamId: registration.approvedTeamId,
    logoPath: registration.logoPath,
    logoUploadId: registration.logoUploadId,
    logoUrl: registration.logoUrl,
    tournamentId: registration.tournamentId,
    tournamentTitle: registration.tournamentTitle,
  };
}

async function claimRegistrationForApproval(registration: TeamRegistration, actorProfileId: string) {
  if (registration.status !== "pending") {
    throw new RegistrationApprovalError("Only a pending registration can be approved.", {
      code: "registration_already_reviewed",
      status: 409,
    });
  }

  if (registration.approvalClaimToken) {
    const claimedAt = Date.parse(registration.approvalClaimedAt ?? "");
    const claimIsFresh = !Number.isFinite(claimedAt) || Date.now() - claimedAt < REGISTRATION_APPROVAL_CLAIM_TTL_MS;
    if (claimIsFresh) {
      throw new RegistrationApprovalError("This registration is already being approved. Refresh after the current review finishes.", {
        code: "registration_approval_in_progress",
        status: 409,
      });
    }
  }

  const claimTime = new Date().toISOString();
  try {
    return await updateRegistrationStatus(
      registration.id,
      "pending",
      {
        ...registrationLinkUpdates(registration),
        approvalClaimToken: randomUUID(),
        approvalClaimedAt: claimTime,
        approvalClaimedBy: actorProfileId,
      },
      {
        expectedRegistration: registration,
      },
    );
  } catch (error) {
    if (error instanceof DocumentWriteConflictError) {
      throw new RegistrationApprovalError("This registration changed before approval could begin. Refresh and try again.", {
        code: "registration_conflict",
        status: 409,
      });
    }
    throw error;
  }
}

async function releaseRegistrationApprovalClaim(registration: TeamRegistration) {
  if (!registration.approvalClaimToken) return;
  await updateRegistrationStatus(
    registration.id,
    "pending",
    {
      ...registrationLinkUpdates(registration),
      approvalClaimToken: undefined,
      approvalClaimedAt: undefined,
      approvalClaimedBy: undefined,
    },
    {
      expectedRegistration: registration,
    },
  );
}

async function rereadRegistrationForApproval(registrationId: string) {
  return getDocument<TeamRegistration>(COLLECTIONS.registrations, registrationId);
}

async function updateRegistrationApprovalWithConfirmation(
  registration: TeamRegistration,
  updates: RegistrationApprovalUpdates,
): Promise<RegistrationApprovalResult> {
  const expected = buildRegistrationApprovalExpectation(registration, updates);
  try {
    return await updateRegistrationStatus(
      registration.id,
      "approved",
      {
        ...updates,
        approvalClaimToken: undefined,
        approvalClaimedAt: undefined,
        approvalClaimedBy: undefined,
      },
      {
        expectedRegistration: registration,
      },
    );
  } catch (updateError) {
    let current: TeamRegistration | null;
    try {
      current = await rereadRegistrationForApproval(registration.id);
    } catch (confirmationError) {
      throw new RegistrationApprovalRollbackError(
        "The registration approval response failed and its saved state could not be verified. The official team state was retained for recovery.",
        {
          cause: { confirmationError, updateError },
        },
      );
    }

    const outcome = classifyRegistrationApprovalReread(registration, expected, current);
    if (outcome === "committed" && current) return current;
    if (updateError instanceof DocumentWriteConflictError) {
      throw new RegistrationApprovalError("This registration changed while it was being approved. Refresh and review its current state.", {
        code: "registration_conflict",
        status: 409,
      });
    }
    if (outcome === "unchanged") throw updateError;
    throw new RegistrationApprovalRollbackError(
      "The registration approval response failed and the saved state is ambiguous. The official team state was retained for recovery.",
      {
        cause: { current, updateError },
      },
    );
  }
}

async function approveRegistrationLogo(
  request: Request,
  input: {
    actorProfileId: string;
    registration: TeamRegistration;
    team: CanonicalAdminTeam;
    onCanonicalRestore: (team: CanonicalAdminTeam) => void;
  },
) {
  const { registration, team } = input;
  const uploadId = normalizeOptionalString(registration.logoUploadId);
  const logoPath = normalizeOptionalString(registration.logoPath);
  const logoUrl = normalizeOptionalString(registration.logoUrl);
  if (!uploadId && !logoPath && !logoUrl) {
    const approvedRegistration = await updateRegistrationApprovalWithConfirmation(registration, {
      approvedTeamId: team.id,
      logoPath: undefined,
      logoUploadId: undefined,
      logoUrl: undefined,
      tournamentId: registration.tournamentId,
      tournamentTitle: registration.tournamentTitle,
    });
    return {
      cleanupPending: false,
      registration: approvedRegistration,
      team,
    };
  }
  if (!uploadId || !logoPath || !logoUrl) {
    throw new RegistrationApprovalError("The submitted logo metadata is incomplete. Ask the team to upload the logo again.", {
      code: "registration_logo_incomplete",
      status: 409,
    });
  }

  const candidateUpload = await getManagedUploadRecord(uploadId);
  if (
    !candidateUpload ||
    candidateUpload.fileType !== "team_logo_pending" ||
    candidateUpload.relatedType !== "team_registration" ||
    candidateUpload.relatedId !== registration.id ||
    candidateUpload.filePath !== logoPath ||
    candidateUpload.url !== logoUrl
  ) {
    throw new RegistrationApprovalError("The submitted logo is not a verified candidate for this registration.", {
      code: "invalid_registration_logo_candidate",
      status: 409,
    });
  }

  const privateObject = await getPrivateObject(candidateUpload.filePath);
  const buffer = await readObjectBodyAsBuffer(privateObject.Body);
  if (!buffer) {
    throw new RegistrationApprovalError("The submitted logo could not be loaded from private storage.", {
      code: "registration_logo_missing",
      status: 409,
    });
  }
  const fileName = candidateUpload.fileName ?? `${registration.teamName}.png`;
  const declaredContentType = privateObject.ContentType ?? candidateUpload.contentType;
  const preparedImage = await prepareCanonicalPublicImageUpload({
    altText: `${team.name} logo`,
    assetName: "logo",
    buffer,
    declaredContentType,
    entityId: team.id,
    fileName,
    type: "team_logo",
  });
  const currentMetadata = jsonObject(team.sourceMetadata);
  const currentAssets = jsonObject((currentMetadata.assets ?? {}) as Json);
  const nextSourceMetadata = mergeTeamSourceMetadata(team.sourceMetadata, {
    assets: {
      ...currentAssets,
      logo: preparedImage.metadata,
    },
    registration: {
      approvedRegistrationId: registration.id,
      source: "public_team_registration",
    },
  });
  const activeUploadRecordId = randomUUID();
  let approvedRegistration: RegistrationApprovalResult | null = null;

  const replacement = await replaceTeamLogoAtomically({
    cleanupNewArtifactsOnError: (error) => !shouldPreserveUnconfirmedLogoArtifacts(error),
    createUploadRecord: () =>
      createUploadRecord({
        contentType: preparedImage.decoded.contentType,
        fileName,
        filePath: preparedImage.objectKey,
        fileType: "team_logo",
        fileUrl: preparedImage.publicUrl,
        id: activeUploadRecordId,
        relatedId: team.id,
        relatedType: "team_registration_approved",
        sizeBytes: preparedImage.decoded.sizeBytes,
        uploadedBy: input.actorProfileId,
      }),
    deleteNewObject: () => deletePublicObjectByKey(preparedImage.objectKey),
    deletePreviousObject: async () => {
      if (!team.logoUrl || team.logoUrl === preparedImage.publicUrl) return true;
      return deleteFromStorageByUrl(team.logoUrl);
    },
    deleteUploadRecord,
    revalidate: () => {
      revalidateTeamPaths(team.id);
      revalidateCompetitionPaths();
    },
    updateCanonicalTeam: async () => {
      const activatedTeam = await replaceCanonicalTeamLogoWithCas(team.id, {
        expectedLogoUrl: team.logoUrl,
        expectedUpdatedAt: team.updatedAt,
        logoUrl: preparedImage.publicUrl,
        sourceMetadata: nextSourceMetadata,
      });
      try {
        approvedRegistration = await updateRegistrationApprovalWithConfirmation(registration, {
          approvedTeamId: activatedTeam.id,
          logoPath: preparedImage.objectKey,
          logoUploadId: activeUploadRecordId,
          logoUrl: preparedImage.publicUrl,
          tournamentId: registration.tournamentId,
          tournamentTitle: registration.tournamentTitle,
        });
      } catch (error) {
        if (shouldPreserveUnconfirmedLogoArtifacts(error)) throw error;
        try {
          const restoredTeam = await replaceCanonicalTeamLogoWithCas(team.id, {
            expectedLogoUrl: preparedImage.publicUrl,
            expectedUpdatedAt: activatedTeam.updatedAt,
            logoUrl: team.logoUrl,
            sourceMetadata: team.sourceMetadata,
          });
          input.onCanonicalRestore(restoredTeam);
        } catch (rollbackError) {
          throw new RegistrationApprovalRollbackError(
            "The registration update failed and the official logo state could not be safely restored. The uploaded version was retained for recovery.",
            {
              cause: { registrationError: error, rollbackError },
            },
          );
        }
        throw error;
      }
      return activatedTeam;
    },
    uploadNewObject: () =>
      uploadPublicObjectAtKey(preparedImage.objectKey, buffer, preparedImage.decoded.contentType).then(() => undefined),
    verifyNewObject: () =>
      verifyPublicObjectDelivery(preparedImage.objectKey, {
        contentType: preparedImage.decoded.contentType,
        sizeBytes: preparedImage.decoded.sizeBytes,
      }),
    writeRequiredAudit: (uploadRecordId) =>
      writeRequiredAuditLogFromRequest(request, {
        action: "promote_registration_logo_requested",
        entityId: team.id,
        entityType: "team",
        oldValue: {
          logoUrl: team.logoUrl,
          registrationId: registration.id,
        },
        newValue: {
          logo: preparedImage.metadata,
          registrationId: registration.id,
          uploadRecordId,
        },
      }).then(() => undefined),
  });

  if (!approvedRegistration) {
    throw new RegistrationApprovalRollbackError("The registration approval result could not be confirmed.", {
      cause: new Error("Registration update returned no result."),
    });
  }

  const candidateCleanupPending = await cleanupPendingRegistrationLogoCandidates(registration.id);
  const cleanupPending = replacement.cleanupPending || candidateCleanupPending;

  return {
    cleanupPending,
    registration: approvedRegistration,
    team: replacement.team,
  };
}

export async function approveCanonicalTeamRegistration(
  request: Request,
  input: {
    actorProfileId: string;
    registration: TeamRegistration;
  },
) {
  const registration = await claimRegistrationForApproval(input.registration, input.actorProfileId);
  let createdTeamRecoveryTarget: CanonicalAdminTeam | null = null;
  try {
    const resolution = await resolveCanonicalTeamForApproval(registration);
    if (resolution.created) createdTeamRecoveryTarget = resolution.team;
    await writeRequiredAuditLogFromRequest(request, {
      action: resolution.created ? "create_from_registration_requested" : "link_registration_requested",
      entityId: resolution.team.id,
      entityType: "team",
      oldValue: resolution.created
        ? null
        : {
            isActive: resolution.team.isActive,
            status: resolution.team.status,
          },
      newValue: {
        registrationId: registration.id,
        teamId: resolution.team.id,
      },
    });
    const approval = await approveRegistrationLogo(request, {
      actorProfileId: input.actorProfileId,
      registration,
      team: resolution.team,
      onCanonicalRestore: (restoredTeam) => {
        if (createdTeamRecoveryTarget) createdTeamRecoveryTarget = restoredTeam;
      },
    });
    createdTeamRecoveryTarget = null;
    try {
      revalidateTeamPaths(approval.team.id);
      revalidateCompetitionPaths();
    } catch {
      // The mutation is already committed. Cache refresh failures are safe to
      // retry and must never trigger canonical-team compensation.
    }
    return approval;
  } catch (error) {
    if (createdTeamRecoveryTarget) {
      try {
        await writeRequiredAuditLogFromRequest(request, {
          action: "retain_registration_team_for_recovery",
          entityId: createdTeamRecoveryTarget.id,
          entityType: "team",
          oldValue: null,
          newValue: {
            registrationId: registration.id,
            teamId: createdTeamRecoveryTarget.id,
          },
        });
      } catch {
        // The retained team's source metadata still identifies the registration
        // when the audit backend itself is unavailable.
      }
    }
    await releaseRegistrationApprovalClaim(registration).catch(() => undefined);
    throw error;
  }
}
