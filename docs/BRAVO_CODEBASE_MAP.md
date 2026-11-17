# BRAVO Gaming Esports - Codebase Map

Generated from the source tree on 2026-11-14. This document proves code presence only; it does not prove remote schema state, credentials, or live integration acceptance.

## Measured inventory

| Category | Count |
| --- | ---: |
| App Router pages | 95 |
| API route handlers | 91 |
| Total page/API entry points | 186 |
| Typed public tables | 36 |
| Typed public views | 15 |
| Typed RPC functions | 22 |
| Ordered SQL migrations | 28 |
| Broadcast graphics | 38 |

## Directory ownership

| Path | Responsibility |
| --- | --- |
| `app/` | Next.js App Router pages, layouts, callbacks, metadata and HTTP APIs |
| `components/` | Shared site, admin, authentication and broadcast UI |
| `lib/` | Domain services, Supabase access, authorization, scoring, PUBG, R2 and broadcast state |
| `types/` | Application and expected database contracts |
| `supabase/migrations/` | Forward SQL migrations 001-028 |
| `tests/` | Unit, integration, PGlite and fixture regression tests |
| `scripts/` | QA, staging readiness, security and operational tooling |
| `docs/` | Architecture, release, staging, operations and handoff evidence |
| `public/` | Static public assets |

## Page route inventory

