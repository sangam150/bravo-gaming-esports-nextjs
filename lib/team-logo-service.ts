export type TeamLogoReplacementResult<TTeam> = {
  cleanupPending: boolean;
  team: TTeam;
  uploadRecordId: string;
};

export type ActivatedAssetDeliveryFailure = {
  deliveryError: unknown;
  rollbackConfirmed: boolean;
  rollbackError: unknown | null;
  uploadRecordId: string;
};

export class ActiveAssetDeliveryError extends Error {
  readonly auditRecorded: boolean;
  readonly code = "active_asset_delivery_failed";
  readonly rollbackConfirmed: boolean;
  readonly status: number;

  constructor(options: {
    auditError: unknown | null;
    auditRecorded: boolean;
    deliveryError: unknown;
    revalidationError: unknown | null;
    rollbackConfirmed: boolean;
    rollbackError: unknown | null;
  }) {
    super(
      options.rollbackConfirmed
        ? "The new image could not be verified after activation. The previous image was restored safely."
        : "The new image could not be verified after activation, and its database rollback could not be confirmed. Both image objects were retained for recovery.",
      {
        cause: {
          auditError: options.auditError,
          deliveryError: options.deliveryError,
          revalidationError: options.revalidationError,
          rollbackError: options.rollbackError,
        },
      },
    );
    this.name = "ActiveAssetDeliveryError";
    this.auditRecorded = options.auditRecorded;
    this.rollbackConfirmed = options.rollbackConfirmed;
    this.status = options.rollbackConfirmed ? 502 : 503;
  }
}

export type TeamLogoReplacementDependencies<TTeam> = {
  cleanupNewArtifactsOnError?: (error: unknown) => boolean;
  createUploadRecord: () => Promise<{ id: string }>;
  deleteNewObject: () => Promise<void>;
  deletePreviousObject: () => Promise<boolean>;
  deleteUploadRecord: (uploadRecordId: string) => Promise<void>;
  revalidate: () => Promise<void> | void;
  rollbackCanonicalTeam: (activatedTeam: TTeam) => Promise<void>;
  updateCanonicalTeam: () => Promise<TTeam>;
  uploadNewObject: () => Promise<void>;
  verifyActivatedDelivery: (activatedTeam: TTeam) => Promise<void>;
  verifyNewObject: () => Promise<void>;
  writeDeliveryFailureAudit: (failure: ActivatedAssetDeliveryFailure) => Promise<void>;
  writeRequiredAudit: (uploadRecordId: string) => Promise<void>;
};

export async function replaceTeamLogoAtomically<TTeam>(
  dependencies: TeamLogoReplacementDependencies<TTeam>,
): Promise<TeamLogoReplacementResult<TTeam>> {
  let uploaded = false;
  let uploadRecordId: string | null = null;
  let postActivationCleanupAllowed: boolean | null = null;

  try {
    await dependencies.uploadNewObject();
    uploaded = true;
    await dependencies.verifyNewObject();
    const uploadRecord = await dependencies.createUploadRecord();
    uploadRecordId = uploadRecord.id;
    await dependencies.writeRequiredAudit(uploadRecord.id);
    const team = await dependencies.updateCanonicalTeam();

    try {
      await dependencies.verifyActivatedDelivery(team);
    } catch (deliveryError) {
      let rollbackConfirmed = false;
      let rollbackError: unknown | null = null;
      try {
        await dependencies.rollbackCanonicalTeam(team);
        rollbackConfirmed = true;
      } catch (error) {
        rollbackError = error;
      }

      let auditRecorded = false;
      let auditError: unknown | null = null;
      try {
        await dependencies.writeDeliveryFailureAudit({
          deliveryError,
          rollbackConfirmed,
          rollbackError,
          uploadRecordId: uploadRecord.id,
        });
        auditRecorded = true;
      } catch (error) {
        auditError = error;
      }

      let revalidationError: unknown | null = null;
      try {
        await dependencies.revalidate();
      } catch (error) {
        revalidationError = error;
      }

      // The replacement object is safe to remove only after both the CAS
      // rollback and public cache revalidation are confirmed. Otherwise a
      // committed or cached active reference could still point at it.
      postActivationCleanupAllowed = rollbackConfirmed && !revalidationError;
      throw new ActiveAssetDeliveryError({
        auditError,
        auditRecorded,
        deliveryError,
        revalidationError,
        rollbackConfirmed,
        rollbackError,
      });
    }

    let cleanupPending = false;
    try {
      await dependencies.revalidate();
    } catch {
      cleanupPending = true;
    }

    if (!cleanupPending) {
      try {
        const previousObjectDeleted = await dependencies.deletePreviousObject();
        if (!previousObjectDeleted) {
          cleanupPending = true;
        }
      } catch {
        cleanupPending = true;
      }
    }

    return {
      cleanupPending,
      team,
      uploadRecordId: uploadRecord.id,
    };
  } catch (error) {
    const cleanupNewArtifacts = postActivationCleanupAllowed ?? dependencies.cleanupNewArtifactsOnError?.(error) ?? true;
    if (cleanupNewArtifacts) {
      let objectDeleted = !uploaded;
      if (uploaded) {
        try {
          await dependencies.deleteNewObject();
          objectDeleted = true;
        } catch {
          objectDeleted = false;
        }
      }
      if (uploadRecordId && objectDeleted) {
        await dependencies.deleteUploadRecord(uploadRecordId).catch(() => undefined);
      }
    }
    throw error;
  }
}
