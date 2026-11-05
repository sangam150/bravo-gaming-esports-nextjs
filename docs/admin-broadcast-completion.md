# Admin workspaces and automated broadcast scenes

4 November 2026 · branch `codex/platform-completion-20261104`.

**Production readiness remains BLOCKED by real staging acceptance.** This report covers the subsequent master-development and automated-overlay requests. It does not replace the historical authentication diagnosis or pretend that browser fixtures are real services. No records, account roles, deployments, migrations or production data were changed.

The latest global-production request and attached blue reference images are covered in [global-production-readiness.md](global-production-readiness.md). That report supersedes the earlier visual/editor/workspace behavior below where noted and explicitly records unfinished master requirements. This file is not a declaration that the entire global platform request is complete.

## Operator workspaces

The sidebar now has exactly eight destinations, in the requested order. Existing managers remain behind these workspaces; there is no second admin application or database.

| Workspace        | Location               | Operations                                                                                                                                                               |
| ---------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Dashboard        | `/admin`               | Active competition, registered-team/player/pending-registration counts, upcoming matches, recent published results and activity; five quick actions                      |
| Competitions     | `/admin/competitions`  | Overview, Teams, Schedule, Matches, Standings, Settings; advanced event catalog under More tools                                                                         |
| Scrims           | `/admin/scrims`        | Existing scrim-day scheduling, team selection, maps and result handoffs                                                                                                  |
| Teams & Players  | `/admin/teams-players` | Two main tabs; search/status filters; existing canonical team editing, player editing and R2 images; roster/access, assignments and requests under More tools            |
| Match Results    | `/admin/match-results` | Review/preview/publish and PUBG import in one workspace; importer receives the selected event, scrim and match reference; queue/history/statistics remain advanced tools |
| Broadcast Studio | `/admin/broadcast`     | Existing program controls, new scenes, previews, portrait/artwork configuration and OBS URLs                                                                             |
| Content          | `/admin/content`       | News, announcements, sponsors, media/videos, homepage; footer and inbox under More tools                                                                                 |
| Settings         | `/admin/settings`      | Existing status/audit, scoring configuration, role mappings and advanced games management                                                                                |

The workspace tool is retained in `?view=...`, competition context in `?competition=...`; reloads preserve those selections. Old named section links redirect to the corresponding workspace. Focused import-review links retain the existing review manager. Desktop and mobile navigation remain accessible, with mobile focus trapping and Escape close. Hiding a tool does not replace server API authorization.

The previous crowded dashboard was replaced rather than kept as a second overview. Draft counts no longer masquerade as published match totals. The misleading unconditional “Production data” badge and UI suggestion to run demo cleanup were removed. No cleanup command was executed.

Scoring version creation now lives in Settings → Scoring; Match Results still selects the saved version for each match. No historical rescoring occurs automatically. Tournament and match mutation routes gained same-origin checks while retaining server authorization and existing audit behavior.

## Scheduling without another table

In Competitions, select a saved competition and open **Schedule**. Add maps, explicit start times, statuses, stage and event timezone, then save. Inputs now use the configured event timezone; timestamps are converted to UTC. Defaults use `Asia/Kathmandu`. Ambiguous and nonexistent daylight-saving times are rejected. Private observer notes are stripped from public responses.

The existing `events.schedule` text field stores a versioned structured schedule. No table, migration or storage provider was added. Legacy plain-text schedules remain readable. The editor explicitly warns that saving replaces old schedule text. The overview displays a formatted, read-only summary rather than JSON or a second editable scheduler.

Match numbers are positive and unique; times require an explicit offset; timezone names are validated. Published match results automatically label matching schedule entries “results published.” Schedule metadata exposes no draft statistics, room IDs or lobby passwords. Unpublishing removes official result data and its published-result label. Operators still set upcoming/in-progress/completed status: these are not inferred live observer events. A schedule entry is not automatically a scored match row; create/import its result in Match Results using the matching match number/reference.

## Eight requested dynamic layouts

