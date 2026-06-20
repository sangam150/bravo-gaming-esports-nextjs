-- Compatibility views and readiness recovery helpers.

create or replace view public.user_profiles as
select *
from public.profiles;

create or replace view public.season_days as
select *
from public.days;

create or replace view public.media as
select *
from public.videos;

create or replace view public.site_settings as
select *
from public.settings;

create or replace view public.homepage_content as
select
  id,
  data,
  created_at,
  updated_at
from public.app_documents
where collection_name = 'homepageContent';

create or replace view public.contact_messages as
select
  id,
  data,
  created_at,
  updated_at
from public.app_documents
where collection_name = 'contactMessages';

create or replace view public.news_articles as
select
  id,
  data,
  created_at,
  updated_at
from public.app_documents
where collection_name = 'newsArticles';

create or replace view public.season_standings as
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

create or replace view public.standings as
select *
from public.season_standings;

create or replace view public.player_season_stats as
select
  season_id,
  player_id,
  player_name,
  team_id,
  team_name,
  rank,
  matches_played,
  total_kills,
  total_assists,
  total_damage,
  case
    when matches_played > 0 then round(total_kills::numeric / matches_played, 2)
    else 0
  end as avg_kills,
  case
    when matches_played > 0 then round(total_damage / matches_played, 2)
    else 0
  end as avg_damage
from public.player_leaderboard;

create or replace view public.alltime_standings as
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
  sum(placement_points)::int as placement_points,
  sum(total_points)::int as total_points,
  min(best_placement)::int as best_placement,
  max(latest_match_date) as latest_match_date
from public.team_leaderboard
group by team_id, team_name;
