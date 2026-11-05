-- Fail closed at the database boundary for public competition data.
-- This migration is intentionally idempotent and does not delete application data.

-- Keep automatic player/team linking disabled unless an authorized administrator
-- has explicitly reviewed and enabled it.
alter table private.player_team_link_settings
  alter column enabled set default false;

insert into private.player_team_link_settings (singleton, enabled)
values (true, false)
on conflict (singleton) do nothing;

update private.player_team_link_settings
set enabled = false,
    updated_at = now()
where singleton
  and enabled
  and updated_by is null;

-- Security-definer helpers resolve only the active project-local profile. Do
-- not fall back to the legacy users table: suspended or unreconciled rows must
-- never retain authorization power.
create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select profile.role
  from public.profiles profile
  where profile.auth_user_id = auth.uid()
    and profile.is_active
    and profile.role_source <> 'discord_sync'
  limit 1;
$$;

create or replace function public.current_user_team_id()
returns uuid
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select profile.team_id
  from public.profiles profile
  where profile.auth_user_id = auth.uid()
    and profile.is_active
    and profile.role_source <> 'discord_sync'
  limit 1;
$$;

alter function public.is_admin_role() set search_path = pg_catalog, public;
alter function public.is_team_role() set search_path = pg_catalog, public;
alter function public.ensure_active_scrim_season() set search_path = pg_catalog, public;
alter function public.create_next_day(uuid) set search_path = pg_catalog, public;

revoke all on function public.current_user_role() from public, anon, authenticated;
revoke all on function public.current_user_team_id() from public, anon, authenticated;
revoke all on function public.is_admin_role() from public, anon, authenticated;
revoke all on function public.is_team_role() from public, anon, authenticated;
revoke all on function public.ensure_active_scrim_season() from public, anon, authenticated;
revoke all on function public.create_next_day(uuid) from public, anon, authenticated;

grant execute on function public.current_user_role() to anon, authenticated, service_role;
grant execute on function public.current_user_team_id() to anon, authenticated, service_role;
grant execute on function public.is_admin_role() to anon, authenticated, service_role;
grant execute on function public.is_team_role() to anon, authenticated, service_role;
grant execute on function public.ensure_active_scrim_season() to service_role;
grant execute on function public.create_next_day(uuid) to service_role;

-- RLS cannot stop a self-service update from changing protected columns. Only
-- the display name is user-editable; role, team and activation remain
-- server-administered.
drop policy if exists "self update profile" on public.profiles;
create policy "self update profile" on public.profiles
for update
to authenticated
using (auth.uid() = auth_user_id and is_active)
with check (auth.uid() = auth_user_id and is_active);

revoke update on public.profiles from authenticated;
grant update (display_name) on public.profiles to authenticated;

drop policy if exists "self update user profile" on public.users;
revoke update on public.users from authenticated;

-- Relational team access remains unavailable to roles sourced from Discord.
-- Basic Discord authentication is independent of this authorization gate.
create or replace function public.current_user_has_active_team_membership(target_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.profiles profile
    join public.team_memberships membership on membership.profile_id = profile.id
    join public.teams team_record on team_record.id = membership.team_id
    where profile.auth_user_id = auth.uid()
      and profile.is_active
      and profile.role_source <> 'discord_sync'
      and profile.team_id = target_team_id
      and membership.team_id = target_team_id
      and membership.membership_status = 'active'
      and membership.membership_role = profile.role::text
      and team_record.is_active
      and team_record.status = 'active'
      and team_record.deleted_at is null
      and team_record.demo_seed_tag is null
      and team_record.archived_at is null
      and team_record.merged_into_team_id is null
  );
$$;

revoke all on function public.current_user_has_active_team_membership(uuid) from public, anon, authenticated;
grant execute on function public.current_user_has_active_team_membership(uuid) to authenticated, service_role;

drop policy if exists "igl create own team requests" on public.roster_requests;
drop policy if exists "team create own team requests" on public.roster_requests;
create policy "team create own team requests" on public.roster_requests
for insert
to authenticated
with check (
  public.is_team_role()
  and team_id = public.current_user_team_id()
  and public.current_user_has_active_team_membership(team_id)
  and requested_by in (select id from public.profiles where auth_user_id = auth.uid())
);

