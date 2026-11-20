# Real staging verification

## Administrator login remediation — 21 November 2026

The designated confirmed Auth identity now has exactly one audited active legacy `admin` profile. Login/session and proxy authorization support the verified legacy `status` schema through implementation commit `41ab4017835e3a0c50a40fe951961215a817b847`; modern schema remains primary and all unrelated errors fail closed. Guarded localhost login service availability is PASS (page HTTP 200; invalid credential HTTP 401, not 503). Successful password login, persistence, dashboard authorization and logout remain BLOCKED because `QA_STAGING_ADMIN_PASSWORD` is absent and no owner-witnessed manual session was performed.

No password reset, migration, production record change, OAuth change, merge or production deployment occurred.

## Final gap-closure result — 18 November 2026

Exact preserved SHA `f322affa3c9a864621afab15af9d452331384171` passed GitHub Actions run `44117785592` and built canonical protected Preview `dpl_HffsSeACPP2m7UKDDfwxwMZW4UBN`. The protected application and all 38 overlay routes respond through the ignored local bypass. Staging Auth settings are reachable, but real administrator, CRUD, scoring, publishing and broadcast acceptance remain blocked by the schema/account prerequisites below. Dedicated staging R2 bucket operations pass; credential isolation fails because the available credential can also address both production buckets, so it remains unbound to Preview.

Fresh public checks pass all 35 sitemap URLs and the 16 required desktop plus five mobile routes without broken images, missing-href links or horizontal overflow. Staging currently publishes zero events, tournaments, scrims, ranked teams and ranked players. The reported homepage-versus-leaderboard Top Players mismatch is not presently reproducible because both are empty. This is not evidence that real data workflows pass.

The authoritative matrix and exact remaining actions are in [BRAVO_FINAL_RELEASE_READINESS_2026-11-16.md](BRAVO_FINAL_RELEASE_READINESS_2026-11-16.md). Older dated sections below are retained as chronology.

## Current execution result — 17 November 2026

Exact preserved SHA `5ceece39ddc18bc8d57578c91dbaa8e69be8f503` passed GitHub Actions run `44116203600` and built canonical Preview `dpl_7fCSapvfS1Pf9CPMbFYBiu6cdFNV`. Both anonymous Preview URLs return HTTP 302. With the ignored bypass, the application, admin login, leaderboard and all 38 overlay routes respond; anonymous admin API denial is HTTP 401. `/api/broadcast` returns HTTP 503 because the real staging publication schema/data prerequisite is unavailable.

| Workflow | Status | Actual evidence |
| --- | --- | --- |
| Canonical Vercel protection | PASS | Anonymous exact Preview and branch alias redirect HTTP 302 to Vercel Authentication; production alias remains HTTP 200 |
| Duplicate deployment isolation | PASS | `bravo-gaming-esports` and `bravo-gaming` Git links are disconnected; canonical is the sole Git-connected project |
| Protected QA access | PASS | Ignored local automation bypass reaches canonical protected alias without disabling protection |
| Staging Supabase connectivity | PASS WITH LIMITATION | Auth settings HTTP 200 and project callback points to `yppefayrepkqpqtprbqa`; management token is 401 and SQL URLs are rejected as production targets |
| Migration ledger/schema catalog | BLOCKED | No authorized target-locked SQL or Dashboard export; versions 001–028 remain UNKNOWN remotely |
| Admin authentication/session/permissions/logout | BLOCKED | `QA_STAGING_ADMIN_PASSWORD` absent and required profile schema unavailable; provisioning preflight made no mutation |
| Tournament and scrim CRUD | BLOCKED | Local tests pass; real admin session/schema unavailable |
| Team and player management | BLOCKED | Local tests pass; real admin session/schema unavailable |
| Match scoring/publication/leaderboards | BLOCKED | Local 026/027 coverage passes; real RPC/schema/admin prerequisites unavailable |
| Staging R2 bucket operations | PASS WITH ISOLATION FAIL | Both dedicated staging buckets passed put/get/content-type/cleanup and are empty; available credential also reaches both production buckets |
| Preview R2 uploads | BLOCKED | No R2 Preview binding; unsafe broad credential intentionally withheld |
| Broadcast control and overlays | BLOCKED FOR REAL DATA | Local fixture/browser suites pass; real published staging records and actual OBS acceptance unavailable |
| Discord OAuth | FAIL | Provider redirect still emits an email-shaped Client ID; matching numeric Client Secret is unavailable |
| PUBG real import | BLOCKED | No permitted staging match ID |

No remote migration, administrator elevation, OAuth change, main merge or production deployment was performed. Older entries below retain the chronology of earlier checks.

## V1 acceptance update — 17 November 2026

Canonical Preview protection is **PASS**: project metadata reports Standard Protection, and cookie-free exact Preview plus branch-alias requests return HTTP 302 to Vercel Authentication. The production alias remains HTTP 200. This is access-control evidence only; it does not prove database or storage isolation. Unattended protected QA is still blocked because `VERCEL_AUTOMATION_BYPASS_SECRET` is absent locally and `qa/staging-target.mjs` still names the old duplicate deployment. No bypass is currently configured on the canonical project.

The [16 November Phase 2 infrastructure report](infrastructure-unblock-phase-2-2026-11-16.md) supersedes older Vercel protection/domain and staging SQL-access statements below where they differ.

## Infrastructure recheck — 15 November 2026

**Overall staging acceptance remains BLOCKED.** The focused [staging infrastructure reconciliation](staging-infrastructure-reconciliation-2026-11-15.md) supersedes older Vercel-access and effective-binding statements in this file.

| Workflow / check | Current result | Evidence / limit |
| --- | --- | --- |
| Vercel inspection access | PASS | CLI 65.16.0 is authenticated as `sangam150`; the six-project team inventory and all three BRAVO project configurations were inspected read-only |
| Git deployment triggers | FAIL for release safety | All three BRAVO projects link to the same GitHub repository with automatic deployments enabled, so one feature push can trigger all three |
| `bravo-gaming-esports` Preview | FAIL CLOSED | Production Supabase plus shared R2 names are configured; exact-SHA build logs show the source guard rejected deployment |
| `bravo-gaming` Preview | FAIL CLOSED | Required staging Supabase and R2 bindings are absent; exact-SHA build logs show the source guard rejected deployment |
| `bravo-gaming-esports-nextjs` Preview | PARTIAL PASS / PASS protection | Staging Supabase guard passed, Preview R2 is absent, and owner-approved V1 Standard Protection redirects anonymous Preview requests to Vercel Authentication |
| Supabase management access | FAIL | Fresh CLI login still leads to `Invalid access token`; local management project read remains 401 |
| Supabase data-plane reads | PASS | Staging OpenAPI and Auth admin user listing return 200 with the configured server key |
| Supabase direct SQL inspection | BLOCKED | `DATABASE_URL` and `DIRECT_URL` identify production and are rejected before connection; ledger, policies and grants remain authoritative unknowns |
| Staging schema compatibility | FAIL / partial evidence | OpenAPI shows non-prefix drift: migration 020–025 markers and 026–028 fields/RPCs are largely absent, while two migration-024-related RPCs exist |
| Backup/restore rehearsal | BLOCKED | Staging SQL access is absent; local PostgreSQL client tools are absent and the Docker daemon is not running |
| Feature-branch push | BLOCKED | First protect the successful Preview and consolidate or correct the two duplicate Git-connected projects under separate approval |

Apart from owner-approved V1 Standard Protection, no Vercel setting, environment value, Git trigger, database object, account, provider, R2 object, migration or deployment was changed. The next schema action is an authorized read-only staging `DIRECT_URL` for `yppefayrepkqpqtprbqa`; the prepared inspector then runs in a repeatable-read, read-only transaction.

## Current execution — 14 November 2026

**Overall staging acceptance remains BLOCKED.** Fresh checks were read-only and targeted `yppefayrepkqpqtprbqa` only.

