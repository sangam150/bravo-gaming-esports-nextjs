create extension if not exists pgcrypto;

create type public.user_role as enum (
  'super_admin',
  'admin',
  'moderator',
  'team_igl',
  'viewer'
);

create type public.season_status as enum ('planned', 'active', 'completed', 'archived');
create type public.day_status as enum ('scheduled', 'active', 'completed', 'waiting_for_data', 'cancelled');
create type public.event_status as enum ('draft', 'active', 'completed', 'archived');
create type public.match_status as enum ('pending', 'approved', 'published', 'rejected', 'failed');
create type public.import_status as enum ('pending', 'approved', 'published', 'rejected', 'failed');
create type public.request_status as enum ('pending', 'approved', 'rejected', 'review_later');
create type public.publish_status as enum ('draft', 'published', 'archived');

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

create unique index if not exists teams_name_lower_unique_idx on public.teams (lower(name));

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

create unique index if not exists players_pubg_name_lower_unique_idx on public.players (lower(pubg_name));

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
  requested_by uuid not null references public.users(id) on delete cascade,
  request_type text not null,
  payload jsonb not null default '{}'::jsonb,
  status public.request_status not null default 'pending',
  admin_note text,
  created_at timestamptz not null default timezone('utc', now()),
  reviewed_at timestamptz
);

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

create table if not exists public.settings (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.users add constraint users_team_id_fkey
  foreign key (team_id) references public.teams(id) on delete set null;

create or replace function public.current_user_role()
returns public.user_role
language sql
stable
as $$
  select coalesce(
    (select role from public.users where auth_user_id = auth.uid() limit 1),
    'viewer'::public.user_role
  );
$$;

create or replace function public.current_user_team_id()
returns uuid
language sql
stable
as $$
  select team_id from public.users where auth_user_id = auth.uid() limit 1;
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
alter table public.seasons enable row level security;
alter table public.days enable row level security;
alter table public.events enable row level security;
alter table public.teams enable row level security;
alter table public.players enable row level security;
alter table public.matches enable row level security;
alter table public.match_players enable row level security;
alter table public.match_results enable row level security;
alter table public.pending_imports enable row level security;
alter table public.import_logs enable row level security;
alter table public.roster_requests enable row level security;
alter table public.announcements enable row level security;
alter table public.sponsors enable row level security;
alter table public.videos enable row level security;
alter table public.settings enable row level security;

create policy "public read seasons" on public.seasons
for select using (true);

create policy "public read days" on public.days
for select using (true);

create policy "public read events" on public.events
for select using (true);

create policy "public read teams" on public.teams
for select using (true);

create policy "public read players" on public.players
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

create policy "admin manage all users" on public.users
for all using (public.is_admin_role())
with check (public.is_admin_role());

create policy "self read user profile" on public.users
for select using (auth.uid() = auth_user_id);

create policy "self update user profile" on public.users
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

create policy "admin manage teams" on public.teams
for all using (public.is_admin_role())
with check (public.is_admin_role());

create policy "admin manage players" on public.players
for all using (public.is_admin_role())
with check (public.is_admin_role());

create policy "admin manage matches" on public.matches
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

insert into storage.buckets (id, name, public)
values
  ('team-logos', 'team-logos', true),
  ('player-photos', 'player-photos', true),
  ('tournament-banners', 'tournament-banners', true),
  ('sponsor-logos', 'sponsor-logos', true),
  ('website-assets', 'website-assets', true)
on conflict (id) do nothing;

create policy "public read public storage buckets"
on storage.objects
for select
using (bucket_id in ('team-logos', 'player-photos', 'tournament-banners', 'sponsor-logos', 'website-assets'));

create policy "admin manage storage buckets"
on storage.objects
for all
using (
  bucket_id in ('team-logos', 'player-photos', 'tournament-banners', 'sponsor-logos', 'website-assets')
  and public.is_admin_role()
)
with check (
  bucket_id in ('team-logos', 'player-photos', 'tournament-banners', 'sponsor-logos', 'website-assets')
  and public.is_admin_role()
);

insert into public.teams (slot_number, name, short_name, description, status)
values
  (1, 'FYB Esports', 'FYB', 'Default Bravo slot team', 'active'),
  (2, 'Mandem', 'MANDEM', 'Default Bravo slot team', 'active'),
  (3, 'The Lost MC Esports', 'LMC', 'Default Bravo slot team', 'active'),
  (4, 'FYB FAN BOY', 'FYBFB', 'Default Bravo slot team', 'active'),
  (5, 'Omega Tactix', 'OTX', 'Default Bravo slot team', 'active'),
  (6, 'NPL', 'NPL', 'Default Bravo slot team', 'active'),
  (7, 'N3P', 'N3P', 'Default Bravo slot team', 'active'),
  (8, 'Team HAKU', 'HAKU', 'Default Bravo slot team', 'active'),
  (9, 'LootAddicts', 'LA', 'Default Bravo slot team', 'active'),
  (10, 'Mujuverse', 'MV', 'Default Bravo slot team', 'active'),
  (11, 'Lang Tang Gang (LTG)', 'LTG', 'Default Bravo slot team', 'active'),
  (12, 'Kaal', 'KAAL', 'Default Bravo slot team', 'active'),
  (13, 'Bir Gorkhali', 'BG', 'Default Bravo slot team', 'active'),
  (14, 'Illumaniti Gamers', 'IG', 'Default Bravo slot team', 'active'),
  (15, 'Sons', 'SONS', 'Default Bravo slot team', 'active'),
  (16, 'Ace', 'ACE', 'Default Bravo slot team', 'active'),
  (17, 'M8', 'M8', 'Default Bravo slot team', 'active'),
  (18, 'Arabpati Esports', 'AE', 'Default Bravo slot team', 'active'),
  (19, 'GedaGudi', 'GG', 'Default Bravo slot team', 'active'),
  (20, 'The Young Man', 'TYM', 'Default Bravo slot team', 'active'),
  (21, 'AIA (APEX IN ACTION)', 'AIA', 'Default Bravo slot team', 'active'),
  (22, 'Team 69', 'T69', 'Default Bravo slot team', 'active'),
  (23, 'Fam', 'FAM', 'Default Bravo slot team', 'active'),
  (24, 'Families', 'FAMILIES', 'Default Bravo slot team', 'active')
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

create trigger seasons_set_updated_at
before update on public.seasons
for each row execute function public.set_updated_at();

create trigger days_set_updated_at
before update on public.days
for each row execute function public.set_updated_at();

create trigger events_set_updated_at
before update on public.events
for each row execute function public.set_updated_at();

create trigger teams_set_updated_at
before update on public.teams
for each row execute function public.set_updated_at();

create trigger players_set_updated_at
before update on public.players
for each row execute function public.set_updated_at();

create trigger matches_set_updated_at
before update on public.matches
for each row execute function public.set_updated_at();

create trigger pending_imports_set_updated_at
before update on public.pending_imports
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
