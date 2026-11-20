# Release execution report — 13 November 2026

## Final gap-closure decision — 18 November 2026

The final preserved feature SHA is `f322affa3c9a864621afab15af9d452331384171`. Exact-SHA GitHub Actions run `44117785592` passed and protected Preview `dpl_HffsSeACPP2m7UKDDfwxwMZW4UBN` is READY. Production remains unchanged at main SHA `c7311530a17cbb63ba5b4e3df0ef2da44acb7953` and deployment `dpl_7ytcSWrPN23ugzduYznDTcuygJd4`; no merge, production migration or deployment occurred.

The production decision is **HOLD / NO-GO**. Authoritative staging schema and migration-ledger evidence, isolated R2 credentials, real admin/Discord/workflow/PUBG/OBS acceptance and a working controlled custom domain are still absent. Fresh production public smoke also timed out at `/mvp-ranking`, `/api/leaderboard` and `/api/home`, and production canonical metadata still references the old Vercel hostname. These observations require diagnosis after staging prerequisites are resolved; they are not suppressed or relabeled as passes.

Older sections below are retained as historical execution evidence.

## V1 production-continuity verification — 17 November 2026

Canonical Standard Protection is active and verified on Preview. The exact Preview and branch alias now redirect anonymous requests to Vercel Authentication. The generated production alias and `/api/version` remain public HTTP 200 at production SHA `c7311530a17cbb63ba5b4e3df0ef2da44acb7953`, deployment `dpl_7ytcSWrPN23ugzduYznDTcuygJd4`. No deployment, production variable, branch or domain setting changed. Production release decision remains **HOLD** because resource isolation, duplicate targets, schema and real staging acceptance are incomplete.

## Current release update — 14 November 2026

**Release decision remains HOLD.** The former 104-path candidate is now committed and pushed at `e025f9cdf85bb4aa618b4c0c1e7242aa783b6d9d`; local and remote feature HEAD match. No further commit or push was performed in this execution.

GitHub Actions run `43519330298` passed every configured step for the exact SHA. The combined commit state remains failure because two Vercel projects failed; one exact-SHA Preview succeeded and is publicly reachable. That Preview proves the staging Supabase URL source guard and public-key provider read, but R2 delivery returns HTTP 500 and complete Vercel bindings remain inaccessible without login. Further pushes remain blocked.

Fresh staging reads reconfirm the 401 management token, production-targeting database URLs, missing remote schema/RPC contract, confirmed-but-unlinked administrator identity, malformed Discord Client ID and missing QA credentials. Production `/api/version` remains on `c7311530`; the production Supabase hostname returns NXDOMAIN. No staging or production mutation was performed.

Current gate decisions: local development **YES**; GitHub feature branch preserved **YES**; final CI **YES for the exact offline workflow**; Vercel isolation **BLOCKED**; staging schema **NO**; real admin/Discord/scrim/scoring/R2/PUBG/OBS acceptance **BLOCKED**; main merge and production deployment **NO**.

**Release decision: HOLD.** The approved 230-file snapshot is already committed locally as `7eeded0260887bb31d5090fc1ee47643a8e07a79`. Subsequent fixes are a separate, uncommitted candidate; its exact 104 paths, including the consolidated handoff report, are staged for owner review. No new commit, push, PR, merge, remote migration, provider/account change or deployment was performed in this continuation. No production records or R2 objects were modified.

PASS means the named check passed in its stated environment. FAIL identifies an observed defect or rejected configuration. BLOCKED means its acceptance prerequisites are unavailable. Local fixture results never substitute for real staging or OBS acceptance. Current client/report date is **13 November 2026, Asia/Kathmandu**; older evidence below retains its actual date. No past scrim is presented as today's event.

## A. Source, local quality and security

Branch: `codex/platform-completion-20261104`. Local HEAD: `7eeded0260887bb31d5090fc1ee47643a8e07a79`. The index exactly matches the 104-path reviewed follow-up; it has not been committed. [The manifest](release-file-manifest.md) separates the pending candidate from the complete delta against current remote main/deployed baseline `c7311530a17cbb63ba5b4e3df0ef2da44acb7953`. Existing code, historical migrations and user work were preserved. `AGENTS.md` is retained as untracked repository guidance and excluded from the application candidate.

