import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  DEFAULT_PLAYER_TEAM_LINK_MATCH_THRESHOLD,
  evaluatePlayerTeamLink,
  isExactPlayerTeamEvidenceSuppressed,
  isPlayerTeamLinkingMigrationUnavailableError,
  shouldEndAutoLinkedMembershipForEvidence,
  shouldProvisionPlayerProfile,
  type PlayerTeamLinkObservation,
} from "../lib/player-team-link-policy";

function appearance(matchNumber: number, overrides: Partial<PlayerTeamLinkObservation> = {}): PlayerTeamLinkObservation {
  return {
    matchId: `match-${matchNumber}`,
    matchStatus: "published",
    publishedAt: `2026-07-${String(matchNumber).padStart(2, "0")}T12:00:00Z`,
    pubgAccountId: "account.test",
    teamId: "team-a",
    slotNumber: 7,
    teamIsActive: true,
    eligibility: "eligible",
    ...overrides,
  };
}

const fourMatches = Array.from({ length: 4 }, (_, index) => appearance(index + 1));
const fourthMatchResult = evaluatePlayerTeamLink(fourMatches, null);
assert.equal(fourthMatchResult.status, "pending");
assert.equal(shouldProvisionPlayerProfile(fourthMatchResult), false, "a profile is not provisioned before the fifth match");

const fiveMatches = [...fourMatches, appearance(5)];
const fifthMatchResult = evaluatePlayerTeamLink(fiveMatches, null);
assert.equal(fifthMatchResult.status, "qualified");
assert.equal(fifthMatchResult.qualifyingMatchCount, DEFAULT_PLAYER_TEAM_LINK_MATCH_THRESHOLD);
assert.equal(shouldProvisionPlayerProfile(fifthMatchResult), true, "the fifth qualifying match permits profile provisioning");
const pendingReviewResult = evaluatePlayerTeamLink(fiveMatches, null, 5, "pending_review");
assert.equal(pendingReviewResult.status, "pending_review");
assert.equal(shouldProvisionPlayerProfile(pendingReviewResult), true, "pending mode provisions the fifth-match profile for review");

assert.equal(evaluatePlayerTeamLink(fiveMatches, "team-a").status, "qualified", "same-team reconciliation is idempotent");
assert.equal(evaluatePlayerTeamLink(fiveMatches, "team-b").status, "conflict", "a different current team requires review");

assert.equal(
  shouldEndAutoLinkedMembershipForEvidence(4, { autoLinked: true, source: "match_history" }),
  true,
  "an automatic match-history membership ends when evidence falls below five",
);
assert.equal(
  shouldEndAutoLinkedMembershipForEvidence(0, { autoLinked: true, source: "match_history" }),
  true,
  "an automatic match-history membership ends when all evidence disappears",
);
assert.equal(
  shouldEndAutoLinkedMembershipForEvidence(4, { autoLinked: false, source: "admin_review" }),
  false,
  "evidence loss must not silently end an admin-approved membership",
);
assert.equal(
  shouldEndAutoLinkedMembershipForEvidence(5, { autoLinked: true, source: "match_history" }),
  false,
  "five qualifying matches preserve an automatic membership",
);

const exactEvidence = {
  pubgAccountId: "account.test",
  teamId: "team-a",
  slotNumber: 7,
  qualifyingMatchIds: fiveMatches.map((match) => match.matchId),
};
const manualUnlinkSuppression = [{ ...exactEvidence, qualifyingMatchIds: [...exactEvidence.qualifyingMatchIds].reverse() }];
assert.equal(
  isExactPlayerTeamEvidenceSuppressed(exactEvidence, manualUnlinkSuppression),
  true,
  "a durable manual-unlink snapshot suppresses the same evidence regardless of array order",
);
assert.equal(
  isExactPlayerTeamEvidenceSuppressed(
    { ...exactEvidence, qualifyingMatchIds: [...exactEvidence.qualifyingMatchIds, "match-6"] },
    manualUnlinkSuppression,
  ),
  false,
  "materially changed evidence is not mistaken for the manually suppressed snapshot",
);
assert.equal(
  isExactPlayerTeamEvidenceSuppressed({ ...exactEvidence, slotNumber: 8 }, manualUnlinkSuppression),
  false,
  "suppression is scoped to the detected team slot",
);

