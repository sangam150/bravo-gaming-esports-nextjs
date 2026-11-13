import pg from "pg";
import { EXPECTED_SUPABASE_PROJECT_REF, getVerifiedDatabaseConnection } from "../scripts/lib/verified-database-connection.mjs";

const { Client } = pg;
const configuredConnectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
const connection = getVerifiedDatabaseConnection(configuredConnectionString, "Migration preflight connection");
const client = new Client({ connectionString: connection.connectionString, ssl: connection.ssl });

await client.connect();
try {
  await client.query("begin transaction isolation level repeatable read read only");
  await client.query("set local lock_timeout = '5s'");
  await client.query("set local statement_timeout = '30s'");

  const migrationRows = await client.query(`select version from supabase_migrations.schema_migrations order by version`);
  const invalidNames = await client.query(`
      select count(*)::int as count
      from public.teams
      where deleted_at is null
        and archived_at is null
        and merged_into_team_id is null
        and is_active
        and lower(btrim(status)) = 'active'
        and nullif(regexp_replace(lower(btrim(name)), '[^a-z0-9]+', '', 'g'), '') is null
    `);
  const identityCollisions = await client.query(`
      with active_teams as (
        select id, name, tag, slug
        from public.teams
        where deleted_at is null
          and archived_at is null
          and merged_into_team_id is null
          and is_active
          and lower(btrim(status)) = 'active'
      ), identities as (
        select
          team_record.id as team_id,
          regexp_replace(lower(btrim(raw_identity.value)), '[^a-z0-9]+', '', 'g') as normalized_identity
        from active_teams team_record
        cross join lateral (
          select team_record.name as value
          union all select team_record.tag
          union all select team_record.slug
          union all
          select coalesce(alias_record.alias, alias_record.previous_name, alias_record.previous_tag, alias_record.previous_slug)
          from public.team_aliases alias_record
          where alias_record.team_id = team_record.id
        ) raw_identity
      )
      select count(*)::int as count
      from (
        select normalized_identity
        from identities
        where nullif(normalized_identity, '') is not null
        group by normalized_identity
        having count(distinct team_id) > 1
      ) collisions
    `);
  const duplicateAccounts = await client.query(`
      select count(*)::int as count
      from (
        select lower(btrim(pubg_account_id))
        from public.players
        where nullif(btrim(pubg_account_id), '') is not null
        group by lower(btrim(pubg_account_id))
        having count(*) > 1
      ) duplicates
    `);
  const dependencies = await client.query(`
      select count(*)::int as count
      from unnest(array[
        to_regclass('public.teams'),
        to_regclass('public.team_aliases'),
        to_regclass('public.players'),
        to_regclass('public.matches'),
        to_regclass('public.match_player_results'),
        to_regclass('public.app_documents'),
        to_regclass('public.registrations'),
        to_regclass('public.event_teams'),
        to_regclass('public.audit_logs')
      ]) dependency
      where dependency is null
    `);

  const remoteVersions = migrationRows.rows.map((row) => String(row.version));
  const expectedAppliedVersions = Array.from({ length: 28 }, (_, index) => String(index + 1).padStart(3, "0"));
  const orderedPrefix =
    remoteVersions.length >= 21 &&
    remoteVersions.length <= expectedAppliedVersions.length &&
    remoteVersions.every((version, index) => version === expectedAppliedVersions[index]);
  const migrationLedgerState = !orderedPrefix
    ? "unexpected"
    : remoteVersions.length === expectedAppliedVersions.length
      ? "applied"
      : "ready-to-apply";
  const scoringColumns = remoteVersions.includes("026")
    ? await client.query(`
    select count(*)::int as count from information_schema.columns where table_schema='public' and
    ((table_name='matches' and column_name='scoring_rules') or
     (table_name='match_team_results' and column_name in ('damage','adjustment_points','decision_reason','disqualified')))
  `)
    : null;
  const atomicFunction = remoteVersions.includes("027")
    ? await client.query(`
    select to_regprocedure('public.commit_competition_match(jsonb,jsonb,jsonb,bigint,boolean,text,uuid)') is not null as present,
    exists(select 1 from information_schema.columns where table_schema='public' and table_name='matches' and column_name='revision') as revision_present,
    case when to_regprocedure('public.commit_competition_match(jsonb,jsonb,jsonb,bigint,boolean,text,uuid)') is not null then
      not has_function_privilege('anon','public.commit_competition_match(jsonb,jsonb,jsonb,bigint,boolean,text,uuid)','EXECUTE') and
      not has_function_privilege('authenticated','public.commit_competition_match(jsonb,jsonb,jsonb,bigint,boolean,text,uuid)','EXECUTE') and
      has_function_privilege('service_role','public.commit_competition_match(jsonb,jsonb,jsonb,bigint,boolean,text,uuid)','EXECUTE')
    else false end as service_only,
    exists(select 1 from pg_trigger where tgrelid='public.matches'::regclass and tgname='matches_revision' and tgenabled='O') as revision_trigger_enabled,
    not exists (
      select 1 from (values ('anon'),('authenticated')) browser(role_name)
      cross join unnest(array['matches','match_team_results','match_player_results','point_systems']) scoring(table_name)
      where has_table_privilege(browser.role_name,format('public.%I',scoring.table_name),'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
        or has_any_column_privilege(browser.role_name,format('public.%I',scoring.table_name),'INSERT')
        or has_any_column_privilege(browser.role_name,format('public.%I',scoring.table_name),'UPDATE')
        or has_any_column_privilege(browser.role_name,format('public.%I',scoring.table_name),'REFERENCES')
    ) as browser_writes_blocked
  `)
    : null;
  const duplicateRegistrationCaptains = await client.query(`
    select count(*)::int as count from (
      select event_id, lower(btrim(contact_discord))
      from public.registrations
      where deleted_at is null and status in ('pending','approved','changes_requested')
      group by event_id, lower(btrim(contact_discord))
      having count(*) > 1
    ) duplicates
  `);
  const duplicateEventSlots = await client.query(`
    select count(*)::int as count from (
      select event_id, slot_number from public.event_teams
      where slot_number is not null
      group by event_id, slot_number having count(*) > 1
    ) duplicates
  `);
  const invalidEventSlots = await client.query(`
    select count(*)::int as count
    from public.event_teams membership
    join public.events event_record on event_record.id = membership.event_id
    where membership.slot_number is not null
      and (membership.slot_number < 1 or membership.slot_number > event_record.max_teams)
  `);
  const overCapacityEvents = await client.query(`
    select count(*)::int as count from (
      select event_record.id
      from public.events event_record
      left join public.event_teams membership on membership.event_id = event_record.id
      group by event_record.id, event_record.max_teams
      having count(membership.id) > event_record.max_teams
    ) over_capacity
  `);
  const registrationFunction = remoteVersions.includes("028")
    ? await client.query(`
    select
      exists(select 1 from information_schema.columns where table_schema='public' and table_name='event_teams' and column_name='registration_id') as registration_link_present,
      to_regprocedure('public.create_event_registration(jsonb)') is not null as create_present,
      to_regprocedure('public.confirm_event_registration(uuid,uuid,uuid,text,jsonb,integer)') is not null as confirm_present,
      to_regprocedure('public.set_event_registration_status(uuid,text,text,uuid,jsonb,uuid)') is not null as decision_present,
      to_regprocedure('public.commit_competition_event(jsonb,jsonb,uuid)') is not null as event_commit_present,
      exists(select 1 from pg_trigger where tgrelid='public.event_teams'::regclass and tgname='event_teams_enforce_membership' and tgenabled='O') as membership_trigger_enabled,
      exists(select 1 from pg_trigger where tgrelid='public.event_teams'::regclass and tgname='event_teams_sync_count' and tgenabled='O') as count_trigger_enabled,
      not has_function_privilege('anon','public.confirm_event_registration(uuid,uuid,uuid,text,jsonb,integer)','EXECUTE')
        and not has_function_privilege('authenticated','public.confirm_event_registration(uuid,uuid,uuid,text,jsonb,integer)','EXECUTE')
        and has_function_privilege('service_role','public.confirm_event_registration(uuid,uuid,uuid,text,jsonb,integer)','EXECUTE') as service_only,
      not exists (
        select 1 from (values ('anon'),('authenticated')) browser(role_name)
        cross join unnest(array['registrations','event_teams']) protected(table_name)
        where has_table_privilege(browser.role_name,format('public.%I',protected.table_name),'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
          or has_any_column_privilege(browser.role_name,format('public.%I',protected.table_name),'INSERT')
          or has_any_column_privilege(browser.role_name,format('public.%I',protected.table_name),'UPDATE')
          or has_any_column_privilege(browser.role_name,format('public.%I',protected.table_name),'REFERENCES')
      ) as browser_writes_blocked
  `)
    : null;
  const checks = {
    migrationLedgerState,
    appliedVersions: remoteVersions,
    pendingVersions: orderedPrefix ? expectedAppliedVersions.slice(remoteVersions.length) : [],
    scoringSchemaReady: !scoringColumns || scoringColumns.rows[0]?.count === 5,
    atomicSchemaReady:
      !atomicFunction ||
      Boolean(
        atomicFunction.rows[0]?.present &&
        atomicFunction.rows[0]?.revision_present &&
        atomicFunction.rows[0]?.service_only &&
        atomicFunction.rows[0]?.revision_trigger_enabled &&
        atomicFunction.rows[0]?.browser_writes_blocked,
      ),
    registrationSchemaReady: !registrationFunction || Object.values(registrationFunction.rows[0] ?? {}).every(Boolean),
    duplicateActiveRegistrationCaptains: Number(duplicateRegistrationCaptains.rows[0]?.count ?? -1),
    duplicateEventSlots: Number(duplicateEventSlots.rows[0]?.count ?? -1),
    invalidEventSlots: Number(invalidEventSlots.rows[0]?.count ?? -1),
    overCapacityEvents: Number(overCapacityEvents.rows[0]?.count ?? -1),
    invalidActiveTeamNames: Number(invalidNames.rows[0]?.count ?? -1),
    normalizedIdentityCollisions: Number(identityCollisions.rows[0]?.count ?? -1),
    duplicatePubgAccountIds: Number(duplicateAccounts.rows[0]?.count ?? -1),
    missingDependencies: Number(dependencies.rows[0]?.count ?? -1),
  };

  if (
    checks.migrationLedgerState === "unexpected" ||
    !checks.scoringSchemaReady ||
    !checks.atomicSchemaReady ||
    !checks.registrationSchemaReady ||
    checks.duplicateActiveRegistrationCaptains !== 0 ||
    checks.duplicateEventSlots !== 0 ||
    checks.invalidEventSlots !== 0 ||
    checks.overCapacityEvents !== 0 ||
    checks.invalidActiveTeamNames !== 0 ||
    checks.normalizedIdentityCollisions !== 0 ||
    checks.duplicatePubgAccountIds !== 0 ||
    checks.missingDependencies !== 0
  ) {
    throw new Error(`Production migration preflight failed: ${JSON.stringify(checks)}`);
  }

  console.log(JSON.stringify({ projectRef: EXPECTED_SUPABASE_PROJECT_REF, ...checks }));
  await client.query("rollback");
} catch (error) {
  await client.query("rollback").catch(() => undefined);
  throw error;
} finally {
  await client.end();
}
