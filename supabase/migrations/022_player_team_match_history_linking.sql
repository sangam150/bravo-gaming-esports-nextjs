-- Competitive player/team linking based on verified published match history.
-- This subsystem is intentionally separate from public.team_memberships, which
-- remains the authorization boundary for authenticated team workspaces.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;

-- Active canonical teams must own every normalized name/tag/slug/alias identity exclusively.
-- A separate claim table is required because independent unique indexes cannot
-- prevent one identity field from colliding with a different field on another team.
create table if not exists private.canonical_team_identity_claims (
  normalized_identity text primary key
    check (
      nullif(normalized_identity, '') is not null
      and normalized_identity = regexp_replace(lower(btrim(normalized_identity)), '[^a-z0-9]+', '', 'g')
    ),
  team_id uuid not null references public.teams(id) on delete cascade,
  identity_sources text[] not null
    check (
      cardinality(identity_sources) between 1 and 4
      and identity_sources <@ array['name', 'tag', 'slug', 'alias']::text[]
    ),
  claimed_at timestamptz not null default now()
);

-- A retry after a non-transactional partial application may encounter the
-- earlier name/tag-only constraint. Replace it deterministically.
alter table private.canonical_team_identity_claims
  drop constraint if exists canonical_team_identity_claims_identity_sources_check;
alter table private.canonical_team_identity_claims
  add constraint canonical_team_identity_claims_identity_sources_check
  check (
    cardinality(identity_sources) between 1 and 4
    and identity_sources <@ array['name', 'tag', 'slug', 'alias']::text[]
  );

create index if not exists canonical_team_identity_claims_team_idx
  on private.canonical_team_identity_claims (team_id);

alter table private.canonical_team_identity_claims enable row level security;
revoke all on table private.canonical_team_identity_claims from public, anon, authenticated;
grant select, insert, update, delete on table private.canonical_team_identity_claims to service_role;

comment on table private.canonical_team_identity_claims is
  'Derived concurrency guard: every active canonical team exclusively claims its normalized name, tag, slug, and alias identities. Historical teams retain their rows without retaining active identity claims.';

create or replace function private.get_canonical_team_identity_candidates(target_team_id uuid)
returns table (
  normalized_identity text,
  identity_source text
)
language sql
stable
security definer
set search_path = ''
as $$
  select normalized.normalized_identity, normalized.identity_source
  from (
    select
      regexp_replace(lower(btrim(raw_identity.raw_value)), '[^a-z0-9]+', '', 'g') as normalized_identity,
      raw_identity.identity_source
    from (
      select 'name'::text as identity_source, team_record.name as raw_value
      from public.teams team_record
      where team_record.id = target_team_id

      union all

      select 'tag'::text, team_record.tag
      from public.teams team_record
      where team_record.id = target_team_id

      union all

      select 'slug'::text, team_record.slug
      from public.teams team_record
      where team_record.id = target_team_id

      union all

      select
        'alias'::text,
        coalesce(alias_record.alias, alias_record.previous_name, alias_record.previous_tag, alias_record.previous_slug)
      from public.team_aliases alias_record
      where alias_record.team_id = target_team_id
    ) raw_identity
  ) normalized
  where nullif(normalized.normalized_identity, '') is not null;
$$;

revoke all on function private.get_canonical_team_identity_candidates(uuid) from public, anon, authenticated;
grant execute on function private.get_canonical_team_identity_candidates(uuid) to service_role;

-- Keep the collision preflight, trigger installation, and claim backfill in the
-- migration transaction while blocking concurrent team and alias writes.
lock table public.teams, public.team_aliases in share row exclusive mode;

do $$
declare
  conflicting_identity text;
begin
  if exists (
    select 1
    from public.teams team_record
    where team_record.deleted_at is null
      and team_record.archived_at is null
      and team_record.merged_into_team_id is null
      and team_record.is_active
      and lower(btrim(team_record.status)) = 'active'
      and nullif(regexp_replace(lower(btrim(team_record.name)), '[^a-z0-9]+', '', 'g'), '') is null
  ) then
    raise exception
      'Migration 022 blocked: an active canonical team has no usable normalized name. Correct it through the audited admin process before retrying.';
  end if;

  with active_teams as (
    select
      team_record.id
    from public.teams team_record
    where team_record.deleted_at is null
      and team_record.archived_at is null
      and team_record.merged_into_team_id is null
      and team_record.is_active
      and lower(btrim(team_record.status)) = 'active'
  ),
  active_team_identities as (
    select
      team_record.id as team_id,
      identity_record.normalized_identity
    from active_teams team_record
    cross join lateral private.get_canonical_team_identity_candidates(team_record.id) identity_record
  )
  select identity_record.normalized_identity
  into conflicting_identity
  from active_team_identities identity_record
  group by identity_record.normalized_identity
  having count(distinct identity_record.team_id) > 1
  order by identity_record.normalized_identity
  limit 1;

  if conflicting_identity is not null then
    raise exception using
      errcode = '23505',
      message = 'Migration 022 blocked: active canonical team name/tag/slug/alias identities collide after normalization.',
      detail = format('Normalized identity "%s" belongs to more than one active canonical team.', conflicting_identity),
      hint = 'Reconcile the conflicting name, tag, slug, or alias records through the audited admin process before retrying.';
  end if;
end;
$$;

-- Migration 020 introduced a normalized-name index, while migration 001 still
-- retained a global lower(name) index. Replace both with lifecycle-aware
-- uniqueness so historical records remain intact and only live canonical teams
-- reserve identities.
drop index if exists public.teams_name_lower_unique_idx;
drop index if exists public.teams_normalized_name_active_unique_idx;
create unique index teams_normalized_name_active_unique_idx
  on public.teams(normalized_name)
  where deleted_at is null
    and archived_at is null
    and merged_into_team_id is null
    and is_active
    and lower(btrim(status)) = 'active';

