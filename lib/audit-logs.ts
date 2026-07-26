import type { Json, Tables } from "@/types/database.types";
import { getRequestSession } from "./admin-auth";
import { sanitizeJsonValue } from "./json-utils";
import { getSupabaseServiceRoleClient } from "./supabase/service-role-client";

export type AuditLogRecord = Tables<"audit_logs"> & {
  actorName?: string | null;
  actorEmail?: string | null;
};

type AuditPayload = {
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

export async function writeAuditLogFromRequest(request: Request, payload: Omit<AuditPayload, "actorId">) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip")?.trim() ?? null;
    const userAgent = request.headers.get("user-agent") ?? null;
    const metadata = {
      timestamp: new Date().toISOString(),
      ip,
      userAgent,
    };

    const session = await getRequestSession(request);
    return await writeAuditLog({
      ...payload,
      oldValue:
        payload.oldValue === undefined
          ? undefined
          : {
              value: payload.oldValue,
              request: metadata,
            },
      newValue:
        payload.newValue === undefined
          ? undefined
          : {
              value: payload.newValue,
              request: metadata,
            },
      actorId: session?.profileId ?? null,
    });
  } catch {
    return null;
  }
}

export async function listRecentAuditLogs(limit = 20): Promise<AuditLogRecord[]> {
  const client = getSupabaseServiceRoleClient();
  const { data, error } = await client.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(limit);

  if (error) {
    throw error;
  }

  const logs = (data ?? []) as Tables<"audit_logs">[];
  const actorIds = Array.from(new Set(logs.map((log) => log.actor_id).filter((value): value is string => Boolean(value))));

  if (actorIds.length === 0) {
    return logs;
  }

  const { data: profiles } = await client.from("profiles").select("id,email,display_name").in("id", actorIds);

  const profileById = new Map(
    (profiles ?? []).map((profile) => [
      profile.id,
      {
        actorName: profile.display_name ?? null,
        actorEmail: profile.email,
      },
    ]),
  );

  return logs.map((log) => ({
    ...log,
    actorName: log.actor_id ? (profileById.get(log.actor_id)?.actorName ?? null) : null,
    actorEmail: log.actor_id ? (profileById.get(log.actor_id)?.actorEmail ?? null) : null,
  }));
}
