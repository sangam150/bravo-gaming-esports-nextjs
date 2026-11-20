# Bravo Gaming Esports — final release readiness

## Administrator login remediation — 21 November 2026

Login-fix implementation commit: `41ab4017835e3a0c50a40fe951961215a817b847`.

- Guarded localhost uses staging project `yppefayrepkqpqtprbqa`; the login page returns HTTP 200 and an intentionally invalid credential attempt returns HTTP 401 with the correct safe message, not HTTP 503.
- Authoritative data-plane schema reads found that staging has the legacy `profiles.status` model but lacks modern `profiles.is_active` and `profiles.role_source`. All other identity fields required by the login/session path are present.
- Session verification and protected-route identity resolution now use one fail-closed compatibility reader: modern schema remains primary; fallback is permitted only for the verified missing-column errors and maps only `status=active` to an active identity. Suspended, absent, malformed, unauthorized and unrelated-error cases remain denied.
- The existing confirmed Auth identity was preserved. A single linked legacy profile was created as `admin` with `status=active`, using the Auth UUID required by `profiles_id_fkey`; one `admin_profile_provisioned` audit row was verified. Rerunning the guarded provisioner reports `already_provisioned` and does not duplicate the profile.
- The owner password was not reset or exposed. `QA_STAGING_ADMIN_PASSWORD` remains absent, so successful password login, refresh, dashboard authorization and logout are still **BLOCKED for automated evidence** until the owner configures that ignored variable or performs a witnessed manual login.
- Local validation passes: 27-command QA chain, typecheck, production build with 147 routes, secret scan across 580 files, and ESLint with zero errors and the same nine existing warnings.

No migration, Discord provider change, production record change, main merge or production deployment occurred. The schema ledger, R2 isolation, Discord, PUBG, real workflow and OBS launch blockers remain unchanged.

## Final gap-closure execution — 18 November 2026

This section is the current authoritative release report and supersedes older checkpoint statements below where they differ.

- Final preserved feature-branch HEAD: `f322affa3c9a864621afab15af9d452331384171`.
- Application/safety implementation commit: `5ceece39ddc18bc8d57578c91dbaa8e69be8f503`.
- Exact final-HEAD GitHub Actions run: `44117785592`, completed successfully.
- Exact final-HEAD canonical Preview: `dpl_HffsSeACPP2m7UKDDfwxwMZW4UBN`, READY and protected.
- Production remains unchanged at `c7311530a17cbb63ba5b4e3df0ef2da44acb7953`, deployment `dpl_7ytcSWrPN23ugzduYznDTcuygJd4`.
- The 14-document evidence refresh is included in finalization; `AGENTS.md` is intentionally preserved with the implementation commit as required repository guidance.
- No remote migration, account/profile elevation, OAuth provider change, main merge or production deployment occurred.

### Release table

