# Staging infrastructure reconciliation — 15 November 2026

Phase 2 read-only verification, exact owner change paths, custom-domain health and the hardened tracked-ready inspector are documented in [the 16 November Phase 2 report](infrastructure-unblock-phase-2-2026-11-16.md). That report supersedes access/tooling statements here where they differ.

## Decision

Real staging acceptance remains **BLOCKED**. Vercel is now inspectable, but its three connected projects are inconsistent. Supabase data-plane reads work against the designated staging project, while management-plane and direct read-only SQL access remain unavailable. No project setting, environment value, database row, migration, account, OAuth provider, R2 object, Git ref or deployment was changed.

## Vercel findings

Authenticated CLI identity: `sangam150`; team: `sangams-projects-9468acfa`; CLI: 65.16.0.

All three BRAVO projects link to `sangam150/bravo-gaming-esports-nextjs`, use `main` as the production branch, have Git deployments enabled and retain Git fork protection. A push to `codex/platform-completion-20261104` can trigger all three.

| Project | Project ID | Preview Supabase | Preview R2 | Protection | Result |
| --- | --- | --- | --- | --- | --- |
| `bravo-gaming-esports` | `prj_rAjQXx7dmMY9078YI9w64vUrD7gL` | Production target is configured | Shared public/private bucket names are configured | SSO: `all_except_custom_domains`; automation bypass exists | **FAIL CLOSED**: exact-SHA build rejected the production Supabase target |
| `bravo-gaming` | `prj_TT2s6lLxsSVPupO1eazJ2fGZnFn7` | Missing | Missing | SSO: `all_except_custom_domains` | **FAIL CLOSED**: exact-SHA build rejected the missing designated staging URL |
| `bravo-gaming-esports-nextjs` | `prj_xbUATIQPxXEj6Aamukjx8YJABjBh` | Designated staging target; guarded exact-SHA build passed | Missing | None on the successful Preview | **PARTIAL PASS**: Supabase isolated and R2 cannot fall back; Preview is public and uploads are unavailable |

Sensitive environment values were not displayed. Remote-only classification was run from an empty ignored directory so repository `.env.local` values could not contaminate the result. Vercel does not expose sensitive values through `env run`; key ownership conclusions therefore combine environment metadata, source guards, authenticated build logs and live provider response. The successful project's legacy server-key guard establishes the staging project/role when the configured value is JWT-formatted; opaque secret-key ownership still requires provider-side confirmation.

### Required Vercel action

With separate owner approval:

1. Enable Deployment Protection for Preview deployments on `bravo-gaming-esports-nextjs` without disabling existing protections elsewhere.
2. Choose one canonical BRAVO Git-connected project.
3. Disconnect or disable automatic Git deployments on the two duplicates, or correct each duplicate's Preview Supabase/R2 bindings.
4. Provision dedicated staging R2 buckets and a least-privilege staging token before upload acceptance. Do not reuse `bravo-gaming-assets` or `bravo-gaming-private`.
5. Reinspect the effective branch/shared/integration bindings, then trigger a Preview only under separate push/deploy approval.

## Supabase access findings

Designated and only authorized target: `yppefayrepkqpqtprbqa`.

| Access path | Result | Meaning |
| --- | --- | --- |
| Supabase CLI login / project list | **FAIL (401)** | A fresh named CLI login reports success, but project listing still returns `Invalid access token` |
| Local `SUPABASE_ACCESS_TOKEN` project read | **FAIL (401)** | Token is invalid, expired/revoked or unauthorized; the response does not distinguish which |
| Staging PostgREST OpenAPI with configured server key | **PASS (200)** | Read-only exposed schema inventory is available |
| Staging Auth admin user list with configured server key | **PASS (200)** | Designated identity exists and is email-confirmed; it has zero linked profiles |
| `DATABASE_URL` | **REJECTED BEFORE CONNECTION** | Parsed target is production, not staging |
| `DIRECT_URL` | **REJECTED BEFORE CONNECTION** | Parsed target is production, not staging |

The current SQL inspection utility uses the existing certificate-pinned target guard with explicit staging ref, then starts `REPEATABLE READ, READ ONLY`. Its safety test passed: the current production-targeted `DIRECT_URL` was rejected before a network connection. The prepared ignored utility is `qa-artifacts/staging-schema-readonly-inspection.mjs`; on valid access it records ledger shape/rows, schemas, relations, views, domain/enum types, extensions, columns, constraints, indexes, triggers, RLS, policies, functions, table/routine grants and role memberships. Each query uses a savepoint so one unavailable catalog view does not invalidate later evidence, while console output contains only counts and SHA-256 hashes.

## Observable staging schema

PostgREST OpenAPI is not the authoritative migration ledger and cannot expose every policy or grant. It currently establishes these facts:

