# Real staging verification — 5 November 2026

## Latest verification — 5 November

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