| Feature / system | Local status | Real staging status | Evidence | Remaining work | Owner action | Launch blocker |
| --- | --- | --- | --- | --- | --- | --- |
| Source, CI and build | PASS | PASS for protected deployment | Local verification and exact-SHA Actions runs `44116203600` and `44117785592` passed; Preview READY | None for preservation | Review feature branch | No |
| Vercel topology/protection | PASS | PASS | Canonical is the only Git-connected project; anonymous exact/branch Preview requests return 302; protected probes return 200 | Rotate/revoke automation bypass when QA ends | Preserve Standard Protection | No |
| Preview Supabase binding | PASS by target guard | PASS WITH LIMITATION | Preview build exposes staging Supabase variable names and no PostgreSQL variables; staging Auth health/settings return 200 with configured key | Prove authoritative ledger/catalog through staging-only SQL | Supply valid access below | Yes |
| Migration ledger 001–028 | PASS locally | BLOCKED / UNKNOWN | Inspector safety PASS; `DIRECT_URL` rejected before network because it identifies a non-staging target; management token returns `Invalid access token` | Run reviewed Dashboard SQL or least-privilege staging connection; create exact drift matrix | Provide access/export | Yes |
| Backup and restore | Plan documented | NOT EXECUTED | No authoritative SQL/backup access; no isolated restore evidence | Obtain target backup, hash dumps, restore to disposable database and rehearse approved forward repair | Approve after evidence | Yes |
| Administrator authentication | PASS locally and profile linked | BLOCKED for password acceptance | Staging Auth responds; confirmed Auth identity now has one audited active `admin` legacy profile; `QA_STAGING_ADMIN_PASSWORD` is absent | Deploy the compatibility fix, then test login/refresh/API denial/logout with the owner password | Configure password locally or perform witnessed manual login | Yes |
| Discord OAuth/roles | Fixture tests PASS | FAIL | Provider enabled and callback targets staging, but redirect Client ID is email-shaped; OAuth Client ID/Secret absent locally | Verify ownership of application `1530095874594836581`, configure matching secret/callback, test guild roles | Approve provider change and supply secret locally | Yes |
| Tournament/scrim/team/player workflows | PASS locally | BLOCKED | Current staging public data contains zero published events, calendar items, scrims and tournaments; no admin session/test accounts | Run authorized staging-only CRUD, concurrency, roster and cleanup after schema/auth recovery | Supply designated accounts | Yes |
| Scoring/publication/leaderboards | Migrations 026–028 and fixtures PASS | BLOCKED | Staging pages/API show zero published matches, ranked teams and ranked players; required RPC/schema absent | Apply only approved forward recovery, then verify publication, conflicts, audit/restore and public totals | Approve exact migration after ledger/backup | Yes |
| R2 direct staging buckets | PASS | PASS WITH ISOLATION FAILURE | Dedicated staging buckets exist and earlier put/get/MIME/cleanup passed; fresh HeadBucket returns 200 for both staging and both production buckets; token can also list buckets | Create Object Read & Write token restricted to exactly the staging pair and prove production denial | Provide `CLOUDFLARE_API_TOKEN` or create scoped token | Yes |
| Preview application R2 | PASS fail-closed | BLOCKED | Canonical Preview has no R2 environment values; broad credential was not bound | Bind only the new scoped token, then run application public/private upload/download/auth/size/MIME/cleanup | Approve Preview-only binding after scope proof | Yes |
| PUBG import | PASS locally | BLOCKED | PUBG key is present, but no permitted `QA_STAGING_PUBG_MATCH_ID` | Import/reimport/repair one authorized match and review mappings/results | Supply permitted match ID | Yes |
| Broadcast and OBS | 38 graphics/program fixture QA PASS | PARTIAL / BLOCKED | All 38 protected overlay routes return 200; `/api/broadcast` returns 503 because staging publication schema/data is unavailable; no actual OBS operator acceptance | Publish reviewed staging results and perform 1920×1080 OBS transparency/update/recovery test | Provide operator and sign-off | Yes |
| Public pages/mobile/SEO | PASS WITH FINDINGS | PASS WITH FINDINGS | 16 required staging routes return 200; five mobile samples have no horizontal overflow, broken images or missing-href links; sitemap 35/35 passes; Discord invite redirects 301 | Correct canonical origin after a valid owned domain is chosen; production MVP/API timeouts require backend recovery | Choose/prove a domain | Yes |
| Custom domain | FAIL | FAIL | `bravo-gaming.esports` is not an IANA-delegated TLD; `bravogamingesports.com`, its `www` host, `bravoesports.com.np` and its `www` host return NXDOMAIN; `.com` registry RDAP returns 404; Vercel assignment does not prove registrar ownership | Register/prove one valid domain, then configure reviewed DNS/TLS and `NEXT_PUBLIC_SITE_URL` | Provide registrar control and domain choice | Yes |
| Production surface | Existing Vercel alias available | FAIL for backend readiness | Production homepage/most sampled pages return 200, but `/api/leaderboard`, `/api/home` and `/mvp-ranking` exceeded 20-second checks; production remains at old main SHA | Independently inspect production ledger/backend and verify restorable backup before any release | Separate production approvals | Yes |

### Work completed during this execution

