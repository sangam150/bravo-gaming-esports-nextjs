begin;

-- Event registration, relational membership and roster slots are one database
-- transaction. Compatibility documents remain the UI read model, but they can
-- no longer report approval without the corresponding relational membership.
alter table public.event_teams
  add column if not exists registration_id uuid references public.registrations(id) on delete set null;

create unique index if not exists event_teams_event_slot_unique_idx
  on public.event_teams(event_id, slot_number)
  where slot_number is not null;
create unique index if not exists event_teams_registration_unique_idx
  on public.event_teams(registration_id)
  where registration_id is not null;
create unique index if not exists registrations_active_event_discord_idx
  on public.registrations(event_id, lower(btrim(contact_discord)))
  where deleted_at is null and status in ('pending', 'approved', 'changes_requested');

-- Browser sessions must use the guarded server routes. Existing SELECT grants
-- and RLS policies are intentionally preserved.
do $$
declare
  protected_table regclass;
  column_names text;
begin
  foreach protected_table in array array[
    'public.registrations'::regclass,
    'public.event_teams'::regclass
  ] loop
    execute format(
      'revoke insert, update, delete, truncate, references, trigger on table %s from public, anon, authenticated',
      protected_table
    );
    select string_agg(quote_ident(attname), ', ' order by attnum)
      into column_names
    from pg_attribute
    where attrelid = protected_table and attnum > 0 and not attisdropped;
    execute format(
      'revoke insert (%s), update (%s), references (%s) on table %s from public, anon, authenticated',
      column_names, column_names, column_names, protected_table
    );
    execute format('grant all privileges on table %s to service_role', protected_table);
  end loop;
end;
$$;

create or replace function public.merge_jsonb_patch(p_target jsonb, p_patch jsonb)
returns jsonb
language sql
immutable
set search_path = pg_catalog
as $$
  select coalesce(jsonb_object_agg(entry.key, entry.value), '{}'::jsonb)
  from jsonb_each(coalesce(p_target, '{}'::jsonb) || coalesce(p_patch, '{}'::jsonb)) entry
  where entry.value <> 'null'::jsonb;
$$;
revoke all on function public.merge_jsonb_patch(jsonb,jsonb) from public, anon, authenticated;
grant execute on function public.merge_jsonb_patch(jsonb,jsonb) to service_role;

create or replace function public.event_accepts_registration(p_event public.events)
returns boolean
language sql
set search_path = pg_catalog
as $$
  select coalesce(p_event.published, false)
    and p_event.published_at is not null
    and p_event.deleted_at is null
    and p_event.demo_seed_tag is null
    and p_event.registration_status = 'open'
    and p_event.lifecycle_status not in ('ongoing', 'completed', 'cancelled', 'archived')
    and p_event.status::text not in ('completed', 'archived')
    and p_event.registration_start is not null
    and p_event.registration_end is not null
    and clock_timestamp() between p_event.registration_start and p_event.registration_end
    and (p_event.start_date is null or p_event.start_date > clock_timestamp())
    and (p_event.end_date is null or p_event.end_date >= clock_timestamp());
$$;
revoke all on function public.event_accepts_registration(public.events) from public, anon, authenticated;
grant execute on function public.event_accepts_registration(public.events) to service_role;

create or replace function public.enforce_event_team_membership()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  target_event public.events;
  target_team public.teams;
  membership_count integer;
  same_team_already_present boolean := false;