| Route | Source |
| --- | --- |
| `/` | `app/page.tsx` |
| `/about` | `app/about/page.tsx` |
| `/about/founder` | `app/about/founder/page.tsx` |
| `/about/media-kit` | `app/about/media-kit/page.tsx` |
| `/about/sponsor-us` | `app/about/sponsor-us/page.tsx` |
| `/admin` | `app/admin/page.tsx` |
| `/admin/[section]` | `app/admin/[section]/page.tsx` |
| `/admin/authentication/discord-roles` | `app/admin/authentication/discord-roles/page.tsx` |
| `/admin/events` | `app/admin/events/page.tsx` |
| `/admin/login` | `app/admin/login/page.tsx` |
| `/admin/matches` | `app/admin/matches/page.tsx` |
| `/admin/matches/[id]/review` | `app/admin/matches/[id]/review/page.tsx` |
| `/admin/matches/import` | `app/admin/matches/import/page.tsx` |
| `/admin/seasons` | `app/admin/seasons/page.tsx` |
| `/anti-cheat` | `app/anti-cheat/page.tsx` |
| `/calendar` | `app/calendar/page.tsx` |
| `/championships` | `app/championships/page.tsx` |
| `/community` | `app/community/page.tsx` |
| `/community/announcements` | `app/community/announcements/page.tsx` |
| `/community/highlights` | `app/community/highlights/page.tsx` |
| `/compare` | `app/compare/page.tsx` |
| `/contact` | `app/contact/page.tsx` |
| `/current-season` | `app/current-season/page.tsx` |
| `/dashboard` | `app/dashboard/page.tsx` |
| `/dashboard/player` | `app/dashboard/player/page.tsx` |
| `/events` | `app/events/page.tsx` |
| `/events/[slug]` | `app/events/[slug]/page.tsx` |
| `/fantasy` | `app/fantasy/page.tsx` |
| `/feedback` | `app/feedback/page.tsx` |
| `/games` | `app/games/page.tsx` |
| `/games/[slug]` | `app/games/[slug]/page.tsx` |
| `/giveaways` | `app/giveaways/page.tsx` |
| `/gta-rp` | `app/gta-rp/page.tsx` |
| `/hall-of-fame` | `app/hall-of-fame/page.tsx` |
| `/highlights` | `app/highlights/page.tsx` |
| `/leaderboard` | `app/leaderboard/page.tsx` |
| `/live-stream` | `app/live-stream/page.tsx` |
| `/login` | `app/login/page.tsx` |
| `/matches` | `app/matches/page.tsx` |
| `/matches/[id]` | `app/matches/[id]/page.tsx` |
| `/media` | `app/media/page.tsx` |
| `/media/[slug]` | `app/media/[slug]/page.tsx` |
| `/mvp-ranking` | `app/mvp-ranking/page.tsx` |
| `/news` | `app/news/page.tsx` |
| `/news-media` | `app/news-media/page.tsx` |
| `/news/[slug]` | `app/news/[slug]/page.tsx` |
| `/organizations` | `app/organizations/page.tsx` |
| `/organizations/[slug]` | `app/organizations/[slug]/page.tsx` |
| `/overlay/[graphic]` | `app/overlay/[graphic]/page.tsx` |
| `/partners` | `app/partners/page.tsx` |
| `/player/login` | `app/player/login/page.tsx` |
| `/players` | `app/players/page.tsx` |
| `/players/[playerId]` | `app/players/[playerId]/page.tsx` |
| `/privacy` | `app/privacy/page.tsx` |
| `/pubg` | `app/pubg/page.tsx` |
| `/pubg-scrims` | `app/pubg-scrims/page.tsx` |
| `/pubg/access` | `app/pubg/access/page.tsx` |
| `/pubg/community` | `app/pubg/community/page.tsx` |
| `/pubg/compare` | `app/pubg/compare/page.tsx` |
| `/pubg/events` | `app/pubg/events/page.tsx` |
| `/pubg/events/[slug]` | `app/pubg/events/[slug]/page.tsx` |
| `/pubg/fantasy` | `app/pubg/fantasy/page.tsx` |
| `/pubg/hall-of-fame` | `app/pubg/hall-of-fame/page.tsx` |
| `/pubg/leaderboards` | `app/pubg/leaderboards/page.tsx` |
| `/pubg/matches/[slug]` | `app/pubg/matches/[slug]/page.tsx` |
| `/pubg/players` | `app/pubg/players/page.tsx` |
| `/pubg/players/[playerId]` | `app/pubg/players/[playerId]/page.tsx` |
| `/pubg/results` | `app/pubg/results/page.tsx` |
| `/pubg/seasons/[slug]` | `app/pubg/seasons/[slug]/page.tsx` |
| `/pubg/seasons/current` | `app/pubg/seasons/current/page.tsx` |
| `/pubg/teams` | `app/pubg/teams/page.tsx` |
| `/pubg/teams/[teamId]` | `app/pubg/teams/[teamId]/page.tsx` |
| `/rankings` | `app/rankings/page.tsx` |
| `/reset-password` | `app/reset-password/page.tsx` |
| `/results` | `app/results/page.tsx` |
| `/results/matches/[matchId]` | `app/results/matches/[matchId]/page.tsx` |
| `/rules` | `app/rules/page.tsx` |
| `/schedule` | `app/schedule/page.tsx` |
| `/search` | `app/search/page.tsx` |
| `/sponsor-kit` | `app/sponsor-kit/page.tsx` |
| `/sponsors` | `app/sponsors/page.tsx` |
| `/sponsors/[slug]` | `app/sponsors/[slug]/page.tsx` |
| `/statistics` | `app/statistics/page.tsx` |
| `/stats` | `app/stats/page.tsx` |
| `/stream-schedule` | `app/stream-schedule/page.tsx` |
| `/team` | `app/team/page.tsx` |
| `/team/login` | `app/team/login/page.tsx` |
| `/teams` | `app/teams/page.tsx` |
| `/teams/[teamId]` | `app/teams/[teamId]/page.tsx` |
| `/teams/register` | `app/teams/register/page.tsx` |
| `/terms` | `app/terms/page.tsx` |
| `/tournament-partners` | `app/tournament-partners/page.tsx` |
| `/tournaments` | `app/tournaments/page.tsx` |
| `/tournaments/[tournamentId]` | `app/tournaments/[tournamentId]/page.tsx` |
| `/videos` | `app/videos/page.tsx` |

## API inventory

The method column is mechanically extracted. Authorization must be assessed through the route and its shared service calls; an `/api/admin/*` path alone is not evidence of a successful live admin session.

