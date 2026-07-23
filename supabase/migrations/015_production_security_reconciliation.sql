-- Production reconciliation hardening.
-- Apply only after migrations 001-014. This migration is intentionally
-- non-destructive and can be rerun safely.

alter type public.user_role add value if not exists 'organizer';
alter type public.user_role add value if not exists 'team_manager';
alter type public.user_role add value if not exists 'coach';

create or replace function public.is_admin_role()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_role()::text in ('super_admin', 'admin', 'organizer');
$$;

create or replace function public.is_team_role()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_role()::text in ('team_igl', 'team_manager', 'coach');
$$;

alter table public.events
  add column if not exists lifecycle_status text not null default 'draft'
    check (lifecycle_status in (
      'draft',
      'scheduled',
      'ongoing',
      'completed',
      'cancelled',
      'archived'
    )),
  add column if not exists registration_status text not null default 'closed'
    check (registration_status in ('open', 'closed')),
  add column if not exists result_status text not null default 'pending'
    check (result_status in ('pending', 'published')),
  add column if not exists stream_status text not null default 'offline'
    check (stream_status in ('offline', 'scheduled', 'live', 'ended')),
  add column if not exists registration_start timestamptz,
  add column if not exists registration_end timestamptz,
  add column if not exists registration_override boolean;

create index if not exists events_lifecycle_status_idx
  on public.events (lifecycle_status)
  where deleted_at is null;
create index if not exists events_registration_status_idx
  on public.events (registration_status, registration_start, registration_end)
  where deleted_at is null;
create index if not exists events_result_status_idx
  on public.events (result_status, published_at desc)
  where deleted_at is null;

drop policy if exists "public read seasons" on public.seasons;
create policy "public read seasons" on public.seasons
for select using (
  status in ('active', 'completed', 'archived')
  and demo_seed_tag is null
);

drop policy if exists "public read days" on public.days;
create policy "public read days" on public.days
for select using (
  status in ('active', 'completed')
  and demo_seed_tag is null
);

drop policy if exists "public read events" on public.events;
create policy "public read events" on public.events
for select using (
  coalesce(published, false)
  and published_at is not null
  and deleted_at is null
  and demo_seed_tag is null
);

drop policy if exists "public read teams" on public.teams;
create policy "public read teams" on public.teams
for select using (
  is_active
  and deleted_at is null
  and demo_seed_tag is null
  and lower(status) in ('active', 'approved', 'published')
);

drop policy if exists "public read players" on public.players;
create policy "public read players" on public.players
for select using (
  is_active
  and deleted_at is null
  and demo_seed_tag is null
);

drop policy if exists "public read event teams" on public.event_teams;
create policy "public read event teams" on public.event_teams
for select using (
  demo_seed_tag is null
  and exists (
    select 1
    from public.events event_record
    where event_record.id = event_teams.event_id
      and coalesce(event_record.published, false)
      and event_record.published_at is not null
      and event_record.deleted_at is null
      and event_record.demo_seed_tag is null
  )
);

drop policy if exists "public read roster history" on public.team_roster_history;
create policy "public read roster history" on public.team_roster_history
for select using (
  demo_seed_tag is null
  and exists (
    select 1
    from public.teams team_record
    where team_record.id = team_roster_history.team_id
      and team_record.is_active
      and team_record.deleted_at is null
      and team_record.demo_seed_tag is null
  )
);

drop policy if exists "igl create own team requests" on public.roster_requests;
drop policy if exists "team create own team requests" on public.roster_requests;
create policy "team create own team requests" on public.roster_requests
for insert with check (
  public.is_team_role()
  and team_id = public.current_user_team_id()
  and requested_by in (
    select id from public.profiles where auth_user_id = auth.uid()
  )
);

drop policy if exists "igl read own team requests" on public.roster_requests;
drop policy if exists "team read own team requests" on public.roster_requests;
create policy "team read own team requests" on public.roster_requests
for select using (
  public.is_team_role()
  and team_id = public.current_user_team_id()
);

drop policy if exists "igl submit own team moss" on public.moss_submissions;
drop policy if exists "team submit own team moss" on public.moss_submissions;
create policy "team submit own team moss" on public.moss_submissions
for insert with check (
  public.is_team_role()
  and team_id = public.current_user_team_id()
);