begin
  select * into target_event from public.events where id = new.event_id for update;
  if not found or target_event.deleted_at is not null then
    raise exception using errcode = 'P0001', message = 'event_not_available';
  end if;

  select * into target_team from public.teams where id = new.team_id;
  if not found
    or target_team.deleted_at is not null
    or target_team.demo_seed_tag is not null
    or not coalesce(target_team.is_active, false)
    or lower(btrim(target_team.status)) <> 'active'
    or target_team.archived_at is not null
    or target_team.merged_into_team_id is not null then
    raise exception using errcode = 'P0001', message = 'registration_team_not_eligible';
  end if;

  if tg_op = 'INSERT' then
    select exists(
      select 1 from public.event_teams membership
      where membership.event_id = new.event_id and membership.team_id = new.team_id
    ) into same_team_already_present;
    select count(*)::integer into membership_count
    from public.event_teams membership
    where membership.event_id = new.event_id;
  else
    select count(*)::integer into membership_count
    from public.event_teams membership
    where membership.event_id = new.event_id and membership.id <> old.id;
  end if;
  if membership_count >= greatest(coalesce(target_event.max_teams, 0), 0)
    and not same_team_already_present then
    raise exception using errcode = 'P0001', message = 'registration_capacity_full';
  end if;

  if new.slot_number is null
    and coalesce(current_setting('bravo.skip_slot_assignment', true), '') <> 'on' then
    if tg_op = 'INSERT' then
      select candidate.slot_number into new.slot_number
      from generate_series(1, target_event.max_teams) candidate(slot_number)
      where not exists (
        select 1 from public.event_teams occupied
        where occupied.event_id = new.event_id and occupied.slot_number = candidate.slot_number
      )
      order by candidate.slot_number
      limit 1;
    else
      select candidate.slot_number into new.slot_number
      from generate_series(1, target_event.max_teams) candidate(slot_number)
      where not exists (
        select 1 from public.event_teams occupied
        where occupied.event_id = new.event_id and occupied.slot_number = candidate.slot_number and occupied.id <> old.id
      )
      order by candidate.slot_number
      limit 1;
    end if;
  end if;

  if new.slot_number is not null
    and (new.slot_number < 1 or new.slot_number > target_event.max_teams) then
    raise exception using errcode = 'P0001', message = 'registration_slot_out_of_range';
  end if;
  new.updated_at := clock_timestamp();
  return new;
end;
$$;
drop trigger if exists event_teams_enforce_membership on public.event_teams;
create trigger event_teams_enforce_membership
before insert or update of event_id, team_id, slot_number on public.event_teams
for each row execute function public.enforce_event_team_membership();
revoke all on function public.enforce_event_team_membership() from public, anon, authenticated;

create or replace function public.sync_event_team_count()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  affected_event uuid;
begin
  affected_event := coalesce(new.event_id, old.event_id);
  update public.events event_record
  set team_count = (
        select count(*)::integer from public.event_teams membership
        where membership.event_id = affected_event
      ),
      updated_at = clock_timestamp()
  where event_record.id = affected_event;

  if tg_op = 'UPDATE' and old.event_id is distinct from new.event_id then
    update public.events event_record
    set team_count = (
          select count(*)::integer from public.event_teams membership
          where membership.event_id = old.event_id
        ),
        updated_at = clock_timestamp()
    where event_record.id = old.event_id;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
drop trigger if exists event_teams_sync_count on public.event_teams;
create trigger event_teams_sync_count
after insert or update or delete on public.event_teams
for each row execute function public.sync_event_team_count();
revoke all on function public.sync_event_team_count() from public, anon, authenticated;

