# Infrastructure unblock — phase 3 — 16 November 2026

## Authorized execution update — 17 November 2026

All action gates were subsequently authorized. The safe evidence-gated operations completed as follows:

- Canonical project `bravo-gaming-esports-nextjs` retains Vercel Authentication Standard Protection. Anonymous exact Preview and branch-alias requests return HTTP 302; the generated production alias and `/api/version` remain HTTP 200 at production SHA `c7311530a17cbb63ba5b4e3df0ef2da44acb7953`.
- Git integration was disconnected from duplicate projects `bravo-gaming-esports` and `bravo-gaming`. Their deployments, history and existing domain assignments were retained. The canonical project is now the sole Git-connected deployment target.
- A dedicated staging R2 pair was created: `bravo-gaming-staging-assets` and `bravo-gaming-staging-private`. Authorized put, authenticated get, content-type and cleanup checks passed for both buckets, and no test objects remain.
- R2 credential isolation did not pass: the available credential can also address `bravo-gaming-assets` and `bravo-gaming-private`. That credential was not added to canonical Preview. Preview remains safe by absence of R2 bindings, not ready for upload acceptance.
- An automation bypass was intentionally created after full authorization and stored only in ignored `.env.staging.local`. Protected staging QA reaches the canonical branch alias without disabling protection. Its value is not printed or committed.
- Supabase management access still returns 401 and both configured PostgreSQL URLs identify the production project, so the target guard rejects them before connection. The authoritative staging ledger, catalog, policies, grants and functions remain unread. No remote SQL ran.
- The authorized staging-admin provisioning script stopped safely before mutation because required profile schema is unavailable. No Auth identity, profile, role or password changed.

Local verification is green: typecheck, the 26-command QA chain, inspector safety, secret scan, lint with nine existing warnings and zero errors, and the 147-page production build all pass. The exact application candidate is 24 paths; `AGENTS.md`, `.env*`, `.vercel`, `qa-artifacts`, build output and credentials remain outside it.

The original Phase 3 tables below are retained as pre-execution evidence. Their statements that duplicate Git links remain connected, R2 buckets do not exist, the QA target is duplicate A, no bypass exists, or V2/V3 lack authorization are superseded by this update.

## Earlier V1 execution record — 17 November 2026

At this earlier checkpoint the owner had approved V1 only. Canonical project `bravo-gaming-esports-nextjs` gained Vercel Authentication Standard Protection (`prod_deployment_urls_and_all_previews`). Before/after cookie-free tests changed both exact Preview and branch alias from HTTP 200 to HTTP 302 at Vercel Authentication. The generated production alias and `/api/version` remained HTTP 200 at unchanged production SHA `c7311530a17cbb63ba5b4e3df0ef2da44acb7953`.

The beta `vercel curl` command unexpectedly created one automation bypass while attempting an authenticated read. Because that setting was outside V1, it was immediately revoked without printing its value. Final canonical metadata confirms Standard Protection active and automation bypass count zero. No deployment was created.

The original Phase 3 table below is retained as pre-V1 evidence; its canonical protection FAIL is superseded by this update. All resource-isolation, duplicate-project, domain, Supabase, R2 and acceptance blockers remain.

## Decision

Staging acceptance, feature-branch deployment safety and production readiness remain **BLOCKED**. The original Phase 3 investigation was read-only; the later owner-approved V1 update changed only canonical Standard Protection. No Git integration, DNS record, environment binding, Supabase object, account, OAuth provider, R2 object, Git index, commit, push, merge or deployment was changed.

