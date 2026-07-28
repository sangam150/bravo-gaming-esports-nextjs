import type { TeamRegistration } from "./types";

export type RegistrationSubmissionExpectation = Pick<
  TeamRegistration,
  | "approvedTeamId"
  | "captainDiscord"
  | "captainEmail"
  | "captainName"
  | "captainPhone"
  | "id"
  | "logoPath"
  | "logoUploadId"
  | "logoUrl"
  | "playerNames"
  | "status"
  | "teamName"
  | "teamTag"
  | "tournamentId"
  | "tournamentTitle"
>;

function normalizeOptionalString(value: string | undefined) {
  const normalized = value?.trim();
  return normalized || undefined;
}

function normalizedStringList(values: readonly string[]) {
  return values.map((value) => value.trim()).filter(Boolean);
}

export function isDefinitiveRegistrationSubmissionRejection(error: unknown) {
  if (!error || typeof error !== "object" || !("code" in error)) {
    return false;
  }

  const code = typeof error.code === "string" ? error.code.trim().toUpperCase() : "";
  if (["PGRST100", "PGRST102", "PGRST106", "PGRST107", "PGRST120", "PGRST122", "PGRST204"].includes(code)) {
    return true;
  }

  // Connection and generic PostgREST failures remain ambiguous because a
  // commit may have completed before the client observed the response failure.
  return /^(22|23|28|40|42|P0)[0-9A-Z]{3}$/.test(code);
}

export function registrationSubmissionMatchesExpectation(current: TeamRegistration, expected: RegistrationSubmissionExpectation) {
  if (current.id !== expected.id || current.status !== "pending" || expected.status !== "pending") {
    return false;
  }

  const stringFields = [
    "approvedTeamId",
    "captainDiscord",
    "captainEmail",
    "captainName",
    "captainPhone",
    "logoPath",
    "logoUploadId",
    "logoUrl",
    "teamName",
    "teamTag",
    "tournamentId",
    "tournamentTitle",
  ] as const;
  if (!stringFields.every((field) => normalizeOptionalString(current[field]) === normalizeOptionalString(expected[field]))) {
    return false;
  }

  const currentPlayers = normalizedStringList(current.playerNames);
  const expectedPlayers = normalizedStringList(expected.playerNames);
  return (
    currentPlayers.length === expectedPlayers.length && currentPlayers.every((playerName, index) => playerName === expectedPlayers[index])
  );
}
