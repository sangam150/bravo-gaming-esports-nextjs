import { requireAdmin } from "@/lib/admin-auth";
import { writeAuditLogFromRequest } from "@/lib/audit-logs";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/service-role-client";
import { getUserFacingTeamLabel } from "@/lib/user-facing-errors";
import type { Tables } from "@/types/database.types";

type RosterRequestRow = Pick<
  Tables<"roster_requests">,
  | "id"
  | "team_id"
  | "requested_by"
  | "request_type"
  | "status"
  | "admin_note"
  | "old_player_id"
  | "new_player_name"
  | "new_player_pubg_name"
  | "created_at"
  | "updated_at"
  | "reviewed_at"
>;

type MossSubmissionRow = Pick<
  Tables<"moss_submissions">,
  | "id"
  | "event_id"
  | "match_id"
  | "team_id"
  | "player_id"
  | "file_url"
  | "external_link"
  | "status"
  | "admin_note"
  | "created_at"
  | "updated_at"
>;

type TeamRow = Pick<Tables<"teams">, "id" | "name">;
type PlayerRow = Pick<Tables<"players">, "id" | "pubg_name" | "display_name">;
type ProfileRow = Pick<Tables<"profiles">, "id" | "display_name" | "email">;
type EventRow = Pick<Tables<"events">, "id" | "name" | "title">;

const ROSTER_REQUEST_STATUSES = new Set(["pending", "approved", "rejected", "review_later"]);
const MOSS_SUBMISSION_STATUSES = new Set(["submitted", "approved", "rejected"]);

export async function GET(request: Request) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  const client = getSupabaseServiceRoleClient();
  const [rosterRequestsResponse, mossSubmissionsResponse, teamsResponse, playersResponse, profilesResponse, eventsResponse] =
    await Promise.all([
      client
        .from("roster_requests")
        .select("id,team_id,requested_by,request_type,status,admin_note,old_player_id,new_player_name,new_player_pubg_name,created_at,updated_at,reviewed_at")
        .order("created_at", { ascending: false }),
      client
        .from("moss_submissions")
        .select("id,event_id,match_id,team_id,player_id,file_url,external_link,status,admin_note,created_at,updated_at")
        .order("created_at", { ascending: false }),
      client.from("teams").select("id,name"),
      client.from("players").select("id,pubg_name,display_name"),
      client.from("profiles").select("id,display_name,email"),
      client.from("events").select("id,name,title"),
    ]);

  if (rosterRequestsResponse.error) {
    throw rosterRequestsResponse.error;
  }
  if (mossSubmissionsResponse.error) {
    throw mossSubmissionsResponse.error;
  }
  if (teamsResponse.error) {
    throw teamsResponse.error;
  }
  if (playersResponse.error) {
    throw playersResponse.error;
  }
  if (profilesResponse.error) {
    throw profilesResponse.error;
  }
  if (eventsResponse.error) {
    throw eventsResponse.error;
  }

  const teamNameById = new Map((teamsResponse.data ?? []).map((team) => [team.id, team.name] as const));
  const playerNameById = new Map(
    ((playersResponse.data ?? []) as PlayerRow[]).map((player) => [player.id, player.display_name ?? player.pubg_name] as const)
  );
  const profileById = new Map(
    ((profilesResponse.data ?? []) as ProfileRow[]).map((profile) => [
      profile.id,
      { name: profile.display_name ?? profile.email, email: profile.email },
    ] as const)
  );
  const eventNameById = new Map(
    ((eventsResponse.data ?? []) as EventRow[]).map((event) => [event.id, event.name ?? event.title] as const)
  );

  const data = {
    rosterRequests: ((rosterRequestsResponse.data ?? []) as RosterRequestRow[]).map((requestRow) => ({
      id: requestRow.id,
      teamId: requestRow.team_id,
      teamName: getUserFacingTeamLabel(teamNameById.get(requestRow.team_id)),
      requestedByName: requestRow.requested_by ? profileById.get(requestRow.requested_by)?.name ?? null : null,
      requestedByEmail: requestRow.requested_by ? profileById.get(requestRow.requested_by)?.email ?? null : null,
      requestType: requestRow.request_type,
      status: requestRow.status,
      adminNote: requestRow.admin_note,
      oldPlayerName: requestRow.old_player_id ? playerNameById.get(requestRow.old_player_id) ?? null : null,
      newPlayerName: requestRow.new_player_name,
      newPlayerPubgName: requestRow.new_player_pubg_name,
      createdAt: requestRow.created_at,
      updatedAt: requestRow.updated_at ?? requestRow.reviewed_at,
    })),
    mossSubmissions: ((mossSubmissionsResponse.data ?? []) as MossSubmissionRow[]).map((submissionRow) => ({
      id: submissionRow.id,
      eventId: submissionRow.event_id,
      eventName: submissionRow.event_id ? eventNameById.get(submissionRow.event_id) ?? null : null,
      matchId: submissionRow.match_id,
      teamId: submissionRow.team_id,
      teamName: getUserFacingTeamLabel(teamNameById.get(submissionRow.team_id)),
      playerId: submissionRow.player_id,
      playerName: submissionRow.player_id ? playerNameById.get(submissionRow.player_id) ?? null : null,
      fileUrl: submissionRow.file_url,
      externalLink: submissionRow.external_link,
      status: submissionRow.status,
      adminNote: submissionRow.admin_note,
      createdAt: submissionRow.created_at,
      updatedAt: submissionRow.updated_at ?? null,
    })),
  };

  return Response.json({ success: true, data });
}

