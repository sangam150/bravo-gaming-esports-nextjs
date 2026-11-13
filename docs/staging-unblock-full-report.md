# Bravo Gaming Esports — staging unblock and release preparation report

Report date: **13 November 2026 (Asia/Kathmandu)**
Branch: `codex/platform-completion-20261104`
Current HEAD: `7eeded0260887bb31d5090fc1ee47643a8e07a79`
Designated staging Supabase project: `yppefayrepkqpqtprbqa`

## 1. Executive result

The local application candidate is ready for an owner-authorized local preservation commit. Real staging acceptance has **not** passed, and feature-branch push, staging deployment, main merge and production deployment remain blocked.

The major local data-integrity defect in event registration was fixed through forward-only migration 028 and service-only transaction wrappers. Actual migration 026, 027 and 028 SQL passes isolated PostgreSQL tests. The exact staging schema was then inspected through a read-only server-key OpenAPI request. That inspection proves the target is missing required authentication, scoring, atomic-result and registration-transaction objects. The authoritative migration ledger, policies and grants remain inaccessible because the management token returns 401 and both configured database URLs target production rather than staging.

No commit, push, pull request, merge, remote migration, account elevation, password reset, provider change, R2 object write or deployment was performed.

## 2. Current Git snapshot

- The original approved 230-file snapshot is preserved in commit `7eeded0260887bb31d5090fc1ee47643a8e07a79`.
- This follow-up contains **104 staged paths** after adding this report.
- The complete delta from remote main/deployed baseline `c7311530a17cbb63ba5b4e3df0ef2da44acb7953` contains **403 paths**.
- `AGENTS.md` remains intentionally untracked and excluded from the application snapshot.
- `.env.local`, `.env.staging.local`, credentials, `.next`, `node_modules`, QA artifacts and browser output remain ignored.
- No lockfile change or unexpected generated application file is included.
- Historical migrations were not rewritten.
- Migration 028 is the only new migration in this follow-up and is ordered after 026 and 027 in `supabase/config.toml`.

The staged snapshot remains uncommitted and must not be pushed until Preview resource isolation is verified.

## 3. Completed local implementation

### 3.1 Event registration integrity

Migration `028_atomic_event_registration.sql` and the application service wrappers now provide:

- Published/open registration-window validation.
- Canonical active-team eligibility validation.
- Active duplicate team and captain/contact rejection.
- Event capacity enforcement.
- Unique slot enforcement and lowest-free-slot assignment.
- Atomic registration ledger, compatibility document, event membership and audit writes.
- Event-row locking and advisory locking for competing approvals.
- Idempotent approved retries.
- Rejection/rollback that releases owned membership and corrects counters.
- Required-audit failure rollback with no partial registration or roster write.
- Legacy registration-ledger bridging.
- Atomic event and roster saves.
- Membership ownership protection so event editing cannot silently remove registration-owned teams.
- Service-role-only transaction execution and browser direct-write denial while preserving permitted reads.
- Compatibility with migration 027's idempotent match-publication membership behavior.

### 3.2 Match result integrity

Migrations 026 and 027 remain preserved and locally verified for:

- Versioned scoring rules.
- Decimal totals and adjustments.
- DQ and decision metadata.
- Legacy and versioned MVP ordering.
- Parent/child result replacement in one transaction.
- Revision compare-and-swap conflict detection.
- Retry and publication conflict behavior.
- Required audit history.
- Transaction rollback on child or audit failure.
- Browser direct-write restrictions with public reads retained.

### 3.3 Authentication hardening

The local authentication path now:

- Distinguishes safe 400, 401, 403, 429, 500 and 503 responses.
- Preserves rate-limit headers.
- Bounds Supabase request and response-body time.
- Preserves caller cancellation and TLS behavior.
- Clears rejected, chunked and late session cookies even when SDK sign-out fails.
- Uses an explicit staging development launcher that excludes production, R2, management and provisioning credentials from the application runtime.
- Keeps Discord-derived administrator access disabled locally until provider and schema readiness are verified.
- Sends both the `apikey` and standard Bearer header for server-key PostgREST readiness probes, preventing a false `PGRST303` result and exposing the real `42703` missing-column failure.

