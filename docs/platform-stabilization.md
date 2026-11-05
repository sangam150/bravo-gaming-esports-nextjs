# Final stabilization — 4 November 2026

Latest real-service follow-up: [staging-verification.md](staging-verification.md), with PASS/FAIL/BLOCKED for every workflow and links to actual HTTP/browser evidence. Staging acceptance remains blocked by missing access configuration.

Branch: `codex/platform-completion-20261104`. Production readiness: **not accepted**. No deployment, live database mutation, account provisioning, migration or R2 upload was performed during this stabilization pass. Existing staged and unstaged work was preserved.

## Administrator authentication diagnosis

Code inspection and offline execution confirmed these defects:

1. The SSR proxy changed request cookies after Next.js had captured the forwarded headers. Refreshed cookies reached the browser but could be absent from the same server render. The adapter now forwards the refreshed request headers while preserving the existing response and response cookies.
2. The browser provider reconciled overlapping SDK sessions by POSTing tokens back to the compatibility session endpoint. Stale SDK state could race with a successful server password login. Admin requests also automatically attached the SDK token ahead of valid server cookies. The provider now reads identity/role from protected `/api/auth/me`; admin requests use server cookies. Generation checks, cancellation and timeouts prevent stale identity reads from winning.
3. Server password login/logout did not reliably invalidate another tab's displayed identity. Tabs now receive a credential-free invalidation marker and independently recheck the server. Focus, visibility, SDK events and periodic checks also reconcile state. Storage messages never grant roles.
4. Session/logout helpers treated some HTTP failures as success. They now check status and have bounded requests. Login rebuilds the server layout at `/admin`; failed logout is displayed explicitly. Recovery reports a failed post-reset sign-out instead of silently claiming completion.
5. Proxy authorization rejected Discord-derived profiles even when the server's explicit trust flag enabled them. Both now follow the existing `DISCORD_RELATIONAL_TEAM_AUTH_ENABLED` policy; its default remains deny. No administrator permission is assigned automatically.

These are proven implementation defects, **not a confirmed diagnosis of the designated deployed account**. Its password, confirmation state, active profile/role, deployed revision and Supabase redirect configuration could not be inspected without staging access. The production-configured Supabase host also failed local DNS resolution; that is a separate configuration/service blocker.

Server authorization remains authoritative on protected APIs. Supabase's [SSR cookie guidance](https://supabase.com/docs/guides/auth/server-side/creating-a-client?queryGroups=framework&framework=nextjs) and [auth event guidance](https://supabase.com/docs/reference/javascript/auth-onauthstatechange) informed this review.

## Other corrections

- Authenticated player and season lists include internal/inactive records without widening public readers. Responses are private and uncached.
- Admin player profile creation/editing writes the existing canonical `players` row, then existing compatibility metadata under the same UUID. It does not overwrite result statistics or canonical avatar columns. Legacy import/aggregate writers retain their existing document behavior.
- Player avatar compatibility updates now patch only avatar fields rather than copying a derived player projection over historical metadata.
- Player deletion archives canonical identity. Seasons containing events or matches cannot be hard-deleted; failed relational deletions no longer silently proceed with document deletion.
- Player profile validation and same-origin checks were added to the touched mutation routes.
- Two of the original eleven import-manager warnings were corrected: stale auto-preview dependencies and synchronous initial external fetch setup. Nine existing editable-form/selection synchronization warnings remain. None were suppressed; a broader state redesign without real import acceptance would add risk.
- Account-readiness database checks now verify TLS certificates using the existing CA helper. Staging QA rejects any Supabase project other than the supplied staging reference and never falls back to `.env.local`.

No schema migration is required by these corrections. Existing migrations 024–025 and their application state still require review. Canonical-row plus metadata writes are not transactional; a metadata failure after a successful canonical write requires reviewing that row before retrying. Historical scoring was not changed.

## Actual staging results

Latest probe: `2026-11-04T12:35:54.793Z`.