The candidate retains the existing Next.js, Supabase, R2 and broadcast architecture. It adds bounded authentication requests, safe rejected-session cookie cleanup, explicit local staging launch, hydration-safe forms/navigation/motion, historical statistics identity handling, event-scoped scrim slots, saved scoring decisions in standings, a Team Slots graphic, Preview resource guards and credential-free CI preparation. Registration review found a genuine event-confirmation gap; migration 028 and its service wrappers now close it in the isolated local database as described in sections C and D. Local fixes do not constitute a deployed authentication or staging-schema repair.

| Check | Status | Verified scope / evidence |
| --- | --- | --- |
| Public browser suite | PASS | **72/72**, 11 November, staging-backed localhost; original assertions retained. `release-public-stable.txt`. Successful admin login was not part of this pass; contact transport was intercepted by its existing browser fixture |
| Original public failures investigated | PASS | Nov6 statistics keys/links, early login interaction and menu behavior were real local issues; Nov11 motion hydration and pre-hydration native form GET were also reproduced and repaired. A server-restart connection reset was rerun. Failed artifacts remain preserved; no assertion was skipped or suppressed |
| Default offline suite | PASS | **26 QA commands**, 13 November, `final-2026-11-13-tests.txt`, including eight registration boundary cases and actual 026/027/028 PGlite SQL. Actual route/SDK fixtures are included; no remote database mutation. Earlier evidence is retained |
| Hydration/slots/statistics browser regressions | PASS | **17/17**, 11 November, `release-client-fixtures.txt` |
| Auth provider browser fixtures | PASS | **4/4**, 11 November, `release-auth-provider.txt`; simulated identities and sessions |
| Admin workspace browser fixtures | PASS | **5/5**, 11 November, `release-workspaces.txt` |
| Manual workflow browser fixtures | PASS | **4/4**, 11 November, `release-master-workflows.txt` |
| Broadcast browser fixtures | PASS | **11/11**, rerun 13 November against the restored explicit staging localhost; 38 graphics plus program, outage hiding/recovery, paging, saved slots and countdown. The immediately preceding invocation after the build stopped the server failed only with 11 `ERR_CONNECTION_REFUSED` results; it is preserved and was not treated as an application pass |
| Final affected browser fixtures | PASS | **30/30**, 13 November, `release-2026-11-13-browser.txt`: auth, workspaces, manual workflows and all 17 client regressions rerun with the registration safety change |
| Production-mode local build | PASS | 13 November, `final-2026-11-13-build.txt`, 147 generation tasks. This was a local build, not a deployment |
| TypeScript / ESLint | PASS | Final 13 November commands exit 0; `final-2026-11-13-types.txt` and `final-2026-11-13-lint.txt`. Nine existing importer warnings are retained; zero lint errors |
| Dependency audit | PASS | Fresh `npm audit --json`, 13 November, zero advisories in `final-2026-11-13-audit.json` |
| Unused-code analysis | FAIL, nonblocking maintenance | Fresh 13 November `analyze` exits 1: 15 exports and six types reported. This includes the Preview policy export actually invoked through Next's dynamic config import. Remaining compatibility/public helpers were not blindly deleted or ignored |
| Preview resource policy | PASS locally | Actual Next config/runtime reader regressions reject production Supabase targets/legacy fallbacks and the known shared R2 bucket names. This does not verify actual Vercel bindings or opaque-key ownership |
| CI preparation | PASS locally; remote execution BLOCKED | Read-only workflow, pinned action revisions, no service secrets/deployment/migration commands. YAML/security checks passed. Workflow is uncommitted and has not run on GitHub |
| Secret/whitespace and exact-file review | PASS | 13 November: secret patterns checked across 564 tracked/candidate paths; tracked/index/untracked whitespace and conflict checks pass. Manifest covers **104 pending paths / 403 complete delta**; the index exactly matches the 104-path candidate. Ignored credentials/builds/artifacts excluded; pattern scanning cannot guarantee detection of every secret format |

Evidence is retained locally under `qa-artifacts/blocker-recheck/` and the named browser output directories, all ignored by Git. The latest follow-up verification is appended to the current audit; earlier passing runs are not relabeled as fresh runs.