export async function PATCH(request: Request) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    const body = await request.json();
    const kind = body.kind === "moss_submission" ? "moss_submission" : body.kind === "roster_request" ? "roster_request" : null;
    const id = typeof body.id === "string" ? body.id.trim() : "";
    const status = typeof body.status === "string" ? body.status.trim() : "";
    const adminNote = typeof body.adminNote === "string" ? body.adminNote.trim() : "";

    if (!kind || !id) {
      return Response.json({ error: "kind and id are required" }, { status: 400 });
    }

    const client = getSupabaseServiceRoleClient();
    const now = new Date().toISOString();

    if (kind === "roster_request") {
      if (!ROSTER_REQUEST_STATUSES.has(status)) {
        return Response.json({ error: "Invalid roster request status" }, { status: 400 });
      }

      const { data, error } = await client
        .from("roster_requests")
        .update({
          status: status as Tables<"roster_requests">["status"],
          admin_note: adminNote || null,
          reviewed_at: status === "pending" ? null : now,
          updated_at: now,
        })
        .eq("id", id)
        .select("id,team_id,requested_by,request_type,status,admin_note,old_player_id,new_player_name,new_player_pubg_name,created_at,updated_at,reviewed_at")
        .single();

      if (error) {
        throw error;
      }

      await writeAuditLogFromRequest(request, {
        action: "review",
        entityType: "team_request",
        entityId: id,
        newValue: data,
      });

      return Response.json({ success: true, data });
    }

    if (!MOSS_SUBMISSION_STATUSES.has(status)) {
      return Response.json({ error: "Invalid MOSS submission status" }, { status: 400 });
    }

    const { data, error } = await client
      .from("moss_submissions")
      .update({
        status: status as Tables<"moss_submissions">["status"],
        admin_note: adminNote || null,
        updated_at: now,
      })
      .eq("id", id)
      .select("id,event_id,match_id,team_id,player_id,file_url,external_link,status,admin_note,created_at,updated_at")
      .single();

    if (error) {
      throw error;
    }

    await writeAuditLogFromRequest(request, {
      action: "review",
      entityType: "moss_submission",
      entityId: id,
      newValue: data,
    });

    return Response.json({ success: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 500 });
  }
}
