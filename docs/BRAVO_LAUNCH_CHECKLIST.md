# BRAVO Gaming Esports - Launch Checklist

## 17 November 2026 checkpoint

- [x] Reconfirm local and remote feature SHA `e025f9cdf85bb4aa618b4c0c1e7242aa783b6d9d` and actual remote main SHA `c7311530a17cbb63ba5b4e3df0ef2da44acb7953`.
- [x] Reconfirm GitHub Actions run `43519330298` passed for the exact feature SHA.
- [x] Re-run typecheck, 26-command QA, secret scan, build, dependency audit, auth/workspace/master/browser fixtures and the 38-mode broadcast browser check.
- [x] Confirm no files are staged and no remote mutation occurred.
- [x] Approve and apply V1 Standard Protection to canonical Preview; exact Preview and branch alias redirect anonymous requests while production stays public.
- [x] Relink the ignored local Vercel workspace metadata to the verified canonical project and confirm it read-only; no deployment created.
- [x] Disconnect Git from duplicate B (V3) and duplicate A (V2) while preserving projects, deployments and duplicate A's `.com.np` assignments.
- [x] Create the dedicated staging R2 bucket pair and verify functional authenticated write/read/cleanup.
- [ ] Create a staging-pair-only R2 token and prove production-bucket denial before Preview binding.
- [ ] Supply authorized read-only staging ledger/catalog access and complete the object-level drift matrix.
- [ ] Verify backup/restore in an isolated database and separately approve exact forward-only staging SQL.
- [ ] Complete real admin, Discord, tournament, scrim, registration, scoring, leaderboard, R2, PUBG and OBS acceptance.
- [ ] Approve commit, push, PR, merge, production SQL and production deployment as separate operations.

See [final owner actions](BRAVO_FINAL_OWNER_ACTIONS.md), [staging acceptance](BRAVO_FINAL_STAGING_ACCEPTANCE.md) and the [deployment runbook](BRAVO_FINAL_DEPLOYMENT_RUNBOOK.md).

**Branch:** `codex/platform-completion-20261104`

**Audited commit:** `e025f9cdf85bb4aa618b4c0c1e7242aa783b6d9d`

**Current decision:** Production launch **BLOCKED**

**Rule:** Commit, push, migration, provisioning, merge and deployment are independent approval gates.

Check a box only when redacted evidence is attached. Never paste secret values into this file, chat, Git history or logs.

## Gate 0 - Preserve the release candidate

- [x] Local release commit exists.
- [x] Feature branch exists remotely at the audited SHA.
- [x] `origin/main` was not merged or modified.
- [x] No production migration was applied.
- [x] No production deployment was initiated from the audited branch.
- [ ] Keep further feature-branch pushes blocked until Gate 3 passes.
- [ ] Do not merge the older open PR #1 as-is; it is superseded.

## Gate 1 - Read-only staging database truth

Target only Supabase project `yppefayrepkqpqtprbqa`.

- [ ] Configure a valid `SUPABASE_ACCESS_TOKEN` locally, or a staging-verified `DATABASE_URL`/`DIRECT_URL`.
- [ ] Confirm the credential identifies the staging project before querying.
- [ ] Export the actual migration ledger.
- [ ] Export table/column/index/constraint inventory.
- [ ] Export RLS policies, grants, function owners and execution grants.
- [ ] Confirm the current state of migrations 001-028.
- [ ] Compare the remote contract with `types/database.types.ts`.
- [ ] Record all drift without editing historical migration files.

**Pass evidence:** redacted ledger/schema/policy diff with project ref visible.

**Current status:** BLOCKED - management access returned 401 and configured database URLs failed the staging-target guard.

## Gate 2 - Backup, compatibility plan and approved staging migration

- [ ] Create a dated staging database backup.
- [ ] Verify the backup is readable and document its restore procedure.
- [ ] Define restore point, owner, storage location and retention.
- [ ] Prepare only forward migrations needed after the ledger diff.
- [ ] Review destructive statements, locks, backfills and rollback implications.
- [ ] Re-run migrations 026, 027 and 028 in isolated PGlite if changed.
- [ ] Obtain explicit owner approval for the exact migration set.
- [ ] Apply to staging only.
- [ ] Re-read ledger, schema, policies, grants and RPCs after application.
- [ ] Do not touch production.

