# Bravo Gaming Esports — final owner actions

## 21 November 2026 login update

The existing staging Auth identity is now linked to one audited active `admin` legacy profile. No password was changed. To complete real login acceptance, configure the existing password as `QA_STAGING_ADMIN_PASSWORD` in ignored `.env.staging.local`, or perform a witnessed manual login after the compatibility commit is deployed. Profile creation/elevation is no longer an outstanding action.

## 18 November 2026 remaining owner inputs and approvals

Earlier broad authorization enabled the safe infrastructure actions already recorded, but it does not substitute for credentials or authorize unreviewed database/account/provider/production mutations. The following remain separate gates:

1. Configure a staging-only `DIRECT_URL` or `DATABASE_URL` for project `yppefayrepkqpqtprbqa`, or provide a redacted Dashboard read-only export. Current URLs are rejected as non-staging and `SUPABASE_ACCESS_TOKEN` is invalid.
2. Create a new R2 Object Read & Write credential limited to exactly `bravo-gaming-staging-assets` and `bravo-gaming-staging-private`; prove it cannot address `bravo-gaming-assets` or `bravo-gaming-private`. No Cloudflare management token is currently configured.
3. Configure `QA_STAGING_ADMIN_PASSWORD` for the existing designated account, or perform witnessed manual acceptance. Do not reset or recreate the Auth identity.
4. Configure the matching private Discord Client Secret and separately approve replacement of the email-shaped Client ID with the verified numeric Application ID. The redirect callback must remain on staging during acceptance.
5. Supply a permitted `QA_STAGING_PUBG_MATCH_ID` and, for role-isolation checks, `QA_STAGING_TEAM_EMAIL`, `QA_STAGING_TEAM_PASSWORD`, `QA_STAGING_PLAYER_EMAIL` and `QA_STAGING_PLAYER_PASSWORD`.
6. Select and prove control of a registrable production domain before any DNS/TLS change.
7. After all staging rows pass, approve draft PR, main merge, production backup/migrations and production deployment as independent operations.

No secret value belongs in chat, documentation, logs or Git. The current decision remains **NO-GO**.

This is the actionable approval register. Approval of one row does not authorize another. No item below was executed during the 17 November 2026 evidence refresh.

## Ready infrastructure approvals

| Gate | Exact system/path | Current state | Proposed operation | Expected effect | Rollback | Verification |
| --- | --- | --- | --- | --- | --- | --- |
| V1 — COMPLETED | Vercel `bravo-gaming-esports-nextjs` → Settings → Deployment Protection | Standard Protection active as `prod_deployment_urls_and_all_previews`; one intentional automation bypass supports QA | Keep protection; rotate/revoke bypass when QA ends | Exact Preview and branch alias redirect anonymous requests to Vercel Authentication; protected automation works; production remains public | Revoke the bypass independently; do not disable protection | Verified anonymous HTTP 302, bypassed HTTP 200 and production HTTP 200 |
| V3 — COMPLETED | Vercel `bravo-gaming` → Settings → Git | Git disconnected; no domains/hooks | No further change | Duplicate B cannot deploy repository pushes | Reconnect same repository/branch if needed | Metadata has no Git link |
| V2 — COMPLETED | Vercel `bravo-gaming-esports` → Settings → Domains and Git | Git disconnected; `.com.np` assignments and deployments retained | Domain ownership/migration remains a later DNS decision | Duplicate A cannot deploy repository pushes without deleting history/domains | Reconnect same repository/branch if needed | Metadata has no Git link; domain inventory unchanged |
| V5a — PARTIAL | Cloudflare R2 | Dedicated staging bucket pair exists and functional writes pass; current credential also reaches production buckets | Create a new Object Read & Write token limited to exactly the staging pair | Completes credential isolation | Revoke the new token; retain buckets until inventory review | New token reaches staging pair and is denied on production pair |
| V5b | Canonical Vercel project → Preview environment variables | No Preview R2 binding | Add the exact staging R2 account/endpoint/token/bucket variables, Preview scope only; proxy delivery | Enables isolated Preview upload tests | Remove Preview-only values; do not touch Production | Effective Preview binding resolves only staging pair; source guard passes |
| V7 | Registrar/DNS plus Vercel Domains | All custom hosts NXDOMAIN; `.esports` is non-delegated | Choose/confirm one registrable domain, record current zone, apply only current Vercel records, verify TLS; retire invalid assignment separately | Establishes a valid custom production hostname | Restore captured zone/project assignment | Authoritative DNS, Vercel verify, TLS and `/api/version` pass |

V6 is a preservation constraint, not a mutation: keep canonical project Git, `main`, Production variables, production deployment and domain assignments unchanged during V1–V5.

## Owner-supplied access, no values in chat

| Need | Configure locally | Why | Minimum acceptable scope |
| --- | --- | --- | --- |
| Staging schema read | Valid staging-only `DIRECT_URL`/`DATABASE_URL`, or Dashboard SQL Editor export | Current URLs target production and management token returns 401 | CONNECT, ledger SELECT and catalog visibility only; inspector rejects application-row access and elevated privileges |
| Admin acceptance | `QA_STAGING_ADMIN_EMAIL` and `QA_STAGING_ADMIN_PASSWORD` | Password is absent | Existing designated confirmed Auth identity; no automatic reset |
| Protected Preview automation | `VERCEL_AUTOMATION_BYPASS_SECRET` only after V1 and an approved bypass exists | Automated staging HTTP checks must not disable protection | Preview/test scope only |
| PUBG acceptance | Authorized API key and permitted match ID | No real import can be claimed | Read access to the permitted match only |
| Team/player acceptance | Designated staging test accounts | Role isolation cannot be proved with only admin | Staging-only identities, no production data |

## Later separate approvals

1. Run the target-locked read-only Supabase inspector or Dashboard SQL after the owner supplies access.
2. Author the minimum compatibility migration only after authoritative ledger/catalog evidence.
3. Approve staging backup, isolated restore rehearsal and the exact staging SQL/checksum.
4. Administrator profile linking/elevation is complete; preserve the Auth identity and audited profile during later schema reconciliation.
5. Approve staging Discord provider correction using the verified numeric application ID and matching secret.
6. Approve designated staging test records and R2 object writes/cleanup.
7. Approve a local Git commit after final manifest, secret and whitespace review.
8. Approve feature-branch push only after canonical Preview protection and resource isolation are verified.
9. Approve draft PR, main merge, production migrations and production deployment separately.

## Minimum Supabase Dashboard alternative

If no SQL URL will be provided:

1. Open Supabase project `yppefayrepkqpqtprbqa`.
2. Review and execute `qa/staging-schema-readonly-dashboard.sql` unchanged in SQL Editor.
3. Save results only below ignored `qa-artifacts/final-platform-execution/`.
4. Do not execute migrations, `migration repair`, `db push`, account changes or provider changes.

Acceptance is a redacted export containing ledger/catalog/policy/grant/function evidence sufficient to build an object-level drift matrix.

## Immediate approval request

All action gates are authorized. The next executable prerequisites are credentials rather than approval: valid staging Supabase ledger access, a Cloudflare management token for a bucket-restricted R2 credential, and the Discord OAuth Client Secret. Execution must remain blocked where these values or real acceptance evidence are absent.
