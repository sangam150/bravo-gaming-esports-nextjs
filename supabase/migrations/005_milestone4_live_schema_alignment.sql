create extension if not exists pgcrypto;

alter table public.profiles add column if not exists display_name text;
alter table public.profiles add column if not exists auth_user_id uuid;
alter table public.profiles alter column id set default gen_random_uuid();
alter table public.profiles alter column role set default 'viewer';
alter table public.profiles alter column created_at set default timezone('utc', now());
alter table public.profiles alter column updated_at set default timezone('utc', now());

update public.profiles p
set auth_user_id = p.id
where p.auth_user_id is null
  and exists (select 1 from auth.users u where u.id = p.id);

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'full_name'
  ) then
    update public.profiles
    set display_name = coalesce(display_name, full_name)
    where display_name is null
      and full_name is not null;
  end if;
end $$;

do $$
begin
  if not exists (select 1 from public.profiles where auth_user_id is null) then
    alter table public.profiles alter column auth_user_id set not null;
  end if;
end $$;

create unique index if not exists profiles_auth_user_id_unique_idx
on public.profiles (auth_user_id)
where auth_user_id is not null;

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

update public.seasons
set slug = coalesce(slug, lower(trim(both '-' from regexp_replace(name, '[^a-z0-9]+', '-', 'gi')))),
    series_title = coalesce(series_title, name)
where slug is null
   or series_title is null;

create unique index if not exists seasons_slug_unique_idx on public.seasons (slug) where slug is not null;

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

update public.events
set name = coalesce(name, title),
    slug = coalesce(slug, lower(trim(both '-' from regexp_replace(coalesce(name, title), '[^a-z0-9]+', '-', 'gi')))),
    competition_status = coalesce(
      competition_status,
      case
        when status = 'completed' then 'COMPLETED'
        when status = 'active' then 'LIVE'
        else 'UPCOMING'
      end
    ),
    map_rotation = coalesce(map_rotation, '[]'::jsonb),
    published_at = case
      when published then coalesce(published_at, updated_at)
      else published_at
    end
where name is null
   or slug is null
   or competition_status is null
   or map_rotation is null
   or (published and published_at is null);

create unique index if not exists events_slug_unique_idx on public.events (slug);
create index if not exists events_status_idx on public.events (status);
create index if not exists events_published_idx on public.events (published);
create index if not exists events_published_at_idx on public.events (published_at desc);
create index if not exists events_deleted_at_idx on public.events (deleted_at);
create index if not exists events_point_system_id_idx on public.events (point_system_id);

alter table public.seasons add column if not exists current_event_id uuid references public.events(id) on delete set null;

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

update public.matches
set map_name = coalesce(map_name, map),
    start_time = coalesce(start_time, match_date),
    data_source = coalesce(nullif(data_source, ''), 'manual'),
    published_at = case
      when status in ('approved', 'published') then coalesce(published_at, updated_at)
      else published_at
    end
where map_name is null
   or start_time is null
   or data_source is null
   or (published_at is null and status in ('approved', 'published'));

create index if not exists matches_status_idx on public.matches (status);
create index if not exists matches_event_id_idx on public.matches (event_id);
create index if not exists matches_published_at_idx on public.matches (published_at desc);
create index if not exists matches_deleted_at_idx on public.matches (deleted_at);
create index if not exists matches_point_system_id_idx on public.matches (point_system_id);

alter table public.match_team_results alter column team_id drop not null;
alter table public.match_team_results add column if not exists team_name text;
alter table public.match_team_results add column if not exists slot_number integer;
alter table public.match_team_results alter column kill_points type numeric(10,2) using kill_points::numeric(10,2);
alter table public.match_team_results alter column total_points type numeric(10,2) using total_points::numeric(10,2);
alter table public.match_team_results alter column kill_points set default 0;
alter table public.match_team_results alter column total_points set default 0;

update public.match_team_results mtr
set team_name = coalesce(mtr.team_name, t.name),
    slot_number = coalesce(mtr.slot_number, t.slot_number)
from public.teams t
where mtr.team_id = t.id
  and (mtr.team_name is null or mtr.slot_number is null);

alter table public.match_player_results alter column player_id drop not null;
alter table public.match_player_results add column if not exists player_name text;
alter table public.match_player_results add column if not exists pubg_account_id text;
alter table public.match_player_results add column if not exists team_name text;
alter table public.match_player_results add column if not exists slot_number integer;
alter table public.match_player_results add column if not exists placement integer not null default 0;
alter table public.match_player_results add column if not exists placement_points integer not null default 0;
alter table public.match_player_results add column if not exists total_points numeric(10,2) not null default 0;
alter table public.match_player_results alter column total_points type numeric(10,2) using total_points::numeric(10,2);
alter table public.match_player_results alter column total_points set default 0;

update public.match_player_results mpr
set player_name = coalesce(mpr.player_name, p.display_name, p.pubg_name),
    pubg_account_id = coalesce(mpr.pubg_account_id, p.pubg_account_id)
from public.players p
where mpr.player_id = p.id
  and (mpr.player_name is null or mpr.pubg_account_id is null);

update public.match_player_results mpr
set team_name = coalesce(mpr.team_name, t.name),
    slot_number = coalesce(mpr.slot_number, t.slot_number)
from public.teams t
where mpr.team_id = t.id
  and (mpr.team_name is null or mpr.slot_number is null);

update public.match_player_results mpr
set placement = mtr.placement,
    placement_points = mtr.placement_points
from public.match_team_results mtr
where mpr.match_id = mtr.match_id
  and (
    mpr.team_id = mtr.team_id
    or (
      mpr.team_id is null
      and mpr.team_name is not distinct from mtr.team_name
    )
  )
  and (mpr.placement = 0 or mpr.placement_points = 0);

update public.match_player_results
set total_points = round((coalesce(placement_points, 0) + coalesce(kills, 0))::numeric, 2)
where total_points = 0
  and (placement_points <> 0 or kills <> 0);

create unique index if not exists point_systems_name_lower_unique_idx on public.point_systems (lower(name));
create index if not exists point_systems_game_active_idx on public.point_systems (game, active) where deleted_at is null;

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

alter table public.audit_logs enable row level security;

drop policy if exists "admin read audit logs" on public.audit_logs;
create policy "admin read audit logs" on public.audit_logs
for select using (public.is_admin_role());

create or replace view public.team_leaderboard as
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

create or replace view public.player_leaderboard as
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

create or replace view public.top_fraggers as
select *
from public.player_leaderboard;

create or replace view public.mvp_rankings as
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
