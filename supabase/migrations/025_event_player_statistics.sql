-- Store verified event-level player totals when the source does not publish
-- per-match player rows. This preserves honest aggregate statistics without
-- fabricating match-level data.

create table if not exists public.event_player_statistics (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  team_id uuid references public.teams(id) on delete set null,
  source_player_id text not null check (nullif(btrim(source_player_id), '') is not null),
  matches_played integer not null default 0 check (matches_played >= 0),
  kills integer not null default 0 check (kills >= 0),
  assists integer not null default 0 check (assists >= 0),
  knocks integer not null default 0 check (knocks >= 0),
  damage numeric(14, 2) not null default 0 check (damage >= 0),
  placement_points numeric(12, 2) not null default 0,
  total_points numeric(12, 2) not null default 0,
  best_placement integer check (best_placement is null or best_placement > 0),
  source_rank integer check (source_rank is null or source_rank > 0),
  source_provider text not null check (nullif(btrim(source_provider), '') is not null),
  source_updated_at timestamptz,
  demo_seed_tag text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (event_id, player_id)
);

create unique index if not exists event_player_statistics_source_player_unique_idx
  on public.event_player_statistics (event_id, source_player_id);

create index if not exists event_player_statistics_event_id_idx
  on public.event_player_statistics (event_id, source_rank);
create index if not exists event_player_statistics_player_id_idx
  on public.event_player_statistics (player_id);
create index if not exists event_player_statistics_team_id_idx
  on public.event_player_statistics (team_id);

drop trigger if exists event_player_statistics_set_updated_at on public.event_player_statistics;
create trigger event_player_statistics_set_updated_at
before update on public.event_player_statistics
for each row execute function public.set_updated_at();

alter table public.event_player_statistics enable row level security;

drop policy if exists "public read published event player statistics" on public.event_player_statistics;
create policy "public read published event player statistics"
on public.event_player_statistics
for select
to anon, authenticated
using (
  demo_seed_tag is null
  and exists (
    select 1
    from public.events event_record
    where event_record.id = event_player_statistics.event_id
      and event_record.published
      and event_record.published_at is not null
      and event_record.deleted_at is null
      and event_record.demo_seed_tag is null
      and (
        event_record.season_id is null
        or exists (
          select 1
          from public.seasons season_record
          where season_record.id = event_record.season_id
            and season_record.status in ('active', 'completed')
            and season_record.demo_seed_tag is null
        )
      )
  )
  and exists (
    select 1
    from public.players player_record
    where player_record.id = event_player_statistics.player_id
      and player_record.is_active
      and player_record.deleted_at is null
      and player_record.demo_seed_tag is null
  )
  and (
    event_player_statistics.team_id is null
    or exists (
      select 1
      from public.teams team_record
      where team_record.id = event_player_statistics.team_id
        and team_record.is_active
        and team_record.status = 'active'
        and team_record.archived_at is null
        and team_record.merged_into_team_id is null
        and team_record.deleted_at is null
        and team_record.demo_seed_tag is null
    )
    and exists (
      select 1
      from public.event_teams event_team_record
      where event_team_record.event_id = event_player_statistics.event_id
        and event_team_record.team_id = event_player_statistics.team_id
        and lower(event_team_record.status) in ('approved', 'confirmed', 'accepted')
        and event_team_record.demo_seed_tag is null
    )
  )
);

drop policy if exists "admins manage event player statistics" on public.event_player_statistics;
create policy "admins manage event player statistics"
on public.event_player_statistics
for all
to authenticated
using (public.is_admin_role())
with check (public.is_admin_role());

revoke all privileges on table public.event_player_statistics from public, anon, authenticated;
grant select (
  id,
  event_id,
  player_id,
  team_id,
  matches_played,
  kills,
  assists,
  knocks,
  damage,
  placement_points,
  total_points,
  best_placement,
  source_rank,
  source_provider,
  source_updated_at,
  created_at,
  updated_at
) on table public.event_player_statistics to anon, authenticated;
grant insert, update, delete on table public.event_player_statistics to authenticated;
grant all privileges on table public.event_player_statistics to service_role;

notify pgrst, 'reload schema';
