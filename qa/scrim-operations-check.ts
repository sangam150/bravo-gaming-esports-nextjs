import assert from "node:assert/strict";
import { build } from "esbuild";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { validateScrimInput } from "../lib/scrim-input";
import { autoAssignScrimSlots, buildScrimSlotNotice, validateScrimSlots } from "../lib/scrim-slots";
import { toPublicScrim } from "../lib/public-scrims";
import { parseEventSchedule } from "../lib/event-schedule";
import { eventDateTimeLocalToUtcIso } from "../lib/event-datetime";
import type { Scrim } from "../lib/types";

async function main() {
const base: Scrim = { id: "scrim-qa", title: "Offline scrim QA", date: "2026-11-06", map: "Rondo", lobbyTime: "7:00 PM NPT", teamIds: ["team-a", "team-b"], teamCapacity: 16, slotAssignments: [{ teamId: "team-a", slotNumber: 7 }], slotsLocked: false, status: "scheduled", updatedAt: "revision-1" };
const clone = <T>(value: T): T => structuredClone(value);
validateScrimInput(base as unknown as Record<string, unknown>);
assert.deepEqual(autoAssignScrimSlots(base), [{ teamId: "team-b", slotNumber: 1 }, { teamId: "team-a", slotNumber: 7 }]);
for (const change of [
  { slotAssignments: [{ teamId: "team-a", slotNumber: 1 }, { teamId: "team-b", slotNumber: 1 }] },
  { slotAssignments: [{ teamId: "team-a", slotNumber: 1 }, { teamId: "team-a", slotNumber: 2 }] },
  { slotAssignments: [{ teamId: "unknown", slotNumber: 1 }] },
  { slotAssignments: [{ teamId: "team-a", slotNumber: 17 }] },
  { slotAssignments: [{ teamId: "team-a", slotNumber: 1.5 }] },
  { slotAssignments: [null] }, { slotAssignments: null }, { teamCapacity: null },
  { teamIds: ["team-a", "team-a"] },
  { teamCapacity: 1 }, { teamCapacity: 0 }, { teamCapacity: 101 }, { slotsLocked: "true" },
]) assert.throws(() => validateScrimInput({ ...base, ...change }), Error, "Invalid slot state must be rejected.");
const locked = { ...base, slotsLocked: true };
assert.throws(() => validateScrimSlots({ ...locked, teamIds: ["team-a"] }, locked), /Unlock/);
assert.throws(() => autoAssignScrimSlots(locked), /Unlock/);
assert.doesNotThrow(() => validateScrimSlots({ ...locked, slotsLocked: false, teamIds: ["team-b"], slotAssignments: [] }, locked));
const withdrawn = { ...base, teamIds: ["team-b"], slotAssignments: [] };
assert.deepEqual(autoAssignScrimSlots(withdrawn), [{ teamId: "team-b", slotNumber: 1 }]);
assert.doesNotThrow(() => validateScrimInput({ ...base, teamCapacity: undefined, slotAssignments: undefined, slotsLocked: undefined, teamIds: Array.from({ length: 24 }, (_, i) => `legacy-${i}`) }));
const teams = [{ id: "team-a", name: "Offline Alpha" }, { id: "team-b", name: "Offline Bravo" }];
assert.match(buildScrimSlotNotice(base, teams), /Slot 07 — Offline Alpha/);
assert.throws(() => buildScrimSlotNotice(base, []), /name is unavailable/);
const publicScrim = toPublicScrim({ ...base, roomId: "offline-private-room", roomPassword: "offline-private-password" });
assert.deepEqual(publicScrim.slotAssignments, base.slotAssignments);
assert.equal("roomId" in publicScrim || "roomPassword" in publicScrim, false);
const start = eventDateTimeLocalToUtcIso("2026-11-06T19:00", "Asia/Kathmandu");
assert.equal(start, "2026-11-06T13:15:00.000Z");
assert.equal(parseEventSchedule(JSON.stringify({ version: 1, stage: "QA", timeZone: "Asia/Kathmandu", matches: [{ matchNumber: 1, map: "Rondo", scheduledAt: start, status: "scheduled" }] }))?.matches[0].scheduledAt, start);

type State = { records: Map<string, Scrim>; auditWrites: number; revisions: number; denied: boolean; race: (() => Promise<void>) | null; insertRequests: number; eligibleTeams: string[] };
const state: State = { records: new Map([[base.id, clone(base)]]), auditWrites: 0, revisions: 1, denied: false, race: null, insertRequests: 0, eligibleTeams: ["team-a", "team-b"] };
(globalThis as typeof globalThis & { __scrimQA: State }).__scrimQA = state;
const originalFetch = globalThis.fetch;
globalThis.fetch = () => { throw new Error("Scrim QA cannot access a real service."); };
const file = resolve("qa-artifacts/blocker-recheck/scrim-route-fixture.mjs");
await mkdir(resolve("qa-artifacts/blocker-recheck"), { recursive: true });
await build({ entryPoints: ["app/api/admin/scrims/route.ts"], outfile: file, bundle: true, platform: "node", format: "esm", plugins: [{ name: "offline-scrim-services", setup(builder) {
  const mocks: Record<string, string> = {
    "@/lib/admin-auth": `export async function requireAdmin(){return globalThis.__scrimQA.denied?Response.json({error:'Unauthorized'},{status:401}):null}`,
    "@/lib/request-origin": `export function requireSameOrigin(request){return request.headers.get('origin')==='https://scrim-qa.test'?null:Response.json({error:'Forbidden'},{status:403})}`,
    "@/lib/audit-logs": `export async function writeAuditLogFromRequest(){globalThis.__scrimQA.auditWrites++}`,
    "@/lib/canonical-teams": `export async function listCanonicalAdminTeams(){return globalThis.__scrimQA.eligibleTeams.map(id=>({id,isActive:true,status:'active',archivedAt:null,mergedIntoTeamId:null}))}`,
    "@/lib/revalidate-public": `export function revalidateCompetitionPaths(){}`,
    "@/lib/supabase/service-role-client": `export function getSupabaseServiceRoleClient(){return {from(){return {async insert(row){const s=globalThis.__scrimQA;s.insertRequests++;if(s.records.has(row.id))return {error:{code:'23505'}};s.records.set(row.id,{id:row.id,...structuredClone(row.data)});return {error:null}}}}}}`,
    "@/lib/document-store": `export const COLLECTIONS={scrims:'scrims'};export class DocumentWriteConflictError extends Error{};export async function fetchDocumentCollection(){return [...globalThis.__scrimQA.records.values()].map(v=>structuredClone(v))}export async function getDocument(_collection,id){const value=structuredClone(globalThis.__scrimQA.records.get(id)||null);if(globalThis.__scrimQA.race)await globalThis.__scrimQA.race();return value}export async function saveDocument(_collection,id,value){const s=globalThis.__scrimQA;s.records.set(id,{...s.records.get(id),...value})}export async function saveDocumentIfFieldsMatch(_collection,id,value,expected){const s=globalThis.__scrimQA,current=s.records.get(id);if(!current||current.updatedAt!==expected.updatedAt)throw new DocumentWriteConflictError();const result={...current,...structuredClone(value),updatedAt:'revision-'+(++s.revisions)};s.records.set(id,result);return result}`,
  };
  builder.onResolve({ filter: /^@\/lib\// }, args => mocks[args.path] ? { path: args.path, namespace: "scrim-qa" } : undefined);
  builder.onLoad({ filter: /.*/, namespace: "scrim-qa" }, args => ({ contents: mocks[args.path], loader: "js" }));
} }] });
try {
  const route = await import(pathToFileURL(file).href) as typeof import("../app/api/admin/scrims/route");
  const request = (body: unknown) => new Request("https://scrim-qa.test/api/admin/scrims", { method: "PUT", headers: { origin: "https://scrim-qa.test", "Content-Type": "application/json" }, body: JSON.stringify(body) });
  state.denied = true;
  assert.equal((await route.PUT(request(base))).status, 401);
  state.denied = false;
  assert.equal((await route.PUT(new Request("https://scrim-qa.test/api/admin/scrims", { method: "PUT", headers: { origin: "https://wrong-origin.test" }, body: JSON.stringify(base) }))).status, 403);
  assert.equal((await route.PUT(request({ ...base, updatedAt: "stale" }))).status, 409);
  assert.equal((await route.PUT(request({ ...base, updatedAt: undefined }))).status, 409);
  assert.equal((await route.PUT(request({ ...base, slotAssignments: [{ teamId: "team-a", slotNumber: 1 }, { teamId: "team-b", slotNumber: 1 }] }))).status, 400);
  assert.equal((await route.POST(request(base))).status, 409);
  state.eligibleTeams = ["team-b"];
  assert.equal((await route.PUT(request(base))).status, 400);
  state.eligibleTeams = ["team-a", "team-b"];
  assert.equal((await route.PUT(request({ ...base, teamIds: ["invented-team"], slotAssignments: [] }))).status, 400);
  assert.equal(state.auditWrites, 0);
  let arrivals = 0;
  let release!: () => void;
  const simultaneousReads = new Promise<void>(done => { release = done; });
  state.race = async () => { if (++arrivals === 2) release(); await simultaneousReads; };
  const responses = await Promise.all([route.PUT(request({ ...base, slotAssignments: [{ teamId: "team-a", slotNumber: 3 }] })), route.PUT(request({ ...base, slotAssignments: [{ teamId: "team-a", slotNumber: 4 }] }))]);
  state.race = null;
  assert.deepEqual(responses.map(row => row.status).sort(), [200, 409]);
  const accepted = responses.find(row => row.status === 200)!;
  assert.equal((await accepted.json()).data.updatedAt, state.records.get(base.id)?.updatedAt);
  assert.equal(state.auditWrites, 1);
  assert.equal(state.records.get(base.id)?.slotAssignments?.length, 1);
  assert.equal((await route.GET(new Request("https://scrim-qa.test/api/admin/scrims"))).status, 200);
  const saved = clone(state.records.get(base.id)!);
  assert.equal((await route.PUT(request({ ...saved, teamIds: ["team-b"], slotAssignments: [{ teamId: "team-b", slotNumber: 3 }], lobbyTime: "7:00 PM NPT" }))).status, 200);
  assert.deepEqual(state.records.get(base.id)?.slotAssignments, [{ teamId: "team-b", slotNumber: 3 }]);
  assert.equal(state.records.get(base.id)?.lobbyTime, "7:00 PM NPT");
  const fresh = clone(state.records.get(base.id)!);
  assert.equal((await route.PUT(request({ id: fresh.id, updatedAt: fresh.updatedAt, teamIds: Array.from({ length: 17 }, (_, index) => `team-${index}`) }))).status, 400);
  console.log("PASS: offline actual scrim route authorization/origin, capacity/duplicate/lock validation, withdrawal/reassignment, client revision and concurrent CAS conflict, persisted readback, saved-name notices, public privacy and 19:00 Nepal conversion. No live staging mutation or acceptance claimed.");
} finally {
  globalThis.fetch = originalFetch;
  delete (globalThis as typeof globalThis & { __scrimQA?: State }).__scrimQA;
}
}

void main().catch(error => { console.error(error); process.exitCode = 1; });