| Workflow / check | Current result | Evidence / limit |
| --- | --- | --- |
| Exact release branch/CI | PASS | Local and remote SHA `e025f9cd` match; GitHub Actions run `43519330298` passed all configured steps |
| Exact-SHA Preview | PARTIAL PASS | `bravo-gaming-esports-nextjs` Preview `/api/version` returned 200 with `e025f9cd` and environment `preview` |
| Other Vercel projects | FAIL/BLOCKED | `bravo-gaming-esports` and `bravo-gaming` deployments failed; logs require authorized Vercel access |
| Preview access protection | FAIL/INCONSISTENT | Older staging URL redirects to Vercel SSO, while the successful branch alias is publicly reachable |
| Preview Supabase source guard | PASS for URL/type | Successful build requires exact staging URL and correct key types; `/api/auth/providers` returned 200 with Discord enabled |
| Effective Preview server-key ownership | BLOCKED | Vercel variables/integrations inaccessible; public data fallbacks cannot prove the opaque server key owner |
| Preview R2 | FAIL/BLOCKED | nonexistent managed-object read returned 500; no object write occurred and resource/token scope is unknown |
| Staging Auth settings | PASS | current keyed read 200; email and Discord enabled |
| Staging OpenAPI | PASS read / FAIL compatibility | server-key OpenAPI 200; all previously reported profile/scoring/registration fields, Discord tables and five RPCs remain absent |
| Designated Auth identity | PASS existence / FAIL linkage | user exists and is confirmed; base linked-profile read 200 with count zero |
| Management project read | FAIL | present token still returns 401 |
| Database target | FAIL | both configured URLs parse but identify production; no connection attempted |
| Staging SQL preflight | BLOCKED | `qa/migration-preflight.mjs` is explicitly production-only and its verified-connection helper is pinned to production project `hldppfhtkfgthainismr`; it was not run against or repurposed for staging |
| Default localhost login backend | PASS | `npm run dev` now uses the guarded staging launcher; a live intentionally invalid login returned 401 instead of the prior production-DNS 503 |
| Discord provider | FAIL | authorization still redirects with an email-shaped Client ID; staging callback is correct |
| Real administrator login | BLOCKED | `QA_STAGING_ADMIN_PASSWORD` absent; schema/profile prerequisites also fail |
| Team/player/PUBG acceptance identities | BLOCKED | designated team/player variables and permitted match ID absent |
| Production Auth backend | FAIL | production Supabase hostname returns NXDOMAIN on 14 November |

Live Preview read results for the successful project: version 200, provider discovery 200, home 200, leaderboard 200, anonymous admin broadcast 401, and managed public R2 read 500. The successful public reads contained no acceptance records and do not replace CRUD/scoring/OBS acceptance. No POST, account action, migration, provider change or object mutation was performed.

`npm run dev:staging -- --check` and `npm run admin:provision:staging -- --check` both passed and performed no account request. `npm run qa:staging-readiness` exited 1 as designed with the external blockers above.

## Current release follow-up — 13 November 2026

**Overall staging acceptance: BLOCKED.** The [production deployment report](production-deployment-report.md) records the current release decisions and final local verification. This section supersedes older credential, account, test-count and graphic-count statements below. PASS applies only to the stated scope; local fixture passes do not certify real staging workflows.

Read-only access checks completed through `2026-11-13T14:28:51Z` (20:13 Nepal) and printed presence booleans, safe connection-shape metadata and schema identifiers only. The designated target remains `https://yppefayrepkqpqtprbqa.supabase.co`; the existing designated account is `sangamka076@gmail.com`. No password reset, role grant, remote migration, R2 write or deployment was performed. The previously committed 230-file snapshot is `7eeded0260887bb31d5090fc1ee47643a8e07a79`; the exact 104-path follow-up, including the consolidated report, is staged but uncommitted.

### Current service and workflow results

| Workflow / check | Status | Verified evidence / remaining action |
| --- | --- | --- |
| Credential-file Git exclusion | PASS | `.env.staging.local` exists, is ignored and is not tracked; values were not printed |
| Complete acceptance configuration | FAIL | Admin password, bypass, team/player accounts and permitted match ID remain missing; access details are listed below |
| Staging Supabase public-key connectivity | PASS | Keyed Auth settings returned 200 on 13 November |
| Staging Supabase server-key connectivity | PASS | Empty/base profile reads and read-only designated-account lookup succeeded on 13 November |
| Designated account existence / confirmation | PASS | Existing identity found and email-confirmed; identity and password preserved |
| Required active linked administrator profile | FAIL | The confirmed identity has zero linked base profiles. Actual OpenAPI schema lacks `role_source`, `is_active` and six expected Discord fields, so secure provisioning correctly remains fail-closed |
| Management / database inspection access | FAIL | `SUPABASE_ACCESS_TOKEN` has the expected personal-token shape but returns 401. `DATABASE_URL` identifies production through a pooler username and `DIRECT_URL` identifies the production direct host; both are rejected before connection |
| Actual table/function compatibility | FAIL | Base registration/result tables exist, but staging lacks `event_teams.registration_id`, `matches.scoring_rules`, `matches.revision`, four 026 decision columns, all 027/028 RPCs and Discord mapping/review tables. This does not reveal the authoritative ledger, policies or grants |
| Exact migration ledger, policies, grants and backup/restore | BLOCKED | Obtain valid read-only target access; inspect ledger/checksums/dependencies/policies/grants and rehearse a restore before separately approved migrations. Do not blindly replay 017–019 or 026–028 |
| Diagnose original local login 503 | PASS | Ordinary local development selects the preserved production-configured `.env.local`; its Supabase hostname again returned `ENOTFOUND` on 13 November. Explicit `dev:staging` avoids this fallback |
| Local login UI / invalid credentials / anonymous API denial | PASS | Previously verified actual staging-backed localhost form 200, invalid login 401 and protected API 401; successful login is not implied. Full public suite passed 72/72 on 11 November |
| Real admin email/password login | BLOCKED | `QA_STAGING_ADMIN_PASSWORD` absent; missing schema and active linked profile must also be resolved |
| Session persistence, refresh, direct admin navigation and permissions | BLOCKED | No accepted real administrator session; local SDK/browser fixtures are separate evidence |
| Logout, expiry and cross-tab access revocation | BLOCKED | Requires successful real sessions; team/player credentials are also absent |
| Recovery email delivery / real recovery callback | BLOCKED | No owner-controlled recovery acceptance completed; no recovery email requested |
| Temporary administrator provisioning / removal | BLOCKED | Existing account must be preserved; approve exact profile linkage and later removal after schema reconciliation. No elevation executed |
| Discord provider configuration | FAIL | Fresh 13 November authorization still redirects with an email as Client ID. The staging callback is correct; numeric intended Application ID `1530095874594836581` and its matching secret remain unconfigured/unverified. No provider update executed |
| Discord consent, callback, roles, session and logout | BLOCKED | Provider/schema repair and interactive consent required. Local Discord login remains explicitly disabled; enabling it must retain fail-closed role approval |
| Protected Vercel Preview access / deployed revision | BLOCKED | On 13 November, `/api/version` returned 302 to Vercel SSO without a bypass; application was not reached. Deployment protection remains enabled |
| Preview Supabase/R2 isolation | BLOCKED | Local Preview policy rejects forbidden targets in offline tests; actual resolved Vercel bindings and R2 token scopes remain unverified |
| Tournament / season CRUD | BLOCKED | No accepted real administrator session, verified target schema or accessible Preview application |
| Scrim CRUD and private lobby management | BLOCKED | Same access/schema blockers; no real event modified |
| Team/player management and roster history | BLOCKED | Same blockers and missing designated team/player accounts |
| Event registration confirmation / capacity / duplicate atomicity | PASS locally; FAIL/BLOCKED on real staging | Actual migration 028 SQL passes isolated tests, while staging OpenAPI confirms `registration_id` and every 028 RPC are absent. Target ledger, policies/grants, independent connections and real sessions remain unavailable |
| Saved scrim slots, locking, withdrawal and schedule | BLOCKED | Local route/browser regressions cover assignments, validation and revisions. Real confirmed event membership and multi-operator acceptance remain outstanding |
| R2 public upload, delivery, replacement and deletion | BLOCKED | Credential/base-URL entries exist, but account/key/bucket fields match the preserved default local configuration; actual staging isolation is unverified. No credentialed R2 write attempted |
| R2 private upload, authorized download and cross-role denial | BLOCKED | Same isolation/access blockers; no private test object or accepted test sessions |
| Manual scoring, corrections and result publication | FAIL/BLOCKED on staging | The actual staging schema lacks 026 scoring fields and the 027 transaction RPC; no accepted admin session or verified migration ledger exists. Isolated SQL coverage remains PASS |
| Match revision conflicts, required audit and direct-write denial | FAIL/BLOCKED on real staging | `matches.revision` and `commit_competition_match` are absent. Focused PGlite tests pass rollback/revision/privilege cases, but real grants/policies and independent-connection stress remain unverified |
| Permitted PUBG import and duplicate handling | BLOCKED | `PUBG_API_KEY` exists; `QA_STAGING_PUBG_MATCH_ID` is absent. No substitute match used |
| Public leaderboard calculations | BLOCKED | No actual published staging acceptance records available for comparison |
| Broadcast Studio control / preview / show-hide / revisions | BLOCKED | No authenticated staging producer session or real published acceptance records; local browser fixture suite passed 11/11 again on 13 November |
| All dedicated graphics and permanent program | BLOCKED on real staging | Individual local-versus-real results follow; 38 dedicated modes plus program are registered |
| Public/private staging data separation | BLOCKED | Anonymous local denial passed, but authenticated cross-role/private-record acceptance remains outstanding |
| Actual OBS Studio capture / transparency / R2 artwork | BLOCKED | No actual OBS capture performed; browser fixtures do not establish OBS Studio acceptance |
| Production Supabase availability | FAIL | Read-only DNS and unkeyed Auth health probe on 13 November returned `ENOTFOUND`. Do not substitute staging resources into production |