const invalidRows: PlayerTeamLinkObservation[] = [
  appearance(6, { matchStatus: "pending", publishedAt: null }),
  appearance(7, { matchDeletedAt: "2026-07-28T00:00:00Z" }),
  appearance(8, { eligibility: "substitute" }),
  appearance(9, { eligibility: "rejected" }),
  appearance(10, { eligibility: "ambiguous" }),
  appearance(11, { pubgAccountId: null }),
  appearance(12, { teamIsActive: false }),
  appearance(13, { teamId: null }),
  appearance(14, { slotNumber: null }),
];
assert.equal(evaluatePlayerTeamLink([...fourMatches, ...invalidRows], null).status, "pending");

const duplicateMatch = [appearance(5), appearance(5)];
assert.equal(
  evaluatePlayerTeamLink([...fourMatches, ...duplicateMatch], null).status,
  "pending",
  "duplicate rows from one match do not qualify",
);
assert.equal(
  evaluatePlayerTeamLink([...fourMatches, appearance(5), appearance(5, { eligibility: "rejected" })], null).status,
  "pending",
  "a rejected duplicate still invalidates that match for linking",
);

const wrongSlot = appearance(5, { slotNumber: 8 });
assert.equal(evaluatePlayerTeamLink([...fourMatches, wrongSlot], null).status, "pending", "slot changes reset the five-match group");

const wrongTeam = appearance(5, { teamId: "team-b" });
assert.equal(evaluatePlayerTeamLink([...fourMatches, wrongTeam], null).status, "pending", "team changes reset the five-match group");

const twoQualifiedGroups = [
  ...Array.from({ length: 5 }, (_, index) => appearance(index + 1)),
  ...Array.from({ length: 5 }, (_, index) =>
    appearance(index + 11, {
      teamId: "team-b",
      slotNumber: 9,
    }),
  ),
];
assert.equal(evaluatePlayerTeamLink(twoQualifiedGroups, null).status, "conflict", "multiple independently qualified groups require review");

assert.equal(
  evaluatePlayerTeamLink(
    Array.from({ length: 5 }, (_, index) => appearance(index + 1, { pubgAccountId: null })),
    null,
  ).status,
  "ineligible",
  "name-only appearances never qualify",
);

assert.equal(isPlayerTeamLinkingMigrationUnavailableError({ code: "PGRST202" }), true);
assert.equal(isPlayerTeamLinkingMigrationUnavailableError({ code: "42883" }), true);
assert.equal(isPlayerTeamLinkingMigrationUnavailableError({ message: "Could not find the function in the schema cache" }), true);
assert.equal(isPlayerTeamLinkingMigrationUnavailableError({ code: "23505", message: "duplicate key" }), false);

const competitionSource = readFileSync("lib/competition-relational.ts", "utf8");
const existingPlayerResolver = competitionSource.slice(
  competitionSource.indexOf("function findExistingPlayer"),
  competitionSource.indexOf("async function getMatchRows"),
);
assert.doesNotMatch(existingPlayerResolver, /\.from\("players"\)\.insert/, "first appearance must not create a player profile");
assert.doesNotMatch(
  competitionSource,
  /current_team_id:\s*resolvedTeamId/,
  "match publication must not directly assign the player's current team",
);