| Area | Observable result |
| --- | --- |
| Profiles | Missing `role_source`, `is_active` and all six expected Discord linkage/sync fields |
| Match parent | Missing `scoring_rules` and `revision` |
| Match team result | Missing `damage`, `adjustment_points`, `decision_reason`, `disqualified` |
| Event membership | `event_teams.registration_id` missing |
| Discord access | `discord_role_mappings` and `discord_access_reviews` absent |
| Transaction RPCs | `commit_competition_match`, registration intake/status RPCs and `commit_competition_event` absent |
| Migration 020 markers | Team normalization/reconciliation columns, alias fields and reconciliation/audit tables absent |
| Migration 021 marker | `current_user_has_active_team_membership` absent |
| Migration 022 markers | Player-link eligibility column and seven link/review RPCs absent |
| Migration 024 markers | `current_user_role` and `current_user_team_id` present; `site_settings` view absent |
| Migration 025 marker | `event_player_statistics` absent |

This is **partial/non-prefix drift**: two migration-024-related functions are visible while many earlier and later markers are absent. It does not establish which migrations are recorded as applied, whether function bodies match local SQL, or whether hidden objects/policies/grants exist. Therefore migrations 017–028 must not be replayed or marked applied from OpenAPI evidence.

The local ordered migration set remains 001–028. A SHA-256 manifest for all 28 files is stored in ignored evidence at `qa-artifacts/final-platform-execution/migration-sha256-2026-11-15.json`. Historical applied files must not be edited.

## Exact reconciliation procedure once access is supplied

1. Require `DIRECT_URL` or `DATABASE_URL` to identify `yppefayrepkqpqtprbqa`; the target guard must pass before connection.
2. Run the prepared inspection in a repeatable-read, read-only transaction.
3. Export the authoritative `supabase_migrations.schema_migrations` rows and ledger shape.
4. Compare each recorded version/name/statement hash with the local 001–028 manifest; classify every migration as exact, divergent, absent or unexpectedly remote-only.
5. Compare tables, columns/defaults, constraints, indexes, triggers, function signatures/bodies/owners/security flags, views, RLS flags/policies and table/routine grants.
6. Identify dependencies of every proposed forward change. Unknown view/function dependencies are an abort condition; do not use `CASCADE` to hide drift.
7. Generate one forward-only compatibility migration for observed drift. Do not rewrite or replay an applied historical file.
8. Review the compatibility SQL, backup/restore evidence and application write pause separately before requesting migration approval.

## Backup and restore plan

No backup was taken because staging SQL access is unavailable. No restore was attempted. Local `pg_dump`, `pg_restore` and `psql` are absent; Docker client 29.7.2 exists but its daemon is not running.

Before any approved migration:

1. Confirm the staging project ref, database host/user and PostgreSQL major version through the guarded read-only connection.
2. Capture the ledger and schema inspection artifact; record SHA-256 for every evidence file.
3. With separately authorized backup access, export roles, schema and data using Supabase CLI or matching-version PostgreSQL tools. Store outputs only in the ignored evidence directory with restrictive local permissions.
4. Restore into a fresh disposable isolated Supabase branch/database of the same PostgreSQL major version—never over staging or production.
5. Rerun the read-only inspection against the restored target and compare ledger, schema hashes, policies/grants, table counts and critical Auth/profile/event/match relations.
6. Run the proposed forward-only reconciliation against the disposable restore, then rerun migration 026–028 fixtures and staging smoke checks.
7. Record restore duration, errors, hashes and verification results. A dump without a successful isolated restore is not an accepted backup.
8. Request separate approval for the exact remote migration plan only after the restore rehearsal passes.

## Exact remaining access

For the current read-only schema task, configure locally without sharing values:

- `DIRECT_URL` (preferred) or `DATABASE_URL`: a staging-only, TLS-capable PostgreSQL connection for `yppefayrepkqpqtprbqa`, using a role that can read the migration ledger and catalog metadata but cannot write application data or DDL.
- `SUPABASE_ACCESS_TOKEN`: replace the current 401 token with valid owner-authorized management access if CLI/project metadata inspection is also required. The SQL connection remains necessary for authoritative ledger/policy/grant reconciliation.

Later acceptance—not this read-only task—still requires `QA_STAGING_ADMIN_PASSWORD`, dedicated staging R2 bindings, designated team/player identities and a permitted PUBG match ID where those workflows are exercised.

## Next action

The single next unblock action is to replace the production-targeted local `DIRECT_URL` with an authorized **read-only staging** connection for project `yppefayrepkqpqtprbqa`. Then run:

```text
node --env-file=.env.staging.local qa-artifacts/staging-schema-readonly-inspection.mjs
```

Do not apply migrations, provision/elevate an administrator, edit OAuth, push, merge or deploy as part of that inspection.
