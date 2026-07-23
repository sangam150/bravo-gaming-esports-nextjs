-- Ensure compatibility views obey caller RLS and keep rate-limit state private.

alter table public.app_rate_limits enable row level security;

revoke all on table public.app_rate_limits from anon, authenticated;
grant all on table public.app_rate_limits to service_role;

revoke all on function public.consume_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, integer, integer) to service_role;

do $$
declare
  view_name text;
begin
  foreach view_name in array array[
    'user_profiles',
    'season_days',
    'media',
    'site_settings',
    'homepage_content',
    'contact_messages',
    'news_articles',
    'season_standings',
    'standings',
    'player_season_stats',
    'alltime_standings'
  ]
  loop
    if to_regclass(format('public.%I', view_name)) is not null then
      execute format('alter view public.%I set (security_invoker = true)', view_name);
    end if;
  end loop;
end;
$$;

notify pgrst, 'reload schema';
