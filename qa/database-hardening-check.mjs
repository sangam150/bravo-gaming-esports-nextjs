import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";

const [config, playerTeamMigration, privacyMigration, migration, eventStatisticsMigration, pubgHub, reconciliationScript] =
  await Promise.all([
    readFile(new URL("../supabase/config.toml", import.meta.url), "utf8"),
    readFile(new URL("../supabase/migrations/022_player_team_match_history_linking.sql", import.meta.url), "utf8"),
    readFile(new URL("../supabase/migrations/023_private_document_and_publication_boundary.sql", import.meta.url), "utf8"),
    readFile(new URL("../supabase/migrations/024_public_data_and_authorization_hardening.sql", import.meta.url), "utf8"),
    readFile(new URL("../supabase/migrations/025_event_player_statistics.sql", import.meta.url), "utf8"),
    readFile(new URL("../lib/pubg-hub.ts", import.meta.url), "utf8"),
    readFile(new URL("../scripts/reconcile-mahasangram-relational.ts", import.meta.url), "utf8"),
  ]);
const activationMigration = migration;

for (const migrationName of [
  "022_player_team_match_history_linking.sql",
  "023_private_document_and_publication_boundary.sql",
  "024_public_data_and_authorization_hardening.sql",
  "025_event_player_statistics.sql",
  "026_versioned_scoring_decisions.sql",
  "027_atomic_match_results.sql",
]) {
  assert.match(config, new RegExp(`\\./migrations/${migrationName.replace(".", "\\.")}`));
}
assert.ok(
  config.indexOf("022_player_team_match_history_linking.sql") < config.indexOf("023_private_document_and_publication_boundary.sql") &&
    config.indexOf("023_private_document_and_publication_boundary.sql") <
      config.indexOf("024_public_data_and_authorization_hardening.sql") &&
    config.indexOf("024_public_data_and_authorization_hardening.sql") < config.indexOf("025_event_player_statistics.sql"),
  "Migrations 022 through 025 must remain in their dependency-safe order.",
);
assert.match(config, /\.\/migrations\/024_public_data_and_authorization_hardening\.sql/);
assert.match(config, /\.\/migrations\/025_event_player_statistics\.sql/);
assert.ok(
  config.indexOf("024_public_data_and_authorization_hardening.sql") < config.indexOf("025_event_player_statistics.sql"),
  "Migration 025 must run after the public-data hardening migration.",
);

// Keep historical 022 byte-identical; fail-closed activation belongs forward.
assert.match(playerTeamMigration, /enabled boolean not null default true/i);
assert.match(
  activationMigration,
  /alter table private\.player_team_link_settings[\s\S]*alter column enabled set default false[\s\S]*insert into private\.player_team_link_settings\s*\(singleton, enabled\)[\s\S]*values\s*\(true, false\)[\s\S]*updated_by is null/i,
);
assert.match(playerTeamMigration, /lock table public\.teams, public\.team_aliases in share row exclusive mode/i);
assert.match(playerTeamMigration, /active canonical team name\/tag\/slug\/alias identities collide after normalization/i);
assert.match(playerTeamMigration, /canonical PUBG account IDs are duplicated/i);
assert.doesNotMatch(playerTeamMigration, /delete\s+from\s+public\./i);
assert.match(
  playerTeamMigration,
  /revoke all on function public\.reconcile_player_team_link_for_account\(text\) from public, anon, authenticated[\s\S]*grant execute on function public\.reconcile_player_team_link_for_account\(text\) to service_role/i,
);

assert.match(privacyMigration, /revoke all privileges on table public\.app_documents from public, anon, authenticated/i);
assert.match(privacyMigration, /alter view public\.homepage_content set \(security_invoker = true\)/i);
assert.match(privacyMigration, /alter view public\.contact_messages set \(security_invoker = true\)/i);
assert.match(privacyMigration, /alter view public\.news_articles set \(security_invoker = true\)/i);
assert.doesNotMatch(privacyMigration, /delete\s+from\s+public\./i);
for (const relation of ["matches", "match_results", "match_players", "match_team_results", "match_player_results"]) {
  assert.match(privacyMigration, new RegExp(`alter table public\\.${relation} enable row level security`, "i"));
}
assert.doesNotMatch(privacyMigration, /status\s*=\s*'approved'/i);

