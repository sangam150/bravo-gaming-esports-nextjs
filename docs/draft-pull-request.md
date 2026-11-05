# Proposed title

Add tournament operations, versioned scoring and dynamic broadcast workflows

# Proposed draft body

This branch consolidates tournament administration and published results into the existing Next.js, Supabase and R2 platform, with 37 broadcast graphics and a permanent `/overlay/program` source. It retains eight primary admin workspaces and adds approved event metadata, structured schedules, manual result forms, immutable scoring versions and presentation templates/private previews.

Authentication fixes make server cookies authoritative, forward refresh cookies into the same render, prevent stale SDK identity races, invalidate other tabs on logout and rebuild protected layouts after sign-in. Password recovery fails gracefully when configuration is unavailable. No roles are automatically granted.

Match saves use a service-only transactional RPC with editor revisions, parent/child replacement, explicit publication, event counts and required atomic audit history. Protected adjustments/DQ require platform-admin authorization. Corrections return to draft. Import maintenance reset uses the same transaction. Legacy SQL MVP order is retained; new versions use saved criteria.

Migration requirements: review the exact target ledger and backups, then the ordered chain through 027. Migration 022 matches committed history; its activation safety correction already exists in forward migration 024. Migration 026 changes decimal scoring columns and recreates known dependent views without CASCADE. Migration 027 adds revisions and the transactional RPC. **No migration was applied during preparation. Do not deploy the new source before its schema is available.**

Security review also updates Next.js/Sharp and audited tooling dependencies, pins the SQL/browser QA tools and rejects credential-bearing/signed URLs at the public image boundary. See the final [release audit](release-audit.md) for exact versions, tests, evidence, remaining warnings and limitations.

Local fixture/browser/SQL checks are separate from real acceptance. Staging credentials remain empty, preview access redirects to Vercel SSO, real R2 isolation is unconfirmed and actual OBS Studio capture has not run. Granular operator capabilities and remaining master-brief fields are not certified complete. Do not mark this PR ready for production.

PR #1 contains a competing six-file overlay/control implementation. This branch does not merge it; review overlap explicitly before choosing a single broadcast implementation.

**Draft only. No production merge, deployment or migration approval is implied.** Create this PR only after an explicitly approved feature push and confirmation that preview automation cannot use production resources.
