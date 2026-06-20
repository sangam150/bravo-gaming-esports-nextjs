-- Safe defaults and bootstrap records promoted from schema.sql

insert into public.point_systems (
  id,
  name,
  game,
  placement_points,
  kill_points,
  rules_json,
  active
)
values (
  '00000000-0000-4000-8000-000000000001',
  'Bravo PUBG',
  'PUBG PC',
  '{"1":10,"2":6,"3":5,"4":4,"5":3,"6":2,"7":1,"8":1,"9":0,"10":0,"11":0,"12":0,"13":0,"14":0,"15":0,"16":0}'::jsonb,
  1,
  '{"notes":["WWCD 10 points","Kill 1 point","9th to 16th earn 0 placement points"]}'::jsonb,
  true
)
on conflict (name) do update
set
  game = excluded.game,
  placement_points = excluded.placement_points,
  kill_points = excluded.kill_points,
  rules_json = excluded.rules_json,
  active = excluded.active,
  deleted_at = null,
  updated_at = timezone('utc', now());

update public.events
set published_at = coalesce(published_at, updated_at)
where published = true and published_at is null;

update public.teams
set slug = lower(trim(both '-' from regexp_replace(name, '[^a-z0-9]+', '-', 'gi')))
where slug is null;

update public.players
set slug = lower(trim(both '-' from regexp_replace(coalesce(pubg_name, display_name, id::text), '[^a-z0-9]+', '-', 'gi')))
where slug is null;

update public.sponsors
set slug = lower(trim(both '-' from regexp_replace(name, '[^a-z0-9]+', '-', 'gi')))
where slug is null;

update public.videos
set slug = lower(trim(both '-' from regexp_replace(title, '[^a-z0-9]+', '-', 'gi')))
where slug is null;


insert into public.teams (slot_number, name, short_name, description, status)
values
  (1, 'FYB Esports', 'FYB', 'Default Bravo slot team', 'active'),
  (2, 'Mandem BoyZ', 'MBZ', 'Default Bravo slot team', 'active'),
  (3, 'The Lost MC Esports', 'LMC', 'Default Bravo slot team', 'active'),
  (4, 'Omega Tactix', 'OTX', 'Default Bravo slot team', 'active'),
  (5, 'NPL', 'NPL', 'Default Bravo slot team', 'active'),
  (6, 'N3P', 'N3P', 'Default Bravo slot team', 'active'),
  (7, 'Team HAKU', 'HAKU', 'Default Bravo slot team', 'active'),
  (8, 'Loot Addicts', 'LA', 'Default Bravo slot team', 'active'),
  (9, 'Mujuverse', 'MV', 'Default Bravo slot team', 'active'),
  (10, 'LTG', 'LTG', 'Default Bravo slot team', 'active'),
  (11, 'KDS', 'KDS', 'Default Bravo slot team', 'active'),
  (12, 'Bir Gorkhali', 'BG', 'Default Bravo slot team', 'active'),
  (13, 'Illumaniti Gamers', 'IG', 'Default Bravo slot team', 'active'),
  (14, 'Sons of Nepal', 'SONS', 'Default Bravo slot team', 'active'),
  (15, 'Ace', 'ACE', 'Default Bravo slot team', 'active'),
  (16, 'M8', 'M8', 'Default Bravo slot team', 'active'),
  (17, '69 Esports', '69ES', 'Default Bravo slot team', 'active'),
  (18, 'Arabpati Esports', 'AE', 'Default Bravo slot team', 'active'),
  (19, 'Fam', 'FAM', 'Default Bravo slot team', 'active'),
  (20, 'Families', 'FAMILIES', 'Default Bravo slot team', 'active')
on conflict (slot_number) do update
set
  name = excluded.name,
  short_name = excluded.short_name,
  description = excluded.description,
  status = excluded.status,
  updated_at = timezone('utc', now());

