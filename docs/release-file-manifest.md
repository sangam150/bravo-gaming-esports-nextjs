# Release file manifest — 13 November 2026

## Final preservation result — 17 November 2026

The exact 24-path candidate below was committed as `5ceece39ddc18bc8d57578c91dbaa8e69be8f503` and pushed to `origin/codex/platform-completion-20261104`. Exact-SHA GitHub Actions run `44116203600` passed and only the canonical Vercel project created a Preview. `AGENTS.md` remains separate and untracked. Ignored environments, Vercel metadata, QA evidence and credentials were not committed. Statements below describing this candidate as unstaged are retained as pre-commit review evidence and are superseded by this result.

## Final validation — 17 November 2026

- Exact application candidate: **24 paths** (ten modified and fourteen tracked-ready untracked); `AGENTS.md` remains a separate untracked instruction file.
- Index: **zero staged paths**.
- Secret scan: **PASS**, 578 tracked/candidate files.
- Tracked whitespace: **PASS**, `git diff --check` has no output.
- Accidental CRLF/stat-only changes from the Vercel/Windows CLI inspection were normalized and verified byte-identical to HEAD; `.gitignore` and migrations 001–004/010 are not part of the candidate.
- Ignored `.vercel/project.json` now selects canonical project `prj_xbUATIQPxXEj6Aamukjx8YJABjBh`; it is local operational metadata, not a release file.
- No environment file, credential, inspection output, build output, database dump or test artifact is included.

## Phase 3 working tree — 16 November 2026

The reported seven local edits are the seven modified documentation files. The actual tracked delta is **ten files** because `package.json`, `qa/local-staging-environment-check.mjs` and the canonical protected target in `qa/staging-target.mjs` preserve the intentional staging corrections. Phase 2 added nine tracked-ready untracked report/QA paths, Phase 3 adds the current infrastructure report, and the final execution adds four release-control documents. The exact unstaged application candidate is therefore **24 paths**. `AGENTS.md` remains a separate user-supplied instruction file. Ignored `qa-artifacts`, environment files and inspection outputs are excluded. Nothing is staged, committed or pushed by this follow-up.

| Change | File | Intent |
| --- | --- | --- |
| M | `docs/authentication-verification.md` | Current authentication evidence/blockers |
| M | `docs/preview-resource-isolation.md` | Authorized Vercel project isolation findings |
| M | `docs/production-deployment-report.md` | Current release gate evidence |
| M | `docs/release-audit.md` | Infrastructure blocker decision update |
| M | `docs/release-file-manifest.md` | Exact working-tree reconciliation |
| M | `docs/staging-unblock-full-report.md` | Current blocker handoff |
| M | `docs/staging-verification.md` | Current staging result matrix |
| M | `package.json` | Default local development uses guarded staging launcher |
| M | `qa/local-staging-environment-check.mjs` | Regression for guarded default local command |
| M | `qa/staging-target.mjs` | Canonical protected branch-alias target for real staging QA |
| A | `docs/BRAVO_CODEBASE_MAP.md` | Generated source inventory document, not generated build output |
| A | `docs/BRAVO_COMPLETE_PROJECT_HANDOFF.md` | Consolidated handoff report |
| A | `docs/BRAVO_LAUNCH_CHECKLIST.md` | Owner launch checklist |
| A | `docs/BRAVO_PROJECT_STATUS.json` | Machine-readable project status report |
| A | `docs/staging-infrastructure-reconciliation-2026-11-15.md` | Initial read-only infrastructure reconciliation |
| A | `docs/infrastructure-unblock-phase-2-2026-11-16.md` | Exact Vercel/Supabase Phase 2 owner plan |
| A | `docs/infrastructure-unblock-phase-3.md` | Read-only Phase 3 evidence and exact approval gates |
| A | `docs/BRAVO_FINAL_RELEASE_READINESS_2026-11-16.md` | Evidence-based final readiness decision |
| A | `docs/BRAVO_FINAL_OWNER_ACTIONS.md` | Separate owner approval register with effects and rollback |
| A | `docs/BRAVO_FINAL_STAGING_ACCEPTANCE.md` | Real staging PASS/FAIL/BLOCKED matrix |
| A | `docs/BRAVO_FINAL_DEPLOYMENT_RUNBOOK.md` | Production preflight, execution and rollback runbook |
| A | `qa/staging-schema-readonly-dashboard.sql` | Read-only Supabase Dashboard fallback |
| A | `qa/staging-schema-readonly-inspection.mjs` | Target-locked, least-privilege catalog inspector |
| A | `qa/staging-schema-readonly-inspection-check.mjs` | Inspector safety regression |

