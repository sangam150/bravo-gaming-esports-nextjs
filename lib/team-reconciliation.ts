import { createHash } from "node:crypto";

export function normalizeCanonicalTeamIdentity(value: string) {
  return value.normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export function deterministicTeamId(sourceType: string, sourceIdentifier: string) {
  const digest = createHash("sha256")
    .update(`bravo-team-registry:${sourceType}:${sourceIdentifier}`)
    .digest("hex")
    .slice(0, 32);
  return `${digest.slice(0, 8)}-${digest.slice(8, 12)}-5${digest.slice(13, 16)}-a${digest.slice(17, 20)}-${digest.slice(20)}`;
}