These are implementation and fixture passes, not proof of a successful real administrator session.

### 3.4 Scrim, scoring and broadcast work

Completed local behavior includes:

- Event-scoped team slots, capacity validation, locking, withdrawal and reassignment.
- Explicit schedule, map and Nepal-time handling.
- Revision-conflict handling for concurrent scrim edits.
- Saved scoring decisions in standings.
- Public/private scrim projection boundaries.
- 38 dedicated broadcast graphics plus the permanent `/overlay/program` route.
- Team Slots graphics, paging, countdown correction, show/hide/reveal behavior and stale-graphic hiding on data outage.
- Preview source guards that reject the known production Supabase project and shared R2 bucket names.

## 4. Local verification results

| Verification | Result | Evidence/limit |
| --- | --- | --- |
| Default QA chain | PASS | 26 commands |
| Migration 026 SQL | PASS | Actual SQL in isolated PostgreSQL |
| Migration 027 SQL | PASS | Actual SQL in separate isolated PostgreSQL fixture |
| Migration 028 SQL | PASS | Actual SQL including duplicates, capacity, slots, retry, queued contention and rollback |
| Registration route/service boundary | PASS | Eight actual boundary cases |
| Public browser suite | PASS | 72/72 on 11 November; not real admin acceptance |
| Current affected browser regressions | PASS | 30/30 |
| Broadcast browser suite | PASS | 11/11 after explicit staging localhost restoration; all 38 graphics plus program |
| Production build | PASS | 147 generation tasks |
| TypeScript | PASS | Exit 0 |
| ESLint | PASS | Zero errors; nine retained importer warnings |
| Dependency audit | PASS | Zero advisories |
| Secret scan | PASS | No credential patterns detected |
| Whitespace/conflict review | PASS | Tracked/index/untracked checks pass |
| Unused-code analysis | FAIL, nonblocking | 15 exports and six exported types; not suppressed |
| Real staging acceptance | BLOCKED/FAIL | Required schema, admin session and isolated Preview resources unavailable |
| Actual OBS Studio acceptance | BLOCKED | Browser fixtures are not OBS GPU/browser-source acceptance |

PGlite queues one connection, so its competing-request test does not replace independent multi-connection Supabase contention testing.

### 4.1 Final command execution refresh

The following commands were rerun on the exact staged application source after this master completion request:

| Command | Exit | Result |
| --- | ---: | --- |
| `npm run typecheck` | 0 | PASS |
| `npm run lint` | 0 | PASS; zero errors and nine retained `PubgImportManager` effect warnings |
| `npm test` | 0 | PASS; all 26 QA commands, including actual 026/027/028 SQL |
| `npm run qa:secrets` | 0 | PASS across 564 tracked/candidate files |
| `npm run qa:broadcast` | 0 | PASS |
| `npm run qa:broadcast:ui` | 0 | PASS, 11/11 |
| `npm run qa:client-interactions` | 0 | PASS, 17/17 |
| `npm run qa:auth-provider` | 0 | PASS, 4/4 simulated-session cases |
| `npm run qa:workspaces` | 0 | PASS, 5/5 |
| `npm run qa:master-workflows` | 0 | PASS, 4/4 |
| `npm run build` | 0 | PASS; 147 generation tasks |
| `npm audit --json` | 0 | PASS; zero advisories |
| `npm run analyze` | 1 | Reported nonblocking 15 exports/six types; not suppressed |
| `npm run qa:staging-readiness` | 1 | Correctly FAIL/BLOCKED on real schema, Preview, Discord and password prerequisites |

`qa:auth:staging` was not run because `QA_STAGING_ADMIN_PASSWORD` is absent and no real login can be authorized. The live database migration preflight was not run because both database URLs identify production; the guard prevented any connection. The explicit staging localhost was restored after the build, with `/admin/login` 200, provider discovery 200 with local Discord disabled, and anonymous admin broadcast access correctly returning 401.

