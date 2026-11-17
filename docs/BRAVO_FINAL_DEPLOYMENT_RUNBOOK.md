# Bravo Gaming Esports — final deployment runbook

This runbook is preparation only. It does not authorize a migration, commit, push, merge or deployment.

## 1. Freeze and preflight

1. Record the approved release SHA, feature SHA, main SHA, canonical Vercel project ID and current production deployment ID.
2. Require `BRAVO_FINAL_STAGING_ACCEPTANCE.md` to contain direct PASS evidence for every launch-critical row.
3. Confirm only the canonical project creates repository deployments; confirm Preview protection and staging Supabase/R2 isolation.
4. Confirm production alias and chosen custom domain resolve publicly with valid TLS.
5. Re-run typecheck, lint, default QA, secrets, browser suites, production build and dependency audit on the exact candidate.
6. Review `git status`, manifest, `git diff --check`, generated/binary inventory and secret scan. Keep `AGENTS.md`, `.env*`, `.vercel`, `qa-artifacts`, `.next`, test output and dumps out of the commit unless intentionally reviewed.
7. Obtain separate approvals for commit, push, PR, merge, production SQL and production deployment.

Abort if the SHA changes after evidence is collected.

## 2. Database preparation

1. Inspect the production migration ledger and catalog read-only; do not infer it from staging.
2. Compare the exact approved SQL and checksums with rehearsed staging artifacts.
3. Confirm current Dashboard backup/PITR and create encrypted off-repository roles, schema, data and ledger backups.
4. Record PostgreSQL major version, extensions, roles, policies, grants, function ownership/security, critical row counts and backup hashes.
5. Restore into a disposable isolated target and verify the restoration before touching production.
6. Rehearse the exact forward-only SQL, application compatibility, transaction rollback, RLS/direct-write denial, scoring revisions and registration concurrency.
7. Define maintenance/write-pause requirements and expected locks. Never restore over live staging or production to test a backup.

Abort if backup verification, isolated restore or any compatibility test fails.

## 3. Git and Vercel release

1. Commit only the reviewed manifest after explicit local-commit approval.
2. Push only the feature branch after explicit push approval and verified Preview safety.
3. Confirm remote SHA and GitHub Actions success for that exact SHA.
4. Open/update a draft release PR only after separate approval; do not merge PR #1's older OBS architecture automatically.
5. Review the PR diff against main, require approvals, then obtain explicit main-merge authorization.
6. Confirm the resulting main SHA before any production action.

## 4. Production migration window

1. Announce/freeze writes if the reviewed plan requires it.
2. Reconfirm current production deployment and database ledger immediately before mutation.
3. Apply only the approved SQL files in the approved order using the designated production target.
4. Save redacted execution results and re-read ledger, schema, policies, grants and functions.
5. Run database integrity checks before application deployment.

Abort on target mismatch, checksum mismatch, unexpected affected-row count, lock timeout, missing dependency or failed invariant. Do not improvise `migration repair` or edit historical migrations.

## 5. Application deployment

1. Deploy the approved main SHA through canonical project `bravo-gaming-esports-nextjs` only.
2. Keep Deployment Protection and Preview isolation unchanged.
3. Record Vercel deployment ID, URL, SHA, environment and effective resource targets without values.
4. Verify generated production alias first, then the chosen custom domain and redirects.
5. Do not promote a duplicate-project deployment.

## 6. Production smoke checks

Use non-destructive records and existing approved public data:

- `/api/version` matches the approved SHA.
- Public homepage, tournament, schedule, result, leaderboard and media routes return expected status/content.
- Administrator login, refresh, dashboard/API authorization and logout succeed with an approved account.
- Anonymous and non-admin access is denied appropriately.
- Existing published results and leaderboards remain consistent.
- Public images load; private media requires authorization.
- Broadcast `/overlay/program` returns a safe published snapshot and does not expose draft/private data.
- Logs show no new authentication, database, storage, migration or rendering errors.

Do not create destructive production registrations, overwrite results or upload disposable objects as a smoke test.

## 7. Rollback

Application rollback and database recovery are separate decisions.

### Application

1. Stop further rollout.
2. Record the failing deployment/log evidence.
3. Reassign production only to the previously recorded known-good Vercel deployment after approval.
4. Re-run version/public/auth smoke checks.

### Database

1. Do not assume the old application reverses schema changes.
2. Prefer the reviewed forward fix when data and compatibility are intact.
3. Use restore/PITR only under the rehearsed incident plan and owner authorization; preserve the failed database for analysis.
4. Reconcile R2 separately because database backups do not contain R2 objects.

### Infrastructure

- Vercel protection: restore the recorded prior project setting.
- Git disconnect: reconnect the recorded repository/branch only if rollback is approved.
- DNS: restore the captured provider zone and project assignment.
- R2: revoke staging/production token involved; do not delete buckets until objects are inventoried.

## 8. Closeout

Record release SHA, GitHub run, migration versions/checksums, backup hashes, Vercel deployment ID, domain/TLS result, smoke-test evidence, incident notes and approver identities. Update the handoff, project status JSON, launch checklist and release audit. Production is GO only after the owner explicitly records separate migration and deployment approvals.
