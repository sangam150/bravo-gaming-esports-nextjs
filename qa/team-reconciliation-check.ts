import assert from "node:assert/strict";
import { deterministicTeamId, normalizeCanonicalTeamIdentity } from "../lib/team-reconciliation";

function canAuthorizeTeam(input: {
  relationalFeatureEnabled: boolean;
  denied: boolean;
  teamState: "missing" | "ambiguous" | "resolved";
  mappedTeamId: string | null;
  profileTeamId: string | null;
  membershipTeamId: string | null;
  membershipActive: boolean;
  teamActive: boolean;
}) {
  return Boolean(
    input.relationalFeatureEnabled &&
    !input.denied &&
    input.teamState === "resolved" &&
    input.mappedTeamId &&
    input.mappedTeamId === input.profileTeamId &&
    input.mappedTeamId === input.membershipTeamId &&
    input.membershipActive &&
    input.teamActive
  );
}

const m8Id = deterministicTeamId("compatibility_team", "m8");
assert.equal(m8Id, deterministicTeamId("compatibility_team", "m8"), "reruns must preserve UUID");
assert.notEqual(m8Id, deterministicTeamId("discord_role", "m8"), "source namespaces must not collide");
assert.match(m8Id, /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);

assert.equal(normalizeCanonicalTeamIdentity("Near Edge Protocol / N3P"), "nearedgeprotocoln3p");
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
