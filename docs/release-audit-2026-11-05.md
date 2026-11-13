# Final GitHub release preparation audit — 5 November 2026

**Release decision: HOLD for push and release; a review-only local commit is technically safe, subject to explicit approval.** No commit, push, PR creation, merge, remote migration or deployment has been performed. This follow-up separates local preservation from staging acceptance, as requested. The public suite still exits nonzero for three configuration-blocked assertions; unused-code analysis also remains nonzero. Neither failure is suppressed or described as passed.

## A. Git status and scope

Branch: `codex/platform-completion-20261104`; starting HEAD `ee541cefb3354ca30cfbda635c77ba89d035aef4`. Initial live inventory found **156 tracked changes, 62 individual untracked files and 25 mixed staged/unstaged files** (218 total). These are individual files, not collapsed directory counts. All pre-existing changes were preserved; no reset, clean, force push or destructive recovery was used.

The exact intended paths are in [release-file-manifest.md](release-file-manifest.md), including source/components/APIs, QA, documentation, dependency lockfile and migrations. Ignored environment/build/test artifacts are excluded. The pre-audit index patch is preserved locally in `qa-artifacts/release-audit/index-before.patch`. Final index status and source hashes are recorded by the inventory tool; staged and unstaged snapshots are checked independently.

Prepared index: **230 changed files, zero unstaged edits, zero untracked source files and zero mixed staged/unstaged files**. Migration 022 has no staged diff; the already-staged obsolete snapshot deletion remains intentional. Staging used a reviewed literal path list, omitting the already-indexed deletion from the add operation. The exact-index secret scan covers 229 present files plus the separate reviewed deletion. No commit was created.

The blocker follow-up tested exact index tree **`a43e61231a825416e05b56e7b0b90a8cbbd0bd19`**, with the tracked worktree matching the index throughout those runs. A second manifest comparison found all 230 changed paths represented, no unexpected additions, and one intentional manifest-only entry: restoration-only migration 022, which equals HEAD. This follow-up changes only this audit document; application, configuration, migrations, lockfile and checked-in tests remain byte-identical to that tested tree. Final document/index verification is retained in `qa-artifacts/blocker-recheck/final-snapshot.json`.

Every changed/new candidate is mechanically inspected for content, syntax, local imports, JSON, binary surprises, conflict markers and duplicate migration versions. Manual review focuses on authentication, authorization, publication/privacy, R2 boundaries, database writes, migration history/dependencies and the selected workflow changes. This is not a claim of formal verification of every business behavior. TypeScript, ESLint and browser tests complement those checks. No required imports or source files are intentionally omitted.

The obsolete `supabase/schema.sql` deletion is intentional: references were checked and ordered migrations remain the schema authority. The new PEM is a public CA certificate used with hostname verification, not a private key. Line-ending notices are Git LF/CRLF conversion notices; whitespace checks pass. Large pre-existing formatting/public-UI changes are retained rather than silently discarded.

Remote state was inspected through GitHub and refreshed with a read-only fetch:

| Ref | Observed SHA/status |
| --- | --- |
| `main` | `c7311530a17cbb63ba5b4e3df0ef2da44acb7953` |
| `feature/obs-broadcast-overlay` | `a51e4f4235db87fb54970a65df7e8a57c5d89301` |
| `codex/platform-completion-20261104` | No remote branch found; local HEAD is one commit ahead of main |
| Common ancestor with OBS feature | `c7311530a17cbb63ba5b4e3df0ef2da44acb7953` |

