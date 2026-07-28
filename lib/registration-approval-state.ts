import type { TeamRegistration } from "./types";

const APPROVAL_LINK_FIELDS = [
  "approvedTeamId",
  "approvalClaimToken",
  "approvalClaimedAt",
  "approvalClaimedBy",
  "logoPath",
  "logoUploadId",
  "logoUrl",
  "tournamentId",
  "tournamentTitle",
] as const;

type RegistrationApprovalLinkField = (typeof APPROVAL_LINK_FIELDS)[number];
type RegistrationApprovalOptionalLinkField = Exclude<
  RegistrationApprovalLinkField,
  "approvedTeamId" | "approvalClaimToken" | "approvalClaimedAt" | "approvalClaimedBy"
>;

export type RegistrationApprovalUpdates = { approvedTeamId: string } & Pick<TeamRegistration, RegistrationApprovalOptionalLinkField>;

type RegistrationApprovalRereadOutcome = "ambiguous" | "committed" | "unchanged";

function normalizeOptionalString(value: string | undefined) {
  const normalized = value?.trim();
  return normalized || undefined;
}

export function registrationApprovalStateMatches(first: TeamRegistration, second: TeamRegistration) {
  if (first.id !== second.id || first.status !== second.status) return false;
  return APPROVAL_LINK_FIELDS.every((field) => normalizeOptionalString(first[field]) === normalizeOptionalString(second[field]));
}

export function buildRegistrationApprovalExpectation(
  registration: TeamRegistration,
  updates: RegistrationApprovalUpdates,
): TeamRegistration {
  return {
    ...registration,
    ...updates,
    approvedTeamId: normalizeOptionalString(updates.approvedTeamId),
    approvalClaimToken: undefined,
    approvalClaimedAt: undefined,
    approvalClaimedBy: undefined,
    logoPath: normalizeOptionalString(updates.logoPath),
    logoUploadId: normalizeOptionalString(updates.logoUploadId),
    logoUrl: normalizeOptionalString(updates.logoUrl),
    status: "approved",
    tournamentId: normalizeOptionalString(updates.tournamentId),
    tournamentTitle: normalizeOptionalString(updates.tournamentTitle),
  };
}

export function classifyRegistrationApprovalReread(
  before: TeamRegistration,
  expected: TeamRegistration,
  current: TeamRegistration | null,
): RegistrationApprovalRereadOutcome {
  if (!current) return "ambiguous";
  if (registrationApprovalStateMatches(current, expected)) return "committed";
  if (registrationApprovalStateMatches(current, before)) return "unchanged";
  return "ambiguous";
}
