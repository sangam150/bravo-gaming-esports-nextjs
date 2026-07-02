create extension if not exists pgcrypto;

create table if not exists public.app_documents (
  collection_name text not null,
  id text not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (collection_name, id)
);

create index if not exists app_documents_collection_name_idx on public.app_documents (collection_name);
create index if not exists app_documents_collection_updated_at_idx on public.app_documents (collection_name, updated_at desc);

do $$
begin
  create type public.user_role as enum ('super_admin','admin','moderator','team_igl','caster','viewer');
exception when duplicate_object then null;
end $$;

create type public.season_status as enum ('planned', 'active', 'completed', 'archived');
create type public.day_status as enum ('scheduled', 'active', 'completed', 'waiting_for_data', 'cancelled');
create type public.event_status as enum ('draft', 'active', 'completed', 'archived');
create type public.match_status as enum ('pending', 'approved', 'published', 'rejected', 'failed');
create type public.import_status as enum ('pending', 'approved', 'published', 'rejected', 'failed');
create type public.request_status as enum ('pending', 'approved', 'rejected', 'review_later');
create type public.publish_status as enum ('draft', 'published', 'archived');

create table if not exists public.point_systems (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  game text not null,
  placement_points jsonb not null default '{}'::jsonb,
  kill_points numeric(10,2) not null default 1,
  rules_json jsonb not null default '{}'::jsonb,
  active boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists point_systems_name_lower_unique_idx on public.point_systems (lower(name));
create index if not exists point_systems_game_active_idx on public.point_systems (game, active) where deleted_at is null;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique,
  name text not null,
  email text not null unique,
  role public.user_role not null default 'viewer',
  team_id uuid,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique,
  email text not null unique,
  display_name text,
  discord_user_id text,
  role public.user_role not null default 'viewer',
  team_id uuid,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- Compatibility for databases where profiles was previously created with id = auth.users.id.
alter table public.profiles add column if not exists auth_user_id uuid;
alter table public.users add column if not exists auth_user_id uuid;

update public.profiles p
set auth_user_id = p.id
where p.auth_user_id is null
  and exists (select 1 from auth.users u where u.id = p.id);

create unique index if not exists profiles_auth_user_id_unique_idx
on public.profiles (auth_user_id)
where auth_user_id is not null;

create unique index if not exists profiles_discord_user_id_unique_idx
on public.profiles (discord_user_id)
where discord_user_id is not null;

create table if not exists public.seasons (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null default 'scrims',
  status public.season_status not null default 'active',
  start_date date not null,
  end_date date,
  current_day_number integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.seasons add column if not exists slug text;
alter table public.seasons add column if not exists series_title text;
alter table public.seasons add column if not exists season_number integer not null default 1;
alter table public.seasons add column if not exists configured_days integer not null default 15;
alter table public.seasons add column if not exists completed_at timestamptz;
alter table public.seasons add column if not exists archived_at timestamptz;
alter table public.seasons add column if not exists ended_early boolean not null default false;
alter table public.seasons add column if not exists notes text;
alter table public.seasons add column if not exists description text;
alter table public.seasons add column if not exists game text not null default 'PUBG PC';
alter table public.seasons add column if not exists format text not null default 'Squad';
alter table public.seasons add column if not exists region text not null default 'Global';
alter table public.seasons add column if not exists perspective text not null default 'TPP';
alter table public.seasons add column if not exists demo_seed_tag text;
create unique index if not exists seasons_slug_unique_idx on public.seasons (slug) where slug is not null;

create table if not exists public.days (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete cascade,
  day_number integer not null,
  name text not null,
  status public.day_status not null default 'waiting_for_data',
  date date not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (season_id, day_number)
);

alter table public.days add column if not exists demo_seed_tag text;

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  season_id uuid references public.seasons(id) on delete set null,
  title text not null,
  event_type text not null default 'scrim_day',
  game text not null default 'PUBG PC',
  status public.event_status not null default 'active',
  description text,
  banner_url text,
  start_date timestamptz,
  end_date timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.events add column if not exists name text;
alter table public.events add column if not exists slug text;
alter table public.events add column if not exists type text;
alter table public.events add column if not exists region text;
alter table public.events add column if not exists tier text;
alter table public.events add column if not exists competition_status text not null default 'UPCOMING';
alter table public.events add column if not exists mode text;
alter table public.events add column if not exists perspective text;
alter table public.events add column if not exists prize_pool text;
alter table public.events add column if not exists rules text;
alter table public.events add column if not exists stream_url text;
alter table public.events add column if not exists discord_url text;
alter table public.events add column if not exists server text;
alter table public.events add column if not exists schedule text;
alter table public.events add column if not exists map_rotation jsonb not null default '[]'::jsonb;
alter table public.events add column if not exists max_teams integer not null default 32;
alter table public.events add column if not exists team_count integer not null default 0;
alter table public.events add column if not exists season_day_number integer;
alter table public.events add column if not exists match_count integer not null default 0;
alter table public.events add column if not exists source_url text;
alter table public.events add column if not exists published boolean not null default false;
alter table public.events add column if not exists published_at timestamptz;
alter table public.events add column if not exists deleted_at timestamptz;
alter table public.events add column if not exists point_system_id uuid references public.point_systems(id) on delete set null;
alter table public.events add column if not exists demo_seed_tag text;
create unique index if not exists events_slug_unique_idx on public.events (slug);
create index if not exists events_status_idx on public.events (status);
create index if not exists events_published_idx on public.events (published);
create index if not exists events_published_at_idx on public.events (published_at desc);
create index if not exists events_deleted_at_idx on public.events (deleted_at);
create index if not exists events_point_system_id_idx on public.events (point_system_id);

alter table public.seasons add column if not exists current_event_id uuid references public.events(id) on delete set null;

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  slot_number integer unique,
  name text not null,
  short_name text,
  logo_url text,
  description text,
  status text not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.teams add column if not exists tag text;
alter table public.teams add column if not exists region text;
alter table public.teams add column if not exists is_active boolean not null default true;
alter table public.teams add column if not exists slug text;
alter table public.teams add column if not exists deleted_at timestamptz;
alter table public.teams add column if not exists demo_seed_tag text;

create unique index if not exists teams_name_lower_unique_idx on public.teams (lower(name));
create unique index if not exists teams_slug_unique_idx on public.teams (slug) where deleted_at is null;
create index if not exists teams_status_idx on public.teams (status);
create index if not exists teams_deleted_at_idx on public.teams (deleted_at);

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  pubg_account_id text unique,
  pubg_name text not null,
  display_name text,
  current_team_id uuid references public.teams(id) on delete set null,
  photo_url text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.players add column if not exists avatar_url text;
alter table public.players add column if not exists is_active boolean not null default true;
alter table public.players add column if not exists slug text;
alter table public.players add column if not exists deleted_at timestamptz;
alter table public.players add column if not exists demo_seed_tag text;

create unique index if not exists players_pubg_name_lower_unique_idx on public.players (lower(pubg_name));
create unique index if not exists players_slug_unique_idx on public.players (slug) where deleted_at is null;
create index if not exists players_current_team_id_idx on public.players (current_team_id);
create index if not exists players_deleted_at_idx on public.players (deleted_at);

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete cascade,
  day_id uuid not null references public.days(id) on delete cascade,
  match_id text not null unique,
  match_number integer not null,
  map text not null,
  match_date timestamptz not null,
  status public.match_status not null default 'approved',
  raw_json jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (day_id, match_number)
);

alter table public.matches alter column day_id drop not null;
alter table public.matches add column if not exists external_match_id text;
alter table public.matches add column if not exists event_id uuid references public.events(id) on delete set null;
alter table public.matches add column if not exists map_name text;
alter table public.matches add column if not exists start_time timestamptz;
alter table public.matches add column if not exists vod_url text;
alter table public.matches add column if not exists source_url text;
alter table public.matches add column if not exists data_source text not null default 'manual';
alter table public.matches add column if not exists scoreboard_image_url text;
alter table public.matches add column if not exists result_image_url text;
alter table public.matches add column if not exists screenshot_urls jsonb;
alter table public.matches add column if not exists published_at timestamptz;
alter table public.matches add column if not exists deleted_at timestamptz;
alter table public.matches add column if not exists point_system_id uuid references public.point_systems(id) on delete set null;
alter table public.matches add column if not exists demo_seed_tag text;
create index if not exists matches_status_idx on public.matches (status);
create index if not exists matches_event_id_idx on public.matches (event_id);
create index if not exists matches_published_at_idx on public.matches (published_at desc);
create index if not exists matches_deleted_at_idx on public.matches (deleted_at);
create index if not exists matches_point_system_id_idx on public.matches (point_system_id);

create table if not exists public.match_players (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  season_id uuid not null references public.seasons(id) on delete cascade,
  day_id uuid not null references public.days(id) on delete cascade,
  player_id uuid references public.players(id) on delete set null,
  pubg_account_id text,
  player_name text not null,
  team_id uuid references public.teams(id) on delete set null,
  slot_number integer,
  placement integer not null default 0,
  kills integer not null default 0,
  damage numeric(12,2) not null default 0,
  assists integer not null default 0,
  survival_time integer not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists match_players_match_id_idx on public.match_players (match_id);
create index if not exists match_players_player_id_idx on public.match_players (player_id);
create index if not exists match_players_team_id_idx on public.match_players (team_id);

create table if not exists public.match_results (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  season_id uuid not null references public.seasons(id) on delete cascade,
  day_id uuid not null references public.days(id) on delete cascade,
  team_id uuid references public.teams(id) on delete set null,
  slot_number integer,
  placement integer not null default 0,
  kills integer not null default 0,
  placement_points integer not null default 0,
  total_points integer not null default 0,
  chicken_dinner boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  unique (match_id, slot_number)
);

create index if not exists match_results_match_id_idx on public.match_results (match_id);
create index if not exists match_results_team_id_idx on public.match_results (team_id);

create table if not exists public.pending_imports (
  id uuid primary key default gen_random_uuid(),
  season_id uuid references public.seasons(id) on delete set null,
  day_id uuid references public.days(id) on delete set null,
  match_id text not null,
  match_number integer,
  map text,
  match_date timestamptz,
  raw_json jsonb,
  normalized_json jsonb,
  status public.import_status not null default 'pending',
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists pending_imports_status_idx on public.pending_imports (status);
create index if not exists pending_imports_match_id_idx on public.pending_imports (match_id);

create table if not exists public.import_logs (
  id uuid primary key default gen_random_uuid(),
  match_id text,
  status text not null,
  message text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.roster_requests (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  requested_by uuid not null references public.profiles(id) on delete cascade,
  request_type text not null,
  old_player_id uuid references public.players(id) on delete set null,
  new_player_name text,
  new_player_pubg_name text,
  payload jsonb not null default '{}'::jsonb,
  status public.request_status not null default 'pending',
  admin_note text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  reviewed_at timestamptz
);

create table if not exists public.team_roster_history (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  start_date date not null,
  end_date date,
  status text not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.team_roster_history add column if not exists demo_seed_tag text;

create table if not exists public.event_teams (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  slot_number integer,
  status text not null default 'registered',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (event_id, team_id)
);

alter table public.event_teams add column if not exists demo_seed_tag text;

create table if not exists public.match_team_results (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  team_id uuid references public.teams(id) on delete cascade,
  team_name text,
  slot_number integer,
  placement integer not null default 0,
  kills integer not null default 0,
  placement_points integer not null default 0,
  kill_points numeric(10,2) not null default 0,
  total_points numeric(10,2) not null default 0,
  wwcd boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (match_id, team_id)
);

alter table public.match_team_results add column if not exists demo_seed_tag text;

create table if not exists public.match_player_results (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  player_id uuid references public.players(id) on delete cascade,
  player_name text,
  pubg_account_id text,
  team_id uuid references public.teams(id) on delete set null,
  team_name text,
  slot_number integer,
  placement integer not null default 0,
  kills integer not null default 0,
  assists integer not null default 0,
  knocks integer not null default 0,
  damage integer not null default 0,
  survival_time integer not null default 0,
  placement_points integer not null default 0,
  total_points numeric(10,2) not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (match_id, player_id)
);

alter table public.match_player_results add column if not exists demo_seed_tag text;

create table if not exists public.moss_submissions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete set null,
  match_id uuid references public.matches(id) on delete set null,
  team_id uuid not null references public.teams(id) on delete cascade,
  player_id uuid references public.players(id) on delete set null,
  file_url text,
  external_link text,
  status text not null default 'submitted',
  admin_note text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.uploads (
  id uuid primary key default gen_random_uuid(),
  file_url text not null,
  file_path text,
  file_type text not null,
  related_type text not null,
  related_id uuid,
  uploaded_by uuid references public.profiles(id) on delete set null,
  file_name text,
  content_type text,
  size_bytes bigint,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.uploads add column if not exists demo_seed_tag text;

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.audit_logs alter column entity_id type text using entity_id::text;
create index if not exists audit_logs_actor_id_idx on public.audit_logs (actor_id);
create index if not exists audit_logs_entity_type_idx on public.audit_logs (entity_type);
create index if not exists audit_logs_created_at_idx on public.audit_logs (created_at desc);

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  status public.publish_status not null default 'draft',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.sponsors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_url text,
  website_url text,
  tier text,
  status public.publish_status not null default 'draft',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.sponsors add column if not exists slug text;
alter table public.sponsors add column if not exists description text;
alter table public.sponsors add column if not exists supported_events text[];
alter table public.sponsors add column if not exists partnership_history text[];
alter table public.sponsors add column if not exists featured boolean default false;
alter table public.sponsors add column if not exists published boolean default false;
alter table public.sponsors add column if not exists deleted_at timestamptz;
create unique index if not exists sponsors_slug_unique_idx on public.sponsors (slug) where deleted_at is null;
create index if not exists sponsors_status_idx on public.sponsors (status);
create index if not exists sponsors_published_idx on public.sponsors (published);
create index if not exists sponsors_deleted_at_idx on public.sponsors (deleted_at);

create table if not exists public.videos (
  id uuid primary key default gen_random_uuid(),
  youtube_video_id text,
  title text not null,
  thumbnail_url text,
  video_url text,
  published_at timestamptz,
  status public.publish_status not null default 'draft',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.videos add column if not exists slug text;
alter table public.videos add column if not exists category text;
alter table public.videos add column if not exists duration text;
alter table public.videos add column if not exists kind text;
alter table public.videos add column if not exists game_slug text;
alter table public.videos add column if not exists summary text;
alter table public.videos add column if not exists image_url text;
alter table public.videos add column if not exists featured boolean default false;
alter table public.videos add column if not exists published boolean default false;
alter table public.videos add column if not exists deleted_at timestamptz;
create unique index if not exists videos_slug_unique_idx on public.videos (slug) where deleted_at is null;
create index if not exists videos_status_idx on public.videos (status);
create index if not exists videos_published_idx on public.videos (published);
create index if not exists videos_published_at_idx on public.videos (published_at desc);
create index if not exists videos_game_slug_idx on public.videos (game_slug);
create index if not exists videos_deleted_at_idx on public.videos (deleted_at);

create table if not exists public.settings (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.users add constraint users_team_id_fkey
  foreign key (team_id) references public.teams(id) on delete set null;

alter table public.profiles add constraint profiles_team_id_fkey
  foreign key (team_id) references public.teams(id) on delete set null;

create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role::text::public.user_role from public.profiles where auth_user_id = auth.uid() limit 1),
    (select role::text::public.user_role from public.users where auth_user_id = auth.uid() limit 1),
    'viewer'::public.user_role
  );
$$;

create or replace function public.current_user_team_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select team_id from public.profiles where auth_user_id = auth.uid() limit 1),
    (select team_id from public.users where auth_user_id = auth.uid() limit 1)
  );
$$;

create or replace function public.is_admin_role()
returns boolean
language sql
stable
as $$
  select public.current_user_role() in ('super_admin', 'admin', 'moderator');
$$;

create or replace function public.parse_optional_timestamptz(value text)
returns timestamptz
language plpgsql
stable
as $$
begin
  if value is null or btrim(value) = '' then
    return null;
  end if;

  return value::timestamptz;
exception
  when others then
    return null;
end;
$$;

create or replace function public.jsonb_flag_true_by_default(payload jsonb, key text)
returns boolean
language sql
immutable
as $$
  select coalesce(
    case
      when payload ? key and lower(coalesce(payload ->> key, '')) in ('true', 'false')
        then lower(payload ->> key) = 'true'
      else null
    end,
    true
  );
$$;

create or replace function public.is_public_app_document(collection_name text, payload jsonb)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when payload is null then false
    when nullif(trim(coalesce(payload ->> 'deletedAt', '')), '') is not null then false
    when collection_name in ('registrations', 'uploads', 'pubgImportBatches', 'pubgImportWatchers', 'errorLogs', 'contactMessages') then false
    when collection_name = 'newsArticles' then
      case
        when coalesce(lower(payload ->> 'state'), 'draft') = 'published' then true
        when coalesce(lower(payload ->> 'state'), 'draft') = 'scheduled'
          and public.parse_optional_timestamptz(payload ->> 'publishAt') <= now() then true
        else false
      end
    when collection_name in ('announcements', 'videos', 'sponsors', 'platformGames', 'platformEvents') then
      public.jsonb_flag_true_by_default(payload, 'published')
    when collection_name in (
      'homepageContent',
      'siteStats',
      'streams',
      'seasons',
      'tournaments',
      'standings',
      'matches',
      'teams',
      'players',
      'tournamentMatches',
      'scrims',
      'matchResults',
      'matchPlayers',
      'pubgMatches',
      'pubgPlayers'
    ) then
      public.jsonb_flag_true_by_default(payload, 'published')
      and coalesce(lower(payload ->> 'status'), 'published') not in ('draft', 'pending', 'private')
      and coalesce(lower(payload ->> 'state'), 'published') not in ('draft', 'private')
    else false
  end;
$$;

create or replace function public.ensure_active_scrim_season()
returns uuid
language plpgsql
security definer
as $$
declare
  active_season_id uuid;
begin
  select id
  into active_season_id
  from public.seasons
  where status = 'active'
  order by start_date desc, created_at desc
  limit 1;

  if active_season_id is not null then
    return active_season_id;
  end if;

  insert into public.seasons (name, type, status, start_date, current_day_number)
  values ('Bravo Gaming Esports Daily PUBG PC Scrims', 'scrims', 'active', current_date, 0)
  returning id into active_season_id;

  return active_season_id;
end;
$$;

create or replace function public.create_next_day(target_season_id uuid default null)
returns uuid
language plpgsql
security definer
as $$
declare
  resolved_season_id uuid;
  next_day_number integer;
  created_day_id uuid;
begin
  resolved_season_id := coalesce(target_season_id, public.ensure_active_scrim_season());

  select coalesce(max(day_number), 0) + 1
  into next_day_number
  from public.days
  where season_id = resolved_season_id;

  insert into public.days (season_id, day_number, name, status, date)
  values (
    resolved_season_id,
    next_day_number,
    format('Day %s', next_day_number),
    'active',
    current_date + (next_day_number - 1)
  )
  returning id into created_day_id;

  update public.seasons
  set current_day_number = next_day_number,
      updated_at = timezone('utc', now())
  where id = resolved_season_id;

  return created_day_id;
end;
$$;

create or replace view public.team_leaderboard
with (security_invoker = true) as
with approved_matches as (
  select id, season_id, day_id, match_date
  from public.matches
  where status in ('approved', 'published')
    and deleted_at is null
),
aggregated as (
  select
    mtr.team_id,
    coalesce(t.name, mtr.team_name, format('Team Slot %s', mtr.slot_number)) as team_name,
    coalesce(mtr.slot_number, t.slot_number) as slot_number,
    am.season_id,
    count(*)::int as matches_played,
    sum(case when mtr.wwcd then 1 else 0 end)::int as chicken_dinners,
    sum(mtr.kills)::int as total_kills,
    sum(mtr.placement_points)::int as placement_points,
    sum(mtr.total_points)::int as total_points,
    min(mtr.placement)::int as best_placement,
    max(am.match_date) as latest_match_date
  from public.match_team_results mtr
  join approved_matches am on am.id = mtr.match_id
  left join public.teams t on t.id = mtr.team_id
  group by mtr.team_id, coalesce(t.name, mtr.team_name, format('Team Slot %s', mtr.slot_number)), coalesce(mtr.slot_number, t.slot_number), am.season_id
)
select
  row_number() over (
    partition by season_id
    order by total_points desc, total_kills desc, best_placement asc, latest_match_date desc, team_name asc
  ) as rank,
  *
from aggregated;

create or replace view public.player_leaderboard
with (security_invoker = true) as
with approved_matches as (
  select id, season_id, match_date
  from public.matches
  where status in ('approved', 'published')
    and deleted_at is null
),
aggregated as (
  select
    mpr.player_id,
    coalesce(p.display_name, p.pubg_name, mpr.player_name) as player_name,
    coalesce(p.pubg_account_id, mpr.pubg_account_id) as pubg_account_id,
    mpr.team_id,
    coalesce(t.name, mpr.team_name, format('Team Slot %s', mpr.slot_number)) as team_name,
    coalesce(mpr.slot_number, t.slot_number) as slot_number,
    am.season_id,
    count(*)::int as matches_played,
    sum(mpr.kills)::int as total_kills,
    sum(mpr.damage)::numeric(12,2) as total_damage,
    sum(mpr.assists)::int as total_assists,
    max(am.match_date) as latest_match_date
  from public.match_player_results mpr
  join approved_matches am on am.id = mpr.match_id
  left join public.players p on p.id = mpr.player_id
  left join public.teams t on t.id = mpr.team_id
  group by mpr.player_id, coalesce(p.display_name, p.pubg_name, mpr.player_name), coalesce(p.pubg_account_id, mpr.pubg_account_id), mpr.team_id, coalesce(t.name, mpr.team_name, format('Team Slot %s', mpr.slot_number)), coalesce(mpr.slot_number, t.slot_number), am.season_id
)
select
  row_number() over (
    partition by season_id
    order by total_kills desc, total_damage desc, total_assists desc, matches_played desc, latest_match_date desc, player_name asc
  ) as rank,
  *
from aggregated;

create or replace view public.top_fraggers
with (security_invoker = true) as
select *
from public.player_leaderboard;

create or replace view public.mvp_rankings
with (security_invoker = true) as
with approved_matches as (
  select id, season_id
  from public.matches
  where status in ('approved', 'published')
    and deleted_at is null
),
match_mvps as (
  select
    am.season_id,
    mpr.player_id,
    coalesce(p.display_name, p.pubg_name, mpr.player_name) as player_name,
    mpr.team_id,
    coalesce(t.name, mpr.team_name, format('Team Slot %s', mpr.slot_number)) as team_name,
    mpr.kills,
    mpr.damage,
    mpr.assists,
    row_number() over (
      partition by mpr.match_id
      order by mpr.total_points desc, mpr.kills desc, mpr.damage desc, mpr.assists desc, coalesce(p.display_name, p.pubg_name, mpr.player_name) asc
    ) as match_mvp_rank
  from public.match_player_results mpr
  join approved_matches am on am.id = mpr.match_id
  left join public.players p on p.id = mpr.player_id
  left join public.teams t on t.id = mpr.team_id
),
aggregated as (
  select
    season_id,
    player_id,
    player_name,
    team_id,
    team_name,
    count(*) filter (where match_mvp_rank = 1)::int as mvp_awards,
    sum(kills)::int as total_kills,
    sum(damage)::numeric(12,2) as total_damage,
    sum(assists)::int as total_assists,
    count(*)::int as matches_played
  from match_mvps
  group by season_id, player_id, player_name, team_id, team_name
)
select
  row_number() over (
    partition by season_id
    order by mvp_awards desc, total_kills desc, total_damage desc, total_assists desc, matches_played desc, player_name asc
  ) as rank,
  *
from aggregated;

create or replace view public.standings as
select *
from public.team_leaderboard;

alter table public.users enable row level security;
alter table public.profiles enable row level security;
alter table public.seasons enable row level security;
alter table public.days enable row level security;
alter table public.events enable row level security;
alter table public.event_teams enable row level security;
alter table public.teams enable row level security;
alter table public.players enable row level security;
alter table public.team_roster_history enable row level security;
alter table public.matches enable row level security;
alter table public.match_team_results enable row level security;
alter table public.match_player_results enable row level security;
alter table public.match_players enable row level security;
alter table public.match_results enable row level security;
alter table public.pending_imports enable row level security;
alter table public.import_logs enable row level security;
alter table public.point_systems enable row level security;
alter table public.roster_requests enable row level security;
alter table public.moss_submissions enable row level security;
alter table public.uploads enable row level security;
alter table public.audit_logs enable row level security;
alter table public.announcements enable row level security;
alter table public.sponsors enable row level security;
alter table public.videos enable row level security;
alter table public.settings enable row level security;
alter table public.app_documents enable row level security;

drop policy if exists "public read seasons" on public.seasons;
create policy "public read seasons" on public.seasons
for select using (true);

drop policy if exists "public read days" on public.days;
create policy "public read days" on public.days
for select using (true);

drop policy if exists "public read events" on public.events;
create policy "public read events" on public.events
for select using (coalesce(published, true));

drop policy if exists "public read teams" on public.teams;
create policy "public read teams" on public.teams
for select using (true);

drop policy if exists "public read players" on public.players;
create policy "public read players" on public.players
for select using (true);

drop policy if exists "public read event teams" on public.event_teams;
create policy "public read event teams" on public.event_teams
for select using (true);

drop policy if exists "public read roster history" on public.team_roster_history;
create policy "public read roster history" on public.team_roster_history
for select using (true);

drop policy if exists "public read announcements" on public.announcements;
create policy "public read announcements" on public.announcements
for select using (status = 'published');

drop policy if exists "public read sponsors" on public.sponsors;
create policy "public read sponsors" on public.sponsors
for select using (status = 'published');

drop policy if exists "public read videos" on public.videos;
create policy "public read videos" on public.videos
for select using (status = 'published');

drop policy if exists "public read settings" on public.settings;
create policy "public read settings" on public.settings
for select using (true);

drop policy if exists "public read approved matches" on public.matches;
create policy "public read approved matches" on public.matches
for select using (status in ('approved', 'published'));

drop policy if exists "public read approved match results" on public.match_results;
create policy "public read approved match results" on public.match_results
for select using (
  exists (
    select 1
    from public.matches m
    where m.id = match_results.match_id
      and m.status in ('approved', 'published')
  )
);

drop policy if exists "public read approved match players" on public.match_players;
create policy "public read approved match players" on public.match_players
for select using (
  exists (
    select 1
    from public.matches m
    where m.id = match_players.match_id
      and m.status in ('approved', 'published')
  )
);

drop policy if exists "public read approved team results" on public.match_team_results;
create policy "public read approved team results" on public.match_team_results
for select using (
  exists (
    select 1
    from public.matches m
    where m.id = match_team_results.match_id
      and m.status in ('approved', 'published')
  )
);

drop policy if exists "public read approved player results" on public.match_player_results;
create policy "public read approved player results" on public.match_player_results
for select using (
  exists (
    select 1
    from public.matches m
    where m.id = match_player_results.match_id
      and m.status in ('approved', 'published')
  )
);

drop policy if exists "admin manage all users" on public.users;
create policy "admin manage all users" on public.users
for all using (public.is_admin_role())
with check (public.is_admin_role());

drop policy if exists "admin manage all profiles" on public.profiles;
drop policy if exists "Admins can manage profiles" on public.profiles;
drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
create policy "admin manage all profiles" on public.profiles
for all using (public.is_admin_role())
with check (public.is_admin_role());

drop policy if exists "self read user profile" on public.users;
create policy "self read user profile" on public.users
for select using (auth.uid() = auth_user_id);

drop policy if exists "self update user profile" on public.users;
create policy "self update user profile" on public.users
for update using (auth.uid() = auth_user_id)
with check (auth.uid() = auth_user_id);

drop policy if exists "self read profile" on public.profiles;
create policy "self read profile" on public.profiles
for select using (auth.uid() = auth_user_id);

drop policy if exists "self update profile" on public.profiles;
create policy "self update profile" on public.profiles
for update using (auth.uid() = auth_user_id)
with check (auth.uid() = auth_user_id);

drop policy if exists "admin manage seasons" on public.seasons;
create policy "admin manage seasons" on public.seasons
for all using (public.is_admin_role())
with check (public.is_admin_role());

drop policy if exists "admin manage days" on public.days;
create policy "admin manage days" on public.days
for all using (public.is_admin_role())
with check (public.is_admin_role());

drop policy if exists "admin manage events" on public.events;
create policy "admin manage events" on public.events
for all using (public.is_admin_role())
with check (public.is_admin_role());

drop policy if exists "public read point systems" on public.point_systems;
create policy "public read point systems" on public.point_systems
for select using (deleted_at is null and active = true);

drop policy if exists "admin manage point systems" on public.point_systems;
create policy "admin manage point systems" on public.point_systems
for all using (public.is_admin_role())
with check (public.is_admin_role());

drop policy if exists "admin manage event teams" on public.event_teams;
create policy "admin manage event teams" on public.event_teams
for all using (public.is_admin_role())
with check (public.is_admin_role());

drop policy if exists "admin manage teams" on public.teams;
create policy "admin manage teams" on public.teams
for all using (public.is_admin_role())
with check (public.is_admin_role());

drop policy if exists "admin manage players" on public.players;
create policy "admin manage players" on public.players
for all using (public.is_admin_role())
with check (public.is_admin_role());

drop policy if exists "admin manage roster history" on public.team_roster_history;
create policy "admin manage roster history" on public.team_roster_history
for all using (public.is_admin_role())
with check (public.is_admin_role());

drop policy if exists "admin manage matches" on public.matches;
create policy "admin manage matches" on public.matches
for all using (public.is_admin_role())
with check (public.is_admin_role());

drop policy if exists "admin manage team results" on public.match_team_results;
create policy "admin manage team results" on public.match_team_results
for all using (public.is_admin_role())
with check (public.is_admin_role());

drop policy if exists "admin manage player results" on public.match_player_results;
create policy "admin manage player results" on public.match_player_results
for all using (public.is_admin_role())
with check (public.is_admin_role());

drop policy if exists "admin manage match players" on public.match_players;
create policy "admin manage match players" on public.match_players
for all using (public.is_admin_role())
with check (public.is_admin_role());

drop policy if exists "admin manage match results" on public.match_results;
create policy "admin manage match results" on public.match_results
for all using (public.is_admin_role())
with check (public.is_admin_role());

drop policy if exists "admin manage pending imports" on public.pending_imports;
create policy "admin manage pending imports" on public.pending_imports
for all using (public.is_admin_role())
with check (public.is_admin_role());

drop policy if exists "admin read import logs" on public.import_logs;
create policy "admin read import logs" on public.import_logs
for select using (public.is_admin_role());

drop policy if exists "admin manage announcements" on public.announcements;
create policy "admin manage announcements" on public.announcements
for all using (public.is_admin_role())
with check (public.is_admin_role());

drop policy if exists "admin manage sponsors" on public.sponsors;
create policy "admin manage sponsors" on public.sponsors
for all using (public.is_admin_role())
with check (public.is_admin_role());

drop policy if exists "admin manage videos" on public.videos;
create policy "admin manage videos" on public.videos
for all using (public.is_admin_role())
with check (public.is_admin_role());

drop policy if exists "admin manage settings" on public.settings;
create policy "admin manage settings" on public.settings
for all using (public.is_admin_role())
with check (public.is_admin_role());

drop policy if exists "public read app documents" on public.app_documents;
create policy "public read app documents" on public.app_documents
for select using (public.is_public_app_document(collection_name, data));

drop policy if exists "admin manage app documents" on public.app_documents;
create policy "admin manage app documents" on public.app_documents
for all using (public.is_admin_role())
with check (public.is_admin_role());

drop policy if exists "admin read roster requests" on public.roster_requests;
create policy "admin read roster requests" on public.roster_requests
for select using (public.is_admin_role());

drop policy if exists "admin review roster requests" on public.roster_requests;
create policy "admin review roster requests" on public.roster_requests
for update using (public.is_admin_role())
with check (public.is_admin_role());

drop policy if exists "igl create own team requests" on public.roster_requests;
create policy "igl create own team requests" on public.roster_requests
for insert with check (
  public.current_user_role() = 'team_igl'
  and team_id = public.current_user_team_id()
);

drop policy if exists "igl read own team requests" on public.roster_requests;
create policy "igl read own team requests" on public.roster_requests
for select using (
  public.current_user_role() = 'team_igl'
  and team_id = public.current_user_team_id()
);

drop policy if exists "admin manage moss submissions" on public.moss_submissions;
create policy "admin manage moss submissions" on public.moss_submissions
for all using (public.is_admin_role())
with check (public.is_admin_role());

drop policy if exists "igl submit own team moss" on public.moss_submissions;
create policy "igl submit own team moss" on public.moss_submissions
for insert with check (
  public.current_user_role() = 'team_igl'
  and team_id = public.current_user_team_id()
);

drop policy if exists "igl read own team moss" on public.moss_submissions;
create policy "igl read own team moss" on public.moss_submissions
for select using (
  public.current_user_role() = 'team_igl'
  and team_id = public.current_user_team_id()
);

drop policy if exists "admin manage uploads" on public.uploads;
create policy "admin manage uploads" on public.uploads
for all using (public.is_admin_role())
with check (public.is_admin_role());

drop policy if exists "igl read own team uploads" on public.uploads;
create policy "igl read own team uploads" on public.uploads
for select using (
  public.current_user_role() = 'team_igl'
  and related_id = public.current_user_team_id()
);

drop policy if exists "igl create own team uploads" on public.uploads;
create policy "igl create own team uploads" on public.uploads
for insert with check (
  public.current_user_role() = 'team_igl'
  and related_id = public.current_user_team_id()
);

drop policy if exists "admin read audit logs" on public.audit_logs;
create policy "admin read audit logs" on public.audit_logs
for select using (public.is_admin_role());

insert into public.point_systems (
  id,
  name,
  game,
  placement_points,
  kill_points,
  rules_json,
  active
)
values (
  '00000000-0000-4000-8000-000000000001',
  'Bravo PUBG',
  'PUBG PC',
  '{"1":10,"2":6,"3":5,"4":4,"5":3,"6":2,"7":1,"8":1,"9":0,"10":0,"11":0,"12":0,"13":0,"14":0,"15":0,"16":0}'::jsonb,
  1,
  '{"notes":["WWCD 10 points","Kill 1 point","9th to 16th earn 0 placement points"]}'::jsonb,
  true
)
on conflict (name) do update
set
  game = excluded.game,
  placement_points = excluded.placement_points,
  kill_points = excluded.kill_points,
  rules_json = excluded.rules_json,
  active = excluded.active,
  deleted_at = null,
  updated_at = timezone('utc', now());

update public.events
set published_at = coalesce(published_at, updated_at)
where published = true and published_at is null;

update public.teams
set slug = lower(trim(both '-' from regexp_replace(name, '[^a-z0-9]+', '-', 'gi')))
where slug is null;

update public.players
set slug = lower(trim(both '-' from regexp_replace(coalesce(pubg_name, display_name, id::text), '[^a-z0-9]+', '-', 'gi')))
where slug is null;

update public.sponsors
set slug = lower(trim(both '-' from regexp_replace(name, '[^a-z0-9]+', '-', 'gi')))
where slug is null;

update public.videos
set slug = lower(trim(both '-' from regexp_replace(title, '[^a-z0-9]+', '-', 'gi')))
where slug is null;

insert into storage.buckets (id, name, public)
values
  ('team-logos', 'team-logos', true),
  ('player-avatars', 'player-avatars', true),
  ('event-banners', 'event-banners', true),
  ('sponsor-logos', 'sponsor-logos', true),
  ('result-screenshots', 'result-screenshots', true),
  ('moss-files', 'moss-files', true),
  ('stream-assets', 'stream-assets', true)
on conflict (id) do nothing;

create policy "public read public storage buckets"
on storage.objects
for select
using (bucket_id in ('team-logos', 'player-avatars', 'event-banners', 'sponsor-logos', 'result-screenshots', 'moss-files', 'stream-assets'));

create policy "admin manage storage buckets"
on storage.objects
for all
using (
  bucket_id in ('team-logos', 'player-avatars', 'event-banners', 'sponsor-logos', 'result-screenshots', 'moss-files', 'stream-assets')
  and public.is_admin_role()
)
with check (
  bucket_id in ('team-logos', 'player-avatars', 'event-banners', 'sponsor-logos', 'result-screenshots', 'moss-files', 'stream-assets')
  and public.is_admin_role()
);

insert into public.teams (slot_number, name, short_name, description, status)
values
  (1, 'FYB Esports', 'FYB', 'Default Bravo slot team', 'active'),
  (2, 'Mandem BoyZ', 'MBZ', 'Default Bravo slot team', 'active'),
  (3, 'The Lost MC Esports', 'LMC', 'Default Bravo slot team', 'active'),
  (4, 'Omega Tactix', 'OTX', 'Default Bravo slot team', 'active'),
  (5, 'NPL', 'NPL', 'Default Bravo slot team', 'active'),
  (6, 'N3P', 'N3P', 'Default Bravo slot team', 'active'),
  (7, 'Team HAKU', 'HAKU', 'Default Bravo slot team', 'active'),
  (8, 'Loot Addicts', 'LA', 'Default Bravo slot team', 'active'),
  (9, 'Mujuverse', 'MV', 'Default Bravo slot team', 'active'),
  (10, 'LTG', 'LTG', 'Default Bravo slot team', 'active'),
  (11, 'KDS', 'KDS', 'Default Bravo slot team', 'active'),
  (12, 'Bir Gorkhali', 'BG', 'Default Bravo slot team', 'active'),
  (13, 'Illumaniti Gamers', 'IG', 'Default Bravo slot team', 'active'),
  (14, 'Sons of Nepal', 'SONS', 'Default Bravo slot team', 'active'),
  (15, 'Ace', 'ACE', 'Default Bravo slot team', 'active'),
  (16, 'M8', 'M8', 'Default Bravo slot team', 'active'),
  (17, '69 Esports', '69ES', 'Default Bravo slot team', 'active'),
  (18, 'Arabpati Esports', 'AE', 'Default Bravo slot team', 'active'),
  (19, 'Fam', 'FAM', 'Default Bravo slot team', 'active'),
  (20, 'Families', 'FAMILIES', 'Default Bravo slot team', 'active')
on conflict (slot_number) do update
set
  name = excluded.name,
  short_name = excluded.short_name,
  description = excluded.description,
  status = excluded.status,
  updated_at = timezone('utc', now());

insert into public.settings (key, value)
values
  ('youtube_channel_id', jsonb_build_object('value', '')),
  ('youtube_channel_url', jsonb_build_object('value', '')),
  ('youtube_live_fallback_url', jsonb_build_object('value', '')),
  ('discord_invite_url', jsonb_build_object('value', ''))
on conflict (key) do nothing;

insert into public.app_documents (collection_name, id, data)
values
  (
    'siteStats',
    'main',
    jsonb_build_object(
      'teamsRegistered', 24,
      'matchesHosted', 0,
      'tournamentsCompleted', 0,
      'prizePoolsAwarded', 'Season updates soon',
      'communityMembers', 0,
      'youtubeViews', 'Channel updates soon',
      'currentDay', 0
    )
  ),
  (
    'teams',
    'fyb-esports',
    jsonb_build_object(
      'name', 'FYB Esports',
      'tag', 'FYB',
      'slotNumber', 1,
      'totalPoints', 0,
      'kills', 0,
      'matches', 0,
      'killPoints', 0,
      'placementPoints', 0,
      'status', 'active',
      'registrationStatus', 'approved'
    )
  ),
  (
    'teams',
    'mandem',
    jsonb_build_object(
      'name', 'Mandem',
      'slotNumber', 2,
      'totalPoints', 0,
      'kills', 0,
      'matches', 0,
      'killPoints', 0,
      'placementPoints', 0,
      'status', 'active',
      'registrationStatus', 'approved'
    )
  ),
  (
    'teams',
    'the-lost-mc-esports',
    jsonb_build_object(
      'name', 'The Lost MC Esports',
      'tag', 'LMC',
      'slotNumber', 3,
      'totalPoints', 0,
      'kills', 0,
      'matches', 0,
      'killPoints', 0,
      'placementPoints', 0,
      'status', 'active',
      'registrationStatus', 'approved'
    )
  ),
  (
    'teams',
    'fyb-fan-boy',
    jsonb_build_object(
      'name', 'FYB FAN BOY',
      'tag', 'FYBFB',
      'slotNumber', 4,
      'totalPoints', 0,
      'kills', 0,
      'matches', 0,
      'killPoints', 0,
      'placementPoints', 0,
      'status', 'active',
      'registrationStatus', 'approved'
    )
  ),
  (
    'teams',
    'omega-tactix',
    jsonb_build_object(
      'name', 'Omega Tactix',
      'tag', 'OTX',
      'slotNumber', 5,
      'totalPoints', 0,
      'kills', 0,
      'matches', 0,
      'killPoints', 0,
      'placementPoints', 0,
      'status', 'active',
      'registrationStatus', 'approved'
    )
  ),
  (
    'teams',
    'npl',
    jsonb_build_object(
      'name', 'NPL',
      'slotNumber', 6,
      'totalPoints', 0,
      'kills', 0,
      'matches', 0,
      'killPoints', 0,
      'placementPoints', 0,
      'status', 'active',
      'registrationStatus', 'approved'
    )
  ),
  (
    'teams',
    'n3p',
    jsonb_build_object(
      'name', 'N3P',
      'slotNumber', 7,
      'totalPoints', 0,
      'kills', 0,
      'matches', 0,
      'killPoints', 0,
      'placementPoints', 0,
      'status', 'active',
      'registrationStatus', 'approved'
    )
  ),
  (
    'teams',
    'team-haku',
    jsonb_build_object(
      'name', 'Team HAKU',
      'tag', 'HAKU',
      'slotNumber', 8,
      'totalPoints', 0,
      'kills', 0,
      'matches', 0,
      'killPoints', 0,
      'placementPoints', 0,
      'status', 'active',
      'registrationStatus', 'approved'
    )
  ),
  (
    'teams',
    'lootaddicts',
    jsonb_build_object(
      'name', 'LootAddicts',
      'tag', 'LA',
      'slotNumber', 9,
      'totalPoints', 0,
      'kills', 0,
      'matches', 0,
      'killPoints', 0,
      'placementPoints', 0,
      'status', 'active',
      'registrationStatus', 'approved'
    )
  ),
  (
    'teams',
    'mujuverse',
    jsonb_build_object(
      'name', 'Mujuverse',
      'tag', 'MV',
      'slotNumber', 10,
      'totalPoints', 0,
      'kills', 0,
      'matches', 0,
      'killPoints', 0,
      'placementPoints', 0,
      'status', 'active',
      'registrationStatus', 'approved'
    )
  ),
  (
    'teams',
    'lang-tang-gang-ltg',
    jsonb_build_object(
      'name', 'LTG',
      'tag', 'LTG',
      'slotNumber', 11,
      'totalPoints', 0,
      'kills', 0,
      'matches', 0,
      'killPoints', 0,
      'placementPoints', 0,
      'status', 'active',
      'registrationStatus', 'approved'
    )
  ),
  (
    'teams',
    'kaal',
    jsonb_build_object(
      'name', 'Kaal',
      'slotNumber', 12,
      'totalPoints', 0,
      'kills', 0,
      'matches', 0,
      'killPoints', 0,
      'placementPoints', 0,
      'status', 'active',
      'registrationStatus', 'approved'
    )
  ),
  (
    'teams',
    'bir-gorkhali',
    jsonb_build_object(
      'name', 'Bir Gorkhali',
      'tag', 'BG',
      'slotNumber', 13,
      'totalPoints', 0,
      'kills', 0,
      'matches', 0,
      'killPoints', 0,
      'placementPoints', 0,
      'status', 'active',
      'registrationStatus', 'approved'
    )
  ),
  (
    'teams',
    'illumaniti-gamers',
    jsonb_build_object(
      'name', 'Illumaniti Gamers',
      'tag', 'IG',
      'slotNumber', 14,
      'totalPoints', 0,
      'kills', 0,
      'matches', 0,
      'killPoints', 0,
      'placementPoints', 0,
      'status', 'active',
      'registrationStatus', 'approved'
    )
  ),
  (
    'teams',
    'sons',
    jsonb_build_object(
      'name', 'Sons',
      'slotNumber', 15,
      'totalPoints', 0,
      'kills', 0,
      'matches', 0,
      'killPoints', 0,
      'placementPoints', 0,
      'status', 'active',
      'registrationStatus', 'approved'
    )
  ),
  (
    'teams',
    'ace',
    jsonb_build_object(
      'name', 'Ace',
      'slotNumber', 16,
      'totalPoints', 0,
      'kills', 0,
      'matches', 0,
      'killPoints', 0,
      'placementPoints', 0,
      'status', 'active',
      'registrationStatus', 'approved'
    )
  ),
  (
    'teams',
    'm8',
    jsonb_build_object(
      'name', 'M8',
      'slotNumber', 17,
      'totalPoints', 0,
      'kills', 0,
      'matches', 0,
      'killPoints', 0,
      'placementPoints', 0,
      'status', 'active',
      'registrationStatus', 'approved'
    )
  ),
  (
    'teams',
    'arabpati-esports',
    jsonb_build_object(
      'name', 'Arabpati Esports',
      'tag', 'AE',
      'slotNumber', 18,
      'totalPoints', 0,
      'kills', 0,
      'matches', 0,
      'killPoints', 0,
      'placementPoints', 0,
      'status', 'active',
      'registrationStatus', 'approved'
    )
  ),
  (
    'teams',
    'gedagudi',
    jsonb_build_object(
      'name', 'GedaGudi',
      'tag', 'GG',
      'slotNumber', 19,
      'totalPoints', 0,
      'kills', 0,
      'matches', 0,
      'killPoints', 0,
      'placementPoints', 0,
      'status', 'active',
      'registrationStatus', 'approved'
    )
  ),
  (
    'teams',
    'the-young-man',
    jsonb_build_object(
      'name', 'The Young Man',
      'tag', 'TYM',
      'slotNumber', 20,
      'totalPoints', 0,
      'kills', 0,
      'matches', 0,
      'killPoints', 0,
      'placementPoints', 0,
      'status', 'active',
      'registrationStatus', 'approved'
    )
  ),
  (
    'teams',
    'aia-apex-in-action',
    jsonb_build_object(
      'name', 'AIA ( APEX IN ACTION )',
      'tag', 'AIA',
      'slotNumber', 21,
      'totalPoints', 0,
      'kills', 0,
      'matches', 0,
      'killPoints', 0,
      'placementPoints', 0,
      'status', 'active',
      'registrationStatus', 'approved'
    )
  ),
  (
    'teams',
    'team-69',
    jsonb_build_object(
      'name', 'Team 69',
      'tag', 'T69',
      'slotNumber', 22,
      'totalPoints', 0,
      'kills', 0,
      'matches', 0,
      'killPoints', 0,
      'placementPoints', 0,
      'status', 'active',
      'registrationStatus', 'approved'
    )
  ),
  (
    'teams',
    'fam',
    jsonb_build_object(
      'name', 'Fam',
      'slotNumber', 23,
      'totalPoints', 0,
      'kills', 0,
      'matches', 0,
      'killPoints', 0,
      'placementPoints', 0,
      'status', 'active',
      'registrationStatus', 'approved'
    )
  ),
  (
    'teams',
    'families',
    jsonb_build_object(
      'name', 'Families',
      'slotNumber', 24,
      'totalPoints', 0,
      'kills', 0,
      'matches', 0,
      'killPoints', 0,
      'placementPoints', 0,
      'status', 'active',
      'registrationStatus', 'approved'
    )
  )
on conflict (collection_name, id) do update
set
  data = excluded.data,
  updated_at = timezone('utc', now());

drop trigger if exists seasons_set_updated_at on public.seasons;
create trigger seasons_set_updated_at
before update on public.seasons
for each row execute function public.set_updated_at();

drop trigger if exists days_set_updated_at on public.days;
create trigger days_set_updated_at
before update on public.days
for each row execute function public.set_updated_at();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists point_systems_set_updated_at on public.point_systems;
create trigger point_systems_set_updated_at
before update on public.point_systems
for each row execute function public.set_updated_at();

drop trigger if exists events_set_updated_at on public.events;
create trigger events_set_updated_at
before update on public.events
for each row execute function public.set_updated_at();

drop trigger if exists event_teams_set_updated_at on public.event_teams;
create trigger event_teams_set_updated_at
before update on public.event_teams
for each row execute function public.set_updated_at();

drop trigger if exists teams_set_updated_at on public.teams;
create trigger teams_set_updated_at
before update on public.teams
for each row execute function public.set_updated_at();

drop trigger if exists players_set_updated_at on public.players;
create trigger players_set_updated_at
before update on public.players
for each row execute function public.set_updated_at();

drop trigger if exists team_roster_history_set_updated_at on public.team_roster_history;
create trigger team_roster_history_set_updated_at
before update on public.team_roster_history
for each row execute function public.set_updated_at();

drop trigger if exists matches_set_updated_at on public.matches;
create trigger matches_set_updated_at
before update on public.matches
for each row execute function public.set_updated_at();

drop trigger if exists match_team_results_set_updated_at on public.match_team_results;
create trigger match_team_results_set_updated_at
before update on public.match_team_results
for each row execute function public.set_updated_at();

drop trigger if exists match_player_results_set_updated_at on public.match_player_results;
create trigger match_player_results_set_updated_at
before update on public.match_player_results
for each row execute function public.set_updated_at();

drop trigger if exists pending_imports_set_updated_at on public.pending_imports;
create trigger pending_imports_set_updated_at
before update on public.pending_imports
for each row execute function public.set_updated_at();

drop trigger if exists roster_requests_set_updated_at on public.roster_requests;
create trigger roster_requests_set_updated_at
before update on public.roster_requests
for each row execute function public.set_updated_at();

drop trigger if exists moss_submissions_set_updated_at on public.moss_submissions;
create trigger moss_submissions_set_updated_at
before update on public.moss_submissions
for each row execute function public.set_updated_at();

drop trigger if exists announcements_set_updated_at on public.announcements;
create trigger announcements_set_updated_at
before update on public.announcements
for each row execute function public.set_updated_at();

drop trigger if exists sponsors_set_updated_at on public.sponsors;
create trigger sponsors_set_updated_at
before update on public.sponsors
for each row execute function public.set_updated_at();

drop trigger if exists videos_set_updated_at on public.videos;
create trigger videos_set_updated_at
before update on public.videos
for each row execute function public.set_updated_at();

drop trigger if exists settings_set_updated_at on public.settings;
create trigger settings_set_updated_at
before update on public.settings
for each row execute function public.set_updated_at();

drop trigger if exists app_documents_set_updated_at on public.app_documents;
create trigger app_documents_set_updated_at
before update on public.app_documents
for each row execute function public.set_updated_at();

create table if not exists public.app_rate_limits (
  limiter_key text primary key,
  request_count integer not null default 0,
  window_started_at timestamptz not null default timezone('utc', now()),
  reset_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists app_rate_limits_reset_at_idx on public.app_rate_limits (reset_at);

create or replace function public.consume_rate_limit(
  p_key text,
  p_max_requests integer,
  p_window_ms integer
)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_now timestamptz := timezone('utc', now());
  v_window interval := (greatest(p_window_ms, 1000)::text || ' milliseconds')::interval;
  v_count integer;
  v_reset_at timestamptz;
  v_retry_after integer;
begin
  insert into public.app_rate_limits as rate_limit (
    limiter_key,
    request_count,
    window_started_at,
    reset_at,
    updated_at
  )
  values (
    p_key,
    1,
    v_now,
    v_now + v_window,
    v_now
  )
  on conflict (limiter_key) do update
  set
    request_count = case
      when rate_limit.reset_at <= v_now then 1
      else rate_limit.request_count + 1
    end,
    window_started_at = case
      when rate_limit.reset_at <= v_now then v_now
      else rate_limit.window_started_at
    end,
    reset_at = case
      when rate_limit.reset_at <= v_now then v_now + v_window
      else rate_limit.reset_at
    end,
    updated_at = v_now
  returning request_count, reset_at into v_count, v_reset_at;

  v_retry_after := case
    when v_count > p_max_requests then greatest(1, ceil(extract(epoch from (v_reset_at - v_now)))::integer)
    else 0
  end;

  return jsonb_build_object(
    'allowed', v_count <= p_max_requests,
    'remaining', greatest(p_max_requests - least(v_count, p_max_requests), 0),
    'retry_after_seconds', v_retry_after,
    'reset_at', v_reset_at
  );
end;
$$;
