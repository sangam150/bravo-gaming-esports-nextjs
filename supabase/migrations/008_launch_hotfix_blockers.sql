create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role::text::public.user_role from public.profiles where auth_user_id = auth.uid() limit 1),
    (select role::text::public.user_role from public.users where auth_user_id = auth.uid() limit 1),
    'viewer'::public.user_role
  );
$$;

create or replace function public.current_user_team_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select team_id from public.profiles where auth_user_id = auth.uid() limit 1),
    (select team_id from public.users where auth_user_id = auth.uid() limit 1)
  );
$$;

create or replace function public.parse_optional_timestamptz(value text)
returns timestamptz
language plpgsql
stable
as $$
begin
  if value is null or btrim(value) = '' then
    return null;
  end if;

  return value::timestamptz;
exception
  when others then
    return null;
end;
$$;

create or replace function public.jsonb_flag_true_by_default(payload jsonb, key text)
returns boolean
language sql
immutable
as $$
  select coalesce(
    case
      when payload ? key and lower(coalesce(payload ->> key, '')) in ('true', 'false')
        then lower(payload ->> key) = 'true'
      else null
    end,
    true
  );
$$;

create or replace function public.is_public_app_document(collection_name text, payload jsonb)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when payload is null then false
    when nullif(trim(coalesce(payload ->> 'deletedAt', '')), '') is not null then false
    when collection_name in ('registrations', 'uploads', 'pubgImportBatches', 'pubgImportWatchers', 'errorLogs', 'contactMessages') then false
    when collection_name = 'newsArticles' then
      case
        when coalesce(lower(payload ->> 'state'), 'draft') = 'published' then true
        when coalesce(lower(payload ->> 'state'), 'draft') = 'scheduled'
          and public.parse_optional_timestamptz(payload ->> 'publishAt') <= now() then true
        else false
      end
    when collection_name in ('announcements', 'videos', 'sponsors', 'platformGames', 'platformEvents') then
      public.jsonb_flag_true_by_default(payload, 'published')
    when collection_name in (
      'homepageContent',
      'siteStats',
      'streams',
      'seasons',
      'tournaments',
      'standings',
      'matches',
      'teams',
      'players',
      'tournamentMatches',
      'scrims',
      'matchResults',
      'matchPlayers',
      'pubgMatches',
      'pubgPlayers'
    ) then
      public.jsonb_flag_true_by_default(payload, 'published')
      and coalesce(lower(payload ->> 'status'), 'published') not in ('draft', 'pending', 'private')
      and coalesce(lower(payload ->> 'state'), 'published') not in ('draft', 'private')
    else false
  end;
$$;

drop policy if exists "public read app documents" on public.app_documents;
create policy "public read app documents" on public.app_documents
for select using (public.is_public_app_document(collection_name, data));
