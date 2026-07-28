export type TeamLogoReplacementResult<TTeam> = {
  cleanupPending: boolean;
  team: TTeam;
  uploadRecordId: string;
};

export type TeamLogoReplacementDependencies<TTeam> = {
  cleanupNewArtifactsOnError?: (error: unknown) => boolean;
  createUploadRecord: () => Promise<{ id: string }>;
  deleteNewObject: () => Promise<void>;
  deletePreviousObject: () => Promise<boolean>;
  deleteUploadRecord: (uploadRecordId: string) => Promise<void>;
  revalidate: () => void;
  updateCanonicalTeam: () => Promise<TTeam>;
  uploadNewObject: () => Promise<void>;
  verifyNewObject: () => Promise<void>;
  writeRequiredAudit: (uploadRecordId: string) => Promise<void>;
};

export async function replaceTeamLogoAtomically<TTeam>(
  dependencies: TeamLogoReplacementDependencies<TTeam>,
): Promise<TeamLogoReplacementResult<TTeam>> {
  let uploaded = false;
  let uploadRecordId: string | null = null;

  try {
    await dependencies.uploadNewObject();
    uploaded = true;
    await dependencies.verifyNewObject();
    const uploadRecord = await dependencies.createUploadRecord();
    uploadRecordId = uploadRecord.id;
    await dependencies.writeRequiredAudit(uploadRecord.id);
    const team = await dependencies.updateCanonicalTeam();

    let cleanupPending = false;
    try {
      dependencies.revalidate();
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
    const cleanupNewArtifacts = dependencies.cleanupNewArtifactsOnError?.(error) ?? true;
    if (cleanupNewArtifacts) {
      if (uploadRecordId) {
        await dependencies.deleteUploadRecord(uploadRecordId).catch(() => undefined);
      }
      if (uploaded) {
        await dependencies.deleteNewObject().catch(() => undefined);
      }
    }
    throw error;
  }
}