## 5. Actual staging access findings

### 5.1 Working access

- `.env.staging.local` exists, is ignored and is not tracked.
- Its public Supabase URL targets only `yppefayrepkqpqtprbqa`.
- Publishable-key Auth settings return HTTP 200.
- The configured server key can perform safe empty/base reads and read the PostgREST OpenAPI schema.
- The designated Auth identity `sangamka076@gmail.com` exists and is email-confirmed.
- No remote mutation request was made during inspection.

### 5.2 Management and database access failures

- `SUPABASE_ACCESS_TOKEN` has the expected Supabase personal-access-token shape but receives HTTP 401. The response does not distinguish invalid, expired, revoked or missing project access.
- `DATABASE_URL` is a valid PostgreSQL pooler URL, but its username identifies production project `hldppfhtkfgthainismr`.
- `DIRECT_URL` is a valid PostgreSQL direct URL whose host identifies the same production project.
- Both database URLs are therefore rejected before a network connection is opened.
- The authoritative migration ledger, policies, grants, dependency inventory and database backup state remain unavailable.

## 6. Actual staging schema differences

Read-only OpenAPI inspection of the designated staging project found the following.

### 6.1 Profiles/authentication

The exposed `profiles` table exists but lacks:

- `role_source`
- `is_active`
- `discord_guild_id`
- `discord_role_ids`
- `discord_mapped_roles`
- `discord_role_synced_at`
- `discord_team_role_id`
- `discord_team_verified_at`

The confirmed Auth identity has zero linked base profiles. Discord role-mapping and role-review tables are not exposed.

### 6.2 Scoring/results

Staging lacks:

- `matches.scoring_rules`
- `matches.revision`
- `match_team_results.damage`
- `match_team_results.adjustment_points`
- `match_team_results.decision_reason`
- `match_team_results.disqualified`
- `commit_competition_match(...)`

This is consistent with migrations 026 and 027 not being applied, but the migration ledger must confirm recorded versions and SQL checksums.

### 6.3 Registration/event membership

The base `registrations` and `event_teams` tables exist, but staging lacks:

- `event_teams.registration_id`
- `create_event_registration(...)`
- `confirm_event_registration(...)`
- `set_event_registration_status(...)`
- `commit_competition_event(...)`

Therefore real registration confirmation must not be attempted until migration 028 is reviewed, approved and applied to a reconciled staging schema.

## 7. Administrator account status

Status: **BLOCKED; no provisioning executed**.

Verified facts:

- The requested Auth identity exists.
- Its email is confirmed.
- Its password and identity were not reset or replaced.
- No linked profile exists in the currently readable base schema.
- The schema lacks required authorization fields.
- `QA_STAGING_ADMIN_PASSWORD` is absent.

Prepared secure operation after schema reconciliation and explicit role approval:

```text
node scripts/provision-staging-admin.mjs --email=sangamka076@gmail.com --role=admin --project-ref=yppefayrepkqpqtprbqa --confirm=PROVISION --password-env=QA_STAGING_ADMIN_PASSWORD
```

Do not pass `--create-if-missing`; the Auth identity already exists. If ledger inspection later finds an existing profile that would be changed, stop and obtain a second explicit approval before using `--allow-existing-profile-change=APPROVE`. The wrapper's `--check` mode passes and performs no account/profile request.

The owner must privately set or confirm an owner-generated password of at least 16 characters for this existing Auth identity and store the same value only in ignored `.env.staging.local`. Do not send the value in chat or place it in a command line.

Real login, refresh, dashboard access, direct protected navigation, authorization and logout remain untested until the schema and profile are approved.

## 8. Vercel Preview and R2 isolation

Status: **BLOCKED**.

- The protected Preview URL returns HTTP 302 to Vercel SSO; the application revision cannot be reached without authorized access.
- Deployment protection remains enabled.
- `VERCEL_TOKEN` and `VERCEL_AUTOMATION_BYPASS_SECRET` are absent.
- Available Vercel and Supabase plugins were discovered but are not installed/connected.
- Effective Preview, branch, shared and integration environment bindings cannot be inspected.
- Five staging R2 account/key/bucket fields equal the preserved default `.env.local` values.
- This is an isolation concern, not proof of actual deployed production access.
- No R2 request or object mutation was made.