### Local evidence and individual OBS source matrix

The unchanged full public suite passed **72/72** on **11 November**. On **13 November**, current client interaction regressions passed **17/17**, workspace fixtures **5/5**, master workflow fixtures **4/4**, auth-provider fixtures **4/4**, and broadcast browser fixtures **11/11** after the explicit staging localhost was restored following the production build. The broadcast test iterates every registered dedicated graphic; program behavior has separate transition/outage tests. These use intercepted broadcast data and do not create published staging records. Current registration SQL/default QA evidence is reported in the [deployment report](production-deployment-report.md) and [release audit](release-audit.md).

Every real-stage entry below is **BLOCKED**, not a newly measured per-route HTTP result: the 13 November access probe checked `/api/version` only and encountered Vercel SSO. The older route-by-route probes below remain dated historical evidence. Actual published-record rendering, data correctness, privacy, live updates and OBS capture still require acceptance.

| Source | Latest local browser fixture | Real staging acceptance |
| --- | --- | --- |
| `/overlay/program` | PASS | BLOCKED |
| `/overlay/scoreboard` | PASS | BLOCKED |
| `/overlay/results` | PASS | BLOCKED |
| `/overlay/winner` | PASS | BLOCKED |
| `/overlay/mvp` | PASS | BLOCKED |
| `/overlay/top-fragger` | PASS | BLOCKED |
| `/overlay/top-damage` | PASS | BLOCKED |
| `/overlay/headshots` | PASS | BLOCKED |
| `/overlay/players` | PASS | BLOCKED |
| `/overlay/rankings` | PASS | BLOCKED |
| `/overlay/standings` | PASS | BLOCKED |
| `/overlay/lower-third` | PASS | BLOCKED |
| `/overlay/schedule` | PASS | BLOCKED |
| `/overlay/sponsors` | PASS | BLOCKED |
| `/overlay/opening` | PASS | BLOCKED |
| `/overlay/closing` | PASS | BLOCKED |
| `/overlay/killfeed` | PASS | BLOCKED |
| `/overlay/road-to-finals` | PASS | BLOCKED |
| `/overlay/road-to-finals-2` | PASS | BLOCKED |
| `/overlay/todays-matches` | PASS | BLOCKED |
| `/overlay/map-intro` | PASS | BLOCKED |
| `/overlay/countdown` | PASS | BLOCKED |
| `/overlay/casters` | PASS | BLOCKED |
| `/overlay/team-stats` | PASS | BLOCKED |
| `/overlay/break` | PASS | BLOCKED |
| `/overlay/group-standings` | PASS | BLOCKED |
| `/overlay/day-standings` | PASS | BLOCKED |
| `/overlay/compact-scoreboard` | PASS | BLOCKED |
| `/overlay/match-info` | PASS | BLOCKED |
| `/overlay/team-spotlight` | PASS | BLOCKED |
| `/overlay/sponsor-strip` | PASS | BLOCKED |
| `/overlay/champion` | PASS | BLOCKED |
| `/overlay/final-rankings` | PASS | BLOCKED |
| `/overlay/player-comparison` | PASS | BLOCKED |
| `/overlay/technical-break` | PASS | BLOCKED |
| `/overlay/analyst-panel` | PASS | BLOCKED |
| `/overlay/starting-soon` | PASS | BLOCKED |
| `/overlay/advancement` | PASS | BLOCKED |
| `/overlay/team-slots` | PASS | BLOCKED |

Headshot and killfeed fixture passes verify their truthful unavailable-data states; no reliable live telemetry source has been established.

### Exact outstanding local access and safe continuation

| Variable / access | Current state and required action |
| --- | --- |
| `QA_STAGING_ADMIN_PASSWORD` | Missing; configure the existing account's private current or explicitly owner-set password locally. Do not send it in chat |
| `VERCEL_AUTOMATION_BYPASS_SECRET` | Missing; needed for protected Preview acceptance without disabling deployment protection |
| `VERCEL_TOKEN` or connected Vercel inspection access | No local file/process/CLI token available; verify connected inspection access before claiming deployment bindings are known |
| `SUPABASE_ACCESS_TOKEN` or connected Supabase inspection access | Local token present but rejected 401; obtain valid read-only management/ledger access |
| `DATABASE_URL` or `DIRECT_URL` | Both currently target production (pooler identity and direct host respectively), so the staging guard correctly refuses them. Replace them only with a verified `yppefayrepkqpqtprbqa` read-only connection |
| `QA_STAGING_TEAM_EMAIL`, `QA_STAGING_TEAM_PASSWORD` | Missing; required for real team and cross-role acceptance |
| `QA_STAGING_PLAYER_EMAIL`, `QA_STAGING_PLAYER_PASSWORD` | Missing; required for real player and cross-role acceptance |
| `QA_STAGING_PUBG_MATCH_ID` | Missing; supply an authorized match ID before any import |
| `DISCORD_CLIENT_SECRET` | Absent locally; optional if the matching secret is configured directly in the staging provider. Correct provider Client ID/secret pairing still requires verification |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PRIVATE_BUCKET_NAME`, `R2_PUBLIC_BASE_URL` | Present, but dedicated staging ownership, token scope and deployment bindings remain unverified. Configure verified isolated resources before writes |
| `CLOUDFLARE_API_TOKEN` or approved account inspection access | No local token available; only needed if using management API inspection to establish R2 isolation |

Modern Supabase publishable/server keys are present and passed current read-only checks. Empty legacy alternatives `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are not additional requirements. Available Vercel and Supabase plugins remain uninstalled, so they do not provide inspection access. The explicit local launcher keeps R2, management, provisioning and QA credentials out of the app runtime; use `npm run dev:staging` and `npm run dev:staging -- --check`. `--discord` is an optional later mode after provider/schema readiness; current local Discord login is disabled.

Current safe metadata is retained in ignored `qa-artifacts/blocker-recheck/current-access-2026-11-13.json` and `release-target-dns-2026-11-13.json`. Local browser logs include `release-public-stable.txt`, `release-client-fixtures.txt`, `release-workspaces.txt`, `release-master-workflows.txt`, `release-auth-provider.txt` and `release-broadcast-browser.txt`. GitHub push remains blocked until actual Preview resource isolation is verified; commit, push, PR, merge, remote migrations and deployment require their applicable explicit approvals.