create or replace function public.create_event_registration(p_registration jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
set lock_timeout = '5s'
as $$
declare
  registration_id uuid;
  target_event_id uuid;
  target_event public.events;
  document_data jsonb;
  created_at timestamptz := clock_timestamp();
begin
  registration_id := nullif(p_registration->>'id', '')::uuid;
  target_event_id := nullif(p_registration->>'tournamentId', '')::uuid;
  if registration_id is null or target_event_id is null
    or nullif(btrim(p_registration->>'teamName'), '') is null
    or nullif(btrim(p_registration->>'captainName'), '') is null
    or nullif(btrim(p_registration->>'captainDiscord'), '') is null then
    raise exception using errcode = '22023', message = 'invalid_event_registration';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(target_event_id::text, 0));
  select * into target_event from public.events where id = target_event_id for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'registration_event_not_found';
  end if;
  if not public.event_accepts_registration(target_event) then
    raise exception using errcode = 'P0001', message = 'registration_event_closed';
  end if;
  if (select count(*) from public.event_teams where event_id = target_event_id) >= target_event.max_teams then
    raise exception using errcode = 'P0001', message = 'registration_capacity_full';
  end if;
  if exists (
    select 1
    from public.event_teams membership
    join public.teams team_record on team_record.id = membership.team_id
    where membership.event_id = target_event_id
      and lower(btrim(team_record.name)) = lower(btrim(p_registration->>'teamName'))
  ) then
    raise exception using errcode = '23505', message = 'registration_duplicate_event_team';
  end if;

  document_data := public.merge_jsonb_patch(
    p_registration - 'id',
    jsonb_build_object(
      'status', 'pending',
      'createdAt', created_at,
      'tournamentId', target_event_id::text,
      'tournamentTitle', coalesce(target_event.name, target_event.title)
    )
  );

  insert into public.registrations(
    id, event_id, team_name, team_tag, contact_name, contact_email,
    contact_discord, player_igns, logo_upload_id, status, reference_code,
    onboarding_status, created_at, updated_at
  ) values (
    registration_id, target_event_id, btrim(p_registration->>'teamName'),
    nullif(btrim(p_registration->>'teamTag'), ''), btrim(p_registration->>'captainName'),
    nullif(btrim(p_registration->>'captainEmail'), ''), btrim(p_registration->>'captainDiscord'),
    case when jsonb_typeof(p_registration->'playerNames') = 'array' then p_registration->'playerNames' else '[]'::jsonb end,
    case when coalesce(p_registration->>'logoUploadId', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      then (p_registration->>'logoUploadId')::uuid else null end,
    'pending', 'BRV-' || upper(replace(registration_id::text, '-', '')),
    'submitted', created_at, created_at
  );

  insert into public.app_documents(collection_name, id, data, created_at, updated_at)
  values('registrations', registration_id::text, document_data, created_at, created_at);

  insert into public.audit_logs(actor_id, action, entity_type, entity_id, old_data, new_data)
  values(null, 'registration.submitted', 'event_registration', registration_id::text, null,
    jsonb_build_object('eventId', target_event_id, 'teamName', p_registration->>'teamName'));
  return document_data || jsonb_build_object('id', registration_id::text);
end;
$$;
revoke all on function public.create_event_registration(jsonb) from public, anon, authenticated;
grant execute on function public.create_event_registration(jsonb) to service_role;

create or replace function public.confirm_event_registration(
  p_registration_id uuid,
  p_team_id uuid,
  p_actor_id uuid,
  p_expected_claim_token text,
  p_updates jsonb default '{}'::jsonb,
  p_requested_slot integer default null
) returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
set lock_timeout = '5s'
as $$
declare
  registration_record public.registrations;
  registration_document public.app_documents;
  target_event public.events;
  target_team public.teams;
  membership public.event_teams;
  assigned_slot integer;
  confirmed_at timestamptz := clock_timestamp();
  next_data jsonb;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_registration_id::text, 0));
  select * into registration_document
  from public.app_documents
  where collection_name = 'registrations' and id = p_registration_id::text
  for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'registration_not_found';
  end if;

  select * into registration_record
  from public.registrations
  where id = p_registration_id and deleted_at is null
  for update;
  if not found then
    insert into public.registrations(
      id, event_id, team_name, team_tag, contact_name, contact_email,
      contact_discord, player_igns, logo_upload_id, status, reference_code,
      onboarding_status, created_at, updated_at
    ) values (
      p_registration_id, nullif(registration_document.data->>'tournamentId', '')::uuid,
      btrim(registration_document.data->>'teamName'), nullif(btrim(registration_document.data->>'teamTag'), ''),
      btrim(registration_document.data->>'captainName'), nullif(btrim(registration_document.data->>'captainEmail'), ''),
      btrim(registration_document.data->>'captainDiscord'),
      case when jsonb_typeof(registration_document.data->'playerNames') = 'array' then registration_document.data->'playerNames' else '[]'::jsonb end,
      case when coalesce(registration_document.data->>'logoUploadId', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        then (registration_document.data->>'logoUploadId')::uuid else null end,
      'pending', 'BRV-' || upper(replace(p_registration_id::text, '-', '')),
      'under_review', registration_document.created_at, confirmed_at
    ) returning * into registration_record;
    insert into public.audit_logs(actor_id, action, entity_type, entity_id, old_data, new_data)
    values(p_actor_id, 'registration.ledger_backfilled', 'event_registration', p_registration_id::text, null,
      jsonb_build_object('eventId', registration_record.event_id));
  end if;

  select * into membership
  from public.event_teams
  where registration_id = p_registration_id
  for update;
  if registration_document.data->>'status' = 'approved' then
    if found and membership.team_id = p_team_id and membership.event_id = registration_record.event_id
      and registration_record.status = 'approved' then
      return registration_document.data || jsonb_build_object('id', p_registration_id::text);
    end if;
    raise exception using errcode = '40001', message = 'registration_approval_conflict';
  end if;
  if registration_document.data->>'status' <> 'pending'
    or registration_record.status <> 'pending'
    or nullif(registration_document.data->>'approvalClaimToken', '') is distinct from nullif(p_expected_claim_token, '') then
    raise exception using errcode = '40001', message = 'registration_approval_conflict';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(registration_record.event_id::text, 0));
  select * into target_event from public.events where id = registration_record.event_id for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'registration_event_not_found';
  end if;
  if not public.event_accepts_registration(target_event) then
    raise exception using errcode = 'P0001', message = 'registration_event_closed';
  end if;
  select * into target_team from public.teams where id = p_team_id;
  if not found
    or target_team.deleted_at is not null
    or target_team.demo_seed_tag is not null
    or not coalesce(target_team.is_active, false)
    or lower(btrim(target_team.status)) <> 'active'
    or target_team.archived_at is not null
    or target_team.merged_into_team_id is not null then
    raise exception using errcode = 'P0001', message = 'registration_team_not_eligible';
  end if;

  select * into membership
  from public.event_teams
  where event_id = registration_record.event_id and team_id = p_team_id
  for update;
  if found and membership.registration_id is not null and membership.registration_id <> p_registration_id then
    raise exception using errcode = '23505', message = 'registration_duplicate_event_team';
  end if;
  if not found and (select count(*) from public.event_teams where event_id = registration_record.event_id) >= target_event.max_teams then
    raise exception using errcode = 'P0001', message = 'registration_capacity_full';
  end if;

  update public.registrations
  set team_id = p_team_id, official_team_id = p_team_id, status = 'approved',
      onboarding_status = 'approved', reviewed_by = p_actor_id,
      reviewed_at = confirmed_at, updated_at = confirmed_at
  where id = p_registration_id
  returning * into registration_record;

  if membership.id is null then
    insert into public.event_teams(event_id, team_id, slot_number, status, registration_id)
    values(registration_record.event_id, p_team_id, p_requested_slot, 'approved', p_registration_id)
    returning * into membership;
  else
    update public.event_teams
    set registration_id = p_registration_id, status = 'approved',
        slot_number = coalesce(p_requested_slot, slot_number), updated_at = confirmed_at
    where id = membership.id
    returning * into membership;
  end if;
  assigned_slot := membership.slot_number;

  next_data := public.merge_jsonb_patch(
    registration_document.data,
    coalesce(p_updates, '{}'::jsonb) || jsonb_build_object(
      'approvedTeamId', p_team_id::text,
      'eventSlotNumber', assigned_slot,
      'eventMembershipConfirmedAt', confirmed_at,
      'status', 'approved',
      'updatedAt', confirmed_at
    )
  ) - 'approvalClaimToken' - 'approvalClaimedAt' - 'approvalClaimedBy';
  update public.app_documents
  set data = next_data, updated_at = confirmed_at
  where collection_name = 'registrations' and id = p_registration_id::text;

  insert into public.audit_logs(actor_id, action, entity_type, entity_id, old_data, new_data)
  values(p_actor_id, 'registration.approved', 'event_registration', p_registration_id::text,
    jsonb_build_object('status', 'pending', 'eventId', registration_record.event_id),
    jsonb_build_object('status', 'approved', 'eventId', registration_record.event_id,
      'teamId', p_team_id, 'slotNumber', assigned_slot));
  return next_data || jsonb_build_object('id', p_registration_id::text);
