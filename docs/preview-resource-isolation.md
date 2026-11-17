# Vercel Preview resource policy

## V1 protection result — 17 November 2026

Owner-approved V1 is **PASS**. Canonical project `bravo-gaming-esports-nextjs` reports `ssoProtection.deploymentType=prod_deployment_urls_and_all_previews`. Cookie-free exact Preview and branch-alias requests return HTTP 302 to Vercel Authentication; the production alias and `/api/version` remain HTTP 200 at SHA `c7311530a17cbb63ba5b4e3df0ef2da44acb7953`. No redeployment occurred. Duplicate A and B metadata remains unchanged.

An authenticated beta `vercel curl` read unexpectedly created one automation bypass. It was immediately revoked because V1 did not authorize it; final bypass count is zero and no value was printed. Protected automated staging acceptance remains blocked until a bypass or authenticated browser workflow is separately approved. Supabase effective-key and R2 isolation conclusions are unchanged.

The [16 November Phase 2 infrastructure report](infrastructure-unblock-phase-2-2026-11-16.md) records the verified production-domain owner, current DNS failure, exact dashboard change paths, unauthenticated protection result and post-change verification plan. It supersedes older access/protection conclusions here where they differ.

## Authorized read-only recheck — 15 November 2026

| Vercel project/context | Deployment | Result | Isolation decision |
| --- | --- | --- | --- |
| `bravo-gaming-esports-nextjs` | `dpl_9DvXxkctzrY7J4pmE8WLs3TgzBWQ` | Build success; staging Supabase guard passed; no Preview R2 variables; V1 Standard Protection active | **SUPABASE ISOLATED; R2 UNAVAILABLE; PROTECTION PASS** |
| `bravo-gaming-esports` | `dpl_A4CxnzXi79s8GEw3NSx87LpKugkH` | Build rejected production Supabase target; shared R2 names are configured | **FAIL CLOSED / UNSAFE CONFIGURATION** |
| `bravo-gaming` | `dpl_AyHfXqBVpinjQm6ZJJyvs5FP5B2K` | Build rejected missing designated staging Supabase URL; no Preview R2 variables | **FAIL CLOSED / INCOMPLETE CONFIGURATION** |

Vercel CLI 65.16.0 is authenticated as `sangam150` in team `sangams-projects-9468acfa`. The team has six projects; the three BRAVO projects above all link to GitHub repository `sangam150/bravo-gaming-esports-nextjs`, use production branch `main`, have Git deployments enabled and retain Git fork protection. A feature-branch push can therefore trigger all three projects.

Authenticated deployment logs establish the two failed projects' exact fail-closed causes. Effective Preview metadata and a remote-only, empty-workdir environment classification establish that `bravo-gaming-esports` points to production Supabase and the shared `bravo-gaming-assets` / `bravo-gaming-private` R2 buckets. Sensitive database and key values remained unreadable and were not printed. The `bravo-gaming` project has no Preview Supabase or R2 bindings, so its source guard rejects the build.

For `bravo-gaming-esports-nextjs`, the successful guarded build plus the live provider response establishes the designated staging public URL/key path. Its Preview metadata includes staging Supabase public and server key names and no R2 variables. R2 therefore cannot fall back to production through this project, but upload acceptance is unavailable. This project's Preview is now protected by owner-approved V1 Standard Protection. The other two projects retain `all_except_custom_domains` SSO protection. No automation bypass remains configured on the canonical project.

**Feature-branch push remains BLOCKED.** V1 protection is complete, but the owner must separately disconnect/disable automatic Git deployments for the two duplicate BRAVO projects or replace their Preview bindings with the designated staging Supabase and dedicated staging R2 resources. Apart from the separately documented V1 setting, no environment variable, Git link or deployment was changed.

GitHub's Supabase Preview check was skipped because the branch has no associated Supabase Branch. The check links to production project `hldppfhtkfgthainismr`; this is a configuration risk to inspect, but the skipped check made no database branch change.

The effective settings and Git triggers are now inspected. Every automatic project must still be made staging-isolated or deliberately disconnected/ignored through a separately approved infrastructure change before another push.

`VERCEL_ENV=preview` is checked in `next.config.js` before Next compiles public environment variables or fetches build data. Existing Supabase and R2 readers repeat the checks at runtime. Non-Preview configuration behavior is unchanged.

Preview Supabase must use exactly `https://yppefayrepkqpqtprbqa.supabase.co`. Public and server keys must have their appropriate types. Every configured legacy alternative must identify the staging project and its expected role, even if a modern key takes precedence. Malformed or expired legacy keys are rejected. An opaque publishable/secret key's project cannot be established from its prefix; real staging key verification remains required. Policy rejection inside the auth configuration readers is a backend configuration error and remains a safe 503.

Configured Preview R2 requires distinct, dedicated staging buckets. The known existing names `bravo-gaming-assets` and `bravo-gaming-private` are rejected in either bucket slot, including when an operator proposes a different account with the same names. Create and verify separate staging buckets through the owner-controlled infrastructure process; no bucket was created by this policy. Example names are `bravo-gaming-staging-assets` and `bravo-gaming-staging-private`, not proof that such resources exist.

The configured Preview endpoint must be the standard HTTPS R2 endpoint for its `R2_ACCOUNT_ID`; custom hosts, HTTP, credentials and alternate account hosts are rejected. A deployment requiring another documented jurisdiction endpoint needs a separately reviewed policy extension. Completely unconfigured R2 can remain unavailable; it never falls back to production.

This is a conservative accidental-binding guard, not independent infrastructure acceptance. Dedicated names alone do not prove bucket ownership or credential scope. In particular, the same staging account/key values could still be copied from production. Before any feature push, inspect the exact release branch's effective Vercel Preview variables, shared/integration overrides, Supabase key ownership, and R2 account/bucket/token scopes. Keep upload/destructive acceptance blocked until those bindings are verified. Deployment protection remains enabled.

Regression command: `node qa/preview-isolation-check.mjs`. It uses dummy metadata and the actual Next config/runtime readers without reading local environment files, contacting services, applying migrations or deploying.
