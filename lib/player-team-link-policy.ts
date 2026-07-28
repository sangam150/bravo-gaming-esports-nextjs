export const DEFAULT_PLAYER_TEAM_LINK_MATCH_THRESHOLD = 5;

type PlayerTeamLinkEligibility = "eligible" | "substitute" | "rejected" | "ambiguous";
export type PlayerTeamMembershipMode = "auto_activate" | "pending_review";
export type PlayerTeamMembershipSource = "match_history" | "admin_review";

export type PlayerTeamEvidenceIdentity = {
  pubgAccountId: string;
  teamId: string;
  slotNumber: number;
  qualifyingMatchIds: readonly string[];
};

export type PlayerTeamEvidenceSuppression = PlayerTeamEvidenceIdentity;

export type PlayerTeamLinkObservation = {
  matchId: string;
  matchStatus: "pending" | "approved" | "published" | "rejected" | "failed";
  matchDeletedAt?: string | null;
  publishedAt?: string | null;
  pubgAccountId?: string | null;
  teamId?: string | null;
  slotNumber?: number | null;
  teamIsActive: boolean;
  eligibility?: PlayerTeamLinkEligibility;
};

export type PlayerTeamLinkEvaluation =
  | {
      status: "ineligible";
      qualifyingMatchCount: 0;
      reason: "missing_pubg_account_id";
    }
  | {
      status: "pending" | "pending_review" | "qualified" | "conflict";
      pubgAccountId: string;
      teamId: string;
      slotNumber: number;
      qualifyingMatchIds: string[];
      qualifyingMatchCount: number;
      currentTeamId: string | null;
    };

export function isPlayerTeamLinkingMigrationUnavailableError(error: { code?: string; message?: string }) {
  const message = error.message?.toLowerCase() ?? "";
  return (
    error.code === "PGRST202" ||
    error.code === "42883" ||
    message.includes("schema cache") ||
    message.includes("does not exist") ||
    message.includes("could not find the function")
  );
}

function normalizeAccountId(value?: string | null) {
  return value?.trim().toLowerCase() || null;
}

function normalizeMatchIds(matchIds: readonly string[]) {
  return Array.from(new Set(matchIds)).sort();
}

export function shouldEndAutoLinkedMembershipForEvidence(
  qualifyingMatchCount: number,
  membership: { autoLinked: boolean; source: PlayerTeamMembershipSource },
  threshold = DEFAULT_PLAYER_TEAM_LINK_MATCH_THRESHOLD,
) {
  return (
    membership.autoLinked &&
    membership.source === "match_history" &&
    qualifyingMatchCount < Math.max(DEFAULT_PLAYER_TEAM_LINK_MATCH_THRESHOLD, threshold)
  );
}

export function isExactPlayerTeamEvidenceSuppressed(
  candidate: PlayerTeamEvidenceIdentity,
  suppressions: readonly PlayerTeamEvidenceSuppression[],
) {
  const candidateAccountId = normalizeAccountId(candidate.pubgAccountId);
  const candidateMatchIds = normalizeMatchIds(candidate.qualifyingMatchIds);

  return suppressions.some((suppression) => {
    const suppressionMatchIds = normalizeMatchIds(suppression.qualifyingMatchIds);
    return (
      candidateAccountId !== null &&
      normalizeAccountId(suppression.pubgAccountId) === candidateAccountId &&
      suppression.teamId === candidate.teamId &&
      suppression.slotNumber === candidate.slotNumber &&
      suppressionMatchIds.length === candidateMatchIds.length &&
      suppressionMatchIds.every((matchId, index) => matchId === candidateMatchIds[index])
    );
  });
}