drop policy if exists "igl read own team moss" on public.moss_submissions;
drop policy if exists "team read own team moss" on public.moss_submissions;
create policy "team read own team moss" on public.moss_submissions
for select using (
  public.is_team_role()
  and team_id = public.current_user_team_id()
);

drop policy if exists "igl read own team uploads" on public.uploads;
drop policy if exists "team read own team uploads" on public.uploads;
create policy "team read own team uploads" on public.uploads
for select using (
  public.is_team_role()
  and related_type = 'team'
  and related_id = public.current_user_team_id()
);

drop policy if exists "igl create own team uploads" on public.uploads;
drop policy if exists "team create own team uploads" on public.uploads;
create policy "team create own team uploads" on public.uploads
for insert with check (
  public.is_team_role()
  and related_type = 'team'
  and related_id = public.current_user_team_id()
  and uploaded_by in (
    select id from public.profiles where auth_user_id = auth.uid()
  )
);

update storage.buckets
set public = false
where id = 'moss-files';

insert into storage.buckets (id, name, public)
values
  ('sensitive-review-files', 'sensitive-review-files', false),
  ('private-team-documents', 'private-team-documents', false)
on conflict (id) do update set public = excluded.public;

drop policy if exists "public read public storage buckets" on storage.objects;
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

drop policy if exists "admin manage storage buckets" on storage.objects;
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
    'stream-assets',
    'moss-files',
    'sensitive-review-files',
    'private-team-documents'
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
    'stream-assets',
    'moss-files',
    'sensitive-review-files',
    'private-team-documents'
  )
  and public.is_admin_role()
);

drop policy if exists "team read own private storage" on storage.objects;
create policy "team read own private storage"
on storage.objects
for select
using (
  bucket_id in ('moss-files', 'private-team-documents')
  and public.is_team_role()
  and (storage.foldername(name))[1] = public.current_user_team_id()::text
);

drop policy if exists "team upload own private storage" on storage.objects;
create policy "team upload own private storage"
on storage.objects
for insert
with check (
  bucket_id in ('moss-files', 'private-team-documents')
  and public.is_team_role()
  and (storage.foldername(name))[1] = public.current_user_team_id()::text
);

create table if not exists public.registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete restrict,
  team_id uuid references public.teams(id) on delete set null,
  submitted_by uuid references auth.users(id) on delete set null,
  team_name text not null,
  team_tag text,
  contact_name text not null,
  contact_email text,
  contact_discord text not null,
  player_igns jsonb not null default '[]'::jsonb,
  logo_upload_id uuid references public.uploads(id) on delete set null,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'changes_requested', 'withdrawn')),
  reference_code text not null unique,
  review_note text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz
);

create index if not exists registrations_event_id_idx on public.registrations (event_id);
create index if not exists registrations_team_id_idx on public.registrations (team_id);
create index if not exists registrations_status_created_at_idx
  on public.registrations (status, created_at desc)
  where deleted_at is null;
create unique index if not exists registrations_active_event_team_name_idx
  on public.registrations (event_id, lower(team_name))
  where deleted_at is null and status in ('pending', 'approved', 'changes_requested');

alter table public.registrations enable row level security;

drop policy if exists "admin manage registrations" on public.registrations;
create policy "admin manage registrations" on public.registrations
for all using (public.is_admin_role())
with check (public.is_admin_role());

drop policy if exists "team read own registrations" on public.registrations;
create policy "team read own registrations" on public.registrations
for select using (
  auth.uid() = submitted_by
  or (
    public.is_team_role()
    and team_id = public.current_user_team_id()
  )
);

drop policy if exists "authenticated create registrations" on public.registrations;
create policy "authenticated create registrations" on public.registrations
for insert to authenticated
with check (
  auth.uid() = submitted_by
  and status = 'pending'
  and deleted_at is null
  and (
    event_id is null
    or exists (
      select 1
      from public.events event_record
      where event_record.id = registrations.event_id
        and coalesce(event_record.published, false)
        and event_record.deleted_at is null
        and event_record.demo_seed_tag is null
        and event_record.registration_status = 'open'
        and now() between event_record.registration_start and event_record.registration_end
    )
  )
);

drop trigger if exists registrations_set_updated_at on public.registrations;
create trigger registrations_set_updated_at
before update on public.registrations
for each row execute function public.set_updated_at();

notify pgrst, 'reload schema';