| Resource                          | Actual result                                                                                                                           |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Supplied Vercel preview           | Reachable, HTTP 302 to `https://vercel.com/sso-api`; application access blocked by Vercel protection                                    |
| Supabase `yppefayrepkqpqtprbqa`   | Reachable, `/auth/v1/health` HTTP 401 without an API key; authenticated connectivity not verified                                       |
| Admin `bravoxgaming473@gmail.com` | Identifier configured; password absent locally; real browser auth test stopped before launch                                            |
| Public/private R2                 | Bucket identifiers configured: `bravo-gaming-assets` / `bravo-gaming-private`; credentials absent; no objects read, uploaded or deleted |
| Team/player identities            | Not provided                                                                                                                            |
| Permitted PUBG match              | Not provided; no fabricated or substitute match used                                                                                    |
| OBS Studio                        | Actual capture not performed                                                                                                            |

`qa-artifacts/staging-readiness.json` records safe probe results. Both `qa:staging-readiness` and `qa:auth:staging` exited 1; neither is a successful acceptance result. The current `.env.local` targets the existing production reference, not staging. It was not reused for staging.

## Local configuration and safe continuation

An ignored `.env.staging.local` contains only the supplied identifiers and empty credential slots. Configure secrets locally or through the existing secret manager; never paste them into chat or commit the file. Required local values:

- Staging public Supabase key, server secret/service-role key, and verified staging `DATABASE_URL` or `DIRECT_URL` for read-only account/schema diagnostics.
- `QA_STAGING_ADMIN_PASSWORD` for the supplied admin account.
- `VERCEL_AUTOMATION_BYPASS_SECRET` for the protected preview, or an appropriately configured accessible staging deployment. QA sends the [Vercel bypass header](https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation) only to the designated deployment origin.
- R2 credentials/endpoint for the supplied buckets, with confirmation that those buckets are isolated for staging. Bucket names alone do not prove isolation. Use uniquely named QA records/objects and never replace existing assets.
- A permitted PUBG match ID/API key and designated team/player identities when available.

Configure Vercel Preview independently: exact staging Supabase URL/key pair, server key and R2 values; exact staging site origin and Supabase recovery/OAuth callback allowlist. Inspect Production separately without replacing its database with staging. Cookies should be host-scoped on each deployment, HTTPS Secure, and never pinned to another Vercel hostname. Check the deployed revision before treating a test as validation of this patch.

Run the read-only account diagnostic once local staging database access exists:

```sh
node --env-file=.env.staging.local qa/auth-account-readiness.mjs
npm run qa:staging-readiness
npm run qa:auth:staging
```

The account diagnostic checks the designated email, confirmation, profile linkage, active state, role and role source. It does not modify the account. If it identifies a missing/inactive/incorrect profile, the project owner must review the intended role before using the existing explicit provisioner. Example for an approved administrator correction, **not executed here**:

```sh
node --env-file=.env.staging.local --conditions=react-server --import tsx scripts/provision-admin.ts --email=bravoxgaming473@gmail.com --role=admin --project-ref=yppefayrepkqpqtprbqa --confirm=PROVISION
```

Set/reset credentials through Supabase's existing invitation/recovery flow. Do not grant `super_admin` merely to make a check pass. Verify actual email delivery, recovery callback, password change and session termination separately.

The real browser test uses the designated account with no fixture responses. It covers invalid credentials, anonymous API denial, valid login, cookie issuer/attributes, refresh, direct section navigation and cross-tab logout. It does not certify CRUD, long-duration expiry, email delivery, R2 or OBS.

## Verification