const migrationSource = readFileSync("supabase/migrations/022_player_team_match_history_linking.sql", "utf8");
const migrationWithoutComments = migrationSource.replace(/--.*$/gm, "");
assert.match(
  migrationSource,
  /create table if not exists private\.canonical_team_identity_claims[\s\S]*normalized_identity text primary key[\s\S]*team_id uuid not null references public\.teams\(id\) on delete cascade/,
  "canonical team identities must be claimed in one private table so every cross-field collision shares a uniqueness boundary",
);
assert.match(
  migrationSource,
  /identity_sources <@ array\['name', 'tag', 'slug', 'alias'\]::text\[\]/,
  "identity claims must record every resolver identity source",
);
assert.match(
  migrationSource,
  /create or replace function private\.get_canonical_team_identity_candidates[\s\S]*'name'::text[\s\S]*'tag'::text[\s\S]*'slug'::text[\s\S]*'alias'::text[\s\S]*coalesce\(alias_record\.alias, alias_record\.previous_name, alias_record\.previous_tag, alias_record\.previous_slug\)/,
  "database identity candidates must match canonical team names, tags, slugs, and effective aliases",
);
assert.match(
  migrationSource,
  /lock table public\.teams, public\.team_aliases in share row exclusive mode[\s\S]*having count\(distinct identity_record\.team_id\) > 1[\s\S]*active canonical team name\/tag\/slug\/alias identities collide after normalization/,
  "migration must block concurrent team and alias writes and fail clearly when any existing active identity collides",
);
assert.match(
  migrationSource,
  /drop index if exists public\.teams_name_lower_unique_idx[\s\S]*where deleted_at is null[\s\S]*archived_at is null[\s\S]*merged_into_team_id is null[\s\S]*is_active[\s\S]*lower\(btrim\(status\)\) = 'active'/,
  "legacy name uniqueness must be replaced with lifecycle-aware active-team uniqueness",
);
const canonicalIdentityGuard = migrationSource.slice(
  migrationSource.indexOf("create or replace function private.refresh_active_canonical_team_identity_claims"),
  migrationSource.indexOf("alter table public.match_player_results"),
);
assert.match(
  canonicalIdentityGuard,
  /security definer[\s\S]*set search_path = ''/,
  "the identity guard must use a hardened security-definer context",
);
assert.match(
  canonicalIdentityGuard,
  /delete from private\.canonical_team_identity_claims[\s\S]*team_record\.deleted_at is null[\s\S]*team_record\.archived_at is null[\s\S]*team_record\.merged_into_team_id is null[\s\S]*team_record\.is_active[\s\S]*team_record\.status/,
  "archived, merged, deleted, and inactive teams must release claims without deleting their team records",
);
assert.match(
  canonicalIdentityGuard,
  /from private\.get_canonical_team_identity_candidates\(target_team_id\) candidate[\s\S]*group by candidate\.normalized_identity[\s\S]*when unique_violation/,
  "one atomic guard insert must claim all candidate identities and reject concurrent cross-field collisions",
);
assert.match(
  canonicalIdentityGuard,
  /after update of name, tag, slug, status, is_active, archived_at, merged_into_team_id, deleted_at on public\.teams/,
  "all team identity and lifecycle changes must refresh claims",
);
assert.match(
  canonicalIdentityGuard,
  /after insert on public\.team_aliases[\s\S]*after update of team_id, alias, normalized_alias, previous_name, previous_tag, previous_slug on public\.team_aliases[\s\S]*after delete on public\.team_aliases/,
  "alias insertion, identity updates, owner moves, and deletion must refresh claims",
);
assert.match(
  migrationSource,
  /alter table private\.canonical_team_identity_claims enable row level security[\s\S]*revoke all on table private\.canonical_team_identity_claims from public, anon, authenticated[\s\S]*grant select, insert, update, delete on table private\.canonical_team_identity_claims to service_role/,
  "identity claims must remain private and service-role managed",
);

