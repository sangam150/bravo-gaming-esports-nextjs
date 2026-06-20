-- Storage buckets and policies promoted from schema.sql and readiness-recovery.sql.

insert into storage.buckets (id, name, public)
values
  ('team-logos', 'team-logos', true),
  ('player-avatars', 'player-avatars', true),
  ('player-photos', 'player-photos', true),
  ('event-banners', 'event-banners', true),
  ('sponsor-logos', 'sponsor-logos', true),
  ('sponsor-assets', 'sponsor-assets', true),
  ('result-screenshots', 'result-screenshots', true),
  ('scoreboard-images', 'scoreboard-images', true),
  ('match-media', 'match-media', true),
  ('media-assets', 'media-assets', true),
  ('media-uploads', 'media-uploads', true),
  ('hero-slides', 'hero-slides', true),
  ('news-images', 'news-images', true),
  ('posters', 'posters', true),
  ('moss-files', 'moss-files', true),
  ('stream-assets', 'stream-assets', true)
on conflict (id) do nothing;

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
    'moss-files',
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
    'stream-assets'
  )
  and public.is_admin_role()
);