| Endpoint | Methods | Source |
| --- | --- | --- |
| `/api/admin/audit-logs` | GET | `app/api/admin/audit-logs/route.ts` |
| `/api/admin/broadcast` | GET, PUT | `app/api/admin/broadcast/route.ts` |
| `/api/admin/discord-links` | GET, PATCH | `app/api/admin/discord-links/route.ts` |
| `/api/admin/discord-role-mappings` | GET, POST | `app/api/admin/discord-role-mappings/route.ts` |
| `/api/admin/errors` | GET | `app/api/admin/errors/route.ts` |
| `/api/admin/games` | GET, POST | `app/api/admin/games/route.ts` |
| `/api/admin/games/[id]` | PUT, DELETE | `app/api/admin/games/[id]/route.ts` |
| `/api/admin/homepage` | GET, PUT | `app/api/admin/homepage/route.ts` |
| `/api/admin/matches` | GET, POST, PUT, DELETE | `app/api/admin/matches/route.ts` |
| `/api/admin/matches/import` | POST | `app/api/admin/matches/import/route.ts` |
| `/api/admin/matches/preview` | POST | `app/api/admin/matches/preview/route.ts` |
| `/api/admin/media` | GET, POST | `app/api/admin/media/route.ts` |
| `/api/admin/media/[id]` | PUT, DELETE | `app/api/admin/media/[id]/route.ts` |
| `/api/admin/media/youtube-sync` | POST | `app/api/admin/media/youtube-sync/route.ts` |
| `/api/admin/messages` | GET, PATCH | `app/api/admin/messages/route.ts` |
| `/api/admin/news` | GET, POST | `app/api/admin/news/route.ts` |
| `/api/admin/news/[id]` | PUT, DELETE | `app/api/admin/news/[id]/route.ts` |
| `/api/admin/pending-imports` | GET, POST | `app/api/admin/pending-imports/route.ts` |
| `/api/admin/pending-imports/[id]` | PATCH, DELETE | `app/api/admin/pending-imports/[id]/route.ts` |
| `/api/admin/platform-event-options` | GET | `app/api/admin/platform-event-options/route.ts` |
| `/api/admin/platform-events` | GET, POST | `app/api/admin/platform-events/route.ts` |
| `/api/admin/platform-events/[id]` | PUT, DELETE | `app/api/admin/platform-events/[id]/route.ts` |
| `/api/admin/player-team-linking` | GET, PUT | `app/api/admin/player-team-linking/route.ts` |
| `/api/admin/player-team-linking/memberships/[id]` | DELETE | `app/api/admin/player-team-linking/memberships/[id]/route.ts` |
| `/api/admin/player-team-linking/recalculate` | POST | `app/api/admin/player-team-linking/recalculate/route.ts` |
| `/api/admin/player-team-linking/reviews/[id]` | PATCH | `app/api/admin/player-team-linking/reviews/[id]/route.ts` |
| `/api/admin/players/[id]/avatar` | POST, DELETE | `app/api/admin/players/[id]/avatar/route.ts` |
| `/api/admin/point-systems` | GET, POST | `app/api/admin/point-systems/route.ts` |
| `/api/admin/pubg/candidates` | GET, PATCH | `app/api/admin/pubg/candidates/route.ts` |
| `/api/admin/pubg/import/reimport` | POST | `app/api/admin/pubg/import/reimport/route.ts` |
| `/api/admin/pubg/import/repair` | POST | `app/api/admin/pubg/import/repair/route.ts` |
| `/api/admin/pubg/import/reset` | POST | `app/api/admin/pubg/import/reset/route.ts` |
| `/api/admin/pubg/match` | POST, GET, PATCH | `app/api/admin/pubg/match/route.ts` |
| `/api/admin/pubg/player` | POST | `app/api/admin/pubg/player/route.ts` |
| `/api/admin/pubg/raw` | GET | `app/api/admin/pubg/raw/route.ts` |
| `/api/admin/pubg/watchers` | GET, POST, PATCH, DELETE | `app/api/admin/pubg/watchers/route.ts` |
| `/api/admin/registered-teams` | GET | `app/api/admin/registered-teams/route.ts` |
| `/api/admin/reset` | POST | `app/api/admin/reset/route.ts` |
| `/api/admin/scrims` | GET, POST, PUT, DELETE | `app/api/admin/scrims/route.ts` |
| `/api/admin/seasons/create-next-day` | POST | `app/api/admin/seasons/create-next-day/route.ts` |
| `/api/admin/seasons/sync-bravo-daily-scrims` | POST | `app/api/admin/seasons/sync-bravo-daily-scrims/route.ts` |
| `/api/admin/sponsors` | GET, POST | `app/api/admin/sponsors/route.ts` |
| `/api/admin/sponsors/[id]` | PUT, DELETE | `app/api/admin/sponsors/[id]/route.ts` |
| `/api/admin/team-reconciliation` | GET, POST | `app/api/admin/team-reconciliation/route.ts` |
| `/api/admin/team-requests` | GET, PATCH | `app/api/admin/team-requests/route.ts` |
| `/api/admin/teams` | GET, POST | `app/api/admin/teams/route.ts` |
| `/api/admin/teams/[id]` | GET, PUT, PATCH, DELETE | `app/api/admin/teams/[id]/route.ts` |
| `/api/admin/teams/[id]/access` | PATCH | `app/api/admin/teams/[id]/access/route.ts` |
| `/api/admin/teams/[id]/aliases` | POST | `app/api/admin/teams/[id]/aliases/route.ts` |
| `/api/admin/teams/[id]/logo` | POST, DELETE | `app/api/admin/teams/[id]/logo/route.ts` |
| `/api/admin/teams/[id]/logo/adopt` | POST | `app/api/admin/teams/[id]/logo/adopt/route.ts` |
| `/api/admin/tournaments/import-bravo-feed` | POST | `app/api/admin/tournaments/import-bravo-feed/route.ts` |
| `/api/admin/uploads/r2` | POST, DELETE | `app/api/admin/uploads/r2/route.ts` |
| `/api/announcements` | GET, POST, DELETE | `app/api/announcements/route.ts` |
| `/api/auth/discord-intent` | POST | `app/api/auth/discord-intent/route.ts` |
| `/api/auth/login` | POST | `app/api/auth/login/route.ts` |
| `/api/auth/login-events` | POST | `app/api/auth/login-events/route.ts` |
| `/api/auth/me` | GET | `app/api/auth/me/route.ts` |
| `/api/auth/password-reset` | POST | `app/api/auth/password-reset/route.ts` |
| `/api/auth/providers` | GET | `app/api/auth/providers/route.ts` |
| `/api/auth/session` | POST, DELETE | `app/api/auth/session/route.ts` |
| `/api/broadcast` | GET | `app/api/broadcast/route.ts` |
| `/api/contact` | POST | `app/api/contact/route.ts` |
| `/api/cron/sync-matches` | GET | `app/api/cron/sync-matches/route.ts` |
| `/api/home` | GET | `app/api/home/route.ts` |
| `/api/leaderboard` | GET | `app/api/leaderboard/route.ts` |
| `/api/players` | GET, POST | `app/api/players/route.ts` |
| `/api/players/[id]` | GET, PUT, DELETE | `app/api/players/[id]/route.ts` |
| `/api/pubg/matches/[matchId]` | GET | `app/api/pubg/matches/[matchId]/route.ts` |
| `/api/pubg/players` | GET | `app/api/pubg/players/route.ts` |
| `/api/pubg/sync-player` | GET | `app/api/pubg/sync-player/route.ts` |
| `/api/pubg/telemetry` | GET | `app/api/pubg/telemetry/route.ts` |
| `/api/registrations` | GET, POST, PATCH | `app/api/registrations/route.ts` |
| `/api/registrations/logo` | POST | `app/api/registrations/logo/route.ts` |
| `/api/scrims` | GET | `app/api/scrims/route.ts` |
| `/api/seasons` | GET, POST | `app/api/seasons/route.ts` |
| `/api/seasons/[id]` | GET, PUT, DELETE | `app/api/seasons/[id]/route.ts` |
| `/api/seasons/current` | GET | `app/api/seasons/current/route.ts` |
| `/api/stats` | GET | `app/api/stats/route.ts` |
| `/api/team` | GET | `app/api/team/route.ts` |
| `/api/team/moss` | POST | `app/api/team/moss/route.ts` |
| `/api/team/players/[playerId]/avatar` | POST | `app/api/team/players/[playerId]/avatar/route.ts` |
| `/api/team/requests` | POST | `app/api/team/requests/route.ts` |
| `/api/team/upload` | POST | `app/api/team/upload/route.ts` |
| `/api/teams` | GET, POST | `app/api/teams/route.ts` |
| `/api/teams/[id]` | GET, PUT, DELETE | `app/api/teams/[id]/route.ts` |
| `/api/tournaments` | GET, POST | `app/api/tournaments/route.ts` |
| `/api/tournaments/[id]` | GET, PUT, DELETE | `app/api/tournaments/[id]/route.ts` |
| `/api/uploads/private/[uploadId]` | GET | `app/api/uploads/private/[uploadId]/route.ts` |
| `/api/uploads/r2` | GET | `app/api/uploads/r2/route.ts` |
| `/api/version` | GET (constant export) | `app/api/version/route.ts` |