## B. Authentication and account access

Fresh read-only evidence through `2026-11-13T14:28:51Z` is retained in `current-access-2026-11-13.json`, `safe-access-shape-diagnostics.json` and `staging-openapi-schema-readonly.json`.

| Workflow | Status | Observed result / exact requirement |
| --- | --- | --- |
| Staging publishable/server key connectivity | PASS | Auth settings 200; secret-key empty profiles read 200; exact project `yppefayrepkqpqtprbqa` |
| Original local 503 diagnosis and local fix | PASS | `.env.local` still contains production hostname `hldppfhtkfgthainismr.supabase.co`, which fails DNS. Default `npm run dev` now uses the guarded staging launcher; a live intentionally invalid login returned 401 instead of 503. Raw `dev:webpack`/`dev:turbopack` remain explicit |
| Current auth-only localhost availability | PASS | Explicit staging runtime restored at `http://localhost:3000`: fresh `/admin/login` 200, `/api/auth/providers` 200 with Discord explicitly disabled, anonymous `/api/admin/broadcast` 401. `local-staging-pages-2026-11-13.json`; no credentials sent or successful login claimed |
| Designated Auth identity | PASS | `sangamka076@gmail.com` exists and is email-confirmed. Its identity and password were preserved |
| Required profile/schema | FAIL | Read-only staging OpenAPI shows the actual exposed profile table lacks `role_source`, `is_active`, `discord_guild_id`, `discord_role_ids`, `discord_mapped_roles`, `discord_role_synced_at`, `discord_team_role_id` and `discord_team_verified_at`. Base projection succeeds and finds zero profiles linked to this account. The exact applied ledger remains unknown |
| Real administrator email/password login | BLOCKED | `QA_STAGING_ADMIN_PASSWORD` absent; required schema and active linked profile are also missing. No successful login claimed |
| Temporary admin provisioning/removal | BLOCKED | Inspect schema/ledger first, then obtain approval for the exact existing-account profile linkage/role operation. No automatic role grant or password reset |
| Session persistence, refresh, direct protected navigation and logout | BLOCKED on real staging | Actual local SDK/route/browser regressions pass, but no accepted real administrator session exists |
| Administrator permissions / cross-role denial | BLOCKED on real staging | Local anonymous denial and role fixtures pass; real admin/team/player sessions unavailable |
| Password recovery delivery / successful callback | BLOCKED | No approved real recovery test completed; no recovery email requested |
| Discord provider configuration | FAIL | Fresh 13 November authorization metadata still uses an email as `client_id`, rather than a numeric Application ID. Callback targets the staging project. Verified intended bot Application ID was `1530095874594836581`; matching provider secret remains unverified |
| Discord consent, callback, role sync, session and logout | BLOCKED | Correct intended ID/secret pairing, complete schema and interactive consent are required. Local Discord can remain explicitly disabled without changing the remote provider or trusting derived administrator roles |

Login handling distinguishes safe 400/401/403/429/500/503 responses and retains rate headers. Rejected login/OAuth flows expire incoming/new/chunked/late cookies even if SDK sign-out fails. Server fetches retain TLS, caller cancellation and a 10-second request/body deadline. These implementation passes do not prove successful real administrator login.

Prepared administrator operation, not executed: after the profile schema is reconciled and the owner explicitly approves the `admin` role, privately set an owner-generated password of at least 16 characters for the existing Auth identity, store the same value only as `QA_STAGING_ADMIN_PASSWORD` in ignored `.env.staging.local`, then run `node scripts/provision-staging-admin.mjs --email=sangamka076@gmail.com --role=admin --project-ref=yppefayrepkqpqtprbqa --confirm=PROVISION --password-env=QA_STAGING_ADMIN_PASSWORD`. Do not pass `--create-if-missing`; the confirmed identity already exists. If later ledger inspection finds an existing linked profile that would change, stop and obtain an additional explicit approval before adding `--allow-existing-profile-change=APPROVE`. The isolated `--check` mode passes and performs no account/profile request.

## C. Database, migrations and recovery

