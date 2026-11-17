# Release audit — 13 November 2026

## Authorized infrastructure completion — 17 November 2026

The canonical Vercel project is now the only Git-connected project. Standard Preview protection remains active and was independently verified by anonymous HTTP 302 responses. Both duplicate project Git integrations were disconnected without deleting deployments, history or the `.com.np` assignments. Production remains public at the unchanged main SHA.

Dedicated staging R2 buckets now exist and passed real put/get/content-type/cleanup tests. The credential used for those tests also reaches both known production buckets, so credential isolation is **FAIL** and the credential was not bound to Preview. A new token restricted to the two staging buckets is still required.

Protected QA reaches the canonical branch alias using an ignored local automation bypass. It reconfirms staging Auth availability and the exact schema/Discord blockers, but real administrator login cannot run because `QA_STAGING_ADMIN_PASSWORD` is absent and required profile schema is unavailable. Supabase management remains 401, configured SQL URLs identify production and are rejected by the target guard, and no remote SQL or account mutation occurred.

The reviewed candidate is 24 paths. Typecheck, 26 QA commands, inspector safety, secret scan, lint with nine existing warnings and zero errors, and a 147-page production build pass. Full authorization permits preservation of this candidate on the feature branch; it does not convert evidence failures into staging acceptance or authorize an unsafe production release.

Current gate decisions before the new preservation commit:

| Gate | Decision |
| --- | --- |
| Candidate commit and feature-branch push | READY — canonical is the sole protected Git target |
| Draft PR | BLOCKED — staging schema and real acceptance incomplete |
| Main merge | BLOCKED |
| Remote staging/production SQL | BLOCKED — authoritative ledger and verified backup/restore absent |
| Production deployment | BLOCKED |

The older dated sections below preserve the state observed at each earlier checkpoint and are superseded where this section conflicts.

## V1 approved execution — 17 November 2026

V1 is complete. Canonical Vercel Authentication Standard Protection is active; anonymous exact Preview and branch-alias requests return HTTP 302 while the production alias and `/api/version` remain HTTP 200 at unchanged SHA `c731153…`. Duplicate projects are unchanged. An automation bypass unexpectedly created by the beta `vercel curl` read was revoked immediately; final bypass count is zero. No deployment occurred. Preview access protection is now PASS, but resource isolation, duplicate deployments, domains, staging SQL, R2 and real acceptance remain blocked.

## Final readiness execution — 17 November 2026

The evidence-based release decision is documented in [BRAVO_FINAL_RELEASE_READINESS_2026-11-16.md](BRAVO_FINAL_RELEASE_READINESS_2026-11-16.md). The exact owner gates, staging matrix and deployment/rollback procedure are in the adjacent final owner-actions, staging-acceptance and deployment-runbook documents.

Refreshed local verification passes: typecheck; the 26-command default QA chain; secret scan across 578 tracked/candidate files; broadcast data/privacy QA; client interactions 17/17; auth provider 4/4; workspaces 5/5; master workflows 4/4; production build with 147 generated pages; browser broadcast 11/11 against the built server; and `npm audit` with zero advisories. ESLint exits 0 with nine nonblocking React effect warnings. The first broadcast browser invocation failed 11/11 with connection refused because no server was running; the unchanged suite passed after the successful build was served, so the recorded cause is orchestration rather than a suppressed application defect.

Live blockers are now more precisely bounded: canonical Preview protection passes, but three projects still auto-deploy; custom domains are NXDOMAIN; canonical Preview has no R2 and local credentials can address shared production buckets; Supabase management is unauthorized and SQL URLs are production-targeted; the ledger is unknown; required staging profile/scoring/registration objects are absent; admin password/profile linkage and Discord client configuration are incomplete. The ignored local Vercel link was safely corrected from duplicate A to the canonical project and confirmed read-only. Apart from owner-approved V1, no external mutation occurred.

Current gate decisions:

| Gate | Decision |
| --- | --- |
| Local source | READY |
| Existing remote feature SHA | VERIFIED |
| Additional local commit | BLOCKED pending owner approval and final manifest review |
| Further feature push | BLOCKED pending canonical Preview protection and isolation |
| Draft PR | BLOCKED pending live staging acceptance |
| Main merge | BLOCKED |
| Production SQL | BLOCKED |
| Production deployment | BLOCKED |

