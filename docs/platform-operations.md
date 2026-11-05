# Bravo platform operations

## Release-audit update — 5 November 2026

Current code requires reviewed migrations **026 and 027**, after the existing chain through 025. Do not deploy this source against an older schema. No migration has been applied in this audit. Keep 022 identical to its committed history; the fail-closed player-link activation correction is already in forward migration 024. Review the target ledger, backups, view dependencies and recovery plan in [release-audit.md](release-audit.md) before any authorized migration.

Result replacement, publication, withdrawal and soft deletion now use the service-only `commit_competition_match` RPC. Parent/child rows, event match count and required transaction audit commit or roll back together. An editor must submit its loaded revision; conflicts return 409 and require reloading. Do not blindly retry a failed or uncertain write. Separate identity preparation and player-link/import lifecycle follow-up are outside this transaction. Bulk batches remain independent per-match transactions.

New scoring versions use their configured MVP criteria. Matches without a version-2 snapshot preserve the existing SQL MVP order: total points, kills, damage, assists, player name. No historical score totals are recalculated. The public application/OBS legacy comparator now agrees with that SQL ordering.

For safe local fixture/empty-state QA, `node qa/local-release-runtime.mjs build` and `node qa/local-release-runtime.mjs start` remove service credentials instead of borrowing production `.env.local`. This does not establish staging connectivity or successful real login. The older operating notes below remain historical where they conflict with this update.

Current workspace navigation, structured schedule operation and extended broadcast scenes are documented in [admin-broadcast-completion.md](admin-broadcast-completion.md). The older route names below redirect into these workspaces; the permanent program URL remains unchanged.

The latest blue layouts, event settings, template editing and private-preview workflow are documented in [global-production-readiness.md](global-production-readiness.md). Follow that workflow in preference to the older program instructions below: **Save & preview leaves the current live program unchanged**, Mark ready authorizes the exact next selection, Show takes it live, and winner/MVP require explicit Reveal. The private `?studio=1` preview uses an authenticated admin API and must not be used as an OBS source. Public `?preview=1` continues to expose published program data only.

See [platform-stabilization.md](platform-stabilization.md) for the latest authentication corrections, designated staging configuration, actual probe results and outstanding acceptance. Production deployment requires explicit user approval after successful staging acceptance.

## Scope and readiness

This change extends the existing Next.js / Vercel / Supabase / Cloudflare R2 application. It does not replace authentication, upload services, or tournament records. The branch began with substantial unrelated staged and unstaged changes; review those together with this implementation before committing or deploying.

Implemented here:

- Broadcast program control at `/admin/broadcast`, with published-event/match selection, player selection, graphic preview, lower-third text, show/hide, winner/MVP reveal, refresh and URL copying.
- Public, allowlisted `/api/broadcast` snapshots and dedicated `/overlay/*` browser sources. Draft events/matches and private lobby details are excluded.
- Transparent 1920×1080 graphics: scoreboard/results, winner, MVP, top fragger, top damage, player spotlight, rankings/standings, lower third, sponsors, event schedule, opening and closing. Headshot and elimination graphics explicitly report unavailable verified data.
- Shared two-second snapshot cache with a ten-second freshness ceiling, three-second conditional polling, ETags, request timeout, outage hiding and bounded retry backoff. Controls/publication/sponsor changes invalidate broadcast snapshots.
- Revision checks prevent concurrent operators from silently overwriting each other's changes.
- Versioned scoring configuration in Match Manager, using the existing `point_systems` table and shared scoring helper. Existing scoring versions and historical results are retained.
- Match API defaults to drafts; publication validates team identities, unique placements, a first-place result and nonnegative player statistics. Child-result replacement happens while the match is private; successful writes publish afterward.
- Scrim validation, insert-only creation, update conflict checks, archive instead of hard deletion, same-origin checks and audit summaries that exclude room credentials.
- Database readiness deduplicates concurrent probes, retries failures after five seconds, rechecks success after thirty seconds and bounds the network probe to eight seconds. Admin connection indicators reflect the probe result.
- Fixes for existing fantasy-page dataset wiring, unavailable map damage, stale unused helpers/imports, semantic breadcrumbs and the verified-TLS QA assertion.
- The admin tournament list uses an authenticated internal read, so saved drafts remain visible to organizers while the public list remains publication-filtered.