1. Reconfirmed final Git/CI/Preview identity and that main/production remain unchanged.
2. Revalidated the staging inspector safety controls; the production-target guard stopped the configured URL before connection.
3. Revalidated the management token and recorded the explicit `Invalid access token` failure.
4. Revalidated R2 scope without object mutation: both staging and both production buckets are accessible, proving the credential is not isolated.
5. Inspected canonical Preview variable metadata: staging Supabase values are present; PostgreSQL, R2 and `NEXT_PUBLIC_SITE_URL` values are absent.
6. Ran fresh production and protected-staging browser checks across homepage, events, calendar, scrims, registration, tournaments, leaderboards, players, MVP, results, news, media, community, rules, privacy and terms.
7. Verified staging desktop/mobile layout health, metadata presence, images and required links; sitemap routes passed 35/35.
8. Investigated the homepage/leaderboard report. It is not currently reproducible: homepage shows “Players pending,” PUBG leaderboard reports zero ranked players, and both legacy APIs return zero rows. The homepage PUBG hub and legacy API remain separate pipelines and should be consolidated later to prevent future divergence.
9. Verified current public competition content: staging intentionally shows zero published official events/schedules/scrims/tournaments/results rather than fabricated records.
10. Rechecked domain delegation, DNS and public registry evidence.
11. Reconciled the current status documents while preserving older dated sections as historical evidence.
12. Added fail-closed modern/legacy profile compatibility, provisioned and audited the existing staging admin profile, and verified idempotent provisioning without changing the password.

### Real staging tests passed

- Protected Preview access with security enabled.
- Staging Supabase keyed Auth health/settings connectivity.
- Sixteen required public routes at HTTP 200.
- Thirty-five sitemap paths with zero HTTP failures or redirects.
- Five mobile route samples with no horizontal document overflow, broken images or missing-href anchors.
- All 38 overlay route availability checks.
- Anonymous admin broadcast denial at HTTP 401.
- Direct functional staging R2 operations from the earlier controlled test, with cleanup confirmed; credential isolation itself fails.

### Exact remaining credentials/access by name only

- Valid `SUPABASE_ACCESS_TOKEN`, or staging-only least-privilege `DIRECT_URL` / `DATABASE_URL` for `yppefayrepkqpqtprbqa`.
- `CLOUDFLARE_API_TOKEN` / `CF_API_TOKEN`, or a newly created staging-only `R2_ACCESS_KEY_ID` and `R2_SECRET_ACCESS_KEY`.
- `QA_STAGING_ADMIN_PASSWORD`.
- `DISCORD_CLIENT_ID` and `DISCORD_CLIENT_SECRET` matching application `1530095874594836581`.
- `QA_STAGING_TEAM_EMAIL` and `QA_STAGING_TEAM_PASSWORD`.
- `QA_STAGING_PLAYER_EMAIL` and `QA_STAGING_PLAYER_PASSWORD`.
- `QA_STAGING_PUBG_MATCH_ID`.
- Registrar/DNS access for the selected valid production domain.
- An OBS Studio operator and recorded acceptance sign-off.

### Required approvals

Previous infrastructure authorization does not authorize new provider or production changes. The staging administrator profile link/elevation is complete. Separate approval remains required for: the exact staging migration set after ledger/backup/rehearsal; Discord provider changes; Preview-only isolated R2 binding; domain purchase/DNS/TLS changes; a reviewed PR; production ledger inspection/backup; production migrations; main merge; and production deployment.

### Backup, rollback and production recommendation

Production backup/rollback readiness is **BLOCKED**. A plan exists, but no authoritative production ledger inspection, verified backup, dump hashes, disposable restore or rollback rehearsal has been completed. Preserve current production deployment `dpl_7ytcSWrPN23ugzduYznDTcuygJd4` as the immediate Vercel rollback target; this does not substitute for a database restore.

**Production recommendation: NO-GO.** The feature branch is preserved and locally/CI healthy, but genuine staging acceptance is blocked by database visibility/recovery, administrator/Discord access, isolated R2 credentials, real CRUD/scoring/PUBG data, actual OBS acceptance, valid domain ownership and production backup evidence.

Evidence refreshed: **21 November 2026, NPT**
Branch: `codex/platform-completion-20261104`
Audited final remote feature SHA: `f322affa3c9a864621afab15af9d452331384171`
Verified main SHA: `c7311530a17cbb63ba5b4e3df0ef2da44acb7953`

## Executive decision

