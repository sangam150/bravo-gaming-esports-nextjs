# Bravo Gaming Esports — final staging acceptance

Target Supabase project: `yppefayrepkqpqtprbqa`
Canonical Vercel project: `bravo-gaming-esports-nextjs`
Status date: 17 November 2026

Statuses describe actual evidence: **PASS**, **FAIL**, **BLOCKED**, **NOT RUN**. Local fixture success is never reported as real staging success.

## Infrastructure and access

| Workflow | Status | Actual result/evidence | Remaining acceptance action |
| --- | --- | --- | --- |
| Production generated alias | PASS | HTTP 200 at verified main SHA `c731153…` | Preserve throughout changes |
| Canonical feature Preview deployment | PASS | Ready deployment `dpl_9Dv…` at feature SHA `e025f9…` | Use as the protected target after V1 |
| Preview protection | PASS | V1 active; anonymous exact Preview and branch alias return HTTP 302 to Vercel Authentication; production alias remains HTTP 200 | Preserve protection during all later testing |
| Preview Supabase target | PASS WITH LIMITATION | Vercel metadata identifies staging project and no direct PostgreSQL variables | Prove effective public/server key ownership on a protected redeployment |
| Preview R2 isolation | FAIL | Dedicated staging pair exists and real writes pass, but available credential also reaches the production pair; it is not bound to Preview | Create a new token scoped only to the staging pair and prove production denial |
| Duplicate Git deployment targets | PASS | Both duplicate projects have no Git link; their projects/history and duplicate A domains remain | Preserve canonical as the sole Git-connected project |
| Custom domain | FAIL | All configured custom hosts NXDOMAIN | Choose a registrable domain and verify DNS/TLS |
| Staging management access | FAIL | Token returns 401 | Replace locally or use SQL Editor alternative |
| Read-only schema inspection | BLOCKED | Production-targeted URLs rejected before connection | Supply staging-only least-privilege URL/export |
| Migration ledger 001–028 | BLOCKED | No authoritative read | Inspect ledger and definitions |
| Backup/restore rehearsal | BLOCKED | No target access/tools | Back up and restore into disposable database |

## Authentication

| Workflow | Status | Actual result/evidence | Acceptance criterion |
| --- | --- | --- | --- |
| Email provider availability | PASS | Staging Auth settings HTTP 200; email enabled | Retest after schema repair |
| Designated Auth identity | PASS WITH LIMITATION | Existing email-confirmed identity reported | Verify exact UUID in authorized view |
| Compatible linked admin profile | FAIL | Required projection returns PostgreSQL `42703`; link unavailable | Schema compatible; approved UUID linkage/role/audit row |
| Real admin login | BLOCKED | `QA_STAGING_ADMIN_PASSWORD` absent | HTTP login succeeds with safe cookies and correct profile |
| Session refresh/persistence | BLOCKED | Requires real login | Session survives refresh and expiry behavior is correct |
| Admin dashboard/API authorization | BLOCKED | Requires compatible profile/session | Admin allowed; viewer/team/player/anonymous denied |
| Logout | BLOCKED | Requires real login | Cookies cleared and protected access denied |
| Discord provider configuration | FAIL | OAuth redirect client ID is email-shaped; callback is staging | Numeric owned app ID and secret configured privately |
| Full Discord OAuth/role mapping | BLOCKED | Provider/schema/account prerequisites | Callback, membership, mapping, denial and logout pass |

## Esports operations

| Workflow | Status | Actual result/evidence | Acceptance criterion |
| --- | --- | --- | --- |
| Tournament CRUD | BLOCKED | Local workflow QA passes; no authenticated staging mutation | Create/edit/stages/schedule/teams/points/publish/archive with readback |
| Scrim CRUD | BLOCKED | Local scrim QA passes; no authenticated staging mutation | Create/edit/window/capacity/close/archive with Nepal time readback |
| Team/player management | BLOCKED | Local role/link/logo tests pass | Designated staging records persist; unauthorized roles denied |
| Registration intake | BLOCKED | Migration 028 isolated test passes | Staging submission persists atomically |
| Approval/capacity/slots | BLOCKED | Isolated concurrency/rollback/idempotency pass | Independent staging connections prove serialization and unique slots |
| Roster persistence | BLOCKED | Isolated migration passes | Approved roster/event membership persist atomically |
| Match creation/scoring | BLOCKED | Migrations 026–027 isolated tests pass | Staging placement/kills/adjustments/DQ save with expected totals |
| Publication/revision conflicts | BLOCKED | Stale/concurrent rejection, rollback and audit pass locally | Real staging publish/correct/restore proves same behavior |
| Public leaderboards/MVP | BLOCKED | Public fixture consistency passes | Published staging data appears; draft/private data does not |
| PUBG import | BLOCKED | Parser/security pipeline fixtures pass | Authorized match import/reimport/repair passes |

## R2 acceptance

| Test | Status | Required evidence |
| --- | --- | --- |
| Dedicated bucket ownership/token scope | FAIL | Staging pair exists and is writable, but current token still reaches production pair |
| Public upload/delivery/cache | PARTIAL PASS | Direct authenticated staging upload/read and cleanup passed; application proxy/cache awaits scoped Preview binding |
| MIME and size rejection | BLOCKED | Invalid/oversize requests rejected without object creation |
| Private upload/download | PARTIAL PASS | Direct authenticated staging upload/read and cleanup passed; application authorization awaits scoped Preview binding |
| Cross-team denial | BLOCKED | A different role/team cannot fetch the object |
| Replacement/cleanup | BLOCKED | Replacement correct; inventoried test objects deleted under approval |

## Broadcast and OBS

| Workflow | Status | Actual result/evidence | Acceptance criterion |
| --- | --- | --- | --- |
| Registered 38-mode inventory | PASS, FIXTURES ONLY | Browser suite iterated the source registry and passed 11/11 overall | Repeat against real published staging snapshot |
| `/overlay/program` | PASS, FIXTURES ONLY | Show/hide/reveal/outage/reconnect passed locally | Protected source works with operator access and real data |
| Broadcast control room | PASS, FIXTURES ONLY | Workspace/control/privacy checks pass | Real admin selects published match/team and changes PGM |
| R2 logos | BLOCKED | Staging buckets pass direct functional checks, but isolated Preview credential/binding is absent | Real approved staging logos render; private data remains hidden |
| Actual OBS Studio 1920×1080 | NOT RUN | Browser fixtures are not OBS acceptance | Operator verifies transparency, dimensions, updates, refresh, outage/reconnect |

## Completion rule

Staging acceptance passes only when every FAIL is corrected and all release-critical BLOCKED rows have direct live evidence. No fixture result may be promoted to live PASS. Test records must be staging-only, identified for cleanup, and never copied from production for destructive testing.