drop policy if exists "igl read own team requests" on public.roster_requests;
drop policy if exists "team read own team requests" on public.roster_requests;
create policy "team read own team requests" on public.roster_requests
for select
to authenticated
using (
  public.is_team_role()
  and team_id = public.current_user_team_id()
  and public.current_user_has_active_team_membership(team_id)
);

drop policy if exists "igl submit own team moss" on public.moss_submissions;
drop policy if exists "team submit own team moss" on public.moss_submissions;
create policy "team submit own team moss" on public.moss_submissions
for insert
to authenticated
with check (
  public.is_team_role()
  and team_id = public.current_user_team_id()
  and public.current_user_has_active_team_membership(team_id)
);

drop policy if exists "igl read own team moss" on public.moss_submissions;
drop policy if exists "team read own team moss" on public.moss_submissions;
create policy "team read own team moss" on public.moss_submissions
for select
to authenticated
using (
  public.is_team_role()
  and team_id = public.current_user_team_id()
  and public.current_user_has_active_team_membership(team_id)
);

drop policy if exists "igl read own team uploads" on public.uploads;
drop policy if exists "team read own team uploads" on public.uploads;
create policy "team read own team uploads" on public.uploads
for select
to authenticated
using (
  public.is_team_role()
  and related_type = 'team'
  and related_id = public.current_user_team_id()
  and public.current_user_has_active_team_membership(related_id)
);

drop policy if exists "igl create own team uploads" on public.uploads;
drop policy if exists "team create own team uploads" on public.uploads;
create policy "team create own team uploads" on public.uploads
for insert
to authenticated
with check (
  public.is_team_role()
  and related_type = 'team'
  and related_id = public.current_user_team_id()
  and public.current_user_has_active_team_membership(related_id)
  and uploaded_by in (select id from public.profiles where auth_user_id = auth.uid())
);

drop policy if exists "team read own registrations" on public.registrations;
create policy "team read own registrations" on public.registrations
for select
to authenticated
using (
  auth.uid() = submitted_by
  or (
    public.is_team_role()
    and team_id = public.current_user_team_id()
    and public.current_user_has_active_team_membership(team_id)
  )
);

drop policy if exists "team read own private storage" on storage.objects;
update storage.buckets
set public = false
where id in ('moss-files', 'private-team-documents', 'sensitive-review-files');

drop policy if exists "public read public storage buckets" on storage.objects;
create policy "public read public storage buckets"
on storage.objects
for select
to anon, authenticated
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

create policy "team read own private storage"
on storage.objects
for select
to authenticated
using (
  bucket_id in ('moss-files', 'private-team-documents')
  and public.is_team_role()
  and (storage.foldername(name))[1] = public.current_user_team_id()::text
  and public.current_user_has_active_team_membership(public.current_user_team_id())
);

drop policy if exists "team upload own private storage" on storage.objects;
create policy "team upload own private storage"
on storage.objects
for insert
to authenticated
with check (
  bucket_id in ('moss-files', 'private-team-documents')
  and public.is_team_role()
  and (storage.foldername(name))[1] = public.current_user_team_id()::text
  and public.current_user_has_active_team_membership(public.current_user_team_id())
);

-- Public rows must be explicitly publishable, non-demo, and non-deleted even
-- when queried outside the application service layer.
drop policy if exists "public read seasons" on public.seasons;
create policy "public read seasons" on public.seasons
for select
to anon, authenticated
using (
  status in ('active', 'completed')
  and demo_seed_tag is null
);

drop policy if exists "public read days" on public.days;
create policy "public read days" on public.days
for select
to anon, authenticated
using (
  status in ('active', 'completed')
  and demo_seed_tag is null
  and exists (
    select 1
    from public.seasons season_record
    where season_record.id = days.season_id
      and season_record.status in ('active', 'completed')
      and season_record.demo_seed_tag is null
  )
);

