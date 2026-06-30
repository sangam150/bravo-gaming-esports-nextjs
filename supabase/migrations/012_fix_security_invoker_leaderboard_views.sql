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
  group by
    mtr.team_id,
    coalesce(t.name, mtr.team_name, format('Team Slot %s', mtr.slot_number)),
    coalesce(mtr.slot_number, t.slot_number),
    am.season_id
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
  group by
    mpr.player_id,
    coalesce(p.display_name, p.pubg_name, mpr.player_name),
    coalesce(p.pubg_account_id, mpr.pubg_account_id),
    mpr.team_id,
    coalesce(t.name, mpr.team_name, format('Team Slot %s', mpr.slot_number)),
    coalesce(mpr.slot_number, t.slot_number),
    am.season_id
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
      order by
        mpr.total_points desc,
        mpr.kills desc,
        mpr.damage desc,
        mpr.assists desc,
        coalesce(p.display_name, p.pubg_name, mpr.player_name) asc
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