## Expected relational contract

These names come from `types/database.types.ts`. They are the intended client contract and are not proof that staging or production has the same ledger.

### Tables (36)

`announcements`, `app_documents`, `app_rate_limits`, `audit_logs`, `days`, `discord_access_reviews`, `discord_role_mappings`, `event_teams`, `event_player_statistics`, `events`, `import_logs`, `match_player_results`, `match_players`, `match_results`, `match_team_results`, `matches`, `moss_submissions`, `pending_imports`, `players`, `point_systems`, `profiles`, `registrations`, `roster_requests`, `seasons`, `settings`, `sponsors`, `team_aliases`, `team_memberships`, `team_reconciliation_candidates`, `team_registry_audit`, `team_roster_history`, `team_source_links`, `teams`, `uploads`, `users`, `videos`

### Views (15)

`alltime_standings`, `contact_messages`, `homepage_content`, `media`, `mvp_rankings`, `news_articles`, `player_leaderboard`, `player_season_stats`, `season_days`, `season_standings`, `site_settings`, `standings`, `team_leaderboard`, `top_fraggers`, `user_profiles`

### RPC functions (22)

`commit_competition_event`, `commit_competition_match`, `confirm_event_registration`, `consume_rate_limit`, `create_event_registration`, `create_next_day`, `current_user_role`, `current_user_team_id`, `ensure_active_scrim_season`, `is_admin_role`, `is_public_app_document`, `is_team_role`, `set_event_registration_status`, `jsonb_flag_true_by_default`, `parse_optional_timestamptz`, `get_player_team_linking_admin_dashboard`, `recalculate_player_team_links`, `reconcile_player_team_link_for_account`, `reconcile_player_team_links_for_match`, `review_player_team_link`, `unlink_player_team_membership`, `update_player_team_link_settings`

