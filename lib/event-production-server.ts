import "server-only";
import { getDocument, saveDocumentIfFieldsMatch } from "./document-store";
import { getSupabaseServiceRoleClient } from "./supabase/service-role-client";
import { DEFAULT_EVENT_PRODUCTION, parseEventProduction, type EventProduction } from "./event-production";
export type EventProductionRecord = { productionRevision?: number; productionDraft?: EventProduction; productionApproved?: EventProduction };
export async function getEventProduction(id: string) {
  const row = await getDocument<EventProductionRecord>("tournaments", id);
  return { revision: row?.productionRevision ?? 0, draft: parseEventProduction(row?.productionDraft ?? DEFAULT_EVENT_PRODUCTION), approved: row?.productionApproved ? parseEventProduction(row.productionApproved) : null };
}
export async function saveEventProduction(id: string, revision: number, value: unknown, approve: boolean) {
  if (!Number.isSafeInteger(revision) || revision < 0) throw new Error("A valid event settings revision is required.");
  const config = parseEventProduction(value);
  const client = getSupabaseServiceRoleClient();
  const { error } = await client.from("app_documents").upsert({ collection_name: "tournaments", id, data: { productionRevision: 0 } }, { onConflict: "collection_name,id", ignoreDuplicates: true });
  if (error) throw error;
  const row = await getDocument<EventProductionRecord>("tournaments", id);
  for (const key of ["stages", "groups", "days", "maps", "assets"] as const) {
    const oldIds = [...row?.productionDraft?.[key] ?? [], ...row?.productionApproved?.[key] ?? []].map(item => item.id);
    if (oldIds.some(oldId => !config[key].some(item => item.id === oldId))) throw new Error("Archive existing event identities instead of removing historical links.");
  }
  if (approve && [...config.stages, ...config.groups, ...config.days, ...config.maps, ...config.assets].some(item => !item.archived && !("name" in item && item.name.trim()))) throw new Error("Name each active event stage, group, day, map and asset before approval.");
  await saveDocumentIfFieldsMatch("tournaments", id, { productionRevision: revision + 1, productionDraft: config, ...(approve ? { productionApproved: config } : {}) }, { productionRevision: row?.productionRevision === undefined && revision === 0 ? null : revision });
  return getEventProduction(id);
}
