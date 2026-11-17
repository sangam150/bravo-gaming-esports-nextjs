# Email and Discord authentication verification

## 14 November 2026 refresh

The implementation remains locally verified, but successful real administrator and Discord sessions remain **BLOCKED**.

- The local HTTP 503 was caused by the default `npm run dev` loading the unreachable production Supabase target from `.env.local`. The default command now uses the existing guarded staging launcher; a live intentionally invalid login returned HTTP 401 instead of 503.
- Staging Auth settings are reachable and enable email and Discord.
- The server-key admin user read returned 200; `sangamka076@gmail.com` exists and is email-confirmed.
- A base profile query by the verified Auth UUID returned 200 with zero rows.
- The OpenAPI contract still lacks `is_active`, `role_source`, six Discord sync fields, `discord_role_mappings` and `discord_access_reviews`.
- `QA_STAGING_ADMIN_PASSWORD` and `DISCORD_CLIENT_SECRET` are absent locally.
- The real Discord authorization redirect still contains an email-shaped Client ID; callback target is the staging Supabase callback.
- The exact-SHA Vercel Preview reports Discord enabled, but no OAuth consent/callback/profile/role/session flow was attempted.
- The production Supabase hostname currently returns NXDOMAIN, independently blocking production authentication.

The provisioning wrapper's `--check` mode passed and confirmed environment isolation; it performed no identity/profile request. No password, profile, role, provider or session was changed. The owner approval and execution sequence below remains authoritative after staging schema reconciliation.

## Current decision

Local authentication fixes and staging tools are prepared using the existing Supabase architecture. **Successful real administrator login and Discord OAuth are still BLOCKED.** Do not infer success from fixture tests or from an HTTP 200 connectivity probe. The existing release commit is `7eeded0260887bb31d5090fc1ee47643a8e07a79`; this follow-up is uncommitted.

The designated target is `yppefayrepkqpqtprbqa`. Production credentials, records, deployments and migrations are outside this work. GitHub push remains blocked until Vercel Preview Supabase/R2 isolation is independently verified.

## Verified causes

| Check | Actual result |
| --- | --- |
| Ordinary development environment | `.env.local` still contains the old production Supabase hostname, but `npm run dev` now routes through the guarded staging launcher and prevents that fallback. The raw `dev:webpack` command remains explicit |
| Explicit staging connectivity | Staging DNS resolves; HTTPS Auth settings returns 200 with the staging publishable key. The staging secret key successfully reads an empty profile projection, also 200 |
| Local anonymous/invalid-login behavior | Real localhost admin form loads; protected broadcast API rejects anonymous access with 401; intentionally invalid credentials return 401 |
| Requested temporary identity | `sangamka076@gmail.com` already exists in staging Auth and is email-confirmed. No profile linked by `auth_user_id` was found. The identity and password were preserved |
| Required profile schema | `is_active` and `role_source` are missing. Server profile verification cannot succeed even after credential authentication |
| Discord provider | Enabled, but the real authorization redirect contains an email as `client_id`. This value comes from the staging Supabase Discord provider, not a local application Client ID variable |
| Discord application | The configured bot's authenticated application endpoint returned 200 and public Application ID `1530095874594836581`. Use it only with that same application's OAuth Client Secret |
| Guild and mapped role IDs | Read-only guild lookup returned 200; configured role IDs match that guild |
| Discord schema | Required sync fields and mapping/review tables from 018/019 are missing |
| Management / database access | `SUPABASE_ACCESS_TOKEN` returns 401. Existing `DATABASE_URL` and `DIRECT_URL` fail explicit staging target validation; no connection was attempted with them |
| Protected Vercel Preview | Latest readiness GET redirects to Vercel SSO. No accepted deployed login or production-resource isolation has been established |

Project API connectivity is verified; its dashboard status and migration ledger remain unverified without valid management/database access. HTTPS checks retain certificate validation. No hosts-file, DNS, TLS, deployment-protection or role-policy bypass was introduced.

## Local changes

The password route now distinguishes malformed/missing input (400), invalid credentials (401), authorized-role denial (403), rate limiting (429), backend configuration/network/TLS failures (503), and unexpected application/schema/audit failures (500). Public messages remain safe. Rate-limit headers are retained, and failure telemetry cannot replace the intended response with another exception.

