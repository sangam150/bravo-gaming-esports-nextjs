# Global tournament production follow-up — 4 November 2026

Superseded implementation/readiness findings: [5 November release audit](release-audit.md). Current source includes migrations 026–027 and 37 graphics plus program; older counts and no-migration statements below describe the earlier snapshot.

**Overall: NOT COMPLETE. Production and real staging acceptance remain BLOCKED.** The supplied master brief is an implementation request; the eight PNGs are visual references, not production assets or trusted records. This pass extends the existing application, database, upload integration and broadcast API. It does not certify the full international-event feature list.

## Implemented in this follow-up

- Tournament tabs now read **Overview | Teams | Schedule | Results | Standings | Broadcast | Settings**. Results embeds the existing match manager; Broadcast embeds the existing studio with tournament context. There is no duplicate scoring engine or control application.
- Settings supports event/organizer logos, short name, organizer, country, region, edition, currency, timezone and official links. Existing overview fields retain official event name, banner, dates, description, rules and publication.
- Stable stage/group/day identities support names, order, team assignments and archiving. Existing identities cannot be removed from saved metadata; archive them to preserve links. Metadata is stored on the same canonical event document in the existing `app_documents/tournaments` collection. No table, bucket or migration was added.
- Event metadata has separate draft and approved values and a revision. General authorized admins may save drafts; approval requires the existing platform-administrator gate. Writes use the existing conditional document update and required audit logger. Public broadcast reads approved metadata; private preview reads draft metadata. An approval audit records the attempted update before the write, rather than claiming distributed audit/database atomicity.
- Schedule supports stage/group/day, official/display titles, match-result linkage, all requested operational statuses except inferred publication, actual start/end timestamps, participating teams and private observer notes. Publication labels are derived from actual published results. The existing schedule text column holds the versioned structure. The editor accepts wall-clock inputs in the event timezone and stores absolute UTC; invalid/ambiguous DST inputs do not silently select an instant. Observer notes are removed from public tournament responses and never included in broadcast snapshots.
- The event map/asset library uses existing R2 uploads: artwork, thumbnails, backgrounds, annotations, event/organizer logos and reusable scene assets. Actual approved images remain operator supplied; missing assets use Bravo fallbacks.
- Sponsor assignments use existing sponsor records with event/stage/day/match/scene scope, order, top/bottom placement, rotation duration, visibility and start/expiry. Expired/unpublished/hidden records are filtered before rendering. Scene footers rotate one eligible sponsor using the broadcast clock. Existing global sponsor forms still manage name/logo/category/website. Scoped selectors use names rather than requiring operators to type IDs.
- Caster portraits, names, roles, handles, country, order, approval and event/day assignments are editable in Studio. Two to four approved event-specific profiles render as portraits, not webcam feeds.
- Every existing graphic has a presentation template: title/subtitle/event/day/match text overrides, logo/background, accent, font, layout, alignment, rows, allowed column visibility, sponsor visibility/position, animation, safe area, logo size and image crop. Reset and named reusable presets are available. These changes cannot edit official scores. Table/scene renderers consume their relevant settings; different families constrain supported row counts (road pages up to twelve, schedule up to six).
- The original 24 graphic modes remain independent, plus `/overlay/program`. Eight supplied reference layouts now use navy/black/white, blue highlights, diagonal backgrounds, bold italic headings, nameplates and the reference scene composition. MVP was extended in place. Graphics remain React/HTML/CSS, not flattened PNGs. No sample team/person/sponsor, unlicensed map art, telemetry or screenshot statistics were installed as official records.
- Studio separates private Draft/Preview/Ready from the flat public PGM state. Save & preview does not change an on-air graphic. Mark ready signs the exact normalized next selection; another edit invalidates readiness. Show takes that selection live. Winner/MVP require explicit reveal. Hide operates even if a previously selected event was withdrawn. Restore previous graphic and global revision conflict handling are available.
- Private preview uses `/api/admin/broadcast?preview=1`, requires existing server authorization and sends `private, no-store`. Same-origin parent messages update presentation-only edits inside the private preview without publishing them. Ordinary public preview cannot enable this private message path. Public snapshots explicitly project one selected presentation and published data; they omit draft, history, presets, approval signatures, notes and raw documents.
- Existing ETags, two-second shared cache, three-second conditional polling, freshness ceiling, timeout/backoff, publication invalidation and stale-data hiding remain. Ordinary approved asset and published-score changes refresh the public graphic without switching the program scene.
- Historical player labels and the leading team's roster come from scoped saved match results; later transfers/profile renames cannot silently substitute today's roster. A draft result preview is not labeled as published. Malformed/unknown structured schedules fail closed instead of returning raw observer notes.

## Operator workflow

