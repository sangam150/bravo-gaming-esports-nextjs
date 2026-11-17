# Infrastructure unblock — phase 2 — 16 November 2026

> Superseded for execution by [Phase 3](infrastructure-unblock-phase-3.md) and the [final owner action register](BRAVO_FINAL_OWNER_ACTIONS.md). Phase 3's live domain inventory makes V2 conditional and replaces V7 because `.esports` is not a delegated TLD. Do not execute the Phase 2 V2/V7 text on its own.

## 17 November refresh

V1 is now owner-approved, applied and verified. Canonical Standard Protection redirects anonymous exact Preview and branch-alias requests to Vercel Authentication while the generated production alias remains HTTP 200 at unchanged SHA `c731153…`. All three projects remain Git-connected, all custom hosts remain unusable, and staging R2/database access remain blocked. A redacted environment pull revealed that the ignored local workspace link targeted duplicate A; the credential-bearing temporary file was removed and the ignored link was corrected locally to the canonical project. The next exact sequence is V3 independently when approved, V2 only after the `.com.np` ownership/domain decision, and V5 only after dedicated staging buckets/token exist. V6 remains a freeze. V7 requires a registrable domain and must not attempt to publish `bravo-gaming.esports`.

## Decision

Staging acceptance and production readiness remain **BLOCKED**. The original Phase 2 checks were read-only; the later owner-approved V1 update changed only canonical Standard Protection. No DNS record, environment variable, Git connection, database object, account, OAuth provider, R2 object, commit, push, merge or deployment was changed.

## Verified production ownership and continuity

Vercel maps `bravo-gaming.esports` to project `bravo-gaming-esports-nextjs` (`prj_xbUATIQPxXEj6Aamukjx8YJABjBh`). This is the canonical project to preserve.

The custom domain is not currently healthy: Vercel reports invalid DNS configuration, public DNS returns NXDOMAIN and an unauthenticated HTTPS request cannot resolve it. The canonical Vercel alias `bravo-gaming-esports-nextjs.vercel.app` and its latest production deployment return HTTP 200. Disconnecting Git from either duplicate project does not move or delete the custom domain and does not alter the canonical project's production deployment.

Safest topology:

- `bravo-gaming-esports-nextjs`: sole Git-connected canonical project; owns production domain and all Production bindings; Preview uses staging-only resources and Standard Protection.
- `bravo-gaming-esports`: retained temporarily for rollback evidence, but disconnected from Git; do not delete until the canonical topology and domain are verified.
- `bravo-gaming`: retained temporarily for rollback evidence, but disconnected from Git; do not delete until the canonical topology and domain are verified.

## Owner-approved Vercel change list

No item below has been executed.

| Approval item | Exact project and dashboard path | Current setting | Proposed setting | Expected effect |
| --- | --- | --- | --- | --- |
| V1 — Preview protection | `bravo-gaming-esports-nextjs` → Settings → Deployment Protection (`/sangams-projects-9468acfa/bravo-gaming-esports-nextjs/settings/deployment-protection`) | No SSO/password/trusted-IP protection; exact deployment and branch alias return unauthenticated HTTP 200 | Enable **Vercel Authentication** with **Standard Protection** | Preview and generated deployment URLs require authorized Vercel access while the production custom domain remains public |
| V2 — First duplicate Git target | `bravo-gaming-esports` → Settings → Git (`/sangams-projects-9468acfa/bravo-gaming-esports/settings/git`) | Connected to `sangam150/bravo-gaming-esports-nextjs`; automatic deployment creation enabled | Disconnect Connected Git Repository; retain project/deployments temporarily | Future repository pushes no longer create this project's unsafe production-Supabase/shared-R2 Preview builds |
| V3 — Second duplicate Git target | `bravo-gaming` → Settings → Git (`/sangams-projects-9468acfa/bravo-gaming/settings/git`) | Connected to the same repository; automatic deployment creation enabled | Disconnect Connected Git Repository; retain project/deployments temporarily | Future pushes no longer create this project's incomplete Preview builds |
| V4 — Canonical Preview isolation | `bravo-gaming-esports-nextjs` → Settings → Environment Variables (`/sangams-projects-9468acfa/bravo-gaming-esports-nextjs/settings/environment-variables`) | Preview has designated staging Supabase URL/public/server keys; no Preview `DATABASE_URL`, `DIRECT_URL`, `POSTGRES_*` or R2 variables | Preserve staging Supabase values and Preview-only scope; do not add direct SQL credentials; verify no shared/integration override targets production | Preview remains isolated from production Supabase and gains no direct database path |
| V5 — Staging R2 | Same canonical Environment Variables page, **Preview scope only** | No Preview R2 variables, so uploads are unavailable and cannot fall back to production | Add the exact staging-only R2 variables listed below, backed by dedicated buckets/token | Enables later R2 acceptance without production bucket access |
| V6 — Production continuity | `bravo-gaming-esports-nextjs` → Settings → Git / Environment Variables / Domains | Production branch `main`; production Supabase/Postgres/R2 bindings exist; custom domain assigned to this project | Do not change canonical Git link, `main`, Production variables or domain assignment during V1–V5 | Existing production deployment and resource bindings remain untouched |
| V7 — Custom-domain DNS repair | `bravo-gaming-esports-nextjs` → Settings → Domains (`/sangams-projects-9468acfa/bravo-gaming-esports-nextjs/settings/domains`) and the authoritative DNS provider | Domain assigned correctly in Vercel, but Vercel reports invalid DNS and public DNS is NXDOMAIN | Apply only the exact DNS record(s) Vercel currently displays for `bravo-gaming.esports`; retain assignment to the canonical project | Restores the custom production hostname without redeploying or moving the domain |

