# Platform audit — 4 November 2026

Branch: `codex/platform-completion-20261104`. The checkout started with extensive staged and unstaged work. Those changes are retained; this report does not attribute them to this implementation.

## Existing architecture

- Next.js 16 App Router on Vercel, with server routes and a Supabase session-refresh proxy.
- Supabase relational events, matches, teams, players, registrations, point systems and audit logs. `app_documents` remains the compatibility/CMS store. Reuse both through their existing access layers.
- R2 public/private uploads, presigned uploads, canonical logo/avatar replacement, validation and private-download authorization already exist. No storage migration is required.
- Admin managers already cover tournaments, seasons, scrim days, registrations, teams, players, match review/correction/publication, imports, content, sponsors, settings and audit history.
- PUBG API import previews, duplicate handling, raw cache, watcher candidates, relational scoring and publication already exist.
- Public events, results, profiles, rankings, news, sponsors, streams, videos and contact routes already exist.

## Findings and verification limits

1. No `/overlay/*` routes or broadcast operator interface existed. This is the largest missing requested workflow.
2. Scoring uses relational `point_systems`, but there is no dedicated configuration API/UI. Preserve existing per-match scoring selection and add versioned rules rather than silently changing historical scores.
3. Baseline TypeScript fails on the fantasy page's missing dataset, nullable map damage, stale imports and unused public-page helpers.
4. Baseline tests pass ranking, publication, offline auth and PUBG API security, then fail the database hardening source assertion: reconciliation uses explicit verified TLS with a supplied CA rather than a URL `sslmode` parameter. Verify the effective TLS configuration rather than weakening it.
5. Match API normalization publishes by default when status is omitted. Creation should default to draft so review is explicit.
6. Scrim admin CRUD lacks strict field validation and action audit records. Public scrims already use an allowlist that removes room credentials.
7. Published statistics must come from explicitly public events and matches. A broadcast feed must construct its own allowlisted projection and never return raw documents, credentials, imports or private lobby information.
8. Raw document JSON is private under migration 023; do not expose the document table to anonymous Realtime subscribers for overlays. Use bounded polling with caching, conditional responses and failure backoff.
9. Existing broad public/CMS code and relational/document compatibility remain in place. Presence of a route is not proof that its production workflow works.
10. Browser checks found unnamed public search/filter controls and tables without names/header scopes. Corrected shared PUBG table/filter semantics without changing their data.
11. Document readiness cached a rejected promise indefinitely. Added bounded retry caching, an eight-second probe timeout, and a tested recovery path. Admin connection indicators now use the readiness result rather than environment-variable presence.

## Implementation order

1. Restore baseline compilation and check integrity. Preserve working infrastructure and data.
2. Add authenticated broadcast state using the existing document store, concurrency protection and audit logging.
3. Add public-data-only broadcast snapshots, transparent 1920×1080 graphics, dedicated URLs, show/hide/reveal controls and preview.
4. Add versioned scoring configuration and safer draft defaults; validate scrim CRUD and audit its changes.
5. Exercise scoring/publication/privacy/control workflows with offline tests, then lint, typecheck, existing tests and production build.
6. Document operating steps and deployment gates. Do not deploy or mutate production records as part of local QA.

## Required production acceptance

Run authenticated browser workflows with a designated staging admin/team/player, staging Supabase and staging R2 buckets. Verify login/logout, registration approval, uploads/private access, PUBG imports using a real permitted match ID, and OBS rendering. Local static checks cannot establish external credentials, live schema readiness or OBS capture behavior.

# Latest stabilization

The subsequent authentication fixes, admin-data corrections and actual staging blockers are recorded in [platform-stabilization.md](platform-stabilization.md). Earlier audit findings remain subject to real staging acceptance.