const roleHelper = migration.match(/create or replace function public\.current_user_role\(\)[\s\S]*?\$\$;/i)?.[0];
const teamHelper = migration.match(/create or replace function public\.current_user_team_id\(\)[\s\S]*?\$\$;/i)?.[0];
assert.ok(roleHelper, "The active-profile role helper is missing.");
assert.ok(teamHelper, "The active-profile team helper is missing.");
assert.match(roleHelper, /profile\.is_active/i);
assert.match(teamHelper, /profile\.is_active/i);
assert.doesNotMatch(roleHelper, /public\.users/i);
assert.doesNotMatch(teamHelper, /public\.users/i);

assert.match(migration, /revoke update on public\.profiles from authenticated/i);
assert.match(migration, /grant update \(display_name\) on public\.profiles to authenticated/i);
assert.match(migration, /revoke update on public\.users from authenticated/i);
assert.match(migration, /profile\.role_source <> 'discord_sync'/i);

const eventTeamPolicy = migration.match(
  /create policy "public read event teams"[\s\S]*?drop policy if exists "public read announcements"/i,
)?.[0];
assert.ok(eventTeamPolicy, "The public event-team policy is missing.");
for (const requirement of [
  /team_record\.is_active/i,
  /team_record\.status = 'active'/i,
  /team_record\.archived_at is null/i,
  /team_record\.merged_into_team_id is null/i,
  /team_record\.deleted_at is null/i,
  /team_record\.demo_seed_tag is null/i,
]) {
  assert.match(eventTeamPolicy, requirement);
}

const rosterHistoryPolicy = migration.match(
  /create policy "public read roster history"[\s\S]*?drop policy if exists "public read event teams"/i,
)?.[0];
assert.ok(rosterHistoryPolicy, "The canonical roster-history public policy is missing.");
for (const requirement of [
  /team_roster_history\.team_id/i,
  /team_record\.is_active/i,
  /team_record\.status = 'active'/i,
  /team_record\.archived_at is null/i,
  /team_record\.merged_into_team_id is null/i,
  /team_record\.deleted_at is null/i,
  /team_record\.demo_seed_tag is null/i,
  /team_roster_history\.player_id/i,
  /player_record\.is_active/i,
  /player_record\.deleted_at is null/i,
  /player_record\.demo_seed_tag is null/i,
]) {
  assert.match(rosterHistoryPolicy, requirement);
}

const sponsorPolicy = migration.match(/create policy "public read sponsors"[\s\S]*?drop policy if exists "public read videos"/i)?.[0];
assert.ok(sponsorPolicy, "The explicit sponsor publication policy is missing.");
assert.match(sponsorPolicy, /status = 'published'/i);
assert.match(sponsorPolicy, /and published/i);
assert.match(sponsorPolicy, /deleted_at is null/i);

const videoPolicy = migration.match(/create policy "public read videos"[\s\S]*?drop policy if exists "public read approved matches"/i)?.[0];
assert.ok(videoPolicy, "The explicit video publication policy is missing.");
assert.match(videoPolicy, /status = 'published'/i);
assert.match(videoPolicy, /and published/i);
assert.match(videoPolicy, /published_at is not null/i);
assert.match(videoPolicy, /deleted_at is null/i);