A branch push could trigger an unsafe Preview deployment, so push remains blocked until the effective environment is inspected and dedicated staging resources are verified.

### 8.1 GitHub PR #1

Fresh read-only GitHub inspection confirms PR #1, **Add Bravo Gaming OBS broadcast overlay**, remains open, non-draft and unmerged against `main` at baseline `c7311530a17cbb63ba5b4e3df0ef2da44acb7953`. It contains eight commits and six files implementing a separate `/overlay` and `/overlay/control` architecture:

- `app/api/overlay/match/route.ts`
- `app/api/overlay/matches/route.ts`
- `app/overlay/BroadcastOverlay.tsx`
- `app/overlay/control/page.tsx`
- `app/overlay/page.tsx`
- `docs/obs-broadcast-overlay.md`

Those paths do not directly overwrite the current staged broadcast filenames, but the PR competes at the architecture and route-responsibility level with the current 38-graphic system. Do not merge it automatically; reconcile or close it deliberately after the current release architecture is approved.

## 9. Discord OAuth

Status: **FAIL/BLOCKED**.

- Fresh authorization still sends an email-shaped Discord Client ID.
- The callback correctly targets `https://yppefayrepkqpqtprbqa.supabase.co/auth/v1/callback`.
- Intended numeric Discord Application ID: `1530095874594836581`.
- The matching client secret is unavailable locally.
- The missing Discord schema must be reconciled before role-sync acceptance.

The provider owner must configure the numeric ID and matching secret in the staging project. No provider update was executed.

## 10. Migration and backup/restore plan

No remote migration is authorized. Before requesting approval:

1. Obtain a valid read-only management token or staging-only database URL.
2. Confirm project reference `yppefayrepkqpqtprbqa` at every step.
3. Export the exact migration ledger and recorded SQL/checksums.
4. Inventory table structure, dependent views/functions, RLS policies and table/column/function grants.
5. Export a restorable staging backup, ledger snapshot, schema, grants and relevant row counts/checksums.
6. Restore into an isolated disposable database or branch.
7. Run the preflight and verify migration 026 aborts on unknown dependent views instead of using `CASCADE`.
8. Rehearse the exact ordered migration plan and the application rollback strategy.
9. Run independent-connection contention tests for match revisions, event capacity and duplicate registration approval.
10. Test restoring the backup before touching staging.
11. Take a fresh backup immediately before an explicitly approved maintenance window.

Forward-only decision:

- If 017–019 and 026–028 are truly absent from the ledger, preserve their files and apply only the reviewed missing ordered prefix after rehearsal and explicit approval.
- If a version is recorded but its required objects are missing, do not edit or replay that historical file. Create a new migration 029 limited to the verified compatibility delta in columns, tables, functions, policies and grants.
- Migration 029 is not finalized while the authoritative ledger, policies, grants and dependencies are unavailable.
- Recovery must use a reviewed forward repair or separately approved tested restore, never a blind historical rewrite or destructive reset.

## 11. External acceptance still required

After the staging schema, profile and resource isolation are approved:

1. Test real email/password login, refresh, direct dashboard access, permission boundaries and logout.
2. Create a designated staging scrim and open registration.
3. Register an authorized staging team.
4. Approve it and verify relational registration, event membership, slot, counter and audit persistence.
5. Test duplicate team/captain requests and independent concurrent approvals at capacity.
6. Assign/release/reassign saved slots and verify roster reads.
7. Configure a real map schedule.
8. Enter, correct, publish and unpublish staging results.
9. Verify revision conflicts, audit history and browser direct-write denial.
10. Compare public standings/leaderboards to saved published records.
11. Test permitted PUBG import using an owner-supplied match ID.
12. Upload, replace, deliver and delete a public object in isolated staging R2.
13. Test private upload, authorized signed delivery and cross-role denial, then clean up the test object.
14. Drive Broadcast Studio and every graphic from actual published staging records.
15. Test `/overlay/program` in real OBS Studio for transparency, sizing, refresh, outage and recovery behavior.

