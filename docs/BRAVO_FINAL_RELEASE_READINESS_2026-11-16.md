# Bravo Gaming Esports — final release readiness

Evidence refreshed: **17 November 2026, 16:16 NPT**
Branch: `codex/platform-completion-20261104`
Audited local/remote feature SHA: `e025f9cdf85bb4aa618b4c0c1e7242aa783b6d9d`
Verified main SHA: `c7311530a17cbb63ba5b4e3df0ef2da44acb7953`

## Executive decision

The preserved application source is locally healthy, but the release is **not ready to merge or deploy**. The exact feature SHA passed GitHub Actions and the refreshed local source passed typecheck, the 26-command QA chain, production build, dependency audit, browser workflow suites and the 38-mode broadcast fixture check. Real staging acceptance remains blocked by infrastructure and credentials, not by a confirmed new application defect.

The only remote change during this execution is owner-approved V1 Standard Protection on the canonical Vercel project. No DNS record, environment binding, Git integration, Supabase object, administrator account, OAuth provider, R2 object, Git index, commit, push, merge or deployment was changed.

## Release decisions

| Decision | Status | Evidence/reason |
| --- | --- | --- |
| LOCAL SOURCE READY | YES | Refreshed checks below pass; no staged files |
| GITHUB FEATURE BRANCH READY | BLOCKED | Existing feature SHA `e025f9…` is preserved and its CI passed, but the 23-path final local candidate is uncommitted/unpushed and further pushes remain blocked by Preview safety |
| VERCEL PREVIEW PROTECTED | YES | V1 completed: canonical `ssoProtection.deploymentType=prod_deployment_urls_and_all_previews`; exact Preview and branch alias return anonymous HTTP 302 to Vercel Authentication while production remains HTTP 200 |
| VERCEL PREVIEW RESOURCE ISOLATION VERIFIED | NO | The local workspace link is now canonical and metadata supports staging Supabase/no R2, but effective server-key ownership and dedicated R2 token scope are unproven |
| DUPLICATE DEPLOYMENTS RESOLVED | YES | V2/V3 completed: both duplicate projects retain history/domains but no longer have a Git link; only canonical can react to repository pushes |
| CUSTOM DOMAIN VERIFIED | NO | All configured custom hosts are NXDOMAIN; `.esports` is not delegated |
| STAGING DATABASE SCHEMA READY | NO | OpenAPI exposes missing profile/scoring/registration objects; authoritative catalog evidence is unavailable |
| STAGING MIGRATIONS APPLIED | UNKNOWN | Migration ledger is unread; no remote migration was attempted |
| ADMINISTRATOR LOGIN VERIFIED | BLOCKED | Password absent, compatible profile link absent, required profile schema missing |
| DISCORD LOGIN VERIFIED | NO | Staging redirect uses an email-shaped client ID |
| TOURNAMENT OPERATIONS VERIFIED | BLOCKED | Local fixtures pass; real staging authenticated CRUD not run |
| SCRIM OPERATIONS VERIFIED | BLOCKED | Local fixtures pass; real staging authenticated CRUD not run |
| REGISTRATION CONCURRENCY VERIFIED | BLOCKED | Migration 028 passes isolated PostgreSQL; multi-connection staging test awaits schema recovery |
| SCORING AND LEADERBOARDS VERIFIED | BLOCKED | Migrations 026–027 pass isolated PostgreSQL; real staging publication is unavailable |
| R2 PUBLIC/PRIVATE VERIFIED | NO | Current credentials can address shared production buckets; no dedicated staging pair exists |
| PUBG IMPORT VERIFIED | BLOCKED | No permitted match ID or authorized live credential evidence |
| ALL 38 GRAPHICS VERIFIED WITH REAL DATA | BLOCKED | All 38 pass fixture/browser QA; real published staging records are unavailable |
| ACTUAL OBS ACCEPTANCE VERIFIED | NOT RUN | Requires an OBS operator and accepted staging data/source access |
| FINAL CI PASSED | NOT RUN | Exact remote SHA CI passed, but the final 23-path local candidate has not been committed/pushed and therefore has no GitHub Actions run |
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
| `npm test` | PASS | All 26 chained QA commands passed, including isolated PostgreSQL migrations 026–028 |
| `npm run qa:secrets` | PASS | 578 tracked/candidate files; no credential patterns |
| `npm run qa:broadcast` | PASS | Publication/privacy/outage checks passed |
| `npm run qa:broadcast:ui` | PASS | 11/11 against a built local server; registered 38-mode canvas test passed |
| `npm run qa:client-interactions` | PASS | 17/17 |
| `npm run qa:auth-provider` | PASS | 4/4 fixture tests; no live login claimed |
| `npm run qa:workspaces` | PASS | 5/5 |
| `npm run qa:master-workflows` | PASS | 4/4 |
| `npm run build` | PASS | Next.js 16.4.5; 147 pages generated |
| `npm audit` | PASS | Zero vulnerabilities |
| `git diff --check` | PASS | No tracked whitespace errors before documentation refresh |
| `npm run qa:staging-readiness` | FAIL/BLOCKED | Wrong QA origin, schema drift, invalid Discord client ID, absent admin password |