| Check | Actual result |
| --- | --- |
| `npm run typecheck` | Passed on final source |
| `npm run lint` | Exit 0; nine existing `PubgImportManager.tsx` state/effect warnings, zero errors; reduced from eleven without suppressions |
| `npm test` | All sixteen existing QA commands passed; primarily offline/source/policy checks |
| `npm run qa:auth-refresh` | Passed with the installed SSR SDK and intercepted offline service responses: same-request refresh forwarding, profile authorization, explicit Discord policy, invalid/inactive denial |
| `npm run qa:auth-provider` | Four browser regression tests passed using bundled real provider/helper code and intercepted offline responses: stale SDK state, cookie auth, reload, cross-tab logout, denied roles/expiry, outage retry and failed logout |
| `npm run qa:admin-data` | Passed offline canonical create/edit/archive, admin read-your-writes, inactive visibility, statistics/avatar preservation, failed-primary-write handling and season-history protection |
| `npm run qa:broadcast` | Passed offline projection/privacy, publication, scoring, scrim and outage recovery checks |
| `npm run qa:secrets` | Passed; no credential patterns detected |
| `npm run build` | Passed, including TypeScript and all 147 static-page build tasks |
| `npm run qa:broadcast:ui` | Five passed against the local production build: all graphic modes, transparent canvas, show/hide/reveal/outage, dedicated/preview behavior, anonymous mutation denial and large-field paging; browser responses are fixtures |
| Additional `Auth entry-point smoke QA` | **Failed** against the local production build: invalid-credential POST returned service-unavailable 503 rather than the test's expected 401/403/429. The configured production Supabase hostname fails local DNS. Admin login screen rendered, but later team/player screen assertions were not reached. Test expectation was not weakened |
| `qa:staging-readiness` / `qa:auth:staging` | Both exited 1, for the external/local-configuration blockers above |
| Git whitespace checks | Staged and unstaged `git diff --check` passed; Git emitted ordinary LF/CRLF conversion notices |

Offline and fixture checks are separate from actual staging service acceptance. No new full public-route sweep was completed during this stabilization pass; earlier successful route coverage is recorded in `platform-verification.md`. Recovery email delivery, real token expiry, authenticated CRUD, live R2/public-private access, actual scoring publication, real leaderboard totals and OBS capture remain external acceptance requirements.

## Remaining acceptance and deployment

After deploying the reviewed patch to staging through the existing Vercel workflow, run real tournament/season/scrim CRUD, registrations/approval, team/roster/player changes, draft/private reads, permitted PUBG preview/import/duplicate checks, manual correction, versioned scoring and publish/unpublish. Compare actual published result totals and leaderboards with all OBS graphics and control actions. Test public/private R2 uploads, ownership denial, replacements and deletion only on new designated QA records. Exercise recovery, expired sessions and non-admin accounts. Use the checklist in `platform-operations.md`.

All existing admin modules and public pages cannot be certified from source assertions or fixture data. Current published staging records and real OBS/R2 images remain unverified. Headshot and killfeed graphics still report unavailable verified telemetry; no live pipeline is claimed.

Before production: review the complete staged/unstaged release diff, preserve user changes, verify secrets, confirm production Supabase/R2 targets and migration state, confirm restorable backups, prepare a clean release and obtain explicit production deployment approval. No production approval is requested yet because staging acceptance remains incomplete. No reset, demo cleanup or overwrite of production records is part of this procedure.

## Stabilization file inventory

- Auth: `components/admin/{AuthProvider,AdminGate,AdminLogin}.tsx`, `components/SiteHeaderClient.tsx`, `components/auth/PasswordRecoveryClient.tsx`, `components/team/TeamPanelClient.tsx`, `lib/{admin-api,login-client,auth-session-events}.ts`, `lib/supabase/proxy.ts`.
- Admin data: `components/admin/AdminDashboard.tsx`, `components/admin/PubgImportManager.tsx`, `lib/{data,competition-relational,player-profile-input}.ts`, player/season API routes, team player-avatar route.
- Diagnostics: `scripts/lib/verified-database-connection.mjs`, `scripts/provision-admin.ts`, `qa/auth-account-readiness.mjs`, staging guard on the legacy `qa/auth-production-e2e.mjs`.
- New QA: `qa/{auth-refresh-check.ts,auth-provider.spec.js,admin-data-check.ts,staging-target.mjs,staging-readiness.mjs,auth-staging-e2e.mjs}`, scripts in `package.json`.
- Handoff: this document and linked notes in the existing audit/operations/verification documents. Earlier broadcast/scoring changes and pre-existing user changes remain in the working tree; see the earlier inventory in `platform-verification.md`.
