-- Additive scoring decisions and immutable per-match ordering snapshots.
-- Review/apply only after a backup and explicit verification of the target project.
-- No historical scores/rules are recalculated. No new tables or relaxed RLS.
begin;

alter table public.matches add column if not exists scoring_rules jsonb not null default '{}'::jsonb;
alter table public.matches add constraint matches_scoring_rules_object check (jsonb_typeof(scoring_rules) = 'object');
alter table public.match_team_results
  add column if not exists damage numeric(14,2) not null default 0 check (damage >= 0),
  add column if not exists adjustment_points numeric(12,2) not null default 0,
  add column if not exists decision_reason text not null default '',
  add column if not exists disqualified boolean not null default false;
alter table public.match_team_results add constraint match_scoring_decision_valid check (
  abs(adjustment_points) <= 1000 and length(decision_reason) <= 500
  and ((adjustment_points = 0 and not disqualified) or length(btrim(decision_reason)) > 0)
  and (not disqualified or (adjustment_points = 0 and placement_points = 0 and kill_points = 0 and total_points = 0 and not wwcd))
);

-- The existing view casts decimal totals to integer. Recreate without CASCADE;
-- unknown downstream dependencies cause the whole transaction to fail safely.
drop view if exists public.standings;
drop view if exists public.season_standings;
drop view if exists public.alltime_standings;
drop view public.team_leaderboard;
alter table public.match_team_results alter column placement_points type numeric(12,2) using placement_points::numeric(12,2);
alter table public.match_player_results alter column placement_points type numeric(12,2) using placement_points::numeric(12,2);

grant select (scoring_rules) on public.matches to anon, authenticated;
grant select (damage, adjustment_points, decision_reason, disqualified) on public.match_team_results to anon, authenticated;
-- Existing explicit publication RLS and raw_json/identity restrictions remain.

create or replace view public.team_leaderboard
with (security_invoker = true) as
with published_matches as (
  select id, season_id, day_id, match_date
  from public.matches match_record
  where match_record.status = 'published'
    and match_record.published_at is not null
    and match_record.deleted_at is null
    and match_record.demo_seed_tag is null
    and exists (
      select 1
      from public.seasons season_record
      where season_record.id = match_record.season_id
        and season_record.status in ('active', 'completed')
        and season_record.demo_seed_tag is null
    )
    and (
      match_record.event_id is null
      or exists (
        select 1
        from public.events event_record
        where event_record.id = match_record.event_id
          and event_record.published
          and event_record.published_at is not null
          and event_record.deleted_at is null
          and event_record.demo_seed_tag is null
      )
    )
),
aggregated as (
  select
    mtr.team_id,
    t.name as team_name,
    coalesce(mtr.slot_number, t.slot_number) as slot_number,
    published_match.season_id,
    count(*)::int as matches_played,
    sum(case when mtr.wwcd then 1 else 0 end)::int as chicken_dinners,
    sum(mtr.kills)::int as total_kills,
    sum(mtr.placement_points)::numeric(14,2) as placement_points,
    sum(mtr.total_points)::numeric(14,2) as total_points,
    min(mtr.placement)::int as best_placement,
    max(published_match.match_date) as latest_match_date
  from public.match_team_results mtr
  join published_matches published_match on published_match.id = mtr.match_id
  join public.teams t
    on t.id = mtr.team_id
   and t.is_active
   and t.status = 'active'
   and t.deleted_at is null
   and t.demo_seed_tag is null
   and t.archived_at is null
   and t.merged_into_team_id is null
  where mtr.demo_seed_tag is null
  group by
    mtr.team_id,
    t.name,
    coalesce(mtr.slot_number, t.slot_number),
    published_match.season_id
)
select
  row_number() over (
    partition by season_id
    order by total_points desc, total_kills desc, best_placement asc, latest_match_date desc, team_name asc
  ) as rank,
  *
from aggregated;

create or replace view public.season_standings with (security_invoker = true) as
select
  season_id,
  team_id,
  team_name,
  rank,
  matches_played,
  chicken_dinners as wwcd,
  total_kills as kills,
  placement_points,
  total_points,
  best_placement,
  latest_match_date