## Ordered migration files

| Order | Migration |
| ---: | --- |
| 001 | `supabase/migrations/001_initial_schema.sql` |
| 002 | `supabase/migrations/002_readiness_recovery.sql` |
| 003 | `supabase/migrations/003_storage_buckets_and_policies.sql` |
| 004 | `supabase/migrations/004_seed_defaults.sql` |
| 005 | `supabase/migrations/005_milestone4_live_schema_alignment.sql` |
| 006 | `supabase/migrations/006_milestone4_profiles_auth_upsert_compat.sql` |
| 007 | `supabase/migrations/007_milestone4_legacy_users_auth_compat.sql` |
| 008 | `supabase/migrations/008_launch_hotfix_blockers.sql` |
| 009 | `supabase/migrations/009_profiles_rls_policy_cleanup.sql` |
| 010 | `supabase/migrations/010_pubg_import_lifecycle_extensions.sql` |
| 011 | `supabase/migrations/011_profile_discord_links.sql` |
| 012 | `supabase/migrations/012_fix_security_invoker_leaderboard_views.sql` |
| 013 | `supabase/migrations/013_add_demo_seed_tag_columns.sql` |
| 014 | `supabase/migrations/014_shared_rate_limits.sql` |
| 015 | `supabase/migrations/015_production_security_reconciliation.sql` |
| 016 | `supabase/migrations/016_view_and_rate_limit_security.sql` |
| 017 | `supabase/migrations/017_complete_authentication_hardening.sql` |
| 018 | `supabase/migrations/018_discord_role_sync.sql` |
| 019 | `supabase/migrations/019_discord_team_role_mappings.sql` |
| 020 | `supabase/migrations/020_relational_team_registry_reconciliation.sql` |
| 021 | `supabase/migrations/021_relational_team_membership_authorization.sql` |
| 022 | `supabase/migrations/022_player_team_match_history_linking.sql` |
| 023 | `supabase/migrations/023_private_document_and_publication_boundary.sql` |
| 024 | `supabase/migrations/024_public_data_and_authorization_hardening.sql` |
| 025 | `supabase/migrations/025_event_player_statistics.sql` |
| 026 | `supabase/migrations/026_versioned_scoring_decisions.sql` |
| 027 | `supabase/migrations/027_atomic_match_results.sql` |
| 028 | `supabase/migrations/028_atomic_event_registration.sql` |