The [16 November Phase 2 infrastructure report](infrastructure-unblock-phase-2-2026-11-16.md) is the current source for Vercel topology, production-domain health, staging SQL readiness and the owner approval boundary.

## Infrastructure blocker recheck — 15 November 2026

The focused [staging infrastructure reconciliation](staging-infrastructure-reconciliation-2026-11-15.md) supersedes older Vercel-access and effective-binding statements below. Vercel CLI access is now confirmed and all three Git-connected BRAVO projects were inspected without mutation. Two duplicate projects fail closed because one has production Supabase/shared R2 Preview bindings and the other lacks staging bindings. The only successful project is staging-Supabase-bound with no Preview R2, but its Preview lacks Deployment Protection. Because a feature push can trigger all three, the push gate remains **BLOCKED**.

Supabase management access still returns 401 after a fresh CLI login. Server-key OpenAPI/Auth reads against `yppefayrepkqpqtprbqa` pass, but both local database URLs identify production and the staging guard rejects them before connection. Observable schema markers show partial/non-prefix drift; the migration ledger, policies, grants and exact function bodies remain unknown. No migration or account change is authorized. An ignored target-locked read-only inspection utility and a backup/restore rehearsal plan are prepared.

Current decisions: local source remains preserved; feature-branch push, PR, main merge and production deployment remain blocked. The next unblock is a staging-only read-only `DIRECT_URL` (or `DATABASE_URL`) for authoritative ledger/schema inspection, followed by an isolated restore rehearsal and a separately reviewed forward-only reconciliation.

## Post-commit execution update — 14 November 2026

The 104-path follow-up described below was subsequently committed as `e025f9cdf85bb4aa618b4c0c1e7242aa783b6d9d` and pushed to `origin/codex/platform-completion-20261104`. Local and remote feature HEAD match. `origin/main` remains `c7311530a17cbb63ba5b4e3df0ef2da44acb7953`; the local `main` branch is stale but was not modified. The complete committed feature delta remains 403 paths.

GitHub Actions run `43519330298` is a verified PASS for the exact release SHA. Its only job completed every configured secret, type, lint, test, migration-fixture, broadcast, build and browser-fixture step. The overall GitHub commit status remains failure because Vercel attached three status contexts: `bravo-gaming-esports-nextjs` succeeded, while `bravo-gaming-esports` and `bravo-gaming` failed.

The successful Vercel deployment serves the exact SHA from a public Preview alias. Its source guard and live provider response establish the designated staging Supabase URL and a working public key, but do not expose the effective server-key owner or all project/branch/shared overrides. A safe read of a deliberately nonexistent managed R2 object returned HTTP 500. Vercel CLI is logged out; deployment API reads return 403. Therefore the successful project is only partially verified and the other two projects remain undiagnosed. Further pushes remain blocked.

Fresh redacted Supabase evidence at `2026-11-14T09:56:37Z` reconfirms the management project read returns 401, both database URLs target production, server-key OpenAPI returns 200, the designated confirmed Auth identity has zero linked profiles, and all previously reported profile/scoring/registration fields, Discord tables and transaction RPCs remain absent. No migration, profile/provider change, password reset or R2 write occurred.

Production `/api/version` still reports `c7311530`. The production Supabase hostname currently returns NXDOMAIN, so production Auth/backend readiness is independently blocked.

The handoff documents added on 14 November and the dated updates in this file are local-only working-tree documentation. No additional commit, stage, push, PR, merge or deployment is authorized or performed.

After the reported localhost login 503 was reproduced, default `npm run dev` was changed to use the existing guarded staging launcher instead of the production-configured `.env.local`. `qa/local-staging-environment-check.mjs` now locks this boundary. A live intentionally invalid login returned 401 from staging rather than 503. This fixes local service selection only; successful administrator login remains blocked by the missing staging profile/schema and private QA password.