| Area | Status | Verified result |
| --- | --- | --- |
| Canonical Vercel production deployment | PASS | `bravo-gaming-esports-nextjs.vercel.app` returns HTTP 200 and `/api/version` reports production SHA `c7311530a17cbb63ba5b4e3df0ef2da44acb7953` |
| Canonical Preview Supabase isolation | PASS | Ready Preview at feature SHA `e025f9cdf85bb4aa618b4c0c1e7242aa783b6d9d`; Vercel metadata contains staging Supabase variables, no direct PostgreSQL variables and no R2 variables |
| Canonical Preview access protection | FAIL | Project metadata has no Vercel Authentication; an unauthenticated request to the exact Preview returns HTTP 200 |
| Duplicate deployment targets | FAIL | All three projects still have automatic Git deployments enabled for the same repository |
| Custom production domains | FAIL | Every Bravo custom hostname tested is NXDOMAIN; none currently provides a live custom production surface |
| Staging SQL inspection | BLOCKED | Configured `DIRECT_URL` identifies a non-staging target and is rejected before connection; management access remains unauthorized |
| Actual migration ledger | UNKNOWN | No authoritative connection or Dashboard export was available; no claim is made about applied versions 001–028 |
| Forward-only schema repair | BLOCKED | Actual ledger, definitions, grants, policies and dependencies are prerequisites and remain unavailable |
| Backup/restore rehearsal | BLOCKED | No authoritative target access; `pg_dump`, `pg_restore` and `psql` are absent and the local Docker daemon is unavailable |
| Staging R2 isolation | FAIL | Current local credentials authenticate and can access the two known production/shared bucket names; canonical Preview has no R2 binding |
| Administrator/Discord acceptance | BLOCKED | QA admin password is absent, required profile/Discord objects are unavailable, and Discord still emits an email-shaped client ID |

## Vercel ownership and live topology

Read-only Vercel CLI/API access is authenticated as `sangam150` in team `sangams-projects-9468acfa`.

| Project | Project ID | Git automation | Protection | Assigned custom domains | Current disposition |
| --- | --- | --- | --- | --- | --- |
| `bravo-gaming-esports-nextjs` | `prj_xbUATIQPxXEj6Aamukjx8YJABjBh` | Same GitHub repository, `main`, automatic deployments enabled | None | `bravo-gaming.esports`, `bravogamingesports.com`, `www.bravogamingesports.com` | Canonical project; preserve |
| `bravo-gaming-esports` | `prj_rAjQXx7dmMY9078YI9w64vUrD7gL` | Same GitHub repository, `main`, automatic deployments enabled | Vercel Authentication, `all_except_custom_domains`; automation bypass configured | `bravoesports.com.np` redirects to `www.bravoesports.com.np`; `www.bravoesports.com.np` | Do not disconnect yet; it owns a possibly required domain pair |
| `bravo-gaming` | `prj_TT2s6lLxsSVPupO1eazJ2fGZnFn7` | Same GitHub repository, `main`, automatic deployments enabled | Vercel Authentication, `all_except_custom_domains` | None | Clean duplicate-disconnect candidate, subject to V3 approval |

All three projects have an empty deployment-hook list. Duplicate B has no custom domain. Duplicate A does have the `.com.np` domain pair, so Phase 2's unconditional V2 disconnect proposal is superseded by the conditional V2 plan below.

The configured QA website origin is also incorrect for current staging acceptance: `qa/staging-target.mjs` targets deployment `dpl_28mg9w4StJ5K4gqCUfgRPShoMRDa`, which Vercel identifies as the **production** deployment of duplicate A, not a canonical Preview. Its protection redirect does not make it a valid staging target. The current canonical feature Preview is deployment `dpl_9DvXxkctzrY7J4pmE8WLs3TgzBWQ` and reports feature SHA `e025f9cdf85bb4aa618b4c0c1e7242aa783b6d9d`.

## V1–V7 exact owner-change plan

V1 is now executed under owner approval. V2–V7 remain unexecuted and require their own approvals.

### V1 — Enable canonical Standard Protection

- **Status:** COMPLETED — owner-approved and independently verified on 17 November.
- **Project/path:** `bravo-gaming-esports-nextjs` → Settings → Deployment Protection, `/sangams-projects-9468acfa/bravo-gaming-esports-nextjs/settings/deployment-protection`.
- **Current:** `ssoProtection.deploymentType=prod_deployment_urls_and_all_previews`; no password, trusted-IP or automation-bypass secret. Exact feature Preview and branch alias return anonymous HTTP 302 to Vercel Authentication; production remains public.
- **Applied:** enabled **Vercel Authentication** with **Standard Protection** using the documented API representation.
- **Effect:** all Preview and generated deployment URLs require an authorized Vercel user. Current production domains remain public under Standard Protection.
- **Production impact:** custom/current production domains remain public. Generated deployment URLs become protected, so any server callback that incorrectly targets `VERCEL_URL` must be checked after the change.
- **Rollback:** return Vercel Authentication to `None` only if the post-change verification identifies an approved production dependency. This rollback re-exposes all affected deployment URLs.
- **Verification:** re-read project metadata; request the exact Preview and branch alias with no cookie, bypass header or authorization and require a Vercel authentication redirect/denial; use authenticated Vercel access and require HTTP 200; require the production alias to remain HTTP 200.

