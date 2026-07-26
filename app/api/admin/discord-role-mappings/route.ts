import { getRequestSession, permissionDeniedResponse } from "@/lib/admin-auth";
import { writeAuditLog } from "@/lib/audit-logs";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/service-role-client";
import type { TablesInsert } from "@/types/database.types";

const MAPPING_TYPES = new Set(["access", "team_function", "team_identity", "verification", "cosmetic", "bot", "deny", "ignored"]);
const APPLICATION_ROLES = new Set(["admin", "organizer", "moderator", "team_manager", "team_igl", "coach", "player", "viewer"]);

async function requireSuperAdmin(request: Request) {
  const session = await getRequestSession(request);
  if (!session)
    return {
      session: null,
      response: new Response("Unauthorized", { status: 401 }),
    };
  if (session.role !== "super_admin") {
    return {
      session: null,
      response: permissionDeniedResponse("Only the owner can manage Discord role mappings."),
    };
  }
  return { session, response: null };
}

export async function GET(request: Request) {
  const auth = await requireSuperAdmin(request);
  if (auth.response) return auth.response;
  const client = getSupabaseServiceRoleClient();
  const guildId = process.env.BRAVO_DISCORD_GUILD_ID?.trim();
  if (!guildId) return Response.json({ error: "Discord guild is not configured." }, { status: 503 });

  const [{ data: mappings, error: mappingsError }, { data: teams, error: teamsError }, { data: reviews, error: reviewsError }] =
    await Promise.all([
      client.from("discord_role_mappings").select("*").eq("discord_guild_id", guildId).order("role_position", { ascending: false }),
      client.from("teams").select("id,name,tag,slug,is_active,status").is("deleted_at", null).order("name"),
      client.from("discord_access_reviews").select("*").eq("status", "pending").order("created_at", { ascending: false }).limit(200),
    ]);
  if (mappingsError || teamsError || reviewsError) {
    return Response.json(
      {
        error: mappingsError?.message ?? teamsError?.message ?? reviewsError?.message,
      },
      { status: 500 },
    );
  }
  return Response.json({ data: { guildId, mappings, teams, reviews } });
}

