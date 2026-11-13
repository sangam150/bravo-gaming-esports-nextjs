import assert from "node:assert/strict";
import { build } from "esbuild";
import type { TeamRegistration } from "../lib/types";

type Fixture = { registration: TeamRegistration; effects: string[]; denied: boolean };
const globals = globalThis as typeof globalThis & { __registrationBoundaryQA?: Fixture };
const pending: TeamRegistration = {
  id: "boundary-registration",
  teamName: "Boundary Team",
  captainName: "Boundary Captain",
  captainDiscord: "boundary.captain",
  playerNames: [],
  status: "pending",
  createdAt: "2026-11-13T00:00:00.000Z",
};

async function main() {
  const helpers = `const state=()=>globalThis.__registrationBoundaryQA;
    function unexpected(){state().effects.push('unexpected-service');throw new Error('Unexpected fixture service call')}`;
  const mocks: Record<string, string> = {
    "server-only": "",
    "admin-auth": `${helpers}
      export async function requireAdmin(){return null}
      export async function requirePlatformAdmin(){return state().denied?{response:Response.json({error:'Forbidden'},{status:403})}:{session:{profileId:'boundary-admin'}}}`,
    "audit-logs": `${helpers}
      export async function writeRequiredAuditLogFromRequest(){state().effects.push('audit')}`,
    "canonical-teams": `${helpers}
      export class CanonicalTeamError extends Error{}
      const team={id:'00000000-0000-4000-8000-000000000001',name:'Boundary Team',normalizedName:'boundary team',tag:null,slug:'boundary-team',aliases:[],isActive:true,status:'active',archivedAt:null,mergedIntoTeamId:null,logoUrl:null,sourceMetadata:{}};
      export function isCanonicalTeamId(value){return value===team.id}
      export async function listCanonicalAdminTeams(){state().effects.push('team-read');return [team]}
      export async function getCanonicalAdminTeam(){state().effects.push('team-read');return team}
      export const createCanonicalAdminTeam=unexpected, replaceCanonicalTeamLogoWithCas=unexpected, mergeTeamSourceMetadata=unexpected;`,
    data: `${helpers}
      export async function getRegistration(){return structuredClone(state().registration)}
      export async function updateRegistrationStatus(id,status,updates,{expectedRegistration}){
        const s=state(); assertExpected(expectedRegistration,s.registration);
        s.effects.push('registration:'+status);s.registration={...s.registration,...updates,id,status,updatedAt:'fixture-revision-'+s.effects.length};return structuredClone(s.registration)
      }
      function assertExpected(expected,current){if(expected.status!==current.status||expected.approvalClaimToken!==current.approvalClaimToken)throw new Error('Fixture revision conflict')}
      export const createRegistration=unexpected,getRegistrations=unexpected,getRegistrationTeamCandidates=unexpected;`,
    "document-store": `${helpers}
      export const COLLECTIONS={registrations:'registrations'};
      export class DocumentWriteConflictError extends Error{}
      export async function getDocument(){return structuredClone(state().registration)}`,
    "event-registration-transaction": `${helpers}
      export class EventRegistrationMutationError extends Error{constructor(message,options={}){super(message);this.code=options.code;this.status=options.status}}
      export async function confirmEventRegistrationTransaction({registration,teamId}){
        const s=state(); if(!registration.approvalClaimToken)throw new Error('Missing approval claim');
        s.effects.push('event-confirm');s.registration={...s.registration,status:'approved',approvedTeamId:teamId,eventSlotNumber:1,eventMembershipConfirmedAt:'fixture-confirmed',approvalClaimToken:undefined,approvalClaimedAt:undefined,approvalClaimedBy:undefined,updatedAt:'fixture-confirmed'};return structuredClone(s.registration)
      }
      export async function setEventRegistrationStatusTransaction({status,updates}){const s=state();s.effects.push('event-decision:'+status);s.registration={...s.registration,...updates,status,updatedAt:'fixture-decision'};return structuredClone(s.registration)}`,
    "canonical-image-upload": `${helpers} export const prepareCanonicalPublicImageUpload=unexpected;`,
    "public-asset-cleanup": `${helpers} export const cleanupUnreferencedPublicAssetByUrl=unexpected;`,
    "r2/storage": `${helpers}
      export const deletePrivateObjectByKey=unexpected,deletePublicObjectByKey=unexpected,getManagedUploadRecord=unexpected,getPrivateObject=unexpected,isR2ObjectMissingError=unexpected,readObjectBodyAsBuffer=unexpected,uploadPublicObjectAtKey=unexpected,verifyPublicObjectDelivery=unexpected;`,
    "revalidate-public": `${helpers}
      export function revalidateCompetitionPaths(){state().effects.push('revalidate-event')}
      export function revalidateTeamPaths(){state().effects.push('revalidate-team')}`,
    "supabase/service-role-client": `${helpers} export const getSupabaseServiceRoleClient=unexpected;`,
    "team-logo-service": `${helpers}
      export class ActiveAssetDeliveryError extends Error{}
      export const replaceTeamLogoAtomically=unexpected;`,
    "team-reconciliation": "export function normalizeCanonicalTeamIdentity(value){return value.trim().toLowerCase()}",
    "upload-records": `${helpers}
      export const createUploadRecord=unexpected,deleteUploadRecord=unexpected,claimUploadRecordForEntity=unexpected,releaseUploadRecordEntityClaim=unexpected;
      export async function listPendingRegistrationLogoUploadRecords(){state().effects.push('logo-cleanup');return []}`,
    "image-validation": "export class ImageDecodeError extends Error{}",
    "rate-limit": "export async function enforceRateLimit(){return null}",
    "request-origin":
      "export function requireSameOrigin(request){return request.headers.get('origin')==='https://registration.test'?null:Response.json({error:'Forbidden'},{status:403})}",
    "server-monitoring": `${helpers} export async function logServerError(){state().effects.push('error-log')}`,
    "team-onboarding": `${helpers} export const findTeamDuplicateCandidates=unexpected;`,
    "team-registration": `${helpers}
      export class RegistrationValidationError extends Error{}
      export const isValidDiscordHandle=unexpected,validateRegistrationTarget=unexpected;`,
    "user-facing-errors":
      "export const USER_FACING_ERROR_MESSAGES={registration:'Registration unavailable'};export function jsonErrorResponse(){return Response.json({error:'Unexpected failure'},{status:500})}",
  };
  const result = await build({
    stdin: {
      contents:
        "export { PATCH } from './app/api/registrations/route'; export { approveCanonicalTeamRegistration, RegistrationApprovalError } from './lib/registration-approval';",
      resolveDir: process.cwd(),
      loader: "ts",
    },
    bundle: true,
    write: false,
    platform: "node",
    format: "esm",
    plugins: [
      {
        name: "registration-boundary-services",
        setup(builder) {
          builder.onResolve({ filter: /^(server-only|@\/lib\/|\.\/)/ }, (args) => {
            const key = args.path === "server-only" ? args.path : args.path.replace(/^@\/lib\//, "").replace(/^\.\//, "");
            return Object.hasOwn(mocks, key) ? { path: key, namespace: "registration-boundary" } : undefined;
          });
          builder.onLoad({ filter: /.*/, namespace: "registration-boundary" }, (args) => ({ contents: mocks[args.path], loader: "js" }));
        },
      },
    ],
  });
  const actual = (await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString("base64")}`)) as {
    PATCH: (request: Request) => Promise<Response>;
    approveCanonicalTeamRegistration: (
      request: Request,
      input: { actorProfileId: string; registration: TeamRegistration },
    ) => Promise<unknown>;
    RegistrationApprovalError: new (...args: unknown[]) => Error;
  };
  const oldFixture = globals.__registrationBoundaryQA;
  const originalFetch = globalThis.fetch;
  let cases = 0;
  const reset = (changes: Partial<TeamRegistration> = {}) => {
    const fixture: Fixture = { registration: { ...pending, ...changes }, effects: [], denied: false };
    globals.__registrationBoundaryQA = fixture;
    return fixture;
  };
  const request = (status = "approved", origin = "https://registration.test") =>
    new Request("https://registration.test/api/registrations", {
      method: "PATCH",
      headers: { origin, "Content-Type": "application/json" },
      body: JSON.stringify({ id: pending.id, status }),
    });
  try {
    globalThis.fetch = () => {
      throw new Error("Live network access is forbidden in registration boundary QA.");
    };
    const eventFixture = reset({ tournamentId: "event-1" });
    const eventResponse = await actual.PATCH(request());
    const eventPayload = await eventResponse.json();
    assert.equal(eventResponse.status, 200);
    assert.equal(eventPayload.data.status, "approved");
    assert.equal(eventPayload.data.eventSlotNumber, 1);
    assert.match(eventPayload.message, /confirmed in the event roster at slot 1/);
    assert.equal(
      eventFixture.effects.filter((effect) => effect === "registration:pending").length,
      1,
      "Event approval claims the document once",
    );
    assert.equal(
      eventFixture.effects.filter((effect) => effect === "event-confirm").length,
      1,
      "Event approval uses the atomic confirmation service",
    );
    assert.equal(eventFixture.effects.includes("unexpected-service"), false);
    cases++;

    const alreadyApproved = reset({
      tournamentId: "event-1",
      status: "approved",
      approvedTeamId: "00000000-0000-4000-8000-000000000001",
      eventSlotNumber: 1,
    });
    const retryResponse = await actual.PATCH(request());
    assert.equal(retryResponse.status, 200);
    assert.equal((await retryResponse.json()).message, "Registration is already approved.");
    assert.equal(alreadyApproved.effects.includes("event-confirm"), false);
    cases++;

    const direct = reset({ tournamentId: " event-1 " });
    const directResult = (await actual.approveCanonicalTeamRegistration(request(), {
      actorProfileId: "boundary-admin",
      registration: direct.registration,
    })) as { registration: TeamRegistration };
    assert.equal(directResult.registration.status, "approved");
    assert.equal(
      direct.effects.filter((effect) => effect === "event-confirm").length,
      1,
      "Direct service calls preserve the same atomic boundary",
    );
    cases++;

    for (const tournamentId of [undefined, "   "]) {
      const fixture = reset({ tournamentId });
      const response = await actual.PATCH(request());
      const payload = await response.json();
      assert.equal(response.status, 200);
      assert.equal(payload.data.status, "approved");
      assert.equal(payload.data.approvedTeamId, "00000000-0000-4000-8000-000000000001");
      assert.equal(fixture.registration.approvalClaimToken, undefined);
      assert.equal(fixture.effects.filter((effect) => effect === "registration:pending").length, 1);
      assert.equal(fixture.effects.filter((effect) => effect === "registration:approved").length, 1);
      assert.equal(fixture.effects.filter((effect) => effect === "audit").length, 2);
      assert.match(payload.message, /official team registry/);
      assert.equal(fixture.effects.includes("unexpected-service"), false);
      cases++;
    }

    const rejected = reset({ tournamentId: "event-1" });
    assert.equal((await actual.PATCH(request("rejected"))).status, 200);
    assert.equal(rejected.registration.status, "rejected", "Event-linked requests can still be rejected");
    assert.equal(rejected.effects.includes("event-decision:rejected"), true);
    assert.equal(rejected.effects.includes("team-read"), false);
    cases++;

    const denied = reset();
    denied.denied = true;
    assert.equal((await actual.PATCH(request())).status, 403);
    assert.deepEqual(denied.effects, []);
    cases++;
    const foreign = reset();
    assert.equal((await actual.PATCH(request("approved", "https://foreign.test"))).status, 403);
    assert.deepEqual(foreign.effects, []);
    cases++;
    console.log(
      `Registration approval boundary QA passed: ${cases} actual route/service cases; event approvals use the atomic confirmation service, retries remain idempotent, and general team reviews remain functional.`,
    );
  } finally {
    globalThis.fetch = originalFetch;
    if (oldFixture === undefined) delete globals.__registrationBoundaryQA;
    else globals.__registrationBoundaryQA = oldFixture;
  }
}

void main();