No fixture result may be substituted for these acceptance steps.

## 12. Exact owner actions required

1. Install/connect authorized Supabase and Vercel inspection access, or configure valid tokens locally.
2. Replace production-targeting `DATABASE_URL`/`DIRECT_URL` only with a verified read-only staging connection if database access is used.
3. Configure `VERCEL_AUTOMATION_BYPASS_SECRET` for automated protected-Preview testing without disabling protection.
4. Provide or configure dedicated staging R2 resources with bucket-scoped credentials.
5. Approve the backup/restore rehearsal and exact migration plan separately; do not treat this report as migration approval.
6. Privately set/confirm the designated account password and configure `QA_STAGING_ADMIN_PASSWORD`.
7. Explicitly approve or reject the proposed `admin` profile linkage/elevation.
8. Configure the numeric Discord Application ID and matching secret in staging Supabase.
9. Configure designated staging team/player accounts.
10. Supply an authorized `QA_STAGING_PUBG_MATCH_ID`.
11. Arrange real OBS Studio access for final broadcast acceptance.
12. Give separate approval for local commit, feature-branch push, migration, PR, merge and deployment as each gate becomes ready.

Missing local entries currently include:

- `QA_STAGING_ADMIN_PASSWORD`
- `VERCEL_AUTOMATION_BYPASS_SECRET`
- `VERCEL_TOKEN`
- `CLOUDFLARE_API_TOKEN`
- `QA_STAGING_TEAM_EMAIL`
- `QA_STAGING_TEAM_PASSWORD`
- `QA_STAGING_PLAYER_EMAIL`
- `QA_STAGING_PLAYER_PASSWORD`
- `QA_STAGING_PUBG_MATCH_ID`
- `DISCORD_CLIENT_SECRET`

`SUPABASE_ACCESS_TOKEN`, `DATABASE_URL` and `DIRECT_URL` are present but unusable for authorized staging ledger inspection for the reasons documented above.

## 13. Final release decisions

| Gate | Decision | Reason |
| --- | --- | --- |
| Registration correctness in local isolated PostgreSQL | **PASS** | Migration 028 transaction behavior verified |
| Actual staging registration | **FAIL/BLOCKED** | Migration 028 objects absent |
| Actual staging schema compatibility | **FAIL** | Required profile/scoring/result/registration objects absent |
| Authoritative staging ledger/policies/grants | **BLOCKED** | No valid management or staging DB access |
| Admin account provisioning | **BLOCKED** | Schema and explicit role approval required |
| Real administrator login | **BLOCKED** | Password/profile/schema prerequisites unavailable |
| Vercel Preview isolation | **BLOCKED** | Effective bindings inaccessible |
| R2 isolation/uploads | **BLOCKED** | Dedicated resource ownership/scope unverified |
| Real scrim and scoring acceptance | **BLOCKED** | No accepted admin session or compatible schema |
| Actual OBS acceptance | **BLOCKED** | No published staging records or real OBS run |
| Local commit readiness | **YES — not authorized** | Exact reviewed local snapshot passes checks |
| Feature-branch push readiness | **NO** | Push could trigger an unverified Preview deployment |
| Staging deployment readiness | **NO** | Schema/resource/access gates unresolved |
| Main merge readiness | **NO** | Real staging acceptance and PR overlap unresolved |
| Production deployment readiness | **NO** | All prior release gates remain incomplete |

Proposed local preservation commit message after separate Gate A approval:

```text
feat: finalize atomic scrim registration and staging release safeguards
```

## 14. Canonical supporting documents

- `docs/release-audit.md`
- `docs/release-file-manifest.md`
- `docs/production-deployment-report.md`
- `docs/staging-verification.md`
- `docs/authentication-verification.md`
- `docs/preview-resource-isolation.md`

This report is a handoff and approval document. It does not authorize or prove any remote mutation or production release.