drop policy if exists "public read events" on public.events;
create policy "public read events" on public.events
for select
to anon, authenticated
using (
  published
  and published_at is not null
  and deleted_at is null
  and demo_seed_tag is null
  and (
    season_id is null
    or exists (
      select 1
      from public.seasons season_record
      where season_record.id = events.season_id
        and season_record.status in ('active', 'completed')
        and season_record.demo_seed_tag is null
    )
  )
);

drop policy if exists "public read teams" on public.teams;
create policy "public read teams" on public.teams
for select
to anon, authenticated
using (
  is_active
  and status = 'active'
  and archived_at is null
  and merged_into_team_id is null
  and deleted_at is null
  and demo_seed_tag is null
);

drop policy if exists "public read players" on public.players;
create policy "public read players" on public.players
for select
to anon, authenticated
using (
  is_active
  and deleted_at is null
  and demo_seed_tag is null
);

drop policy if exists "public read roster history" on public.team_roster_history;
create policy "public read roster history" on public.team_roster_history
for select
to anon, authenticated
using (
  demo_seed_tag is null
  and exists (
    select 1
    from public.teams team_record
    where team_record.id = team_roster_history.team_id
      and team_record.is_active
      and team_record.status = 'active'
      and team_record.archived_at is null
      and team_record.merged_into_team_id is null
      and team_record.deleted_at is null
      and team_record.demo_seed_tag is null
  )
  and exists (
    select 1
    from public.players player_record
    where player_record.id = team_roster_history.player_id
      and player_record.is_active
      and player_record.deleted_at is null
      and player_record.demo_seed_tag is null
  )
);

drop policy if exists "public read event teams" on public.event_teams;
create policy "public read event teams" on public.event_teams
for select
to anon, authenticated
using (
  demo_seed_tag is null
  and lower(status) in ('approved', 'confirmed', 'accepted')
  and exists (
    select 1
    from public.events event_record
    where event_record.id = event_teams.event_id
      and event_record.published
      and event_record.published_at is not null
      and event_record.deleted_at is null
      and event_record.demo_seed_tag is null
  )
  and exists (
    select 1
    from public.teams team_record
    where team_record.id = event_teams.team_id
      and team_record.is_active
      and team_record.status = 'active'
      and team_record.archived_at is null
      and team_record.merged_into_team_id is null
      and team_record.deleted_at is null
      and team_record.demo_seed_tag is null
  )
);

drop policy if exists "public read announcements" on public.announcements;
create policy "public read announcements" on public.announcements
for select
to anon, authenticated
using (status = 'published');

drop policy if exists "public read sponsors" on public.sponsors;
create policy "public read sponsors" on public.sponsors
for select
to anon, authenticated
using (
  status = 'published'
  and published
  and deleted_at is null
);

drop policy if exists "public read videos" on public.videos;
create policy "public read videos" on public.videos
for select
to anon, authenticated
using (
  status = 'published'
  and published
  and published_at is not null
  and deleted_at is null
);

drop policy if exists "public read approved matches" on public.matches;
drop policy if exists "public read published matches" on public.matches;
create policy "public read published matches" on public.matches
for select
to anon, authenticated
using (
  status = 'published'
  and published_at is not null
  and deleted_at is null
  and demo_seed_tag is null
  and exists (
    select 1
    from public.seasons season_record
    where season_record.id = matches.season_id
      and season_record.status in ('active', 'completed')
      and season_record.demo_seed_tag is null
  )
  and (
    event_id is null
    or exists (
      select 1
      from public.events event_record
      where event_record.id = matches.event_id
        and event_record.published
        and event_record.published_at is not null
        and event_record.deleted_at is null
        and event_record.demo_seed_tag is null
    )
  )
);

drop policy if exists "public read approved match results" on public.match_results;
drop policy if exists "public read published match results" on public.match_results;
create policy "public read published match results" on public.match_results
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.matches match_record
    where match_record.id = match_results.match_id
      and match_record.status = 'published'
      and match_record.published_at is not null
      and match_record.deleted_at is null
      and match_record.demo_seed_tag is null
  )
);