assert.match(eventStatisticsMigration, /create table if not exists public\.event_player_statistics/i);
assert.match(eventStatisticsMigration, /source_player_id text not null/i);
assert.match(eventStatisticsMigration, /nullif\(btrim\(source_player_id\), ''\) is not null/i);
assert.match(eventStatisticsMigration, /unique \(event_id, player_id\)/i);
assert.match(eventStatisticsMigration, /event_player_statistics_source_player_unique_idx/i);
assert.match(eventStatisticsMigration, /best_placement is null or best_placement > 0/i);
assert.match(eventStatisticsMigration, /source_rank is null or source_rank > 0/i);
assert.match(eventStatisticsMigration, /nullif\(btrim\(source_provider\), ''\) is not null/i);
assert.match(eventStatisticsMigration, /alter table public\.event_player_statistics enable row level security/i);

const eventPlayerPolicy = eventStatisticsMigration.match(
  /create policy "public read published event player statistics"[\s\S]*?drop policy if exists "admins manage event player statistics"/i,
)?.[0];
assert.ok(eventPlayerPolicy, "The event-level player-statistics public policy is missing.");
for (const requirement of [
  /event_record\.published/i,
  /event_record\.published_at is not null/i,
  /event_record\.deleted_at is null/i,
  /event_record\.demo_seed_tag is null/i,
  /season_record\.status in \('active', 'completed'\)/i,
  /season_record\.demo_seed_tag is null/i,
  /player_record\.is_active/i,
  /player_record\.deleted_at is null/i,
  /player_record\.demo_seed_tag is null/i,
  /team_record\.is_active/i,
  /team_record\.status = 'active'/i,
  /team_record\.archived_at is null/i,
  /team_record\.merged_into_team_id is null/i,
  /team_record\.deleted_at is null/i,
  /team_record\.demo_seed_tag is null/i,
  /event_team_record\.event_id = event_player_statistics\.event_id/i,
  /event_team_record\.team_id = event_player_statistics\.team_id/i,
  /lower\(event_team_record\.status\) in \('approved', 'confirmed', 'accepted'\)/i,
  /event_team_record\.demo_seed_tag is null/i,
]) {
  assert.match(eventPlayerPolicy, requirement);
}

const eventPlayerAdminPolicy = eventStatisticsMigration.match(
  /create policy "admins manage event player statistics"[\s\S]*?revoke all privileges on table public\.event_player_statistics/i,
)?.[0];
assert.ok(eventPlayerAdminPolicy, "The event-level player-statistics admin policy is missing.");
assert.match(eventPlayerAdminPolicy, /using \(public\.is_admin_role\(\)\)/i);
assert.match(eventPlayerAdminPolicy, /with check \(public\.is_admin_role\(\)\)/i);

const publicStatisticsGrant = eventStatisticsMigration.match(
  /grant select \([\s\S]*?\) on table public\.event_player_statistics to anon, authenticated/i,
)?.[0];
assert.ok(publicStatisticsGrant, "The event-level player-statistics public column grant is missing.");
assert.doesNotMatch(publicStatisticsGrant, /source_player_id/i);
assert.doesNotMatch(publicStatisticsGrant, /demo_seed_tag/i);

const supabaseDatasetBuilder = pubgHub.match(
  /async function buildSupabaseBaseDataset\(\)[\s\S]*?async function buildDocumentStoreBaseDataset\(\)/i,
)?.[0];
assert.ok(supabaseDatasetBuilder, "The Supabase PUBG dataset builder is missing.");

function sourceBlock(pattern, message) {
  const block = supabaseDatasetBuilder.match(pattern)?.[0];
  assert.ok(block, message);
  return block;
}

function assertRequirements(block, requirements) {
  for (const requirement of requirements) assert.match(block, requirement);
}

const seasonFilter = sourceBlock(/const hiddenSeasonIds[\s\S]*?const teams:/i, "The public season filter is missing.");
assertRequirements(seasonFilter, [/\["active", "completed"\]/i, /row\.demo_seed_tag/i]);

const teamFilter = sourceBlock(/const teams: BaseTeamRow\[\][\s\S]*?const players:/i, "The public team filter is missing.");
assertRequirements(teamFilter, [
  /normalizedStatus\.trim\(\)\.toLowerCase\(\) === "active"/i,
  /row\.deleted_at/i,
  /row\.archived_at/i,
  /row\.merged_into_team_id/i,
  /row\.demo_seed_tag/i,
]);

