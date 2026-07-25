import assert from "node:assert/strict";
import {
  canAuthorizeTeam,
  canResolveCandidate,
  deterministicTeamId,
  normalizeTeamIdentity,
} from "../lib/team-reconciliation";

const m8Id = deterministicTeamId("compatibility_team", "m8");
assert.equal(m8Id, deterministicTeamId("compatibility_team", "m8"), "reruns must preserve UUID");
assert.notEqual(m8Id, deterministicTeamId("discord_role", "m8"), "source namespaces must not collide");
assert.match(m8Id, /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);

assert.equal(normalizeTeamIdentity("Near Edge Protocol / N3P"), "nearedgeprotocoln3p");
assert.equal(canResolveCandidate({ ownerConfirmed: false, conflictWarnings: [], action: "create_new" }), false);
assert.equal(canResolveCandidate({ ownerConfirmed: true, conflictWarnings: ["similar_name"], action: "create_new" }), true);

const baseAuthorization = {
  relationalFeatureEnabled: true,
  denied: false,
  teamState: "resolved" as const,
  mappedTeamId: m8Id,
  profileTeamId: m8Id,
  membershipTeamId: m8Id,
  membershipActive: true,
  teamActive: true,
};
assert.equal(canAuthorizeTeam(baseAuthorization), true);
assert.equal(canAuthorizeTeam({ ...baseAuthorization, profileTeamId: deterministicTeamId("compatibility_team", "team-haku") }), false);
assert.equal(canAuthorizeTeam({ ...baseAuthorization, membershipActive: false }), false);
assert.equal(canAuthorizeTeam({ ...baseAuthorization, teamState: "ambiguous" }), false);
assert.equal(canAuthorizeTeam({ ...baseAuthorization, denied: true }), false);
assert.equal(canAuthorizeTeam({ ...baseAuthorization, teamActive: false }), false);
assert.equal(canAuthorizeTeam({ ...baseAuthorization, relationalFeatureEnabled: false }), false);

console.log("Relational UUID idempotency, owner gate, and Team A/Team B authorization isolation QA passed.");