The ignored wrapper remains at `qa-artifacts/staging-schema-readonly-inspection.mjs` so the previously documented command is stable; it imports the tracked-ready QA source. The ignored Vercel metadata summarizer and all future evidence JSON remain excluded. No migration, application feature, environment file, credential, `.next` output, `node_modules`, test output or deployment artifact was added.

## Current state — 14 November 2026

The 104-path follow-up listed below is no longer pending: it was committed as `e025f9cdf85bb4aa618b4c0c1e7242aa783b6d9d` and pushed to `origin/codex/platform-completion-20261104`. The committed delta from `origin/main` remains 403 paths. The historic tables below remain the exact review inventory for that release commit.

The current working tree contains documentation updates plus a two-file local-login correction. Four new handoff artifacts are untracked: `docs/BRAVO_COMPLETE_PROJECT_HANDOFF.md`, `docs/BRAVO_PROJECT_STATUS.json`, `docs/BRAVO_CODEBASE_MAP.md` and `docs/BRAVO_LAUNCH_CHECKLIST.md`. Existing release/auth/staging/Preview reports are modified to add current evidence. `package.json` routes default `npm run dev` through the existing guarded staging launcher, and `qa/local-staging-environment-check.mjs` protects that default. `AGENTS.md` remains a separate untracked instruction file and is not part of the release candidate. Nothing is staged; no local commit is authorized.

No application route/component, migration, lockfile, environment file, generated output or credential was added by the 14 November evidence refresh. `package.json` and one existing QA script changed only to prevent the default localhost command from loading the unreachable production backend. The current working tree must be re-inventoried before any separately approved future commit.

This supersedes the [5 November archived manifest](release-file-manifest-2026-11-05.md). The existing approved **230-file commit** is 7eeded0260887bb31d5090fc1ee47643a8e07a79 on codex/platform-completion-20261104. The index contains exactly the 104-path follow-up listed below for owner review. This document also lists the complete candidate relative to verified remote main/deployed baseline c7311530a17cbb63ba5b4e3df0ef2da44acb7953. No commit, push, merge, migration or deployment was performed.

## Pending follow-up candidate: 104 paths