from public.team_leaderboard;

create or replace view public.standings with (security_invoker = true) as
select *
from public.season_standings;

create or replace view public.alltime_standings with (security_invoker = true) as
select
  row_number() over (
    order by
      sum(total_points) desc,
      sum(total_kills) desc,
      min(best_placement) asc,
      max(latest_match_date) desc,
      team_name asc
  ) as rank,
  team_id,
  team_name,
  sum(matches_played)::int as matches_played,
  sum(chicken_dinners)::int as wwcd,
  sum(total_kills)::int as kills,
  sum(placement_points)::numeric(14,2) as placement_points,
  sum(total_points)::numeric(14,2) as total_points,
  min(best_placement)::int as best_placement,
  max(latest_match_date) as latest_match_date
from public.team_leaderboard
group by team_id, team_name;


create or replace view public.mvp_rankings
with (security_invoker = true) as
with published_matches as (
  select id, season_id, scoring_rules
  from public.matches match_record
  where match_record.status = 'published'
    and match_record.published_at is not null
    and match_record.deleted_at is null
    and match_record.demo_seed_tag is null
    and exists (
      select 1
      from public.seasons season_record
      where season_record.id = match_record.season_id
        and season_record.status in ('active', 'completed')
        and season_record.demo_seed_tag is null
    )
    and (
      match_record.event_id is null
      or exists (
        select 1
        from public.events event_record
        where event_record.id = match_record.event_id
          and event_record.published
          and event_record.published_at is not null
          and event_record.deleted_at is null
          and event_record.demo_seed_tag is null
      )
    )
),
match_mvps as (
  select
    published_match.season_id,
    mpr.player_id,
    coalesce(player_record.display_name, player_record.pubg_name, mpr.player_name) as player_name,
    mpr.team_id,
    team_record.name as team_name,
    mpr.kills,
    mpr.damage,
    mpr.assists,
    row_number() over (
      partition by mpr.match_id
      order by case when published_match.scoring_rules->>'version' = '2' then array(
        select case metric.value
          when 'kills' then mpr.kills::numeric
          when 'damage' then mpr.damage::numeric
          when 'assists' then mpr.assists::numeric
          when 'knocks' then mpr.knocks::numeric
          when 'survivalTime' then mpr.survival_time::numeric
          else 0::numeric end
        from jsonb_array_elements_text(
          case when published_match.scoring_rules->>'version' = '2'
            then published_match.scoring_rules->'awardCriteria'
            else '["kills","damage","assists"]'::jsonb end
        ) with ordinality metric(value, position)
        order by metric.position
      ) else array[mpr.total_points::numeric, mpr.kills::numeric, mpr.damage::numeric, mpr.assists::numeric] end desc,
      case when published_match.scoring_rules->>'version' is distinct from '2' then coalesce(player_record.display_name, player_record.pubg_name, mpr.player_name) end asc,
      coalesce(mpr.player_id::text, mpr.player_name) asc
    ) as match_mvp_rank
  from public.match_player_results mpr
  join published_matches published_match on published_match.id = mpr.match_id
  join public.players player_record
    on player_record.id = mpr.player_id
   and player_record.is_active
   and player_record.deleted_at is null
   and player_record.demo_seed_tag is null
  join public.teams team_record
    on team_record.id = mpr.team_id
   and team_record.is_active
   and team_record.status = 'active'
   and team_record.deleted_at is null
   and team_record.demo_seed_tag is null
   and team_record.archived_at is null
   and team_record.merged_into_team_id is null
  where mpr.demo_seed_tag is null
    and not exists (
      select 1 from public.match_team_results decision
      where decision.match_id = mpr.match_id and decision.disqualified
        and (decision.team_id = mpr.team_id or (decision.team_id is null and decision.team_name = mpr.team_name))
    )
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

grant select on public.team_leaderboard, public.season_standings, public.standings, public.alltime_standings, public.mvp_rankings to anon, authenticated, service_role;
notify pgrst, 'reload schema';
commit;