**HOLD for release.** The approved 230-file snapshot is already committed locally as 7eeded0260887bb31d5090fc1ee47643a8e07a79. This audit covers its separate uncommitted follow-up and the complete candidate relative to remote main/deployed baseline c7311530a17cbb63ba5b4e3df0ef2da44acb7953. The exact 104-path follow-up, including the consolidated handoff report, is staged for owner review. No new commit, push, PR, merge, remote migration, account/provider change or deployment was performed.

The current A–G workflow results and exact missing access are in [production-deployment-report.md](production-deployment-report.md). The [5 November audit](release-audit-2026-11-05.md) and [manifest](release-file-manifest-2026-11-05.md) are intentionally archived unchanged. Their old staged-state, empty-key and test-count statements are superseded; their failed evidence is preserved.

## Source and scope

Branch: codex/platform-completion-20261104. HEAD remains 7eeded0260887bb31d5090fc1ee47643a8e07a79. [The manifest](release-file-manifest.md) lists every pending candidate path and the entire delta against c731, including earlier local history. The old 230-file manifest alone is insufficient for production review.

No reset, clean, history rewrite or worktree replacement was used. AGENTS.md is retained as untracked user-supplied repository guidance outside the application candidate. Environment files, QA artifacts, node_modules and generated builds remain ignored. No lockfile or historical migration was changed. Supabase configuration has one intentional append: migration 028 follows 027 in the local ordered schema paths. Package edits are explicit staging/QA scripts; offline QA no longer requires production .env.local. Migration 028 has not been applied remotely.

The complete production delta retains nine historical deletions: obsolete demo seed/upload/presign routes, superseded public-reference components, seed helpers and supabase/schema.sql. They are committed history, not fresh cleanup. Ordered migrations remain authoritative; current protected storage and public readers replace the old paths. No live seed/reset/maintenance operation was executed.

Intentional configuration changes are fail-closed Preview checks in next.config.js and a local offline CI workflow. The workflow uses pinned actions, read-only permissions, no service secrets and no migration/deployment step. Local YAML/security validation passed; remote execution remains NOT RUN. This does not authorize a push.

## Findings and correction boundaries

The earlier login assertions initially lacked authentication configuration. Later browser runs also exposed genuine defects: historical rows with no team IDs produced duplicate keys/empty links; early menu/login interaction lost state; imperative motion changed React-owned HTML before hydration; contact could make a native GET before hydration. Those causes were reproduced and repaired. Negative-game navigation and server-restart connection resets were retained, then rerun.

The unchanged full public suite passed **72/72 on 11 November** against staging-backed localhost. This is not successful real administrator acceptance or a protected Preview pass. Its existing contact submission fixture intercepts transport. Failed artifacts remain preserved; no assertion was skipped or suppressed.

Auth handling now distinguishes 400/401/403/429/500/503, retains rate headers, bounds fetch/body/cancellation behavior and clears rejected cookies even if sign-out fails. The staging launcher strips inherited production/R2/management credentials. Existing identity/password are preserved; no role was granted.

Scrims add event-scoped slots/capacity/locking, canonical team validation, revision CAS and stable creation IDs. Match editors inherit event scoring and reject missing/pending names before publication. Standings display saved penalties/bonuses/DQ without changing totals. Broadcast retains 37 original graphics and adds Team Slots, making 38 plus program; outages hide stale graphics.

**Registration correctness: PASS in the isolated local database; BLOCKED on real staging.** Migration 028 adds the reviewed service-only transaction boundary for event intake, confirmation, rejection/rollback and event-roster saves. It serializes membership changes on the event row, validates publication/window/team eligibility/duplicates/capacity, assigns a unique slot, writes the relational and compatibility ledgers together, requires an audit row and preserves idempotent approval retries. Browser roles keep reads but lose direct registration and event-membership writes.

Actual 028 SQL runs in PGlite and verifies open/closed intake, duplicate team/captain rejection, capacity, slot uniqueness, atomic approval, roster visibility, idempotency, queued contention at reduced capacity, rejection rollback, required-audit rollback, legacy-ledger bridging, atomic roster replacement and compatibility with migration 027's idempotent publication membership write. Route/service boundary cases now exercise the real transaction wrapper instead of suppressing approval. This closes the identified source defect locally; it does not claim target-schema compatibility or independent-connection Supabase concurrency. Migration 028 remains unapplied pending exact ledger/schema inspection, backup/restore preparation and explicit owner approval.