| Check | Status | Verified limit |
| --- | --- | --- |
| Designated staging project | PASS | `yppefayrepkqpqtprbqa`; production `hldppfhtkfgthainismr` is never a staging fallback |
| Local migration inclusion/order | PASS | All 001–028 tracked; 026 precedes 027 and new forward-only 028 follows both. No historical SQL file was edited |
| Migration 022 preservation | PASS locally; remote content UNKNOWN | Committed blob `5ef09811d8a4d3e9e885f93fa90b1b6757cd8314` retained; activation correction is forward migration 024. Do not rewrite/replay 022 to repair a remote ledger |
| Migration 026 execution | PASS in isolated fixture | Actual SQL executes in focused PGlite schema; decimal scoring, legacy/versioned MVP, constraints and known compatibility views tested. Unknown-dependency abort reviewed in SQL; no explicit unexpected-view negative test claimed |
| Migration 027 execution | PASS in separate isolated fixture | Actual SQL executes against reconstructed post-026-style schema; transaction rollback, CAS/retries, audit failures, publication conflicts and direct-write restrictions tested |
| Migration 028 execution | PASS in separate isolated fixture | Actual SQL executes against the focused registration/event schema; service-only intake, approval, rollback, audit, duplicates, capacity/slots, legacy bridging, atomic roster writes and queued contention tested. Migration 027's idempotent publication-membership pattern remains compatible |
| Transactional result API boundary | PASS locally | `commit_competition_match` handles parent/child replacement, revisions, publication, event counts and required audit in one transaction; missing RPC fails closed. Direct browser DML grants are revoked |
| Transactional registration/event-roster boundary | PASS locally | `create_event_registration`, `confirm_event_registration`, `set_event_registration_status` and `commit_competition_event` serialize writers, enforce eligibility/duplicates/capacity/slots, require audits and roll back atomically. Browser direct DML is revoked while reads remain available |
| Actual staging compatibility | FAIL / ledger BLOCKED | Read-only OpenAPI shows `matches.scoring_rules`, `matches.revision`, four 026 match-team decision columns and `event_teams.registration_id` absent; the 027/028 RPCs are absent. This is consistent with 026–028 not being applied, but only the migration ledger can establish recorded versions/content |
| Full migration chain / target ledger | BLOCKED | The fixtures do not run restored 001–028 or 026→027→028 together in the target database. `SUPABASE_ACCESS_TOKEN` has a personal-token shape but returns 401. `DATABASE_URL` identifies production through its pooler username and `DIRECT_URL` identifies the production direct host; both are rejected before any connection |
| Independent-connection concurrency | BLOCKED | PGlite queues one connection; its competing-request tests are not Supabase multi-connection lock stress |
| Backup and restore rehearsal | BLOCKED | No target backup, schema/view/grant inventory or restore test verified. No remote migration approval requested or inferred |

Before any migration: inspect the target/project, exact ledger and recorded SQL; inventory dependencies/grants and old-schema readers; prepare a restorable backup and test restore; pause writers; review ordered forward changes and obtain explicit approval. Migration 026 aborts on unknown dependent views rather than using CASCADE. Application rollback must retain decimal scores, additive columns and audit history; stop incompatible writers and use reviewed forward repair or separately approved restoration. Do not blindly apply 017–019 based solely on missing fields.

The prepared forward-only decision is conditional on that ledger inspection. If versions 017–019 and 026–028 are genuinely absent, preserve their SQL and apply only the reviewed missing ordered prefix after a successful rehearsal and separate approval. If any version is recorded but its expected objects are missing, do not edit or replay it: prepare a new 029 reconciliation migration limited to the verified column/table/function/policy/grant delta. No 029 SQL is finalized while policies, grants, dependencies and recorded checksums remain inaccessible.

Backup/restore gate: export the target ledger plus schema, policies, grants and data using a staging-verified connection; record checksums and row counts; restore that backup into an isolated disposable database/branch; run the 026→028 preflight, migrations and independent-connection contention tests there; verify restoration and application rollback; take a fresh staging backup immediately before an approved maintenance window. Recovery uses a reviewed forward repair or separately approved tested restore—never historical-file edits or an untested destructive reset.

## D. Tournament, scrim, registration and results workflows