These are React/HTML/CSS scenes, not replacement PNGs. They extend the same `/api/broadcast` feed and private `broadcastControl/program` document.

| Layout                 | Dedicated source            | Data                                                                                                                                                  |
| ---------------------- | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Road to Finals 1–12    | `/overlay/road-to-finals`   | Existing published-result standings, saved scoring versions and shared tie-break order                                                                |
| Road to Finals 13–24   | `/overlay/road-to-finals-2` | Same standings, second twelve; no invented empty teams                                                                                                |
| Today’s Matches        | `/overlay/todays-matches`   | Published event schedule, map artwork, explicit times/timezone and operator/publication status; six matches per page                                  |
| Match introduction     | `/overlay/map-intro`        | Published selected match or next scheduled map, approved artwork, registered-team count and event sponsors                                            |
| Pre-show countdown     | `/overlay/countdown`        | Next upcoming schedule entry or audited operator override, registered team grid and sponsors                                                          |
| Caster/analyst desk    | `/overlay/casters`          | Two to four explicitly approved caster profiles; R2 portraits, names, roles and social handles                                                        |
| Team/player statistics | `/overlay/team-stats`       | Selected team and up to four selected players, with an explicit selected-match or published-tournament period                                         |
| MVP                    | `/overlay/mvp`              | Existing match MVP rules, published kills/damage/assists/knocks/survival, player portrait and team artwork; reveal remains independent of publication |

The existing sixteen graphic modes remain available. The eight new modes include the seven additional requested layouts above plus `/overlay/break`; MVP was extended in place. There are now **24 dedicated graphic modes plus `/overlay/program`**. Transparent HUD layouts retain transparent surroundings; new full-screen scenes use intentional opaque backgrounds. Full-screen entrances fade, avoiding movement beyond the 1920×1080 canvas. Reduced-motion CSS remains supported.

The eight blue reference images have now been supplied and reviewed. Full-screen scenes use Bravo's actual logo, navy/black/white styling, electric-blue highlights, angular backgrounds and the reference composition. These remain dynamic HTML/CSS graphics. The references' sample identities, statistics, third-party map imagery and captured game footage are not copied into production. Upload approved map art through the existing R2 uploader; until then the scene shows a branded placeholder. No flight paths, positions, zones, headshots or elimination telemetry are fabricated.

## Broadcast Studio operation

The existing control room is organized into four named areas: Select match, Select graphic, Preview and Broadcast controls.

1. Select a published competition and, for results/statistics, a published match.
2. Choose the graphic. Team Stats exposes team/period/roster selection. Casters exposes up to four profiles; only profiles explicitly approved for broadcast enter the public projection. Map scenes accept approved artwork through the existing public R2 uploader. Countdown optionally accepts an explicit Nepal Time override.
3. **Save & preview** saves the selection hidden. The iframe and full-screen preview show the saved graphic, not an unsaved misleading selection. This is the existing single program channel: saving a hidden preview hides that channel; it is not a second live output.
4. Show/hide, reveal MVP/winner, switch standings pages, refresh data and copy the program URL. Revision conflicts report the other operator's update and require reload; they never silently overwrite it.

Add `/overlay/program` to OBS once, width 1920 and height 1080, and keep it active. Dedicated URLs remain available for advanced operators. Website graphic selection does not control OBS scenes or claim an OBS WebSocket connection.

## Automatic updates, privacy and assets