## Historical follow-ups — 6 November 2026 and earlier

The remaining sections retain their original dates and outcomes. They do not override the current results above.

Historical operational follow-up: [6 November event-day readiness](event-day-readiness-2026-11-06.md) and [operator runbook](event-day-operations.md). The 19:00 Nepal deadline passed without accepted real administrator/event/scoring/OBS workflows. Current source adds event-scoped slots and a 38th Team Slots graphic while preserving the prior 37; historical counts below remain historical. No remote migration or deployment was performed.

## Latest email/admin and Discord verification — 6 November 2026

**Overall acceptance: BLOCKED.** Local fixes and regression checks pass. Successful real administrator login and Discord OAuth remain unverified. This section supersedes all historical credential/account/runtime statements below. The designated temporary staging account is now `sangamka076@gmail.com`; older references to the originally supplied account are retained as history.

No new commit, push, PR, merge, deployment, provider update, remote migration, account reset or role grant was performed. The existing release commit remains `7eeded0260887bb31d5090fc1ee47643a8e07a79` on `codex/platform-completion-20261104`. Authentication follow-up changes are unstaged. GitHub push remains blocked until Vercel Preview Supabase/R2 isolation is verified.

### Real service and workflow results

Presence inspection at `2026-11-06T08:54:18.063Z` printed booleans only. Read-only staging probes at `08:52:51Z` returned keyed Auth settings 200, required profile projections 400/42703, missing Discord tables 404/PGRST205 and Vercel SSO 302. A later bounded probe at `09:05:22Z` again returned Auth settings 200 and the malformed Discord redirect, but several other GET requests hit their 10-second deadlines. These intermittent timeouts are recorded separately; they do not resolve the observed schema/provider failures.

| Workflow / check | Status | Actual result / remaining blocker |
| --- | --- | --- |
| Ignore local credential file | PASS | `.env.staging.local` is ignored and untracked; credential values were not printed |
| Explicit local staging environment | PASS | `npm run dev:staging -- --check --discord` succeeds; running localhost uses the designated staging Supabase URL and excludes R2/management/provisioning credentials |
| Supabase public/server key validity | PASS | Keyed Auth settings 200; actual designated-account lookup and empty/base profile reads succeed with the staging server key. Network deadlines remain enforced |
| Complete acceptance configuration | FAIL | Missing test-account/bypass entries and invalid management/database access listed below |
| Diagnose original local 503 | PASS | Ordinary `npm run dev` selects unchanged `.env.local` with the unresolvable production hostname. Explicit staging launch removes that fallback; real invalid login now returns 401 |
| Admin login form | PASS | Actual localhost browser loads `/admin/login` with email/password inputs, HTTP 200 |
| Anonymous protected API | PASS | Actual localhost `/api/admin/broadcast` returns 401 |
| Real invalid-password response | PASS | A nonexistent staging test identity receives safe invalid-credentials 401; no successful login is claimed |
| Previously failing public login-page checks | PASS | The original public QA assertions for `/login`, `/player/login`, `/team/login` all pass against staging-backed localhost, with no response fixtures. This does not certify the full public suite or Preview |
| Requested Auth identity / confirmation | PASS | Read-only staging lookup finds `sangamka076@gmail.com`, email-confirmed; identity/password preserved |
| Requested active administrator profile | FAIL | Zero profiles linked by `auth_user_id` in the available base projection; required full profile read fails 42703. No role granted |
| Required authentication / Discord schema | FAIL | Missing `is_active`, `role_source` and Discord fields/tables from 017–019. Complete migration ledger remains unknown |
| Management / database inspection access | FAIL | `SUPABASE_ACCESS_TOKEN` receives 401. Both present database URLs fail the strict staging target guard; neither was used to connect |
| Successful admin login, refresh and direct `/admin` navigation | BLOCKED | Missing private test password, missing active linked profile and incomplete schema |
| Real permissions, role isolation, session expiry and cross-tab logout | BLOCKED | No accepted real administrator/team/player session. Offline coverage is listed separately |
| Password recovery delivery / successful callback | BLOCKED | No owner-controlled recovery test completed; no recovery email requested |
| Temporary administrator provisioning/removal | BLOCKED | Existing identity is preserved. Schema reconciliation and approved profile linkage must precede elevation; no provisioning/removal command executed |
| Discord provider availability | PASS | Staging Auth settings and actual localhost `/api/auth/providers` report enabled |
| Discord OAuth application ID | FAIL | Actual Supabase authorization response is 302 to Discord with an email as `client_id`; it is not a numeric Application ID |
| Discord provider callback target | PASS | Observed authorization redirect uses the designated staging Supabase `/auth/v1/callback` |
| Discord bot/guild/role prerequisites | PASS | Prior read-only application/guild checks returned 200 and matched configured role IDs; public Application ID `1530095874594836581` was verified. Matching OAuth Client Secret remains unverified |
| Discord consent, callback, authorization, session and logout | BLOCKED | Provider ID/secret pairing, schema reconciliation and interactive consent remain outstanding. Local Discord runtime variables are now explicitly passed; derived admin-role trust stays disabled |
| Vercel Preview bypass / deployed revision | BLOCKED | Missing `VERCEL_AUTOMATION_BYPASS_SECRET`; first GET returned SSO 302, later GET timed out. Protection remains enabled |
| Preview Supabase/R2 isolation | BLOCKED | Actual deployed bindings remain unverified. Local runtime guards do not establish deployment isolation |
| Tournament and season CRUD | BLOCKED | No accepted admin session or approved complete schema; no records changed |
| Scrim CRUD | BLOCKED | Same authentication/schema blockers |
| Team and player management | BLOCKED | Same blockers; designated team/player test credentials also absent |
| R2 public uploads/delivery | BLOCKED | Credentials/base URL are present, but staging bucket isolation and authenticated upload access remain unverified; no object written |
| R2 private uploads/access restrictions | BLOCKED | Same isolation/access blockers; no private test object or team/player session |
| Manual scoring, result correction and publication | BLOCKED | No accepted admin session or verified staging migration ledger, including 026/027; no results changed |
| PUBG import | BLOCKED | `PUBG_API_KEY` is present, but `QA_STAGING_PUBG_MATCH_ID` is missing. No unauthorized match substituted |
| Public leaderboard calculations | BLOCKED | No actual published acceptance records or accessible verified Preview application |
| Broadcast control / all OBS graphics and program | BLOCKED | No authenticated producer session or real published staging acceptance records. Earlier individual route matrix remains blocked; not rerun in this auth follow-up |
| Public/private data separation on staging | BLOCKED | Anonymous API denial passed, but authenticated cross-role/private-record acceptance needs designated sessions |

### Local implementation verification

The existing Supabase architecture is retained. Password-route errors now distinguish 400/401/403/429/500/503, retain rate-limit headers and emit safe telemetry. Rejected password/OAuth flows explicitly expire newly created/chunked/late Supabase cookies even when SDK sign-out fails. Server clients enforce a 10-second per-request deadline while preserving caller cancellation, response-body deadlines and TLS verification. The owner-only CLI preserves existing Auth passwords, checks schema before creation and requires explicit flags for new identities or changes to existing profiles. REST profile/audit provisioning is guarded compensation, not an atomic database transaction.

