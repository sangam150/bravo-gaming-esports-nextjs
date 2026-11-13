import "server-only";

import type { Json } from "@/types/database.types";
import { sanitizeJsonValue } from "./json-utils";
import { getSupabaseServiceRoleClient } from "./supabase/service-role-client";
import type { TeamRegistration } from "./types";

type SupabaseMutationError = {
  code?: string;
  message?: string;
};

export class EventRegistrationMutationError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(message: string, options: { code: string; status: number; cause?: unknown }) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = "EventRegistrationMutationError";
    this.code = options.code;
    this.status = options.status;
  }
}

const ERROR_DETAILS: Record<string, { message: string; status: number }> = {
  duplicate_event_team: {
    message: "This team already has an active registration or confirmed membership for the selected event.",
    status: 409,
  },
  duplicate_registration: {
    message: "This team or captain already has an active registration for the selected event.",
    status: 409,
  },
  registration_approval_conflict: {
    message: "This registration changed while it was being approved. Refresh and review its current state.",
    status: 409,
  },
  registration_capacity_full: {
    message: "The event reached its team capacity before this operation could be completed.",
    status: 409,
  },
  registration_decision_conflict: {
    message: "This registration changed before the decision could be saved. Refresh and try again.",
    status: 409,
  },
  registration_event_closed: {
    message: "The selected event is no longer accepting registrations.",
    status: 409,
  },
  registration_event_not_found: {
    message: "The selected event no longer exists.",
    status: 404,
  },
  registration_ledger_missing: {
    message: "This legacy event registration is missing its relational ledger record and cannot be changed safely.",
    status: 409,
  },
  registration_membership_conflict: {
    message: "The saved event membership no longer matches this registration. Refresh and reconcile it before retrying.",
    status: 409,
  },
  registration_not_found: {
    message: "Registration not found.",
    status: 404,
  },
  registration_slot_out_of_range: {
    message: "The requested slot is outside the event slot range.",
    status: 409,
  },
  registration_team_not_eligible: {
    message: "The linked official team is missing, inactive, archived, merged, or otherwise ineligible for this event.",
    status: 409,
  },
};

function normalizeDatabaseError(error: SupabaseMutationError, fallbackCode: string) {
  const rawMessage = error.message?.trim() ?? "";
  const matchedCode = Object.keys(ERROR_DETAILS).find((code) => rawMessage.includes(code));
  const code = matchedCode ?? (error.code === "23505" ? "duplicate_registration" : fallbackCode);
  const details = ERROR_DETAILS[code];
  return new EventRegistrationMutationError(details?.message ?? "The event registration transaction could not be completed.", {
    cause: error,
    code,
    status: details?.status ?? (error.code === "40001" || error.code === "23505" ? 409 : 500),
  });
}

function asRegistration(value: Json | null): TeamRegistration {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new EventRegistrationMutationError("The registration transaction returned an invalid result.", {
      code: "invalid_registration_result",
      status: 500,
    });
  }
  return value as unknown as TeamRegistration;
}

export async function createEventRegistrationTransaction(registration: TeamRegistration) {
  const { data, error } = await getSupabaseServiceRoleClient().rpc("create_event_registration", {
    p_registration: sanitizeJsonValue(registration) as Json,
  });
  if (error) throw normalizeDatabaseError(error, "registration_submission_failed");
  return asRegistration(data);
}

export async function confirmEventRegistrationTransaction(input: {
  actorProfileId: string;
  registration: TeamRegistration;
  teamId: string;
  updates: Partial<TeamRegistration>;
}) {
  const { data, error } = await getSupabaseServiceRoleClient().rpc("confirm_event_registration", {
    p_actor_id: input.actorProfileId,
    p_expected_claim_token: input.registration.approvalClaimToken ?? "",
    p_registration_id: input.registration.id,
    p_requested_slot: null,
    p_team_id: input.teamId,
    p_updates: (sanitizeJsonValue(input.updates) ?? {}) as Json,
  });
  if (error) throw normalizeDatabaseError(error, "registration_approval_failed");
  return asRegistration(data);
}

export async function setEventRegistrationStatusTransaction(input: {
  actorProfileId: string;
  expectedStatus: TeamRegistration["status"];
  expectedTeamId?: string;
  registrationId: string;
  status: "pending" | "rejected";
  updates?: Partial<TeamRegistration>;
}) {
  const { data, error } = await getSupabaseServiceRoleClient().rpc("set_event_registration_status", {
    p_actor_id: input.actorProfileId,
    p_expected_status: input.expectedStatus,
    p_expected_team_id: input.expectedTeamId ?? null,
    p_registration_id: input.registrationId,
    p_status: input.status,
    p_updates: (sanitizeJsonValue(input.updates ?? {}) ?? {}) as Json,
  });
  if (error) throw normalizeDatabaseError(error, "registration_decision_failed");
  return asRegistration(data);
}
