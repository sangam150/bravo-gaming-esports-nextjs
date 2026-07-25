-- Dynamic Discord role catalog and team identity mappings.
-- Team roles are configuration data so future teams do not require code or env changes.

create table if not exists public.discord_role_mappings (
  id uuid primary key default gen_random_uuid(),
  discord_guild_id text not null,
  discord_role_id text not null,
  discord_role_name text not null,
  role_position integer not null default 0,
  role_color integer not null default 0,
  member_count integer,
  mapping_type text not null default 'ignored'
    check (mapping_type in ('access', 'team_function', 'team_identity', 'verification', 'cosmetic', 'bot', 'deny', 'ignored')),
  application_role text
    check (application_role is null or application_role in ('admin', 'organizer', 'moderator', 'team_manager', 'team_igl', 'coach', 'player', 'viewer')),
  team_id uuid references public.teams(id) on delete set null,
  priority integer not null default 0,
  deny_access boolean not null default false,
  enabled boolean not null default false,
  managed_by_discord boolean not null default false,
  mapping_status text not null default 'unmapped'
    check (mapping_status in ('unmapped', 'suggested', 'pending_review', 'mapped', 'conflict', 'role_missing', 'disabled')),
  role_missing_at timestamptz,
  last_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (discord_guild_id, discord_role_id),
  check (mapping_type <> 'team_identity' or application_role is null),
  check (mapping_type <> 'deny' or team_id is null)
);

create index if not exists discord_role_mappings_guild_enabled_idx
  on public.discord_role_mappings(discord_guild_id, enabled);
create index if not exists discord_role_mappings_team_idx
  on public.discord_role_mappings(team_id)
  where team_id is not null;

create table if not exists public.discord_access_reviews (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete cascade,
  discord_user_id text not null,
  discord_guild_id text not null,
  category text not null
    check (category in ('ambiguous_team', 'team_missing', 'team_mismatch', 'role_conflict', 'player_link_missing', 'new_discord_role', 'discord_role_missing', 'igl_change', 'team_transfer', 'duplicate_team', 'archived_team_conflict')),
  discord_role_ids text[] not null default '{}',
  candidate_team_ids uuid[] not null default '{}',
  status text not null default 'pending'
    check (status in ('pending', 'resolved', 'dismissed')),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.team_memberships (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete restrict,
  membership_role text not null
    check (membership_role in ('team_manager', 'team_igl', 'coach', 'player', 'former_member')),
  membership_status text not null default 'pending'
    check (membership_status in ('pending', 'active', 'suspended', 'transfer_pending', 'removed', 'expired')),
  is_primary boolean not null default false,
  source text not null default 'manual'
    check (source in ('manual', 'registration', 'discord_sync')),
  discord_role_id text,
  effective_from timestamptz,
  effective_until timestamptz,
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  change_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists team_memberships_one_active_role_idx
  on public.team_memberships(profile_id, team_id, membership_role)
  where membership_status in ('pending', 'active', 'transfer_pending');
create unique index if not exists team_memberships_one_primary_igl_idx
  on public.team_memberships(team_id)
  where membership_role = 'team_igl' and membership_status = 'active' and is_primary;

create table if not exists public.team_aliases (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  previous_name text,
  previous_tag text,
  previous_slug text,
  created_at timestamptz not null default now(),
  unique(previous_slug)
);

alter table public.teams
  add column if not exists verification_status text not null default 'unverified'
    check (verification_status in ('unverified', 'registered', 'verified', 'professional', 'revoked')),
  add column if not exists discord_mapping_status text not null default 'unmapped'
    check (discord_mapping_status in ('unmapped', 'suggested', 'pending_review', 'mapped', 'conflict', 'role_missing', 'disabled')),
  add column if not exists primary_igl_profile_id uuid references public.profiles(id) on delete set null;

alter table public.registrations
  add column if not exists official_team_id uuid references public.teams(id) on delete set null,
  add column if not exists onboarding_status text not null default 'submitted'
    check (onboarding_status in ('draft', 'submitted', 'under_review', 'changes_requested', 'approved', 'rejected', 'withdrawn', 'archived')),
  add column if not exists duplicate_candidates jsonb not null default '[]'::jsonb;

create index if not exists discord_access_reviews_pending_idx
  on public.discord_access_reviews(status, created_at desc);
create unique index if not exists discord_access_reviews_open_profile_category_idx
  on public.discord_access_reviews(profile_id, category)
  where status = 'pending' and profile_id is not null;
create unique index if not exists discord_access_reviews_open_catalog_role_idx
  on public.discord_access_reviews(discord_guild_id, category, ((discord_role_ids)[1]))
  where status = 'pending' and profile_id is null;

alter table public.profiles
  add column if not exists discord_team_role_id text,
  add column if not exists discord_team_verified_at timestamptz;

alter table public.discord_role_mappings enable row level security;
alter table public.discord_access_reviews enable row level security;
alter table public.team_memberships enable row level security;
alter table public.team_aliases enable row level security;

comment on table public.discord_role_mappings is
  'Server-managed Discord role catalog. Numeric role IDs authorize access; team identity mappings support future teams without deployments.';
comment on table public.discord_access_reviews is
  'Owner review queue for ambiguous or conflicting Discord team resolution.';
