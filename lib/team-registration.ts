import "server-only";

import { getRegistrations, getTournament, getTournamentTeams } from "./data";
import type { Tournament, TournamentStatus } from "./types";
import { isSupabaseServiceRoleConfigured } from "./supabase/server-env";
import { getSupabaseServiceRoleClient } from "./supabase/service-role-client";
import type { Tables } from "@/types/database.types";

export type RegistrationTargetState = "open" | "closed" | "full";

export type RegistrationTargetSummary = {
  id: string;
  title: string;
  status: TournamentStatus;
  startDate?: string;
  endDate?: string;
  teamCount: number;
  maxTeams: number;
  registrationState: RegistrationTargetState;
  registrationMessage: string;
};

export class RegistrationValidationError extends Error {}

const OPEN_REGISTRATION_STATUSES = new Set<TournamentStatus>(["OPEN", "REGISTERING", "UPCOMING"]);

function looksLikeUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function cleanString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

function toTournamentStatus(row: Tables<"events">): TournamentStatus {
  const competitionStatus = cleanString(row.competition_status);
  if (
    competitionStatus === "LIVE" ||
    competitionStatus === "OPEN" ||
    competitionStatus === "REGISTERING" ||
    competitionStatus === "UPCOMING" ||
    competitionStatus === "COMPLETED"
  ) {
    return competitionStatus;
  }

  if (row.status === "completed") {
    return "COMPLETED";
  }

  if (row.status === "active") {
    return "LIVE";
  }

  return "UPCOMING";
}

function summarizeRegistrationTarget(tournament: Tournament): RegistrationTargetSummary {
  const startTimestamp = tournament.startDate ? Date.parse(tournament.startDate) : Number.NaN;
  const hasStarted = Number.isFinite(startTimestamp) && startTimestamp <= Date.now();
  const isFull = tournament.teamCount >= tournament.maxTeams;
  const registrationState: RegistrationTargetState = isFull
    ? "full"
    : tournament.status === "COMPLETED" || hasStarted || !OPEN_REGISTRATION_STATUSES.has(tournament.status)
      ? "closed"
      : "open";

  const registrationMessage =
    registrationState === "full"
      ? "This event has reached its current registration limit."
      : registrationState === "closed"
        ? hasStarted || tournament.status === "LIVE"
          ? "Registration has closed because this event is already underway."
          : tournament.status === "COMPLETED"
            ? "Registration has closed because this event has already been completed."
            : "Registration is not open for this event right now."
        : "Registration is open. Bravo admins review team details before confirming slots.";

  return {
    id: tournament.id,
    title: tournament.title,
    status: tournament.status,
    startDate: tournament.startDate,
    endDate: tournament.endDate,
    teamCount: tournament.teamCount,
    maxTeams: tournament.maxTeams,
    registrationState,
    registrationMessage,
  };
}

async function getPublishedEventTournament(idOrSlug: string): Promise<Tournament | null> {
  const value = cleanString(idOrSlug);
  if (!value) {
    return null;
  }

  if (isSupabaseServiceRoleConfigured()) {
    const client = getSupabaseServiceRoleClient();
    const byId = looksLikeUuid(value)
      ? await client.from("events").select("*").eq("id", value).eq("published", true).is("deleted_at", null).maybeSingle()
      : { data: null, error: null };

    if (byId.error) {
      throw byId.error;
    }

    const slugLookup =
      byId.data ??
      (
        await client
          .from("events")
          .select("*")
          .eq("slug", value.toLowerCase())
          .eq("published", true)
          .is("deleted_at", null)
          .maybeSingle()
      ).data;

    if (slugLookup) {
      const row = slugLookup as Tables<"events">;
      return {
        id: row.id,
        title: row.name ?? row.title,
        tier: row.tier ?? "OPEN",
        status: toTournamentStatus(row),
        prizePool: row.prize_pool ?? "TBD",
        teamCount: row.team_count ?? 0,
        maxTeams: row.max_teams ?? 32,
        startDate: row.start_date ?? "",
        endDate: row.end_date ?? undefined,
        format: row.mode ?? "Squad",
        mode: row.game,
        server: row.server ?? row.region ?? "Global",
        perspective: row.perspective ?? undefined,
        description: row.description ?? undefined,
        rules: row.rules ?? undefined,
        schedule: row.schedule ?? undefined,
        mapRotation: Array.isArray(row.map_rotation) ? (row.map_rotation as string[]) : [],
        bannerUrl: row.banner_url ?? undefined,
        seasonId: row.season_id ?? undefined,
        seasonDayNumber: row.season_day_number ?? undefined,
        dayNumber: row.season_day_number ?? undefined,
        matchCount: row.match_count ?? undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    }
  }

  return await getTournament(value);
}

export async function getRegistrationTargetSummary(idOrSlug?: string | null): Promise<RegistrationTargetSummary | null> {
  const tournament = await getPublishedEventTournament(idOrSlug ?? "");
  if (!tournament) {
    return null;
  }

  return summarizeRegistrationTarget(tournament);
}

export function isValidDiscordHandle(value: string) {
  return /^[a-z0-9._]{2,32}$/i.test(value.trim());
}

export async function validateRegistrationTarget(options: {
  tournamentId?: string | null;
  teamName: string;
  captainDiscord: string;
}) {
  const tournamentId = cleanString(options.tournamentId);
  if (!tournamentId) {
    return null;
  }

  const target = await getRegistrationTargetSummary(tournamentId);
  if (!target) {
    throw new RegistrationValidationError("The selected event does not exist or is not available for public registration.");
  }

  if (target.registrationState !== "open") {
    throw new RegistrationValidationError(target.registrationMessage);
  }

  const normalizedTeamName = normalizeText(options.teamName);
  const normalizedDiscord = normalizeText(options.captainDiscord);
  const [existingRegistrations, registeredTeams] = await Promise.all([
    getRegistrations(),
    getTournamentTeams(target.id).catch(() => []),
  ]);

  const duplicateRegistration = existingRegistrations.find((registration) => {
    if (registration.tournamentId !== target.id || registration.status === "rejected") {
      return false;
    }

    return (
      normalizeText(registration.teamName) === normalizedTeamName ||
      normalizeText(registration.captainDiscord) === normalizedDiscord
    );
  });

  if (duplicateRegistration) {
    throw new RegistrationValidationError("This team already has a submitted registration for the selected event.");
  }

  if (registeredTeams.some((team) => normalizeText(team.name) === normalizedTeamName)) {
    throw new RegistrationValidationError("This team is already registered for the selected event.");
  }

  return target;
}