| Local check | Status | Evidence / scope |
| --- | --- | --- |
| Default `npm test` chain | PASS | All 22 QA commands; includes isolated scoring/atomic SQL, 36 actual password-route fixture responses, six timeout/cancellation checks, installed-SDK callback rejection and provisioning regressions |
| SSR refresh / same-request cookie propagation | PASS | `qa:auth-refresh`; offline installed-SDK/proxy regression |
| Browser session/role/logout regressions | PASS | Four `qa:auth-provider` fixture tests; no live session claimed |
| TypeScript | PASS | `next typegen && tsc --noEmit`, exit 0 |
| ESLint | PASS | Exit 0, zero errors; nine existing warnings in unchanged `PubgImportManager.tsx` retained |
| Production-mode local build | PASS | `qa/local-release-runtime.mjs build`, exit 0, 147 static-generation tasks; service credentials explicitly blanked, no deployment |
| Secret/whitespace checks | PASS | Tracked and candidate file scan and whitespace checks pass; scanner unchanged. A clearly fake test bot/key fixture was relabeled with `example-` after the initial scan flagged it |

Evidence: [presence only](../qa-artifacts/blocker-recheck/complete-auth-presence.json), [initial real readiness](../qa-artifacts/blocker-recheck/complete-auth-staging-readiness.txt), [later deadlines/redirect](../qa-artifacts/blocker-recheck/complete-auth-staging-readiness-final.txt), [account readiness](../qa-artifacts/blocker-recheck/complete-auth-account-readiness.txt), [management rejection](../qa-artifacts/blocker-recheck/complete-auth-provider-inspection.txt), [database target validation](../qa-artifacts/blocker-recheck/staging-database-targets.json), [actual local browser/API results](../qa-artifacts/blocker-recheck/complete-auth-live-local.txt), [three public-page rechecks](../qa-artifacts/blocker-recheck/complete-auth-public-recheck.txt), [22-command suite](../qa-artifacts/blocker-recheck/complete-auth-test.txt), [typecheck](../qa-artifacts/blocker-recheck/complete-auth-typecheck.txt), [lint](../qa-artifacts/blocker-recheck/complete-auth-lint.txt), [build](../qa-artifacts/blocker-recheck/complete-auth-build.txt), [secret scan](../qa-artifacts/blocker-recheck/complete-auth-secret-scan.txt). Evidence stays ignored locally.

### Exact remaining inputs and actions

| Input | Current requirement |
| --- | --- |
| `QA_STAGING_ADMIN_EMAIL` | Missing; configure the designated `sangamka076@gmail.com` identifier locally |
| `QA_STAGING_ADMIN_PASSWORD` | Missing; configure the existing account's private current or explicitly owner-set new password. No automatic reset |
| `SUPABASE_ACCESS_TOKEN` | Present but rejected 401; configure valid staging management access, or provide verified database access below |
| `DATABASE_URL` / `DIRECT_URL` | Both present but fail the staging target guard. One valid staging-only connection is needed as an alternative for ledger inspection |
| `VERCEL_AUTOMATION_BYPASS_SECRET` | Missing; required for protected Preview acceptance without disabling protection |
| `DISCORD_CLIENT_SECRET` | Absent locally; needed only if repairing the provider through local tooling. Otherwise configure the matching secret directly in staging Supabase. The app does not require a local `DISCORD_CLIENT_ID` |
| `QA_STAGING_TEAM_EMAIL`, `QA_STAGING_TEAM_PASSWORD` | Missing; needed for real team/cross-role checks |
| `QA_STAGING_PLAYER_EMAIL`, `QA_STAGING_PLAYER_PASSWORD` | Missing; needed for real player/cross-role checks |
| `QA_STAGING_PUBG_MATCH_ID` | Missing; needed for authorized import acceptance |

The configured modern Supabase keys, bot/guild variables, R2 SDK/base URL entries and PUBG API key are present; they must not be confused with missing historical entries below. Legacy key alternatives and `ADMIN_PROVISION_PASSWORD` are optional for the current existing-account workflow.

Once access is saved, inspect the exact staging ledger/dependencies and backup/restore readiness. Prepare a concrete ordered schema repair for explicit migration approval; do not blindly replay 017–019. Correct the staging Discord provider to the intended numeric Application ID and matching secret, register the staging callback and verify the local redirect allowlist. Then provision only the approved staging profile, complete real email/Discord sessions and logout, verify Preview resource isolation, and continue the blocked CRUD/upload/scoring/broadcast workflows. No remote migration or production deployment is authorized. See [authentication-verification.md](authentication-verification.md) for commands and temporary-access removal.

## Earlier authentication and Discord follow-up — 5 November

This section supersedes earlier empty-Supabase-key and connectivity-only conclusions below. Real requests now use the designated staging project `yppefayrepkqpqtprbqa`. The protected Vercel deployment, production-resource isolation, full admin acceptance and OBS acceptance remain unverified; localhost results do not certify that deployment.

The owner populated new opaque Supabase keys in ignored `.env.staging.local`. Read-only Auth settings and an empty profile read both returned **200** with those keys. The file initially retained the unreachable production URL and legacy production JWT fallbacks. The local correction changed only its Supabase URL and cleared `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY`, preserving the validated publishable/secret keys. `.env.local` remains unchanged. Localhost was restarted with the explicitly loaded staging credentials; production and R2 credentials were excluded.

| Current check | Status | Actual evidence / remaining action |
| --- | --- | --- |
| Staging public-key and server-key connectivity | PASS | `staging-opaque-key-connectivity.json`: Auth settings 200; `profiles?select=id&limit=0` 200 with no rows returned |
| Actual localhost admin login form | PASS | Browser check rendered the real email/password fields at `http://localhost:3000/admin/login`, HTTP 200 |
| Anonymous protected API denial | PASS | Actual localhost `/api/admin/broadcast` returned 401 |
| Real invalid-credential login response | PASS | Actual staging-backed localhost login returned the expected invalid-credentials 401; no mocked response and no successful sign-in claimed |
| Designated email admin readiness | FAIL | Read-only staging Auth lookup completed and did not find `bravoxgaming473@gmail.com`; `QA_STAGING_ADMIN_PASSWORD` remains absent |
| Required profile / Discord schema | FAIL | Strict staging-only empty REST probes confirm missing required fields/tables listed below; successful token authentication alone cannot complete profile verification |
| Discord OAuth provider enabled | PASS | Staging `/auth/v1/settings` and localhost `/api/auth/providers` report Discord enabled |
| Discord OAuth Client ID | FAIL | Actual staging authorization redirect includes an email as `client_id`; Discord requires the numeric application ID. No raw OAuth state or secrets persisted |
| Discord provider callback target | PASS | Authorization redirect uses `https://yppefayrepkqpqtprbqa.supabase.co/auth/v1/callback`; the app's subsequent local callback/allowlist still needs end-to-end verification |
| Configured Discord bot identity | PASS | Read-only Discord application endpoint returned 200; verified public Application ID `1530095874594836581` |
| Configured guild and role IDs | PASS | Bot guild GET returned 200 and matched the configured guild. Existing ADMIN/ORGANIZER/MODERATOR/IGL/PLAYER/BANNED IDs match its roles; optional additional role mappings remain unset |
| Supabase management access | FAIL | Configured `SUPABASE_ACCESS_TOKEN` received HTTP 401; owner will configure valid access locally. No provider setting has been changed |
| Discord callback runtime credentials | BLOCKED | Bot/guild prerequisites are verified. The prepared `--discord` launcher mode passes only staging Discord variables, preserves disabled derived-role trust, and refuses to start while required schema probes fail. Running localhost remains in auth-only mode |
| Discord consent, callback, session and logout | BLOCKED | Invalid provider Client ID, missing schema and callback runtime prerequisites; no interactive Discord login completed |
| Vercel Preview / resource isolation | BLOCKED | Not repeated in this follow-up; last probe returned SSO redirects. Actual Preview Supabase/R2 bindings remain unverified |
| CRUD, R2 writes, scoring, leaderboards, broadcast and OBS acceptance | BLOCKED | No accepted admin session or approved target-schema reconciliation; no new functional acceptance claimed |

Observed missing schema, with source migrations that introduce it:

- `profiles.is_active`: migration **017**.
- `profiles.role_source`, `discord_guild_id`, `discord_role_ids`, `discord_mapped_roles`, `discord_role_synced_at`: migration **018**.
- `profiles.discord_team_role_id`, `discord_team_verified_at`, plus `discord_role_mappings` and `discord_access_reviews`: migration **019**.