Use the dashboard project selector and paths above; do not modify team-wide shared variables. Vercel environment changes affect only later deployments, so isolation must be reverified on a separately approved new Preview.

## Preview safety matrix

| Project | Current Preview safety | Evidence |
| --- | --- | --- |
| `bravo-gaming-esports-nextjs` | **FAIL protection / PASS Supabase guard / SAFE-BY-ABSENCE R2** | Staging Supabase build guard passed; Preview has no R2; exact SHA and branch alias return unauthenticated HTTP 200 |
| `bravo-gaming-esports` | **FAIL CLOSED, not safe to deploy** | Preview targets production Supabase and shared R2 names; source guard rejects the build; Standard Protection is enabled |
| `bravo-gaming` | **FAIL CLOSED, incomplete** | Required staging Supabase/R2 bindings are absent; source guard rejects the build; Standard Protection is enabled |

A login wall is only access protection. It does not establish database or storage isolation.

## Required staging R2 bindings

Configure these only on `bravo-gaming-esports-nextjs`, Preview scope:

- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_ENDPOINT`
- `R2_BUCKET_NAME`
- `R2_PRIVATE_BUCKET_NAME`
- `R2_PUBLIC_BASE_URL`
- `R2_PUBLIC_DELIVERY_MODE=proxy` unless direct delivery is intentionally reviewed
- `NEXT_PUBLIC_R2_PUBLIC_BASE_URL` only when direct delivery is enabled; it must equal `R2_PUBLIC_BASE_URL`

The public/private buckets must be distinct, dedicated staging resources and must not be named `bravo-gaming-assets` or `bravo-gaming-private`. The token must be scoped only to those two staging buckets. Names alone are insufficient: Cloudflare account, bucket ownership and token scope need owner-authorized read-only verification before any write test.

## Post-change Vercel verification

After V1–V7 are owner-completed:

1. Re-read all three project Git, protection and environment metadata without exposing values.
2. Request the canonical exact deployment URL and branch alias without cookies, authorization or bypass headers. Standard Protection must deny or redirect both.
3. Request the production custom domain without authentication. It must resolve and remain public.
4. Confirm only the canonical project remains Git-connected.
5. Confirm canonical Preview Supabase URL/key ownership targets `yppefayrepkqpqtprbqa` and no Preview direct database variable targets production.
6. Confirm every Preview R2 variable is branch/environment scoped to Preview and the token can address only the dedicated staging buckets.
7. Under separate deployment approval, build one Preview and verify the source guard, `/api/version`, Supabase Auth settings, public/private R2 boundaries and anonymous admin denial.

## Supabase SQL readiness

The designated target is only `yppefayrepkqpqtprbqa`.

- Supabase management/CLI access still returns HTTP 401.
- `DIRECT_URL` and `DATABASE_URL` still identify production and are rejected before connection.
- Staging Auth settings are reachable, but the authoritative migration ledger, policies, grants, definitions and dependencies remain unread.
- The requested inspection command has not connected to any database.

Tracked-ready source is now in `qa/staging-schema-readonly-inspection.mjs`. The required ignored command path, `qa-artifacts/staging-schema-readonly-inspection.mjs`, imports that source. The inspector:

- accepts only `db.yppefayrepkqpqtprbqa.supabase.co` or a Supabase pooler whose username contains the exact project ref;
- uses certificate-verified TLS through the existing connection helper;
- starts `REPEATABLE READ, READ ONLY` and always rolls back;
- rejects superuser, create-role, create-database, replication, bypass-RLS, database/schema-create, application-row SELECT and application-write privileges;
- requires SELECT only on `supabase_migrations.schema_migrations`;
- reads catalogs plus the migration ledger, never Auth/application/storage rows;
- hashes and redacts SQL bodies/defaults/policies and stores evidence only below ignored `qa-artifacts`;
- reports only target, status, counts and hashes to the console.

Safety regression: `node qa/staging-schema-readonly-inspection-check.mjs` passes. The current production-targeted URL is rejected before network connection.

### Minimum SQL role

The owner may provision a temporary login role, under separate database-change approval, with only:

- `LOGIN` and database `CONNECT`;
- `USAGE` on schema `supabase_migrations`;
- `SELECT` on `supabase_migrations.schema_migrations`;
- no role membership, superuser, create-role, create-database, replication or bypass-RLS;
- no CREATE on the database or `public`, `auth`, `storage`, `supabase_migrations` schemas;
- no SELECT/INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER privilege on application/Auth/storage relations.

PostgreSQL catalog visibility supplies the remaining schema metadata. The inspector independently verifies these boundaries before collecting evidence.

### Dashboard fallback

If a staging SQL URL cannot be supplied, select project `yppefayrepkqpqtprbqa` in Supabase Dashboard → SQL Editor, review `qa/staging-schema-readonly-dashboard.sql`, and run it manually. It begins a repeatable-read, read-only transaction, returns only catalog metadata/hashes, and rolls back. The Dashboard project selector is part of the target check; do not run it from another project. Save the results locally in ignored evidence. This is still an authorized database read and requires owner action.

## Provisional drift matrix

OpenAPI is not the migration ledger. These are confirmed exposed-object observations only:

| Local migration area | Observable staging result | Ledger conclusion |
| --- | --- | --- |
| 001–019 | Base objects exist, but required profile `role_source` / `is_active`, Discord sync fields and mapping/review tables are absent | **UNKNOWN** |
| 020 | Team normalization/reconciliation columns, alias fields and reconciliation/audit tables absent | **UNKNOWN** |
| 021 | Active-membership authorization RPC absent | **UNKNOWN** |
| 022 | Player-link eligibility field and seven linking/review RPCs absent | **UNKNOWN** |
| 023 | Policy/grant boundary cannot be established through OpenAPI | **UNKNOWN** |
| 024 | `current_user_role` and `current_user_team_id` visible; `site_settings` absent | **PARTIAL OBJECT DRIFT; LEDGER UNKNOWN** |
| 025 | `event_player_statistics` absent | **UNKNOWN** |
| 026 | Scoring fields `damage`, `adjustment_points`, `decision_reason`, `disqualified` absent | **UNKNOWN** |
| 027 | `matches.revision` and `commit_competition_match` absent | **UNKNOWN** |
| 028 | `event_teams.registration_id` and registration/event commit RPCs absent | **UNKNOWN** |

This is non-prefix drift. No migration is classified as unapplied until ledger rows and exact definitions are inspected. No compatibility SQL is safe to author yet.

## Backup, reconciliation and rehearsal gate

After authoritative evidence is available:

1. Compare remote ledger versions/names/statement hashes against the local 001–028 SHA-256 manifest.
2. Compare relations, columns/defaults, constraints, indexes, triggers, RLS/policies, ACLs, function signatures/bodies/owners/security flags and dependencies.
3. Classify each object as exact, missing, altered or unexpected remote-only.
4. Take an authorized roles/schema/data backup with matching PostgreSQL tools; hash every file.
5. Restore into a disposable isolated database of the same PostgreSQL major version and verify ledger/schema hashes and critical row counts.
6. Author the minimum forward-only compatibility migration; never edit or replay a divergent applied historical file.
7. Apply only to the disposable restore, then test dependency safety, grants, direct-write denial, revision conflicts, rollback/audit behavior and registration/scoring transaction integrity.
8. Request a separate remote-migration approval with the exact SQL, backup/restore evidence and maintenance/write-pause plan.

Local PostgreSQL client tools are absent and the Docker daemon is not running, so no new restore rehearsal occurred in this phase. Existing migration 026–028 isolated fixtures remain local evidence, not a target restore rehearsal.

## Remaining administrator and Discord blockers

- `QA_STAGING_ADMIN_PASSWORD` is absent.
- The confirmed designated Auth identity has no linked profile.
- Required `profiles.role_source`, `profiles.is_active` and Discord linkage fields are unavailable.
- Discord Auth is enabled, but its authorization redirect still uses an email-shaped client ID rather than a numeric Discord application ID.
- `DISCORD_CLIENT_SECRET` is absent locally; no provider update was made.
- Designated team/player accounts and a permitted PUBG match ID are absent.

No administrator provisioning/elevation, password reset, Discord provider edit or consent flow is authorized in this phase.

## Local file preservation

The reported “seven edits” are the seven modified documentation files. The actual tracked working-tree delta is nine files: those seven documents plus the intentional default-local-login change in `package.json` and its regression in `qa/local-staging-environment-check.mjs`. Nothing is staged.

New tracked-ready Phase 2 sources are:

- `qa/staging-schema-readonly-inspection.mjs`
- `qa/staging-schema-readonly-inspection-check.mjs`
- `qa/staging-schema-readonly-dashboard.sql`
- this report

Ignored helper wrappers, inspection output and safe Vercel metadata tooling remain under `qa-artifacts` and are excluded from a future commit. No credential or generated application artifact belongs in the candidate.

## Exact next approval

The next remote-change approval should be limited to **V1–V7 Vercel/DNS configuration**, with V2/V3 disconnecting only the duplicate projects and V6 preserving the canonical production project. Supabase remains read-only-blocked until the owner separately supplies a least-privilege staging `DIRECT_URL`/`DATABASE_URL` or runs the Dashboard fallback. Neither approval authorizes a push, deployment, SQL migration, administrator change, OAuth edit, merge or production release.
