# Vercel Preview resource policy

`VERCEL_ENV=preview` is checked in `next.config.js` before Next compiles public environment variables or fetches build data. Existing Supabase and R2 readers repeat the checks at runtime. Non-Preview configuration behavior is unchanged.

Preview Supabase must use exactly `https://yppefayrepkqpqtprbqa.supabase.co`. Public and server keys must have their appropriate types. Every configured legacy alternative must identify the staging project and its expected role, even if a modern key takes precedence. Malformed or expired legacy keys are rejected. An opaque publishable/secret key's project cannot be established from its prefix; real staging key verification remains required. Policy rejection inside the auth configuration readers is a backend configuration error and remains a safe 503.

Configured Preview R2 requires distinct, dedicated staging buckets. The known existing names `bravo-gaming-assets` and `bravo-gaming-private` are rejected in either bucket slot, including when an operator proposes a different account with the same names. Create and verify separate staging buckets through the owner-controlled infrastructure process; no bucket was created by this policy. Example names are `bravo-gaming-staging-assets` and `bravo-gaming-staging-private`, not proof that such resources exist.

The configured Preview endpoint must be the standard HTTPS R2 endpoint for its `R2_ACCOUNT_ID`; custom hosts, HTTP, credentials and alternate account hosts are rejected. A deployment requiring another documented jurisdiction endpoint needs a separately reviewed policy extension. Completely unconfigured R2 can remain unavailable; it never falls back to production.

This is a conservative accidental-binding guard, not independent infrastructure acceptance. Dedicated names alone do not prove bucket ownership or credential scope. In particular, the same staging account/key values could still be copied from production. Before any feature push, inspect the exact release branch's effective Vercel Preview variables, shared/integration overrides, Supabase key ownership, and R2 account/bucket/token scopes. Keep upload/destructive acceptance blocked until those bindings are verified. Deployment protection remains enabled.

Regression command: `node qa/preview-isolation-check.mjs`. It uses dummy metadata and the actual Next config/runtime readers without reading local environment files, contacting services, applying migrations or deploying.