These probes establish schema gaps, not the complete migration ledger. Inspect the exact staging ledger, dependencies and backups before proposing an ordered repair. **No remote migration is authorized or applied.** Do not blindly replay selected files. Both email profile verification and the Discord callback depend on this reconciliation. Existing manual admin approval and fail-closed Discord role trust remain intact; Discord login alone must not grant website administrator access.

The OAuth Client ID is configured in **staging Supabase → Authentication → Sign In / Providers → Discord**, using the intended Discord application's numeric ID and matching Client Secret. The configured bot's verified ID is available if that is the intended OAuth application. The application does not read a local `DISCORD_CLIENT_ID` as a replacement for that provider setting. Register the staging Supabase callback in Discord, and verify the local `/auth/callback` redirect policy in Supabase. See [Supabase Discord setup](https://supabase.com/docs/guides/auth/social-sign-in/auth-discord) and [Discord OAuth2](https://docs.discord.com/developers/topics/oauth2). Keep client secrets and management/bot tokens out of chat and reports.

Prepared local tooling is ignored under `qa-artifacts/blocker-recheck/`. The provider repair is bounded to the designated project, verifies the intended bot application and changes only the malformed client ID plus an explicitly supplied matching secret if needed; it has **not** been executed. Valid management access is required first. Schema changes require separate explicit approval after review. After that reconciliation, the local Discord command is `node qa-artifacts/blocker-recheck/start-local-staging.mjs --discord`; run with `--check` first and stop the existing development server only when the prerequisites pass.

Evidence: [keyed connectivity](../qa-artifacts/blocker-recheck/staging-opaque-key-connectivity.json), [actual local browser/API checks](../qa-artifacts/blocker-recheck/local-login-live-check.json), [designated account readiness](../qa-artifacts/blocker-recheck/local-staging-admin-readiness.json), [provider redirect/configuration](../qa-artifacts/blocker-recheck/discord-config-check.json), [bot identity and rejected management access](../qa-artifacts/blocker-recheck/discord-provider-inspection.json), [guild/role checks](../qa-artifacts/blocker-recheck/discord-guild-readonly.json), [empty schema probes](../qa-artifacts/blocker-recheck/discord-schema-readonly.json). Offline auth and Discord role-mapping regressions passed separately; those are not interactive OAuth acceptance.

No production records were modified, remote migrations applied, accounts created, roles granted, R2 objects written, commits made, branches pushed or deployments performed during this follow-up. The staging-backed invalid-login request may produce ordinary staging authentication/rate-limit/error audit records. The earlier release audit remains the historical pre-commit record.

**Overall: BLOCKED. Staging connectivity is verified; successful administrator/Discord authentication and release acceptance are not. GitHub push remains blocked until Preview resource isolation is verified.**

## Earlier deployment verification — 5 November

Release-audit recheck at `2026-11-05T06:04:19.141Z` observed the same 45 preview redirects and unkeyed Supabase 401. The real admin command again stopped before login for missing `QA_STAGING_ADMIN_PASSWORD`; see `qa-artifacts/release-audit/staging-auth.txt`. Current source additionally requires **migration 027**, which remains unapplied. See [release-audit.md](release-audit.md) for final local checks and Git/PR restrictions.

This section supersedes historical counts below. At `2026-11-05T05:11:46.387Z`, all **45** real preview requests (seven application/API paths and **38 overlay URLs**, including program) returned HTTP 302 to Vercel SSO. Staging Supabase health returned HTTP 401 without a key. The browser did not reach the application. `.env.staging.local` is ignored by Git; presence inspection at `2026-11-05T05:11:17.092Z` still found empty credential entries. No secrets were printed or changed.

| Workflow | Status | Actual evidence |
| --- | --- | --- |
| Credential-file Git exclusion | PASS | `environmentIgnoredByGit: true` |
| Required environment configuration | FAIL | Required credential entries remain empty |
| Vercel automation bypass | BLOCKED | Missing `VERCEL_AUTOMATION_BYPASS_SECRET`; protection remains enabled |
| Supabase keyed connectivity | BLOCKED | Missing `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` or `NEXT_PUBLIC_SUPABASE_ANON_KEY`; unkeyed health returned 401 |
| Admin login, refresh, permissions and logout | BLOCKED | Missing `QA_STAGING_ADMIN_PASSWORD`; deployment protection also blocks application access |
| Tournament and scrim CRUD | BLOCKED | No authenticated staging session |
| Team and player management | BLOCKED | No admin session; designated team/player credentials missing |
| R2 public upload | BLOCKED | Missing R2 credentials and delivery base URL; bucket isolation unverified |
| R2 private upload/access restrictions | BLOCKED | Missing R2 credentials and authenticated staging access |
| Manual scoring and result publication | BLOCKED | No staging session; migration 026 has not been applied |
| PUBG match import | BLOCKED | Missing `PUBG_API_KEY` and `QA_STAGING_PUBG_MATCH_ID` |
| Public leaderboards | BLOCKED | Actual request redirected to Vercel SSO |
| Broadcast control room | BLOCKED | Application access and authenticated session unavailable |
| All 37 graphics and program route | BLOCKED | All 38 real route requests redirected to Vercel SSO |
| Public/private data separation on staging | BLOCKED | Cannot exercise authenticated or anonymous application responses |

Additional missing names: `SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY`; `DATABASE_URL` or `DIRECT_URL`; `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_PUBLIC_BASE_URL`; `QA_STAGING_TEAM_EMAIL`, `QA_STAGING_TEAM_PASSWORD`, `QA_STAGING_PLAYER_EMAIL`, `QA_STAGING_PLAYER_PASSWORD`. No production credentials were substituted.

Evidence: [real HTTP/browser results](../qa-artifacts/staging-verification/connectivity.json), [presence booleans](../qa-artifacts/staging-presence-latest.json), [browser capture](../qa-artifacts/staging-verification/deployment-access.png), [admin command stopped before login](../qa-artifacts/staging-verification/master-auth-run.txt). Local implementation and fixture verification are recorded separately in [master-development-verification.md](master-development-verification.md). No migration, remote write, merge or deployment was performed.

**Overall status: BLOCKED. Staging acceptance has not passed. No production merge or deployment is authorized by this report.**

Latest blue-reference/global-production follow-up: real probe at **22:58:36 Asia/Katmandu** (`2026-11-04T17:13:36.077Z`) still finds credentials empty. All **32** preview requests, including all **25** existing overlay sources, returned Vercel SSO redirects. Supabase health returned 401 without a key. The actual administrator browser command again exited before launch for missing `QA_STAGING_ADMIN_PASSWORD`; see [latest auth command output](../qa-artifacts/staging-verification/final-auth-run.txt) and [latest presence check](../qa-artifacts/staging-verification/final-env-presence.json), rechecked at `2026-11-04T17:14:50.398Z`. The local implementation/testing follow-up is documented separately in [global-production-readiness.md](global-production-readiness.md). No local fixture result changes any staging workflow to PASS.

Latest real connectivity evidence captured at **19:14:28 Asia/Katmandu** (`2026-11-04T13:29:28.212Z`), followed by a credential-file presence recheck at **19:17:42** (`2026-11-04T13:32:42.534Z`). No mocks, fixture responses, fabricated records or local test results are counted as real staging acceptance. Application architecture was not changed.

Targets supplied by the owner:

- Vercel: `https://bravo-gaming-esports-mvfxuoofn-sangams-projects-9468acfa.vercel.app`
- Supabase: `https://yppefayrepkqpqtprbqa.supabase.co`
- Admin: `bravoxgaming473@gmail.com`
- R2 public/private: `bravo-gaming-assets` / `bravo-gaming-private`

PASS means the named check was executed successfully. FAIL means an observed check/configuration requirement failed. BLOCKED means the application workflow could not be exercised; it does not imply a defect in that workflow.

## Resumed verification

The owner reported that credentials had been configured. Fresh inspection of the exact repository file `E:\Bravo Gaming Esports\bravo-gaming-esports-nextjs\.env.staging.local` still found the credential entries empty. They were also absent from the process environment. The file's last modification was **18:03:15 Asia/Katmandu** (`2026-11-04T12:18:15.977Z`). No UTF-16 BOM or NUL encoding problem was found. Only one matching staging file was found under `E:\Bravo Gaming Esports`; no `.txt` variant was found. The owner subsequently confirmed they will save this exact file; successful configuration has not yet been observed.

| Requested resumed workflow     | Latest status | Actual result                                                                                                                             |
| ------------------------------ | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Required environment variables | FAIL          | Credentials still empty at the latest presence check; identifiers remain configured and file remains ignored by Git                       |
| Vercel bypass                  | BLOCKED       | No bypass secret available; actual preview GET requests return 302 to Vercel SSO                                                          |
| Staging Supabase connectivity  | BLOCKED       | Network reachability PASS with HTTP 401; keyed connectivity blocked by missing public key                                                 |
| Real admin authentication      | BLOCKED       | Rerun exited 1 before launch for missing `QA_STAGING_ADMIN_PASSWORD`; account diagnostic exited 1 for missing `DATABASE_URL`/`DIRECT_URL` |
| Tournament and scrim CRUD      | BLOCKED       | No application access or real authenticated staging session                                                                               |
| R2 public/private uploads      | BLOCKED       | No R2 credentials, delivery configuration or authenticated application session                                                            |
| Match scoring and publishing   | BLOCKED       | No staging match workflow available; no records created or modified                                                                       |
| Leaderboards                   | BLOCKED       | Real `/api/leaderboard` request returned Vercel 302; actual totals cannot be verified                                                     |
| All 17 OBS routes              | BLOCKED       | Every route was freshly requested; all returned Vercel 302. No published staging records or rendering claimed                             |

The complete workflow and individual-overlay matrices below retain the same statuses because fresh observations reproduce the blockers. No protection was disabled and no production API credentials or records were used. The earlier local 503 diagnosis remains confirmed by a fresh `ENOTFOUND` lookup of its configured hostname.

## Workflow results

| Workflow                                                           | Status  | Actual evidence / blocker                                                                                                                                                                                                                   |
| ------------------------------------------------------------------ | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Read stabilization and environment documentation                   | PASS    | Reviewed `platform-stabilization.md`, `platform-operations.md`, `.env.example`, staging guard and R2 environment reader                                                                                                                     |
| Keep staging secrets out of Git                                    | PASS    | `git check-ignore .env.staging.local` identifies the ignored file; `git ls-files .env.staging.local` returns no tracked file                                                                                                                |
| Exact staging target selection                                     | PASS    | QA guard accepts only the supplied preview origin and Supabase project; no `.env.local` fallback                                                                                                                                            |
| Required local environment completeness                            | FAIL    | Required credentials are empty; exact names listed below                                                                                                                                                                                    |
| Vercel network/TLS reachability                                    | PASS    | All 32 requested preview routes returned HTTP 302 from Vercel; reachability does not establish application access |
| Configure and verify preview automation bypass                     | BLOCKED | `VERCEL_AUTOMATION_BYPASS_SECRET` missing; no local Vercel token/auth file found; Vercel integration not connected                                                                                                                          |
| Reach application behind protection / verify deployed revision     | BLOCKED | Every requested preview route redirects to `https://vercel.com/sso-api`; browser ends at `https://vercel.com/login`                                                                                                                         |
| Supabase network/TLS reachability                                  | PASS    | Staging `/auth/v1/health` responds HTTP 401 without an API key                                                                                                                                                                              |
| Supabase connectivity using configured public key                  | BLOCKED | Neither `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` nor `NEXT_PUBLIC_SUPABASE_ANON_KEY` is configured; a 401 without a key is not authenticated connectivity                                                                                     |
| Preview actually bound to staging database and R2                  | BLOCKED | Deployment environment cannot be inspected behind protection; a local target guard alone cannot prove server environment binding                                                                                                            |
| Designated admin account exists, confirmed, active, intended role  | BLOCKED | Read-only account diagnostic exits 1 before connecting: `DATABASE_URL` or `DIRECT_URL` required                                                                                                                                             |
| Valid administrator login                                          | BLOCKED | `qa:auth:staging` exits 1 before browser launch: `QA_STAGING_ADMIN_PASSWORD` missing; preview access also blocked                                                                                                                           |
| Invalid credentials produce application error                      | BLOCKED | Application auth endpoint cannot be reached past Vercel protection; no credential POST was sent to staging                                                                                                                                  |
| Diagnose earlier local smoke-test HTTP 503                         | PASS    | Local runtime targets `hldppfhtkfgthainismr.supabase.co`, not staging; fresh DNS lookup returns `ENOTFOUND`. Login route maps `backend_unavailable` to 503. This explains the earlier local failure, not a verified staging-account failure |
| Earlier local smoke environment service connectivity               | FAIL    | Existing `.env.local` Supabase hostname remains unresolvable; it was not reused or replaced for staging                                                                                                                                     |
| Admin session persistence after reload/direct navigation           | BLOCKED | Requires successful real admin login                                                                                                                                                                                                        |
| Admin section navigation and multiple-tab consistency              | BLOCKED | Requires successful real admin login                                                                                                                                                                                                        |
| Expiry, permissions, non-admin denial and protected APIs           | BLOCKED | `/api/admin/broadcast` returns Vercel's 302, not an application 401/403; no team/player identities available                                                                                                                                |
| Logout and post-logout access denial                               | BLOCKED | No real authenticated session established                                                                                                                                                                                                   |
| Password recovery delivery/callback/session termination            | BLOCKED | No staging application access or account access; no recovery email sent                                                                                                                                                                     |
| R2 public upload and image delivery                                | BLOCKED | Missing R2 credentials and public delivery configuration; no authorized admin session; staging bucket isolation not independently verified                                                                                                  |
| R2 private upload and authorized download                          | BLOCKED | Same credentials/access blockers; no private upload record created                                                                                                                                                                          |
| R2 private unauthenticated/cross-team denial                       | BLOCKED | No private test object or team/player sessions; cannot substitute a Vercel denial for application authorization                                                                                                                             |
| R2 logo/avatar/banner/sponsor replacement and deletion             | BLOCKED | No staging upload access; no existing object touched                                                                                                                                                                                        |
| Tournament create/read/edit/publish/unpublish/archive/delete       | BLOCKED | Preview access and authenticated staging session unavailable                                                                                                                                                                                |
| Season create/read/edit/archive/history-safe deletion              | BLOCKED | Same access blockers                                                                                                                                                                                                                        |
| Scrim create/read/edit/publish/archive                             | BLOCKED | Same access blockers                                                                                                                                                                                                                        |
| Team create/edit/manage/registration approval                      | BLOCKED | Same access blockers; designated team account missing                                                                                                                                                                                       |
| Player create/edit/archive and roster management                   | BLOCKED | Same access blockers; designated player account missing                                                                                                                                                                                     |
| Manual match scoring, correction and scoring-version selection     | BLOCKED | No designated staging match/team/player records can be created or read through the application                                                                                                                                              |
| Result draft/publication/unpublication and private-data separation | BLOCKED | No real match workflow available; `/api/broadcast` is protected by Vercel                                                                                                                                                                   |
| PUBG preview/import and duplicate handling                         | BLOCKED | `PUBG_API_KEY` and `QA_STAGING_PUBG_MATCH_ID` missing; no substitute match used                                                                                                                                                             |
| Public leaderboard values and scoring consistency                  | BLOCKED | `/api/leaderboard` returns Vercel 302; no actual published staging results available for comparison                                                                                                                                         |
| Broadcast control selection/save/revision/show/hide/reveal         | BLOCKED | Protected preview and missing admin session; no control document modified                                                                                                                                                                   |
| All OBS browser graphics with real published records               | BLOCKED | All 25 source URLs return Vercel 302; individual results below |
| Event branding/hierarchy draft, approval and archived identities    | BLOCKED | Local implementation exists, but staging deployment revision, database CAS and real administrator approval have not been verified |
| Template presets, crops, private preview and readiness gate         | BLOCKED | Requires accessible deployment and authenticated staging operator; local browser fixtures are separate evidence |
| Sponsor expiry, scope and rotation; event/day caster assignments    | BLOCKED | No staging sponsor/caster/R2 records created or inspected |
| Previous-program restoration and multiple producers                | BLOCKED | No real concurrent staging sessions; local transition/browser checks are not database acceptance |
| Actual OBS Studio capture, transparency and R2 artwork             | BLOCKED | No accessible published staging data or OBS capture performed                                                                                                                                                                               |
| Capture real connectivity/browser evidence                         | PASS    | Saved real HTTP status metadata, credential-presence booleans, DNS diagnosis, actual Vercel login screenshot and blocked command output                                                                                                     |
| Preserve protections and production data                           | PASS    | No protection disabled; no role grants, DB writes, R2 writes, migration, merge or deployment; production config read only for hostname diagnosis, with no production API requests or credential reuse                                       |

## Individual OBS source results

Every route below was requested from the supplied staging deployment. Each returned **HTTP 302 to Vercel SSO**, so each functional result is **BLOCKED**. Rendering, data correctness, polling, artwork, privacy and actual OBS capture are unverified.

| Source                      | Status  |
| --------------------------- | ------- |
| `/overlay/program`          | BLOCKED |
| `/overlay/scoreboard`       | BLOCKED |
| `/overlay/results`          | BLOCKED |
| `/overlay/winner`           | BLOCKED |
| `/overlay/mvp`              | BLOCKED |
| `/overlay/top-fragger`      | BLOCKED |
| `/overlay/top-damage`       | BLOCKED |
| `/overlay/players`          | BLOCKED |
| `/overlay/headshots`        | BLOCKED |
| `/overlay/rankings`         | BLOCKED |
| `/overlay/standings`        | BLOCKED |
| `/overlay/lower-third`      | BLOCKED |
| `/overlay/schedule`         | BLOCKED |
| `/overlay/sponsors`         | BLOCKED |
| `/overlay/opening`          | BLOCKED |
| `/overlay/closing`          | BLOCKED |
| `/overlay/killfeed`         | BLOCKED |
| `/overlay/road-to-finals`   | BLOCKED |
| `/overlay/road-to-finals-2` | BLOCKED |
| `/overlay/todays-matches`   | BLOCKED |
| `/overlay/map-intro`        | BLOCKED |
| `/overlay/countdown`        | BLOCKED |
| `/overlay/casters`          | BLOCKED |
| `/overlay/team-stats`       | BLOCKED |
| `/overlay/break`            | BLOCKED |

Headshot and killfeed telemetry also remain unsupported by a verified live pipeline, as documented previously. Merely opening those routes would not certify live data.

## Exact missing local environment variables

Only presence/absence was printed. No secrets, tokens, passwords, cookies, authorization headers or connection strings were printed or stored in the evidence.

| Purpose                             | Missing configuration                                                         | Requirement                                                                                                                        |
| ----------------------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Vercel preview automation           | `VERCEL_AUTOMATION_BYPASS_SECRET`                                             | Needed to exercise the protected preview without disabling protection                                                              |
| Supabase public-key probe           | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` **or** `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Configure one staging key, not both by necessity                                                                                   |
| Designated admin browser login      | `QA_STAGING_ADMIN_PASSWORD`                                                   | Email is already configured                                                                                                        |
| Server-side Supabase diagnostics    | `SUPABASE_SECRET_KEY` **or** `SUPABASE_SERVICE_ROLE_KEY`                      | Missing locally; actual deployed values remain unknown. Browser testing alone does not require handing a server key to the browser |
| Read-only account/schema inspection | `DATABASE_URL` **or** `DIRECT_URL`                                            | Must target staging; verified TLS helper checks project identity                                                                   |
| R2 SDK access                       | `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`                   | All missing locally; actual deployed values remain unknown                                                                         |
| R2 delivery                         | `R2_PUBLIC_BASE_URL`                                                          | Required by the current R2 environment reader even in proxy mode; configure the verified staging asset delivery origin             |
| R2 optional endpoint                | `R2_ENDPOINT`                                                                 | Empty, but derivable from a configured `R2_ACCOUNT_ID`                                                                             |
| R2 direct-mode frontend origin      | `NEXT_PUBLIC_R2_PUBLIC_BASE_URL`                                              | Empty; required to match server public origin if direct mode is selected. Current staging file selects proxy mode                  |
| Team acceptance account             | `QA_STAGING_TEAM_EMAIL`, `QA_STAGING_TEAM_PASSWORD`                           | Identifiers and local credential slot for subsequent designated-account testing                                                    |
| Player acceptance account           | `QA_STAGING_PLAYER_EMAIL`, `QA_STAGING_PLAYER_PASSWORD`                       | Identifiers and local credential slot for subsequent designated-account testing                                                    |
| Permitted PUBG import               | `PUBG_API_KEY`, `QA_STAGING_PUBG_MATCH_ID`                                    | Both absent; `PUBG_SHARD=steam` is already configured                                                                              |

Site/staging origins, Supabase project URL, admin email, separate R2 bucket names, proxy delivery mode and PUBG shard are configured. Confirm that the supplied bucket names resolve to isolated staging resources before any writes; names alone do not establish isolation.

## Bypass configuration and continuation

No existing bypass secret, Vercel process token or standard local Vercel auth file was found. Vercel and Supabase integrations were discovered as available but are not installed/connected; no account-management access was assumed.

An authorized project member can obtain a project automation bypass secret through Vercel's Deployment Protection settings and store it locally as `VERCEL_AUTOMATION_BYPASS_SECRET`. Keep protection enabled. Follow [Vercel's automation bypass documentation](https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation). Do not place the secret in a URL or report.