Rejected password and OAuth logins now expire the complete set of Supabase auth cookies, including chunks newly created during authentication and cookies added during failed sign-out. Installed SDK sign-out can return an error while retaining its session; the application explicitly expires those cookies in the rejection response. Successful sessions retain their cookies. Same-origin checks, PKCE/intent validation, verified identities, manual role approval, safe destinations, refresh forwarding and cross-tab logout are preserved.

Server Supabase HTTP requests use a 10-second request timeout while preserving caller cancellation, response-body deadlines and TLS verification. This is a per-request bound; a multi-request login or SDK refresh retry sequence can take longer. Browser/recovery authentication architecture is unchanged.

The default staging development command reads `.env.staging.local` explicitly. It clears automatic/inherited production credential fallbacks and excludes R2, management tokens and QA/provisioning passwords from the application process. Modern keys and legacy alternatives remain supported; legacy JWT project/role mismatches and server keys in browser configuration are rejected. Discord mode passes only the configured server-side guild/bot/role variables; Discord-derived administrator access remains disabled.

## Local setup

Configure these only in ignored `.env.staging.local`:

```dotenv
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://yppefayrepkqpqtprbqa.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<staging publishable key>
SUPABASE_SECRET_KEY=<staging server secret>
```

Legacy alternatives are `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY`. Use matching keys from the selected project; do not retain production fallbacks. No privileged key is passed to the browser. The backend needs its private key for verified Auth identity/profile access.

```sh
npm run dev -- --check
npm run qa:staging-readiness
npm run dev
```

Use `npm run dev -- --discord` only after the Discord provider is repaired and the required guild credentials are configured. Stop the existing local development server before starting another on port 3000. A successful `--check` verifies environment construction, not schema/account/provider acceptance. `qa:staging-readiness` performs read-only real service checks and exits nonzero while dependencies remain unavailable. `npm run dev:webpack` and `npm run dev:turbopack` intentionally retain Next.js's standard `.env.local` behavior and must not be used for staging authentication while that file targets production. See [Next.js environment order](https://nextjs.org/docs/app/guides/environment-variables#environment-variable-load-order).

## Schema and Discord prerequisites

Missing fields are introduced by:

- [017 authentication hardening](../supabase/migrations/017_complete_authentication_hardening.sql): `profiles.is_active`, plus Auth/profile provisioning and authority protections.
- [018 Discord sync](../supabase/migrations/018_discord_role_sync.sql): `role_source` and guild/role sync fields.
- [019 Discord team mappings](../supabase/migrations/019_discord_team_role_mappings.sql): team-verification fields, `discord_role_mappings` and `discord_access_reviews`.

These observations do not establish the complete migration ledger. Before any schema repair, obtain valid staging management access or a verified staging database URL; inspect the exact ledger, all earlier/later dependencies, grants, profile duplicates/orphans and provisioning triggers. Back up schema/data and required functions/policies/grants, and verify restoration. Present the ordered repair for explicit approval. **No remote migration is authorized or applied by this guide.** Do not blindly replay 017–019 or bypass missing schema with fabricated roles/profiles.

In the staging Supabase Discord provider, replace the email Client ID with the intended application's numeric ID and configure its matching OAuth Client Secret. The bot application verified above is an available source of the correct public ID. Register this Discord redirect:

```text
https://yppefayrepkqpqtprbqa.supabase.co/auth/v1/callback
```

Verify that Supabase permits the local app's `/auth/callback` redirect, including the intended query parameters. No broad wildcard or security-protection change has been made. The application then requires a verified Discord identity, valid flow/intent, guild membership, profile linkage, active status and approved role. Guild membership alone does not authorize an administrator. See [Supabase Discord setup](https://supabase.com/docs/guides/auth/social-sign-in/auth-discord).

The prepared provider repair requires valid `SUPABASE_ACCESS_TOKEN` management access. A project publishable/secret key is not a substitute for a management access token. If a new matching provider secret is needed, configure it privately as `DISCORD_CLIENT_SECRET` for the repair tool or save it directly in Supabase; never send it in chat. No provider configuration was changed during the observed 401 failures.

## Owner-only temporary administrator

The requested email already exists. **Do not create a duplicate, reset its password, change confirmation, or replace its Auth identity.** The owner must privately configure its current password or explicitly authorize/set a new one through Supabase. Do not reuse the previously disclosed password. Store the test credential only as `QA_STAGING_ADMIN_PASSWORD`, with `QA_STAGING_ADMIN_EMAIL=sangamka076@gmail.com` in the ignored staging file.