The first broadcast UI attempt returned 11 `ERR_CONNECTION_REFUSED` failures because no server was running. The unchanged suite passed 11/11 once the successful production build was served. The initial failure is retained as orchestration evidence and was not suppressed.

## Vercel evidence

| Project | Verified current state | Required owner action | Acceptance criterion |
| --- | --- | --- | --- |
| `bravo-gaming-esports-nextjs` (`prj_xbU…`) | Canonical; `main`; V1 Standard Protection active; exact Preview and branch alias redirect anonymous requests to Vercel Authentication; generated production alias and `/api/version` remain HTTP 200 at `c731153…`; metadata shows staging Supabase, no direct SQL and no R2 | Separately approve dedicated Preview R2 configuration and protected test access when resources exist | Protection remains active; production stays public; effective Supabase and R2 ownership/scope proven |
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
| Admin identity | Auth identity reported confirmed | Offline routes/session/error handling pass | Supply private `QA_STAGING_ADMIN_PASSWORD`; inspect Auth UUID/profile after schema repair; separately approve linkage/elevation | Real login, refresh, admin API/dashboard, denial cases and logout pass |
| Discord | Provider enabled; callback targets staging; client ID invalid | Offline intent/callback/role tests pass | Separately approve numeric app ID `1530095874594836581` plus matching secret and callback configuration | Full OAuth, guild/role mapping, session and denial tests pass |
| Tournament/scrim/team/player | Implementation and fixtures pass | CRUD, capacity, slots and role boundaries covered locally | Run designated-record staging CRUD after admin access | Readback, edits, archive/cleanup and authorization pass |
| Scoring/publication | Isolated SQL and workflow fixtures pass | Atomic writes, revision conflicts, audit rollback and direct-write denial covered | Apply approved repair, then use staging records | Saved/public totals, stale conflicts, corrections, audit and public boundaries pass |
| PUBG | Client/import pipeline passes locally | Security/parser/import fixture QA passes | Configure authorized key and permitted match ID locally | Import/reimport/repair and scoring comparison pass without duplicate/fabricated results |
| R2 | Dedicated staging buckets created; authenticated upload/read and cleanup passed; token isolation fails | Test writes used only staging buckets and were deleted; current token still reaches both production buckets | Supply `CLOUDFLARE_API_TOKEN` or manually create a token restricted to the staging pair, then approve Preview bindings | Production buckets denied; application public/private delivery and access boundaries pass |
| Broadcast/OBS | 38 registered graphics and `/overlay/program` pass fixture/browser QA | Control, canvas, pagination and outage behavior verified locally | Publish real staging records, provide authorized Preview/local staging access and an OBS operator | All 38 use approved data; actual 1920×1080 OBS transparency/update/recovery accepted |

## GitHub and worktree

- Local HEAD and remote feature branch: `e025f9cdf85bb4aa618b4c0c1e7242aa783b6d9d`.
- Remote `main`: `c7311530a17cbb63ba5b4e3df0ef2da44acb7953`; feature is three commits ahead, zero behind.
- GitHub Actions run `43519330298` for the exact feature SHA: completed/success; configured `offline` job passed.
- PR #1 remains open, non-draft and unmerged on the older `feature/obs-broadcast-overlay` architecture. Retain for comparison or close only with owner approval; do not merge it into the 38-mode implementation.
- Nothing is staged. No commit or push is authorized. `AGENTS.md` remains separate repository guidance.
- The candidate inventory is maintained in `docs/release-file-manifest.md`; ignored environments, QA outputs and credential files remain excluded.

## Remaining external access

All approval gates are authorized, but execution remains evidence-gated. The exact missing access is: a valid staging `SUPABASE_ACCESS_TOKEN` or staging-only least-privilege `DIRECT_URL`/`DATABASE_URL`; `CLOUDFLARE_API_TOKEN` capable of creating a two-bucket-only R2 token; Discord OAuth Client Secret; `QA_STAGING_ADMIN_PASSWORD` after schema compatibility; designated team/player accounts; and a permitted PUBG match ID. Production merge, migrations and deployment remain blocked until real staging acceptance passes.