QA support is prepared: direct probes send the bypass header only to the designated origin and never follow redirects. Browser QA bootstraps a host-scoped Vercel bypass cookie using a no-redirect request; it does not install a global secret header. This configured-secret branch has not been exercised because the secret is absent. Application authentication and permission checks still apply.

Configure missing values in the ignored `.env.staging.local` or approved local secret manager, then run:

```sh
node qa/staging-connectivity-evidence.mjs
node --env-file=.env.staging.local qa/auth-account-readiness.mjs
npm run qa:auth:staging
```

Do not run generic scripts that load production `.env.local` for staging. After confirming the deployed server actually targets staging, continue all blocked workflows using uniquely named new staging test entities. Do not replace existing assets/results, alter historical scoring, automatically grant roles, or use production records. If the latest patch is not deployed on this preview, prepare an explicitly staging-only deployment through the existing workflow before accepting its results.

## Evidence and commands

- [Real HTTP/environment/DNS evidence](../qa-artifacts/staging-verification/connectivity.json): 24 real preview GET requests plus staging Supabase health; checker exited 1 because acceptance prerequisites are missing.
- [Actual browser capture](../qa-artifacts/staging-verification/deployment-access.png): Vercel login screen; visually inspected.
- [Latest credential-file presence check](../qa-artifacts/staging-verification/env-presence.json): exact path, modification time, encoding flags and nonempty booleans only; no values exposed.
- [Latest blocked admin browser run](../qa-artifacts/staging-verification/resumed-auth-run.txt): exit 1, missing `QA_STAGING_ADMIN_PASSWORD`, before browser launch.
- [Latest blocked account diagnostic](../qa-artifacts/staging-verification/resumed-account-readiness.txt): exit 1, missing `DATABASE_URL`/`DIRECT_URL`, before database connection.
- Repeatable probe: `qa/staging-connectivity-evidence.mjs`; no service mutations. Node syntax checks for this script and `qa/auth-staging-e2e.mjs` passed.

Evidence artifacts are ignored by Git. This report preserves observed outcomes in the release documentation; the local evidence files remain available for review. No broad local regression suite was rerun as a substitute for staging acceptance.

Staging cannot be accepted until the blocked real workflows are exercised. Production remains blocked.