1. Select a competition. Edit official information in Overview, production metadata in Settings, structure/day assignment and absolute times in Schedule, and scoring/import/corrections in Results.
2. Save metadata drafts, review them and obtain administrator approval. Publishing an event or a result is separate from metadata approval. Match publication remains the existing reviewed scoring workflow.
3. In Broadcast select Tournament → Stage → Group → Day → Match. Choose a graphic from the searchable grouped list. Use the template editor for broadcast-only appearance and event assets.
4. Save & preview the next graphic. Unsaved presentation edits update the private preview; selection/data changes require saving the preview. Inspect the full-screen authenticated preview before release.
5. Mark the exact selection ready, then Show graphic. Use explicit Reveal winner/MVP for those scenes. Previous/next page controls prepare a private next page; mark it ready and Show to release it. These controls do not secretly modify PGM while editing.
6. Copy **`/overlay/program`** into a 1920×1080 OBS Browser Source. Keep the source active. Dedicated URLs are available for advanced setups. Do not add `?studio=1` to an OBS source and do not publish an authenticated editor URL.
7. Hide, refresh data, reload a conflicting revision or restore the previous program as needed. Restoring is revalidated against current publication; it cannot revive withdrawn results.

No OBS WebSocket, webcam transport, custom lobby control or trustworthy live observer telemetry is implied. Real observer video capture stays independent.

## Acceptance status by workflow

PASS below is scoped to the named local check. FAIL denotes an unmet master requirement; BLOCKED denotes external acceptance that cannot be exercised. None is a production-readiness claim.

| Workflow | Local status / evidence | Real staging status |
| --- | --- | --- |
| Seven-tab tournament workspace and existing managers | PASS: actual-component navigation fixture | BLOCKED: preview access/login |
| Event branding draft/approval | PASS: Unicode/timezone draft and non-approver UI fixture; typed validation | BLOCKED: real role/audit/CAS writes |
| Stage/group/day configuration and archived links | Implemented; pure scope/foreign-key checks pass | BLOCKED: saved cross-session database history |
| Event timezone and schedule privacy | PASS: UTC conversion, international timezone, DST gap/ambiguity and private-note tests | BLOCKED: published schedule records |
| Map and asset library | Implemented with existing R2 uploader and public URL validation | BLOCKED: R2 credentials, delivery and isolated staging buckets |
| Team/player/roster editing | Existing canonical managers preserved; offline regression passes | BLOCKED: designated accounts and staging writes |
| All requested extra team/player profile fields and historical portrait selection | FAIL: not all organization/colors/jersey/social/historical-photo fields have a connected form/storage workflow | BLOCKED: real roster acceptance |
| Placement/kill scoring versions and correction/publication | Existing shared engine retained; offline scoring/publication regression passes | BLOCKED: real match records |
| Configurable tie-break sequence, stage rules, DQ and approved penalties/adjustments | FAIL: full connected workflow is not implemented. Current shared tie-break order is fixed. Stage scoring/advancement metadata must not be mistaken for an applied rule | BLOCKED: official event-rule acceptance |
| Sponsor scope/expiry/rotation | Implemented using existing records; public projection tested for publication/privacy | BLOCKED: real assigned sponsors/artwork and long-run rotation |
| Caster event/day assignments and portrait layouts | Implemented; privacy projection and four-person rendering checked | BLOCKED: real approved profiles/OBS |
| Template editor / presets / crops / long names | PASS: local browser checks for title, columns, rows, layout, Unicode names and canvas bounds | BLOCKED: fresh operator and approved R2 assets |
| Draft → Preview → Ready → Live → Hidden / restore | PASS: pure transition and actual-component tests; title edits invalidate readiness; public projection excludes private draft/history | BLOCKED: concurrent real operators and database CAS |
| Eight blue reference compositions | Implemented and locally rendered; screenshots are synthetic fixture evidence | BLOCKED: visual sign-off with approved real portraits/artwork and actual OBS |
| Full expanded master overlay library | FAIL: current library is 24 modes; new comparison, qualification/advancement, day winner/champion, award, technical-break and additional sponsor variants are not all implemented | BLOCKED: published final-state data and operator sign-off |
| Every on-screen label independently configurable | FAIL: principal headings/styles are configurable; metric labels and some explanatory text remain fixed | BLOCKED: complete operator acceptance |
| More granular producer/graphics/scorekeeper permissions | FAIL: existing admin/platform-admin gates retained; the suggested fine-grained role matrix is not implemented | BLOCKED: actual non-admin role sessions |
| Public feed privacy, result withdrawal, outage behavior | PASS: explicit projection, pure policy and browser outage tests | BLOCKED: real server/database outage and withdrawn staging records |
| Full event operation by a fresh nontechnical operator | BLOCKED: no operator session performed; the above FAIL items must also be resolved | BLOCKED |
| Real admin sessions / CRUD / uploads / PUBG import / leaderboards / OBS | BLOCKED: fixtures never count as service acceptance | BLOCKED: exact missing variables in staging report |
| Production release | BLOCKED: unfinished features and staging acceptance | BLOCKED: no merge/deployment performed or authorized |

## Test evidence

Browser fixtures intercept requests only in the test browser; they never seed the database. Build-time data reads do not establish staging access. The existing checkout contains unrelated staged and unstaged work, retained without reset or blanket staging.