## Database verification

All migrations 001–028 are tracked/ordered; 026 precedes 027 and new forward-only 028 follows both. Historical 022 retains blob 5ef09811d8a4d3e9e885f93fa90b1b6757cd8314; activation correction is forward migration 024. Remote applied versions/content remain UNKNOWN.

Actual 026 SQL runs against a focused PGlite fixture, verifying decimals, criteria/legacy MVP, constraints and known dependent compatibility views. Unknown-dependency abort behavior was reviewed in SQL; no explicit unexpected-dependent-view negative test is claimed. Actual 027 runs in a separate reconstructed post-026-style fixture, verifying parent/child/publication/count/audit atomicity, failure rollback, revisions/retries and publication conflicts. Tests reproduce inherited/table/column browser grants and verify direct-write denial while preserving SELECT/RLS. Required result RPC absence fails closed.

Actual 028 SQL runs against a focused relational fixture and exercises the event-registration and roster transactions described above. These tests do not run restored 001–028 or 026→027→028 together on the target. PGlite queues one connection; independent-connection Supabase concurrency remains unverified. Team identity preparation, account linking, import lifecycle and each bulk-import match are separate transaction boundaries.

Before approved remote application: inspect exact project/ledger/SQL, dependencies/views/grants, backup and tested restore; pause writers; review ordered forward changes. Do not blindly replay 017–019 or rewrite 022. Unknown view dependencies must abort rather than use CASCADE. Rollback retains decimals/additive columns/audit history and stops incompatible writers pending reviewed repair/restoration.

## Fresh access and isolation

13 November read-only evidence: current-access-2026-11-13.json, staging-openapi-schema-readonly.json and safe-access-shape-diagnostics.json. The latest probes completed between 2026-11-13T14:26Z and 14:29Z.

- Staging file is ignored/untracked and targets yppefayrepkqpqtprbqa. Publishable Auth settings and secret-key empty profiles read return 200. Modern keys/R2/PUBG entries are present.
- QA_STAGING_ADMIN_PASSWORD and VERCEL_AUTOMATION_BYPASS_SECRET are absent. The existing confirmed account has zero base profiles linked by UID. The actual exposed profile table lacks role_source, is_active and six expected Discord fields.
- SUPABASE_ACCESS_TOKEN has the expected personal-token shape but returns 401, so it is invalid, expired/revoked or lacks access; the response cannot distinguish which. DATABASE_URL is a valid Supabase pooler URL identifying the production project in its username, and DIRECT_URL is a valid production direct host. Both are deliberately rejected before connection. Ledger/policy/grant/backup access remains blocked.
- Read-only staging OpenAPI confirms the base registrations/event_teams tables exist, but registration_id, scoring_rules, revision and four match-team decision columns are absent. The 027/028 RPCs and Discord mapping/review tables are not exposed. This is schema evidence consistent with missing 018/019/026/027/028 changes, not a substitute for the authoritative migration ledger.
- Preview /api/version returns Vercel SSO 302. The available Vercel and Supabase plugins are not installed, and Vercel token/CLI access is absent. Protection stays enabled.
- Five R2 staging account/key/bucket values equal preserved default local values. This is an isolation concern, not proof of deployed bindings. No credentialed R2 request or object write occurred.
- Production Supabase DNS/health still fail ENOTFOUND; staging DNS/health is reachable. No production credential was sent.

The auth-only staging localhost runtime was restored on port 3000. Fresh GET checks return login form 200, provider discovery 200 with Discord explicitly disabled and anonymous admin broadcast API 401 (local-staging-pages-2026-11-13.json). This confirms availability and anonymous denial, not accepted admin authentication.

Fresh 13 November Discord authorization still redirects with an email Client ID; the callback correctly targets staging, but intended numeric Application ID `1530095874594836581`, its matching secret and interactive acceptance remain unresolved. Missing team/player credentials and permitted match ID are listed in the canonical report. No secret values were printed.