The existing provisioning CLI now checks the entire paginated Auth lookup, target/project/role/confirmation, required profile/audit schema, identity linkage and existing profile before writing. Existing approved profiles are a read-only no-op. Existing profile changes require a separate explicit flag. It never resets an existing Auth password. Its role source is manual, and it verifies the written active role and audit result.

After the schema gate and owner approval, the explicit staging command is:

```sh
npm run admin:provision:staging -- --email=sangamka076@gmail.com --role=admin --project-ref=yppefayrepkqpqtprbqa --confirm=PROVISION
```

If an existing viewer/profile would change, review its baseline and add `--allow-existing-profile-change=APPROVE` only for that approved elevation. The wrapper cannot target production and does not load `.env.local` credentials. No public admin-registration endpoint was added.

For an actually absent identity only, the existing CLI supports `--create-if-missing=CREATE` and `--password-env=ADMIN_PROVISION_PASSWORD` (or `QA_STAGING_ADMIN_PASSWORD`). A private secure password of at least 16 characters is required. It cannot use a privileged server key as the password. No password value belongs in command-line arguments or commits. This creation branch is unnecessary for the requested existing account.

Profile and audit writes use REST, not one database transaction. Version checks protect against concurrent overwrites; failed audit writes trigger guarded compensation. Ambiguous responses or failed compensation require owner review. A later owner's changes are preserved rather than deleting their identity. Do not claim atomic provisioning across Auth and public schema.

## Temporary-access removal procedure

1. Before elevation, preserve the approved baseline role/source/active state and the exact Auth/profile linkage in a private owner record and provisioning audit. Limit every action to the designated staging project/account.
2. At the end of testing, use an owner-approved server operation to restore the baseline role/source or set the exact profile to `role=viewer`, `role_source=manual`, `is_active=false` if complete application disablement is intended. Verify affected identity and record an audit. Current server authorization rechecks the profile, so stale administrator cookies must lose protected access.
3. Sign out the test browser, verify expired local cookies/cross-tab behavior, and revoke all of that account's refresh sessions using an authorized global Supabase sign-out operation. Refresh revocation alone does not immediately invalidate already issued access JWTs; profile deactivation/demotion is the application access boundary. See [Supabase sign-out scopes and token lifetime](https://supabase.com/docs/guides/auth/signout).
4. Verify old cookies/tokens cannot open `/admin` or protected APIs, and that refresh cannot regain temporary privileges. Test other designated identities separately to prove no unrelated account was modified.
5. This Auth identity predates the test. Preserve it by default. Banning or deleting it requires separate owner authorization; use [Supabase's server-side administration](https://supabase.com/docs/reference/javascript/auth-admin-updateuserbyid) if complete Auth disablement is explicitly requested. Retain audit/history and remove the local temporary password slots after testing.

This is a procedure, not a claim that the temporary elevation, session invalidation or removal has been executed.

## Validation and remaining acceptance

Final local validation results are recorded in [staging-verification.md](staging-verification.md) and ignored `qa-artifacts/blocker-recheck/complete-auth-*` evidence. The default QA chain includes the actual-route login error matrix, installed-SDK callback rejection regression, staging-environment isolation checks and owner-provisioning regressions.

On 6 November 2026, all 22 default QA commands, six timeout/cancellation cases, 36 actual login-route fixture responses, the separate SSR refresh regression, four browser session fixtures, TypeScript and the credential-free production-mode build passed. ESLint completed with zero errors and nine existing warnings in an unchanged component. Secret and whitespace checks passed. The three formerly failing public login-page checks also passed against staging-backed localhost without response fixtures. Actual localhost returned 200 for the admin form and 401 for anonymous/invalid-login requests. None of those results verifies a successful real administrator or Discord session.

The latest read-only service probes returned keyed Auth settings 200 and the malformed Discord authorization redirect; several other requests also hit their 10-second deadlines. Intermittent network failures remain visible in the evidence alongside the independently observed missing schema and rejected management token. No provider, schema, password or account-role change was performed.

Real acceptance still requires valid management/schema access, approved schema reconciliation, approved active profile linkage, private account credentials, corrected Discord provider settings and interactive Discord consent. Then verify both successful redirects, refresh/direct navigation, protected role checks, multi-tab logout, old-session denial, cookie properties and recovery delivery. Use only staging accounts/records. No commit, push, merge, remote migration or production deployment is implied.
