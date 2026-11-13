import type { TeamRegistration } from "./types";

export function hasEventRegistrationTarget(registration: Pick<TeamRegistration, "tournamentId">) {
  return Boolean(registration.tournamentId?.trim());
}
