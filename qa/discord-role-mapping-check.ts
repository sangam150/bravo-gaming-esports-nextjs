import { resolveApprovedDiscordRole, resolveDiscordRoleIds } from "../lib/discord-role-mapping";

const mappings = [
  { roleId: "10", appRole: "admin" },
  { roleId: "20", appRole: "organizer" },
  { roleId: "30", appRole: "moderator" },
  { roleId: "40", appRole: "team_manager" },
  { roleId: "50", appRole: "team_igl" },
  { roleId: "60", appRole: "coach" },
  { roleId: "70", appRole: "player" },
] as const;

function expectPrimary(roleIds: string[], expected: string) {
  const result = resolveDiscordRoleIds(roleIds, [...mappings]);
  if (result.primaryRole !== expected) throw new Error(`Expected ${expected}, received ${result.primaryRole}.`);
}

expectPrimary(["70", "50"], "team_igl");
expectPrimary(["60", "10"], "admin");
expectPrimary(["70"], "player");
expectPrimary([], "viewer");

const pendingAdmin = resolveApprovedDiscordRole("admin", "viewer", "discord_sync");
if (pendingAdmin.role !== "viewer" || !pendingAdmin.adminApprovalPending) {
  throw new Error("A first-time Discord Admin must remain a viewer pending owner approval.");
}
const approvedAdmin = resolveApprovedDiscordRole("admin", "admin", "manual");
if (approvedAdmin.role !== "admin" || approvedAdmin.adminApprovalPending) {
  throw new Error("A manually approved website admin must remain approved.");
}
const protectedSuperAdmin = resolveApprovedDiscordRole("admin", "super_admin", "manual");
if (protectedSuperAdmin.role !== "super_admin") {
  throw new Error("Discord synchronization must never overwrite a manual super_admin.");
}

console.log("Discord role-ID mapping, priority, admin approval, and super-admin protection QA passed.");