const playerFilter = sourceBlock(/const players: BasePlayerRow\[\][\s\S]*?const events:/i, "The public player filter is missing.");
assertRequirements(playerFilter, [/row\.is_active/i, /row\.deleted_at/i, /row\.demo_seed_tag/i]);

const eventFilter = sourceBlock(/const events: BaseEventRow\[\][\s\S]*?const activeTeamIds/i, "The public event filter is missing.");
assertRequirements(eventFilter, [
  /row\.published !== true/i,
  /row\.published_at/i,
  /row\.deleted_at/i,
  /row\.demo_seed_tag/i,
  /hiddenSeasonIds\.has/i,
]);

const eventTeamFilter = sourceBlock(
  /const eventTeams: BaseEventTeamRow\[\][\s\S]*?const eventPlayerStatistics:/i,
  "The public event-team service filter is missing.",
);
assertRequirements(eventTeamFilter, [
  /publicEventIds\.has/i,
  /activeTeamIds\.has/i,
  /row\.demo_seed_tag/i,
  /\["approved", "confirmed", "accepted"\]\.includes\(status\)/i,
]);

const eventPlayerFilter = sourceBlock(
  /const eventPlayerStatistics: BaseEventPlayerStatisticRow\[\][\s\S]*?const matches:/i,
  "The public event-player-statistics service filter is missing.",
);
assertRequirements(eventPlayerFilter, [/publicEventIds\.has/i, /activePlayerIds\.has/i, /activeTeamIds\.has/i, /row\.demo_seed_tag/i]);

const matchFilter = sourceBlock(/const matches: BaseMatchRow\[\][\s\S]*?const publicMatchIds/i, "The public match filter is missing.");
assertRequirements(matchFilter, [
  /=== "published"/i,
  /row\.published_at/i,
  /row\.deleted_at/i,
  /row\.demo_seed_tag/i,
  /publicEventIds\.has/i,
  /hiddenSeasonIds\.has/i,
]);

const teamResultFilter = sourceBlock(
  /const teamResults: BaseTeamResultRow\[\][\s\S]*?const playerResults:/i,
  "The public team-result filter is missing.",
);
assertRequirements(teamResultFilter, [/publicMatchIds\.has/i, /activeTeamIds\.has/i, /row\.demo_seed_tag/i]);

const playerResultFilter = sourceBlock(
  /const playerResults: BasePlayerResultRow\[\][\s\S]*?const rosterHistory:/i,
  "The public player-result filter is missing.",
);
assertRequirements(playerResultFilter, [/publicMatchIds\.has/i, /activePlayerIds\.has/i, /activeTeamIds\.has/i, /row\.demo_seed_tag/i]);