## Broadcast graphics (38)

`scoreboard`, `results`, `winner`, `mvp`, `top-fragger`, `top-damage`, `headshots`, `players`, `rankings`, `standings`, `lower-third`, `schedule`, `sponsors`, `opening`, `closing`, `killfeed`, `road-to-finals`, `road-to-finals-2`, `todays-matches`, `map-intro`, `countdown`, `casters`, `team-stats`, `break`, `group-standings`, `day-standings`, `compact-scoreboard`, `match-info`, `team-spotlight`, `sponsor-strip`, `champion`, `final-rankings`, `player-comparison`, `technical-break`, `analyst-panel`, `starting-soon`, `advancement`, `team-slots`

The permanent browser-source route is `/overlay/program`; individual graphics use `/overlay/[graphic]`.

## Documented environment variable names

Values are intentionally omitted. Presence in `.env.example` does not prove a secret is configured or valid.

`PUBG_API_KEY`, `PUBG_SHARD`, `CRON_SECRET`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `DIRECT_URL`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PRIVATE_BUCKET_NAME`, `R2_PUBLIC_BASE_URL`, `NEXT_PUBLIC_R2_PUBLIC_BASE_URL`, `R2_ENDPOINT`, `R2_PUBLIC_DELIVERY_MODE`, `DISCORD_LOGIN_ENABLED`, `NEXT_PUBLIC_DISCORD_INVITE`, `BRAVO_DISCORD_GUILD_ID`, `DISCORD_BOT_TOKEN`, `DISCORD_ROLE_ADMIN_ID`, `DISCORD_ROLE_MODERATOR_ID`, `DISCORD_ROLE_ORGANIZER_ID`, `DISCORD_ROLE_TEAM_MANAGER_ID`, `DISCORD_ROLE_IGL_ID`, `DISCORD_ROLE_COACH_ID`, `DISCORD_ROLE_PLAYER_ID`, `DISCORD_ROLE_BANNED_ID`, `DISCORD_ROLE_SYNC_TTL_SECONDS`, `DISCORD_RELATIONAL_TEAM_AUTH_ENABLED`, `QA_STAGING_ADMIN_EMAIL`, `QA_STAGING_ADMIN_PASSWORD`, `ADMIN_PROVISION_PASSWORD`, `SUPABASE_ACCESS_TOKEN`, `YOUTUBE_HANDLE`, `YOUTUBE_CHANNEL_URL`, `YOUTUBE_CHANNEL_ID`