These changes do **not** establish that every production acceptance criterion has passed. See `platform-audit.md` for the architecture survey and `platform-verification.md` for actual check results.

## Database

No new migration, tables or storage buckets are introduced by this change.

Broadcast controls use one private record in the existing `public.app_documents` table: collection `broadcastControl`, ID `program`. It is created when an authorized operator first saves controls. Scoring configurations create records in existing `public.point_systems`. Operator actions use the existing audit logger. Public users access the projected HTTP feed, never raw broadcast documents.

The checkout already contains migrations through 025, including staged migrations 024–025. Their presence does not prove they have been applied to the selected environment. Migration 023 must keep raw document JSON private. Do not grant anonymous access to `app_documents` for overlays or Realtime.

## Environment

No additional environment variables are needed. Retain the existing values documented in `.env.example`:

| Purpose                        | Variables                                                                                                                                                                                                 |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Site origin                    | `NEXT_PUBLIC_SITE_URL`                                                                                                                                                                                    |
| Supabase public/session access | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` or `NEXT_PUBLIC_SUPABASE_ANON_KEY`                                                                                                     |
| Server database access         | `SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY`                                                                                                                                                      |
| Migration tooling              | `DATABASE_URL`, `DIRECT_URL`, linked Supabase project and authenticated CLI                                                                                                                               |
| R2                             | `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PRIVATE_BUCKET_NAME`, `R2_ENDPOINT`, `R2_PUBLIC_DELIVERY_MODE`, `R2_PUBLIC_BASE_URL`, `NEXT_PUBLIC_R2_PUBLIC_BASE_URL` |
| PUBG imports                   | `PUBG_API_KEY`, `PUBG_SHARD`                                                                                                                                                                              |
| Scheduled synchronization      | `CRON_SECRET` plus the intended scheduler configuration                                                                                                                                                   |
| Discord sign-in/roles          | Existing Discord provider, callback allowlist, bot token, guild and role mappings, as documented in `.env.example`                                                                                        |

Use distinct public/private R2 buckets. Keep service-role credentials, PUBG keys and R2 secrets server-only. Configure environment values independently for Vercel Preview and Production. A staging preview should use a staging database and staging buckets.

## Tournament and scrim operation

1. Sign in with a profile-authorized admin/organizer account. Hiding controls is not authorization; mutation routes verify the session on the server.
2. Create a season, then create/link the tournament event. Match persistence currently requires an event linked to a season.
3. Register and approve teams using the existing registration manager. Manage canonical team identities and roster links there before importing matches.
4. In Scrim Days, create the day, maps and schedule. Room ID/password remain private admin fields. Publish the scrim only when its public schedule is ready.
5. In Match Manager, create a draft or use the existing PUBG import preview. Review team mappings, player rows and data source before publication.
6. To customize scoring, expand **Configure scoring**. Enter a unique version name, points per kill, and comma-separated placement points beginning at first place. Save it, select that version on the match, and run Preview. Unlisted places receive zero points.
7. Publish reviewed results. Unpublish before deleting a match. Review/correct and republish imported statistics through the same manager.

MVP uses kills, then damage, then assists, with a stable identity tie-breaker. A match winner must have placement 1; highest points alone do not establish the chicken dinner. Broadcast standings sum already-scored published team results, retaining their selected rules.

## Broadcast operator guide

1. Open `/admin/broadcast` using an authorized admin/organizer profile.
2. Select a **published** tournament and match. The match selector displays its actual map; it does not change the stored map or control a PUBG lobby.
3. Select a graphic, or select a match player for Player Spotlight. Enter public on-screen text for Lower Third.
4. Click **Save & preview** to save the selection while keeping the program hidden. The checkerboard preview displays published data even while hidden. Never put secrets in lower-third text.
5. Copy the program URL. In OBS add a Browser Source with width **1920**, height **1080**, and this URL. The page supplies transparency; do not add an opaque OBS background.
6. Keep the source active if you want it to continue receiving controls. Use **Show graphic**, **Hide graphic**, **Reveal MVP**, or **Reveal winner**. Changes normally appear in a few seconds.
7. **Refresh overlay data** invalidates the shared snapshot without re-importing statistics. **Reload controls** retrieves the latest persisted revision after another operator changes it.

Program URL: `/overlay/program` follows the selected graphic. Individual source URLs show only when that graphic is selected and visible:

```text
/overlay/scoreboard       /overlay/results
/overlay/winner           /overlay/mvp
/overlay/top-fragger      /overlay/top-damage
/overlay/players          /overlay/headshots
/overlay/rankings         /overlay/standings
/overlay/lower-third      /overlay/schedule
/overlay/sponsors         /overlay/opening
/overlay/closing          /overlay/killfeed
```

`?preview=1` displays published data while hidden; it grants no private data access. The overlay route permits same-origin framing for the operator preview; other pages retain their existing frame restrictions.

The website controls browser graphics. It does not switch OBS scenes and does not connect to OBS WebSocket. There is one program channel. Headshots and elimination events are unavailable until a verified pipeline is connected. Schedule shows event dates and published map rotation, not an inferred per-match start time. Sponsors must be published, visible and assigned to the event. On connection loss, stale graphics hide and the client retries.

## Deployment procedure

Do not deploy the dirty checkout without reviewing the pre-existing changes. Do not run reset, demo cleanup or production reconciliation scripts as routine setup.

1. Review the complete feature branch diff, retain the user's existing work, and commit the intended release. Do not blanket-stage secrets or unrelated files.
2. Set up a Vercel Preview environment with staging Supabase/R2 and permitted PUBG API access. Confirm the linked Vercel project is the existing Bravo project.
3. Inspect the staging database and migration state:

   ```bash
   npm ci
   npm run supabase:readiness
   npx supabase link --project-ref <staging-project-ref>
   npx supabase migration list --linked
   ```

   Replace the placeholder with the exact staging project reference. The existing `supabase:preflight` script is pinned to the approved production project; do not remove its project guard to make it run against another target. Its use belongs in the production verification step below. The readiness script's legacy Supabase Storage bucket checks are not R2 requirements.

   If required migrations are missing, take a database backup, confirm the linked target, review the ordered migrations, and apply using `npm run supabase:db:push`. This implementation itself needs no new migration. Never run schema recovery/reset files indiscriminately.

4. Run the release checks:

   ```bash
   npm run typecheck
   npm run lint
   npm test
   npm run qa:broadcast
   npm run qa:secrets
   npm run build
   ```

5. Launch `npm run start`. In a second terminal run `npm run qa:broadcast:ui`. Set `QA_BASE_URL` if using a different host/port. Browser tests intercept fixture responses only in the test browser; they do not seed production data.
6. Deploy a preview using the existing Vercel integration or `npx vercel deploy`. Run the real staging acceptance below against that preview.
7. After staging acceptance, confirm Production points to the existing production database/R2 buckets and has current backups. With production credentials restored locally, run the read-only `npm run supabase:preflight` against its pinned project. Before applying any production migration, explicitly relink the production Supabase project and verify `npx supabase migration list --linked`; do not retain the staging CLI link. Deploy the reviewed release through the existing production branch integration or `npx vercel deploy --prod`.
8. Open a real published match and capture `/overlay/program` in OBS at 1920×1080. Confirm logos, scoring, MVP/winner, show/hide, result withdrawal and connection-loss behavior before a live broadcast.

## Required real staging acceptance

Use designated staging admin, team and player accounts; a permitted real PUBG match ID; staging R2 credentials; and OBS Studio. Exercise login/logout, unauthorized access, tournament creation/editing, registration/approval, roster/player updates, scrim-day updates, real imports and duplicates, manual corrections, draft preview/publish/unpublish, public results/standings, public logo upload, private evidence denial, operator controls and OBS capture. Browser fixtures and source assertions do not replace these external checks.

## Known limits

- Broad authenticated production workflows and real OBS capture still require the above staging acceptance. The existing application's full UI and database have not been certified by this change.
- Polling is intentional because raw document Realtime access would weaken privacy. There is no anonymous document subscription.
- Broadcast boards show 24 teams per page; choose the scoreboard page in Broadcast Control for larger fields. Existing public readers have their own historical-query bounds.
- Result replacement is not a single database transaction. Publication waits until writes succeed; a failure leaves a draft requiring review. Concurrent match editors still need coordination.
- Bulk match saves can partially succeed. Review per-match state before retrying a failed bulk request.
- Activity logging reuses the existing best-effort audit writer; database-audit outages are not a transactional mutation gate.
- Scoring versions are immutable through the new API; selecting a version per match is supported. Event-wide reassignment and automatic retroactive rescoring are not added.
- This change does not add custom-room creation, live lobby control, verified live headshots or live eliminations.
