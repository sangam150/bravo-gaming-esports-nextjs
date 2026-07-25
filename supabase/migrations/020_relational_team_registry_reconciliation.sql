-- Owner-reviewed bridge between immutable compatibility records and relational teams.
-- Compatibility documents and historical labels remain untouched.

alter table public.teams
  add column if not exists normalized_name text,
  add column if not exists source_metadata jsonb not null default '{}'::jsonb,
  add column if not exists merged_into_team_id uuid references public.teams(id) on delete restrict,
  add column if not exists archived_at timestamptz;

update public.teams
set normalized_name = lower(regexp_replace(trim(name), '[^a-z0-9]+', '', 'g'))
where normalized_name is null;

create unique index if not exists teams_normalized_name_active_unique_idx
  on public.teams(normalized_name)
  where deleted_at is null and merged_into_team_id is null;

alter table public.team_aliases
  add column if not exists alias text,
  add column if not exists normalized_alias text,
  add column if not exists source text not null default 'manual',
  add column if not exists source_identifier text,
  add column if not exists is_primary boolean not null default false;

create unique index if not exists team_aliases_source_identity_unique_idx
  on public.team_aliases(source, source_identifier)
  where source_identifier is not null;
create index if not exists team_aliases_normalized_alias_idx
  on public.team_aliases(normalized_alias);

create table if not exists public.team_reconciliation_candidates (
  id uuid primary key default gen_random_uuid(),
  source_type text not null,
  source_identifier text not null,
  displayed_name text not null,
  team_tag text,
  slug text,
  aliases jsonb not null default '[]'::jsonb,
  evidence jsonb not null default '{}'::jsonb,
  proposed_team_id uuid references public.teams(id) on delete set null,
  confidence numeric(5,4),
  conflict_warnings jsonb not null default '[]'::jsonb,
  proposed_action text not null default 'unresolved'
    check (proposed_action in (
      'create_new', 'link_existing', 'merge_candidate', 'historical_only',
      'unresolved', 'ignore_non_team_role', 'archive'
    )),
  review_status text not null default 'pending'
    check (review_status in ('pending', 'approved', 'changes_requested', 'rejected', 'resolved')),
  owner_note text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(source_type, source_identifier)
);

create table if not exists public.team_source_links (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete restrict,
  source_type text not null,
  source_identifier text not null,
  historical_name text,
  historical_tag text,
  historical_slug text,
  metadata jsonb not null default '{}'::jsonb,
  linked_by uuid references public.profiles(id) on delete set null,
  linked_at timestamptz not null default now(),
  unique(source_type, source_identifier)
);

create index if not exists team_source_links_team_idx
  on public.team_source_links(team_id);

create table if not exists public.team_registry_audit (
  id uuid primary key default gen_random_uuid(),
  actor_profile_id uuid references public.profiles(id) on delete set null,
  action text not null,
  team_id uuid references public.teams(id) on delete set null,
  candidate_id uuid references public.team_reconciliation_candidates(id) on delete set null,
  previous_value jsonb,
  new_value jsonb,
  created_at timestamptz not null default now()
);

create index if not exists team_registry_audit_team_idx
  on public.team_registry_audit(team_id, created_at desc);

alter table public.team_reconciliation_candidates enable row level security;
alter table public.team_source_links enable row level security;
alter table public.team_registry_audit enable row level security;

comment on table public.team_reconciliation_candidates is
  'Owner decision queue. Suggestions never create, merge, archive, or link teams automatically.';
comment on table public.team_source_links is
  'Non-destructive mapping from compatibility/event/Discord identities to canonical relational UUIDs.';
comment on table public.team_registry_audit is
  'Append-only evidence for owner-approved team registry changes.';
