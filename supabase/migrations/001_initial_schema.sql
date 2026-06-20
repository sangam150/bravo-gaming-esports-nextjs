-- Canonical initial schema: enums, functions, core tables, indexes, constraints, and RLS.

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

create type public.user_role as enum (
  'super_admin',
  'admin',
  'moderator',
  'team_igl',
  'caster',
  'viewer'
);

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
  role public.user_role not null default 'viewer',
  team_id uuid,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

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
alter table public.events add column if not exists mode text;
alter table public.events add column if not exists perspective text;
alter table public.events add column if not exists prize_pool text;
alter table public.events add column if not exists rules text;
alter table public.events add column if not exists stream_url text;
alter table public.events add column if not exists discord_url text;
alter table public.events add column if not exists published boolean not null default false;
alter table public.events add column if not exists published_at timestamptz;
alter table public.events add column if not exists deleted_at timestamptz;
alter table public.events add column if not exists point_system_id uuid references public.point_systems(id) on delete set null;
create unique index if not exists events_slug_unique_idx on public.events (slug);
create index if not exists events_status_idx on public.events (status);
create index if not exists events_published_idx on public.events (published);
create index if not exists events_published_at_idx on public.events (published_at desc);
create index if not exists events_deleted_at_idx on public.events (deleted_at);
create index if not exists events_point_system_id_idx on public.events (point_system_id);

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

alter table public.matches add column if not exists event_id uuid references public.events(id) on delete set null;
alter table public.matches add column if not exists map_name text;
alter table public.matches add column if not exists start_time timestamptz;
alter table public.matches add column if not exists vod_url text;
alter table public.matches add column if not exists source_url text;
alter table public.matches add column if not exists scoreboard_image_url text;
alter table public.matches add column if not exists result_image_url text;
alter table public.matches add column if not exists screenshot_urls jsonb;
alter table public.matches add column if not exists published_at timestamptz;
alter table public.matches add column if not exists deleted_at timestamptz;
alter table public.matches add column if not exists point_system_id uuid references public.point_systems(id) on delete set null;
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

create table if not exists public.match_team_results (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  placement integer not null default 0,
  kills integer not null default 0,
  placement_points integer not null default 0,
  kill_points integer not null default 0,
  total_points integer not null default 0,
  wwcd boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (match_id, team_id)
);

create table if not exists public.match_player_results (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  team_id uuid references public.teams(id) on delete set null,
  kills integer not null default 0,
  assists integer not null default 0,
  knocks integer not null default 0,
  damage integer not null default 0,
  survival_time integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (match_id, player_id)
);

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
as $$
  select coalesce(
    (select role from public.profiles where auth_user_id = auth.uid() limit 1),
    (select role from public.users where auth_user_id = auth.uid() limit 1),
    'viewer'::public.user_role
  );
$$;

create or replace function public.current_user_team_id()
returns uuid
language sql
stable
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

create or replace view public.team_leaderboard as
with approved_matches as (
  select id, season_id, day_id, match_date
  from public.matches
  where status in ('approved', 'published')
),
aggregated as (
  select
    mr.team_id,
    coalesce(t.name, format('Team Slot %s', mr.slot_number)) as team_name,
    mr.slot_number,
    am.season_id,
    count(*)::int as matches_played,
    sum(case when mr.chicken_dinner then 1 else 0 end)::int as chicken_dinners,
    sum(mr.kills)::int as total_kills,
    sum(mr.placement_points)::int as placement_points,
    sum(mr.total_points)::int as total_points,
    min(mr.placement)::int as best_placement,
    max(am.match_date) as latest_match_date
  from public.match_results mr
  join approved_matches am on am.id = mr.match_id
  left join public.teams t on t.id = mr.team_id
  group by mr.team_id, t.name, mr.slot_number, am.season_id
)
select
  row_number() over (
    partition by season_id
    order by total_points desc, total_kills desc, best_placement asc, latest_match_date desc, team_name asc
  ) as rank,
  *
from aggregated;

create or replace view public.player_leaderboard as
with approved_matches as (
  select id, season_id, match_date
  from public.matches
  where status in ('approved', 'published')
),
aggregated as (
  select
    mp.player_id,
    coalesce(p.display_name, p.pubg_name, mp.player_name) as player_name,
    mp.pubg_account_id,
    mp.team_id,
    coalesce(t.name, format('Team Slot %s', mp.slot_number)) as team_name,
    mp.slot_number,
    am.season_id,
    count(*)::int as matches_played,
    sum(mp.kills)::int as total_kills,
    sum(mp.damage)::numeric(12,2) as total_damage,
    sum(mp.assists)::int as total_assists,
    max(am.match_date) as latest_match_date
  from public.match_players mp
  join approved_matches am on am.id = mp.match_id
  left join public.players p on p.id = mp.player_id
  left join public.teams t on t.id = mp.team_id
  group by mp.player_id, p.display_name, p.pubg_name, mp.player_name, mp.pubg_account_id, mp.team_id, t.name, mp.slot_number, am.season_id
)
select
  row_number() over (
    partition by season_id
    order by total_kills desc, total_damage desc, total_assists desc, matches_played desc, latest_match_date desc, player_name asc
  ) as rank,
  *