const rosterFilter = sourceBlock(/const rosterHistory: BaseRosterRow\[\][\s\S]*?return \{/i, "The public roster filter is missing.");
assertRequirements(rosterFilter, [/activeTeamIds\.has/i, /activePlayerIds\.has/i, /row\.demo_seed_tag/i]);

const overlayDeclaration = reconciliationScript.match(/const TOURNAMENT_APPROVAL_OVERLAY_KEYS = \[[\s\S]*?\] as const;/i)?.[0];
assert.ok(overlayDeclaration, "The explicit Mahasangram approval overlay allowlist is missing.");
const overlayKeys = [...overlayDeclaration.matchAll(/"([A-Za-z]+)"/g)].map((match) => match[1]).sort();
assert.deepEqual(overlayKeys, [
  "lifecycleStatus",
  "ownerApprovedAt",
  "publicationStatus",
  "published",
  "reviewNote",
  "reviewStatus",
  "slug",
]);
const overlayValidator = reconciliationScript.match(/function validateTournamentApprovalOverlay[\s\S]*?function auditDocumentRow/i)?.[0];
assert.ok(overlayValidator, "The explicit Mahasangram approval overlay validator is missing.");
assertRequirements(overlayValidator, [
  /currentRow\.data\.published !== true/i,
  /lifecycleStatus[\s\S]*?completed/i,
  /publicationStatus[\s\S]*?published/i,
  /reviewStatus[\s\S]*?approved/i,
  /ownerApprovedAt/i,
  /reviewNote/i,
]);
assert.doesNotMatch(reconciliationScript, /auditTournamentRow\.data\s*=/i);
assert.match(reconciliationScript, /materialSignature\(tournamentRows, stripTournamentApprovalOverlay\)/i);
assert.match(reconciliationScript, /parseTournament\(auditTournamentRow, \{ publicationApproved: true \}\)/i);
assert.match(reconciliationScript, /published_at = \$20/i);
assert.match(reconciliationScript, /requiredTimestamp\(approvedAudit\.updated_at, "audit\.updated_at"\)/i);
assert.match(reconciliationScript, /one verified placement for each team/i);
assert.match(reconciliationScript, /tournament\.maxTeams < teams\.length/i);
assert.match(reconciliationScript, /tournament end date precedes its start date/i);
assert.match(reconciliationScript, /const EXPECTED_PROJECT_REF = "hldppfhtkfgthainismr"/i);
assert.match(reconciliationScript, /hostname\.split\("\."\)\.includes\(EXPECTED_PROJECT_REF\)/i);
assert.match(reconciliationScript, /username\.split\("\."\)\.includes\(EXPECTED_PROJECT_REF\)/i);
// node-postgres URL SSL parameters override the explicit ssl object. The script
// strips them and supplies the trusted CA, hostname and verification flag itself.
assert.match(reconciliationScript, /\["sslmode", "sslcert", "sslkey", "sslrootcert"\]/i);
assert.match(reconciliationScript, /parsed\.searchParams\.delete\(parameter\)/i);
assert.match(
  reconciliationScript,
  /ssl:\s*\{\s*ca: SUPABASE_ROOT_CA,\s*rejectUnauthorized: true,\s*servername: new URL\(connectionString\)\.hostname/i,
);
assert.doesNotMatch(reconciliationScript, /rejectUnauthorized:\s*false/i);
assert.match(reconciliationScript, /process\.argv\.includes\("--apply"\)/i);
assert.match(reconciliationScript, /--confirm=\$\{TOURNAMENT_ID\}/i);
assert.match(reconciliationScript, /client\.query\("begin"\)/i);
assert.match(reconciliationScript, /pg_advisory_xact_lock/i);
assert.match(reconciliationScript, /set local lock_timeout/i);
assert.match(reconciliationScript, /set local statement_timeout/i);
assert.match(reconciliationScript, /to_regclass\('public\.event_player_statistics'\)/i);
assert.match(reconciliationScript, /await client\.query\("rollback"\)/i);
assert.match(reconciliationScript, /if \(apply\) \{[\s\S]*?await client\.query\("commit"\)/i);
assert.match(reconciliationScript, /on conflict \(event_id, team_id\)[\s\S]*?do update/i);
assert.match(reconciliationScript, /on conflict \(match_id, team_id\)[\s\S]*?do update/i);
assert.match(reconciliationScript, /on conflict \(event_id, player_id\)[\s\S]*?do update/i);
assert.match(reconciliationScript, /competition\.reconcile_verified_mahasangram/i);
assert.doesNotMatch(reconciliationScript, /\b(?:delete|truncate|drop)\s+(?:from|table)\b/i);
assert.doesNotMatch(reconciliationScript, /prizePool \?\? "TBD"/i);

let obsoleteSnapshotExists = true;
try {
  await access(new URL("../supabase/schema.sql", import.meta.url), constants.F_OK);
} catch {
  obsoleteSnapshotExists = false;
}
assert.equal(obsoleteSnapshotExists, false, "The obsolete schema snapshot must not compete with the ordered migration chain.");

console.log("Database authorization, publication, and migration-source QA passed.");