end;
$$;
revoke all on function public.confirm_event_registration(uuid,uuid,uuid,text,jsonb,integer) from public, anon, authenticated;
grant execute on function public.confirm_event_registration(uuid,uuid,uuid,text,jsonb,integer) to service_role;

create or replace function public.set_event_registration_status(
  p_registration_id uuid,
  p_expected_status text,
  p_status text,
  p_actor_id uuid,
  p_updates jsonb default '{}'::jsonb,
  p_expected_team_id uuid default null
) returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
set lock_timeout = '5s'
as $$
declare
  registration_record public.registrations;
  registration_document public.app_documents;
  membership public.event_teams;
  decided_at timestamptz := clock_timestamp();
  next_data jsonb;
begin
  if p_status not in ('pending', 'rejected') then
    raise exception using errcode = '22023', message = 'invalid_registration_decision';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_registration_id::text, 0));
  select * into registration_document from public.app_documents
  where collection_name = 'registrations' and id = p_registration_id::text for update;
  if registration_document.id is null then
    raise exception using errcode = 'P0001', message = 'registration_not_found';
  end if;
  select * into registration_record from public.registrations
  where id = p_registration_id and deleted_at is null for update;
  if registration_record.id is null then
    if registration_document.data->>'status' <> 'pending' or p_expected_status <> 'pending' then
      raise exception using errcode = 'P0001', message = 'registration_ledger_missing';
    end if;
    insert into public.registrations(
      id, event_id, team_name, team_tag, contact_name, contact_email,
      contact_discord, player_igns, logo_upload_id, status, reference_code,
      onboarding_status, created_at, updated_at
    ) values (
      p_registration_id, nullif(registration_document.data->>'tournamentId', '')::uuid,
      btrim(registration_document.data->>'teamName'), nullif(btrim(registration_document.data->>'teamTag'), ''),
      btrim(registration_document.data->>'captainName'), nullif(btrim(registration_document.data->>'captainEmail'), ''),
      btrim(registration_document.data->>'captainDiscord'),
      case when jsonb_typeof(registration_document.data->'playerNames') = 'array' then registration_document.data->'playerNames' else '[]'::jsonb end,
      case when coalesce(registration_document.data->>'logoUploadId', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        then (registration_document.data->>'logoUploadId')::uuid else null end,
      'pending', 'BRV-' || upper(replace(p_registration_id::text, '-', '')),
      'under_review', registration_document.created_at, decided_at
    ) returning * into registration_record;
    insert into public.audit_logs(actor_id, action, entity_type, entity_id, old_data, new_data)
    values(p_actor_id, 'registration.ledger_backfilled', 'event_registration', p_registration_id::text, null,
      jsonb_build_object('eventId', registration_record.event_id));
  end if;
  if registration_document.data->>'status' = p_status and registration_record.status = p_status then
    return registration_document.data || jsonb_build_object('id', p_registration_id::text);
  end if;
  if registration_document.data->>'status' is distinct from p_expected_status
    or registration_record.status is distinct from p_expected_status then
    raise exception using errcode = '40001', message = 'registration_decision_conflict';
  end if;

  select * into membership from public.event_teams
  where registration_id = p_registration_id for update;
  if membership.id is not null then
    if p_expected_team_id is not null and membership.team_id <> p_expected_team_id then
      raise exception using errcode = '40001', message = 'registration_membership_conflict';
    end if;
    delete from public.event_teams where id = membership.id;
  end if;

  update public.registrations
  set status = p_status,
      onboarding_status = case when p_status = 'rejected' then 'rejected' else 'under_review' end,
      team_id = case when p_status = 'pending' then null else team_id end,
      official_team_id = case when p_status = 'pending' then null else official_team_id end,
      reviewed_by = p_actor_id, reviewed_at = decided_at, updated_at = decided_at
  where id = p_registration_id;

  next_data := public.merge_jsonb_patch(
    registration_document.data,
    coalesce(p_updates, '{}'::jsonb) || jsonb_build_object('status', p_status, 'updatedAt', decided_at)
  ) - 'approvalClaimToken' - 'approvalClaimedAt' - 'approvalClaimedBy'
    - 'eventSlotNumber' - 'eventMembershipConfirmedAt';
  if p_status = 'pending' then next_data := next_data - 'approvedTeamId'; end if;
  if p_status = 'rejected' then
    next_data := next_data - 'logoPath' - 'logoUploadId' - 'logoUrl';
  end if;
  update public.app_documents set data = next_data, updated_at = decided_at
  where collection_name = 'registrations' and id = p_registration_id::text;

  insert into public.audit_logs(actor_id, action, entity_type, entity_id, old_data, new_data)
  values(p_actor_id, 'registration.' || p_status, 'event_registration', p_registration_id::text,
    jsonb_build_object('status', p_expected_status, 'teamId', membership.team_id, 'slotNumber', membership.slot_number),
    jsonb_build_object('status', p_status));
  return next_data || jsonb_build_object('id', p_registration_id::text);
end;
$$;
revoke all on function public.set_event_registration_status(uuid,text,text,uuid,jsonb,uuid) from public, anon, authenticated;
grant execute on function public.set_event_registration_status(uuid,text,text,uuid,jsonb,uuid) to service_role;

create or replace function public.commit_competition_event(
  p_event jsonb,
  p_team_ids jsonb,
  p_actor_id uuid default null
) returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
set lock_timeout = '5s'
as $$
declare
  incoming public.events;
  previous public.events;
  saved public.events;
  old_memberships jsonb;
  requested_count integer;
  team_value text;
  requested_team_id uuid;
  team_slot integer := 0;
begin
  incoming := jsonb_populate_record(null::public.events, p_event);
  if incoming.id is null or jsonb_typeof(p_team_ids) is distinct from 'array' then
    raise exception using errcode = '22023', message = 'invalid_event_transaction_input';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(incoming.id::text, 0));
  select * into previous from public.events where id = incoming.id for update;
  select coalesce(jsonb_agg(to_jsonb(membership) order by membership.slot_number), '[]'::jsonb)
  into old_memberships from public.event_teams membership where event_id = incoming.id;
  requested_count := jsonb_array_length(p_team_ids);
  if requested_count > greatest(coalesce(incoming.max_teams, 0), 0) then
    raise exception using errcode = 'P0001', message = 'registration_capacity_full';
  end if;
  if (select count(distinct value) from jsonb_array_elements_text(p_team_ids)) <> requested_count then
    raise exception using errcode = '23505', message = 'duplicate_event_team';
  end if;
  if exists (
    select 1 from jsonb_array_elements_text(p_team_ids) requested(value)
    left join public.teams team_record on team_record.id = requested.value::uuid
    where team_record.id is null or team_record.deleted_at is not null or team_record.demo_seed_tag is not null
      or not coalesce(team_record.is_active, false) or lower(btrim(team_record.status)) <> 'active'
      or team_record.archived_at is not null or team_record.merged_into_team_id is not null
  ) then
    raise exception using errcode = 'P0001', message = 'registration_team_not_eligible';
  end if;
  if exists (
    select 1 from public.event_teams membership
    where membership.event_id = incoming.id and membership.registration_id is not null
      and not exists (
        select 1 from jsonb_array_elements_text(p_team_ids) requested(value)
        where requested.value::uuid = membership.team_id
      )
  ) then
    raise exception using errcode = 'P0001', message = 'registered_event_team_cannot_be_removed';
  end if;

  if previous.id is null then
    insert into public.events(
      id, season_id, title, event_type, game, status, description, banner_url,
      start_date, end_date, name, slug, type, mode, perspective, prize_pool,
      rules, region, tier, competition_status, server, schedule, map_rotation,
      max_teams, team_count, season_day_number, match_count, source_url,
      published, published_at, created_at, updated_at
    ) values (
      incoming.id, incoming.season_id, incoming.title, incoming.event_type, incoming.game,
      incoming.status, incoming.description, incoming.banner_url, incoming.start_date, incoming.end_date,
      incoming.name, incoming.slug, incoming.type, incoming.mode, incoming.perspective,
      incoming.prize_pool, incoming.rules, incoming.region, incoming.tier,
      incoming.competition_status, incoming.server, incoming.schedule, incoming.map_rotation,
      incoming.max_teams, 0, incoming.season_day_number, incoming.match_count, incoming.source_url,
      incoming.published, incoming.published_at, coalesce(incoming.created_at, clock_timestamp()), clock_timestamp()
    ) returning * into saved;
  else
    update public.events set
      season_id = incoming.season_id, title = incoming.title, event_type = incoming.event_type,
      game = incoming.game, status = incoming.status, description = incoming.description,
      banner_url = incoming.banner_url, start_date = incoming.start_date, end_date = incoming.end_date,
      name = incoming.name, slug = incoming.slug, type = incoming.type, mode = incoming.mode,
      perspective = incoming.perspective, prize_pool = incoming.prize_pool, rules = incoming.rules,
      region = incoming.region, tier = incoming.tier, competition_status = incoming.competition_status,
      server = incoming.server, schedule = incoming.schedule, map_rotation = incoming.map_rotation,
      max_teams = incoming.max_teams, season_day_number = incoming.season_day_number,
      match_count = incoming.match_count, source_url = incoming.source_url,
      published = incoming.published, published_at = incoming.published_at, updated_at = clock_timestamp()
    where id = incoming.id returning * into saved;
  end if;

  delete from public.event_teams membership
  where membership.event_id = incoming.id and membership.registration_id is null
    and not exists (
      select 1 from jsonb_array_elements_text(p_team_ids) requested(value)
      where requested.value::uuid = membership.team_id
    );
  perform set_config('bravo.skip_slot_assignment', 'on', true);
  update public.event_teams set slot_number = null where event_id = incoming.id;
  perform set_config('bravo.skip_slot_assignment', 'off', true);

  for team_value in select value from jsonb_array_elements_text(p_team_ids) loop
    team_slot := team_slot + 1;
    requested_team_id := team_value::uuid;
    update public.event_teams membership
    set slot_number = team_slot,
        status = case when membership.registration_id is not null or incoming.published then 'approved' else 'registered' end,
        updated_at = clock_timestamp()
    where membership.event_id = incoming.id and membership.team_id = requested_team_id;
    if not found then
      insert into public.event_teams(event_id, team_id, slot_number, status)
      values(incoming.id, requested_team_id, team_slot, case when incoming.published then 'approved' else 'registered' end);
    end if;
  end loop;

  update public.events event_record
  set team_count = (select count(*)::integer from public.event_teams where event_id = incoming.id),
      updated_at = clock_timestamp()
  where event_record.id = incoming.id returning * into saved;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, old_data, new_data)
  values(p_actor_id, 'event.commit', 'event_transaction', incoming.id::text,
    jsonb_build_object('event', to_jsonb(previous), 'memberships', old_memberships),
    jsonb_build_object('event', to_jsonb(saved), 'teamIds', p_team_ids));
  return to_jsonb(saved);
end;
$$;
revoke all on function public.commit_competition_event(jsonb,jsonb,uuid) from public, anon, authenticated;
grant execute on function public.commit_competition_event(jsonb,jsonb,uuid) to service_role;

notify pgrst, 'reload schema';
commit;
