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
select
  id,
  key,
  value,
  updated_at
from public.settings
where key in (
  'youtube_channel_id',
  'youtube_channel_url',
  'youtube_live_fallback_url',
  'discord_invite_url'
);

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

alter view public.user_profiles set (security_invoker = true);
alter view public.season_days set (security_invoker = true);
alter view public.media set (security_invoker = true);
alter view public.site_settings set (security_invoker = true);
alter view public.homepage_content set (security_invoker = true);
alter view public.contact_messages set (security_invoker = true);
alter view public.news_articles set (security_invoker = true);
alter view public.season_standings set (security_invoker = true);
alter view public.standings set (security_invoker = true);
alter view public.player_season_stats set (security_invoker = true);
alter view public.alltime_standings set (security_invoker = true);

alter table public.settings enable row level security;
drop policy if exists "public read settings" on public.settings;
drop policy if exists "public read allowlisted settings" on public.settings;
create policy "public read allowlisted settings" on public.settings
for select
to anon, authenticated
using (
  key in (
    'youtube_channel_id',
    'youtube_channel_url',
    'youtube_live_fallback_url',
    'discord_invite_url'
  )
);

revoke all privileges on table public.settings from public, anon, authenticated;
grant select on table public.settings to anon;
grant select, insert, update, delete on table public.settings to authenticated;
grant all privileges on table public.settings to service_role;

revoke all privileges on table public.user_profiles from public, anon, authenticated;
grant select on table public.user_profiles to service_role;

revoke all privileges on table
  public.homepage_content,
  public.contact_messages,
  public.news_articles
from public, anon, authenticated;

grant select on table
  public.homepage_content,
  public.contact_messages,
  public.news_articles
to authenticated, service_role;

revoke all privileges on table public.site_settings from public, anon, authenticated;
grant select on table public.site_settings to anon, authenticated, service_role;

insert into storage.buckets (id, name, public)
values
  ('player-photos', 'player-photos', true),
  ('sponsor-assets', 'sponsor-assets', true),
  ('news-images', 'news-images', true),
  ('media-assets', 'media-assets', true),
  ('media-uploads', 'media-uploads', true),
  ('scoreboard-images', 'scoreboard-images', true),
  ('match-media', 'match-media', true),
  ('posters', 'posters', true),
  ('hero-slides', 'hero-slides', true)
on conflict (id) do nothing;

update storage.buckets
set public = false
where id in ('moss-files', 'private-team-documents', 'sensitive-review-files');

drop policy if exists "public read public storage buckets" on storage.objects;
drop policy if exists "admin manage storage buckets" on storage.objects;

create policy "public read public storage buckets"
on storage.objects
for select
using (
  bucket_id in (
    'team-logos',
    'player-avatars',
    'player-photos',
    'event-banners',
    'sponsor-logos',
    'sponsor-assets',
    'result-screenshots',
    'scoreboard-images',
    'match-media',
    'media-assets',
    'media-uploads',
    'hero-slides',
    'news-images',
    'posters',
    'stream-assets'
  )
);

create policy "admin manage storage buckets"
on storage.objects
for all
using (
  bucket_id in (
    'team-logos',
    'player-avatars',
    'player-photos',
    'event-banners',
    'sponsor-logos',
    'sponsor-assets',
    'result-screenshots',
    'scoreboard-images',
    'match-media',
    'media-assets',
    'media-uploads',
    'hero-slides',
    'news-images',
    'posters',
    'moss-files',
    'private-team-documents',
    'sensitive-review-files',
    'stream-assets'
  )
  and public.is_admin_role()
)
with check (
  bucket_id in (
    'team-logos',
    'player-avatars',
    'player-photos',
    'event-banners',
    'sponsor-logos',
    'sponsor-assets',
    'result-screenshots',
    'scoreboard-images',
    'match-media',
    'media-assets',
    'media-uploads',
    'hero-slides',
    'news-images',
    'posters',
    'moss-files',
    'private-team-documents',
    'sensitive-review-files',
    'stream-assets'
  )
  and public.is_admin_role()
);

notify pgrst, 'reload schema';