const canonicalTeamSource = readFileSync("lib/canonical-teams.ts", "utf8");
assert.match(
  canonicalTeamSource,
  /assertCanonicalTeamIdentitiesAvailable\(id,[\s\S]*proposed\.name[\s\S]*proposed\.tag[\s\S]*proposed\.slug[\s\S]*current\.aliases/,
  "team updates must validate their complete proposed identity set",
);
assert.match(
  canonicalTeamSource,
  /assertCanonicalTeamIdentitiesAvailable\(null, \[name, input\.tag, slug\]\)/,
  "team creation must validate name, tag, and slug before writing",
);
assert.match(
  canonicalTeamSource,
  /assertCanonicalTeamIdentitiesAvailable\(teamId, \[alias\]\)/,
  "alias writes must share canonical identity validation",
);
assert.match(
  canonicalTeamSource,
  /code === "23505"[\s\S]*canonical_team_identity_conflict/,
  "database race conflicts must become a stable application-level 409",
);
assert.match(
  canonicalTeamSource,
  /`team-logo:\$\{teamId\}:\$\{normalizedAlias\}`/,
  "manual alias source identities must be team-scoped so historical aliases are never transferred",
);

const registrationApprovalSource = readFileSync("lib/registration-approval.ts", "utf8");
assert.match(
  registrationApprovalSource,
  /const identityCandidates = \(await listCanonicalAdminTeams\(\)\)\.filter[\s\S]*const canonicalCandidates = identityCandidates\.filter\(isActiveCanonicalTeam\)[\s\S]*if \(identityCandidates\.length > 0\)[\s\S]*canonical_team_unavailable/,
  "registration matching must prefer active identity owners while preserving explicit reconciliation for historical-only matches",
);
assert.doesNotMatch(
  migrationWithoutComments,
  /\b(?:from|join|insert\s+into|update|delete\s+from)\s+public\.team_memberships\b/i,
  "competitive linking must not use authorization team memberships",
);
assert.match(migrationSource, /pg_advisory_xact_lock/, "reconciliation must serialize concurrent account updates");
assert.match(
  migrationSource,
  /revoke all on function public\.reconcile_player_team_link_for_account\(text\) from public, anon, authenticated/,
  "reconciliation RPC must be service-only",
);
assert.match(
  migrationSource,
  /create table if not exists private\.player_team_link_suppressions/,
  "manual unlink must create a durable private suppression record",
);
assert.match(
  migrationSource,
  /suppression\.qualifying_match_ids @> candidate_match_ids[\s\S]*suppression\.qualifying_match_ids <@ candidate_match_ids[\s\S]*cardinality\(suppression\.qualifying_match_ids\) = cardinality\(candidate_match_ids\)/,
  "reconciliation must suppress an unchanged evidence snapshot regardless of UUID-array order",
);
assert.match(
  migrationSource,
  /active_membership\.auto_linked[\s\S]*active_membership\.source = 'match_history'/,
  "evidence loss may end only an automatic match-history membership",
);
assert.match(migrationSource, /'player_team_auto_membership_ended'/, "automatic evidence-loss termination must be audited");
assert.match(
  migrationSource,
  /where id = active_membership\.roster_history_id/,
  "evidence loss must end only roster history owned by the automatic membership",
);
assert.match(
  migrationSource,
  /and active_membership\.assigned_current_team/,
  "evidence loss must clear the public team projection only when the automatic membership assigned it",
);
assert.match(
  migrationSource,
  /other_roster\.id is distinct from active_membership\.roster_history_id/,
  "evidence loss must preserve a team projection backed by unrelated active roster history",
);
assert.match(
  migrationSource,
  /from private\.player_team_memberships membership[\s\S]*where membership\.status = 'active' and membership\.auto_linked/,
  "full recalculation must revisit active automatic memberships even after all match rows disappear",
);
assert.match(
  migrationSource,
  /not active_membership\.auto_linked[\s\S]*active_membership\.source <> 'match_history'[\s\S]*'manual_membership_preserved'/,
  "reconciliation must preserve a manually approved membership without rewriting its evidence or slot",
);
assert.match(
  migrationSource,
  /review_note = 'Automatically closed because the qualifying evidence changed\.[\s\S]*evidence_record\.qualifying_match_ids = review_record\.qualifying_match_ids/,
  "pending reviews must be invalidated when their exact qualifying evidence is no longer current",
);
const autoLinkReviewClose = migrationSource.slice(
  migrationSource.indexOf("review_note = 'Superseded because the exact reviewed evidence is now linked"),
  migrationSource.indexOf("if membership_created then", migrationSource.indexOf("review_note = 'Superseded because")),
);
assert.match(
  autoLinkReviewClose,
  /proposed_team_id = candidate_team_id[\s\S]*proposed_slot_number = candidate_slot[\s\S]*qualifying_match_ids = candidate_match_ids[\s\S]*status = 'pending'/,
  "auto-linking must close every pending review for the exact evidence that was linked",
);
assert.doesNotMatch(
  autoLinkReviewClose,
  /reason = 'activation_required'/,
  "resolved ambiguity and conflict reviews must not remain actionable after their exact evidence auto-links",
);

const reviewFunction = migrationSource.slice(
  migrationSource.indexOf("create or replace function public.review_player_team_link"),
  migrationSource.indexOf(
    "create or replace function public.unlink_player_team_membership",
    migrationSource.indexOf("create or replace function public.review_player_team_link"),
  ),
);
assert.match(
  reviewFunction,
  /perform public\.reconcile_player_team_link_for_account\(review_account_id\);[\s\S]*where id = target_review_id[\s\S]*for update/,
  "a review must recalculate and then lock the current review before accepting a decision",
);
assert.match(
  reviewFunction,
  /from private\.player_team_link_settings settings_record[\s\S]*'reason', 'player_team_linking_disabled'[\s\S]*perform public\.reconcile_player_team_link_for_account\(review_account_id\)/,
  "review decisions must be blocked while player/team linking is disabled",
);
assert.match(
  reviewFunction,
  /'status', 'stale_review'[\s\S]*'reason', 'review_replaced_after_recalculation'[\s\S]*'status', 'stale_review'[\s\S]*'reason', 'review_no_longer_pending'/,
  "stale review detection must return safely so the recalculated review state is committed",
);
assert.match(
  reviewFunction,
  /if decision in \('mark_substitute', 'reject'\) then[\s\S]*perform public\.reconcile_player_team_link_for_account\(review_record\.pubg_account_id\)/,
  "eligibility decisions must immediately reconcile any newly unambiguous evidence",
);

const unlinkFunction = migrationSource.slice(
  migrationSource.indexOf("create or replace function public.unlink_player_team_membership"),
  migrationSource.indexOf(
    "revoke all on function public.reconcile_player_team_link_for_account",
    migrationSource.indexOf("create or replace function public.unlink_player_team_membership"),
  ),
);
const suppressionInsertPosition = unlinkFunction.indexOf("insert into private.player_team_link_suppressions");
const membershipRevokePosition = unlinkFunction.indexOf("set status = 'revoked'");
assert.notEqual(suppressionInsertPosition, -1, "manual unlink must contain a suppression insert");
assert.notEqual(membershipRevokePosition, -1, "manual unlink must revoke the active membership");
assert.ok(suppressionInsertPosition < membershipRevokePosition, "manual unlink must persist suppression before revoking the membership");
assert.match(
  unlinkFunction,
  /where id = membership_record\.roster_history_id/,
  "manual unlink must not close unrelated roster-history rows",
);
assert.match(
  unlinkFunction,
  /other_roster\.id is distinct from membership_record\.roster_history_id/,
  "manual unlink must preserve unrelated active roster ownership",
);

for (const routePath of [
  "app/api/admin/player-team-linking/route.ts",
  "app/api/admin/player-team-linking/recalculate/route.ts",
  "app/api/admin/player-team-linking/reviews/[id]/route.ts",
  "app/api/admin/player-team-linking/memberships/[id]/route.ts",
]) {
  const routeSource = readFileSync(routePath, "utf8");
  assert.match(routeSource, /requireSameOrigin\(request\)/, `${routePath} must enforce same-origin mutations`);
}

console.log("Player-team linking policy checks passed.");
