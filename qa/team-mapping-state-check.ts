import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolveTeamMappingState } from "../lib/team-mapping-state";

assert.equal(resolveTeamMappingState([]), "unmapped");
assert.equal(resolveTeamMappingState([{ enabled: true, mapping_status: "verified" }]), "mapped");
assert.equal(resolveTeamMappingState([{ enabled: false, mapping_status: "verified" }]), "disabled");
assert.equal(resolveTeamMappingState([{ enabled: true, mapping_status: "pending_review" }]), "pending_review");
assert.equal(resolveTeamMappingState([{ enabled: true, mapping_status: "role_missing" }]), "role_missing");
assert.equal(
  resolveTeamMappingState([
    { enabled: true, mapping_status: "verified" },
    { enabled: true, mapping_status: "conflict" },
  ]),
  "conflict",
);

const accessRouteSource = readFileSync(new URL("../app/api/admin/teams/[id]/access/route.ts", import.meta.url), "utf8");
assert.match(accessRouteSource, /requirePlatformAdmin\(request\)/);
assert.match(accessRouteSource, /requireSameOrigin\(request\)/);
assert.match(accessRouteSource, /writeRequiredAuditLogFromRequest\(request/);
assert.match(accessRouteSource, /profile\.team_id && profile\.team_id !== team\.id/);
assert.match(accessRouteSource, /PROTECTED_PLATFORM_ROLES/);

const discordLinkRouteSource = readFileSync(new URL("../app/api/admin/discord-links/route.ts", import.meta.url), "utf8");
assert.match(discordLinkRouteSource, /requirePlatformAdmin\(request\)/);
assert.match(discordLinkRouteSource, /requireSameOrigin\(request\)/);
assert.match(discordLinkRouteSource, /writeRequiredAuditLogFromRequest\(request/);
assert.match(discordLinkRouteSource, /\\d\{15,22\}/);

console.log("Team mapping-state checks passed.");
