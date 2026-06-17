import { getSupabaseServiceRoleClient } from "./supabase/service-role-client";
import type {
  AuthenticatedUserProfile,
  MossSubmission,
  TeamEventSummary,
  TeamRecentMatch,
  TeamRosterRequest,
  TeamWorkspaceData,
} from "./types";
import type { VerifiedSession } from "./supabase-auth-server";

type TeamRecord = {
  id: string;
  name: string;
  tag?: string | null;
  logo_url?: string | null;
  region?: string | null;
  slot_number?: number | null;
  is_active?: boolean | null;
  status?: string | null;
};

type PlayerRecord = {
  id: string;
  pubg_name?: string | null;
  avatar_url?: string | null;
  photo_url?: string | null;
  is_active?: boolean | null;
};

type EventRecord = {
  id: string;
  name?: string | null;
  title?: string | null;
  slug?: string | null;
  status?: string | null;
  type?: string | null;
  event_type?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  rules?: string | null;
  published?: boolean | null;
};

type MatchRecord = {
  id: string;
  event_id?: string | null;
  match_number?: number | null;
  map_name?: string | null;
  map?: string | null;
  start_time?: string | null;
  match_date?: string | null;
  vod_url?: string | null;
};

type MatchTeamResultRecord = {
  match_id: string;
  placement: number;
  kills: number;
  total_points: number;
  wwcd?: boolean | null;
};

function buildProfile(session: VerifiedSession): AuthenticatedUserProfile {
  return {
    profileId: session.profileId,
    uid: session.uid,
    email: session.email,
    role: session.role,
    teamId: session.teamId,
    displayName: session.displayName,
    isAdmin: session.isAdmin,
  };
}

function ensureTeamScopedSession(session: VerifiedSession) {
  if (!(session.isAdmin || session.role === "team_igl")) {
    throw new Error("Only admins and team IGL users can access the team workspace.");
  }

  if (!session.teamId) {
    throw new Error("This account is not linked to a team in Supabase yet.");
  }

  if (!session.profileId) {
    throw new Error("Create a profile record for this user before using the team workspace.");
  }
}

async function safeListUpcomingEvents(teamId: string) {
  const client = getSupabaseServiceRoleClient();

  try {
    const { data: eventLinks, error: eventLinksError } = await client
      .from("event_teams")
      .select("event_id")
      .eq("team_id", teamId)
      .limit(24);

    if (eventLinksError) {
      throw eventLinksError;
    }

    const eventIds = Array.from(
      new Set((eventLinks ?? []).map((item) => item.event_id).filter((value): value is string => Boolean(value)))
    );

    if (eventIds.length === 0) {
      return [] satisfies TeamEventSummary[];
    }

    const { data: events, error: eventsError } = await client
      .from("events")
      .select("id,name,title,slug,status,type,event_type,start_date,end_date,rules,published")
      .in("id", eventIds)
      .order("start_date", { ascending: true });

    if (eventsError) {
      throw eventsError;
    }

    return (events ?? [])
      .filter((event) => event.published !== false)
      .map((event) => ({
        id: event.id,
        name: event.name ?? event.title ?? "Upcoming Event",
        slug: event.slug ?? null,
        status: event.status ?? "upcoming",
        type: event.type ?? event.event_type ?? null,
        startDate: event.start_date ?? null,
        endDate: event.end_date ?? null,
        rules: event.rules ?? null,
      })) satisfies TeamEventSummary[];
  } catch {
    return [] satisfies TeamEventSummary[];
  }
}

