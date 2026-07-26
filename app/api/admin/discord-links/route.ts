import { requireAdmin } from "@/lib/admin-auth";
import { writeAuditLogFromRequest } from "@/lib/audit-logs";
import { logServerError } from "@/lib/server-monitoring";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/service-role-client";
import type { Tables } from "@/types/database.types";

const TEAM_ACCESS_ROLES = ["coach", "team_igl", "team_manager"] as const;
const TEAM_ACCESS_ROLE_SET = new Set<string>(TEAM_ACCESS_ROLES);

type ProfileRow = Pick<Tables<"profiles">, "id" | "email" | "display_name" | "role" | "team_id" | "discord_user_id">;
type TeamRow = Pick<Tables<"teams">, "id" | "name">;

function mapProfile(profile: ProfileRow, teamNameById: Map<string, string>) {
  return {
    id: profile.id,
    email: profile.email,
    displayName: profile.display_name,
    role: profile.role,
    teamId: profile.team_id,
    teamName: profile.team_id ? (teamNameById.get(profile.team_id) ?? null) : null,
    discordUserId: profile.discord_user_id,
  };
}

export async function GET(request: Request) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    const client = getSupabaseServiceRoleClient();
    const [profilesResponse, teamsResponse] = await Promise.all([
      client
        .from("profiles")
        .select("id,email,display_name,role,team_id,discord_user_id")
        .in("role", TEAM_ACCESS_ROLES)
        .order("updated_at", { ascending: false }),
      client.from("teams").select("id,name").is("deleted_at", null),
    ]);

    if (profilesResponse.error) {
      throw profilesResponse.error;
    }

    if (teamsResponse.error) {
      throw teamsResponse.error;
    }

    const teamNameById = new Map(((teamsResponse.data ?? []) as TeamRow[]).map((team) => [team.id, team.name] as const));
    const profiles = ((profilesResponse.data ?? []) as ProfileRow[]).map((profile) => mapProfile(profile, teamNameById));

    return Response.json({
      success: true,
      data: {
        profiles,
      },
    });
  } catch (error: unknown) {
    await logServerError("admin.discord-links.list", error, request);
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const profileId = typeof body.profileId === "string" ? body.profileId.trim() : "";
    const discordUserId = typeof body.discordUserId === "string" ? body.discordUserId.trim() : "";

    if (!profileId) {
      return Response.json({ success: false, error: "profileId is required" }, { status: 400 });
    }

    const client = getSupabaseServiceRoleClient();
    const { data: existingProfile, error: existingProfileError } = await client
      .from("profiles")
      .select("id,email,display_name,role,team_id,discord_user_id")
      .eq("id", profileId)
      .maybeSingle();

    if (existingProfileError) {
      throw existingProfileError;
    }

    if (!existingProfile) {
      return Response.json({ success: false, error: "Profile not found" }, { status: 404 });
    }

    if (!TEAM_ACCESS_ROLE_SET.has(existingProfile.role)) {
      return Response.json(
        {
          success: false,
          error: "Discord linking is limited to team-access profiles.",
        },
        { status: 400 },
      );
    }

    const nextDiscordUserId = discordUserId || null;
    const now = new Date().toISOString();
    const { data: updatedProfile, error: updateError } = await client
      .from("profiles")
      .update({
        discord_user_id: nextDiscordUserId,
        updated_at: now,
      })
      .eq("id", existingProfile.id)
      .select("id,email,display_name,role,team_id,discord_user_id")
      .single();

    if (updateError) {
      if (/duplicate key|unique/i.test(updateError.message)) {
        return Response.json(
          {
            success: false,
            error: "That Discord user ID is already linked to another team profile.",
          },
          { status: 409 },
        );
      }

      throw updateError;
    }

    const teamNameById = new Map<string, string>();
    if (updatedProfile.team_id) {
      const { data: team } = await client.from("teams").select("id,name").eq("id", updatedProfile.team_id).maybeSingle();
      if (team?.id && team.name) {
        teamNameById.set(team.id, team.name);
      }
    }

    await writeAuditLogFromRequest(request, {
      action: nextDiscordUserId ? (existingProfile.discord_user_id ? "update_discord_link" : "link_discord") : "unlink_discord",
      entityType: "profile",
      entityId: existingProfile.id,
      oldValue: {
        discordUserId: existingProfile.discord_user_id,
      },
      newValue: {
        discordUserId: nextDiscordUserId,
      },
    });

    return Response.json({
      success: true,
      data: {
        profile: mapProfile(updatedProfile as ProfileRow, teamNameById),
      },
      message: nextDiscordUserId ? "Discord link saved." : "Discord link cleared.",
    });
  } catch (error: unknown) {
    await logServerError("admin.discord-links.update", error, request);
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}
