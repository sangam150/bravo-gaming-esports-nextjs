-- Keep raw document-store JSON private and expose relational match data only
-- after the match has reached the explicit published state.

alter table public.app_documents enable row level security;

drop policy if exists "public read app documents" on public.app_documents;
drop policy if exists "admin manage app documents" on public.app_documents;
create policy "admin manage app documents" on public.app_documents
for all
to authenticated
using (public.is_admin_role())
with check (public.is_admin_role());

revoke all privileges on table public.app_documents from public, anon, authenticated;
grant select, insert, update, delete on table public.app_documents to authenticated, service_role;

alter view public.homepage_content set (security_invoker = true);
alter view public.contact_messages set (security_invoker = true);
alter view public.news_articles set (security_invoker = true);

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

alter table public.matches enable row level security;
alter table public.match_results enable row level security;
alter table public.match_players enable row level security;
alter table public.match_team_results enable row level security;
alter table public.match_player_results enable row level security;

drop policy if exists "public read approved matches" on public.matches;
drop policy if exists "public read published matches" on public.matches;
create policy "public read published matches" on public.matches
for select
to anon, authenticated
using (
  status = 'published'
  and deleted_at is null
  and demo_seed_tag is null
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
      and match_record.deleted_at is null
      and match_record.demo_seed_tag is null
  )
);

notify pgrst, 'reload schema';
