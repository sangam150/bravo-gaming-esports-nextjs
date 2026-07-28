import "server-only";

import type { Json } from "@/types/database.types";
import { isPlayerTeamLinkingMigrationUnavailableError } from "./player-team-link-policy";
import { logServerError } from "./server-monitoring";
import { getSupabaseServiceRoleClient } from "./supabase/service-role-client";

export type PlayerTeamLinkSettings = {
  enabled: boolean;
  requiredMatchCount: number;
  requireSameSlot: boolean;
  activationMode: "global" | "allowlist";
  membershipMode: "auto_activate" | "pending_review";
  allowedEventIds: string[];
  allowedSeasonIds: string[];
};

export type PlayerTeamLinkRpcResult = Json;

declare global {
  var __bravoPlayerTeamLinkMigrationWarningLogged: boolean | undefined;
}

async function migrationUnavailableResult(): Promise<Json> {
  if (!globalThis.__bravoPlayerTeamLinkMigrationWarningLogged) {
    globalThis.__bravoPlayerTeamLinkMigrationWarningLogged = true;
    await logServerError(
      "player-team-linking.unavailable",
      new Error("Migration 022 is not applied; automatic player/team linking is safely disabled."),
      undefined,
      { migration: "022_player_team_match_history_linking.sql" },
    );
  }
  return {
    status: "unavailable",
    reason: "player_team_linking_migration_not_applied",
  };
}

export function isPlayerTeamLinkingUnavailableResult(value: Json) {
  return value !== null && typeof value === "object" && !Array.isArray(value) && value.status === "unavailable";
}

export function isPlayerTeamLinkReviewStaleResult(value: Json) {
  return value !== null && typeof value === "object" && !Array.isArray(value) && value.status === "stale_review";
}

async function reconcilePlayerTeamLinkForAccount(pubgAccountId: string): Promise<PlayerTeamLinkRpcResult> {
  const normalizedAccountId = pubgAccountId.trim();
  if (!normalizedAccountId) {
    return { status: "ineligible", reason: "missing_pubg_account_id" };
  }

  const client = getSupabaseServiceRoleClient();
  const { data, error } = await client.rpc("reconcile_player_team_link_for_account", {
    target_pubg_account_id: normalizedAccountId,
  });
  if (error) {
    if (isPlayerTeamLinkingMigrationUnavailableError(error)) {
      return migrationUnavailableResult();
    }
    throw error;
  }
  return data;
}

export async function reconcilePlayerTeamLinksForAccounts(pubgAccountIds: readonly string[]) {
  const uniqueAccountIds = Array.from(new Set(pubgAccountIds.map((value) => value.trim().toLowerCase()).filter(Boolean)));

  const results: PlayerTeamLinkRpcResult[] = [];
  for (const accountId of uniqueAccountIds) {
    try {
      results.push(await reconcilePlayerTeamLinkForAccount(accountId));
    } catch (error) {
      await logServerError("player-team-linking.reconcile", error, undefined, {
        pubgAccountId: accountId,
        matchPublishingContinued: true,
      });
      results.push({
        status: "error",
        pubgAccountId: accountId,
        reason: "reconciliation_failed",
      });
    }
  }
  return results;
}

export async function recalculatePlayerTeamLinks(pubgAccountId?: string | null): Promise<PlayerTeamLinkRpcResult> {
  const client = getSupabaseServiceRoleClient();
  const { data, error } = await client.rpc("recalculate_player_team_links", {
    target_pubg_account_id: pubgAccountId?.trim() || null,
  });
  if (error) {
    if (isPlayerTeamLinkingMigrationUnavailableError(error)) {
      return migrationUnavailableResult();
    }
    throw error;
  }
  return data;
}

export async function getPlayerTeamLinkingAdminDashboard(): Promise<PlayerTeamLinkRpcResult> {
  const client = getSupabaseServiceRoleClient();
  const { data, error } = await client.rpc("get_player_team_linking_admin_dashboard");
  if (error) {
    if (isPlayerTeamLinkingMigrationUnavailableError(error)) {
      return migrationUnavailableResult();
    }
    throw error;
  }
  return data;
}

export async function updatePlayerTeamLinkSettings(settings: PlayerTeamLinkSettings, actorProfileId: string) {
  const client = getSupabaseServiceRoleClient();
  const payload: Json = {
    enabled: settings.enabled,
    requiredMatchCount: settings.requiredMatchCount,
    requireSameSlot: settings.requireSameSlot,
    activationMode: settings.activationMode,
    membershipMode: settings.membershipMode,
    allowedEventIds: settings.allowedEventIds,
    allowedSeasonIds: settings.allowedSeasonIds,
  };
  const { data, error } = await client.rpc("update_player_team_link_settings", {
    settings: payload,
    actor_profile_id: actorProfileId,
  });
  if (error) {
    if (isPlayerTeamLinkingMigrationUnavailableError(error)) {
      return migrationUnavailableResult();
    }
    throw error;
  }
  return data;
}

export async function resolvePlayerTeamLinkReview(
  reviewId: string,
  decision: "approve_transfer" | "keep_existing" | "reject" | "mark_substitute",
  actorProfileId: string,
  note?: string | null,
) {
  const client = getSupabaseServiceRoleClient();
  const { data, error } = await client.rpc("review_player_team_link", {
    target_review_id: reviewId,
    decision,
    actor_profile_id: actorProfileId,
    note: note?.trim() || null,
  });
  if (error) {
    if (isPlayerTeamLinkingMigrationUnavailableError(error)) {
      return migrationUnavailableResult();
    }
    throw error;
  }
  return data;
}

export async function unlinkPlayerTeamMembership(membershipId: string, actorProfileId: string, reason: string) {
  const client = getSupabaseServiceRoleClient();
  const { data, error } = await client.rpc("unlink_player_team_membership", {
    target_membership_id: membershipId,
    actor_profile_id: actorProfileId,
    reason: reason.trim(),
  });
  if (error) {
    if (isPlayerTeamLinkingMigrationUnavailableError(error)) {
      return migrationUnavailableResult();
    }
    throw error;
  }
  return data;
}
