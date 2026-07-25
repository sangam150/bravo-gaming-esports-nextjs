import { createHash } from "node:crypto";

export function normalizeTeamIdentity(value: string) {
  return value.normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export function deterministicTeamId(sourceType: string, sourceIdentifier: string) {
  const digest = createHash("sha256")
    .update(`bravo-team-registry:${sourceType}:${sourceIdentifier}`)
    .digest("hex")
    .slice(0, 32);
  return `${digest.slice(0, 8)}-${digest.slice(8, 12)}-5${digest.slice(13, 16)}-a${digest.slice(17, 20)}-${digest.slice(20)}`;
}

export function canResolveCandidate(input: {
  ownerConfirmed: boolean;
  conflictWarnings: string[];
  action: string;
}) {
  return (
    input.ownerConfirmed &&
    ["create_new", "link_existing", "historical_only", "archive"].includes(input.action)
  );
}

export function canAuthorizeTeam(input: {
  relationalFeatureEnabled: boolean;
  denied: boolean;
  teamState: "missing" | "ambiguous" | "resolved";
  mappedTeamId: string | null;
  profileTeamId: string | null;
  membershipTeamId: string | null;
  membershipActive: boolean;
  teamActive: boolean;
}) {
  if (!input.relationalFeatureEnabled) return false;
  return Boolean(
    !input.denied &&
    input.teamState === "resolved" &&
    input.mappedTeamId &&
    input.mappedTeamId === input.profileTeamId &&
    input.mappedTeamId === input.membershipTeamId &&
    input.membershipActive &&
    input.teamActive
  );
}
