import {
  resolveApprovedDiscordRole,
  resolveDiscordMemberRoles,
  resolveDiscordRoleIds,
  type DiscordRoleMapping,
} from "../lib/discord-role-mapping";

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

const dynamicMappings: DiscordRoleMapping[] = [
  {
    roleId: "igl",
    mappingType: "team_function",
    appRole: "team_igl",
    enabled: true,
  },
  {
    roleId: "coach",
    mappingType: "team_function",
    appRole: "coach",
    enabled: true,
  },
  {
    roleId: "player",
    mappingType: "team_function",
    appRole: "player",
    enabled: true,
  },
  {
    roleId: "m8",
    mappingType: "team_identity",
    teamId: "team-m8",
    enabled: true,
  },
  {
    roleId: "haku",
    mappingType: "team_identity",
    teamId: "team-haku",
    enabled: true,
  },
  {
    roleId: "n3p",
    mappingType: "team_identity",
    teamId: "team-n3p",
    enabled: true,
  },
  { roleId: "registered", mappingType: "verification", enabled: true },
  { roleId: "banned", mappingType: "deny", denyAccess: true, enabled: true },
];

const m8Igl = resolveDiscordMemberRoles(["igl", "m8", "registered"], dynamicMappings);
if (m8Igl.primaryRole !== "team_igl" || m8Igl.teamId !== "team-m8" || m8Igl.teamState !== "resolved") {
  throw new Error("IGL + M8 must resolve to the M8 team IGL.");
}
const hakuCoach = resolveDiscordMemberRoles(["coach", "haku"], dynamicMappings);
if (hakuCoach.primaryRole !== "coach" || hakuCoach.teamId !== "team-haku") {
  throw new Error("Coach + Team HAKU must resolve to the Team HAKU coach.");
}
const n3pPlayer = resolveDiscordMemberRoles(["player", "n3p"], dynamicMappings);
if (n3pPlayer.primaryRole !== "player" || n3pPlayer.teamId !== "team-n3p") {
  throw new Error("Player + N3P must resolve to the N3P player.");
}
const missingTeam = resolveDiscordMemberRoles(["igl", "registered"], dynamicMappings);
if (missingTeam.teamState !== "missing" || missingTeam.teamId !== null) {
  throw new Error("A function role without a team identity must not gain team access.");
}
const ambiguousTeam = resolveDiscordMemberRoles(["igl", "m8", "haku"], dynamicMappings);
if (ambiguousTeam.teamState !== "ambiguous" || ambiguousTeam.teamId !== null) {
  throw new Error("Two distinct team identities must be blocked as ambiguous.");
}
const bannedAdmin = resolveDiscordMemberRoles(
  ["banned", "10"],
  [...dynamicMappings, { roleId: "10", mappingType: "access", appRole: "admin", enabled: true }],
);
if (!bannedAdmin.denied) throw new Error("A deny role must override an admin role.");

const futureTeamMappings: DiscordRoleMapping[] = [
  ...dynamicMappings,
  {
    roleId: "future-role-2027",
    mappingType: "team_identity",
    teamId: "future-team-id",
    enabled: true,
  },
];
const futureTeam = resolveDiscordMemberRoles(["coach", "future-role-2027"], futureTeamMappings);
if (futureTeam.teamId !== "future-team-id" || futureTeam.primaryRole !== "coach") {
  throw new Error("New teams must resolve from database mappings without a code-level team list.");
}

console.log(
  "Discord role mapping, team resolution, conflict denial, future-team support, admin approval, and super-admin protection QA passed.",
);
