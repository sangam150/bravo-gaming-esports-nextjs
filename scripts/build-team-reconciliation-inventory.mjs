import { mkdir, writeFile } from "node:fs/promises";
import pg from "pg";

const { Client } = pg;
const client = new Client({
  connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const normalize = (value) =>
  String(value || "")
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");

const NON_TEAM_TYPES = new Set(["access", "team_function", "verification", "cosmetic", "bot", "deny"]);
const explicitConflicts = new Map([
  ["near-edge-protocol-n3p", ["N3P", "Near Edge Protocol", "Near Edge Protocol / N3P"]],
  ["muji-verse", ["Muju verse", "MujiVerse"]],
  ["bir-gorkhali", ["Bir Gorkhali", "Gorkhali Esports"]],
]);

await client.connect();

try {
  const documentsResult = await client.query(`
      select collection_name, id, data
      from public.app_documents
      where collection_name in ('teams', 'standings', 'matches', 'tournamentMatches', 'players', 'registrations')
      order by collection_name, id
    `);
  const roleResult = await client.query(`
      select discord_guild_id, discord_role_id, discord_role_name, mapping_type,
             mapping_status, team_id, enabled, role_missing_at
      from public.discord_role_mappings
      order by role_position desc
    `);
  const linksResult = await client.query("select * from public.team_source_links order by source_type, source_identifier");
  const teamsResult = await client.query("select * from public.teams order by name");

  const documents = documentsResult.rows;
  const documentTeams = documents.filter((row) => row.collection_name === "teams");
  const standings = documents.filter((row) => row.collection_name === "standings");
  const matches = documents.filter((row) => row.collection_name === "matches");
  const players = documents.filter((row) => row.collection_name === "players");
  const registrations = documents.filter((row) => row.collection_name === "registrations");
  const roles = roleResult.rows;
  const teamRoles = roles.filter((role) => {
    if (NON_TEAM_TYPES.has(role.mapping_type)) return false;
    const roleName = normalize(role.discord_role_name);
    return roleName.length > 1 && !["support", "streamer", "girls", "dev", "crew", "bravofamily"].includes(roleName);
  });

  const candidates = documentTeams.map((row) => {
    const team = row.data || {};
    const teamStandings = standings.filter((entry) => entry.data?.teamId === row.id);
    const teamPlayers = players.filter((entry) => entry.data?.teamId === row.id);
    const matchCount = matches.filter(
      (entry) => Array.isArray(entry.data?.teamResults) && entry.data.teamResults.some((result) => result?.teamId === row.id),
    ).length;
    const exactRoleMatches = teamRoles.filter((role) => {
      const roleName = normalize(role.discord_role_name);
      return [team.name, team.tag, row.id].some((value) => normalize(value) === roleName);
    });
    const conflictNames = explicitConflicts.get(row.id) || [];
    const conflictWarnings = [];
    if (conflictNames.length) conflictWarnings.push("explicit_owner_identity_review_required");
    if (exactRoleMatches.length > 1) conflictWarnings.push("multiple_discord_role_candidates");

    return {
      sourceType: "compatibility_team",
      sourceIdentifier: row.id,
      displayedName: team.name || row.id,
      teamTag: team.tag || null,
      slug: team.slug || row.id,
      aliases: [...new Set([team.sourceTeamName, ...conflictNames].filter(Boolean))],
      eventParticipation: teamStandings.map((entry) => entry.data?.tournamentId).filter(Boolean),
      matchCount,
      playerCount: teamPlayers.length,
      discordRoles: exactRoleMatches.map((role) => ({
        roleId: role.discord_role_id,
        roleName: role.discord_role_name,
      })),
      possibleRelationalMatches: teamsResult.rows
        .filter(
          (official) =>
            normalize(official.name) === normalize(team.name) || (official.tag && normalize(official.tag) === normalize(team.tag)),
        )
        .map((official) => official.id),
      confidence: exactRoleMatches.length === 1 && conflictWarnings.length === 0 ? 0.95 : 0.5,
      conflictWarnings,
      proposedAction: "unresolved",
      linkedTeamId:
        linksResult.rows.find((link) => link.source_type === "compatibility_team" && link.source_identifier === row.id)?.team_id || null,
    };
  });

  const unmatchedDiscordRoles = teamRoles
    .filter(
      (role) =>
        !candidates.some((candidate) => candidate.discordRoles.some((candidateRole) => candidateRole.roleId === role.discord_role_id)),
    )
    .map((role) => ({
      sourceType: "discord_role",
      sourceIdentifier: role.discord_role_id,
      displayedName: role.discord_role_name,
      teamTag: null,
      slug: null,
      aliases: [],
      eventParticipation: [],
      matchCount: 0,
      playerCount: 0,
      discordRoles: [{ roleId: role.discord_role_id, roleName: role.discord_role_name }],
      possibleRelationalMatches: [],
      confidence: 0,
      conflictWarnings: ["discord_role_has_no_exact_compatibility_team"],
      proposedAction: "unresolved",
      linkedTeamId: role.team_id,
    }));

  await client.query("begin");
  for (const candidate of [...candidates, ...unmatchedDiscordRoles]) {
    await client.query(
      `
        insert into public.team_reconciliation_candidates (
          source_type, source_identifier, displayed_name, team_tag, slug, aliases,
          evidence, confidence, conflict_warnings, proposed_action
        )
        values ($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8,$9::jsonb,$10)
        on conflict (source_type, source_identifier) do update
        set displayed_name = excluded.displayed_name,
            team_tag = excluded.team_tag,
            slug = excluded.slug,
            aliases = excluded.aliases,
            evidence = excluded.evidence,
            confidence = excluded.confidence,
            conflict_warnings = excluded.conflict_warnings,
            updated_at = now()
      `,
      [
        candidate.sourceType,
        candidate.sourceIdentifier,
        candidate.displayedName,
        candidate.teamTag,
        candidate.slug,
        JSON.stringify(candidate.aliases),
        JSON.stringify({
          eventParticipation: candidate.eventParticipation,
          matchCount: candidate.matchCount,
          playerCount: candidate.playerCount,
          discordRoles: candidate.discordRoles,
          possibleRelationalMatches: candidate.possibleRelationalMatches,
        }),
        candidate.confidence,
        JSON.stringify(candidate.conflictWarnings),
        candidate.proposedAction,
      ],
    );
  }
  await client.query("commit");

  const inventory = {
    generatedAt: new Date().toISOString(),
    compatibilityTeams: candidates.length,
    eventTeamIdentities: new Set(standings.map((row) => row.data?.teamId).filter(Boolean)).size,
    playerTeamIdentities: new Set(players.map((row) => row.data?.teamId).filter(Boolean)).size,
    registrations: registrations.length,
    discordRoles: roles.length,
    discordTeamRoleCandidates: teamRoles.length,
    canonicalTeams: teamsResult.rowCount,
    linkedCompatibilityTeams: candidates.filter((candidate) => candidate.linkedTeamId).length,
    unresolved: [...candidates, ...unmatchedDiscordRoles].filter((candidate) => !candidate.linkedTeamId).length,
    candidates,
    unmatchedDiscordRoles,
  };

  await mkdir("qa-artifacts/team-reconciliation", { recursive: true });
  await writeFile("qa-artifacts/team-reconciliation/inventory.json", `${JSON.stringify(inventory, null, 2)}\n`);
  process.stdout.write(
    `${JSON.stringify(
      {
        compatibilityTeams: inventory.compatibilityTeams,
        eventTeamIdentities: inventory.eventTeamIdentities,
        playerTeamIdentities: inventory.playerTeamIdentities,
        discordTeamRoleCandidates: inventory.discordTeamRoleCandidates,
        unmatchedDiscordRoles: unmatchedDiscordRoles.length,
        unresolved: inventory.unresolved,
      },
      null,
      2,
    )}\n`,
  );
} catch (error) {
  await client.query("rollback").catch(() => {});
  throw error;
} finally {
  await client.end();
}