| Change | File |
| --- | --- |
| M | `.env.example` |
| A | `.github/workflows/verify.yml` |
| M | `app/api/admin/broadcast/route.ts` |
| M | `app/api/admin/matches/preview/route.ts` |
| M | `app/api/admin/matches/route.ts` |
| M | `app/api/admin/scrims/route.ts` |
| M | `app/api/auth/discord-intent/route.ts` |
| M | `app/api/auth/login/route.ts` |
| M | `app/api/auth/providers/route.ts` |
| M | `app/api/registrations/route.ts` |
| M | `app/auth/callback/route.ts` |
| M | `components/admin/AdminDashboard.tsx` |
| M | `components/admin/AdminLogin.tsx` |
| M | `components/admin/AdminMatchManager.tsx` |
| M | `components/admin/BroadcastControlRoom.tsx` |
| M | `components/admin/CompetitionScheduleEditor.tsx` |
| A | `components/admin/ScrimSlotEditor.tsx` |
| M | `components/auth/LoginHubClient.tsx` |
| M | `components/broadcast/broadcast.css` |
| M | `components/broadcast/BroadcastExtendedGraphic.tsx` |
| M | `components/broadcast/BroadcastOverlay.tsx` |
| M | `components/forms/ContactFormClient.tsx` |
| M | `components/SiteHeaderClient.tsx` |
| M | `components/statistics/StatisticsPageClient.tsx` |
| M | `components/team/TeamRegistrationPageClient.tsx` |
| M | `components/tournaments/TournamentDetailClient.tsx` |
| M | `components/ui/MotionSystem.tsx` |
| A | `docs/authentication-verification.md` |
| M | `docs/draft-pull-request.md` |
| A | `docs/event-day-operations.md` |
| A | `docs/event-day-readiness-2026-11-06.md` |
| A | `docs/preview-resource-isolation.md` |
| A | `docs/production-deployment-report.md` |
| A | `docs/release-audit-2026-11-05.md` |
| M | `docs/release-audit.md` |
| A | `docs/release-file-manifest-2026-11-05.md` |
| M | `docs/release-file-manifest.md` |
| A | `docs/staging-unblock-full-report.md` |
| M | `docs/staging-verification.md` |
| A | `docs/templates/scrim-offline-results.csv` |
| A | `docs/templates/scrim-offline-schedule.csv` |
| A | `docs/templates/scrim-offline-slots.csv` |
| M | `lib/auth-errors.ts` |
| M | `lib/broadcast-server.ts` |
| M | `lib/broadcast-template.ts` |
| M | `lib/broadcast.ts` |
| M | `lib/competition-relational.ts` |
| M | `lib/data.ts` |
| A | `lib/event-registration-transaction.ts` |
| A | `lib/login-failure-response.ts` |
| M | `lib/match-result-validation.ts` |
| A | `lib/preview-resource-policy.js` |
| M | `lib/public-scrims.ts` |
| M | `lib/r2/client.ts` |
| A | `lib/registration-approval-policy.ts` |
| M | `lib/registration-approval.ts` |
| M | `lib/registration-submission-state.ts` |
| M | `lib/scrim-input.ts` |
| A | `lib/scrim-slots.ts` |
| M | `lib/supabase/env.ts` |
| M | `lib/supabase/proxy.ts` |
| A | `lib/supabase/request-fetch.ts` |
| M | `lib/supabase/server-env.ts` |
| M | `lib/supabase/server.ts` |
| M | `lib/supabase/service-role-client.ts` |
| M | `lib/tournament-standings.ts` |
| M | `lib/types.ts` |
| A | `lib/use-hydrated.ts` |
| M | `lib/user-facing-errors.ts` |
| M | `next.config.js` |
| M | `package.json` |
| A | `qa/admin-provisioning-check.ts` |
| M | `qa/admin-workspaces.spec.js` |
| M | `qa/atomic-match-check.mjs` |
| A | `qa/auth-callback-rejection-check.mjs` |
| M | `qa/auth-offline-check.ts` |
| M | `qa/auth-refresh-check.ts` |
| M | `qa/broadcast-check.ts` |
| M | `qa/broadcast-ui.spec.js` |
| A | `qa/event-registration-transaction-check.mjs` |
| A | `qa/interaction-hydration.spec.js` |
| M | `qa/live-qa.spec.js` |
| M | `qa/local-release-runtime.mjs` |
| A | `qa/local-staging-environment-check.mjs` |
| A | `qa/login-route-check.ts` |
| M | `qa/master-workflows.spec.js` |
| M | `qa/migration-preflight.mjs` |
| A | `qa/motion-hydration.spec.js` |
| A | `qa/preview-isolation-check.mjs` |
| A | `qa/registration-approval-boundary-check.ts` |
| A | `qa/scrim-operations-check.ts` |
| A | `qa/scrim-slots.spec.js` |
| M | `qa/staging-readiness.mjs` |
| A | `qa/statistics-identity.spec.js` |
| A | `qa/supabase-fetch-check.ts` |
| M | `qa/tournament-read-boundary-check.ts` |
| M | `README.md` |
| A | `scripts/dev-staging.mjs` |
| A | `scripts/lib/staging-development-environment.mjs` |
| M | `scripts/provision-admin.ts` |
| A | `scripts/provision-staging-admin.mjs` |
| M | `supabase/config.toml` |
| A | `supabase/migrations/028_atomic_event_registration.sql` |
| M | `types/database.types.ts` |

## Complete candidate versus current main/deployed baseline: 403 paths

This includes earlier local history as well as the pending follow-up; it must be reviewed as the full production delta. A means added, M modified, D deleted relative to this baseline. Nine historical deletions remain intentional existing history; ordered migrations replace the obsolete standalone schema and protected storage/public reader paths supersede old routes/components.

