# Scrim operational readiness — 6 November 2026

**Local scrim operation ready for 19:00: NO. Public website ready for this scrim: NO. Safe to deploy production: NO.**

The 6 November 19:00 Nepal deadline has passed. Final follow-up started after 21:45 Nepal time that day; no on-time or real event acceptance is claimed. The operator runbook and empty offline templates are in [event-day-operations.md](event-day-operations.md). This is a historical event report. The [13 November deployment report](production-deployment-report.md) and [current staging verification](staging-verification.md) supersede its credential, test-count and release-candidate statements for the current follow-up.

PASS means the stated check actually passed within its named scope. BLOCKED means no accepted real workflow could be exercised; it does not establish an application defect. Fixture and isolated-database passes are recorded separately from real service acceptance.

## A. Authentication

| Workflow | Result | Evidence / requirement |
| --- | --- | --- |
| Staging key/HTTPS connection | PASS | Read-only keyed Auth settings 200; designated-account/base-profile reads succeeded. Target is `yppefayrepkqpqtprbqa`; TLS verification retained |
| Email/password administrator login | BLOCKED | `QA_STAGING_ADMIN_PASSWORD` is absent; required profile schema is missing and no active linked administrator profile has been established |
| Temporary admin account | NOT READY | Requested `sangamka076@gmail.com` already exists and is email-confirmed. Its identity/password are preserved. Base-profile query found zero linked profiles; no elevation/reset/provisioning executed |
| Invalid-login / anonymous authorization | PASS | Actual localhost form 200, anonymous admin broadcast API 401 and real invalid staging credentials 401; no successful administrator login claimed |
| Discord OAuth | BLOCKED | Real Supabase authorization still contains an email Client ID. Numeric intended application ID and matching secret/provider callbacks must be repaired and verified |
| Local Discord fallback | PASS | `DISCORD_LOGIN_ENABLED=false`: discovery returns 200 with `discord:false`; intent returns 503 and creates no cookie. Remote provider configuration was not changed; email login remains enabled |
| Successful session persistence, refresh, protected roles and logout | BLOCKED | No successful real designated session. Existing route/SDK/browser regressions cover the local implementation separately |

The nonsecret designated QA email has been configured in the ignored staging file. No password was generated for or silently applied to the existing account. Ordinary `npm run dev` still selects the preserved production-configured `.env.local`; use `npm run dev:staging` for the isolated local runtime. Unverified R2/production credentials are excluded by that launcher.

Observed schema gaps remain `profiles.is_active` (017), `role_source`/Discord sync fields (018), and Discord team fields/mapping/review tables (019). Exact ledger/dependency/backup review is blocked by rejected management access and invalid database targets. Do not blindly replay these files.

## B. Scrim management

| Workflow | Real acceptance | Implemented local behavior |
| --- | --- | --- |
| Today's event | NOT READY | Staging read-only exact-date query returned 200 with **zero scrim documents dated 2026-11-06**. No duplicate/event was created |
| Registration / confirmation | BLOCKED | Existing protected real-team selection is reused; canonical active/nonarchived/nonmerged team validation now rejects unknown identities |
| Team slots | BLOCKED | Per-scrim capacity/assignments/locking, manual/auto assignment, withdrawal release and saved-only copy notice implemented. Unique team/slot constraints and revision conflicts have offline route/browser coverage |
| Match schedule | BLOCKED | Linked competition's existing schedule editor is reused in Scrims. Silent 20:00 and Erangel defaults were removed; operator must explicitly set **19:00 Asia/Kathmandu** and authorized maps/times |
| Admin CRUD / lobby management | BLOCKED | No accepted real admin session. Private room/password fields remain excluded from public/broadcast projections |

Slot data extends existing `app_documents` JSON; it needs no new migration. Existing protected APIs, table/row version and update trigger/service permissions are required. The client submits its original revision, then the server performs an atomic conditional row update. New creation IDs and an in-flight guard reduce duplicate/retry risk; save responses include their actual saved revision. These are local implementation guarantees tested with fixtures, not real multi-operator staging acceptance.

