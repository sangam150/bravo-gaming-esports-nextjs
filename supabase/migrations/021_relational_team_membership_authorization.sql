-- Defense-in-depth: private team access requires both the profile team UUID and
-- an approved active relational membership for that same UUID.

create or replace function public.current_user_has_active_team_membership(target_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.profiles profile
    join public.team_memberships membership on membership.profile_id = profile.id
    join public.teams team_record on team_record.id = membership.team_id
    where profile.auth_user_id = auth.uid()
      and profile.is_active
      and profile.team_id = target_team_id
      and membership.team_id = target_team_id
      and membership.membership_status = 'active'
      and membership.membership_role = profile.role::text
      and team_record.is_active
      and team_record.deleted_at is null
      and team_record.merged_into_team_id is null
  );
$$;

revoke all on function public.current_user_has_active_team_membership(uuid) from public;
grant execute on function public.current_user_has_active_team_membership(uuid) to authenticated;
grant execute on function public.current_user_has_active_team_membership(uuid) to service_role;

drop policy if exists "team create own team requests" on public.roster_requests;
create policy "team create own team requests" on public.roster_requests
for insert with check (
  public.is_team_role()
  and team_id = public.current_user_team_id()
  and public.current_user_has_active_team_membership(team_id)
  and requested_by in (select id from public.profiles where auth_user_id = auth.uid())
);

drop policy if exists "team read own team requests" on public.roster_requests;
create policy "team read own team requests" on public.roster_requests
for select using (
  public.is_team_role()
  and team_id = public.current_user_team_id()
  and public.current_user_has_active_team_membership(team_id)
);

drop policy if exists "team submit own team moss" on public.moss_submissions;
create policy "team submit own team moss" on public.moss_submissions
for insert with check (
  public.is_team_role()
  and team_id = public.current_user_team_id()
  and public.current_user_has_active_team_membership(team_id)
);

drop policy if exists "team read own team moss" on public.moss_submissions;
create policy "team read own team moss" on public.moss_submissions
for select using (
  public.is_team_role()
  and team_id = public.current_user_team_id()
  and public.current_user_has_active_team_membership(team_id)
);

drop policy if exists "team read own team uploads" on public.uploads;
create policy "team read own team uploads" on public.uploads
for select using (
  public.is_team_role()
  and related_type = 'team'
  and related_id = public.current_user_team_id()
  and public.current_user_has_active_team_membership(related_id)
);

drop policy if exists "team create own team uploads" on public.uploads;
create policy "team create own team uploads" on public.uploads
for insert with check (
  public.is_team_role()
  and related_type = 'team'
  and related_id = public.current_user_team_id()
  and public.current_user_has_active_team_membership(related_id)
  and uploaded_by in (select id from public.profiles where auth_user_id = auth.uid())
);

drop policy if exists "team read own registrations" on public.registrations;
create policy "team read own registrations" on public.registrations
for select using (
  auth.uid() = submitted_by
  or (
    public.is_team_role()
    and team_id = public.current_user_team_id()
    and public.current_user_has_active_team_membership(team_id)
  )
);

drop policy if exists "team read own private storage" on storage.objects;
create policy "team read own private storage"
on storage.objects
for select
using (
  bucket_id in ('moss-files', 'private-team-documents')
  and public.is_team_role()
  and (storage.foldername(name))[1] = public.current_user_team_id()::text
  and public.current_user_has_active_team_membership(((storage.foldername(name))[1])::uuid)
);

drop policy if exists "team upload own private storage" on storage.objects;
create policy "team upload own private storage"
on storage.objects
for insert
with check (
  bucket_id in ('moss-files', 'private-team-documents')
  and public.is_team_role()
  and (storage.foldername(name))[1] = public.current_user_team_id()::text
  and public.current_user_has_active_team_membership(((storage.foldername(name))[1])::uuid)
);