export async function POST(request: Request) {
  const auth = await requireSuperAdmin(request);
  if (auth.response || !auth.session) return auth.response;
  const client = getSupabaseServiceRoleClient();
  const guildId = process.env.BRAVO_DISCORD_GUILD_ID?.trim();
  const botToken = process.env.DISCORD_BOT_TOKEN?.trim();
  if (!guildId || !botToken) {
    return Response.json({ error: "Discord guild synchronization is not configured." }, { status: 503 });
  }
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

  if (body.action === "sync") {
    const { data: existingCatalog, error: existingCatalogError } = await client
      .from("discord_role_mappings")
      .select("discord_role_id,discord_role_name,mapping_type,team_id,enabled,mapping_status")
      .eq("discord_guild_id", guildId);
    if (existingCatalogError) {
      return Response.json({ error: existingCatalogError.message }, { status: 500 });
    }
    const existingByRoleId = new Map((existingCatalog ?? []).map((mapping) => [mapping.discord_role_id, mapping]));
    const response = await fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, {
      headers: { Authorization: `Bot ${botToken}` },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      return Response.json({ error: "Discord role catalog could not be synchronized." }, { status: 502 });
    }
    const roles = (await response.json()) as Array<{
      id: string;
      name: string;
      position: number;
      color: number;
      managed: boolean;
    }>;
    const synchronizedAt = new Date().toISOString();
    const catalog = roles
      .filter((role) => role.id !== guildId && role.name !== "@everyone")
      .map((role) => ({
        discord_guild_id: guildId,
        discord_role_id: role.id,
        discord_role_name: role.name,
        role_position: role.position,
        role_color: role.color,
        managed_by_discord: role.managed,
        last_verified_at: synchronizedAt,
        updated_at: synchronizedAt,
      }));
    const liveRoleIds = new Set(catalog.map((role) => role.discord_role_id));
    const missingMappings = (existingCatalog ?? []).filter(
      (mapping) => !liveRoleIds.has(mapping.discord_role_id) && mapping.mapping_type !== "ignored" && mapping.mapping_type !== "bot",
    );
    const newHumanRoles = catalog.filter((role) => !existingByRoleId.has(role.discord_role_id) && !role.managed_by_discord);
    const renamedRoles = catalog.filter((role) => {
      const existing = existingByRoleId.get(role.discord_role_id);
      return existing && existing.discord_role_name !== role.discord_role_name;
    });
    const { error } = await client.from("discord_role_mappings").upsert(catalog, { onConflict: "discord_guild_id,discord_role_id" });
    if (error) return Response.json({ error: error.message }, { status: 500 });
    if (missingMappings.length > 0) {
      const { error: missingError } = await client
        .from("discord_role_mappings")
        .update({
          mapping_status: "role_missing",
          role_missing_at: synchronizedAt,
          enabled: false,
          updated_at: synchronizedAt,
        })
        .eq("discord_guild_id", guildId)
        .in(
          "discord_role_id",
          missingMappings.map((mapping) => mapping.discord_role_id),
        );
      if (missingError) return Response.json({ error: missingError.message }, { status: 500 });
    }
    const reviewRows: TablesInsert<"discord_access_reviews">[] = [
      ...newHumanRoles.map((role) => ({
        discord_user_id: "guild-role-catalog",
        discord_guild_id: guildId,
        category: "new_discord_role",
        discord_role_ids: [role.discord_role_id],
        details: {
          roleName: role.discord_role_name,
          rolePosition: role.role_position,
        },
      })),
      ...missingMappings.map((mapping) => ({
        discord_user_id: "guild-role-catalog",
        discord_guild_id: guildId,
        category: "discord_role_missing",
        discord_role_ids: [mapping.discord_role_id],
        candidate_team_ids: mapping.team_id ? [mapping.team_id] : [],
        details: { previousRoleName: mapping.discord_role_name },
      })),
    ];
    for (const reviewRow of reviewRows) {
      const { error: reviewError } = await client.from("discord_access_reviews").insert(reviewRow);
      if (reviewError && reviewError.code !== "23505") {
        return Response.json({ error: reviewError.message }, { status: 500 });
      }
    }
    await writeAuditLog({
      actorId: auth.session.uid,
      action: "discord_role_catalog_synchronized",
      entityType: "discord_role_mapping",
      entityId: guildId,
      newValue: {
        roleCount: catalog.length,
        newHumanRoles: newHumanRoles.map((role) => role.discord_role_id),
        missingRoles: missingMappings.map((mapping) => mapping.discord_role_id),
        renamedRoles: renamedRoles.map((role) => ({
          roleId: role.discord_role_id,
          previousName: existingByRoleId.get(role.discord_role_id)?.discord_role_name,
          currentName: role.discord_role_name,
        })),
      },
    });
    return Response.json({
      success: true,
      data: {
        synchronized: catalog.length,
        newRoles: newHumanRoles.length,
        missingRoles: missingMappings.length,
        renamedRoles: renamedRoles.length,
      },
    });
  }

  const roleId = typeof body.roleId === "string" ? body.roleId.trim() : "";
  const mappingType = typeof body.mappingType === "string" ? body.mappingType : "";
  const applicationRole = typeof body.applicationRole === "string" && body.applicationRole ? body.applicationRole : null;
  const teamId = typeof body.teamId === "string" && body.teamId ? body.teamId : null;
  if (!/^\d{15,22}$/.test(roleId) || !MAPPING_TYPES.has(mappingType)) {
    return Response.json({ error: "Invalid Discord role mapping." }, { status: 400 });
  }
  if (applicationRole && !APPLICATION_ROLES.has(applicationRole)) {
    return Response.json({ error: "Invalid application role." }, { status: 400 });
  }
  if (mappingType === "team_identity" && !teamId) {
    return Response.json({ error: "Team identity roles require a linked Bravo team." }, { status: 400 });
  }
  if (mappingType !== "team_identity" && teamId) {
    return Response.json({ error: "Only team identity roles may link to a team." }, { status: 400 });
  }
  const patch = {
    mapping_type: mappingType,
    application_role: ["access", "team_function"].includes(mappingType) ? applicationRole : null,
    team_id: teamId,
    enabled: body.enabled === true,
    deny_access: mappingType === "deny",
    mapping_status: body.enabled === true ? "mapped" : "disabled",
    role_missing_at: null,
    priority: Number.isInteger(body.priority) ? Number(body.priority) : 0,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await client
    .from("discord_role_mappings")
    .update(patch)
    .eq("discord_guild_id", guildId)
    .eq("discord_role_id", roleId)
    .select("*")
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  await writeAuditLog({
    actorId: auth.session.uid,
    action: "discord_role_mapping_updated",
    entityType: "discord_role_mapping",
    entityId: roleId,
    newValue: patch,
  });
  return Response.json({ success: true, data });
}