| Change | File |
| --- | --- |
| M | `.env.example` |
| A | `.github/workflows/verify.yml` |
| M | `.gitignore` |
| M | `app/about/founder/page.tsx` |
| M | `app/about/media-kit/page.tsx` |
| M | `app/about/page.tsx` |
| M | `app/admin/[section]/page.tsx` |
| M | `app/admin/authentication/discord-roles/page.tsx` |
| M | `app/admin/events/page.tsx` |
| M | `app/admin/matches/import/page.tsx` |
| M | `app/admin/matches/page.tsx` |
| M | `app/admin/seasons/page.tsx` |
| A | `app/api/admin/broadcast/route.ts` |
| M | `app/api/admin/discord-links/route.ts` |
| M | `app/api/admin/discord-role-mappings/route.ts` |
| M | `app/api/admin/homepage/route.ts` |
| M | `app/api/admin/matches/preview/route.ts` |
| M | `app/api/admin/matches/route.ts` |
| M | `app/api/admin/platform-event-options/route.ts` |
| A | `app/api/admin/player-team-linking/memberships/[id]/route.ts` |
| A | `app/api/admin/player-team-linking/recalculate/route.ts` |
| A | `app/api/admin/player-team-linking/reviews/[id]/route.ts` |
| A | `app/api/admin/player-team-linking/route.ts` |
| A | `app/api/admin/players/[id]/avatar/route.ts` |
| A | `app/api/admin/point-systems/route.ts` |
| M | `app/api/admin/pubg/import/reset/route.ts` |
| M | `app/api/admin/pubg/watchers/route.ts` |
| M | `app/api/admin/registered-teams/route.ts` |
| M | `app/api/admin/reset/route.ts` |
| M | `app/api/admin/scrims/route.ts` |
| D | `app/api/admin/seed/route.ts` |
| M | `app/api/admin/sponsors/[id]/route.ts` |
| M | `app/api/admin/sponsors/route.ts` |
| M | `app/api/admin/team-reconciliation/route.ts` |
| M | `app/api/admin/team-requests/route.ts` |
| A | `app/api/admin/teams/[id]/access/route.ts` |
| A | `app/api/admin/teams/[id]/aliases/route.ts` |
| A | `app/api/admin/teams/[id]/logo/adopt/route.ts` |
| A | `app/api/admin/teams/[id]/logo/route.ts` |
| A | `app/api/admin/teams/[id]/route.ts` |
| A | `app/api/admin/teams/route.ts` |
| D | `app/api/admin/upload/route.ts` |
| D | `app/api/admin/uploads/r2/presign/route.ts` |
| M | `app/api/admin/uploads/r2/route.ts` |
| M | `app/api/announcements/route.ts` |
| A | `app/api/auth/discord-intent/route.ts` |
| M | `app/api/auth/login/route.ts` |
| M | `app/api/auth/password-reset/route.ts` |
| M | `app/api/auth/providers/route.ts` |
| M | `app/api/auth/session/route.ts` |
| A | `app/api/broadcast/route.ts` |
| M | `app/api/cron/sync-matches/route.ts` |
| M | `app/api/players/[id]/route.ts` |
| M | `app/api/players/route.ts` |
| M | `app/api/pubg/matches/[matchId]/route.ts` |
| M | `app/api/pubg/players/route.ts` |
| M | `app/api/pubg/sync-player/route.ts` |
| M | `app/api/pubg/telemetry/route.ts` |
| M | `app/api/registrations/logo/route.ts` |
| M | `app/api/registrations/route.ts` |
| M | `app/api/scrims/route.ts` |
| M | `app/api/seasons/[id]/route.ts` |
| M | `app/api/seasons/route.ts` |
| M | `app/api/team/players/[playerId]/avatar/route.ts` |
| M | `app/api/team/requests/route.ts` |
| M | `app/api/team/upload/route.ts` |
| M | `app/api/teams/[id]/route.ts` |
| M | `app/api/teams/route.ts` |
| M | `app/api/tournaments/[id]/route.ts` |
| M | `app/api/tournaments/route.ts` |
| M | `app/api/uploads/private/[uploadId]/route.ts` |
| M | `app/api/uploads/r2/route.ts` |
| M | `app/auth/callback/route.ts` |
| M | `app/calendar/page.tsx` |
| M | `app/community/announcements/page.tsx` |
| M | `app/community/highlights/page.tsx` |
| M | `app/compare/page.tsx` |
| M | `app/events/[slug]/page.tsx` |
| M | `app/events/page.tsx` |
| M | `app/fantasy/page.tsx` |
| M | `app/feedback/page.tsx` |
| M | `app/games/[slug]/page.tsx` |
| M | `app/games/page.tsx` |
| M | `app/layout.tsx` |
| M | `app/live-stream/page.tsx` |
| M | `app/login/page.tsx` |
| M | `app/media/[slug]/page.tsx` |
| M | `app/media/page.tsx` |
| M | `app/mvp-ranking/page.tsx` |
| M | `app/news/[slug]/page.tsx` |
| M | `app/news/page.tsx` |
| M | `app/organizations/[slug]/page.tsx` |
| M | `app/organizations/page.tsx` |
| A | `app/overlay/[graphic]/page.tsx` |
| M | `app/page.tsx` |
| M | `app/players/page.tsx` |
| M | `app/privacy/page.tsx` |
| M | `app/pubg-scrims/page.tsx` |
| M | `app/pubg/access/page.tsx` |
| M | `app/pubg/community/page.tsx` |
| M | `app/pubg/compare/page.tsx` |
| M | `app/pubg/events/[slug]/page.tsx` |
| M | `app/pubg/events/page.tsx` |
| M | `app/pubg/fantasy/page.tsx` |
| M | `app/pubg/hall-of-fame/page.tsx` |
| M | `app/pubg/leaderboards/page.tsx` |
| M | `app/pubg/matches/[slug]/page.tsx` |
| M | `app/pubg/players/[playerId]/page.tsx` |
| M | `app/pubg/players/page.tsx` |
| M | `app/pubg/results/page.tsx` |
| M | `app/pubg/seasons/[slug]/page.tsx` |
| M | `app/pubg/teams/[teamId]/page.tsx` |
| M | `app/pubg/teams/page.tsx` |
| M | `app/rankings/page.tsx` |
| M | `app/robots.ts` |
| M | `app/search/page.tsx` |
| M | `app/sitemap.ts` |
| M | `app/sponsor-kit/page.tsx` |
| M | `app/sponsors/[slug]/page.tsx` |
| M | `app/sponsors/page.tsx` |
| M | `app/statistics/page.tsx` |
| M | `app/stream-schedule/page.tsx` |
| M | `app/teams/page.tsx` |
| M | `app/terms/page.tsx` |
| M | `app/tournaments/[tournamentId]/page.tsx` |
| M | `app/tournaments/page.tsx` |
| M | `components/admin/AdminDashboard.tsx` |
| M | `components/admin/AdminDiscordLinkManager.tsx` |
| M | `components/admin/AdminGate.tsx` |
| M | `components/admin/AdminLogin.tsx` |
| M | `components/admin/AdminMatchManager.tsx` |
| A | `components/admin/AdminOverview.tsx` |
| A | `components/admin/AdminPlayerTeamLinkingManager.tsx` |
| M | `components/admin/AdminRegisteredTeamsManager.tsx` |
| M | `components/admin/AdminSidebar.tsx` |
| M | `components/admin/AdminTeamRequestsManager.tsx` |
| A | `components/admin/AdminWorkspaceTabs.tsx` |
| M | `components/admin/AuthProvider.tsx` |
| A | `components/admin/BroadcastControlRoom.tsx` |
| A | `components/admin/BroadcastTemplateEditor.tsx` |
| M | `components/admin/BulkTeamLogoUpload.tsx` |
| A | `components/admin/CompetitionContextPanel.tsx` |
| A | `components/admin/CompetitionScheduleEditor.tsx` |
| A | `components/admin/EventProductionSettings.tsx` |
| A | `components/admin/EventSponsorAssignments.tsx` |
| M | `components/admin/FileUpload.tsx` |
| A | `components/admin/HomepageFeaturedEventsManager.tsx` |
| A | `components/admin/MatchResultEntry.tsx` |
| M | `components/admin/PlatformCatalogManagers.tsx` |
| A | `components/admin/PointSystemManager.tsx` |
| M | `components/admin/PubgImportManager.tsx` |
| A | `components/admin/ScoringSequenceEditor.tsx` |
| A | `components/admin/ScrimSlotEditor.tsx` |
| M | `components/auth/DiscordLoginButton.tsx` |
| M | `components/auth/LoginHubClient.tsx` |
| M | `components/auth/PasswordRecoveryClient.tsx` |
| A | `components/broadcast/broadcast.css` |
| A | `components/broadcast/BroadcastAsset.tsx` |
| A | `components/broadcast/BroadcastExtendedGraphic.tsx` |
| A | `components/broadcast/BroadcastOverlay.tsx` |
| A | `components/broadcast/BroadcastScenes.tsx` |
| A | `components/broadcast/BroadcastSponsorStrip.tsx` |
| M | `components/current-season/CurrentSeasonPageClient.tsx` |
| M | `components/forms/ContactFormClient.tsx` |
| M | `components/home/ReferenceHomePage.tsx` |
| A | `components/JsonLd.tsx` |
| M | `components/mvp/MvpRankingPageClient.tsx` |
| M | `components/platform/PlatformPages.tsx` |
| M | `components/pubg/ComparePageClient.tsx` |
| M | `components/pubg/PubgHubUI.tsx` |
| M | `components/pubg/PubgPublicPages.tsx` |
| M | `components/pubg/PubgShowcasePages.tsx` |
| M | `components/public/competition/CompetitionLeaderboardsPage.tsx` |
| M | `components/public/competition/CompetitionPlayersPage.tsx` |
| M | `components/public/competition/CompetitionTeamsPage.tsx` |
| D | `components/public/CompetitionReferencePages.tsx` |
| M | `components/public/content/EventsReferencePage.tsx` |
| D | `components/public/content/index.ts` |
| M | `components/public/content/MediaReferencePage.tsx` |
| M | `components/public/content/NewsReferencePage.tsx` |
| M | `components/public/content/SponsorsReferencePage.tsx` |
| D | `components/public/ContentReferencePages.tsx` |
| M | `components/public/PubgLaunchPages.tsx` |
| M | `components/public/PublicDesignSystem.tsx` |
| M | `components/results/MatchResultDetailClient.tsx` |
| M | `components/SiteHeaderClient.tsx` |
| M | `components/statistics/StatisticsPageClient.tsx` |
| M | `components/team/TeamPanelClient.tsx` |
| M | `components/team/TeamRegistrationPageClient.tsx` |
| M | `components/tournaments/TournamentDetailClient.tsx` |
| M | `components/ui/ManagedImage.tsx` |
| M | `components/ui/MotionSystem.tsx` |
| M | `components/ui/TeamAvatar.tsx` |
| A | `config/certs/supabase-prod-ca-2021.crt` |
| A | `docs/admin-broadcast-completion.md` |
| A | `docs/authentication-verification.md` |
| A | `docs/draft-pull-request.md` |
| A | `docs/event-day-operations.md` |
| A | `docs/event-day-readiness-2026-11-06.md` |
| A | `docs/global-production-readiness.md` |
| A | `docs/master-development-verification.md` |
| A | `docs/platform-audit.md` |
| A | `docs/platform-operations.md` |
| A | `docs/platform-stabilization.md` |
| A | `docs/platform-verification.md` |
| A | `docs/preview-resource-isolation.md` |
| A | `docs/production-deployment-report.md` |
| A | `docs/release-audit-2026-11-05.md` |
| A | `docs/release-audit.md` |
| A | `docs/release-file-manifest-2026-11-05.md` |
| A | `docs/release-file-manifest.md` |
| A | `docs/staging-unblock-full-report.md` |
| A | `docs/staging-verification.md` |
| A | `docs/templates/scrim-offline-results.csv` |
| A | `docs/templates/scrim-offline-schedule.csv` |
| A | `docs/templates/scrim-offline-slots.csv` |
| M | `knip.json` |
| M | `lib/admin-api.ts` |
| M | `lib/admin-auth.ts` |
| A | `lib/admin-competition-view.ts` |
| A | `lib/admin-navigation.ts` |
| M | `lib/admin-season-days.ts` |
| A | `lib/audit-log-writer.ts` |
| M | `lib/audit-logs.ts` |
| M | `lib/auth-errors.ts` |
| A | `lib/auth-session-events.ts` |
| M | `lib/bravo-feed-import.ts` |
| M | `lib/bravo-live-derivations.ts` |
| M | `lib/bravo-season-sync.ts` |
| A | `lib/broadcast-server.ts` |
| A | `lib/broadcast-studio.ts` |
| A | `lib/broadcast-template.ts` |
| A | `lib/broadcast.ts` |
| A | `lib/canonical-image-upload.ts` |
| A | `lib/canonical-teams.ts` |
| M | `lib/competition-relational.ts` |
| M | `lib/competition-scoring.ts` |
| M | `lib/data.ts` |
| M | `lib/discord-auth.ts` |
| M | `lib/discord-login.ts` |
| M | `lib/discord-role-mapping.ts` |
| M | `lib/discord-role-sync.ts` |
| M | `lib/document-store.ts` |
| A | `lib/event-datetime.ts` |
| A | `lib/event-production-server.ts` |
| A | `lib/event-production.ts` |
| A | `lib/event-registration-transaction.ts` |
| A | `lib/event-schedule.ts` |
| A | `lib/homepage-events.ts` |
| A | `lib/image-validation.ts` |
| M | `lib/login-client.ts` |
| A | `lib/login-failure-response.ts` |
| A | `lib/match-result-validation.ts` |
| M | `lib/metadata.ts` |
| A | `lib/nepal-datetime.ts` |
| M | `lib/official-tournament-import.ts` |
| M | `lib/platform-cms.ts` |
| M | `lib/platform-content.ts` |
| M | `lib/platform-hub.ts` |
| A | `lib/player-avatar-service.ts` |
| A | `lib/player-profile-input.ts` |
| A | `lib/player-team-link-policy.ts` |
| A | `lib/player-team-linking.ts` |
| A | `lib/point-system-input.ts` |
| A | `lib/preview-resource-policy.js` |
| M | `lib/profile-provisioning.ts` |
| M | `lib/pubg-hub.ts` |
| M | `lib/pubg-import-candidates.ts` |
| M | `lib/pubg-import-relational.ts` |
| A | `lib/pubg-public.ts` |
| M | `lib/pubg-rankings.ts` |
| M | `lib/pubg-sync.ts` |
| M | `lib/pubg.ts` |
| A | `lib/public-asset-cleanup.ts` |
| A | `lib/public-asset-key.ts` |
| A | `lib/public-asset-url.ts` |
| M | `lib/public-content.ts` |
| A | `lib/public-event-policy.ts` |
| A | `lib/public-links.ts` |
| A | `lib/public-match.ts` |
| M | `lib/public-scrims.ts` |
| M | `lib/r2/client.ts` |
| M | `lib/r2/storage.ts` |
| M | `lib/r2/types.ts` |
| M | `lib/ranking-sort.ts` |
| A | `lib/readiness-probe.ts` |
| M | `lib/realtime-hooks.tsx` |
| A | `lib/registration-approval-policy.ts` |
| A | `lib/registration-approval-state.ts` |
| A | `lib/registration-approval.ts` |
| A | `lib/registration-submission-state.ts` |
| A | `lib/request-origin.ts` |
| M | `lib/revalidate-public.ts` |
| A | `lib/scoring-rules.ts` |
| A | `lib/scrim-input.ts` |
| A | `lib/scrim-slots.ts` |
| M | `lib/search-service.ts` |
| M | `lib/season-derived-sync.ts` |
| D | `lib/seed-data.ts` |
| A | `lib/sponsor-links.ts` |
| A | `lib/structured-data.ts` |
| A | `lib/supabase-auth-cookies.ts` |
| M | `lib/supabase-auth-server.ts` |
| M | `lib/supabase-document-runtime.ts` |
| M | `lib/supabase/client.ts` |
| M | `lib/supabase/env.ts` |
| M | `lib/supabase/proxy.ts` |
| A | `lib/supabase/request-fetch.ts` |
| M | `lib/supabase/server-env.ts` |
| M | `lib/supabase/server.ts` |
| M | `lib/supabase/service-role-client.ts` |
| A | `lib/team-logo-approval.ts` |
| A | `lib/team-logo-matching.ts` |
| A | `lib/team-logo-service.ts` |
| A | `lib/team-mapping-state.ts` |
| M | `lib/team-registration.ts` |
| M | `lib/tournament-standings.ts` |
| A | `lib/tournament-workspace.ts` |
| M | `lib/types.ts` |
| M | `lib/upload-config.ts` |
| M | `lib/upload-records.ts` |
| A | `lib/use-hydrated.ts` |
| M | `lib/user-facing-errors.ts` |
| M | `lib/youtube-service.ts` |
| M | `next.config.js` |
| M | `package-lock.json` |
| M | `package.json` |
| M | `proxy.ts` |
| A | `qa/admin-data-check.ts` |
| A | `qa/admin-provisioning-check.ts` |
| A | `qa/admin-ui-integrity-check.ts` |
| A | `qa/admin-workspaces.spec.js` |
| A | `qa/atomic-match-check.mjs` |
| A | `qa/auth-account-readiness.mjs` |
| A | `qa/auth-callback-rejection-check.mjs` |
| A | `qa/auth-offline-check.ts` |
| M | `qa/auth-production-e2e.mjs` |
| A | `qa/auth-provider.spec.js` |
| A | `qa/auth-refresh-check.ts` |
| A | `qa/auth-staging-e2e.mjs` |
| A | `qa/broadcast-check.ts` |
| A | `qa/broadcast-ui.spec.js` |
| A | `qa/database-hardening-check.mjs` |
| M | `qa/discord-role-mapping-check.ts` |
| M | `qa/environment-connectivity.mjs` |
| A | `qa/event-registration-transaction-check.mjs` |
| A | `qa/image-pipeline-check.ts` |
| A | `qa/integration/mahasangram-production-check.ts` |
| A | `qa/interaction-hydration.spec.js` |
| M | `qa/live-qa.spec.js` |
| A | `qa/local-release-runtime.mjs` |
| A | `qa/local-staging-environment-check.mjs` |
| A | `qa/login-route-check.ts` |
| M | `qa/mahasangram-publication-check.ts` |
| A | `qa/master-workflows.spec.js` |
| A | `qa/migration-preflight.mjs` |
| A | `qa/motion-hydration.spec.js` |
| A | `qa/player-team-linking-check.ts` |
| A | `qa/preview-isolation-check.mjs` |
| A | `qa/pubg-api-security-check.ts` |
| M | `qa/pubg-rankings-check.ts` |
| A | `qa/public-consistency-check.ts` |
| M | `qa/reference-ui.spec.js` |
| A | `qa/registration-approval-boundary-check.ts` |
| A | `qa/registration-approval-check.ts` |
| A | `qa/release-inventory.mjs` |
| A | `qa/release-source-check.mjs` |
| A | `qa/scoring-sql-check.mjs` |
| A | `qa/scrim-operations-check.ts` |
| A | `qa/scrim-slots.spec.js` |
| A | `qa/secret-scan.mjs` |
| A | `qa/seo-check.ts` |
| A | `qa/staging-connectivity-evidence.mjs` |
| A | `qa/staging-env-presence.mjs` |
| A | `qa/staging-readiness.mjs` |
| A | `qa/staging-target.mjs` |
| A | `qa/statistics-identity.spec.js` |
| A | `qa/supabase-fetch-check.ts` |
| M | `qa/supabase-readiness.mjs` |
| A | `qa/team-logo-check.ts` |
| A | `qa/team-mapping-state-check.ts` |
| A | `qa/tournament-read-boundary-check.ts` |
| M | `README.md` |
| M | `scripts/backup-production-public.mjs` |
| M | `scripts/demo-data-lib.ts` |
| A | `scripts/dev-staging.mjs` |
| A | `scripts/lib/staging-development-environment.mjs` |
| A | `scripts/lib/verified-database-connection.mjs` |
| M | `scripts/provision-admin.ts` |
| A | `scripts/provision-staging-admin.mjs` |
| A | `scripts/reconcile-mahasangram-relational.ts` |
| D | `scripts/seed-demo-data.ts` |
| M | `supabase/config.toml` |
| A | `supabase/migrations/022_player_team_match_history_linking.sql` |
| A | `supabase/migrations/023_private_document_and_publication_boundary.sql` |
| A | `supabase/migrations/024_public_data_and_authorization_hardening.sql` |
| A | `supabase/migrations/025_event_player_statistics.sql` |
| A | `supabase/migrations/026_versioned_scoring_decisions.sql` |
| A | `supabase/migrations/027_atomic_match_results.sql` |
| A | `supabase/migrations/028_atomic_event_registration.sql` |
| M | `supabase/readiness-recovery.sql` |
| D | `supabase/schema.sql` |
| M | `types/database.types.ts` |

## Explicit exclusions and review boundaries

- AGENTS.md is preserved as untracked user-supplied repository guidance, outside this application candidate. No user work was deleted.
- .env.local, .env.staging.local, all credentials, node_modules, .next, test output and qa-artifacts remain ignored and are excluded.
- The current audit, consolidated full report and this manifest are intentionally part of the follow-up. The Nov5 versions are retained separately as history.
- Historical migrations 001–027 remain tracked/ordered. New forward-only migration 028 is pending and was executed only in isolated PostgreSQL; the remote ledger, conflict preflight and migration acceptance remain unknown. No lockfile edit was introduced.
- File hashes, exact path sets, whitespace checks and mechanical findings are retained in ignored qa-artifacts/blocker-recheck/release-snapshot-2026-11-13.json. Hashes are captured after documentation is finalized; no self-referential hash is embedded here.
- This manifest is a review inventory, not proof that real staging or production acceptance passed. See [release audit](release-audit.md), [consolidated full report](staging-unblock-full-report.md) and [execution report](production-deployment-report.md).