insert into public.settings (key, value)
values
  ('youtube_channel_id', jsonb_build_object('value', '')),
  ('youtube_channel_url', jsonb_build_object('value', '')),
  ('youtube_live_fallback_url', jsonb_build_object('value', '')),
  ('discord_invite_url', jsonb_build_object('value', ''))
on conflict (key) do nothing;

insert into public.app_documents (collection_name, id, data)
values
  (
    'siteStats',
    'main',
    jsonb_build_object(
      'teamsRegistered', 24,
      'matchesHosted', 0,
      'tournamentsCompleted', 0,
      'prizePoolsAwarded', 'Season updates soon',
      'communityMembers', 0,
      'youtubeViews', 'Channel updates soon',
      'currentDay', 0
    )
  ),
  (
    'teams',
    'fyb-esports',
    jsonb_build_object(
      'name', 'FYB Esports',
      'tag', 'FYB',
      'slotNumber', 1,
      'totalPoints', 0,
      'kills', 0,
      'matches', 0,
      'killPoints', 0,
      'placementPoints', 0,
      'status', 'active',
      'registrationStatus', 'approved'
    )
  ),
  (
    'teams',
    'mandem',
    jsonb_build_object(
      'name', 'Mandem',
      'slotNumber', 2,
      'totalPoints', 0,
      'kills', 0,
      'matches', 0,
      'killPoints', 0,
      'placementPoints', 0,
      'status', 'active',
      'registrationStatus', 'approved'
    )
  ),
  (
    'teams',
    'the-lost-mc-esports',
    jsonb_build_object(
      'name', 'The Lost MC Esports',
      'tag', 'LMC',
      'slotNumber', 3,
      'totalPoints', 0,
      'kills', 0,
      'matches', 0,
      'killPoints', 0,
      'placementPoints', 0,
      'status', 'active',
      'registrationStatus', 'approved'
    )
  ),
  (
    'teams',
    'fyb-fan-boy',
    jsonb_build_object(
      'name', 'FYB FAN BOY',
      'tag', 'FYBFB',
      'slotNumber', 4,
      'totalPoints', 0,
      'kills', 0,
      'matches', 0,
      'killPoints', 0,
      'placementPoints', 0,
      'status', 'active',
      'registrationStatus', 'approved'
    )
  ),
  (
    'teams',
    'omega-tactix',
    jsonb_build_object(
      'name', 'Omega Tactix',
      'tag', 'OTX',
      'slotNumber', 5,
      'totalPoints', 0,
      'kills', 0,
      'matches', 0,
      'killPoints', 0,
      'placementPoints', 0,
      'status', 'active',
      'registrationStatus', 'approved'
    )
  ),
  (
    'teams',
    'npl',
    jsonb_build_object(
      'name', 'NPL',
      'slotNumber', 6,
      'totalPoints', 0,
      'kills', 0,
      'matches', 0,
      'killPoints', 0,
      'placementPoints', 0,
      'status', 'active',
      'registrationStatus', 'approved'
    )
  ),
  (
    'teams',
    'n3p',
    jsonb_build_object(
      'name', 'N3P',
      'slotNumber', 7,
      'totalPoints', 0,
      'kills', 0,
      'matches', 0,
      'killPoints', 0,
      'placementPoints', 0,
      'status', 'active',
      'registrationStatus', 'approved'
    )
  ),
  (
    'teams',
    'team-haku',
    jsonb_build_object(
      'name', 'Team HAKU',
      'tag', 'HAKU',
      'slotNumber', 8,
      'totalPoints', 0,
      'kills', 0,
      'matches', 0,
      'killPoints', 0,
      'placementPoints', 0,
      'status', 'active',
      'registrationStatus', 'approved'
    )
  ),
  (
    'teams',
    'lootaddicts',
    jsonb_build_object(
      'name', 'LootAddicts',
      'tag', 'LA',
      'slotNumber', 9,
      'totalPoints', 0,
      'kills', 0,
      'matches', 0,
      'killPoints', 0,
      'placementPoints', 0,
      'status', 'active',
      'registrationStatus', 'approved'
    )
  ),
  (
    'teams',
    'mujuverse',
    jsonb_build_object(
      'name', 'Mujuverse',
      'tag', 'MV',
      'slotNumber', 10,
      'totalPoints', 0,
      'kills', 0,
      'matches', 0,
      'killPoints', 0,
      'placementPoints', 0,
      'status', 'active',
      'registrationStatus', 'approved'
    )
  ),
  (
    'teams',
    'lang-tang-gang-ltg',
    jsonb_build_object(
      'name', 'LTG',
      'tag', 'LTG',
      'slotNumber', 11,
      'totalPoints', 0,
      'kills', 0,
      'matches', 0,
      'killPoints', 0,
      'placementPoints', 0,
      'status', 'active',
      'registrationStatus', 'approved'
    )
  ),
  (
    'teams',
    'kaal',
    jsonb_build_object(
      'name', 'Kaal',
      'slotNumber', 12,
      'totalPoints', 0,
      'kills', 0,
      'matches', 0,
      'killPoints', 0,
      'placementPoints', 0,
      'status', 'active',
      'registrationStatus', 'approved'
    )
  ),
  (
    'teams',
    'bir-gorkhali',
    jsonb_build_object(
      'name', 'Bir Gorkhali',
      'tag', 'BG',
      'slotNumber', 13,
      'totalPoints', 0,
      'kills', 0,
      'matches', 0,
      'killPoints', 0,
      'placementPoints', 0,
      'status', 'active',
      'registrationStatus', 'approved'
    )
  ),
  (
    'teams',
    'illumaniti-gamers',
    jsonb_build_object(
      'name', 'Illumaniti Gamers',
      'tag', 'IG',
      'slotNumber', 14,
      'totalPoints', 0,
      'kills', 0,
      'matches', 0,
      'killPoints', 0,
      'placementPoints', 0,
      'status', 'active',
      'registrationStatus', 'approved'
    )
  ),
  (
    'teams',
    'sons',
    jsonb_build_object(
      'name', 'Sons',
      'slotNumber', 15,
      'totalPoints', 0,
      'kills', 0,
      'matches', 0,
      'killPoints', 0,
      'placementPoints', 0,
      'status', 'active',
      'registrationStatus', 'approved'
    )
  ),
  (
    'teams',
    'ace',
    jsonb_build_object(
      'name', 'Ace',
      'slotNumber', 16,
      'totalPoints', 0,
      'kills', 0,
      'matches', 0,
      'killPoints', 0,
      'placementPoints', 0,
      'status', 'active',
      'registrationStatus', 'approved'
    )
  ),
  (
    'teams',
    'm8',
    jsonb_build_object(
      'name', 'M8',
      'slotNumber', 17,
      'totalPoints', 0,
      'kills', 0,
      'matches', 0,
      'killPoints', 0,
      'placementPoints', 0,
      'status', 'active',
      'registrationStatus', 'approved'
    )
  ),
  (
    'teams',
    'arabpati-esports',
    jsonb_build_object(
      'name', 'Arabpati Esports',
      'tag', 'AE',
      'slotNumber', 18,
      'totalPoints', 0,
      'kills', 0,
      'matches', 0,
      'killPoints', 0,
      'placementPoints', 0,
      'status', 'active',
      'registrationStatus', 'approved'
    )
  ),
  (
    'teams',
    'gedagudi',
    jsonb_build_object(
      'name', 'GedaGudi',
      'tag', 'GG',
      'slotNumber', 19,
      'totalPoints', 0,
      'kills', 0,
      'matches', 0,
      'killPoints', 0,
      'placementPoints', 0,
      'status', 'active',
      'registrationStatus', 'approved'
    )
  ),
  (
    'teams',
    'the-young-man',
    jsonb_build_object(
      'name', 'The Young Man',
      'tag', 'TYM',
      'slotNumber', 20,
      'totalPoints', 0,
      'kills', 0,
      'matches', 0,
      'killPoints', 0,
      'placementPoints', 0,
      'status', 'active',
      'registrationStatus', 'approved'
    )
  ),
  (
    'teams',
    'aia-apex-in-action',
    jsonb_build_object(
      'name', 'AIA ( APEX IN ACTION )',
      'tag', 'AIA',
      'slotNumber', 21,
      'totalPoints', 0,
      'kills', 0,
      'matches', 0,
      'killPoints', 0,
      'placementPoints', 0,
      'status', 'active',
      'registrationStatus', 'approved'
    )
  ),
  (
    'teams',
    'team-69',
    jsonb_build_object(
      'name', 'Team 69',
      'tag', 'T69',
      'slotNumber', 22,
      'totalPoints', 0,
      'kills', 0,
      'matches', 0,
      'killPoints', 0,
      'placementPoints', 0,
      'status', 'active',
      'registrationStatus', 'approved'
    )
  ),
  (
    'teams',
    'fam',
    jsonb_build_object(
      'name', 'Fam',
      'slotNumber', 23,
      'totalPoints', 0,
      'kills', 0,
      'matches', 0,
      'killPoints', 0,
      'placementPoints', 0,
      'status', 'active',
      'registrationStatus', 'approved'
    )
  ),
  (
    'teams',
    'families',
    jsonb_build_object(
      'name', 'Families',
      'slotNumber', 24,
      'totalPoints', 0,
      'kills', 0,
      'matches', 0,
      'killPoints', 0,
      'placementPoints', 0,
      'status', 'active',
      'registrationStatus', 'approved'
    )
  )