drop policy if exists "public read approved match players" on public.match_players;
drop policy if exists "public read published match players" on public.match_players;
create policy "public read published match players" on public.match_players
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.matches match_record
    where match_record.id = match_players.match_id
      and match_record.status = 'published'
      and match_record.published_at is not null
      and match_record.deleted_at is null
      and match_record.demo_seed_tag is null
  )
);

drop policy if exists "public read approved team results" on public.match_team_results;
drop policy if exists "public read published team results" on public.match_team_results;
create policy "public read published team results" on public.match_team_results
for select
to anon, authenticated
using (
  demo_seed_tag is null
  and exists (
    select 1
    from public.matches match_record
    where match_record.id = match_team_results.match_id
      and match_record.status = 'published'
      and match_record.published_at is not null
      and match_record.deleted_at is null
      and match_record.demo_seed_tag is null
  )
);

drop policy if exists "public read approved player results" on public.match_player_results;
drop policy if exists "public read published player results" on public.match_player_results;
create policy "public read published player results" on public.match_player_results
for select
to anon, authenticated
using (
  demo_seed_tag is null
  and exists (
    select 1
    from public.matches match_record
    where match_record.id = match_player_results.match_id
      and match_record.status = 'published'
      and match_record.published_at is not null
      and match_record.deleted_at is null
      and match_record.demo_seed_tag is null
  )
);

-- Only explicitly public settings may be read without an administrative role.
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

create or replace view public.site_settings
with (security_invoker = true) as
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

-- Keep internal identifiers and reconciliation metadata out of raw public
-- selects. Administrative application reads use the service role.
revoke select on table public.seasons from public, anon, authenticated;
revoke select (notes, current_event_id, archived_at) on table public.seasons from public, anon, authenticated;
grant select (
  id,
  name,
  type,
  status,
  start_date,
  end_date,
  current_day_number,
  created_at,
  updated_at,
  slug,
  series_title,
  season_number,
  configured_days,
  completed_at,
  ended_early,
  description,
  game,
  format,
  region,
  perspective,
  demo_seed_tag
) on table public.seasons to anon, authenticated;
grant all privileges on table public.seasons to service_role;

revoke select on table public.days from public, anon, authenticated;
grant select (
  id,
  season_id,
  day_number,
  name,
  status,
  date,
  created_at,
  updated_at,
  demo_seed_tag
) on table public.days to anon, authenticated;
grant all privileges on table public.days to service_role;

revoke select on table public.events from public, anon, authenticated;
revoke select (source_url) on table public.events from public, anon, authenticated;
grant select (
  id,
  season_id,
  title,
  event_type,
  game,
  status,
  description,
  banner_url,
  start_date,
  end_date,
  created_at,
  updated_at,
  name,
  slug,
  type,
  region,
  tier,
  competition_status,
  mode,
  perspective,
  prize_pool,
  rules,
  stream_url,
  discord_url,
  server,
  schedule,
  map_rotation,
  max_teams,
  team_count,
  season_day_number,
  match_count,
  published,
  published_at,
  deleted_at,
  point_system_id,
  demo_seed_tag,
  lifecycle_status,
  registration_status,
  result_status,
  registration_start,
  registration_end
) on table public.events to anon, authenticated;
grant all privileges on table public.events to service_role;

revoke select on table public.teams from public, anon, authenticated;
revoke select (
  normalized_name,
  source_metadata,
  primary_igl_profile_id,
  verification_status,
  discord_mapping_status
) on table public.teams from public, anon, authenticated;
grant select (
  id,
  slot_number,
  name,
  short_name,
  logo_url,
  description,
  status,
  created_at,
  updated_at,
  tag,
  region,
  is_active,
  slug,
  deleted_at,
  demo_seed_tag,
  archived_at,
  merged_into_team_id
) on table public.teams to anon, authenticated;
grant all privileges on table public.teams to service_role;

revoke select on table public.players from public, anon, authenticated;
revoke select (pubg_account_id) on table public.players from public, anon, authenticated;
grant select (
  id,
  pubg_name,
  display_name,
  current_team_id,
  photo_url,
  created_at,
  updated_at,
  avatar_url,
  is_active,
  slug,
  deleted_at,
  demo_seed_tag
) on table public.players to anon, authenticated;
grant all privileges on table public.players to service_role;