- Existing two-second shared caching, three-second conditional polling, ETags, timeout/backoff, ten-second freshness guard and publication invalidation remain. Ordinary updates target roughly 3–5 seconds under healthy conditions, not a guaranteed SLA.
- The response carries a current server clock header even for 304 responses. Countdown anchors to that clock and advances using the browser's monotonic clock, avoiding client timezone assumptions or a hardcoded timer. It resets when schedule/override values change. This is HTTP clock synchronization, not an NTP accuracy guarantee.
- Today's Matches filters the current day in the event timezone; it does not mistake a late UTC match for the same day in Nepal. The operator's page count uses the matching day. Reload/refresh refresh the published match choices even when the competition selection is unchanged.
- Refresh and Hide use the saved program state; unsaved graphic or profile edits are not accidentally applied by those actions. Schedule saves send only the changed schedule field, preserving other competition fields through the existing server merge.
- Changed database image references update image `src` without a page reload. Failed portraits show a Bravo placeholder and recover when a new valid URL arrives. Existing uploaders generate changed object URLs; no permanent browser cache-busting reload is needed.
- Caster/map uploads use the existing `media_asset` public R2 path, and saving controls claims staged assets under the existing ownership mechanism. The existing whole-document asset-reference scanner sees the private control record; in-use images remain protected from cleanup.
- Public projection is explicit: unapproved casters, raw control documents, private URLs, signed URLs, drafts, private lobby fields and unrelated-event results are excluded. Team statistics aggregate only the selected period; they do not use lifetime profile totals.
- Missing source metrics cannot be certified as verified telemetry. Displayed statistics reuse the application's stored result fields and provenance; real imports/manual corrections still require staging validation.

## Authentication

Earlier fixes remain: refreshed request-cookie forwarding, server-authoritative identity, cookie-based admin calls, race cancellation, tab invalidation and explicit logout failure. Offline SSR/provider regressions passed again. Real account confirmation, role state, recovery delivery, expiry and deployed authentication remain blocked by missing staging access. See `platform-stabilization.md` for the diagnosis and secure owner-only account correction procedure. No administrator role was granted.

## Actual verification

| Check                                             | Actual result                                                                                                                                                                                                               |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Standalone TypeScript                             | PASS                                                                                                                                                                                                                        |
| ESLint                                            | PASS, nine existing import-manager warnings and zero errors; none suppressed                                                                                                                                                |
| `npm test`                                        | PASS, all sixteen existing commands after adapting the moved navigation assertion to test the actual workspace registry and unique operation ownership                                                                      |
| `qa:auth-refresh`                                 | PASS offline SSR cookie/role tests                                                                                                                                                                                          |
| `qa:auth-provider`                                | PASS, four offline browser tests                                                                                                                                                                                            |
| `qa:admin-data`                                   | PASS offline canonical player/history protections                                                                                                                                                                           |
| `qa:workspaces`                                   | PASS, three actual-component browser tests with intercepted endpoints: eight destinations/context tools/role restriction; preview/page/show/revision conflict; UTC schedule save without publishing a draft event           |
| `qa:broadcast`                                    | PASS, expanded schedule/timezone/caster privacy/result withdrawal/image-reference/scoring tests plus existing privacy/scoring/recovery checks                                                                               |
| Secret scan                                       | PASS                                                                                                                                                                                                                        |
| Production build                                  | PASS on final source, including TypeScript and all 147 static-page build tasks                                                                                                                                              |
| `qa:broadcast:ui`                                 | PASS: seven tests, all 24 graphic modes, canvas/content bounds, ranking pages, program controls/outage, dedicated previews, anonymous mutation denial, portrait replacement recovery and server-clock countdown corrections |
| Real staging connectivity                         | BLOCKED: 32 preview GET requests, including all 25 overlay URLs, returned Vercel SSO redirects; staging Supabase responds 401 without a configured API key                                                                  |
| Real administrator browser test                   | BLOCKED: process exits before launch for missing `QA_STAGING_ADMIN_PASSWORD`                                                                                                                                                |
| Real CRUD/uploads/import/scoring/leaderboards/OBS | BLOCKED; no fixtures counted as acceptance                                                                                                                                                                                  |

No full public-route sweep or fresh-operator usability session is claimed for this pass. Existing public regression coverage is historical in `platform-verification.md`. Browser screenshots are offline rendering evidence only.