The preserved application source and final safety/report candidate are locally healthy, committed and pushed, but the release is **not ready to merge or deploy**. Exact-final-SHA GitHub Actions run `44117785592` passed. Canonical protected Preview deployment `dpl_HffsSeACPP2m7UKDDfwxwMZW4UBN` is READY at the same SHA. Real staging acceptance remains blocked by schema and credential prerequisites, not by a confirmed new application defect.

Owner-authorized changes completed: canonical Standard Protection; Git disconnection on both duplicate Vercel projects; creation and functional testing of the dedicated staging R2 bucket pair; one protected feature-branch push; and the resulting canonical Preview. No DNS record, Production environment binding, Supabase object, administrator account, OAuth provider, main branch, production migration or production deployment was changed.

## Release decisions

| Decision | Status | Evidence/reason |
| --- | --- | --- |
| LOCAL SOURCE READY | YES | Refreshed checks pass; exact 24-path candidate committed; only separate `AGENTS.md` remains untracked |
| GITHUB FEATURE BRANCH READY | YES | Local and remote branch equal `f322affa…`; exact-SHA CI run `44117785592` passed |
| VERCEL PREVIEW PROTECTED | YES | V1 completed: canonical `ssoProtection.deploymentType=prod_deployment_urls_and_all_previews`; exact Preview and branch alias return anonymous HTTP 302 to Vercel Authentication while production remains HTTP 200 |
| VERCEL PREVIEW RESOURCE ISOLATION VERIFIED | NO | New build exposes only staging Supabase variable names and no SQL/R2 names; R2 is safe by absence, but the available credential still reaches production buckets |
| DUPLICATE DEPLOYMENTS RESOLVED | YES | V2/V3 completed: both duplicate projects retain history/domains but no longer have a Git link; only canonical can react to repository pushes |
| CUSTOM DOMAIN VERIFIED | NO | All configured custom hosts are NXDOMAIN; `.esports` is not delegated |
| STAGING DATABASE SCHEMA READY | NO | OpenAPI exposes missing profile/scoring/registration objects; authoritative catalog evidence is unavailable |
| STAGING MIGRATIONS APPLIED | UNKNOWN | Migration ledger is unread; no remote migration was attempted |
| ADMINISTRATOR LOGIN VERIFIED | BLOCKED | Confirmed identity and audited active admin profile now pass; private QA password and deployed end-to-end session evidence remain absent |
| DISCORD LOGIN VERIFIED | NO | Staging redirect uses an email-shaped client ID |
| TOURNAMENT OPERATIONS VERIFIED | BLOCKED | Local fixtures pass; real staging authenticated CRUD not run |
| SCRIM OPERATIONS VERIFIED | BLOCKED | Local fixtures pass; real staging authenticated CRUD not run |
| REGISTRATION CONCURRENCY VERIFIED | BLOCKED | Migration 028 passes isolated PostgreSQL; multi-connection staging test awaits schema recovery |
| SCORING AND LEADERBOARDS VERIFIED | BLOCKED | Migrations 026–027 pass isolated PostgreSQL; real staging publication is unavailable |
| R2 PUBLIC/PRIVATE VERIFIED | PARTIAL / ISOLATION FAIL | Dedicated staging pair passed real put/get/content-type/cleanup checks and is empty; current credential also reaches production buckets and was not bound to Preview |
| PUBG IMPORT VERIFIED | BLOCKED | No permitted match ID or authorized live credential evidence |
| ALL 38 GRAPHICS VERIFIED WITH REAL DATA | BLOCKED | All 38 pass fixture/browser QA; real published staging records are unavailable |
| ACTUAL OBS ACCEPTANCE VERIFIED | NOT RUN | Requires an OBS operator and accepted staging data/source access |
| FINAL CI PASSED | YES | GitHub Actions run `44117785592` completed successfully for exact SHA `f322affa…` |
| MAIN MERGE READY | NO | Real staging acceptance and infrastructure safety gates are incomplete |
| PRODUCTION DATABASE READY | UNKNOWN | Production ledger/backup/rehearsal were intentionally not touched |
| PRODUCTION DEPLOYMENT READY | NO | Required staging, database and infrastructure gates are incomplete |
| PRODUCTION DEPLOYED | NO | No deployment was authorized or performed |
| PRODUCTION SMOKE TESTS PASSED | NOT RUN | No production release occurred |