from aggregated;

create or replace view public.top_fraggers as
select *
from public.player_leaderboard;

create or replace view public.mvp_rankings as
with approved_matches as (
  select id, season_id
  from public.matches
  where status in ('approved', 'published')
),
match_mvps as (
  select
    am.season_id,
    mp.player_id,
    coalesce(p.display_name, p.pubg_name, mp.player_name) as player_name,
    mp.team_id,
    coalesce(t.name, format('Team Slot %s', mp.slot_number)) as team_name,
    mp.kills,
    mp.damage,
    mp.assists,
    row_number() over (
      partition by mp.match_id
      order by mp.kills desc, mp.damage desc, mp.assists desc, mp.player_name asc
    ) as match_mvp_rank
  from public.match_players mp
  join approved_matches am on am.id = mp.match_id
  left join public.players p on p.id = mp.player_id
  left join public.teams t on t.id = mp.team_id
),
aggregated as (
  select
    season_id,
    player_id,
    player_name,
    team_id,
    team_name,
    count(*)::int filter (where match_mvp_rank = 1) as mvp_awards,
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

create policy "public read seasons" on public.seasons
for select using (true);

create policy "public read days" on public.days
for select using (true);

create policy "public read events" on public.events
for select using (coalesce(published, true));

create policy "public read teams" on public.teams
for select using (true);

create policy "public read players" on public.players
for select using (true);

create policy "public read event teams" on public.event_teams
for select using (true);

create policy "public read roster history" on public.team_roster_history
for select using (true);

create policy "public read announcements" on public.announcements
for select using (status = 'published');

create policy "public read sponsors" on public.sponsors
for select using (status = 'published');

create policy "public read videos" on public.videos
for select using (status = 'published');

create policy "public read settings" on public.settings
for select using (true);

create policy "public read approved matches" on public.matches
for select using (status in ('approved', 'published'));

create policy "public read approved match results" on public.match_results
for select using (
  exists (
    select 1
    from public.matches m
    where m.id = match_results.match_id
      and m.status in ('approved', 'published')
  )
);

create policy "public read approved match players" on public.match_players
for select using (
  exists (
    select 1
    from public.matches m
    where m.id = match_players.match_id
      and m.status in ('approved', 'published')
  )
);

create policy "public read approved team results" on public.match_team_results
for select using (
  exists (
    select 1
    from public.matches m
    where m.id = match_team_results.match_id
      and m.status in ('approved', 'published')
  )
);

create policy "public read approved player results" on public.match_player_results
for select using (
  exists (
    select 1
    from public.matches m
    where m.id = match_player_results.match_id
      and m.status in ('approved', 'published')
  )
);

create policy "admin manage all users" on public.users
for all using (public.is_admin_role())
with check (public.is_admin_role());

create policy "admin manage all profiles" on public.profiles
for all using (public.is_admin_role())
with check (public.is_admin_role());

create policy "self read user profile" on public.users
for select using (auth.uid() = auth_user_id);

create policy "self update user profile" on public.users
for update using (auth.uid() = auth_user_id)
with check (auth.uid() = auth_user_id);

create policy "self read profile" on public.profiles
for select using (auth.uid() = auth_user_id);

create policy "self update profile" on public.profiles
for update using (auth.uid() = auth_user_id)
with check (auth.uid() = auth_user_id);

create policy "admin manage seasons" on public.seasons
for all using (public.is_admin_role())
with check (public.is_admin_role());

create policy "admin manage days" on public.days
for all using (public.is_admin_role())
with check (public.is_admin_role());

create policy "admin manage events" on public.events
for all using (public.is_admin_role())
with check (public.is_admin_role());

create policy "public read point systems" on public.point_systems
for select using (deleted_at is null and active = true);

create policy "admin manage point systems" on public.point_systems
for all using (public.is_admin_role())
with check (public.is_admin_role());

create policy "admin manage event teams" on public.event_teams
for all using (public.is_admin_role())
with check (public.is_admin_role());

create policy "admin manage teams" on public.teams
for all using (public.is_admin_role())
with check (public.is_admin_role());

create policy "admin manage players" on public.players
for all using (public.is_admin_role())
with check (public.is_admin_role());

create policy "admin manage roster history" on public.team_roster_history
for all using (public.is_admin_role())
with check (public.is_admin_role());

create policy "admin manage matches" on public.matches
for all using (public.is_admin_role())
with check (public.is_admin_role());

create policy "admin manage team results" on public.match_team_results
for all using (public.is_admin_role())
with check (public.is_admin_role());

create policy "admin manage player results" on public.match_player_results
for all using (public.is_admin_role())
with check (public.is_admin_role());

create policy "admin manage match players" on public.match_players
for all using (public.is_admin_role())
with check (public.is_admin_role());

create policy "admin manage match results" on public.match_results
for all using (public.is_admin_role())
with check (public.is_admin_role());

create policy "admin manage pending imports" on public.pending_imports
for all using (public.is_admin_role())
with check (public.is_admin_role());

create policy "admin read import logs" on public.import_logs
for select using (public.is_admin_role());

create policy "admin manage announcements" on public.announcements
for all using (public.is_admin_role())
with check (public.is_admin_role());

create policy "admin manage sponsors" on public.sponsors
for all using (public.is_admin_role())
with check (public.is_admin_role());

create policy "admin manage videos" on public.videos
for all using (public.is_admin_role())
with check (public.is_admin_role());

create policy "admin manage settings" on public.settings
for all using (public.is_admin_role())
with check (public.is_admin_role());

create policy "public read app documents" on public.app_documents
for select using (true);

create policy "admin manage app documents" on public.app_documents
for all using (public.is_admin_role())
with check (public.is_admin_role());

create policy "admin read roster requests" on public.roster_requests
for select using (public.is_admin_role());

create policy "admin review roster requests" on public.roster_requests
for update using (public.is_admin_role())
with check (public.is_admin_role());

create policy "igl create own team requests" on public.roster_requests
for insert with check (
  public.current_user_role() = 'team_igl'
  and team_id = public.current_user_team_id()
);

create policy "igl read own team requests" on public.roster_requests
for select using (
  public.current_user_role() = 'team_igl'
  and team_id = public.current_user_team_id()
);

create policy "admin manage moss submissions" on public.moss_submissions
for all using (public.is_admin_role())
with check (public.is_admin_role());

create policy "igl submit own team moss" on public.moss_submissions
for insert with check (
  public.current_user_role() = 'team_igl'
  and team_id = public.current_user_team_id()
);

create policy "igl read own team moss" on public.moss_submissions
for select using (
  public.current_user_role() = 'team_igl'
  and team_id = public.current_user_team_id()
);

create policy "admin manage uploads" on public.uploads
for all using (public.is_admin_role())
with check (public.is_admin_role());

create policy "igl read own team uploads" on public.uploads
for select using (
  public.current_user_role() = 'team_igl'
  and related_id = public.current_user_team_id()
);

create policy "igl create own team uploads" on public.uploads
for insert with check (
  public.current_user_role() = 'team_igl'
  and related_id = public.current_user_team_id()
);

create policy "admin read audit logs" on public.audit_logs
for select using (public.is_admin_role());


create trigger seasons_set_updated_at
before update on public.seasons
for each row execute function public.set_updated_at();

create trigger days_set_updated_at
before update on public.days
for each row execute function public.set_updated_at();

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger point_systems_set_updated_at
before update on public.point_systems
for each row execute function public.set_updated_at();

create trigger events_set_updated_at
before update on public.events
for each row execute function public.set_updated_at();

create trigger event_teams_set_updated_at
before update on public.event_teams
for each row execute function public.set_updated_at();

create trigger teams_set_updated_at
before update on public.teams
for each row execute function public.set_updated_at();

create trigger players_set_updated_at
before update on public.players
for each row execute function public.set_updated_at();

create trigger team_roster_history_set_updated_at
before update on public.team_roster_history
for each row execute function public.set_updated_at();

create trigger matches_set_updated_at
before update on public.matches
for each row execute function public.set_updated_at();

create trigger match_team_results_set_updated_at
before update on public.match_team_results
for each row execute function public.set_updated_at();

create trigger match_player_results_set_updated_at
before update on public.match_player_results
for each row execute function public.set_updated_at();

create trigger pending_imports_set_updated_at
before update on public.pending_imports
for each row execute function public.set_updated_at();

create trigger roster_requests_set_updated_at
before update on public.roster_requests
for each row execute function public.set_updated_at();

create trigger moss_submissions_set_updated_at
before update on public.moss_submissions
for each row execute function public.set_updated_at();

create trigger announcements_set_updated_at
before update on public.announcements
for each row execute function public.set_updated_at();

create trigger sponsors_set_updated_at
before update on public.sponsors
for each row execute function public.set_updated_at();

create trigger videos_set_updated_at
before update on public.videos
for each row execute function public.set_updated_at();

create trigger settings_set_updated_at
before update on public.settings
for each row execute function public.set_updated_at();

create trigger app_documents_set_updated_at
before update on public.app_documents
for each row execute function public.set_updated_at();