The first expanded browser run found full-screen MVP entrance overflow. Visual review then found caster/map/countdown outer and inner CSS class collisions; those were corrected and descendant bounds added to the checks. The image-replacement test was corrected to accept browser-normalized absolute asset URLs. Final standalone TypeScript passed again, lint returned zero errors/nine existing warnings, and the seven browser checks passed in 39.7 seconds. No test was disabled. Clock purity errors found during development were fixed rather than suppressed.

Offline screenshots captured and reviewed include [Road to Finals](../qa-artifacts/broadcast/road-to-finals.png), [casters](../qa-artifacts/broadcast/casters.png), [team statistics](../qa-artifacts/broadcast/team-stats.png) and [countdown](../qa-artifacts/broadcast/countdown.png). The eight requested scene screenshots are in `qa-artifacts/broadcast/`; QA names/statistics are intercepted browser fixtures and were never saved to a live database. Build/lint output is retained in `qa-artifacts/admin-broadcast-build.txt` and `qa-artifacts/admin-broadcast-lint.txt`.

## Remaining blockers and release procedure

Exact missing variables remain in `staging-verification.md`: initially `VERCEL_AUTOMATION_BYPASS_SECRET`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` or `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `QA_STAGING_ADMIN_PASSWORD`; then database inspection, R2 configuration, team/player accounts and a permitted PUBG match. Local values remain empty. Credentials must be supplied locally, never in chat. The staging preview's deployed source revision and backend bindings are unverified.

Before a release, deploy only an authorized reviewed staging revision using the existing Vercel workflow, verify the exact staging Supabase/R2 targets and run the real acceptance matrix. Test result correction/unpublication, schedule edits, caster approvals, logo/portrait replacements, concurrent operators and outage recovery on actual new staging entities. Capture each scene in OBS. Ask a fresh Bravo operator to complete the usability checklist without developer help. Review the blue layouts with approved real event assets and resolve the unfinished master requirements documented in the latest report.

There is no new schema migration. Verify existing migrations, backups and production targets independently after staging passes. Review the entire existing staged/unstaged release diff and retain user changes, then obtain explicit approval before production deployment. No merge, commit, push, reset or deployment was performed here.

## Exact files for this pass

Added:

- `lib/admin-navigation.ts`
- `lib/admin-competition-view.ts`
- `lib/event-schedule.ts`
- `components/admin/AdminOverview.tsx`
- `components/admin/AdminWorkspaceTabs.tsx`
- `components/admin/CompetitionContextPanel.tsx`
- `components/admin/CompetitionScheduleEditor.tsx`
- `components/broadcast/BroadcastAsset.tsx`
- `components/broadcast/BroadcastScenes.tsx`
- `qa/admin-workspaces.spec.js`
- `docs/admin-broadcast-completion.md`

Updated:

- `README.md`

- `app/admin/[section]/page.tsx`
- `app/admin/authentication/discord-roles/page.tsx`
- `app/admin/events/page.tsx`
- `app/admin/seasons/page.tsx`
- `app/admin/matches/page.tsx`
- `app/admin/matches/import/page.tsx`
- `components/admin/AdminSidebar.tsx`
- `components/admin/AdminDashboard.tsx`
- `components/admin/AdminMatchManager.tsx`
- `components/admin/BroadcastControlRoom.tsx`
- `components/broadcast/BroadcastOverlay.tsx`
- `components/broadcast/broadcast.css`
- `lib/broadcast.ts`
- `lib/data.ts`
- `lib/public-asset-cleanup.ts`
- `app/api/admin/broadcast/route.ts`
- `app/api/admin/matches/route.ts`
- `app/api/broadcast/route.ts`
- `app/api/tournaments/route.ts`
- `app/api/tournaments/[id]/route.ts`
- `package.json`
- `qa/admin-ui-integrity-check.ts`
- `qa/broadcast-check.ts`
- `qa/broadcast-ui.spec.js`
- `qa/auth-staging-e2e.mjs`
- `qa/staging-connectivity-evidence.mjs`
- `docs/staging-verification.md`
- `docs/platform-operations.md`

This inventory is separate from prior stabilization and the extensive user changes already present in the checkout. No `.env` credential file was modified.