## Refreshed local verification

| Check | Result | Actual evidence |
| --- | --- | --- |
| `npm run typecheck` | PASS | Next route types generated; TypeScript exited 0 |
| `npm run lint` | PASS WITH 9 WARNINGS | Zero errors; the existing React effect warnings remain nonblocking |
| `npm test` | PASS | All 27 chained QA commands passed, including legacy profile compatibility and isolated PostgreSQL migrations 026–028 |
| `npm run qa:secrets` | PASS | 580 tracked/candidate files; no credential patterns |
| `npm run qa:broadcast` | PASS | Publication/privacy/outage checks passed |
| `npm run qa:broadcast:ui` | PASS | 11/11 against a built local server; registered 38-mode canvas test passed |
| `npm run qa:client-interactions` | PASS | 17/17 |
| `npm run qa:auth-provider` | PASS | 4/4 fixture tests; no live login claimed |
| `npm run qa:workspaces` | PASS | 5/5 |
| `npm run qa:master-workflows` | PASS | 4/4 |
| `npm run build` | PASS | Next.js 16.4.5; 147 pages generated |
| `npm audit` | PASS | Zero vulnerabilities |
| `git diff --check` | PASS | No tracked whitespace errors before documentation refresh |
| `npm run qa:staging-readiness` | PASS EXECUTION / ACCEPTANCE BLOCKED | Protected canonical origin HTTP 200 with bypass; staging Auth HTTP 200; actual schema drift, invalid Discord client ID and absent admin password remain |

The first broadcast UI attempt returned 11 `ERR_CONNECTION_REFUSED` failures because no server was running. The unchanged suite passed 11/11 once the successful production build was served. The initial failure is retained as orchestration evidence and was not suppressed.

## Vercel evidence

| Project | Verified current state | Required owner action | Acceptance criterion |
| --- | --- | --- | --- |
| `bravo-gaming-esports-nextjs` (`prj_xbU…`) | Canonical and sole Git target; Standard Protection active; exact-final-SHA Preview `dpl_Hffs…` READY; exact deployment and branch alias return anonymous HTTP 302; protected probes return 200; build metadata has staging Supabase names and no SQL/R2 names | Add only a new two-bucket-scoped staging R2 token after production-denial proof | Protection remains active; production stays public; effective Supabase and R2 ownership/scope proven |
| `bravo-gaming-esports` (`prj_rAj…`) | V2 completed: Git disconnected; project/deployments and `.com.np` assignments retained unchanged | Decide later whether to retain/migrate the unresolved domain pair | No repository push can create a deployment here |
| `bravo-gaming` (`prj_TT2…`) | V3 completed: Git disconnected; project/deployments retained | No further action required for push isolation | No repository push can create a deployment here |

The temporary Preview environment pull was redacted, then deleted. It revealed that the ignored local project link selected duplicate A and yielded no usable Supabase/R2 binding evidence. The ignored link was then changed locally to canonical project `prj_xbUATIQPxXEj6Aamukjx8YJABjBh`; `vercel project inspect` confirmed the canonical selection. This made no remote setting or deployment change. No credential value was printed or retained in the repository.

## Supabase and database evidence

Target is exclusively `yppefayrepkqpqtprbqa`.

| Item | Current state | Root cause | Remaining prerequisite and owner action | Acceptance criterion |
| --- | --- | --- | --- | --- |
| Management access | BLOCKED | Configured token returns 401 | Replace it locally with authorized staging access, or use Dashboard SQL Editor | Project is visible without exposing token values |
| SQL inspection | BLOCKED | `DATABASE_URL`/`DIRECT_URL` identify production and are rejected by the guard | Configure a staging-only least-privilege URL or execute `qa/staging-schema-readonly-dashboard.sql` in the target Dashboard | Inspector completes read-only and saves redacted ignored evidence |
| Ledger 001–028 | UNKNOWN | No authoritative ledger read | Complete the inspection above | Every migration classified by ledger and object compatibility |
| Schema drift | CONFIRMED, extent unknown | Required profile, Discord, scoring and registration objects are absent through staging reads | Compare catalog, policies, grants, functions and dependencies | Exact drift matrix distinguishes missing, altered and remote-only objects |
| Forward repair | BLOCKED | Authoritative definitions and dependencies absent | After evidence, author minimum forward-only migration and rehearse on an isolated restore | Exact SQL/checksum/impact/rollback approved; isolated tests pass |
| Backup/restore | PLAN READY, EXECUTION BLOCKED | No target access; local PostgreSQL tools/Docker unavailable | Verify Dashboard/PITR, make hashed off-repo roles/schema/data/ledger backups, restore to disposable target | Restore completes; schema/ledger hashes, critical counts, RLS/grants and tests match |

