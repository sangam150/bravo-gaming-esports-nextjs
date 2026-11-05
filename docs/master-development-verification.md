# Master development verification — 5 November 2026

**Overall: incomplete; real staging and production acceptance remain BLOCKED.** This report supersedes the scoring and graphic-library implementation gaps in the 4 November global-production report. Existing work was preserved. No credentials, production records, deployments or remote database schemas were changed.

Latest superseding review: [release-audit.md](release-audit.md). The release pass adds an unapplied atomic result RPC/revision migration 027, fixes legacy MVP preservation, restores historical migration 022 and updates vulnerable dependencies. Historical test results below are retained as evidence of the earlier snapshot.

## Implementation completed in this continuation

- Versioned scoring forms configure placement/kill points, ordered team tie-breaks and ordered MVP criteria. Approved stage configuration supplies defaults for new matches. Saved matches retain their scoring version. Overall/scoped ties use the latest included match's saved tie-break policy; historical point totals are not recalculated by changing defaults.
- Manual result entry selects canonical teams/players and retains IDs. Signed adjustments and disqualifications require public reasons and platform-administrator approval at the API. DQ excludes official points and awards while retaining raw statistics; it does not automatically promote another placement. Published corrections return to draft. Publication requires a fresh preview; ordinary Save Draft explicitly saves draft.
- Migration `026_versioned_scoring_decisions.sql` preserves fractional placement points, adds explicit scoring/decision/damage columns and updates existing publication-safe leaderboard/MVP views. It is **not applied to staging or production**. Its transaction fails on unknown external view dependencies rather than using CASCADE.
- The existing broadcast registry now contains 37 graphics plus program: scoped standings, compact scoreboard, match information, spotlight, sponsor strip, champion/final rankings, player comparison, technical break, analyst panel, starting soon and advancement join the earlier scenes. Champion/final results require an approved completed event and all required scheduled results published. Advancement is provisional until approved completion/publication conditions pass.
- Presentation templates support metric labels and visibility. A private ordered rundown supports selection without automatically taking a scene live. Approved map artwork/thumbnail/annotations are connected; full map-library label/background consumption remains unfinished.
- The existing public tournament page/API now share one approved workspace projection with schedules separated from results, scoped standings, organizer/branding, assigned published announcements and eligible partners. Polling withdraws stale/unpublished results. Private observer notes and draft production settings remain excluded.

## Actual verification

| Check | Result | Scope |
| --- | --- | --- |
| Production build | PASS | Optimized compilation, TypeScript and 147 page-generation tasks; final rerun recorded in `master-build.txt` |
| Existing `npm test` suite | PASS | All 16 configured commands; `master-tests.txt` |
| Lint | PASS | Zero errors; nine existing importer warnings; `master-lint.txt` |
| Broadcast derivation checks | PASS | Registry, scoring, completion/publication/privacy guards; `master-broadcast-unit.txt` |
| Isolated PostgreSQL migration check | PASS | PGlite execution, decimal totals, compatibility views, configured/legacy MVP, DQ, reason constraints and preserved RLS; `master-scoring-sql.txt` |
| Broadcast browser checks | PASS | Nine tests including all 37 modes, bounds, visibility, outage hiding, pagination, assets and server-clock countdown; `master-broadcast-ui.txt` |
| New workflow browser checks | PASS | Three actual-component fixture tests: canonical manual entry/fresh preview, rule sequencing, public schedule/results/scoped standings/withdrawal; `master-workflows.txt` |
| Workspace browser checks | PASS | Four fixture checks during this continuation |
| Auth refresh checks | PASS | Offline checks; `master-auth-refresh.txt` |
| Secret scan | PASS | 516 tracked/candidate files; `master-secrets.txt` |
| Real staging acceptance | BLOCKED | See the complete workflow matrix in [staging-verification.md](staging-verification.md) |

Browser service responses and SQL identities are isolated QA fixtures, never official records or staging evidence. PGlite is an ignored local QA dependency installed under `qa-artifacts/sql-check`; it does not establish Supabase migration compatibility on the target schema. Artifacts reside in ignored `qa-artifacts/`.

## Remaining release gaps

- Real admin sessions, CRUD, uploads, scoring/publication, public data separation and OBS against actual staging records remain untested because required credentials are empty. All 45 real preview requests redirected to Vercel SSO; unkeyed Supabase health returned 401.
- Match-result replacement remains a multi-step relational write, without a single transaction or concurrency guard across all result rows. Required pre-write decision audit is not distributed atomicity. Resolve this before claiming safe concurrent score editing.
- Granular scorekeeper/graphics-only capabilities, every requested organization/jersey/social profile field and all roster/history/substitute workflows are not fully implemented or accepted. Existing broad roles were not silently expanded.
- Some scene wording remains fixed, and map-library label/background wiring is incomplete. Full operator editing of every requested field is not certified.
- Review migration 026 against the actual staging schema and backups, then apply only through an explicitly authorized staging workflow. Complete real acceptance and sustained OBS testing before release approval. No production merge or deployment has occurred.

New or materially extended files in this continuation include `lib/scoring-rules.ts`, scoring/ranking/standings/relational/public-match modules, `lib/tournament-workspace.ts`, broadcast/template/event-production modules, manual result/scoring sequence editors, existing event/template/control-room editors, broadcast extended graphics/scenes/styles, tournament client/page/API, match/point-system/announcement APIs, migration 026 and the scoring/master-workflow QA checks. This is not an inventory of all pre-existing working-tree changes.
