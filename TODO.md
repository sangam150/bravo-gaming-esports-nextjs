# Bravo Gaming Esports — Final Production TODO

## Current Status

- Overall progress: about 55%
- UI foundation: mostly done
- Firebase + admin foundation: partially done
- Real PUBG tournament operations: in progress

This document replaces the older placeholder TODO and reflects the real remaining production work.

## Already Done

- [x] Next.js App Router + TypeScript + Tailwind base platform
- [x] Firebase-backed admin auth and admin dashboard structure
- [x] CRUD flows for seasons, tournaments, teams, players, announcements, and scrims
- [x] PUBG player-name lookup and recent match fetch from PUBG API
- [x] Direct PUBG match import by match ID
- [x] Auto-import watcher support for tracked PUBG players
- [x] Match storage with `teamResults` and `playerResults`
- [x] Canonical Bravo team slot mapping through slot 24
- [x] Daily scrim aggregation and leaderboard calculation from imported matches
- [x] Removal of fake competitive fallback data for teams and players
- [x] Public `Data not imported yet` empty states for teams and players
- [x] Admin reset flow for imported competition data

## Production Blockers

These must be completed before the platform can run real Bravo scrim/tournament operations safely.

### Priority 1 — PUBG Import Workflow

- [x] Split import into two steps: preview first, save second
- [x] Allow admin to enter PUBG player/account name and fetch recent matches
- [x] Allow manual match ID entry as fallback
- [x] Allow assigning selected matches to:
  - [x] Season
  - [x] Tournament
  - [x] Scrim
  - [x] Day number
- [x] Build import preview UI showing:
  - [x] Match ID
  - [x] Map
  - [x] Match date/time
  - [x] Match duration
  - [x] Teams detected
  - [x] Players detected
  - [x] Placements
  - [x] Kills
  - [x] Damage
  - [x] Assists
  - [x] Survival time
- [x] Highlight in preview:
  - [x] New teams
  - [x] Existing teams
  - [x] New players
  - [x] Existing players
- [x] Save only after admin confirms preview
- [x] Return detailed import summary after save

Acceptance:
- Admin can fetch, preview, select, assign, confirm, and save PUBG matches without touching Firestore manually.

### Priority 2 — Match-Level Roster History

- [ ] Add a dedicated `matchPlayers` data model
- [ ] Store one row per player per match with:
  - [ ] `matchId`
  - [ ] `dayNumber`
  - [ ] `playerId`
  - [ ] `pubgAccountId`
  - [ ] `playerName`
  - [ ] `teamId`
  - [ ] `teamName`
  - [ ] `slotNumber`
  - [ ] `kills`
  - [ ] `damage`
  - [ ] `assists`
  - [ ] `survivalTime`
  - [ ] `placement`
  - [ ] `placementPoints`
  - [ ] `totalPoints`
- [ ] Stop relying on a single permanent `player.teamId` for match calculations
- [ ] Rebuild player/team aggregations from match-level rows
- [ ] Preserve historical team membership per match

Acceptance:
- If a player appears for Team 14 in one match and Team 13 in the next match, both records remain correct.

### Priority 3 — Duplicate Protection + Reimport Safety

- [ ] Enforce unique match identity by PUBG match ID
- [ ] Enforce unique player identity by PUBG account ID
- [ ] Improve team de-duplication using slot number, canonical name, and normalized source name
- [ ] When a duplicate import is detected, show options:
  - [ ] Update existing data
  - [ ] Overwrite existing data
  - [ ] Cancel import
- [ ] Ensure re-import updates:
  - [ ] Team stats
  - [ ] Player stats
  - [ ] Daily leaderboard
  - [ ] Overall leaderboard
  - [ ] Match views

Acceptance:
- Re-importing the same match never creates duplicate teams, players, match rows, or broken totals.

### Priority 4 — Auto Team Creation

- [ ] Detect teams not already stored during import
- [ ] Create new teams automatically
- [ ] Assign temporary slot numbers when no canonical slot exists
- [ ] Flag new teams for admin review
- [ ] Let admin edit:
  - [ ] Team name
  - [ ] Tag
  - [ ] Slot
  - [ ] Logo
  - [ ] Description

Acceptance:
- If tomorrow the lobby grows from 24 teams to 28 teams, imports still work without manual database setup.

### Priority 5 — PUBG Data Accuracy Rules

- [ ] Never fabricate team, player, or leaderboard stats
- [ ] Show `Data not imported yet` anywhere real imported data is missing
- [ ] Remove remaining competitive placeholders from tournament/result/stat pages
- [ ] Ensure empty-state wording stays consistent across public and admin views

Acceptance:
- No fake tournament statistics appear anywhere in production.

## Tournament Operation Features

### Priority 6 — Match Result Structure

- [ ] Build day result pages with:
  - [ ] Day summary
  - [ ] Match 1 / Match 2 / Match 3 / Match 4 grouping
- [ ] Build per-match result view showing:
  - [ ] Placement table
  - [ ] Team kills
  - [ ] Placement points
  - [ ] Kill points
  - [ ] Total points
  - [ ] MVP
  - [ ] Map
- [ ] Link each imported match to its day and scrim/tournament context

Acceptance:
- Admins and viewers can review Day 6 results exactly as a real scrim day with match-by-match breakdown.