**Pass evidence:** backup record, approved SQL checksums and before/after staging schema diff.

**Current status:** BLOCKED.

## Gate 3 - Vercel Preview and R2 isolation

- [ ] Authenticate Vercel CLI or an authorized Vercel connector locally.
- [x] Confirm `bravo-gaming-esports-nextjs` serves the exact release SHA in Preview.
- [x] Confirm the Preview build guard rejects non-staging Supabase URL/known shared R2 names in source and local regression tests.
- [x] Confirm anonymous admin API access is denied on the successful Preview.
- [ ] Diagnose failed deployments for `bravo-gaming-esports` and `bravo-gaming` using authorized logs.
- [ ] Restore R2 on the successful Preview; the safe nonexistent-object read currently returns HTTP 500.
- [ ] Inspect effective variables for the exact Preview branch/deployment.
- [ ] Confirm `NEXT_PUBLIC_SUPABASE_URL` project ref is `yppefayrepkqpqtprbqa`.
- [ ] Confirm public and private R2 bucket names are dedicated staging resources.
- [ ] Confirm staging R2 credentials are least privilege.
- [ ] Confirm Preview cannot access production Supabase or shared production R2 resources.
- [ ] Keep Vercel deployment protection enabled.
- [ ] Configure `VERCEL_AUTOMATION_BYPASS_SECRET` locally for QA if needed.
- [ ] Confirm no secret or service-role value is exposed to `NEXT_PUBLIC_*` variables.

**Pass evidence:** redacted effective-environment report and resource identifiers.

**Current status:** PARTIAL/BLOCKED. One exact-SHA Preview is reachable and its guard ran; two projects failed and effective bindings/token scopes remain inaccessible.

## Gate 4 - Discord and administrator provisioning

- [ ] In staging Supabase, set Discord Client ID to numeric Application ID `1530095874594836581`.
- [ ] Configure the matching Discord Client Secret privately.
- [ ] Register `https://yppefayrepkqpqtprbqa.supabase.co/auth/v1/callback` in Discord.
- [ ] Confirm the existing `sangamka076@gmail.com` Auth UUID remains unchanged.
- [ ] Determine required linked-profile fields after schema compatibility.
- [ ] Obtain explicit approval before creating/linking/elevating the profile.
- [ ] Link the existing Auth identity; do not reset it automatically.
- [ ] Configure `QA_STAGING_ADMIN_EMAIL` and `QA_STAGING_ADMIN_PASSWORD` locally.
- [ ] Verify email login.
- [ ] Verify Discord login and callback.
- [ ] Verify cookie/session refresh and persistence.
- [ ] Verify admin dashboard and protected APIs.
- [ ] Verify logout invalidates access.
- [ ] Verify a non-admin cannot access admin operations.

**Pass evidence:** redacted timestamps, HTTP outcomes, Auth UUID/profile linkage and role-denial results.

**Current status:** BLOCKED; Discord configuration is BROKEN.

## Gate 5 - Core platform staging acceptance

- [ ] Create, read, update and archive a staging tournament/event.
- [ ] Create, read, update and archive a staging scrim.
- [ ] Verify Nepal-time date rendering and day boundaries.
- [ ] Create/update a staging team and players.
- [ ] Verify aliases, logo, roster and membership persistence.
- [ ] Submit a real staging registration.
- [ ] Approve/reject registration through authorized workflow.
- [ ] Exercise capacity and duplicate/idempotency behavior concurrently.
- [ ] Verify rollback leaves no partial team/event/registration state.
- [ ] Create point system and match.
- [ ] Preview manual scoring.
- [ ] Publish result atomically.
- [ ] Confirm stale revision conflict.
- [ ] Confirm audit history and restore/recalculation.
- [ ] Confirm public leaderboard/results use published values only.
- [ ] Remove/archive test records using normal application workflows.

**Pass evidence:** record IDs, revisions, audit entries, public URLs and cleanup log.

**Current status:** BLOCKED.

## Gate 6 - R2 acceptance