| Command/check | Actual result |
| --- | --- |
| `npm run typecheck` | PASS on final source |
| `npm run lint` | PASS: zero errors, nine pre-existing importer effect warnings; no new suppressions |
| `npm test` | PASS: all sixteen existing QA commands |
| `npm run qa:broadcast` | PASS: privacy, scoped data, publication, historical roster, scoring, timezone/DST, sponsor expiry/scene scope and studio transitions |
| `npm run qa:workspaces` | PASS: four actual-component browser fixture tests, including readiness invalidation and protected metadata approval |
| `npm run qa:auth-provider` | PASS: four browser fixture tests for cookie sessions, cross-tab logout, denied sessions and reported logout failure |
| `npm run qa:auth-refresh` | PASS: same-request refreshed cookie and role/session policy |
| `npm run qa:admin-data` | PASS: canonical profile/history protections |
| `npm run qa:secrets` | PASS: 508 candidate/tracked files; no secret patterns |
| `npm run qa:broadcast:ui` | PASS: nine browser checks, all 24 modes, 1920×1080 bounds, long names, custom rows/columns, private-preview-only messages, anonymous API denial, asset replacement, pagination, clock correction and outage hiding; 46.6 seconds |
| Final production build | PASS: optimized compilation, TypeScript and all 147 page-generation tasks |
| `git diff --check` | PASS |
| Real staging/OBS | BLOCKED, not replaced by the above fixture checks |

Screenshots were visually inspected for all eight supplied compositions. Examples: [ranking page](../qa-artifacts/broadcast/road-to-finals.png), [casters](../qa-artifacts/broadcast/casters.png), [team statistics](../qa-artifacts/broadcast/team-stats.png), [MVP](../qa-artifacts/broadcast/mvp.png), [schedule](../qa-artifacts/broadcast/todays-matches.png), [map](../qa-artifacts/broadcast/map-intro.png), [countdown](../qa-artifacts/broadcast/countdown.png). Missing portraits/artwork deliberately use Bravo fallbacks. All QA identities/statistics are synthetic browser-only fixtures, not official results. The leading-team caption overlap found during review was corrected before the nine-test run. Lint initially caught a sponsor-rotation closure mutation; it was corrected without disabling the rule.

Logs: `qa-artifacts/admin-broadcast-build.txt`, `admin-broadcast-lint.txt`, `platform-unit-checks.txt`, `broadcast-ui-latest.txt`, `workspaces-ui-latest.txt`, `auth-provider-latest.txt`. Artifacts are ignored by Git and remain local.

Real probe at `2026-11-04T17:13:36.077Z`: all 32 Vercel requests returned 302 to Vercel SSO, Supabase health returned 401 without a key, and the admin command exited before launch for missing `QA_STAGING_ADMIN_PASSWORD`. Presence recheck at `17:14:50.398Z` still found empty credentials. `.env.staging.local` remains ignored/untracked. No deployment protection was disabled. No database/object write, role grant, migration, merge or deployment was performed.

See [staging-verification.md](staging-verification.md) for all workflow/source statuses and exact missing names. First blockers remain `VERCEL_AUTOMATION_BYPASS_SECRET`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` or `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `QA_STAGING_ADMIN_PASSWORD`. R2/server diagnostics/designated team/player/PUBG values are also absent. Do not send credentials in chat.

## Files added or extended for this follow-up

New: `lib/broadcast-template.ts`, `lib/broadcast-studio.ts`, `lib/event-production.ts`, `lib/event-production-server.ts`, `lib/event-datetime.ts`, `components/admin/BroadcastTemplateEditor.tsx`, `components/admin/EventProductionSettings.tsx`, `components/admin/EventSponsorAssignments.tsx`, `components/broadcast/BroadcastSponsorStrip.tsx`, this report.

Extended: `README.md`, `lib/broadcast.ts`, `lib/broadcast-server.ts`, `lib/event-schedule.ts`, `lib/data.ts`, `lib/admin-navigation.ts`, `app/api/admin/broadcast/route.ts`, `app/api/tournaments/[id]/route.ts`, `app/overlay/[graphic]/page.tsx`, `components/admin/AdminDashboard.tsx`, `components/admin/BroadcastControlRoom.tsx`, `components/admin/CompetitionScheduleEditor.tsx`, `components/broadcast/BroadcastOverlay.tsx`, `components/broadcast/BroadcastScenes.tsx`, `components/broadcast/broadcast.css`, `qa/broadcast-check.ts`, `qa/broadcast-ui.spec.js`, `qa/admin-workspaces.spec.js`, `docs/staging-verification.md`, `docs/platform-operations.md`, `docs/admin-broadcast-completion.md`.

Earlier stabilization/workspace changes have their own inventory in [admin-broadcast-completion.md](admin-broadcast-completion.md). No credential file was edited. There is no production deployment artifact or migration to apply from this follow-up. Resolve the FAIL items, complete isolated real staging acceptance and obtain explicit release approval before production.
