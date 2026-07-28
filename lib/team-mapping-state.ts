export type TeamMappingState = "mapped" | "unmapped" | "pending_review" | "role_missing" | "conflict" | "disabled";

export type TeamMappingRecord = {
  mapping_status?: string | null;
  enabled?: boolean | null;
};

export function resolveTeamMappingState(mappings: readonly TeamMappingRecord[]): TeamMappingState {
  if (mappings.length === 0) return "unmapped";

  const statuses = mappings.map((mapping) => mapping.mapping_status?.trim().toLowerCase() ?? "");

  if (statuses.some((status) => status === "conflict" || status === "duplicate")) {
    return "conflict";
  }

  if (statuses.some((status) => status === "role_missing" || status === "missing")) {
    return "role_missing";
  }

  if (statuses.some((status) => status === "pending" || status === "pending_review" || status === "suggested")) {
    return "pending_review";
  }

  if (mappings.every((mapping) => mapping.enabled === false)) {
    return "disabled";
  }

  if (
    mappings.some(
      (mapping) =>
        mapping.enabled !== false &&
        ["mapped", "verified", "approved", "active", "resolved"].includes(mapping.mapping_status?.trim().toLowerCase() ?? ""),
    )
  ) {
    return "mapped";
  }

  return "pending_review";
}
