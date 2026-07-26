import { getRequestSession, permissionDeniedResponse } from "@/lib/admin-auth";
import { writeAuditLog } from "@/lib/audit-logs";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/service-role-client";
import { deterministicTeamId, normalizeCanonicalTeamIdentity } from "@/lib/team-reconciliation";

async function requireOwner(request: Request) {
  const session = await getRequestSession(request);
  if (!session)
    return {
      session: null,
      response: new Response("Unauthorized", { status: 401 }),
    };
  if (session.role !== "super_admin") {
    return {
      session: null,
      response: permissionDeniedResponse("Only the permanent owner may reconcile official teams."),
    };
  }
  return { session, response: null };
}

export async function GET(request: Request) {
  const auth = await requireOwner(request);
  if (auth.response) return auth.response;
  const client = getSupabaseServiceRoleClient();
  const [candidates, teams, links, aliases, mappings, memberships, registrations, audit] = await Promise.all([
    client.from("team_reconciliation_candidates").select("*").order("displayed_name"),
    client.from("teams").select("*").order("name"),
    client.from("team_source_links").select("*").order("source_type"),
    client.from("team_aliases").select("*").order("created_at"),
    client.from("discord_role_mappings").select("*").eq("mapping_type", "team_identity"),
    client.from("team_memberships").select("*").order("created_at"),
    client.from("registrations").select("*").order("created_at", { ascending: false }),
    client.from("team_registry_audit").select("*").order("created_at", { ascending: false }).limit(500),
  ]);
  const error =
    candidates.error ||
    teams.error ||
    links.error ||
    aliases.error ||
    mappings.error ||
    memberships.error ||
    registrations.error ||
    audit.error;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({
    data: {
      candidates: candidates.data ?? [],
      teams: teams.data ?? [],
      links: links.data ?? [],
      aliases: aliases.data ?? [],
      mappings: mappings.data ?? [],
      memberships: memberships.data ?? [],
      registrations: registrations.data ?? [],
      audit: audit.data ?? [],
      relationalAuthorizationEnabled: process.env.DISCORD_RELATIONAL_TEAM_AUTH_ENABLED?.trim().toLowerCase() === "true",
    },
  });
}