### Priority 7 — Daily Leaderboard

- [ ] Generate daily leaderboard automatically from imported matches only
- [ ] Group standings by selected day number
- [ ] Show:
  - [ ] Rank
  - [ ] Slot
  - [ ] Team
  - [ ] Kill points
  - [ ] Placement points
  - [ ] Total points
- [ ] Ensure no manual score entry is required

Acceptance:
- Importing Day 6 Match 1–4 automatically produces the Day 6 leaderboard.

### Priority 8 — Overall Leaderboard

- [ ] Combine all imported days for the active season
- [ ] Recalculate standings after every import
- [ ] Include tie-breaking and slot ordering rules
- [ ] Expose overall standings on tournament and season views

Acceptance:
- Teams can see one always-correct overall table across Day 1 through the latest imported day.

### Priority 9 — Player Leaderboard

- [ ] Build player leaderboard from match-level records
- [ ] Show:
  - [ ] Rank
  - [ ] Player
  - [ ] Team
  - [ ] Kills
  - [ ] Damage
  - [ ] Assists
  - [ ] Matches
- [ ] Add sorting for MVP/rating if needed later

Acceptance:
- Player leaderboard updates automatically after each import without manual edits.

### Priority 10 — Tournament Navigation

- [ ] Finalize tournament page tabs/navigation:
  - [ ] Overview
  - [ ] Results
  - [ ] Match Results
  - [ ] Teams
  - [ ] Players
  - [ ] Statistics
  - [ ] Point System
  - [ ] Daily Leaderboard
  - [ ] Overall Leaderboard
  - [ ] Player Leaderboard
- [ ] Ensure each tab is driven by real stored data

Acceptance:
- Each tournament page acts like a complete competitive operations portal, not just a shell.

## Team + Player History Features

### Priority 11 — Player Transfer Workflow

- [ ] Detect mismatch between stored current team and imported match team
- [ ] Show warning in import review:
  - [ ] Match only
  - [ ] Transfer from today
  - [ ] Transfer from tomorrow
  - [ ] Review later
- [ ] Persist transfer decisions
- [ ] Preserve older team history

Acceptance:
- Team changes are intentional, reviewable, and historically correct.

### Priority 12 — Team Page

- [ ] Finalize team profile page to show:
  - [ ] Logo
  - [ ] Team name
  - [ ] Slot number
  - [ ] Current roster
  - [ ] Previous players
  - [ ] Team statistics
  - [ ] Tournament/day results
  - [ ] Match history

Acceptance:
- Every team page clearly reflects current roster plus historical performance.

### Priority 13 — Player Page

- [ ] Finalize player profile page to show:
  - [ ] PUBG name
  - [ ] PUBG ID
  - [ ] Current team
  - [ ] Team history
  - [ ] Match history
  - [ ] Kills
  - [ ] Damage
  - [ ] Assists
  - [ ] MVP awards

Acceptance:
- Player pages show both current status and historical cross-team activity.

## Workflow + Permissions

### Priority 14 — IGL Dashboard

- [ ] Add IGL authentication/login flow
- [ ] Add team-scoped dashboard for IGL users
- [ ] Allow IGLs to request:
  - [ ] Add player
  - [ ] Remove player
  - [ ] Change PUBG ID
  - [ ] Change PUBG name
  - [ ] Change team name
  - [ ] Change team logo
- [ ] Prevent direct write-through to production records

Acceptance:
- IGLs can manage requests without bypassing admin control.

### Priority 15 — Admin Approval Center

- [ ] Create request model and Firestore collection
- [ ] Build admin approval queue
- [ ] Add approve/reject actions
- [ ] Apply approved changes automatically to stored data
- [ ] Keep audit trail of reviewed requests

Acceptance:
- All IGL-side changes pass through a clear admin approval workflow.

## Recommended Implementation Order

### Phase 1 — Core Tournament Operations

- [ ] Import preview workflow
- [ ] Match-level roster history
- [ ] Duplicate protection
- [ ] Auto team creation
- [ ] Accuracy/empty-state cleanup

### Phase 2 — Competitive Output Pages

- [ ] Match result structure
- [ ] Daily leaderboard
- [ ] Overall leaderboard
- [ ] Player leaderboard
- [ ] Tournament navigation tabs

### Phase 3 — Team/Player History

- [ ] Transfer workflow
- [ ] Team profile completion
- [ ] Player profile completion

### Phase 4 — Access Control Workflows

- [ ] IGL dashboard
- [ ] Admin approval center

## Immediate Next Sprint

This is the best next build order for the codebase:

1. Add preview-only import endpoint and preview state in `PubgImportManager`
2. Add `matchPlayers` collection and persist match-level player rows during import
3. Add duplicate/reimport decision handling
4. Rebuild daily, overall, and player leaderboard aggregation on top of match-level rows
5. Finish day/match results pages using imported match structure

## Definition Of Done

The platform is production-ready only when:

- Admin can fetch PUBG matches by player name
- Admin can preview matches before saving
- Imported matches create/update teams and players safely
- Match-level roster history is preserved
- Duplicate imports do not corrupt data
- Daily, overall, and player leaderboards auto-update from real imports
- Team and player pages reflect real historical records
- IGL requests flow through admin approval
- No fake competitive data appears anywhere
