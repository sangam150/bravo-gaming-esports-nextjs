# Scrim operator runbook — 6 November 2026

**Start: Friday, 6 November, 19:00 Nepal time (`Asia/Kathmandu`, 13:15 UTC).** Default capacity is 16 teams. Map order, individual match times and scoring rules require the operator's verified configuration. No event, registration, map rotation or score is supplied by this document.

The platform is **not yet accepted for live operation**. See [event-day readiness](event-day-readiness-2026-11-06.md) for actual results and blockers. Local code and fixture checks do not establish a working real administrator session or OBS capture.

## Start and authenticate

Use the existing isolated development command:

```sh
npm run dev:staging -- --check
npm run dev:staging
```

It explicitly reads ignored `.env.staging.local`, pins Supabase to `yppefayrepkqpqtprbqa` and excludes unverified R2/management/QA credentials from the app. Ordinary `npm run dev` still loads the existing `.env.local`, whose production target was not repurposed; do not use that command for this event's staging controls. Never silently fall back to production. Stop the existing repository development server before starting another on port 3000.

Open `/admin/login`. Verify successful login, `/admin`, reload, a protected API and logout before relying on the platform. The requested `sangamka076@gmail.com` Auth identity already exists and is confirmed; do not create a duplicate or reset it implicitly. Required active profile/schema and the private test password remain gates. See [authentication verification](authentication-verification.md).

The local event-day fallback sets `DISCORD_LOGIN_ENABLED=false`. Discovery returns `discord:false` and the intent endpoint returns 503 without creating a cookie. This affects local social sign-in availability; it does not repair or change the remote Supabase provider. Re-enable only after numeric application ID, matching secret, callbacks, schema and real consent/session checks pass. Email authentication remains subject to its existing security checks.

## Configure the event, teams and matches

1. In **Scrims**, search the actual saved list before creating anything. The read-only staging lookup for `date=2026-11-06` returned zero scrim documents during this review. That is not permission to create a duplicate in a different database. Use the intended staging test event for acceptance; distinguish it from official participant-facing production records.
2. Set the date and **19:00 Nepal time** explicitly. Preserve any operator-approved schedule; do not substitute an older 19:30/20:00 default. Start with capacity 16 unless the operator approves another capacity.
3. Link the correct canonical competition/season. Manual match results require that relational event, its scoring configuration and compatible schema; a standalone scrim document is insufficient. Configure maps and individual start times in the linked competition's schedule editor reused from Scrims. Public schedule and broadcast must read that same saved schedule.
4. Select actual eligible teams, confirm registrations and assign free event slots. Auto-assignment uses available slots. A team and a slot may each occur once per scrim. Withdrawing a team releases its assignment; unlock before changing locked slots.
5. Save and require the backend's success response. Refresh to verify persistence before copying the saved slot notice or publishing. A revision conflict requires reloading and reconciling the other operator's changes. Do not simply retry an old form over a newer saved version.
6. Check registration policy, capacity, confirmed teams, lobby instructions and publication. Keep room/password fields private. Team logos are optional; use approved existing assets or safe placeholders when uploads are unavailable.

No registration or slot is official merely because a local form or preview displays it.

## Score each match

Use **Match Results** with the linked event and its configured scoring version. Bulk shells and the editor inherit event scoring unless an operator explicitly selects another version. Enter genuine team names, placements and kills; do not publish empty or pending-mapping labels.

Save, verify totals and publish. Test a correction and confirm standings recalculate before handling official results. A stale revision must be rejected. The supported application writer is `commit_competition_match`; its 026/027 schema prerequisites and the complete baseline must be verified. Do not use a legacy direct-table writer, seed, reset, repair or maintenance script as an event-day shortcut.

No compatible old-schema scoring fallback has been verified. If the database, authentication or migration gate remains blocked, use the offline record below instead of claiming a successful save or publishing unverified totals.

## Prepare the OBS program

After real data exists, open `/admin/broadcast`, select the event/current match and explicitly link its published scrim for **Team Slots**. That graphic reads the saved event assignments; it does not use global team slot numbers.

For each essential graphic, preview the actual data, mark ready and send it to program. Verify `/overlay/program` in a separate browser before adding it as a 1920 × 1080 OBS Browser Source. Check Starting Soon, Today's Matches, Match Map, Team Slots, Match Results, Overall Standings, Winner, Break and Closing. Show MVP only when genuine player statistics exist. Keep the program URL unchanged while the operator selects graphics.

Hide or clear when data is unavailable. Do not treat a placeholder, outage-hidden screen or fixture image as a verified live graphic. Browser fixtures do not certify OBS rendering, transparency, GPU behavior or stream capture. Actual OBS acceptance is still required.

## Offline fallback when a P0 gate remains blocked

Copy these **empty templates** into a private ignored working directory, for example `qa-artifacts/event-day-operator/`. Do not put participant contacts, lobby passwords or official results into a Git-tracked template.

- [Team/slot record](templates/scrim-offline-slots.csv): record only actual confirmed team registrations and unique slots, with source and operator verification.
- [Match schedule record](templates/scrim-offline-schedule.csv): enter the authorized map order and Nepal start times; no map order is prefilled.
- [Official result record](templates/scrim-offline-results.csv): record genuine raw placements/kills and the event's scoring reference, evidence and corrections. Point fields are intentionally blank; this is not a scoring calculator or an approved scoring table.

Use one authoritative copy and designate one operator to reconcile edits. Preserve the original match evidence and record every correction with its reason and verifier. Check duplicate teams/slots, capacity, placement/kills and scoring arithmetic independently before communicating results. Clearly identify temporary offline standings; do not represent them as published platform records.

Import only after schema reconciliation, verified authentication, approved target isolation and an accepted test match. Compare the imported per-match rows and totals against the offline record before publication. Do not write directly into production tables. Existing protected admin registration is a fallback only after its real authentication and save path have passed; it is not currently verified.

If public deployment remains blocked, localhost controls are accessible only to the local operator. Participant registration/instructions require an existing verified public path or owner-operated participant communications. No Discord message is sent automatically. No public Live Center was added.

## Checkpoints before 19:00

| Nepal time | Required evidence |
| --- | --- |
| 17:30 | Successful real admin session; correct event selected; registration and slot persistence verified |
| 18:00 | Confirmed teams/slots; actual map schedule; result entry, correction and standings tested |
| 18:20 | Program source and essential graphics accepted with real data; OBS capture checked |
| 18:40 | Confirm lobby instructions, registration closure, admin access and Starting Soon; stop nonessential changes |
| 19:00 | Use only workflows that actually passed. Keep the documented offline fallback for blocked services |

These are required checks, not claims that a milestone has been met. No commit, push, remote migration, merge or deployment is authorized by this runbook. Preview production-resource isolation and separate owner approvals remain required.
