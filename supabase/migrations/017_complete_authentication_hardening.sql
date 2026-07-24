-- Trusted authentication profile provisioning and role-escalation hardening.

alter table public.profiles
  add column if not exists is_active boolean not null default true;

alter table public.profiles
  drop constraint if exists profiles_auth_user_id_fkey;

alter table public.profiles
  add constraint profiles_auth_user_id_fkey
  foreign key (auth_user_id) references auth.users(id) on delete cascade;

create or replace function public.provision_auth_user_profile()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  normalized_email text;
begin
  normalized_email := lower(nullif(trim(new.email), ''));
  if normalized_email is null then
    raise exception using
      errcode = '23502',
      message = 'An email address is required to provision an application profile.';
  end if;

  insert into public.profiles (
    auth_user_id,
    email,
    display_name,
    role,
    is_active,
    created_at,
    updated_at
  )
  values (
    new.id,
    normalized_email,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'name')), ''),
    'viewer',
    true,
    timezone('utc', now()),
    timezone('utc', now())
  )
  on conflict (auth_user_id) do update
    set email = excluded.email,
        display_name = coalesce(public.profiles.display_name, excluded.display_name),
        updated_at = timezone('utc', now());

  return new;
end;
$$;

revoke all on function public.provision_auth_user_profile() from public, anon, authenticated;

drop trigger if exists provision_auth_user_profile_after_insert on auth.users;
create trigger provision_auth_user_profile_after_insert
after insert on auth.users
for each row execute function public.provision_auth_user_profile();

-- Backfill any users created before this trigger without changing approved roles.
insert into public.profiles (
  auth_user_id,
  email,
  display_name,
  role,
  is_active,
  created_at,
  updated_at
)
select
  auth_user.id,
  lower(auth_user.email),
  nullif(trim(coalesce(auth_user.raw_user_meta_data ->> 'display_name', auth_user.raw_user_meta_data ->> 'name')), ''),
  'viewer',
  true,
  timezone('utc', now()),
  timezone('utc', now())
from auth.users auth_user
where auth_user.email is not null
on conflict (auth_user_id) do nothing;

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
  limit 1;
$$;

drop policy if exists "self update profile" on public.profiles;
create policy "self update profile" on public.profiles
for update
using (auth.uid() = auth_user_id and is_active)
with check (auth.uid() = auth_user_id and is_active);

-- RLS alone cannot prevent a user changing protected columns in their own row.
revoke update on public.profiles from authenticated;
grant update (display_name) on public.profiles to authenticated;

drop policy if exists "self update user profile" on public.users;
revoke update on public.users from authenticated;

notify pgrst, 'reload schema';
