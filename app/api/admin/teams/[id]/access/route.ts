import { requirePlatformAdmin } from "@/lib/admin-auth";
import { writeRequiredAuditLogFromRequest } from "@/lib/audit-logs";
import { CanonicalTeamError, getCanonicalAdminTeam, isCanonicalTeamId, updateCanonicalAdminTeam } from "@/lib/canonical-teams";
import { enforceRateLimit } from "@/lib/rate-limit";
import { revalidateTeamAssetPaths } from "@/lib/revalidate-public";
import { requireSameOrigin } from "@/lib/request-origin";
import { logServerError } from "@/lib/server-monitoring";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/service-role-client";
import type { Tables } from "@/types/database.types";

type RouteParams = { params: Promise<{ id: string }> };
type TeamAccessRole = "team_igl" | "team_manager";

const ASSIGNABLE_ROLES = new Set<TeamAccessRole>(["team_igl", "team_manager"]);
const PROTECTED_PLATFORM_ROLES = new Set(["super_admin", "admin", "organizer", "moderator"]);

function errorResponse(error: unknown) {
  if (error instanceof CanonicalTeamError) {
    return Response.json({ success: false, error: error.message, code: error.code }, { status: error.status });
  }
  return Response.json(
    { success: false, error: "Team access could not be assigned right now.", code: "team_access_assignment_failed" },
    { status: 500 },
  );
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const invalidOrigin = requireSameOrigin(request);
  if (invalidOrigin) return invalidOrigin;
  const auth = await requirePlatformAdmin(request);
  if (auth.response) return auth.response;
  const limited = await enforceRateLimit(request, {
    key: "admin-team-access-assignment",
    maxRequests: 30,
    windowMs: 60_000,
  });
  if (limited) return limited;

  const { id: teamId } = await params;
  if (!isCanonicalTeamId(teamId)) {
    return Response.json({ success: false, error: "Select a valid official team.", code: "invalid_team_id" }, { status: 400 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const profileId = typeof body.profileId === "string" ? body.profileId.trim() : "";
    const accessRole = typeof body.accessRole === "string" ? body.accessRole.trim() : "";
    if (!profileId || !ASSIGNABLE_ROLES.has(accessRole as TeamAccessRole)) {
      return Response.json({ success: false, error: "Choose a verified profile and either the IGL or manager role." }, { status: 400 });
    }

    const team = await getCanonicalAdminTeam(teamId);
    if (!team) {
      throw new CanonicalTeamError("The official team could not be found.", { code: "team_not_found", status: 404 });
    }
    if (!team.isActive || team.status === "archived") {
      throw new CanonicalTeamError("Team access cannot be assigned to an inactive or archived team.", {
        code: "inactive_team",
        status: 409,
      });
    }

    const client = getSupabaseServiceRoleClient();
    const { data: profile, error: profileError } = await client
      .from("profiles")
      .select("id,email,display_name,role,team_id,is_active")
      .eq("id", profileId)
      .maybeSingle();
    if (profileError) throw profileError;
    if (!profile || !profile.is_active) {
      return Response.json({ success: false, error: "Choose an active verified profile.", code: "profile_not_available" }, { status: 404 });
    }
    if (PROTECTED_PLATFORM_ROLES.has(profile.role)) {
      return Response.json(
        { success: false, error: "Protected platform-admin profiles cannot be converted to team access roles." },
        { status: 409 },
      );
    }
    if (profile.team_id && profile.team_id !== team.id) {
      return Response.json(
        { success: false, error: "That profile is already linked to another official team.", code: "profile_team_conflict" },
        { status: 409 },
      );
    }

    const nextRole = accessRole as TeamAccessRole;
    await writeRequiredAuditLogFromRequest(request, {
      action: "assign_team_access_requested",
      entityType: "profile",
      entityId: profile.id,
      oldValue: {
        role: profile.role,
        teamId: profile.team_id,
      },
      newValue: {
        role: nextRole,
        teamId: team.id,
      },
    });

    const now = new Date().toISOString();
    let profileUpdate = client
      .from("profiles")
      .update({
        role: nextRole as Tables<"profiles">["role"],
        team_id: team.id,
        updated_at: now,
      })
      .eq("id", profile.id)
      .eq("is_active", true)
      .eq("role", profile.role);
    profileUpdate = profile.team_id ? profileUpdate.eq("team_id", profile.team_id) : profileUpdate.is("team_id", null);
    const { data: updatedProfile, error: updateProfileError } = await profileUpdate
      .select("id,email,display_name,role,team_id,is_active")
      .maybeSingle();
    if (updateProfileError) throw updateProfileError;
    if (!updatedProfile) {
      return Response.json({ success: false, error: "The profile changed before access could be assigned." }, { status: 409 });
    }

    try {
      if (nextRole === "team_igl") {
        await updateCanonicalAdminTeam(team.id, { primaryIglProfileId: profile.id });
      }
    } catch (error) {
      const { data: rolledBackProfile, error: rollbackError } = await client
        .from("profiles")
        .update({
          role: profile.role,
          team_id: profile.team_id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", profile.id)
        .eq("role", nextRole)
        .eq("team_id", team.id)
        .select("id")
        .maybeSingle();
      if (rollbackError || !rolledBackProfile) {
        await logServerError(
          "admin.teams.access.rollback",
          rollbackError ?? new Error("Conditional rollback updated no profile."),
          request,
          {
            profileId: profile.id,
            teamId: team.id,
          },
        );
        throw new Error("Team access requires manual review because the assignment rollback did not complete.");
      }
      throw error;
    }

    revalidateTeamAssetPaths(team.id, team.slug);
    return Response.json({
      success: true,
      data: {
        profile: updatedProfile,
        teamId: team.id,
      },
      message: `${updatedProfile.display_name ?? updatedProfile.email} is now the team ${nextRole === "team_igl" ? "IGL" : "manager"}.`,
    });
  } catch (error) {
    await logServerError("admin.teams.access.assign", error, request);
    return errorResponse(error);
  }
}
