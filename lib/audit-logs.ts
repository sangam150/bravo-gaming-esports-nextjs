import type { Tables } from "@/types/database.types";
import { getRequestSession } from "./admin-auth";
import { writeAuditLog, type AuditPayload } from "./audit-log-writer";
import { getSupabaseServiceRoleClient } from "./supabase/service-role-client";

export type AuditLogRecord = Tables<"audit_logs"> & {
  actorName?: string | null;
  actorEmail?: string | null;
};

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

export async function writeRequiredAuditLogFromRequest(request: Request, payload: Omit<AuditPayload, "actorId">) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip")?.trim() ?? null;
  const userAgent = request.headers.get("user-agent") ?? null;
  const metadata = {
    timestamp: new Date().toISOString(),
    ip,
    userAgent,
  };
  const session = await getRequestSession(request);
  const actorId = session?.profileId?.trim();
  if (!actorId) {
    throw new Error("A verified profile is required for this audited action.");
  }
  return writeAuditLog({
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
    actorId,
  });
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