async function safeListRecentMatches(teamId: string) {
  const client = getSupabaseServiceRoleClient();

  try {
    const { data: results, error: resultsError } = await client
      .from("match_team_results")
      .select("match_id,placement,kills,total_points,wwcd")
      .eq("team_id", teamId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (resultsError) {
      throw resultsError;
    }

    const matchIds = Array.from(
      new Set((results ?? []).map((item) => item.match_id).filter((value): value is string => Boolean(value)))
    );

    if (matchIds.length === 0) {
      return [] satisfies TeamRecentMatch[];
    }

    const { data: matches, error: matchesError } = await client
      .from("matches")
      .select("id,event_id,match_number,map_name,map,start_time,match_date,vod_url")
      .in("id", matchIds);

    if (matchesError) {
      throw matchesError;
    }

    const eventIds = Array.from(
      new Set((matches ?? []).map((match) => match.event_id).filter((value): value is string => Boolean(value)))
    );

    let eventsById = new Map<string, string>();
    if (eventIds.length > 0) {
      const { data: events } = await client.from("events").select("id,name,title").in("id", eventIds);
      eventsById = new Map(
        (events ?? []).map((event) => [event.id, event.name ?? event.title ?? "Event"] as const)
      );
    }

    const matchesById = new Map((matches ?? []).map((match) => [match.id, match] as const));

    return (results ?? []).map((result) => {
      const match = matchesById.get(result.match_id);

      return {
        matchId: result.match_id,
        eventName: match?.event_id ? eventsById.get(match.event_id) ?? null : null,
        matchNumber: match?.match_number ?? null,
        mapName: match?.map_name ?? match?.map ?? null,
        startTime: match?.start_time ?? match?.match_date ?? null,
        placement: result.placement,
        kills: result.kills,
        totalPoints: result.total_points,
        wwcd: Boolean(result.wwcd),
        vodUrl: match?.vod_url ?? null,
      } satisfies TeamRecentMatch;
    });
  } catch {
    return [] satisfies TeamRecentMatch[];
  }
}

export async function getTeamWorkspace(session: VerifiedSession): Promise<TeamWorkspaceData> {
  ensureTeamScopedSession(session);

  const client = getSupabaseServiceRoleClient();

  const { data: team, error: teamError } = await client
    .from("teams")
    .select("id,name,tag,logo_url,region,slot_number,is_active,status")
    .eq("id", session.teamId)
    .maybeSingle<TeamRecord>();

  if (teamError) {
    throw teamError;
  }

  const [{ data: players }, { data: requests }, { data: mossSubmissions }, upcomingEvents, recentMatches] =
    await Promise.all([
      client
        .from("players")
        .select("id,pubg_name,avatar_url,photo_url,is_active")
        .eq("current_team_id", session.teamId)
        .order("pubg_name", { ascending: true }),
      client
        .from("roster_requests")
        .select("id,team_id,requested_by,request_type,status,admin_note,old_player_id,new_player_name,new_player_pubg_name,payload,created_at,updated_at")
        .eq("team_id", session.teamId)
        .order("created_at", { ascending: false })
        .limit(20),
      client
        .from("moss_submissions")
        .select("id,event_id,match_id,team_id,player_id,file_url,external_link,status,admin_note,created_at")
        .eq("team_id", session.teamId)
        .order("created_at", { ascending: false })
        .limit(20),
      safeListUpcomingEvents(session.teamId),
      safeListRecentMatches(session.teamId),
    ]);

  const mossEventIds = Array.from(
    new Set(
      ((mossSubmissions ?? []) as Array<Record<string, unknown>>)
        .map((submission) => submission.event_id)
        .filter((value): value is string => typeof value === "string" && value.length > 0)
    )
  );

  let mossEventNames = new Map<string, string>();
  if (mossEventIds.length > 0) {
    const { data: mossEvents } = await client.from("events").select("id,name,title").in("id", mossEventIds);
    mossEventNames = new Map(
      (mossEvents ?? []).map((event) => [event.id, event.name ?? event.title ?? "Event"] as const)
    );
  }

  return {
    user: buildProfile(session),
    team: team
      ? {
          id: team.id,
          name: team.name,
          tag: team.tag ?? null,
          logoUrl: team.logo_url ?? null,
          region: team.region ?? null,
          slotNumber: team.slot_number ?? null,
          isActive: team.is_active ?? team.status === "active",
        }
      : null,
    roster: ((players ?? []) as PlayerRecord[]).map((player) => ({
      id: player.id,
      pubgName: player.pubg_name ?? "Unknown Player",
      avatarUrl: player.avatar_url ?? player.photo_url ?? null,
      isActive: player.is_active ?? true,
    })),
    requests: ((requests ?? []) as Array<Record<string, unknown>>).map((request) => ({
      id: String(request.id),
      teamId: String(request.team_id),
      requestedBy: request.requested_by ? String(request.requested_by) : null,
      requestType: String(request.request_type),
      status: String(request.status) as TeamRosterRequest["status"],
      adminNote: request.admin_note ? String(request.admin_note) : null,
      oldPlayerId: request.old_player_id ? String(request.old_player_id) : null,
      newPlayerName: request.new_player_name ? String(request.new_player_name) : null,
      newPlayerPubgName: request.new_player_pubg_name ? String(request.new_player_pubg_name) : null,
      payload: (request.payload as Record<string, unknown> | null | undefined) ?? null,
      createdAt: String(request.created_at),
      updatedAt: request.updated_at ? String(request.updated_at) : null,
    })),
    mossSubmissions: ((mossSubmissions ?? []) as Array<Record<string, unknown>>).map((submission) => ({
      id: String(submission.id),
      eventId: submission.event_id ? String(submission.event_id) : null,
      eventName:
        typeof submission.event_id === "string" ? mossEventNames.get(submission.event_id) ?? null : null,
      matchId: submission.match_id ? String(submission.match_id) : null,
      teamId: String(submission.team_id),
      playerId: submission.player_id ? String(submission.player_id) : null,
      fileUrl: submission.file_url ? String(submission.file_url) : null,
      externalLink: submission.external_link ? String(submission.external_link) : null,
      status: String(submission.status) as MossSubmission["status"],
      adminNote: submission.admin_note ? String(submission.admin_note) : null,
      createdAt: String(submission.created_at),
    })),
    upcomingEvents,
    recentMatches,
  };
}

export async function createTeamRosterRequest(
  session: VerifiedSession,
  input: {
    requestType: string;
    oldPlayerId?: string | null;
    newPlayerName?: string | null;
    newPlayerPubgName?: string | null;
    payload?: Record<string, unknown>;
  }
) {
  ensureTeamScopedSession(session);

  const client = getSupabaseServiceRoleClient();
  const payload = input.payload ?? {};
  const now = new Date().toISOString();

  const { data, error } = await client
    .from("roster_requests")
    .insert({
      team_id: session.teamId,
      requested_by: session.profileId,
      request_type: input.requestType,
      old_player_id: input.oldPlayerId ?? null,
      new_player_name: input.newPlayerName ?? null,
      new_player_pubg_name: input.newPlayerPubgName ?? null,
      payload,
      status: "pending",
      created_at: now,
      updated_at: now,
    })
    .select("id,team_id,requested_by,request_type,status,admin_note,old_player_id,new_player_name,new_player_pubg_name,payload,created_at,updated_at")
    .single();

  if (error) {
    throw error;
  }

  return {
    id: String(data.id),
    teamId: String(data.team_id),
    requestedBy: data.requested_by ? String(data.requested_by) : null,
    requestType: String(data.request_type),
    status: String(data.status) as TeamRosterRequest["status"],
    adminNote: data.admin_note ? String(data.admin_note) : null,
    oldPlayerId: data.old_player_id ? String(data.old_player_id) : null,
    newPlayerName: data.new_player_name ? String(data.new_player_name) : null,
    newPlayerPubgName: data.new_player_pubg_name ? String(data.new_player_pubg_name) : null,
    payload: (data.payload as Record<string, unknown> | null | undefined) ?? null,
    createdAt: String(data.created_at),
    updatedAt: data.updated_at ? String(data.updated_at) : null,
  } satisfies TeamRosterRequest;
}

export async function createMossSubmission(
  session: VerifiedSession,
  input: {
    eventId?: string | null;
    matchId?: string | null;
    playerId?: string | null;
    fileUrl?: string | null;
    externalLink?: string | null;
  }
) {
  ensureTeamScopedSession(session);

  if (!input.fileUrl && !input.externalLink) {
    throw new Error("Attach a MOSS file or provide an external link.");
  }

  const client = getSupabaseServiceRoleClient();
  const { data, error } = await client
    .from("moss_submissions")
    .insert({
      event_id: input.eventId ?? null,
      match_id: input.matchId ?? null,
      team_id: session.teamId,
      player_id: input.playerId ?? null,
      file_url: input.fileUrl ?? null,
      external_link: input.externalLink ?? null,
      status: "submitted",
      created_at: new Date().toISOString(),
    })
    .select("id,event_id,match_id,team_id,player_id,file_url,external_link,status,admin_note,created_at")
    .single();

  if (error) {
    throw error;
  }

  return {
    id: String(data.id),
    eventId: data.event_id ? String(data.event_id) : null,
    matchId: data.match_id ? String(data.match_id) : null,
    teamId: String(data.team_id),
    playerId: data.player_id ? String(data.player_id) : null,
    fileUrl: data.file_url ? String(data.file_url) : null,
    externalLink: data.external_link ? String(data.external_link) : null,
    status: String(data.status) as MossSubmission["status"],
    adminNote: data.admin_note ? String(data.admin_note) : null,
    createdAt: String(data.created_at),
  } satisfies MossSubmission;
}