### V2 — Resolve duplicate A before disconnecting Git

- **Status:** BLOCKED — domain purpose/ownership decision is required; authorization is **not granted**.
- **Project/path:** `bravo-gaming-esports` → Settings → Git and Settings → Domains.
- **Current:** automatic Git deployments enabled; duplicate Preview variables include direct PostgreSQL, shared R2 and a production Supabase target; protection is enabled; no deploy hooks; project owns `bravoesports.com.np` and `www.bravoesports.com.np`; both hostnames are NXDOMAIN.
- **Proposed:** hold the Git connection now. If the owner declares the `.com.np` pair obsolete, disconnect the Connected Git Repository and retain deployments. If the pair is required, first move both assignments to the canonical project in a separately reviewed domain migration, repair and verify DNS, then disconnect Git from duplicate A.
- **Effect:** prevents future unsafe duplicate builds without orphaning a required domain.
- **Production impact:** potentially high until the `.com.np` decision is made. Disconnecting Git alone does not delete the existing deployment, but it stops future updates for that project's generated alias and attached domain pair.
- **Rollback:** reconnect `sangam150/bravo-gaming-esports-nextjs`, set production branch to `main`, and reverify deployment creation. A domain move is rolled back by restoring the recorded project assignment and DNS records captured before the move.
- **Verification:** project metadata shows no Git link only after approval; no hook remains; `.com.np` domains are either explicitly retired or attached to the canonical project and resolve to its production deployment.

### V3 — Disconnect duplicate B Git integration

- **Status:** PASS — safe change is ready; authorization is **not granted**.
- **Project/path:** `bravo-gaming` → Settings → Git, `/sangams-projects-9468acfa/bravo-gaming/settings/git`.
- **Current:** same repository, `main`, automatic deployments enabled; Standard Protection enabled; no custom domains; no deploy hooks; Preview lacks required staging bindings and fails the build guard.
- **Proposed:** disconnect the Connected Git Repository; retain the project and deployments temporarily.
- **Effect:** future pushes stop producing an incomplete third deployment.
- **Production impact:** no custom-domain impact. The existing generated alias/deployments remain, but they stop receiving automatic updates.
- **Rollback:** reconnect the same GitHub repository and `main`, then verify only if rollback is intentionally approved.
- **Verification:** API project metadata has no Git link, project/domain list remains empty, and a later approved repository push creates no duplicate B deployment.

### V4 — Preserve canonical Preview Supabase isolation

- **Status:** PASS for current binding shape; authorization is **not required for the no-change constraint**.
- **Project/path:** `bravo-gaming-esports-nextjs` → Settings → Environment Variables.
- **Current:** Preview-scoped `NEXT_PUBLIC_SUPABASE_URL`, publishable/anon key and server key are present and the deployed build guard accepted the staging target. No Preview `DATABASE_URL`, `DIRECT_URL`, `POSTGRES_*` or R2 variable exists.
- **Proposed:** preserve only project `yppefayrepkqpqtprbqa` in Preview Supabase values; do not add direct database credentials; do not use shared/team variables that resolve to production.
- **Effect:** canonical Preview cannot directly reach production PostgreSQL and continues to fail closed on a wrong Supabase target.
- **Production impact:** none; Production-scoped values are unchanged.
- **Rollback:** none for this preservation requirement. A wrong Preview change must be removed/replaced and a new Preview built before testing.
- **Verification:** read variable metadata without values, use the build-time guard on a separately approved Preview, inspect `/api/version`, then verify Auth project ownership with the staging publishable key.

### V5 — Add dedicated staging R2 resources

