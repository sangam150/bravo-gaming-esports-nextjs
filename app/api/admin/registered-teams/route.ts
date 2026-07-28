import { requireAdmin } from "@/lib/admin-auth";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/service-role-client";
import { resolveTeamMappingState } from "@/lib/team-mapping-state";

export async function GET(request: Request) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;
  const client = getSupabaseServiceRoleClient();
  const guildId = process.env.BRAVO_DISCORD_GUILD_ID?.trim();

  const [teams, profiles, registrations, mappings, reviews] = await Promise.all([
    client.from("teams").select("*").is("deleted_at", null).order("updated_at", { ascending: false }),
    client.from("profiles").select("id,team_id,display_name,email,role,is_active,discord_user_id,discord_role_synced_at"),
    client
      .from("registrations")
      .select("id,team_name,team_tag,status,onboarding_status,official_team_id,team_id,created_at,updated_at")
      .order("updated_at", { ascending: false }),
    guildId
      ? client
          .from("discord_role_mappings")
          .select("discord_role_id,discord_role_name,team_id,mapping_status,enabled,last_verified_at")
          .eq("discord_guild_id", guildId)
          .eq("mapping_type", "team_identity")
      : Promise.resolve({ data: [], error: null }),
    client.from("discord_access_reviews").select("id,profile_id,category,candidate_team_ids,status,created_at").eq("status", "pending"),
  ]);
  const error = teams.error || profiles.error || registrations.error || mappings.error || reviews.error;
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const profileRows = profiles.data ?? [];
  const registrationRows = registrations.data ?? [];
  const mappingRows = mappings.data ?? [];
  const reviewRows = reviews.data ?? [];
  const data = (teams.data ?? []).map((team) => {
    const members = profileRows.filter((profile) => profile.team_id === team.id);
    const teamMappings = mappingRows.filter((mapping) => mapping.team_id === team.id);
    const teamRegistrations = registrationRows.filter(
      (registration) => registration.official_team_id === team.id || registration.team_id === team.id,
    );
    const mappingState = resolveTeamMappingState(teamMappings);
    const primaryIgl =
      members.find((member) => member.id === team.primary_igl_profile_id) ??
      members.find((member) => member.role === "team_igl" && member.is_active) ??
      null;
    const warnings: string[] = [];
    if (!team.logo_url) warnings.push("missing_logo");
    if (!primaryIgl) warnings.push("missing_igl");
    if (!members.some((member) => member.role === "team_manager" && member.is_active)) warnings.push("missing_manager");
    if (mappingState === "unmapped") warnings.push("missing_discord_mapping");
    if (mappingState === "role_missing") warnings.push("discord_role_missing");
    if (mappingState === "conflict") warnings.push("discord_mapping_conflict");
    if (mappingState === "pending_review") warnings.push("discord_mapping_pending");
    if (["archived", "disbanded", "merged"].includes(team.status) && teamMappings.some((mapping) => mapping.enabled)) {
      warnings.push("archived_mapping_conflict");
    }
    if (
      reviewRows.some((review) => Array.isArray(review.candidate_team_ids) && (review.candidate_team_ids as string[]).includes(team.id))
    ) {
      warnings.push("open_review");
    }

    return {
      ...team,
      primaryIgl,
      managers: members.filter((member) => member.role === "team_manager" && member.is_active),
      coaches: members.filter((member) => member.role === "coach" && member.is_active),
      memberCandidates: members.filter(
        (member) => member.is_active && !["super_admin", "admin", "organizer", "moderator"].includes(member.role),
      ),
      rosterCount: members.filter((member) => member.is_active).length,
      discordMappings: teamMappings,
      mappingState,
      registrationCount: teamRegistrations.length,
      latestRegistrationAt: teamRegistrations[0]?.updated_at ?? null,
      warnings,
    };
  });
  const summary = {
    total: data.length,
    active: data.filter((team) => team.status === "active").length,
    archived: data.filter((team) => ["archived", "disbanded", "merged"].includes(team.status)).length,
    missingLogo: data.filter((team) => team.warnings.includes("missing_logo")).length,
    missingIgl: data.filter((team) => team.warnings.includes("missing_igl")).length,
    missingManager: data.filter((team) => team.warnings.includes("missing_manager")).length,
    missingDiscordMapping: data.filter((team) => team.mappingState === "unmapped").length,
    openReviews: reviewRows.length,
  };

  return Response.json({
    data: {
      teams: data,
      summary,
      pendingRegistrations: registrationRows.filter((registration) =>
        ["pending", "submitted", "under_review"].includes(registration.onboarding_status || registration.status),
      ),
      openReviews: reviewRows,
    },
  });
}