| Workflow | Status | Actual result / remaining action |
| --- | --- | --- |
| Tournament/season CRUD and publication | BLOCKED on staging | Local workspace/API fixtures pass; real admin access, complete schema and isolated Preview unavailable |
| Scrim CRUD, schedule and private lobby data | BLOCKED on staging | Local fixtures cover revisions, explicit event/time/map selection and public/private projection. No real event was created |
| Event-scoped team slots | PASS locally; staging BLOCKED | Unique slot/team/capacity validation, manual/auto assignment, locking, withdrawal release and saved-only copy; real multi-operator acceptance still required |
| Public event registration → confirmed roster | PASS locally; staging BLOCKED | Migration 028 atomically validates the event and canonical active team, updates both ledgers, establishes event membership/slot and requires audit. Idempotent retries and failure rollback pass. The migration is not applied remotely |
| Concurrent duplicate registration intake | PASS in isolated queued fixture; staging BLOCKED | Database constraints and event-row locking reject active duplicate team/captain submissions and over-capacity confirmation without partial writes. PGlite is single-connection/queued; independent Supabase connection stress remains required |
| Global team intake approval / logo lifecycle | PASS locally; staging BLOCKED | Existing canonical identity/CAS/logo compensation remains; approval is team-registry review, not an event-slot promise |
| Team/player/roster management | BLOCKED on staging | No accepted admin session; designated team/player credentials absent. Full real roster/history and remaining requested master fields are not certified |
| Match manual entry, corrections, publication/unpublication | PASS locally; staging BLOCKED | Atomic/versioned-score and validation regressions pass. No real staging match/result mutated |
| Standings/leaderboard calculations | PASS locally; staging BLOCKED | Saved totals/decimals/penalties/bonuses/DQ count preserved; no published acceptance records verified |
| PUBG preview/import/duplicate handling | BLOCKED | `PUBG_API_KEY` present, but `QA_STAGING_PUBG_MATCH_ID` absent. No invented or unauthorized match used |

The complete forward registration change is now prepared and tested locally. Migration 028 gives approval, rejection/rollback and event editing compatible event locks and membership ownership semantics; migration 027 publication remains idempotent. This evidence supports review only: inspect the actual target ledger/schema and restore plan, test independent connections, and obtain explicit owner approval before any staging application. No remote change is authorized.

Future Friday/Saturday scrims remain explicitly configurable with saved Asia/Kathmandu dates/times and owner-authorized teams/maps. Empty offline score templates are in [templates](templates); they are contingency records, not accepted live data.

## E. Broadcast, graphics and R2

| Workflow | Status | Scope |
| --- | --- | --- |
| Studio/control/readiness/private preview | PASS locally; staging BLOCKED | Workspace and browser fixtures verify existing control architecture; no accepted producer session or control write on staging |
| 38 dedicated graphics plus `/overlay/program` | PASS browser fixtures; staging BLOCKED | All registered modes render at 1920×1080; original 37 retained and Team Slots added. See individual current-route matrix in [staging verification](staging-verification.md) |
| Dynamic program data, countdown and outages | PASS locally; staging BLOCKED | Fixtures verify saved changes, show/hide/reveal, paging, server-clock countdown and hiding stale graphics on failure. No live telemetry pipeline is fabricated |
| Graphics driven by actual published staging results | BLOCKED | No accepted real published staging match/leaderboard/control records |
| R2 isolation | BLOCKED | Five staging account/key/bucket fields equal preserved default `.env.local` values. This is a verified isolation concern, not proof of actual deployed production binding. No credentialed R2 request made |
| Public upload/delivery/replacement | BLOCKED | Verify dedicated bucket/account/token ownership and authenticated staging access before any object write |
| Private upload/download and cross-role denial | BLOCKED | Same isolation blockers plus missing real team/player sessions. No private test object exists |
| Actual OBS Studio capture/transparency/artwork | BLOCKED / NOT TESTED | Browser screenshot/canvas evidence does not establish OBS Studio GPU/browser-source behavior |

The Preview guard rejects both existing shared bucket names. Use owner-verified dedicated staging buckets and bucket-limited credentials, then inspect effective Vercel bindings. Local guard tests cannot establish opaque Supabase key ownership, R2 account ownership or token scope. Keep deployment protection enabled.