- **Status:** BLOCKED — buckets and a bucket-scoped token do not exist; authorization is **not granted**.
- **Project/path:** Cloudflare R2 account plus `bravo-gaming-esports-nextjs` → Settings → Environment Variables, Preview scope only.
- **Current:** canonical Preview has no R2 variables. Local credentials authenticate successfully but point to and can access `bravo-gaming-assets` and `bravo-gaming-private`, the known production/shared buckets.
- **Proposed resources:** public bucket `bravo-gaming-staging-assets`; private bucket `bravo-gaming-staging-private`; a new S3 token with **Object Read & Write** limited to exactly those two buckets; no account-administration permission and no access to the production buckets.
- **Proposed Preview variables:** `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ENDPOINT`, `R2_BUCKET_NAME=bravo-gaming-staging-assets`, `R2_PRIVATE_BUCKET_NAME=bravo-gaming-staging-private`, staging `R2_PUBLIC_BASE_URL`, and `R2_PUBLIC_DELIVERY_MODE=proxy`. Omit `NEXT_PUBLIC_R2_PUBLIC_BASE_URL` in proxy mode.
- **Effect:** Preview upload acceptance can run without a credential that can address production objects.
- **Production impact:** none when every variable is Preview-scoped and no team-shared integration is used.
- **Rollback:** remove the new Preview-scoped variables and redeploy only under separate approval. Retain buckets until test objects are inventoried; delete resources only under a later destructive-action approval.
- **Verification:** read Cloudflare token policy, list/head only the two staging buckets, prove head/list against both production bucket names is denied, inspect Vercel scopes, then perform separately approved public/private upload and access-boundary tests.

### V6 — Freeze production continuity

- **Status:** PASS — preservation constraint is active; no mutation is authorized.
- **Project/path:** canonical Git, Environment Variables and Domains pages.
- **Current:** production branch is `main`; generated canonical production alias is HTTP 200 at SHA `c7311530a17cbb63ba5b4e3df0ef2da44acb7953`; Production bindings remain present. No custom Bravo domain currently resolves.
- **Proposed:** make no canonical Production variable, branch, Git, deployment or domain-assignment change while V1–V5 are handled.
- **Effect:** preserves the working generated production deployment while Preview safety is repaired.
- **Production impact:** none by design.
- **Rollback:** not applicable because this is a freeze, not a change.
- **Verification:** snapshot production metadata before and after each approved operation; require the same production deployment/SHA and HTTP 200 unless a separately approved production release replaces it.

### V7 — Replace the invalid domain plan and repair registrable domains

- **Status:** FAIL for current DNS; authorization is **not granted**.
- **Projects/paths:** canonical Settings → Domains for the `.com` pair; duplicate A Settings → Domains for the `.com.np` pair; the authoritative registrars/DNS providers.
- **Current:** all five configured custom hosts are NXDOMAIN. Vercel marks each assignment verified in the team but DNS misconfigured. `bravo-gaming.esports` cannot be made public because `ESPORTS` is absent from IANA's current delegated TLD list; Vercel reports service type `na`. Public Verisign RDAP returns 404 for `bravogamingesports.com`, so no current `.com` registry object was verified. `.com.np` registry account ownership is UNKNOWN and must be confirmed in the official `register.com.np` account.
- **Proposed:** do not publish records for or rely on `bravo-gaming.esports`; after owner approval, retire that assignment. Register/confirm ownership of the intended registrable domain first. If `bravogamingesports.com` is chosen, register it and keep it on the canonical project. If `bravoesports.com.np` is chosen, confirm registry control and decide whether to migrate it to canonical before V2.
- **Effect:** establishes one real, registrable production hostname and removes dependence on a non-delegated suffix.
- **Production impact:** the generated Vercel production aliases remain live. DNS changes create the currently absent custom public surface; domain reassignment can cause downtime and must be separately scheduled.
- **Rollback:** capture the provider zone before editing. Restore the prior record set/project assignment if verification fails. Because the current tested hosts are NXDOMAIN, there is no working DNS record to preserve.
- **Verification:** use `vercel domains verify`, public `NS`/`A`/`CNAME` queries from multiple resolvers, TLS/HTTP checks and `/api/version`; verify registrar ownership from the actual registrar account, not from Vercel assignment alone.

Vercel CLI 65.16.0 returned these exact current record recommendations:

| Host | Current Vercel project | Exact recommended record(s) |
| --- | --- | --- |
| `bravogamingesports.com` | canonical | `A @ 216.198.79.1` and `A @ 64.29.17.1` |
| `www.bravogamingesports.com` | canonical | `CNAME www 7b3a8764753eb8bd.vercel-dns-017.com.` |
| `bravoesports.com.np` | duplicate A | `A @ 216.198.79.1` and `A @ 64.29.17.1` |
| `www.bravoesports.com.np` | duplicate A | `CNAME www 838b9da9f5806d02.vercel-dns-017.com.` |
| `bravo-gaming.esports` | canonical | Vercel emits two A recommendations, but the suffix is not delegated; do not apply them |