## C. Scoring

| Workflow | Real acceptance | Verified local scope |
| --- | --- | --- |
| Manual result entry / correction / publication | BLOCKED | Actual API save path uses service-only `commit_competition_match`; no legacy multi-write fallback introduced |
| Points calculation | BLOCKED | Configured scoring/decimals/DQ/adjustments pass isolated checks. Bulk/editor now inherit event scoring rather than silently forcing a Bravo version |
| Team result validity | BLOCKED | Missing/pending names are rejected before team/RPC mutation; no fabricated pending team can become a published result |
| Leaderboard / penalties | BLOCKED | Event standings project saved penalties, bonuses and DQ counts while preserving saved totals/ranks; no DQ lost-point value is invented |
| Transaction safety | BLOCKED on real staging | Isolated 026/027 tests pass rollback, stale/competing revisions, audit failure, publication conflicts and service/direct-write restrictions. Multi-connection Supabase stress remains unverified |
| Required migration state | BLOCKED | Local 026/027 are present and ordered; real ledger, baseline, function/columns/triggers/grants and backup/restore readiness remain unverified |

A standalone scrim document cannot replace the canonical competition/season required by scoring. No verified compatible old-schema write path exists. Keep official match evidence and scores in the clearly labeled empty offline templates until reconciliation and an accepted test match are possible. Owner maintenance/seed/reset scripts are not an operational fallback.

## D. Broadcast

| Workflow | Result / scope |
| --- | --- |
| Existing graphics | All 37 prior graphic modes retained; one **Team Slots** mode added, making **38 dedicated modes plus permanent `/overlay/program`** |
| Broadcast Studio | Real operation BLOCKED by authentication/schema; local workspace selection/readiness/revision fixtures cover implementation |
| Essential graphics / program rendering | Browser fixture verification is recorded in the final local-check table below; actual published staging-record acceptance remains BLOCKED |
| Team Slots data | Explicitly selected published scrim must belong to selected event. Uses saved per-scrim assignments; global team slot numbers and array order cannot become lobby assignments |
| Dynamic updates / failure | Fixture tests cover saved reassignment, paging/capacity reduction, reload, show/hide/reveal and outage recovery. Program hides stale data on failure rather than showing withdrawn results; it does not delete published database results |
| Actual OBS Studio | NOT TESTED; no desktop/OBS capture capability was available. Browser screenshots do not certify OBS capture/transparency/GPU behavior |

When the backend remains blocked, no verified dynamic browser fallback exists. Use an already approved static break/gameplay scene under operator control, retain scores offline and do not seed fictional data or claim a fixture graphic is live.

## E. Environment and deployment

At `2026-11-06T16:03:33Z` (21:48 Nepal), real staging probes returned Auth settings 200; required profile reads 400/42703; missing Discord tables 404/PGRST205; Discord authorization 302 with the malformed Client ID; protected Preview 302 to Vercel SSO. Management inspection returned 401. These are observed failures/blockers, not successful integration.

Unauthenticated public production GETs returned 200 for home, scrims, version and scrims API. The reported deployed SHA is **`c7311530a17cbb63ba5b4e3df0ef2da44acb7953`**, with zero public scrims and zero November 6 scrims returned. This is the older deployment, not the local release commit or new follow-up. No production credentials were sent and no production record was modified.

