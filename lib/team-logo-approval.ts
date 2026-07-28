export type TeamLogoCandidateUpload = {
  filePath: string | null;
  fileType: string;
  id: string;
  relatedId?: string | null;
  relatedType: string;
};

export class TeamLogoApprovalError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(message: string, options: { code: string; status: number }) {
    super(message);
    this.name = "TeamLogoApprovalError";
    this.code = options.code;
    this.status = options.status;
  }
}

export function assertTeamLogoCandidateOwnership<TUpload extends TeamLogoCandidateUpload>(
  teamId: string,
  candidateUploadId: string,
  upload: TUpload | null,
): TUpload & { filePath: string } {
  if (
    !upload ||
    upload.id !== candidateUploadId ||
    !upload.filePath ||
    upload.fileType !== "team_logo_pending" ||
    upload.relatedType !== "team_logo_candidate" ||
    upload.relatedId !== teamId
  ) {
    throw new TeamLogoApprovalError("The pending logo does not belong to this official team.", {
      code: "invalid_team_logo_candidate",
      status: 403,
    });
  }
  return {
    ...upload,
    filePath: upload.filePath,
  };
}

export async function createPendingTeamLogoRequest<TRequest>(dependencies: {
  createRequest: (uploadRecordId: string) => Promise<TRequest>;
  createUploadRecord: () => Promise<{ id: string }>;
  deleteCandidateObject: () => Promise<void>;
  deleteUploadRecord: (uploadRecordId: string) => Promise<void>;
  uploadCandidate: () => Promise<void>;
  verifyCandidate: () => Promise<void>;
  writeRequiredAudit: (uploadRecordId: string) => Promise<void>;
}) {
  let uploaded = false;
  let uploadRecordId: string | null = null;

  try {
    await dependencies.uploadCandidate();
    uploaded = true;
    await dependencies.verifyCandidate();
    const record = await dependencies.createUploadRecord();
    uploadRecordId = record.id;
    await dependencies.writeRequiredAudit(record.id);
    const request = await dependencies.createRequest(record.id);
    return {
      request,
      uploadRecordId: record.id,
    };
  } catch (error) {
    if (uploadRecordId) {
      await dependencies.deleteUploadRecord(uploadRecordId).catch(() => undefined);
    }
    if (uploaded) {
      await dependencies.deleteCandidateObject().catch(() => undefined);
    }
    throw error;
  }
}

export async function reviewPendingTeamLogoRequest<TTeam>(
  decision: "approved" | "rejected",
  dependencies: {
    activateCandidate: () => Promise<TTeam>;
    cleanupCandidate: () => Promise<boolean>;
    markReviewed: (decision: "approved" | "rejected") => Promise<void>;
  },
) {
  let team: TTeam | null = null;
  if (decision === "approved") {
    team = await dependencies.activateCandidate();
  }

  await dependencies.markReviewed(decision);

  let cleanupPending = false;
  try {
    cleanupPending = !(await dependencies.cleanupCandidate());
  } catch {
    cleanupPending = true;
  }

  return {
    cleanupPending,
    team,
  };
}