export async function POST(request: Request) {
  const auth = await requireOwner(request);
  if (auth.response || !auth.session) return auth.response;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const candidateId = typeof body.candidateId === "string" ? body.candidateId : "";
  const action = typeof body.action === "string" ? body.action : "";
  const client = getSupabaseServiceRoleClient();
  const { data: actorProfile } = await client.from("profiles").select("id").eq("auth_user_id", auth.session.uid).maybeSingle();
  const { data: candidate, error: candidateError } = await client
    .from("team_reconciliation_candidates")
    .select("*")
    .eq("id", candidateId)
    .single();
  if (candidateError || !candidate) {
    return Response.json({ error: "Reconciliation candidate not found." }, { status: 404 });
  }

  if (action === "leave_unresolved" || action === "request_information" || action === "reject") {
    const reviewStatus = action === "request_information" ? "changes_requested" : action === "reject" ? "rejected" : "pending";
    const { error } = await client
      .from("team_reconciliation_candidates")
      .update({
        proposed_action: action === "reject" ? "historical_only" : "unresolved",
        review_status: reviewStatus,
        owner_note: typeof body.ownerNote === "string" ? body.ownerNote.trim() : null,
        reviewed_by: actorProfile?.id ?? null,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", candidate.id);
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ success: true });
  }

  let teamId = typeof body.teamId === "string" ? body.teamId : "";
  if (action === "reject_discord_role") {
    if (candidate.source_type !== "discord_role") {
      return Response.json({ error: "Only Discord-role candidates can use this action." }, { status: 400 });
    }
    const now = new Date().toISOString();
    const { error: mappingError } = await client
      .from("discord_role_mappings")
      .update({
        mapping_type: "ignored",
        application_role: null,
        team_id: null,
        enabled: false,
        mapping_status: "unmapped",
        updated_at: now,
      })
      .eq("discord_role_id", candidate.source_identifier);
    if (mappingError) return Response.json({ error: mappingError.message }, { status: 500 });
    const { error: candidateUpdateError } = await client
      .from("team_reconciliation_candidates")
      .update({
        proposed_action: "ignore_non_team_role",
        review_status: "resolved",
        owner_note: typeof body.ownerNote === "string" ? body.ownerNote.trim() : null,
        reviewed_by: actorProfile?.id ?? null,
        reviewed_at: now,
        updated_at: now,
      })
      .eq("id", candidate.id);
    if (candidateUpdateError) return Response.json({ error: candidateUpdateError.message }, { status: 500 });
    await client.from("team_registry_audit").insert({
      actor_profile_id: actorProfile?.id ?? null,
      action,
      candidate_id: candidate.id,
      previous_value: candidate,
      new_value: {
        discordRoleId: candidate.source_identifier,
        enabled: false,
        mappingType: "ignored",
      },
    });
    return Response.json({ success: true });
  }

  const createsOfficialTeam = action === "approve_create" || action === "preserve_historical" || action === "archive";
  if (createsOfficialTeam) {
    const canonicalName = typeof body.canonicalName === "string" ? body.canonicalName.trim() : "";
    const tag = typeof body.tag === "string" ? body.tag.trim() : "";
    const slug = typeof body.slug === "string" ? body.slug.trim().toLowerCase() : "";
    const status = action === "preserve_historical" || action === "archive" || body.status === "archived" ? "archived" : "active";
    if (!canonicalName || !tag || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      return Response.json(
        {
          error: "Canonical name, tag, and a lowercase URL-safe slug are required.",
        },
        { status: 400 },
      );
    }
    teamId = deterministicTeamId(candidate.source_type, candidate.source_identifier);
    const { error: teamError } = await client.from("teams").upsert(
      {
        id: teamId,
        name: canonicalName,
        normalized_name: normalizeCanonicalTeamIdentity(canonicalName),
        tag,
        short_name: tag,
        slug,
        status,
        is_active: status === "active",
        verification_status: "verified",
        source_metadata: {
          reconciliationCandidateId: candidate.id,
          ownerApproved: true,
          compatibilitySource: {
            type: candidate.source_type,
            identifier: candidate.source_identifier,
          },
        },
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );
    if (teamError) {
      const statusCode = teamError.code === "23505" ? 409 : 500;
      return Response.json({ error: teamError.message }, { status: statusCode });
    }
  } else if (action === "approve_link" || action === "merge_duplicate") {
    if (!teamId) return Response.json({ error: "An existing relational team is required." }, { status: 400 });
    const { data: targetTeam } = await client.from("teams").select("id").eq("id", teamId).maybeSingle();
    if (!targetTeam) return Response.json({ error: "Relational team not found." }, { status: 404 });
  } else {
    return Response.json({ error: "Unsupported reconciliation action." }, { status: 400 });
  }

  const now = new Date().toISOString();
  const { error: linkError } = await client.from("team_source_links").upsert(
    {
      team_id: teamId,
      source_type: candidate.source_type,
      source_identifier: candidate.source_identifier,
      historical_name: candidate.displayed_name,
      historical_tag: candidate.team_tag,
      historical_slug: candidate.slug,
      metadata: candidate.evidence,
      linked_by: actorProfile?.id ?? null,
      linked_at: now,
    },
    { onConflict: "source_type,source_identifier" },
  );
  if (linkError) return Response.json({ error: linkError.message }, { status: 500 });

  const aliasValues = Array.from(
    new Set(
      [
        candidate.displayed_name,
        candidate.team_tag,
        candidate.slug,
        ...(Array.isArray(candidate.aliases) ? candidate.aliases.filter((value): value is string => typeof value === "string") : []),
      ].filter((value): value is string => Boolean(value)),
    ),
  );
  for (const alias of aliasValues) {
    const sourceIdentifier = `${candidate.source_identifier}:${normalizeCanonicalTeamIdentity(alias)}`;
    const aliasRecord = {
      team_id: teamId,
      alias,
      normalized_alias: normalizeCanonicalTeamIdentity(alias),
      source: candidate.source_type,
      source_identifier: sourceIdentifier,
      is_primary: alias === candidate.displayed_name,
      previous_name: alias === candidate.displayed_name ? alias : null,
      previous_tag: alias === candidate.team_tag ? alias : null,
      previous_slug: alias === candidate.slug ? alias : null,
    };
    const { data: existingAlias, error: aliasLookupError } = await client
      .from("team_aliases")
      .select("id")
      .eq("source", candidate.source_type)
      .eq("source_identifier", sourceIdentifier)
      .maybeSingle();
    if (aliasLookupError) return Response.json({ error: aliasLookupError.message }, { status: 500 });
    const { error: aliasError } = existingAlias
      ? await client.from("team_aliases").update(aliasRecord).eq("id", existingAlias.id)
      : await client.from("team_aliases").insert(aliasRecord);
    if (aliasError) return Response.json({ error: aliasError.message }, { status: 500 });
  }

  const { error: reviewError } = await client
    .from("team_reconciliation_candidates")
    .update({
      proposed_team_id: teamId,
      proposed_action:
        action === "approve_create"
          ? "create_new"
          : action === "preserve_historical"
            ? "historical_only"
            : action === "archive"
              ? "archive"
              : action === "merge_duplicate"
                ? "merge_candidate"
                : "link_existing",
      review_status: "resolved",
      owner_note: typeof body.ownerNote === "string" ? body.ownerNote.trim() : null,
      reviewed_by: actorProfile?.id ?? null,
      reviewed_at: now,
      updated_at: now,
    })
    .eq("id", candidate.id);
  if (reviewError) return Response.json({ error: reviewError.message }, { status: 500 });

  await client.from("team_registry_audit").insert({
    actor_profile_id: actorProfile?.id ?? null,
    action,
    team_id: teamId,
    candidate_id: candidate.id,
    previous_value: candidate,
    new_value: { teamId, ownerApproved: true, sourcePreserved: true },
  });
  await writeAuditLog({
    actorId: auth.session.uid,
    action: `team_reconciliation_${action}`,
    entityType: "team",
    entityId: teamId,
    oldValue: candidate,
    newValue: {
      teamId,
      sourceType: candidate.source_type,
      sourceIdentifier: candidate.source_identifier,
    },
  });
  return Response.json({ success: true, data: { teamId } });
}
