alter table public.profiles
add column if not exists discord_user_id text;

create unique index if not exists profiles_discord_user_id_unique_idx
on public.profiles (discord_user_id)
where discord_user_id is not null;