revoke select on table public.matches from public, anon, authenticated;
revoke select (raw_json, source_url, external_match_id) on table public.matches from public, anon, authenticated;
grant select (
  id,
  season_id,
  day_id,
  event_id,
  match_id,
  match_number,
  map,
  map_name,
  match_date,
  start_time,
  status,
  vod_url,
  data_source,
  scoreboard_image_url,
  result_image_url,
  screenshot_urls,
  published_at,
  point_system_id,
  created_at,
  updated_at,
  deleted_at,
  demo_seed_tag
) on table public.matches to anon, authenticated;
grant all privileges on table public.matches to service_role;

revoke select on table public.match_team_results from public, anon, authenticated;
grant select (
  id,
  match_id,
  team_id,
  team_name,
  slot_number,
  placement,
  wwcd,
  kills,
  placement_points,
  kill_points,
  total_points,
  created_at,
  updated_at,
  demo_seed_tag
) on table public.match_team_results to anon, authenticated;
grant all privileges on table public.match_team_results to service_role;

revoke select on table public.match_players from public, anon, authenticated;
revoke select (pubg_account_id) on table public.match_players from public, anon, authenticated;
grant select (
  id,
  match_id,
  season_id,
  day_id,
  player_id,
  player_name,
  team_id,
  slot_number,
  placement,
  kills,
  assists,
  damage,
  survival_time,
  created_at
) on table public.match_players to anon, authenticated;
grant all privileges on table public.match_players to service_role;

revoke select on table public.match_player_results from public, anon, authenticated;
revoke select (pubg_account_id, link_eligibility) on table public.match_player_results from public, anon, authenticated;
grant select (
  id,
  match_id,
  player_id,
  player_name,
  team_id,
  team_name,
  slot_number,
  placement,
  kills,
  damage,
  assists,
  knocks,
  survival_time,
  placement_points,
  total_points,
  created_at,
  updated_at,
  demo_seed_tag
) on table public.match_player_results to anon, authenticated;
grant all privileges on table public.match_player_results to service_role;

alter view public.user_profiles set (security_invoker = true);
revoke all privileges on table public.user_profiles from public, anon, authenticated;
grant select on table public.user_profiles to service_role;

revoke all privileges on table public.settings from public, anon, authenticated;
grant select on table public.settings to anon;
grant select, insert, update, delete on table public.settings to authenticated;
grant all privileges on table public.settings to service_role;

revoke all privileges on table public.site_settings from public, anon, authenticated;
grant select on table public.site_settings to anon, authenticated, service_role;

-- Standings and MVP data are calculated from explicitly published matches only.
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
    sum(mtr.placement_points)::int as placement_points,
    sum(mtr.total_points)::int as total_points,
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

create or replace view public.player_leaderboard
with (security_invoker = true) as
with published_matches as (
  select id, season_id, match_date
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
    mpr.player_id,
    coalesce(player_record.display_name, player_record.pubg_name, mpr.player_name) as player_name,
    null::text as pubg_account_id,
    mpr.team_id,
    team_record.name as team_name,
    coalesce(mpr.slot_number, team_record.slot_number) as slot_number,
    published_match.season_id,
    count(*)::int as matches_played,
    sum(mpr.kills)::int as total_kills,
    sum(mpr.damage)::numeric(12,2) as total_damage,
    sum(mpr.assists)::int as total_assists,
    max(published_match.match_date) as latest_match_date
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
  group by
    mpr.player_id,
    coalesce(player_record.display_name, player_record.pubg_name, mpr.player_name),
    mpr.team_id,
    team_record.name,
    coalesce(mpr.slot_number, team_record.slot_number),
    published_match.season_id
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
with published_matches as (
  select id, season_id
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
      order by
        mpr.total_points desc,
        mpr.kills desc,
        mpr.damage desc,
        mpr.assists desc,
        coalesce(player_record.display_name, player_record.pubg_name, mpr.player_name) asc
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

grant select on table
  public.team_leaderboard,
  public.player_leaderboard,
  public.top_fraggers,
  public.mvp_rankings
to anon, authenticated, service_role;

notify pgrst, 'reload schema';