| Input / boundary | State / action |
| --- | --- |
| `QA_STAGING_ADMIN_PASSWORD` | Missing. Owner must privately configure the account's current or explicitly owner-set new password; no automatic reset |
| `SUPABASE_ACCESS_TOKEN` | Present but rejected 401. Valid management access is required, or use verified database access below |
| `DATABASE_URL` / `DIRECT_URL` | Present but both fail staging identity validation. Neither was used to connect; configure one verified staging-only connection for ledger review |
| `VERCEL_AUTOMATION_BYPASS_SECRET` | Missing. Needed to test protected Preview without disabling protection |
| `DISCORD_CLIENT_SECRET` | Absent locally; optional if setting the matching provider secret directly in staging Supabase. Application Client ID belongs in that provider, not a local app ID variable |
| Team / player test accounts | Missing `QA_STAGING_TEAM_EMAIL`, `QA_STAGING_TEAM_PASSWORD`, `QA_STAGING_PLAYER_EMAIL`, `QA_STAGING_PLAYER_PASSWORD` |
| Authorized PUBG test match | `PUBG_API_KEY` present; `QA_STAGING_PUBG_MATCH_ID` missing. No substitute match imported |
| R2 | Credential/base URL entries present; account/token/bucket staging isolation unknown. No credentialed R2 upload/delete attempted. Approved local assets/placeholders remain usable |
| Production isolation | Actual Preview Supabase/R2 bindings UNKNOWN. Feature push remains BLOCKED because it could trigger a Preview using production resources |

Missing legacy key alternatives and `ADMIN_PROVISION_PASSWORD` are not additional requirements for this existing-account workflow. Keys/credentials were not printed; ignored environment files remain untracked.

## F. Local quality and evidence

The first full real-local public run on 6 November returned **67 PASS / 5 FAIL**. Those original failures and diagnostic artifacts are retained. Subsequent repairs were verified by the complete original public suite on **11 November: 72/72 PASS**, alongside 17 client interaction regression tests and a passing production-mode local build. The [current deployment report](production-deployment-report.md) and [staging verification](staging-verification.md) distinguish those completed local checks from still-blocked real acceptance and final checks of later source changes. Nothing was skipped or suppressed:

- Statistics and Stats: legitimate historical rows without team IDs caused duplicate React keys and empty profile links. A narrow presentation repair preserves historical names/scores and avoids fake canonical IDs.
- Navigation: missing-game negative route returned no navigation response to one browser call; isolated direct/browser 404 checks and the subsequent complete public suite passed. The original failure is retained.
- Login smoke: no POST response was observed within 120 seconds. Diagnosis reproduced early form interaction losing controlled values before hydration, while later interaction returned real 401.
- Responsive menu: initial click did not open the drawer; hydration/pathname initialization was repaired and covered by delayed-client regressions and the subsequent complete public suite.

No failure is attributed to missing credentials unless the observed checkpoint supports that conclusion. Full authenticated login remains independently blocked by missing password/profile/schema.

Evidence is ignored under `qa-artifacts/blocker-recheck/` and dedicated browser output directories. Read-only service evidence: `event-day-staging-readiness-final.txt`, `event-day-management-inspection-final.txt`, `event-day-database-targets-final.txt`, `event-day-readonly-scrim.json`, `event-day-public-deployment-final.txt`, `event-day-env-presence-final.txt`. The first public failures remain in `event-day-public-suite.txt` and `qa-artifacts/event-day-public-browser/`, with the original issues/summary preserved separately.

## G. Release and operator decision

- **LOCAL SCRIM OPERATION READY FOR 7 PM: NO.** Deadline passed; successful admin login, actual event/teams/slots/schedule/results, real standings and published-data broadcast acceptance were not established.
- **PUBLIC WEBSITE READY FOR TODAY'S SCRIM: NO.** Public endpoints load, but deployed revision is old and no public event was returned. Local changes do not publish registration or results to participants.
- **SAFE TO DEPLOY PRODUCTION: NO.** Staging acceptance, verified resource isolation, complete migration/backup/recovery review and explicit owner approvals are missing.

Next required sequence: configure valid private staging access; inspect ledger/schema/backups; prepare the exact repair for explicit migration approval; provision only the approved active linked profile; verify real email session/roles/logout; create/verify an authorized test event and complete registration→slots→schedule→score→correction→publication→leaderboard→broadcast acceptance; confirm isolated R2/Preview bindings; only then prepare an approved deployment candidate against the actual production revision. The new P0 work depends on the previously unreleased platform snapshot; no minimal independent production patch is certified here.

No commit, push, PR, merge, remote migration, provider update, account reset/role grant or deployment was performed. No production data or R2 objects were changed. Do not reinterpret this report or the local test results as approval for those actions.