on conflict (collection_name, id) do update
set
  data = excluded.data,
  updated_at = timezone('utc', now());

create trigger seasons_set_updated_at
before update on public.seasons
for each row execute function public.set_updated_at();

create trigger days_set_updated_at
before update on public.days
for each row execute function public.set_updated_at();

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger point_systems_set_updated_at
before update on public.point_systems
for each row execute function public.set_updated_at();

create trigger events_set_updated_at
before update on public.events
for each row execute function public.set_updated_at();

create trigger event_teams_set_updated_at
before update on public.event_teams
for each row execute function public.set_updated_at();

create trigger teams_set_updated_at
before update on public.teams
for each row execute function public.set_updated_at();

create trigger players_set_updated_at
before update on public.players
for each row execute function public.set_updated_at();

create trigger team_roster_history_set_updated_at
before update on public.team_roster_history
for each row execute function public.set_updated_at();

create trigger matches_set_updated_at
before update on public.matches
for each row execute function public.set_updated_at();

create trigger match_team_results_set_updated_at
before update on public.match_team_results
for each row execute function public.set_updated_at();

create trigger match_player_results_set_updated_at
before update on public.match_player_results
for each row execute function public.set_updated_at();

create trigger pending_imports_set_updated_at
before update on public.pending_imports
for each row execute function public.set_updated_at();

create trigger roster_requests_set_updated_at
before update on public.roster_requests
for each row execute function public.set_updated_at();

create trigger moss_submissions_set_updated_at
before update on public.moss_submissions
for each row execute function public.set_updated_at();

create trigger announcements_set_updated_at
before update on public.announcements
for each row execute function public.set_updated_at();

create trigger sponsors_set_updated_at
before update on public.sponsors
for each row execute function public.set_updated_at();

create trigger videos_set_updated_at
before update on public.videos
for each row execute function public.set_updated_at();

create trigger settings_set_updated_at
before update on public.settings
for each row execute function public.set_updated_at();

create trigger app_documents_set_updated_at
before update on public.app_documents
for each row execute function public.set_updated_at();
