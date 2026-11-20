# Bravo Gaming Esports — final staging acceptance

Target Supabase project: `yppefayrepkqpqtprbqa`
Canonical Vercel project: `bravo-gaming-esports-nextjs`
Status date: 21 November 2026

Login remediation implementation: `41ab4017835e3a0c50a40fe951961215a817b847`

Final remote feature SHA: `f322affa3c9a864621afab15af9d452331384171`

Final exact-SHA GitHub Actions: `44117785592` — PASS

Final canonical Preview: `dpl_HffsSeACPP2m7UKDDfwxwMZW4UBN` — READY and protected

Statuses describe actual evidence: **PASS**, **FAIL**, **BLOCKED**, **NOT RUN**. Local fixture success is never reported as real staging success.

## Infrastructure and access

| Workflow | Status | Actual result/evidence | Remaining acceptance action |
| --- | --- | --- | --- |
| Production generated alias | PASS | HTTP 200 at verified main SHA `c731153…` | Preserve throughout changes |
| Canonical feature Preview deployment | PASS | Ready deployment `dpl_Hffs…` at final feature SHA `f322affa…`; exact and branch URLs return anonymous HTTP 302 and authorized HTTP 200 | Preserve as the protected staging target |
| Preview protection | PASS | V1 active; anonymous exact Preview and branch alias return HTTP 302 to Vercel Authentication; production alias remains HTTP 200 | Preserve protection during all later testing |
| Preview Supabase target | PASS WITH LIMITATION | Vercel metadata identifies staging project and no direct PostgreSQL variables | Prove effective public/server key ownership on a protected redeployment |
| Preview R2 isolation | FAIL | Dedicated staging pair exists and real writes pass, but available credential also reaches the production pair; it is not bound to Preview | Create a new token scoped only to the staging pair and prove production denial |
| Duplicate Git deployment targets | PASS | Both duplicate projects have no Git link; their projects/history and duplicate A domains remain | Preserve canonical as the sole Git-connected project |
| Custom domain | FAIL | All configured custom hosts NXDOMAIN | Choose a registrable domain and verify DNS/TLS |
| Staging management access | FAIL | Fresh CLI request returns `Invalid access token` | Replace locally or use SQL Editor alternative |
| Read-only schema inspection | BLOCKED | Production-targeted URLs rejected before connection | Supply staging-only least-privilege URL/export |
| Migration ledger 001–028 | BLOCKED | No authoritative read | Inspect ledger and definitions |
| Backup/restore rehearsal | BLOCKED | No target access/tools | Back up and restore into disposable database |

## Authentication

| Workflow | Status | Actual result/evidence | Acceptance criterion |
| --- | --- | --- | --- |
| Email provider availability | PASS | Staging Auth settings HTTP 200; email enabled | Retest after schema repair |
| Designated Auth identity | PASS WITH LIMITATION | Existing email-confirmed identity reported | Verify exact UUID in authorized view |
| Compatible linked admin profile | PASS WITH LEGACY COMPATIBILITY | Confirmed Auth identity has exactly one audited `admin` profile with legacy `status=active`; modern missing columns remain part of broader schema drift | Deploy compatibility commit; later reconcile schema through approved migration |
| Real admin login | BLOCKED | Local service path returns correct 401 instead of 503 and profile authorization is ready; `QA_STAGING_ADMIN_PASSWORD` remains absent | HTTP login succeeds with safe cookies and correct profile |
| Session refresh/persistence | BLOCKED | Requires real login | Session survives refresh and expiry behavior is correct |
| Admin dashboard/API authorization | BLOCKED | Compatible profile is linked; requires a deployed authenticated session | Admin allowed; viewer/team/player/anonymous denied |
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
| Public leaderboards/MVP | BLOCKED | Fresh staging page/API evidence consistently reports zero published/ranked players; no homepage mismatch is currently reproducible | Published staging data appears; draft/private data does not |
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
| Registered 38-mode inventory | PASS ROUTES / FIXTURES | Browser suite passed; fresh protected connectivity returned HTTP 200 for all 38 routes | Repeat with real published staging snapshot |
| `/overlay/program` | PASS, FIXTURES ONLY | Show/hide/reveal/outage/reconnect passed locally | Protected source works with operator access and real data |
| Broadcast control room | PASS, FIXTURES ONLY | Workspace/control/privacy checks pass | Real admin selects published match/team and changes PGM |
| R2 logos | BLOCKED | Staging buckets pass direct functional checks, but isolated Preview credential/binding is absent | Real approved staging logos render; private data remains hidden |
| Actual OBS Studio 1920×1080 | NOT RUN | Browser fixtures are not OBS acceptance | Operator verifies transparency, dimensions, updates, refresh, outage/reconnect |

## Completion rule

Staging acceptance passes only when every FAIL is corrected and all release-critical BLOCKED rows have direct live evidence. No fixture result may be promoted to live PASS. Test records must be staging-only, identified for cleanup, and never copied from production for destructive testing.