These values are evidence, not authorization. The Vercel verifier reports ownership only in the current Vercel scope; it does not prove registrar control. Official Vercel guidance confirms that apex names use A records and subdomains use the project-specific CNAME shown by the project verifier: [custom-domain setup](https://vercel.com/docs/domains/set-up-custom-domain). Standard Protection behavior is documented in [Deployment Protection](https://vercel.com/docs/deployment-protection). The root-zone conclusion uses the [IANA delegated TLD list](https://data.iana.org/TLD/tlds-alpha-by-domain.txt).

## Supabase inspection access and safety

The only permitted project is `yppefayrepkqpqtprbqa`.

The local management token is present, but a fresh read-only `supabase projects list` exits 1 and classifies the token as invalid; the target project is not visible. No management API operation is available through that token.

### Inspector safety — PASS

`node qa/staging-schema-readonly-inspection-check.mjs` passes. The tracked inspector:

- accepts only `db.yppefayrepkqpqtprbqa.supabase.co` or a Supabase pooler username containing that exact ref;
- verifies TLS and opens `REPEATABLE READ, READ ONLY`;
- rejects superuser, role/database creation, replication, bypass-RLS, database/schema CREATE, application-row SELECT and all application relation writes;
- requires SELECT only on `supabase_migrations.schema_migrations`;
- reads catalogs and migration history, not Auth/application/storage rows;
- hashes/redacts SQL bodies, defaults and policy expressions;
- always rolls back and writes only to ignored `qa-artifacts`.

The required command was attempted. It stopped before network connection with: `DIRECT_URL is not a recognized direct or pooler endpoint for the designated staging project.` This is a PASS for the target guard and BLOCKED for inspection access.

### Authorized access approach A — Dashboard SQL Editor

1. Owner opens Supabase Dashboard project whose URL contains `yppefayrepkqpqtprbqa`.
2. Owner opens SQL Editor and reviews `qa/staging-schema-readonly-dashboard.sql`.
3. Owner executes that file unchanged. It begins a repeatable-read read-only transaction, reads only catalog/ledger metadata and rolls back.
4. Owner exports results to ignored `qa-artifacts/final-platform-execution/`; do not commit the output.

### Authorized access approach B — staging-only PostgreSQL login

Create a temporary login with only database CONNECT, `USAGE` on `supabase_migrations`, and SELECT on `supabase_migrations.schema_migrations`. It must have no membership, superuser, create-role, create-database, replication, bypass-RLS, database/schema CREATE, application-row SELECT or application write privilege. Configure the designated direct/session-pooler URL as local ignored `DIRECT_URL` (or `DATABASE_URL`) and run:

```text
node --env-file=.env.staging.local qa-artifacts/staging-schema-readonly-inspection.mjs
```

The inspector independently rejects an over-privileged credential. No secret belongs in chat, source, a report or an artifact.

## Migration ledger and drift matrix

Local migrations 001–028 exist in strict numeric order. **No remote version is classified as applied or missing.** Supabase documents `supabase_migrations.schema_migrations` as the authoritative remote history; a REST/OpenAPI observation is not a ledger substitute: [database migrations](https://supabase.com/docs/guides/deployment/database-migrations).

| Local area | Actual ledger | Existing staging evidence | Missing/altered evidence | Compatibility impact | Required repair decision |
| --- | --- | --- | --- | --- | --- |
| 001–010 base schema/readiness/storage/PUBG | UNKNOWN | Staging Auth and base REST service respond | Exact objects, definitions, policies and grants unknown | Base application can respond but completeness is not proven | Inspect ledger/catalog before any repair |
| 011–016 Discord link/security/rate limits | UNKNOWN | Base `profiles` relation is exposed | `discord_user_id` projection fails; exact security objects unknown | Auth-to-profile and Discord linkage cannot be trusted | Compare exact columns, indexes, triggers, views and grants |
| 017 authentication hardening | UNKNOWN | Auth identity system responds | `profiles.is_active` projection fails | Admin authorization/session profile resolution blocked | Determine whether migration is absent, partial or divergent |
| 018–019 Discord role sync/mappings | UNKNOWN | Discord provider is enabled | `role_source`/Discord fields fail; `discord_role_mappings` and `discord_access_reviews` return `PGRST205` | Discord authorization and audit flow blocked | Inspect ledger plus table/RLS/RPC definitions |
| 020 relational team reconciliation | UNKNOWN | No authoritative catalog result | Reconciliation columns/tables reported absent by prior OpenAPI evidence | Team normalization/aliases/audit may be unavailable | Compare dependencies; do not assume sequential absence |
| 021 membership authorization | UNKNOWN | No authoritative catalog result | Active-membership authorization RPC reported absent | Team/admin permission enforcement may differ | Compare function body, owner, security and EXECUTE grants |
| 022 player/team history linking | UNKNOWN | No authoritative catalog result | Eligibility field and linking/review RPCs reported absent | Roster persistence/link review blocked | Compare tables, triggers, RPCs and policies |
| 023 private/public boundary | UNKNOWN | No authoritative policy/grant result | Boundary policies/grants unknown | Public/private separation cannot be accepted | Compare RLS, ACLs and dependent views |
| 024 public/auth hardening | UNKNOWN | `current_user_role` and `current_user_team_id` were previously observable | `site_settings` reported absent; exact definitions/grants unknown | Partial/non-prefix drift is possible | Compare object-by-object; never replay blindly |
| 025 event player statistics | UNKNOWN | No authoritative catalog result | `event_player_statistics` reported absent | Player/event statistics unavailable | Confirm relation/view definition and policies |
| 026 versioned scoring decisions | UNKNOWN | Local isolated PostgreSQL test passes | Remote decision columns/objects reported absent | Versioned scoring/DQ/public rulings cannot be accepted | Confirm ledger and exact remote objects first |
| 027 atomic match results | UNKNOWN | Local isolated PostgreSQL test passes | `matches.revision` and `commit_competition_match` reported absent | Transactional publication, stale-write rejection and audit integrity unavailable | Confirm ledger/function/grants/direct-write revokes |
| 028 atomic event registration | UNKNOWN | Local isolated PostgreSQL test passes | `event_teams.registration_id` and atomic registration RPCs reported absent | Capacity serialization, idempotency and roster persistence unavailable | Confirm ledger/function/grants/constraints before repair |

The evidence shows probable **non-prefix object drift**, not a proven missing migration range. No `migration repair`, historical edit or remote SQL is justified yet.

## Forward-only repair, backup and restore gate

### Repair status — BLOCKED

No compatibility SQL was created because actual ledger rows, definitions, dependencies, RLS and grants are missing. After inspection evidence arrives:

1. Hash and compare each remote ledger version/name/statements payload against local 001–028.
2. Classify each required relation, column, constraint, index, trigger, policy, ACL and routine as exact, missing, altered or remote-only.
3. Preserve all applied historical files. If history and schema disagree, do not use `migration repair` until the schema is independently proven correct.
4. Author one minimum idempotent, forward-only compatibility migration containing no destructive drop/truncate and explicit precondition checks.
5. Include data backfills only for confirmed nullable/default-safe transitions; report affected-row counts before mutation.
6. Rehearse on a restored isolated database and run independent-connection registration/scoring conflict tests.
7. Request a separate migration approval containing the exact SQL and rehearsal evidence.

### Backup/restore plan — prepared, not executable here

Before any staging mutation, confirm a current Dashboard backup/PITR point and create encrypted off-repository logical dumps for roles, schema, data and migration history. Supabase's current documented pattern is roles, schema and data as separate `supabase db dump` outputs, with migration history captured separately when it must be preserved: [automated backup commands](https://supabase.com/docs/guides/deployment/ci/backups) and [backup/restore guide](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore).

Restore only into a new disposable Supabase project or matching PostgreSQL major version, never over staging for rehearsal. Verify dump hashes, ledger/schema hashes, extensions, critical row counts, RLS/ACLs and application smoke tests. Record the restoration time and credentials rotation requirements. The current machine cannot perform this rehearsal because PostgreSQL clients are absent and Docker Desktop's daemon is not running.

## Staging R2 readiness

Read-only S3 calls using the ignored local staging environment produced:

- endpoint/account format match: PASS;
- credential authentication and bucket listing: PASS;
- public and private bucket HEAD: HTTP 200;
- buckets distinct: PASS;
- dedicated staging names: FAIL — both configured names are the known production/shared names;
- token denial against production buckets: FAIL — the token can access both.

Therefore no R2 upload acceptance is authorized. Cloudflare supports **Object Read & Write** restricted to selected buckets, which is the required scope for the proposed staging pair: [Cloudflare R2 token permissions](https://developers.cloudflare.com/r2/api/tokens/). Bucket creation, token creation and test uploads remain separate owner actions.

## Administrator and Discord prerequisites

Current `npm run qa:staging-readiness` evidence:

- Supabase Auth settings: PASS, HTTP 200; email and Discord enabled.
- Required profile projection: FAIL, PostgreSQL `42703`.
- Discord mapping/review relations: FAIL, `PGRST205`.
- Discord authorize redirect: FAIL, client ID is email-shaped rather than a numeric Discord snowflake; callback targets staging correctly.
- `QA_STAGING_ADMIN_EMAIL`: PASS.
- `QA_STAGING_ADMIN_PASSWORD`: BLOCKED, absent.
- designated team/player accounts and permitted PUBG match ID: BLOCKED, absent.

The existing confirmed Auth identity must not be elevated or reset until schema compatibility is established. After that, inspect the exact profile link, prepare a transaction that preserves the Auth ID, and request a separate provisioning/elevation approval. Updating Discord provider credentials is also a separate owner action.

## Local preservation and focused verification

The Phase 3 report makes the intended unstaged application candidate exactly **19 paths**: nine tracked modifications plus ten tracked-ready untracked files. `AGENTS.md` remains separate user-supplied repository guidance. Ignored `.env*`, `qa-artifacts`, build output and evidence remain excluded. Nothing is staged.

| Check | Status | Result |
| --- | --- | --- |
| Inspector safety regression | PASS | target lock, least privilege, read-only transaction, redaction and ignored output verified |
| Database hardening source QA | PASS | authorization/publication/migration source checks pass |
| Migration 026 isolated PostgreSQL | PASS | scoring compatibility, decimals, DQ, rulings and RLS pass; not staging acceptance |
| Migration 027 isolated PostgreSQL | PASS | atomic replacement, rollback, revision conflict, audit/direct-write boundaries pass; multi-connection staging remains |
| Migration 028 isolated PostgreSQL | PASS | submission/approval rollback, capacity, idempotency, roster/audit/direct-write boundaries pass; multi-connection staging remains |
| Preview isolation source QA | PASS | production/other targets and shared production R2 names fail closed |
| Local staging environment QA | PASS | staging target/key roles/no production fallback verified |
| Remote staging readiness | FAIL | wrong website origin, schema/Discord/admin blockers above |
| Exact application candidate inventory | PASS | 19 paths; nine modified and ten untracked; `AGENTS.md` separately preserved |
| Candidate source/JSON review | PASS | 20 working-tree files including `AGENTS.md`; syntax, imports, JSON, binaries, conflict markers and migration versions produced zero issues |
| Candidate whitespace | PASS | all 19 application candidate paths have no trailing whitespace and end with a newline; tracked `git diff --check` also passes |
| Secret scan | PASS | 574 tracked/candidate files; no credential pattern detected |

No full feature-suite rerun was needed because this phase changed only documentation and ignored read-only evidence tooling.

## Exact owner actions and separate approval gates

1. **Immediate next approval — V1 only:** explicitly authorize enabling Vercel Authentication → Standard Protection on `bravo-gaming-esports-nextjs`. This authorizes no other Vercel change.
2. Separately approve V3 if duplicate B should stop automatic Git deployments.
3. Decide whether `bravoesports.com.np` is required and prove control in the official registry account; only then can a V2 domain migration/disconnect plan be approved.
4. Choose and register/confirm one valid production domain. Do not use `bravo-gaming.esports`.
5. Provide read-only staging schema evidence using Dashboard approach A or least-privilege connection approach B.
6. Separately approve Cloudflare creation of `bravo-gaming-staging-assets`, `bravo-gaming-staging-private` and a two-bucket-only token; then separately approve Vercel Preview variable changes.
7. After V1 and a valid canonical Preview target exist, approve updating the QA origin and an automation bypass secret if unattended tests require it; do not disable protection.
8. After authoritative schema evidence, review the new drift matrix, backup evidence and exact forward-only SQL. Remote migration approval must be separate.
9. Administrator linking/elevation, Discord provider correction, R2 writes, Git commit/push, merge and production deployment each remain separate later approvals.

The immediate stopping gate is item 1. No configuration has been changed in anticipation of approval.