[PR #1](https://github.com/sangam150/bravo-gaming-esports-nextjs/pull/1) is open, not draft and unmerged. Its six added files implement `/api/overlay/match`, `/api/overlay/matches`, `/overlay`, `/overlay/control`, a separate overlay component and documentation. This branch instead uses the existing admin studio, `/api/broadcast` and `/overlay/[graphic]`. The competing implementation was not merged or copied. Resolve the overlap explicitly before merging either implementation.

Proposed local commit title: `feat: add tournament operations and dynamic broadcast workflows`. Use the explicit manifest, review the exact resulting staged diff and retain the documented limitations. Do not describe this snapshot as production-ready. [Draft PR text](draft-pull-request.md) is prepared locally; no GitHub message/PR was published.

## B. Code quality and actual tests

The final commands were rerun for the blocker follow-up. Current logs are in ignored **`qa-artifacts/blocker-recheck/`**; `qa-artifacts/release-audit/` retains the earlier source inventory and detailed candidate review. Older reports are historical evidence, not current acceptance. Offline commands used an ignored orchestration helper that explicitly clears file/process service credentials before invoking the unchanged staged npm scripts; the production-mode build/server used `qa/local-release-runtime.mjs`. Production credentials were not used for these checks.

| Check | Result | Evidence/scope |
| --- | --- | --- |
| TypeScript | PASS | `typecheck.txt`; generated route types and `tsc --noEmit` |
| Lint | PASS with warnings | `lint.txt`; zero errors, nine importer state/effect warnings |
| `npm test` | PASS | `tests.txt`; all 19 configured QA commands, including the SQL and tournament-boundary regressions |
| Broadcast/scoring/privacy derivations | PASS | `broadcast.txt`; includes legacy MVP preservation, deterministic latest-match ties and account-ID privacy |
| Isolated migration 026 | PASS | `scoring-sql.txt`; decimal totals, dependent views, legacy/configured MVP, DQ and preserved RLS |
| Atomic match SQL | PASS | `atomic-matches.txt`; rollback on child/audit failure, stale revisions, competing requests, retry, publication conflicts, decimal corrections, DQ, version retention and service-only access |
| Auth refresh | PASS | `auth-refresh.txt`; offline installed-SDK regression |
| Auth provider browser | PASS | `auth-provider.txt`; four provider fixture checks; these stub the login form and configured state |
| Auth offline | PASS | `auth-offline.txt`; configuration/authorization regression |
| Actual login-form diagnosis | PASS, intercepted services only | `auth-forms-diagnostic.txt`; ten checks of actual admin/hub/team/player forms and login helpers with configured/unconfigured branches; ignored diagnostic harness, not a replacement for the failing public suite |
| Admin data | PASS | `admin-data.txt`; canonical player/history protections |
| Workspace browser | PASS | `workspaces.txt`; four checks, including eight destinations/context and studio conflicts |
| Tournament/manual-entry browser | PASS | `master-workflows.txt`; three workflow fixtures |
| Reader-to-broadcast boundary | PASS | `tournament-boundary.txt`; installed SDK/intercepted service, canonical publication, selection masking, revision conflicts, hidden-event ownership and input denial |
| Broadcast browser | PASS | `broadcast-ui.txt`; nine tests, all 37 graphics and program behavior |
| Responsive page matrix | PASS | `responsive-ui.txt`; eight page groups, existing viewport matrix; Node header limit raised to 65536 for a large YouTube response header |
| Full public suite | FAIL / environment BLOCKED | `public-ui.txt`; 69 passed, three configured-auth-form checks failed with service credentials removed; all 66 static routes passed |
| Production-mode build | PASS | `build.txt`; Next.js 16.4.5 compilation, TypeScript and 147 generation tasks, credential-free local QA build |
| Secret scans | PASS | Exact-index scan of 229 present files, earlier working-tree scan and full candidate review; environment files remain ignored |
| Dependency audit | PASS | `dependency-audit.json`; zero advisories at the final scan |
| Lockfile reproducibility check | PASS | `lockfile-check.txt`; `npm ci --ignore-scripts --dry-run` |
| Unused-code analysis | FAIL, nonblocking findings retained | `unused-analysis.txt`; 14 unused exports and six exported types; no unlisted dependencies remain |
| Mechanical candidate review | PASS | `source-review.json`; full candidate contents/deletions and hashes; no syntax/import/conflict/duplicate-version findings |
| Git whitespace checks | PASS | Both working and staged diff checks |
| Actual staging/OBS Studio | BLOCKED | No fixture check is counted as real service/OBS acceptance |

The unchanged full public suite rerun produced **69 PASS / 3 FAIL**. Each failure was traced to the same unavailable-configuration branch, rather than an observed application defect:

| Failed assertion | Verified cause |
| --- | --- |
| `qa/live-qa.spec.js:670`, admin email visible | `AdminLogin` returns its unavailable screen when the URL/key configuration is absent |
| `qa/live-qa.spec.js:725`, one email input | `LoginHubClient` returns its unavailable screen before rendering its form |
| `qa/live-qa.spec.js:854`, team submit visible | The same guard omits team/player forms; the responsive test cannot reach its form assertions |

`lib/supabase/env.ts` requires both URL and publishable/anon key; the isolated runtime deliberately removes keys. The additional ten-case diagnostic renders the actual forms, configuration predicate, validation and login helpers with dummy configuration and intercepted responses. It verifies unavailable screens submit nothing, configured forms render, validation/rejection/success redirects work, and Discord controls follow provider readiness. Context/Next wrappers are fixtures. This supports the configuration-blocked diagnosis, **not** real Supabase login, cookie/session persistence, recovery delivery, OAuth completion or mobile acceptance. No assertion, skip or retry setting in the staged public suite was changed. Rerun that original suite with authorized isolated staging configuration to close the failures.

Earlier stabilization exposed an uncaught password-recovery initialization error; its fix is already in the staged snapshot and `/reset-password` passes the current route check. The earlier YouTube header-overflow was handled by the test process's header-size setting; no link assertion was removed. Independent route tests continue after a failure rather than skipping the remaining audit.

The final sweep also exposed a stale negative tournament cache returning 500 instead of 404. Cached absence now stays a safe 404 during revalidation; the freshness guard still rejects stale positive result snapshots. The public navigation regression verifies the missing-record route again. The auth smoke test now asserts the email control exists before filling it, reporting the same unavailable-configuration failure promptly instead of waiting two minutes.

The nine importer warnings were inspected: they synchronize season/day/tournament/scrim selections and editable day fields through effects. Removing them safely requires a coordinated state-flow change with real import acceptance; no lint rule was disabled and no asynchronous wrapper was used merely to conceal them. The unused exports include legacy public page/realtime compatibility helpers; they were not blindly deleted from the existing work.

SQL tests run actual isolated PostgreSQL/WASM with pinned PGlite. Competing requests share PGlite's queued connection; this verifies revision rejection, not multi-connection lock stress on Supabase. Real database integration tests, email recovery delivery, full token expiry, real R2 and actual OBS remain blocked. Production import/reconciliation/seed/cleanup commands were not run as QA.

## C. Database and transaction review

The staged ordered local configuration includes migrations **001–027**, with 026 after 025 and 027 after 026, without duplicate versions. Both SQL files and their checks are in the manifest and index. It previously omitted 026. The read-only, production-pinned preflight recognizes valid ordered ledger prefixes through 027 and checks scoring columns plus RPC/revision/execute privileges when those versions are recorded as applied. It still rejects an unexpected ledger and retains verified TLS/project guards. It was not run against production or retargeted by removing its guard.

**Migration 022:** local edits changed historical activation defaults. Those edits were removed from 022, restoring committed content; the intended fail-closed correction already exists in forward migration 024 and remains tested there. This does not discard the safety change. Git history shows 022 in the committed baseline, but **whether any remote database has applied it is UNKNOWN** because the migration ledger is inaccessible. No ledger repair or history rewrite was attempted. If a deployed copy differs, compare its recorded SQL/hash and use a reviewed new forward migration for any additional correction; never repair by silently editing/replaying 022.

**023–025:** review retains private raw documents, explicit publication filtering, protected profile authority, invoker views, canonical team identity boundaries and event-statistics RLS. Migration 024 already supplies the activation-default forward correction. No RLS was disabled or public access to raw JSON added.

**026, not applied remotely during this work; remote ledger UNKNOWN:** adds versioned scoring/decision/damage fields and constraints, preserves fractional placement points and recreates known compatibility views without CASCADE. Unknown dependent views abort the entire transaction for review. The audit corrected its legacy-MVP regression: non-version-2 matches retain SQL's total-points/kills/damage/assists/name ordering; version-2 matches use saved criteria. Historical score rows are not rescored. Public grants expose only approved scoring fields, not raw snapshots or identity secrets.

**027, not applied remotely during this work; remote ledger UNKNOWN:** adds a monotonic match revision and service-only `commit_competition_match`. Advisory/row locks and expected revisions protect match replacement. Event-row locking serializes match-number checks/count updates. Parent/child results, publication state, event count and required transaction audit are one commit. Any constraint, insert or audit error rolls everything back. Withdrawal and soft deletion use the same RPC; published deletion is rejected. Direct parent updates also bump revision. Read hydration detects parent revisions changing across separate parent/child HTTP reads and fails closed instead of mixing snapshots. No unsafe nontransactional fallback is provided when the RPC is missing.

Independent review additionally closed retained browser DML grants: 027 revokes table/column write privileges on matches, both result tables and scoring versions from PUBLIC/anon/authenticated, preserving public SELECT/RLS and service-role access. This prevents direct REST writes bypassing API decision authorization/CAS/audit. SQL tests reproduce inherited and column grants before proving write denial. Once canonical event ownership resolves, read errors propagate instead of selecting stale document records; hidden/deleted canonical identities also block document fallback. Initial ownership lookup outages can still enter the existing compatibility fallback and remain an integration boundary to monitor.

The follow-up reran `qa:scoring-sql`, `qa:atomic-matches` and `qa:tournament-boundary`, and all passed again within the 19-command `npm test` run. The atomic suite executes the actual preflight SQL and detects a disabled revision trigger or restored write grants. Required before/after audit history and rollback on forced audit failure are covered. These are meaningful automated checks of the result transaction, CAS and permissions. PGlite starts from focused fixture schemas, not a restore of the target database or the entire 001–027 chain; queued competing requests do not establish independent-connection locking on Supabase. Those acceptance limits remain open.

The browser submits its loaded revision on edit/publish/recalculate/rollback/delete; conflicts return 409 and require reload. Import overwrite/repair retain the existing scoring version and pass a captured revision. Import reset previously deleted child rows before updating the parent; it now uses an audited atomic draft replacement and requires platform-admin authorization and same-origin validation. Import lifecycle labels use the actual saved publication state.

Boundaries: canonical identity preparation may create an unreferenced team before a failed transaction; account linking and pending-import lifecycle follow-up remain separate. Each match in a bulk import commits independently, so a batch can partially succeed. Direct privileged maintenance scripts must not run concurrently with scoring operators; multi-connection stress and target-schema migration integration are still required. Transaction audit preserves raw before/after rows under private `match_transaction` records; the existing UI rollback's additional DTO audit remains best-effort. Do not claim distributed atomicity for all platform mutations.

Recovery procedure before any separately authorized migration: confirm target and exact ledger, back up schema/data plus view definitions/grants and test restore, pause score writes, review 026 dependencies and 027 privileges, then apply the ordered migrations on isolated staging only. A failed migration transaction must be rolled back, not bypassed with CASCADE. Do not downcast decimal scores or delete audit history to roll back an application release. Keep additive columns/audits and stop incompatible writers until a reviewed forward repair or owner-approved backup restoration is ready. No such remote operation was executed here.

## D. Website, admin and authentication

Eight primary destinations remain: Dashboard, Competitions, Scrims, Teams & Players, Match Results, Broadcast Studio, Content and Settings. Existing context/advanced tools stay within those workspaces. Fixture checks cover navigation, role restrictions, settings, manual entry and preview gating; this is not certification of every authenticated button against real records.

Existing server-cookie authentication fixes are included: same-render refresh forwarding, cookie-authoritative requests, cancellation of stale identity reads, protected server authorization, cross-tab logout and explicit logout failure. No provider was replaced and no role was granted. The header's logout redirect now replaces history. Recovery handles absent configuration without an uncaught client exception. **Real designated admin login remains unverified.** The earlier 503 was associated with an unreachable locally configured production Supabase hostname; this audit's isolated login-form failures arise from deliberately absent keys. Neither establishes a successful deployed login.

Public schedules/results remain separated, approved production data drives event pages, standings share saved scoring, and stale/unpublished data hides. Current source already connects approved map labels/backgrounds as well as artwork/annotations; the earlier master report's unfinished-map-wiring statement is superseded by this source review. Remaining master scope includes granular operator capabilities, all requested profile/organization fields and full real roster/history workflows. It is not accurate to call the entire master brief complete.

The installed-SDK boundary regression found public tournament sanitization omitted verified publication/registration metadata, so a real reader-produced event could be rejected by the broadcast builder. The DTO now retains those approved fields. Server broadcast reads preserve internal result identity only until final projection, avoiding lost unmapped-player selections after early sanitization. No private identifiers are serialized. Maintenance match references reject filter metacharacters before any query, preventing unintended reset/repair selection.

## E. Broadcast and R2

All 37 dedicated modes are registered and browser-rendered at 1920×1080; `/overlay/program` remains permanent. Tests cover canvas bounds, paging, private preview, Ready/Live/show/hide/reveal, outage hiding/recovery, image replacement and server-clock countdown. Template changes do not write official result scores. No live positions, killfeed or headshot pipeline is fabricated. Real published staging records and actual OBS Studio capture were not tested.

The audit found that an unmapped PUBG account could be copied into public `playerId`; public projections now use anonymous per-match result identifiers, preserving canonical player UUIDs and operator selection. A regression checks the entire broadcast response. Public image resolution now rejects URL credentials, signed-token parameters and Supabase signed-object paths; image pipeline tests cover these cases.

The shared public-content sanitizer applies that policy before JSON serialization, including absolute private-download/authenticated-object URLs. Tests cover the shared projection helper, public match asset fields and approved asset preservation. Tournament/player readers use the same helper. Rendering rejection alone is not treated as DTO privacy.

R2 remains the storage provider. Public/private bucket separation, managed-key namespaces, canonical replacement, upload validation and private-download authorization were reviewed and covered by offline tests. **The known bucket names do not prove staging isolation. No remote object was uploaded, replaced or deleted.** Real delivery, signed URL authorization and cache behavior still need isolated staging acceptance.

## F. Environment and security

Latest real probe at **`2026-11-05T13:49:18.701Z`**: all **45 Preview GETs** (seven app/API endpoints plus 37 graphics and program) returned HTTP 302 Vercel SSO redirects. The application was not reached. Unkeyed staging Supabase health returned 401; keyed connectivity is BLOCKED. Evidence is `qa-artifacts/staging-verification/connectivity.json` and `qa-artifacts/blocker-recheck/staging-connectivity.txt`. The designated project remains `yppefayrepkqpqtprbqa`. The staging auth command exits before browser login because `QA_STAGING_ADMIN_PASSWORD` is empty (`staging-auth.txt`). This is not a newly observed application 503. Deployment protection remains enabled.

Missing names: `VERCEL_AUTOMATION_BYPASS_SECRET`; `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` or `NEXT_PUBLIC_SUPABASE_ANON_KEY`; `QA_STAGING_ADMIN_PASSWORD`; `SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY`; `DATABASE_URL` or `DIRECT_URL`; `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_PUBLIC_BASE_URL`; `QA_STAGING_TEAM_EMAIL`, `QA_STAGING_TEAM_PASSWORD`, `QA_STAGING_PLAYER_EMAIL`, `QA_STAGING_PLAYER_PASSWORD`; `PUBG_API_KEY`, `QA_STAGING_PUBG_MATCH_ID`. Values must be configured locally, never sent in chat. Remote migration state, R2 isolation and Vercel Preview backend bindings remain UNKNOWN.

Presence was checked in both the exact ignored `.env.staging.local` and the process environment, without printing values (`staging-presence.json`, `2026-11-05T13:44:12.110Z`). Credential entries remain empty or absent. The file's last-write time is `2026-11-04T12:18:15.977Z`. Locally configured production credentials are not substitutes. `VERCEL_TOKEN` is also absent for authorized management inspection; a connected Vercel account is an alternative, not an application runtime requirement. The available Vercel/Supabase plugins are not connected, and local `.vercel/project.json` contains project metadata rather than deployed environment bindings.

**Preview isolation: FAIL as an application-enforced guarantee; deployed bindings BLOCKED/UNKNOWN.** Source review found no `VERCEL_ENV=preview` rule rejecting production Supabase URLs/keys or R2 accounts/buckets. Existing target restrictions protect QA scripts only. A no-network diagnostic using fake keys confirms the actual public/server Supabase configuration readers accept the known production project URL in Preview, and the R2 reader accepts an undesignated account with the documented bucket names (`preview-policy-proof.json`). This does not prove that the current deployment uses production; it proves source code does not prevent it. The ignored local production configuration is present, so untargeted commands must not inherit it. Identical documented bucket names alone cannot prove separate accounts or token scopes.

Before any push, inspect the actual linked Vercel project's Preview variables, values inherited across environments, branch/custom overrides, integration-injected credentials and Git deployment settings. Confirm every public/server Supabase URL and key belongs to staging `yppefayrepkqpqtprbqa`; inspect the R2 account, bucket ownership/public domain and bucket-limited staging token. Remove production bindings from Preview or establish a reviewed fail-closed resource policy before authorizing a push. Keep deployment protection enabled. See [Vercel environment scopes](https://vercel.com/docs/environment-variables), [deployment environments](https://vercel.com/docs/deployments/environments) and [R2 token scopes](https://developers.cloudflare.com/r2/api/tokens/). No remote settings or tokens were changed here.

Dependency audit initially found 19 advisories including critical Next.js findings. Runtime packages are now pinned to Next.js **16.4.5** and Sharp **0.35.5**, with matching ESLint config and patched audited transitive packages. Updated overrides are `brace-expansion` 5.0.12 and `minimatch` 11.0.4. Pinned dev dependencies PGlite 0.3.14 and esbuild 0.28.1 make SQL/browser QA reproducible; the lockfile is included. Final npm audit reports zero advisories. Relevant reviewed advisories: [Next.js](https://github.com/advisories/GHSA-2464-fhr4-w9xw), [Sharp](https://github.com/advisories/GHSA-wq5f-xc86-pv6w), [minimatch](https://github.com/advisories/GHSA-g3hv-75wg-m249).

`.env.local`, `.env.staging.local`, `.next`, test output and `qa-artifacts` are ignored. No secret values were printed. The local QA runtime removes service credentials before starting; it does not change application authorization, disable security or supply production records. Production isolation of a future Vercel Preview has **not** been confirmed, so push approval is not requested yet.

## G. Separate release decisions

| Decision | Status | Reason |
| --- | --- | --- |
| LOCAL COMMIT | **Technically safe for review/preservation; explicit approval required** | Source/SQL/build/security checks pass; remaining three public assertions have verified unavailable-config causes and remain FAIL, and unused analysis remains nonblocking FAIL. A local commit does not apply migrations or deploy. No custom hooks path or active commit hooks were found (`local-commit-hooks.json`). This is not an all-green or production-ready endorsement |
| FEATURE-BRANCH PUSH | **BLOCKED** | Preview accepts arbitrary backend configuration, actual Preview bindings are inaccessible, and a push may deploy. Verify isolation and obtain explicit push approval first |
| DRAFT PR | **BLOCKED** | Source branch is local-only and push is blocked; prepared draft text can be used after an authorized isolated push. PR creation also requires explicit approval |
| MAIN MERGE | **BLOCKED** | Real staging, target-schema/concurrency, OBS and remaining scope acceptance unmet; resolve PR #1 overlap and obtain explicit approval |
| PRODUCTION DEPLOYMENT | **BLOCKED** | Real staging acceptance and an approved migration/backup/restore/deployment plan are missing; explicit migration and deployment approvals required |

The requested condition that **all local checks pass is not satisfied**: the original public suite and unused-code analysis still exit nonzero. Their verified causes permit a transparent review-only local commit independently of staging acceptance; they do not permit calling the build fully accepted. No Git mutation beyond staging the requested audit update was performed in this follow-up. No commit approval is inferred.

## H. Exact remaining actions

1. If local preservation is desired, obtain explicit approval for a local commit of the reviewed 230-file snapshot. Keep this audit and the known failures in its description. This can proceed independently of staging, but has not been executed.
2. Obtain authorized Vercel management access and verify all Preview/branch/integration scopes and Git deployment behavior against the designated staging Supabase and isolated R2 resources. Confirm R2 account/bucket ownership and staging-only token scopes. Resolve any production binding before requesting push approval. No production write is an acceptable isolation test.
3. Populate the missing names in section F locally and retain Git ignores. A permitted PUBG match and designated team/player accounts remain necessary for their specific workflows. Do not send credentials in chat.
4. Using read-only authorized staging access, inspect its real migration ledger, schema dependencies and grants; verify backup/restore readiness. Obtain explicit approval before applying any required remote migration, then validate the full target schema and independent-connection revision/publication races. The isolated SQL passes do not authorize remote application.
5. Rerun protected Preview access, keyed Supabase connectivity, real admin login/refresh/persistence/permissions/logout and recovery; rerun the unchanged public suite with authorized staging configuration. Complete staging tournament/scrim/team/player CRUD, public/private R2 uploads and access denials, scoring/corrections/publication, leaderboards and broadcast control using identifiable staging records. Verify all 37 dedicated overlays plus program and actual OBS Studio. Run PUBG import only with the permitted ID. Record actual results and cleanup only records created for these tests.
6. Review the remaining importer warnings/unused symbols without suppressing them, and explicitly accept or finish the documented scope gaps. After isolation and the relevant acceptance gates, request separate feature-push and draft-PR approvals; reconcile the competing PR #1 implementation before requesting merge. Production migration/deployment remains a later, separately approved action after staging acceptance.
