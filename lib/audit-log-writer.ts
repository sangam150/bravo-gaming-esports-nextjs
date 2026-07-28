import type { Json } from "@/types/database.types";
import { sanitizeJsonValue } from "./json-utils";
import { getSupabaseServiceRoleClient } from "./supabase/service-role-client";

export type AuditPayload = {
  action: string;
  entityType: string;
  entityId?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
  actorId?: string | null;
};

function normalizeAuditJson(value: unknown) {
  if (value === undefined) {
    return null;
  }

  return (sanitizeJsonValue(value) as Json | undefined) ?? null;
}

export async function writeAuditLog(payload: AuditPayload) {
  const client = getSupabaseServiceRoleClient();
  const { data, error } = await client
    .from("audit_logs")
    .insert({
      actor_id: payload.actorId ?? null,
      action: payload.action,
      entity_type: payload.entityType,
      entity_id: payload.entityId ?? null,
      old_data: normalizeAuditJson(payload.oldValue),
      new_data: normalizeAuditJson(payload.newValue),
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}
