alter type public.user_role add value if not exists 'player';

alter table public.profiles
  add column if not exists player_id uuid references public.players(id) on delete set null,
  add column if not exists discord_guild_id text,
  add column if not exists discord_role_ids text[] not null default '{}',
  add column if not exists discord_mapped_roles text[] not null default '{}',
  add column if not exists discord_role_synced_at timestamptz,
  add column if not exists role_source text not null default 'system'
    check (role_source in ('system', 'manual', 'discord_sync'));

update public.profiles
set role_source = 'manual'
where role <> 'viewer' and role_source = 'system';

revoke update on public.profiles from authenticated;
grant update (display_name) on public.profiles to authenticated;

notify pgrst, 'reload schema';