The new Preview source policy passes actual config/runtime regressions and closes the earlier absence of a source guard. It pins staging Supabase, checks legacy alternatives and rejects shared R2 names/endpoints. It cannot establish opaque-key ownership, R2 ownership/token scope or effective branch/shared/integration bindings. Push stays blocked until those are inspected.

Fresh GitHub read-only inspection confirms remote main c731, no remote release branch, open competing PR #1, unrelated draft PR #2 and main protected:false. Nothing was changed. Resolve PR #1 architecture overlap before merge.

## Actual local verification

| Check | Status | Scope / evidence |
| --- | --- | --- |
| Public suite, 11 November | PASS | 72/72; release-public-stable.txt |
| Client browser regressions, 11 November | PASS | 17/17; release-client-fixtures.txt |
| Auth/workspace/manual browsers, 11 November | PASS | 4/4, 5/5, 4/4; corresponding release logs |
| Broadcast browsers, 13 November rerun | PASS | 11/11 after restoring explicit staging localhost; all 38 graphics plus program. The preceding server-absent `ERR_CONNECTION_REFUSED` harness run is preserved, not suppressed |
| Default suite, 11 November | PASS | Earlier 24 commands; release-tests.txt |
| Event-registration transaction | PASS | Actual migration 028 SQL in PGlite: service-only access, intake/approval/rollback, duplicates, capacity/slots, queued contention, required-audit rollback, legacy bridging and atomic roster saves |
| Registration route/service boundary | PASS | Eight actual route/service cases plus existing approval QA; event approvals invoke the transaction wrapper and failures remain fail-closed |
| Final default suite, 13 November | PASS | All 26 commands, including actual 026, 027 and 028 SQL plus eight registration route/service cases; final-2026-11-13-tests.txt |
| Final local build / TypeScript / lint, 13 November | PASS | All exit 0; build generated 147 tasks. Lint retains nine existing importer warnings, zero errors. final-2026-11-13-build.txt, -types.txt and -lint.txt |
| Final affected browser fixtures, 13 November | PASS | 30/30 auth/workspace/manual/hydration/motion/slots/statistics cases; release-2026-11-13-browser.txt |
| Dependency audit, 13 November | PASS | Zero advisories; release-2026-11-13-audit.json |
| Unused analysis, 13 November | FAIL, nonblocking maintenance | 15 exports/six types; includes actual dynamic Next config use. No suppression |
| Final candidate secrets/whitespace | PASS | Secret patterns checked across 564 tracked/candidate paths; tracked/index/untracked whitespace and conflict checks pass. The index exactly matches all 104 pending application paths; the complete delta is 403 paths. release-snapshot-2026-11-13.json and staging-unblock-staged-secrets.txt |
| Real staging and OBS acceptance | BLOCKED | Password/profile/schema/Preview/resource isolation unavailable |

Earlier complete lint passes retain nine existing importer warnings and zero errors. Evidence lives in ignored qa-artifacts/blocker-recheck and browser directories. Local transaction passes do not substitute for staging migration or acceptance.

## Separate approval decisions

| Decision | Status | Requirement |
| --- | --- | --- |
| LOCAL COMMIT | **READY; not authorized** | Final exact-snapshot checks pass. Local preservation is independent of staging acceptance; a new commit still requires explicit local-only approval and must not imply migration/deployment approval |
| FEATURE-BRANCH PUSH | **BLOCKED** | Protect `bravo-gaming-esports-nextjs`; disconnect/disable or correct the two duplicate Git-connected projects; provision dedicated staging R2 if upload acceptance is required; then obtain separate push approval |
| DRAFT PR | **BLOCKED** | Local text only; approved isolated push and separate PR approval required |
| MAIN MERGE | **BLOCKED** | Real staging schema/concurrency/registration/OBS/CI acceptance and PR #1 overlap unresolved |
| PRODUCTION DEPLOYMENT | **BLOCKED** | Restore backend connectivity; complete prior gates, backup/restore and separate migration/deployment approvals |

Unused analysis remains a reported nonblocking maintenance finding and is not suppressed. Event registration is locally implemented and tested, while real target application and acceptance remain blocked. Exact remaining actions and all seven YES/NO decisions are in [the execution report](production-deployment-report.md).