export function evaluatePlayerTeamLink(
  observations: readonly PlayerTeamLinkObservation[],
  currentTeamId: string | null,
  threshold = DEFAULT_PLAYER_TEAM_LINK_MATCH_THRESHOLD,
  membershipMode: PlayerTeamMembershipMode = "auto_activate",
): PlayerTeamLinkEvaluation {
  const accountIds = new Set(observations.map((item) => normalizeAccountId(item.pubgAccountId)).filter(Boolean));
  if (accountIds.size !== 1) {
    return { status: "ineligible", qualifyingMatchCount: 0, reason: "missing_pubg_account_id" };
  }

  const pubgAccountId = Array.from(accountIds)[0] as string;
  const appearancesByGroup = new Map<string, Map<string, PlayerTeamLinkObservation[]>>();
  const accountRowsByMatch = new Map<string, number>();

  for (const observation of observations) {
    if (normalizeAccountId(observation.pubgAccountId) === pubgAccountId) {
      accountRowsByMatch.set(observation.matchId, (accountRowsByMatch.get(observation.matchId) ?? 0) + 1);
    }
  }

  for (const observation of observations) {
    if (
      normalizeAccountId(observation.pubgAccountId) !== pubgAccountId ||
      accountRowsByMatch.get(observation.matchId) !== 1 ||
      observation.matchStatus !== "published" ||
      observation.matchDeletedAt ||
      !observation.publishedAt ||
      !observation.teamId ||
      observation.slotNumber === null ||
      observation.slotNumber === undefined ||
      !observation.teamIsActive ||
      (observation.eligibility ?? "eligible") !== "eligible"
    ) {
      continue;
    }

    const key = `${observation.teamId}:${observation.slotNumber}`;
    const byMatch = appearancesByGroup.get(key) ?? new Map<string, PlayerTeamLinkObservation[]>();
    const duplicateRows = byMatch.get(observation.matchId) ?? [];
    duplicateRows.push(observation);
    byMatch.set(observation.matchId, duplicateRows);
    appearancesByGroup.set(key, byMatch);
  }

  const groups = Array.from(appearancesByGroup.entries())
    .map(([key, byMatch]) => {
      const [teamId, slotText] = key.split(":");
      const qualifyingMatchIds = Array.from(byMatch.entries())
        .filter(([, rows]) => rows.length === 1)
        .map(([matchId]) => matchId)
        .sort();

      return {
        teamId,
        slotNumber: Number(slotText),
        qualifyingMatchIds,
      };
    })
    .sort(
      (left, right) =>
        right.qualifyingMatchIds.length - left.qualifyingMatchIds.length ||
        left.teamId.localeCompare(right.teamId) ||
        left.slotNumber - right.slotNumber,
    );
  const bestGroup = groups[0];

  if (!bestGroup) {
    return {
      status: "pending",
      pubgAccountId,
      teamId: "",
      slotNumber: 0,
      qualifyingMatchIds: [],
      qualifyingMatchCount: 0,
      currentTeamId,
    };
  }

  const qualifyingMatchCount = bestGroup.qualifyingMatchIds.length;
  const normalizedThreshold = Math.max(DEFAULT_PLAYER_TEAM_LINK_MATCH_THRESHOLD, threshold);
  const independentlyQualifiedGroups = groups.filter((group) => group.qualifyingMatchIds.length >= normalizedThreshold);
  const status =
    qualifyingMatchCount < normalizedThreshold
      ? "pending"
      : independentlyQualifiedGroups.length > 1 || (currentTeamId && currentTeamId !== bestGroup.teamId)
        ? "conflict"
        : membershipMode === "pending_review"
          ? "pending_review"
          : "qualified";

  return {
    status,
    pubgAccountId,
    teamId: bestGroup.teamId,
    slotNumber: bestGroup.slotNumber,
    qualifyingMatchIds: bestGroup.qualifyingMatchIds,
    qualifyingMatchCount,
    currentTeamId,
  };
}

export function shouldProvisionPlayerProfile(evaluation: PlayerTeamLinkEvaluation) {
  return evaluation.status === "qualified" || evaluation.status === "pending_review";
}