create or replace function private.refresh_active_canonical_team_identity_claims(target_team_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  team_record public.teams%rowtype;
  attempted_identities text[];
  conflicting_identity text;
  conflicting_team_id uuid;
begin
  select *
  into team_record
  from public.teams
  where id = target_team_id
  for update;

  delete from private.canonical_team_identity_claims
  where team_id = target_team_id;

  if team_record.id is null then
    return;
  end if;

  if team_record.deleted_at is null
    and team_record.archived_at is null
    and team_record.merged_into_team_id is null
    and team_record.is_active
    and lower(btrim(team_record.status)) = 'active'
  then
    if nullif(regexp_replace(lower(btrim(team_record.name)), '[^a-z0-9]+', '', 'g'), '') is null then
      raise exception using
        errcode = '23514',
        message = 'An active canonical team must have a usable normalized name.',
        detail = format('Team %s has a name that is empty after canonical normalization.', target_team_id),
        hint = 'Use a name containing letters or numbers.';
    end if;

    select array_agg(distinct candidate.normalized_identity order by candidate.normalized_identity)
    into attempted_identities
    from private.get_canonical_team_identity_candidates(target_team_id) candidate;

    begin
      insert into private.canonical_team_identity_claims (
        normalized_identity,
        team_id,
        identity_sources
      )
      select
        candidate.normalized_identity,
        target_team_id,
        array_agg(distinct candidate.identity_source order by candidate.identity_source)
      from private.get_canonical_team_identity_candidates(target_team_id) candidate
      group by candidate.normalized_identity;
    exception
      when unique_violation then
        select claim.normalized_identity, claim.team_id
        into conflicting_identity, conflicting_team_id
        from private.canonical_team_identity_claims claim
        where claim.team_id <> target_team_id
          and claim.normalized_identity = any(attempted_identities)
        order by claim.normalized_identity
        limit 1;

        raise exception using
          errcode = '23505',
          message = 'Active canonical team identity collision.',
          detail = format(
            'Team %s cannot claim normalized name/tag/slug/alias identity "%s"; active team %s already owns it.',
            target_team_id,
            coalesce(conflicting_identity, attempted_identities[1]),
            coalesce(conflicting_team_id::text, 'unknown')
          ),
          hint = 'Reconcile the teams through the audited admin process instead of creating a duplicate.';
    end;
  end if;
end;
$$;

create or replace function private.sync_active_canonical_team_identity_claims()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.refresh_active_canonical_team_identity_claims(new.id);
  return new;
end;
$$;

create or replace function private.sync_active_canonical_team_alias_identity_claims()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    perform private.refresh_active_canonical_team_identity_claims(old.team_id);
    return old;
  end if;

  if tg_op = 'INSERT' then
    perform private.refresh_active_canonical_team_identity_claims(new.team_id);
    return new;
  end if;

  if old.team_id = new.team_id then
    perform private.refresh_active_canonical_team_identity_claims(new.team_id);
    return new;
  end if;

  -- Updating an alias owner refreshes both teams in a deterministic order so
  -- concurrent alias moves cannot deadlock while taking team row locks.
  if old.team_id::text < new.team_id::text then
    perform private.refresh_active_canonical_team_identity_claims(old.team_id);
    perform private.refresh_active_canonical_team_identity_claims(new.team_id);
  else
    perform private.refresh_active_canonical_team_identity_claims(new.team_id);
    perform private.refresh_active_canonical_team_identity_claims(old.team_id);
  end if;

  return new;
end;
$$;

revoke all on function private.refresh_active_canonical_team_identity_claims(uuid) from public, anon, authenticated;
revoke all on function private.sync_active_canonical_team_identity_claims() from public, anon, authenticated;
revoke all on function private.sync_active_canonical_team_alias_identity_claims() from public, anon, authenticated;
grant execute on function private.refresh_active_canonical_team_identity_claims(uuid) to service_role;
grant execute on function private.sync_active_canonical_team_identity_claims() to service_role;
grant execute on function private.sync_active_canonical_team_alias_identity_claims() to service_role;

drop trigger if exists teams_claim_canonical_identities_after_insert on public.teams;
create trigger teams_claim_canonical_identities_after_insert
after insert on public.teams
for each row execute function private.sync_active_canonical_team_identity_claims();

drop trigger if exists teams_claim_canonical_identities_after_lifecycle_update on public.teams;
create trigger teams_claim_canonical_identities_after_lifecycle_update
after update of name, tag, slug, status, is_active, archived_at, merged_into_team_id, deleted_at on public.teams
for each row execute function private.sync_active_canonical_team_identity_claims();

drop trigger if exists team_aliases_claim_canonical_identities_after_insert on public.team_aliases;
create trigger team_aliases_claim_canonical_identities_after_insert
after insert on public.team_aliases
for each row execute function private.sync_active_canonical_team_alias_identity_claims();

drop trigger if exists team_aliases_claim_canonical_identities_after_identity_update on public.team_aliases;
create trigger team_aliases_claim_canonical_identities_after_identity_update
after update of team_id, alias, normalized_alias, previous_name, previous_tag, previous_slug on public.team_aliases
for each row execute function private.sync_active_canonical_team_alias_identity_claims();

drop trigger if exists team_aliases_claim_canonical_identities_after_delete on public.team_aliases;
create trigger team_aliases_claim_canonical_identities_after_delete
after delete on public.team_aliases
for each row execute function private.sync_active_canonical_team_alias_identity_claims();

-- Claims are derived state. Rebuilding them makes a partially applied migration
-- safe to retry and leaves archived/merged/deleted team rows untouched.
delete from private.canonical_team_identity_claims;

with active_teams as (
  select
    team_record.id
  from public.teams team_record
  where team_record.deleted_at is null
    and team_record.archived_at is null
    and team_record.merged_into_team_id is null
    and team_record.is_active
    and lower(btrim(team_record.status)) = 'active'
),
active_team_identities as (
  select
    team_record.id as team_id,
    identity_record.normalized_identity,
    identity_record.identity_source
  from active_teams team_record
  cross join lateral private.get_canonical_team_identity_candidates(team_record.id) identity_record
)
insert into private.canonical_team_identity_claims (
  normalized_identity,
  team_id,
  identity_sources
)
select
  identity_record.normalized_identity,
  identity_record.team_id,
  array_agg(distinct identity_record.identity_source order by identity_record.identity_source)
from active_team_identities identity_record
group by identity_record.normalized_identity, identity_record.team_id;

alter table public.match_player_results
  add column if not exists link_eligibility text not null default 'eligible'
    check (link_eligibility in ('eligible', 'substitute', 'rejected', 'ambiguous'));

create index if not exists match_player_results_linking_account_idx
  on public.match_player_results (lower(btrim(pubg_account_id)), team_id, slot_number, match_id)
  where nullif(btrim(pubg_account_id), '') is not null;

-- A display name is not an identity. PUBG account IDs remain the canonical key.
drop index if exists public.players_pubg_name_lower_unique_idx;
create index if not exists players_pubg_name_lower_idx on public.players (lower(pubg_name));

do $$
begin
  if exists (
    select 1
    from public.players
    where nullif(btrim(pubg_account_id), '') is not null
    group by lower(btrim(pubg_account_id))
    having count(*) > 1
  ) then
    raise exception
      'Migration 022 blocked: canonical PUBG account IDs are duplicated. Reconcile those player records through the audited admin process before retrying.';
  end if;
end;
$$;

create unique index if not exists players_pubg_account_id_lower_unique_idx
  on public.players (lower(btrim(pubg_account_id)))
  where nullif(btrim(pubg_account_id), '') is not null;

create table if not exists private.player_team_link_settings (
  singleton boolean primary key default true check (singleton),
  enabled boolean not null default true,
  required_match_count integer not null default 5 check (required_match_count = 5),
  require_same_slot boolean not null default true check (require_same_slot),
  activation_mode text not null default 'global' check (activation_mode in ('global', 'allowlist')),
  membership_mode text not null default 'auto_activate'
    check (membership_mode in ('auto_activate', 'pending_review')),
  allowed_event_ids uuid[] not null default '{}',
  allowed_season_ids uuid[] not null default '{}',
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into private.player_team_link_settings (singleton)
values (true)
on conflict (singleton) do nothing;

create table if not exists private.player_team_link_evidence (
  id uuid primary key default gen_random_uuid(),
  pubg_account_id text not null,
  player_id uuid references public.players(id) on delete set null,
  team_id uuid not null references public.teams(id) on delete restrict,
  slot_number integer not null,
  qualifying_match_ids uuid[] not null default '{}',
  qualifying_match_count integer not null default 0 check (qualifying_match_count >= 0),
  required_match_count integer not null default 5 check (required_match_count = 5),
  state text not null default 'pending'
    check (state in ('pending', 'qualified', 'linked', 'conflict', 'rejected', 'suppressed', 'disabled')),
  first_seen_at timestamptz,
  last_seen_at timestamptz,
  evaluated_at timestamptz not null default now(),
  unique (pubg_account_id, team_id, slot_number)
);

create table if not exists private.player_team_memberships (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete restrict,
  pubg_account_id text not null,
  team_id uuid not null references public.teams(id) on delete restrict,
  slot_number integer not null,
  source text not null default 'match_history'
    check (source in ('match_history', 'admin_review')),
  qualifying_match_ids uuid[] not null default '{}',
  qualifying_match_count integer not null default 0 check (qualifying_match_count >= 0),
  status text not null default 'active' check (status in ('active', 'ended', 'revoked')),
  auto_linked boolean not null default true,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  end_reason text,
  roster_history_id uuid references public.team_roster_history(id) on delete set null,
  assigned_current_team boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists player_team_memberships_active_player_idx
  on private.player_team_memberships (player_id) where status = 'active';
create unique index if not exists player_team_memberships_active_account_idx
  on private.player_team_memberships (lower(pubg_account_id)) where status = 'active';
create index if not exists player_team_memberships_team_idx
  on private.player_team_memberships (team_id, status);

create table if not exists private.player_team_link_reviews (
  id uuid primary key default gen_random_uuid(),
  pubg_account_id text not null,
  player_id uuid not null references public.players(id) on delete restrict,
  current_team_id uuid references public.teams(id) on delete restrict,
  proposed_team_id uuid not null references public.teams(id) on delete restrict,
  proposed_slot_number integer not null,
  qualifying_match_ids uuid[] not null default '{}',
  qualifying_match_count integer not null check (qualifying_match_count >= 0),
  reason text not null default 'team_conflict',
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'keep_existing', 'rejected', 'substitute')),
  review_note text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists player_team_link_reviews_pending_idx
  on private.player_team_link_reviews (lower(pubg_account_id), proposed_team_id, proposed_slot_number)
  where status = 'pending';

create table if not exists private.player_team_link_suppressions (
  id uuid primary key default gen_random_uuid(),
  pubg_account_id text not null check (nullif(btrim(pubg_account_id), '') is not null),
  player_id uuid not null references public.players(id) on delete restrict,
  team_id uuid not null references public.teams(id) on delete restrict,
  slot_number integer not null,
  qualifying_match_ids uuid[] not null default '{}',
  source_membership_id uuid not null unique references private.player_team_memberships(id) on delete restrict,
  reason text not null check (nullif(btrim(reason), '') is not null),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index if not exists player_team_link_suppressions_evidence_idx
  on private.player_team_link_suppressions (lower(pubg_account_id), team_id, slot_number);

alter table private.player_team_link_settings enable row level security;
alter table private.player_team_link_evidence enable row level security;
alter table private.player_team_memberships enable row level security;
alter table private.player_team_link_reviews enable row level security;
alter table private.player_team_link_suppressions enable row level security;

revoke all on table
  private.player_team_link_settings,
  private.player_team_link_evidence,
  private.player_team_memberships,
  private.player_team_link_reviews,
  private.player_team_link_suppressions
from public, anon, authenticated;
grant select, insert, update, delete on table
  private.player_team_link_settings,
  private.player_team_link_evidence,
  private.player_team_memberships,
  private.player_team_link_reviews,
  private.player_team_link_suppressions
to service_role;

comment on table private.player_team_memberships is
  'Competitive roster history projection only. It is never consulted for authenticated team-workspace authorization.';
comment on table private.player_team_link_reviews is
  'Human review queue for conflicting match-history evidence. A conflict never transfers a player automatically.';
comment on table private.player_team_link_suppressions is
  'Immutable manual-unlink snapshots. An exact evidence set cannot recreate a membership; materially changed evidence may qualify again.';

create or replace function public.reconcile_player_team_link_for_account(target_pubg_account_id text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_account_id text := lower(trim(target_pubg_account_id));
  settings_record private.player_team_link_settings%rowtype;
  candidate_team_id uuid;
  candidate_slot integer;
  candidate_match_ids uuid[];
  candidate_match_count integer;
  candidate_first_seen timestamptz;
  candidate_last_seen timestamptz;
  qualified_group_count integer := 0;
  candidate_player_name text;
  player_record public.players%rowtype;
  active_membership private.player_team_memberships%rowtype;
  membership_id uuid;
  membership_created boolean := false;
  membership_assigns_current_team boolean := false;
  owned_roster_history_id uuid;
  roster_history_created boolean := false;
  evidence_end_reason text;
  invalidated_review_count integer := 0;
begin
  if normalized_account_id is null or normalized_account_id = '' then
    return jsonb_build_object('status', 'ineligible', 'reason', 'missing_pubg_account_id');
  end if;

  perform pg_advisory_xact_lock(hashtextextended('player-team-link:' || normalized_account_id, 0));

  select * into settings_record
  from private.player_team_link_settings
  where singleton = true;

  if settings_record is null or not settings_record.enabled then
    return jsonb_build_object('status', 'disabled', 'pubgAccountId', normalized_account_id);
  end if;

  delete from private.player_team_link_evidence
  where lower(pubg_account_id) = normalized_account_id;

  with account_rows as (
    select
      result.*,
      count(*) over (partition by result.match_id) as account_rows_in_match
    from public.match_player_results result
    where lower(btrim(result.pubg_account_id)) = normalized_account_id
  ),
  eligible_source as (
    select
      result.match_id,
      result.team_id,
      case when settings_record.require_same_slot then result.slot_number else 0 end as stable_slot,
      match_record.start_time as played_at
    from account_rows result
    join public.matches match_record on match_record.id = result.match_id
    join public.teams team_record on team_record.id = result.team_id
    where result.account_rows_in_match = 1
      and result.pubg_account_id is not null
      and result.team_id is not null
      and (not settings_record.require_same_slot or result.slot_number is not null)
      and result.link_eligibility = 'eligible'
      and match_record.status = 'published'
      and match_record.published_at is not null
      and match_record.deleted_at is null
      and team_record.is_active
      and team_record.deleted_at is null
      and team_record.archived_at is null
      and team_record.merged_into_team_id is null
      and team_record.verification_status <> 'revoked'
      and coalesce(team_record.status, 'active') not in ('archived', 'disbanded', 'merged', 'suspended', 'inactive')
      and (
        settings_record.activation_mode = 'global'
        or (
          match_record.event_id = any(settings_record.allowed_event_ids)
          or match_record.season_id = any(settings_record.allowed_season_ids)
        )
      )
  ),
  eligible_rows as (
    select match_id, team_id, stable_slot, played_at
    from eligible_source
  ),
  evidence_groups as (
    select
      team_id,
      stable_slot,
      array_agg(match_id order by match_id) as match_ids,
      count(*)::integer as match_count,
      min(played_at) as first_seen,
      max(played_at) as last_seen
    from eligible_rows
    group by team_id, stable_slot
  ),
  inserted_evidence as (
    insert into private.player_team_link_evidence (
      pubg_account_id,
      team_id,
      slot_number,
      qualifying_match_ids,
      qualifying_match_count,
      required_match_count,
      state,
      first_seen_at,
      last_seen_at,
      evaluated_at
    )
    select
      normalized_account_id,
      team_id,
      stable_slot,
      match_ids,
      match_count,
      settings_record.required_match_count,
      case when match_count >= settings_record.required_match_count then 'qualified' else 'pending' end,
      first_seen,
      last_seen,
      now()
    from evidence_groups
    returning team_id, slot_number, qualifying_match_ids, qualifying_match_count, first_seen_at, last_seen_at
  )
  select team_id, slot_number, qualifying_match_ids, qualifying_match_count, first_seen_at, last_seen_at
  into candidate_team_id, candidate_slot, candidate_match_ids, candidate_match_count, candidate_first_seen, candidate_last_seen
  from inserted_evidence
  order by qualifying_match_count desc, last_seen_at desc, team_id
  limit 1;

  select * into active_membership
  from private.player_team_memberships
  where lower(btrim(pubg_account_id)) = normalized_account_id
    and status = 'active'
  for update;

  select count(*)::integer into qualified_group_count
  from private.player_team_link_evidence
  where lower(btrim(pubg_account_id)) = normalized_account_id
    and qualifying_match_count >= settings_record.required_match_count;

  update private.player_team_link_reviews review_record
  set
    status = 'rejected',
    review_note = 'Automatically closed because the qualifying evidence changed. Review the newly calculated evidence instead.',
    reviewed_at = now(),
    updated_at = now()
  where lower(btrim(review_record.pubg_account_id)) = normalized_account_id
    and review_record.status = 'pending'
    and not exists (
      select 1
      from private.player_team_link_evidence evidence_record
      where lower(btrim(evidence_record.pubg_account_id)) = normalized_account_id
        and evidence_record.team_id = review_record.proposed_team_id
        and evidence_record.slot_number = review_record.proposed_slot_number
        and evidence_record.qualifying_match_count >= settings_record.required_match_count
        and evidence_record.qualifying_match_ids = review_record.qualifying_match_ids
    );
  get diagnostics invalidated_review_count = row_count;

  if invalidated_review_count > 0 then
    insert into public.audit_logs (actor_id, action, entity_type, entity_id, new_data)
    values (
      null,
      'player_team_link_reviews_invalidated',
      'player_team_link_review',
      normalized_account_id,
      jsonb_build_object(
        'reason', 'qualifying_evidence_changed',
        'invalidatedReviewCount', invalidated_review_count,
        'requiredMatchCount', settings_record.required_match_count
      )
    );
  end if;

  if coalesce(candidate_match_count, 0) < settings_record.required_match_count then
    evidence_end_reason := case
      when candidate_team_id is null then 'qualifying_evidence_missing'
      else 'qualifying_evidence_below_threshold'
    end;

    if
      active_membership.id is not null
      and active_membership.auto_linked
      and active_membership.source = 'match_history'
    then
      update private.player_team_memberships
      set
        status = 'ended',
        ended_at = now(),
        end_reason = evidence_end_reason,
        updated_at = now()
      where id = active_membership.id
        and status = 'active';

      update public.players
      set current_team_id = null, updated_at = now()
      where id = active_membership.player_id
        and active_membership.assigned_current_team
        and current_team_id = active_membership.team_id
        and not exists (
          select 1
          from public.team_roster_history other_roster
          where other_roster.player_id = active_membership.player_id
            and other_roster.team_id = active_membership.team_id
            and other_roster.end_date is null
            and other_roster.id is distinct from active_membership.roster_history_id
        );

      update public.team_roster_history
      set end_date = current_date, status = 'inactive', updated_at = now()
      where id = active_membership.roster_history_id
        and player_id = active_membership.player_id
        and team_id = active_membership.team_id
        and end_date is null;

      insert into public.audit_logs (actor_id, action, entity_type, entity_id, old_data, new_data)
      values (
        null,
        'player_team_auto_membership_ended',
        'player_team_membership',
        active_membership.id::text,
        to_jsonb(active_membership),
        jsonb_build_object(
          'status', 'ended',
          'reason', evidence_end_reason,
          'qualifyingMatchIds', coalesce(candidate_match_ids, '{}'::uuid[]),
          'qualifyingMatchCount', coalesce(candidate_match_count, 0),
          'requiredMatchCount', settings_record.required_match_count
        )
      );
    end if;

    update private.player_team_link_reviews
    set
      status = 'rejected',
      review_note = 'Automatically closed because the published match evidence no longer meets the five-match rule.',
      reviewed_at = now(),
      updated_at = now()
    where lower(btrim(pubg_account_id)) = normalized_account_id
      and status = 'pending';
    get diagnostics invalidated_review_count = row_count;

    if invalidated_review_count > 0 then
      insert into public.audit_logs (actor_id, action, entity_type, entity_id, new_data)
      values (
        null,
        'player_team_link_reviews_invalidated',
        'player_team_link_review',
        normalized_account_id,
        jsonb_build_object(
          'reason', evidence_end_reason,
          'invalidatedReviewCount', invalidated_review_count,
          'qualifyingMatchIds', coalesce(candidate_match_ids, '{}'::uuid[]),
          'qualifyingMatchCount', coalesce(candidate_match_count, 0),
          'requiredMatchCount', settings_record.required_match_count
        )
      );
    end if;

    return jsonb_build_object(
      'status', case
        when active_membership.id is not null
          and active_membership.auto_linked
          and active_membership.source = 'match_history'
        then 'ended'
        else 'pending'
      end,
      'pubgAccountId', normalized_account_id,
      'teamId', candidate_team_id,
      'slotNumber', candidate_slot,
      'qualifyingMatchIds', coalesce(candidate_match_ids, '{}'::uuid[]),
      'qualifyingMatchCount', coalesce(candidate_match_count, 0),
      'requiredMatchCount', settings_record.required_match_count,
      'endedMembershipId', case
        when active_membership.id is not null
          and active_membership.auto_linked
          and active_membership.source = 'match_history'
        then active_membership.id
        else null
      end,
      'reason', evidence_end_reason
    );
  end if;

  select * into player_record
  from public.players
  where lower(btrim(pubg_account_id)) = normalized_account_id
  limit 1
  for update;

  if player_record is null then
    select coalesce(nullif(trim(result.player_name), ''), normalized_account_id)
    into candidate_player_name
    from public.match_player_results result
    join public.matches match_record on match_record.id = result.match_id
    where result.match_id = any(candidate_match_ids)
      and lower(btrim(result.pubg_account_id)) = normalized_account_id
    order by match_record.start_time desc nulls last, result.created_at desc
    limit 1;

    insert into public.players (
      pubg_account_id, pubg_name, display_name, slug, current_team_id, is_active
    )
    values (
      normalized_account_id,
      candidate_player_name,
      candidate_player_name,
      'player-' || substr(md5(normalized_account_id), 1, 16),
      null,
      true
    )
    returning * into player_record;
  end if;

  update public.match_player_results
  set player_id = player_record.id, updated_at = now()
  where match_id = any(candidate_match_ids)
    and lower(btrim(pubg_account_id)) = normalized_account_id
    and player_id is distinct from player_record.id;

  if active_membership.id is not null and active_membership.player_id <> player_record.id then
    raise exception 'Canonical PUBG account membership points to a different player profile.';
  end if;

  if exists (
    select 1
    from private.player_team_link_suppressions suppression
    where lower(btrim(suppression.pubg_account_id)) = normalized_account_id
      and suppression.player_id = player_record.id
      and suppression.team_id = candidate_team_id
      and suppression.slot_number = candidate_slot
      and suppression.qualifying_match_ids @> candidate_match_ids
      and suppression.qualifying_match_ids <@ candidate_match_ids
      and cardinality(suppression.qualifying_match_ids) = cardinality(candidate_match_ids)
  ) then
    update private.player_team_link_evidence
    set state = 'suppressed', player_id = player_record.id, evaluated_at = now()
    where lower(btrim(pubg_account_id)) = normalized_account_id
      and team_id = candidate_team_id
      and slot_number = candidate_slot;

    return jsonb_build_object(
      'status', 'suppressed',
      'pubgAccountId', normalized_account_id,
      'playerId', player_record.id,
      'teamId', candidate_team_id,
      'slotNumber', candidate_slot,
      'qualifyingMatchIds', candidate_match_ids,
      'qualifyingMatchCount', candidate_match_count,
      'reason', 'manual_unlink_unchanged_evidence'
    );
  end if;

  if exists (
    select 1
    from private.player_team_link_reviews previous_review
    where lower(previous_review.pubg_account_id) = normalized_account_id
      and previous_review.proposed_team_id = candidate_team_id
      and previous_review.proposed_slot_number = candidate_slot
      and previous_review.status = 'keep_existing'
      and previous_review.qualifying_match_ids = candidate_match_ids
  ) then
    update private.player_team_link_evidence
    set state = 'rejected', player_id = player_record.id, evaluated_at = now()
    where lower(pubg_account_id) = normalized_account_id
      and team_id = candidate_team_id
      and slot_number = candidate_slot;
    return jsonb_build_object(
      'status', 'keep_existing',
      'pubgAccountId', normalized_account_id,
      'playerId', player_record.id,
      'currentTeamId', coalesce(active_membership.team_id, player_record.current_team_id),
      'proposedTeamId', candidate_team_id,
      'qualifyingMatchCount', candidate_match_count
    );
  end if;

  if
    player_record.deleted_at is not null
    or not player_record.is_active
    or qualified_group_count > 1
    or
    (player_record.current_team_id is not null and player_record.current_team_id <> candidate_team_id)
    or (active_membership.id is not null and active_membership.team_id <> candidate_team_id)
    or exists (
      select 1 from public.team_roster_history roster
      where roster.player_id = player_record.id
        and roster.end_date is null
        and roster.team_id <> candidate_team_id
    )
  then
    insert into private.player_team_link_reviews (
      pubg_account_id,
      player_id,
      current_team_id,
      proposed_team_id,
      proposed_slot_number,
      qualifying_match_ids,
      qualifying_match_count,
      reason,
      status,
      updated_at
    )
    values (
      normalized_account_id,
      player_record.id,
      coalesce(active_membership.team_id, player_record.current_team_id),
      candidate_team_id,
      candidate_slot,
      candidate_match_ids,
      candidate_match_count,
      case
        when player_record.deleted_at is not null or not player_record.is_active then 'inactive_player_profile'
        when qualified_group_count > 1 then 'ambiguous_qualified_groups'
        else 'team_conflict'
      end,
      'pending',
      now()
    )
    on conflict ((lower(pubg_account_id)), proposed_team_id, proposed_slot_number)
      where status = 'pending'
    do update set
      player_id = excluded.player_id,
      current_team_id = excluded.current_team_id,
      qualifying_match_ids = excluded.qualifying_match_ids,
      qualifying_match_count = excluded.qualifying_match_count,
      updated_at = now();

    update private.player_team_link_evidence
    set state = 'conflict', player_id = player_record.id, evaluated_at = now()
    where lower(pubg_account_id) = normalized_account_id
      and team_id = candidate_team_id
      and slot_number = candidate_slot;

    return jsonb_build_object(
      'status', 'conflict',
      'pubgAccountId', normalized_account_id,
      'playerId', player_record.id,
      'currentTeamId', coalesce(active_membership.team_id, player_record.current_team_id),
      'proposedTeamId', candidate_team_id,
      'slotNumber', candidate_slot,
      'qualifyingMatchCount', candidate_match_count
    );
  end if;

  if settings_record.membership_mode = 'pending_review' and active_membership.id is null then
    insert into private.player_team_link_reviews (
      pubg_account_id,
      player_id,
      current_team_id,
      proposed_team_id,
      proposed_slot_number,
      qualifying_match_ids,
      qualifying_match_count,
      reason,
      status,
      updated_at
    )
    values (
      normalized_account_id,
      player_record.id,
      player_record.current_team_id,
      candidate_team_id,
      candidate_slot,
      candidate_match_ids,
      candidate_match_count,
      'activation_required',
      'pending',
      now()
    )
    on conflict ((lower(pubg_account_id)), proposed_team_id, proposed_slot_number)
      where status = 'pending'
    do update set
      player_id = excluded.player_id,
      current_team_id = excluded.current_team_id,
      qualifying_match_ids = excluded.qualifying_match_ids,
      qualifying_match_count = excluded.qualifying_match_count,
      reason = excluded.reason,
      updated_at = now();

    update private.player_team_link_evidence
    set state = 'qualified', player_id = player_record.id, evaluated_at = now()
    where lower(pubg_account_id) = normalized_account_id
      and team_id = candidate_team_id
      and slot_number = candidate_slot;

    return jsonb_build_object(
      'status', 'pending_review',
      'pubgAccountId', normalized_account_id,
      'playerId', player_record.id,
      'proposedTeamId', candidate_team_id,
      'slotNumber', candidate_slot,
      'qualifyingMatchCount', candidate_match_count
    );
  end if;

  if
    active_membership.id is not null
    and (
      not active_membership.auto_linked
      or active_membership.source <> 'match_history'
    )
  then
    update private.player_team_link_evidence
    set state = 'linked', player_id = player_record.id, evaluated_at = now()
    where lower(pubg_account_id) = normalized_account_id
      and team_id = candidate_team_id
      and slot_number = candidate_slot;

    return jsonb_build_object(
      'status', 'manual_membership_preserved',
      'pubgAccountId', normalized_account_id,
      'playerId', player_record.id,
      'teamId', active_membership.team_id,
      'slotNumber', active_membership.slot_number,
      'membershipId', active_membership.id,
      'qualifyingMatchCount', candidate_match_count
    );
  end if;

  membership_assigns_current_team := player_record.current_team_id is null;

  if active_membership.id is null then
    insert into private.player_team_memberships (
      player_id,
      pubg_account_id,
      team_id,
      slot_number,
      qualifying_match_ids,
      qualifying_match_count,
      status,
      auto_linked,
      assigned_current_team,
      started_at,
      updated_at
    )
    values (
      player_record.id,
      normalized_account_id,
      candidate_team_id,
      candidate_slot,
      candidate_match_ids,
      candidate_match_count,
      'active',
      true,
      membership_assigns_current_team,
      coalesce(candidate_first_seen, now()),
      now()
    )
    returning id into membership_id;
    membership_created := true;
  else
    membership_id := active_membership.id;
    update private.player_team_memberships
    set
      slot_number = candidate_slot,
      qualifying_match_ids = candidate_match_ids,
      qualifying_match_count = candidate_match_count,
      assigned_current_team = assigned_current_team or membership_assigns_current_team,
      updated_at = now()
    where id = membership_id;
  end if;

  update public.players
  set current_team_id = candidate_team_id, updated_at = now()
  where id = player_record.id
    and current_team_id is distinct from candidate_team_id;

  select id into owned_roster_history_id
  from public.team_roster_history
  where player_id = player_record.id
    and team_id = candidate_team_id
    and end_date is null
  order by start_date desc, created_at desc, id
  limit 1
  for update;

  if owned_roster_history_id is null then
    insert into public.team_roster_history (player_id, team_id, start_date, status)
    values (player_record.id, candidate_team_id, coalesce(candidate_first_seen::date, current_date), 'active')
    returning id into owned_roster_history_id;
    roster_history_created := true;
  end if;

  if roster_history_created then
    update private.player_team_memberships
    set roster_history_id = owned_roster_history_id, updated_at = now()
    where id = membership_id;
  end if;

  update private.player_team_link_evidence
  set state = 'linked', player_id = player_record.id, evaluated_at = now()
  where lower(pubg_account_id) = normalized_account_id
    and team_id = candidate_team_id
    and slot_number = candidate_slot;

  update private.player_team_link_reviews
  set
    status = 'approved',
    review_note = 'Superseded because the exact reviewed evidence is now linked by the approved auto-activate membership policy.',
    reviewed_at = now(),
    updated_at = now()
  where lower(pubg_account_id) = normalized_account_id
    and proposed_team_id = candidate_team_id
    and proposed_slot_number = candidate_slot
    and qualifying_match_ids = candidate_match_ids
    and status = 'pending';

  if membership_created then
    insert into public.audit_logs (actor_id, action, entity_type, entity_id, new_data)
    values (
      null,
      'player_team_auto_linked',
      'player_team_membership',
      membership_id::text,
      jsonb_build_object(
        'playerId', player_record.id,
        'teamId', candidate_team_id,
        'slotNumber', candidate_slot,
        'qualifyingMatchIds', candidate_match_ids,
        'qualifyingMatchCount', candidate_match_count,
        'source', 'match_history'
      )
    );
  end if;

  return jsonb_build_object(
    'status', 'linked',
    'pubgAccountId', normalized_account_id,
    'playerId', player_record.id,
    'teamId', candidate_team_id,
    'slotNumber', candidate_slot,
    'membershipId', membership_id,
    'qualifyingMatchCount', candidate_match_count
  );
end;
$$;

create or replace function public.reconcile_player_team_links_for_match(target_match_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  account_id text;
  results jsonb := '[]'::jsonb;
begin
  for account_id in
    select affected_account.pubg_account_id
    from (
      select lower(btrim(result.pubg_account_id)) as pubg_account_id
      from public.match_player_results result
      where result.match_id = target_match_id
        and nullif(btrim(result.pubg_account_id), '') is not null
      union
      select lower(btrim(evidence.pubg_account_id))
      from private.player_team_link_evidence evidence
      where target_match_id = any(evidence.qualifying_match_ids)
      union
      select lower(btrim(membership.pubg_account_id))
      from private.player_team_memberships membership
      where membership.status = 'active'
        and membership.auto_linked
        and target_match_id = any(membership.qualifying_match_ids)
    ) affected_account
    order by affected_account.pubg_account_id
  loop
    results := results || jsonb_build_array(public.reconcile_player_team_link_for_account(account_id));
  end loop;
  return jsonb_build_object('matchId', target_match_id, 'results', results);
end;
$$;

create or replace function public.recalculate_player_team_links(target_pubg_account_id text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  account_id text;
  results jsonb := '[]'::jsonb;
begin
  if target_pubg_account_id is not null then
    return jsonb_build_object(
      'results',
      jsonb_build_array(public.reconcile_player_team_link_for_account(target_pubg_account_id))
    );
  end if;

  for account_id in
    select affected_account.pubg_account_id
    from (
      select lower(btrim(result.pubg_account_id)) as pubg_account_id
      from public.match_player_results result
      where nullif(btrim(result.pubg_account_id), '') is not null
      union
      select lower(btrim(evidence.pubg_account_id))
      from private.player_team_link_evidence evidence
      union
      select lower(btrim(membership.pubg_account_id))
      from private.player_team_memberships membership
      where membership.status = 'active' and membership.auto_linked
    ) affected_account
    order by affected_account.pubg_account_id
  loop
    results := results || jsonb_build_array(public.reconcile_player_team_link_for_account(account_id));
  end loop;
  return jsonb_build_object('results', results);
end;
$$;

create or replace function public.get_player_team_linking_admin_dashboard()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'settings', coalesce((select to_jsonb(setting) from private.player_team_link_settings setting where singleton), '{}'::jsonb),
    'evidence', coalesce((
      select jsonb_agg(
        to_jsonb(evidence_record)
        || jsonb_build_object(
          'player_name', coalesce(player_record.display_name, player_record.pubg_name),
          'team_name', team_record.name,
          'slot_history', coalesce((
            select jsonb_agg(
              jsonb_build_object(
                'matchId', match_record.id,
                'matchNumber', match_record.match_number,
                'eventId', match_record.event_id,
                'seasonId', match_record.season_id,
                'playedAt', match_record.start_time,
                'slotNumber', result.slot_number,
                'eligibility', result.link_eligibility
              )
              order by match_record.start_time, match_record.id
            )
            from public.match_player_results result
            join public.matches match_record on match_record.id = result.match_id
            where result.match_id = any(evidence_record.qualifying_match_ids)
              and lower(btrim(result.pubg_account_id)) = lower(evidence_record.pubg_account_id)
          ), '[]'::jsonb)
        )
        order by evidence_record.evaluated_at desc
      )
      from (
        select * from private.player_team_link_evidence order by evaluated_at desc limit 500
      ) evidence_record
      left join public.players player_record on player_record.id = evidence_record.player_id
      join public.teams team_record on team_record.id = evidence_record.team_id
    ), '[]'::jsonb),
    'reviews', coalesce((
      select jsonb_agg(
        to_jsonb(review_record)
        || jsonb_build_object(
          'player_name', coalesce(player_record.display_name, player_record.pubg_name),
          'current_team_name', current_team.name,
          'proposed_team_name', proposed_team.name
        )
        order by review_record.created_at desc
      )
      from (
        select * from private.player_team_link_reviews order by created_at desc limit 500
      ) review_record
      join public.players player_record on player_record.id = review_record.player_id
      left join public.teams current_team on current_team.id = review_record.current_team_id
      join public.teams proposed_team on proposed_team.id = review_record.proposed_team_id
    ), '[]'::jsonb),
    'memberships', coalesce((
      select jsonb_agg(
        to_jsonb(membership_record)
        || jsonb_build_object(
          'player_name', coalesce(player_record.display_name, player_record.pubg_name),
          'team_name', team_record.name
        )
        order by membership_record.created_at desc
      )
      from (
        select * from private.player_team_memberships order by created_at desc limit 500
      ) membership_record
      join public.players player_record on player_record.id = membership_record.player_id
      join public.teams team_record on team_record.id = membership_record.team_id
    ), '[]'::jsonb),
    'suppressions', coalesce((
      select jsonb_agg(
        to_jsonb(suppression_record)
        || jsonb_build_object(
          'player_name', coalesce(player_record.display_name, player_record.pubg_name),
          'team_name', team_record.name
        )
        order by suppression_record.created_at desc
      )
      from (
        select * from private.player_team_link_suppressions order by created_at desc limit 500
      ) suppression_record
      join public.players player_record on player_record.id = suppression_record.player_id
      join public.teams team_record on team_record.id = suppression_record.team_id
    ), '[]'::jsonb)
  );
$$;

create or replace function public.update_player_team_link_settings(settings jsonb, actor_profile_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  updated private.player_team_link_settings%rowtype;
begin
  if not exists (
    select 1 from public.profiles
    where id = actor_profile_id and is_active and role::text in ('super_admin', 'admin')
  ) then
    raise exception 'An active super-admin or admin profile is required.';
  end if;

  update private.player_team_link_settings
  set
    enabled = coalesce((settings->>'enabled')::boolean, enabled),
    required_match_count = 5,
    require_same_slot = true,
    activation_mode = coalesce(nullif(settings->>'activationMode', ''), activation_mode),
    membership_mode = coalesce(nullif(settings->>'membershipMode', ''), membership_mode),
    allowed_event_ids = case
      when settings ? 'allowedEventIds'
      then array(select jsonb_array_elements_text(settings->'allowedEventIds')::uuid)
      else allowed_event_ids
    end,
    allowed_season_ids = case
      when settings ? 'allowedSeasonIds'
      then array(select jsonb_array_elements_text(settings->'allowedSeasonIds')::uuid)
      else allowed_season_ids
    end,
    updated_by = actor_profile_id,
    updated_at = now()
  where singleton
  returning * into updated;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, new_data)
  values (actor_profile_id, 'player_team_link_settings_updated', 'player_team_link_settings', null, to_jsonb(updated));
  return to_jsonb(updated);
end;
$$;

create or replace function public.review_player_team_link(
  target_review_id uuid,
  decision text,
  actor_profile_id uuid,
  note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  review_record private.player_team_link_reviews%rowtype;
  new_membership_id uuid;
  new_roster_history_id uuid;
  review_account_id text;
begin
  if not exists (
    select 1 from public.profiles
    where id = actor_profile_id and is_active and role::text in ('super_admin', 'admin')
  ) then
    raise exception 'An active super-admin or admin profile is required.';
  end if;

  select pubg_account_id into review_account_id
  from private.player_team_link_reviews
  where id = target_review_id;
  if review_account_id is null then
    raise exception 'Player/team link review not found.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('player-team-link:' || lower(review_account_id), 0));
  if not coalesce(
    (
      select settings_record.enabled
      from private.player_team_link_settings settings_record
      where settings_record.singleton = true
    ),
    false
  ) then
    return jsonb_build_object(
      'status', 'stale_review',
      'reason', 'player_team_linking_disabled',
      'reviewId', target_review_id
    );
  end if;

  perform public.reconcile_player_team_link_for_account(review_account_id);

  select * into review_record
  from private.player_team_link_reviews
  where id = target_review_id
  for update;

  if review_record is null then
    return jsonb_build_object(
      'status', 'stale_review',
      'reason', 'review_replaced_after_recalculation',
      'reviewId', target_review_id
    );
  end if;
  if review_record.status <> 'pending' then
    return jsonb_build_object(
      'status', 'stale_review',
      'reason', 'review_no_longer_pending',
      'reviewId', target_review_id,
      'reviewStatus', review_record.status
    );
  end if;
  if decision not in ('approve_transfer', 'keep_existing', 'reject', 'mark_substitute') then
    raise exception 'Unsupported player/team link review decision.';
  end if;
  if decision = 'approve_transfer' and nullif(trim(note), '') is null then
    raise exception 'An audit note is required to approve a player/team link.';
  end if;

  if decision = 'approve_transfer' then
    if not exists (
      select 1 from public.players
      where id = review_record.player_id and is_active and deleted_at is null
    ) then
      raise exception 'The player profile must be active before this link can be approved.';
    end if;
    if not exists (
      select 1 from public.teams
      where id = review_record.proposed_team_id
        and is_active and deleted_at is null and archived_at is null and merged_into_team_id is null
        and verification_status <> 'revoked'
        and coalesce(status, 'active') not in ('archived', 'disbanded', 'merged', 'suspended', 'inactive')
    ) then
      raise exception 'The proposed team is not active.';
    end if;

    update private.player_team_memberships
    set status = 'ended', ended_at = now(), end_reason = 'approved_transfer', updated_at = now()
    where player_id = review_record.player_id and status = 'active';

    update public.team_roster_history
    set end_date = current_date, status = 'inactive', updated_at = now()
    where player_id = review_record.player_id and end_date is null;

    insert into private.player_team_memberships (
      player_id, pubg_account_id, team_id, slot_number, source,
      qualifying_match_ids, qualifying_match_count, status, auto_linked,
      approved_by, approved_at, assigned_current_team, started_at, updated_at
    )
    values (
      review_record.player_id, review_record.pubg_account_id, review_record.proposed_team_id,
      review_record.proposed_slot_number, 'admin_review', review_record.qualifying_match_ids,
      review_record.qualifying_match_count, 'active', false, actor_profile_id, now(), true, now(), now()
    )
    returning id into new_membership_id;

    update public.players
    set current_team_id = review_record.proposed_team_id, updated_at = now()
    where id = review_record.player_id;

    insert into public.team_roster_history (player_id, team_id, start_date, status)
    values (review_record.player_id, review_record.proposed_team_id, current_date, 'active')
    returning id into new_roster_history_id;

    update private.player_team_memberships
    set roster_history_id = new_roster_history_id, updated_at = now()
    where id = new_membership_id;
  elsif decision in ('mark_substitute', 'reject') then
    update public.match_player_results
    set link_eligibility = case when decision = 'mark_substitute' then 'substitute' else 'rejected' end,
        updated_at = now()
    where match_id = any(review_record.qualifying_match_ids)
      and lower(btrim(pubg_account_id)) = lower(review_record.pubg_account_id)
      and team_id = review_record.proposed_team_id
      and slot_number = review_record.proposed_slot_number;
  end if;

  update private.player_team_link_reviews
  set
    status = case decision
      when 'approve_transfer' then 'approved'
      when 'keep_existing' then 'keep_existing'
      when 'mark_substitute' then 'substitute'
      else 'rejected'
    end,
    review_note = nullif(trim(note), ''),
    reviewed_by = actor_profile_id,
    reviewed_at = now(),
    updated_at = now()
  where id = review_record.id;

  update private.player_team_link_evidence
  set state = case when decision = 'approve_transfer' then 'linked' else 'rejected' end,
      evaluated_at = now()
  where lower(pubg_account_id) = lower(review_record.pubg_account_id)
    and team_id = review_record.proposed_team_id
    and slot_number = review_record.proposed_slot_number;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, old_data, new_data)
  values (
    actor_profile_id,
    'player_team_link_review_' || decision,
    'player_team_link_review',
    review_record.id::text,
    to_jsonb(review_record),
    jsonb_build_object('decision', decision, 'note', nullif(trim(note), ''), 'membershipId', new_membership_id)
  );

  if decision in ('mark_substitute', 'reject') then
    perform public.reconcile_player_team_link_for_account(review_record.pubg_account_id);
  end if;

  return jsonb_build_object('status', 'resolved', 'decision', decision, 'membershipId', new_membership_id);
end;
$$;

create or replace function public.unlink_player_team_membership(
  target_membership_id uuid,
  actor_profile_id uuid,
  reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  membership_record private.player_team_memberships%rowtype;
  membership_account_id text;
  suppression_id uuid;
begin
  if not exists (
    select 1 from public.profiles
    where id = actor_profile_id and is_active and role::text in ('super_admin', 'admin')
  ) then
    raise exception 'An active super-admin or admin profile is required.';
  end if;

  if nullif(trim(reason), '') is null then
    raise exception 'An unlink reason is required.';
  end if;

  select pubg_account_id into membership_account_id
  from private.player_team_memberships
  where id = target_membership_id;
  if membership_account_id is null then
    raise exception 'Active player/team membership not found.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('player-team-link:' || lower(membership_account_id), 0));
  select * into membership_record
  from private.player_team_memberships
  where id = target_membership_id
  for update;

  if membership_record is null or membership_record.status <> 'active' then
    raise exception 'Active player/team membership not found.';
  end if;

  insert into private.player_team_link_suppressions (
    pubg_account_id,
    player_id,
    team_id,
    slot_number,
    qualifying_match_ids,
    source_membership_id,
    reason,
    created_by
  )
  values (
    lower(btrim(membership_record.pubg_account_id)),
    membership_record.player_id,
    membership_record.team_id,
    membership_record.slot_number,
    membership_record.qualifying_match_ids,
    membership_record.id,
    trim(reason),
    actor_profile_id
  )
  returning id into suppression_id;

  update private.player_team_memberships
  set status = 'revoked', ended_at = now(), end_reason = trim(reason), updated_at = now()
  where id = target_membership_id;

  update public.players
  set current_team_id = null, updated_at = now()
  where id = membership_record.player_id
    and membership_record.assigned_current_team
    and current_team_id = membership_record.team_id
    and not exists (
      select 1
      from public.team_roster_history other_roster
      where other_roster.player_id = membership_record.player_id
        and other_roster.team_id = membership_record.team_id
        and other_roster.end_date is null
        and other_roster.id is distinct from membership_record.roster_history_id
    );

  update public.team_roster_history
  set end_date = current_date, status = 'inactive', updated_at = now()
  where id = membership_record.roster_history_id
    and player_id = membership_record.player_id
    and team_id = membership_record.team_id
    and end_date is null;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, old_data, new_data)
  values (
    actor_profile_id,
    'player_team_membership_unlinked',
    'player_team_membership',
    membership_record.id::text,
    to_jsonb(membership_record),
    jsonb_build_object(
      'reason', trim(reason),
      'suppressionId', suppression_id,
      'suppressedQualifyingMatchIds', membership_record.qualifying_match_ids
    )
  );

  return jsonb_build_object(
    'status', 'unlinked',
    'membershipId', membership_record.id,
    'suppressionId', suppression_id
  );
end;
$$;

revoke all on function public.reconcile_player_team_link_for_account(text) from public, anon, authenticated;
revoke all on function public.reconcile_player_team_links_for_match(uuid) from public, anon, authenticated;
revoke all on function public.recalculate_player_team_links(text) from public, anon, authenticated;
revoke all on function public.get_player_team_linking_admin_dashboard() from public, anon, authenticated;
revoke all on function public.update_player_team_link_settings(jsonb, uuid) from public, anon, authenticated;
revoke all on function public.review_player_team_link(uuid, text, uuid, text) from public, anon, authenticated;
revoke all on function public.unlink_player_team_membership(uuid, uuid, text) from public, anon, authenticated;

grant execute on function public.reconcile_player_team_link_for_account(text) to service_role;
grant execute on function public.reconcile_player_team_links_for_match(uuid) to service_role;
grant execute on function public.recalculate_player_team_links(text) to service_role;
grant execute on function public.get_player_team_linking_admin_dashboard() to service_role;
grant execute on function public.update_player_team_link_settings(jsonb, uuid) to service_role;
grant execute on function public.review_player_team_link(uuid, text, uuid, text) to service_role;
grant execute on function public.unlink_player_team_membership(uuid, uuid, text) to service_role;