- [ ] Upload a valid public staging image.
- [ ] Confirm public delivery and correct content type/cache behavior.
- [ ] Reject invalid extension/MIME/oversize uploads.
- [ ] Upload a valid private object.
- [ ] Confirm authorized delivery succeeds.
- [ ] Confirm unauthenticated and cross-team access is denied.
- [ ] Delete both test objects and verify deletion.
- [ ] Confirm database upload records and audit entries are correct.

**Pass evidence:** redacted object keys, HTTP results and deletion confirmation.

**Current status:** BLOCKED.

## Gate 7 - PUBG acceptance

- [ ] Configure `PUBG_API_KEY` and intended `PUBG_SHARD` locally/server-side.
- [ ] Obtain an owner-permitted PUBG match ID.
- [ ] Fetch and parse the real match without logging the API key.
- [ ] Review candidate team/player mappings.
- [ ] Import into staging.
- [ ] Verify kills, damage, placement, roster and telemetry-derived fields.
- [ ] Exercise reimport/repair idempotently.
- [ ] Publish only after review.
- [ ] Verify public results and leaderboard calculation.

**Pass evidence:** permitted match ID, import/audit IDs and reviewed aggregate comparison.

**Current status:** BLOCKED - no permitted match ID.

## Gate 8 - Broadcast and OBS acceptance

- [ ] Publish real staging tournament, match, team, player, schedule and sponsor records.
- [ ] Verify the public broadcast snapshot excludes drafts/private fields.
- [ ] Exercise control-room preview, ready, show, hide, reveal and clear.
- [ ] Verify all 38 graphic routes with real published records.
- [ ] Verify paging for road-to-finals and other multi-page graphics.
- [ ] Verify countdown/time behavior in Nepal time.
- [ ] Add `/overlay/program` as an OBS Browser Source.
- [ ] Verify 1920x1080 layout, transparency, refresh/reconnect and scene switching in actual OBS Studio.
- [ ] Confirm no private Preview data appears on a public overlay.

**Pass evidence:** route matrix, screenshots/video and OBS operator sign-off.

**Current status:** BLOCKED.

## Gate 9 - Final exact-snapshot QA

- [ ] Freeze the intended release snapshot.
- [ ] Review `git diff --cached --name-status` against `docs/release-file-manifest.md`.
- [ ] Confirm no unrelated or generated files are staged.
- [ ] Run `npm run qa:secrets`.
- [ ] Run staged whitespace/error checks.
- [ ] Run typecheck and lint; review all warnings.
- [ ] Run unit/integration and PGlite tests.
- [ ] Run production build.
- [ ] Run public, client, Auth, workspace, master-workflow and broadcast browser QA.
- [ ] Run `npm audit` and assess any advisory.
- [x] Confirm GitHub Actions result for the exact SHA: run `43519330298`, conclusion `success`.
- [ ] Update all PASS/FAIL/BLOCKED evidence documents.

**Current status:** Prior local snapshot passed; repeat after approved staging fixes and final documentation.

## Gate 10 - PR, merge and production rollout

- [ ] Obtain explicit approval to open/update the intended draft PR.
- [ ] Require code review and all branch protections/checks.
- [ ] Reconfirm production environment values and resources separately from Preview.
- [ ] Create and verify production backup.
- [ ] Obtain explicit approval for the exact production migration set.
- [ ] Apply production migrations with monitoring and restore operator available.
- [ ] Obtain explicit approval to merge main.
- [ ] Obtain explicit approval to deploy production.
- [ ] Run production smoke tests without destructive records.
- [ ] Monitor Auth, error logs, rate limits, database, R2, PUBG and overlays.
- [ ] Record release SHA, deployment ID, migration ledger and rollback decision.

**Current status:** BLOCKED.

## Launch sign-off

| Authority | Name | Decision | Date | Evidence link |
| --- | --- | --- | --- | --- |
| Product owner |  |  |  |  |
| Engineering |  |  |  |  |
| Database operator |  |  |  |  |
| Broadcast operator |  |  |  |  |
| Release operator |  |  |  |  |

No production launch is authorized until every required gate is checked and the product owner records an explicit deployment approval.