## F. GitHub, Preview and deployment

Fresh read-only GitHub inspection on 13 November: remote main remains `c7311530a17cbb63ba5b4e3df0ef2da44acb7953`, the release branch is absent remotely, and main reports `protected:false`. No branch-protection setting was changed. PR #1 is open/non-draft with the competing overlay implementation; its six-path overlap must be resolved deliberately. PR #2 is an unrelated draft Analytics integration targeting another feature branch; leave it untouched.

| Gate | Decision | Exact next action |
| --- | --- | --- |
| LOCAL COMMIT | READY; not authorized | Final exact-snapshot checks pass. Local preservation is technically independent of staging; a new local-only commit still requires explicit approval and does not authorize any remote action |
| FEATURE-BRANCH PUSH | BLOCKED | Inspect effective Preview/branch/shared/integration bindings and Git automation; verify staging-only Supabase/R2 resources, then obtain separate push approval. A push can trigger deployment |
| DRAFT PR | BLOCKED | [Prepared text](draft-pull-request.md) is local only. Requires approved isolated push and separate PR approval |
| MAIN MERGE | BLOCKED | Resolve PR #1 overlap, target-schema/independent-concurrency and real staging/OBS acceptance, CI and explicit merge approval |
| PRODUCTION DEPLOYMENT | BLOCKED | All prior gates, restored production connectivity, verified backups/restore and separate migration/deployment approvals are required |
| Preview protection/bypass | BLOCKED | Fresh `/api/version` returns 302 to Vercel SSO; `VERCEL_AUTOMATION_BYPASS_SECRET` absent. Protection was not disabled |
| Deployed Preview resource isolation | BLOCKED | Available Vercel/Supabase plugins are not installed; no Vercel token or CLI login is available. Actual effective bindings/scopes remain unknown |
| Current production baseline health | Limited historical PASS | Nov11 unauthenticated home, scrims, version and scrims API were 200 on old c731. This is not a smoke test of the candidate |
| Production authentication backend | FAIL | Fresh Nov13 uncredentialed DNS/health requests to configured production Supabase fail `ENOTFOUND` |
| New production deployment / smoke tests | BLOCKED / NOT RUN | No deployment performed; no new production smoke acceptance possible |

Exact missing entries: `QA_STAGING_ADMIN_PASSWORD`, `VERCEL_AUTOMATION_BYPASS_SECRET`, `VERCEL_TOKEN`, `CLOUDFLARE_API_TOKEN`, `QA_STAGING_TEAM_EMAIL`, `QA_STAGING_TEAM_PASSWORD`, `QA_STAGING_PLAYER_EMAIL`, `QA_STAGING_PLAYER_PASSWORD`, `QA_STAGING_PUBG_MATCH_ID` and `DISCORD_CLIENT_SECRET`. Management inspection also needs a valid `SUPABASE_ACCESS_TOKEN` or staging-verified `DATABASE_URL`/`DIRECT_URL`; current values are present but invalid for that purpose. A connected integration can replace the corresponding management token. Do not share values in chat or commit them.

Required sequence: connect read-only infrastructure access; verify resource isolation; inspect ledger/dependencies and backup/restore; review and explicitly approve the exact staging migration/profile/provider operations; apply and independently stress the registration transaction in staging; establish a real administrator session; complete tournament/scrim/team/player/R2/scoring/publication/leaderboard/graphics/OBS acceptance using designated staging records; only then request the separate remote release approvals. No authorization is inferred from a passing fixture, an available integration or this document.

## G. Final YES/NO decisions

| Required decision | Answer |
| --- | --- |
| LOCAL CODE READY | **YES** — final exact-snapshot checks pass; this does not authorize a commit or remote migration |
| GITHUB FEATURE BRANCH READY | **NO** — uncommitted follow-up, no new approval, isolation unverified |
| STAGING DEPLOYMENT READY | **NO** — resource bindings and required target schema unverified |
| STAGING ACCEPTANCE PASSED | **NO** |
| PRODUCTION DEPLOYMENT APPROVED | **NO** |
| PRODUCTION DEPLOYMENT COMPLETED | **NO** |
| PRODUCTION SMOKE TESTS PASSED | **NO** |