No migration 029 is justified yet. Historical migrations must not be edited or blindly replayed.

## Authentication, OAuth and operations

| Workflow | Current state | Work completed | Required action | Acceptance criterion |
| --- | --- | --- | --- | --- |
| Admin identity/profile | Confirmed Auth identity; one audited active `admin` legacy profile | Fail-closed schema compatibility and guarded idempotent provisioning pass; no password reset | Supply private `QA_STAGING_ADMIN_PASSWORD` or perform witnessed manual login after deployment | Real login, refresh, admin API/dashboard, denial cases and logout pass |
| Discord | Provider enabled; callback targets staging; client ID invalid | Offline intent/callback/role tests pass | Separately approve numeric app ID `1530095874594836581` plus matching secret and callback configuration | Full OAuth, guild/role mapping, session and denial tests pass |
| Tournament/scrim/team/player | Implementation and fixtures pass | CRUD, capacity, slots and role boundaries covered locally | Run designated-record staging CRUD after admin access | Readback, edits, archive/cleanup and authorization pass |
| Scoring/publication | Isolated SQL and workflow fixtures pass | Atomic writes, revision conflicts, audit rollback and direct-write denial covered | Apply approved repair, then use staging records | Saved/public totals, stale conflicts, corrections, audit and public boundaries pass |
| PUBG | Client/import pipeline passes locally | Security/parser/import fixture QA passes | Configure authorized key and permitted match ID locally | Import/reimport/repair and scoring comparison pass without duplicate/fabricated results |
| R2 | Dedicated staging buckets created; authenticated upload/read and cleanup passed; token isolation fails | Test writes used only staging buckets and were deleted; current token still reaches both production buckets | Supply `CLOUDFLARE_API_TOKEN` or manually create a token restricted to the staging pair, then approve Preview bindings | Production buckets denied; application public/private delivery and access boundaries pass |
| Broadcast/OBS | 38 registered graphics and `/overlay/program` pass fixture/browser QA | Control, canvas, pagination and outage behavior verified locally | Publish real staging records, provide authorized Preview/local staging access and an OBS operator | All 38 use approved data; actual 1920×1080 OBS transparency/update/recovery accepted |

## GitHub and worktree

- Login-remediation implementation commit: `41ab4017835e3a0c50a40fe951961215a817b847`; based on preserved feature SHA `f322affa3c9a864621afab15af9d452331384171`.
- Remote `main`: `c7311530a17cbb63ba5b4e3df0ef2da44acb7953`; complete feature delta is 417 paths.
- GitHub Actions run `44117785592` for exact SHA `f322affa…`: completed/success; every configured `offline` step passed.
- PR #1 remains open, non-draft and unmerged on the older `feature/obs-broadcast-overlay` architecture. Retain for comparison or close only with owner approval; do not merge it into the 38-mode implementation.
- The reviewed 24-path candidate was committed and pushed. `AGENTS.md` remains separate untracked repository guidance.
- Ignored environments, QA outputs and credential files remain excluded.

## Remaining external access

All approval gates are authorized, but execution remains evidence-gated. The exact missing access is: a valid staging `SUPABASE_ACCESS_TOKEN` or staging-only least-privilege `DIRECT_URL`/`DATABASE_URL`; `CLOUDFLARE_API_TOKEN` capable of creating a two-bucket-only R2 token; Discord OAuth Client Secret; `QA_STAGING_ADMIN_PASSWORD` for automated login acceptance; designated team/player accounts; and a permitted PUBG match ID. Production merge, migrations and deployment remain blocked until real staging acceptance passes.
