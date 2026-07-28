import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import sharp from "sharp";
import { POST as teamLogoRoutePost } from "../app/api/admin/teams/[id]/logo/route";
import { prepareCanonicalPublicImageUpload } from "../lib/canonical-image-upload";
import { parseCanonicalTeamWriteInput } from "../lib/canonical-teams";
import { decodeApprovedImage, ImageDecodeError } from "../lib/image-validation";
import { assertPublicObjectDelivery, getManagedPublicObjectKeyFromUrl } from "../lib/r2/storage";
import { validateSameOriginRequest } from "../lib/request-origin";
import {
  assertTeamLogoCandidateOwnership,
  createPendingTeamLogoRequest,
  reviewPendingTeamLogoRequest,
  TeamLogoApprovalError,
} from "../lib/team-logo-approval";
import { matchTeamLogoFile, normalizeTeamLogoLabel } from "../lib/team-logo-matching";
import { replaceTeamLogoAtomically } from "../lib/team-logo-service";

async function main() {
  const teams = [
    { aliases: ["Nepal Pro League"], id: "team-npl", name: "NPL", slug: "npl", tag: "NPL" },
    { aliases: [], id: "team-m8", name: "M8", slug: "m8", tag: "M8" },
    { aliases: [], id: "team-2we", name: "2WE", slug: "2we", tag: "2WE" },
    { aliases: ["Revive"], id: "team-revive", name: "Revive Gara Bro", slug: "revive-gara-bro", tag: "RGB" },
  ];

  assert.equal(normalizeTeamLogoLabel("1 Revive Gara Bro.png"), "Revive Gara Bro");
  assert.equal(normalizeTeamLogoLabel("2 NPL.png"), "NPL");
  assert.equal(normalizeTeamLogoLabel("3 M8.png"), "M8");
  assert.equal(normalizeTeamLogoLabel("2WE.png"), "2WE");
  assert.equal(matchTeamLogoFile("1 Revive Gara Bro.png", teams).autoMatch?.team.id, "team-revive");
  assert.equal(matchTeamLogoFile("2 NPL.png", teams).autoMatch?.team.id, "team-npl");
  assert.equal(matchTeamLogoFile("2WE.png", teams).autoMatch?.team.id, "team-2we");
  assert.equal(matchTeamLogoFile("3 M8.png", teams).autoMatch?.team.id, "team-m8");
  assert.deepEqual(parseCanonicalTeamWriteInput({ name: "NPL" }), { name: "NPL" });
  assert.deepEqual(parseCanonicalTeamWriteInput({ logoUrl: "https://assets.example.test/npl.png" }), {});
  assert.deepEqual(parseCanonicalTeamWriteInput({ archivedAt: null, logoUrl: null, primaryIglProfileId: null }), {
    archivedAt: null,
    primaryIglProfileId: null,
  });

  const ambiguous = matchTeamLogoFile("Alpha.png", [
    { aliases: ["Alpha"], id: "alpha-one", name: "First Team" },
    { aliases: ["Alpha"], id: "alpha-two", name: "Second Team" },
  ]);
  assert.equal(ambiguous.autoMatch, null);
  assert.equal(ambiguous.candidates.length, 2);

  const png = await sharp({
    create: {
      background: { alpha: 1, b: 200, g: 100, r: 20 },
      channels: 4,
      height: 16,
      width: 16,
    },
  })
    .png()
    .toBuffer();
  const decoded = await decodeApprovedImage(png, {
    declaredContentType: "image/png",
    fileName: "logo.png",
  });
  assert.equal(decoded.format, "png");
  assert.equal(decoded.width, 16);
  assert.equal(decoded.height, 16);
  await assert.rejects(
    () =>
      decodeApprovedImage(png, {
        declaredContentType: "image/jpeg",
        fileName: "logo.jpg",
      }),
    ImageDecodeError,
  );
  await assert.rejects(
    () =>
      decodeApprovedImage(png.subarray(0, Math.max(24, Math.floor(png.byteLength / 2))), {
        declaredContentType: "image/png",
        fileName: "truncated.png",
      }),
    ImageDecodeError,
  );

  const r2EnvironmentKeys = [
    "R2_ACCOUNT_ID",
    "R2_ACCESS_KEY_ID",
    "R2_PRIVATE_BUCKET_NAME",
    "R2_PUBLIC_BASE_URL",
    "R2_BUCKET_NAME",
    "R2_SECRET_ACCESS_KEY",
    "R2_PUBLIC_DELIVERY_MODE",
  ] as const;
  const previousR2Environment = Object.fromEntries(r2EnvironmentKeys.map((key) => [key, process.env[key]]));
  Object.assign(process.env, {
    R2_ACCOUNT_ID: "test-account",
    R2_ACCESS_KEY_ID: "test-access-key",
    R2_PRIVATE_BUCKET_NAME: "test-private",
    R2_PUBLIC_BASE_URL: "https://assets.example.test",
    R2_BUCKET_NAME: "test-public",
    R2_SECRET_ACCESS_KEY: "test-secret-key",
    R2_PUBLIC_DELIVERY_MODE: "direct",
  });
  const preparedImage = await prepareCanonicalPublicImageUpload({
    altText: "NPL logo",
    assetName: "logo",
    buffer: png,
    declaredContentType: "image/png",
    entityId: "00000000-0000-4000-8000-000000000001",
    fileName: "NPL.png",
    now: new Date("2026-07-28T00:00:00.000Z"),
    type: "team_logo",
  });
  assert.match(preparedImage.objectKey, /^teams\/00000000-0000-4000-8000-000000000001\/logo-1785196800000-[0-9a-f]{12}\.png$/);
  assert.equal(preparedImage.publicUrl, `https://assets.example.test/${preparedImage.objectKey}`);
  assert.deepEqual(
    {
      altText: preparedImage.metadata.altText,
      height: preparedImage.metadata.height,
      mimeType: preparedImage.metadata.mimeType,
      sizeBytes: preparedImage.metadata.sizeBytes,
      status: preparedImage.metadata.status,
      width: preparedImage.metadata.width,
    },
    {
      altText: "NPL logo",
      height: 16,
      mimeType: "image/png",
      sizeBytes: png.byteLength,
      status: "active",
      width: 16,
    },
  );
  for (const key of r2EnvironmentKeys) {
    const previousValue = previousR2Environment[key];
    if (previousValue === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = previousValue;
    }
  }

  const successEvents: string[] = [];
  const success = await replaceTeamLogoAtomically({
    createUploadRecord: async () => {
      successEvents.push("record");
      return { id: "upload-1" };
    },
    deleteNewObject: async () => {
      successEvents.push("delete-new");
    },
    deletePreviousObject: async () => {
      successEvents.push("delete-old");
      return true;
    },
    deleteUploadRecord: async () => {
      successEvents.push("delete-record");
    },
    revalidate: () => {
      successEvents.push("revalidate");
    },
    updateCanonicalTeam: async () => {
      successEvents.push("update");
      return { id: "team-1" };
    },
    uploadNewObject: async () => {
      successEvents.push("upload");
    },
    verifyNewObject: async () => {
      successEvents.push("verify");
    },
    writeRequiredAudit: async () => {
      successEvents.push("audit");
    },
  });
  assert.deepEqual(successEvents, ["upload", "verify", "record", "audit", "update", "revalidate", "delete-old"]);
  assert.equal(success.cleanupPending, false);
  assert.equal(success.uploadRecordId, "upload-1");

  const rollbackEvents: string[] = [];
  await assert.rejects(() =>
    replaceTeamLogoAtomically({
      createUploadRecord: async () => {
        rollbackEvents.push("record");
        return { id: "upload-2" };
      },
      deleteNewObject: async () => {
        rollbackEvents.push("delete-new");
      },
      deletePreviousObject: async () => {
        rollbackEvents.push("delete-old");
        return true;
      },
      deleteUploadRecord: async () => {
        rollbackEvents.push("delete-record");
      },
      revalidate: () => {
        rollbackEvents.push("revalidate");
      },
      updateCanonicalTeam: async () => {
        rollbackEvents.push("update");
        throw new Error("database update failed");
      },
      uploadNewObject: async () => {
        rollbackEvents.push("upload");
      },
      verifyNewObject: async () => {
        rollbackEvents.push("verify");
      },
      writeRequiredAudit: async () => {
        rollbackEvents.push("audit");
      },
    }),
  );
  assert.deepEqual(rollbackEvents, ["upload", "verify", "record", "audit", "update", "delete-record", "delete-new"]);

  const unconfirmedActivationEvents: string[] = [];
  await assert.rejects(() =>
    replaceTeamLogoAtomically({
      cleanupNewArtifactsOnError: () => false,
      createUploadRecord: async () => {
        unconfirmedActivationEvents.push("record");
        return { id: "upload-unconfirmed" };
      },
      deleteNewObject: async () => {
        unconfirmedActivationEvents.push("delete-new");
      },
      deletePreviousObject: async () => true,
      deleteUploadRecord: async () => {
        unconfirmedActivationEvents.push("delete-record");
      },
      revalidate: () => undefined,
      updateCanonicalTeam: async () => {
        unconfirmedActivationEvents.push("update");
        throw new Error("activation response was ambiguous");
      },
      uploadNewObject: async () => {
        unconfirmedActivationEvents.push("upload");
      },
      verifyNewObject: async () => {
        unconfirmedActivationEvents.push("verify");
      },
      writeRequiredAudit: async () => {
        unconfirmedActivationEvents.push("audit");
      },
    }),
  );
  assert.deepEqual(unconfirmedActivationEvents, ["upload", "verify", "record", "audit", "update"]);

  const cleanupResult = await replaceTeamLogoAtomically({
    createUploadRecord: async () => ({ id: "upload-3" }),
    deleteNewObject: async () => undefined,
    deletePreviousObject: async () => {
      throw new Error("cleanup failed");
    },
    deleteUploadRecord: async () => undefined,
    revalidate: () => undefined,
    updateCanonicalTeam: async () => ({ id: "team-1" }),
    uploadNewObject: async () => undefined,
    verifyNewObject: async () => undefined,
    writeRequiredAudit: async () => undefined,
  });
  assert.equal(cleanupResult.cleanupPending, true);

  const revalidationFailureEvents: string[] = [];
  const revalidationFailureResult = await replaceTeamLogoAtomically({
    createUploadRecord: async () => ({ id: "upload-revalidation-failure" }),
    deleteNewObject: async () => undefined,
    deletePreviousObject: async () => {
      revalidationFailureEvents.push("delete-old");
      return true;
    },
    deleteUploadRecord: async () => undefined,
    revalidate: () => {
      revalidationFailureEvents.push("revalidate");
      throw new Error("cache revalidation failed");
    },
    updateCanonicalTeam: async () => ({ id: "team-1" }),
    uploadNewObject: async () => undefined,
    verifyNewObject: async () => undefined,
    writeRequiredAudit: async () => undefined,
  });
  assert.deepEqual(revalidationFailureEvents, ["revalidate"], "the previous logo must be retained when public cache revalidation fails");
  assert.equal(revalidationFailureResult.cleanupPending, true);

  const unresolvedCleanupResult = await replaceTeamLogoAtomically({
    createUploadRecord: async () => ({ id: "upload-4" }),
    deleteNewObject: async () => undefined,
    deletePreviousObject: async () => false,
    deleteUploadRecord: async () => undefined,
    revalidate: () => undefined,
    updateCanonicalTeam: async () => ({ id: "team-1" }),
    uploadNewObject: async () => undefined,
    verifyNewObject: async () => undefined,
    writeRequiredAudit: async () => undefined,
  });
  assert.equal(unresolvedCleanupResult.cleanupPending, true);

  const uploadFailureEvents: string[] = [];
  await assert.rejects(() =>
    replaceTeamLogoAtomically({
      createUploadRecord: async () => {
        uploadFailureEvents.push("record");
        return { id: "upload-never-created" };
      },
      deleteNewObject: async () => {
        uploadFailureEvents.push("delete-new");
      },
      deletePreviousObject: async () => {
        uploadFailureEvents.push("delete-old");
        return true;
      },
      deleteUploadRecord: async () => {
        uploadFailureEvents.push("delete-record");
      },
      revalidate: () => {
        uploadFailureEvents.push("revalidate");
      },
      updateCanonicalTeam: async () => {
        uploadFailureEvents.push("update");
        return { id: "team-1" };
      },
      uploadNewObject: async () => {
        uploadFailureEvents.push("upload");
        throw new Error("upload failed");
      },
      verifyNewObject: async () => {
        uploadFailureEvents.push("verify");
      },
      writeRequiredAudit: async () => {
        uploadFailureEvents.push("audit");
      },
    }),
  );
  assert.deepEqual(uploadFailureEvents, ["upload"]);

  const auditFailureEvents: string[] = [];
  await assert.rejects(() =>
    replaceTeamLogoAtomically({
      createUploadRecord: async () => {
        auditFailureEvents.push("record");
        return { id: "upload-5" };
      },
      deleteNewObject: async () => {
        auditFailureEvents.push("delete-new");
      },
      deletePreviousObject: async () => {
        auditFailureEvents.push("delete-old");
        return true;
      },
      deleteUploadRecord: async () => {
        auditFailureEvents.push("delete-record");
      },
      revalidate: () => {
        auditFailureEvents.push("revalidate");
      },
      updateCanonicalTeam: async () => {
        auditFailureEvents.push("update");
        return { id: "team-1" };
      },
      uploadNewObject: async () => {
        auditFailureEvents.push("upload");
      },
      verifyNewObject: async () => {
        auditFailureEvents.push("verify");
      },
      writeRequiredAudit: async () => {
        auditFailureEvents.push("audit");
        throw new Error("audit failed");
      },
    }),
  );
  assert.deepEqual(auditFailureEvents, ["upload", "verify", "record", "audit", "delete-record", "delete-new"]);

  assert.doesNotThrow(() =>
    assertPublicObjectDelivery(
      { contentType: "image/png; charset=binary", sizeBytes: png.byteLength },
      { contentType: "image/png", sizeBytes: png.byteLength },
    ),
  );
  assert.throws(
    () => assertPublicObjectDelivery({ contentType: "text/html", sizeBytes: png.byteLength }, { contentType: "image/png" }),
    /content type/,
  );
  assert.throws(() => assertPublicObjectDelivery({ contentType: "image/png", sizeBytes: 1 }, { sizeBytes: png.byteLength }), /size/);

  const pendingEvents: string[] = [];
  const pendingResult = await createPendingTeamLogoRequest({
    createRequest: async (uploadRecordId) => {
      pendingEvents.push(`request:${uploadRecordId}`);
      return { id: "request-1", status: "pending" };
    },
    createUploadRecord: async () => {
      pendingEvents.push("record");
      return { id: "candidate-1" };
    },
    deleteCandidateObject: async () => {
      pendingEvents.push("delete-candidate");
    },
    deleteUploadRecord: async () => {
      pendingEvents.push("delete-record");
    },
    uploadCandidate: async () => {
      pendingEvents.push("upload-private");
    },
    verifyCandidate: async () => {
      pendingEvents.push("verify-private");
    },
    writeRequiredAudit: async () => {
      pendingEvents.push("audit");
    },
  });
  assert.deepEqual(pendingEvents, ["upload-private", "verify-private", "record", "audit", "request:candidate-1"]);
  assert.deepEqual(pendingResult.request, { id: "request-1", status: "pending" });

  const pendingRollbackEvents: string[] = [];
  await assert.rejects(() =>
    createPendingTeamLogoRequest({
      createRequest: async () => {
        pendingRollbackEvents.push("request");
        throw new Error("request insert failed");
      },
      createUploadRecord: async () => {
        pendingRollbackEvents.push("record");
        return { id: "candidate-2" };
      },
      deleteCandidateObject: async () => {
        pendingRollbackEvents.push("delete-candidate");
      },
      deleteUploadRecord: async () => {
        pendingRollbackEvents.push("delete-record");
      },
      uploadCandidate: async () => {
        pendingRollbackEvents.push("upload-private");
      },
      verifyCandidate: async () => {
        pendingRollbackEvents.push("verify-private");
      },
      writeRequiredAudit: async () => {
        pendingRollbackEvents.push("audit");
      },
    }),
  );
  assert.deepEqual(pendingRollbackEvents, [
    "upload-private",
    "verify-private",
    "record",
    "audit",
    "request",
    "delete-record",
    "delete-candidate",
  ]);

  const approvalEvents: string[] = [];
  const approvalResult = await reviewPendingTeamLogoRequest("approved", {
    activateCandidate: async () => {
      approvalEvents.push("activate-public");
      return { id: "team-1", logoUrl: "https://assets.example/team.png" };
    },
    cleanupCandidate: async () => {
      approvalEvents.push("cleanup-private");
      return true;
    },
    markReviewed: async (decision) => {
      approvalEvents.push(`mark:${decision}`);
    },
  });
  assert.deepEqual(approvalEvents, ["activate-public", "mark:approved", "cleanup-private"]);
  assert.equal(approvalResult.cleanupPending, false);
  assert.equal(approvalResult.team?.id, "team-1");

  const rejectionEvents: string[] = [];
  const rejectionResult = await reviewPendingTeamLogoRequest("rejected", {
    activateCandidate: async () => {
      rejectionEvents.push("activate-public");
      return { id: "team-1" };
    },
    cleanupCandidate: async () => {
      rejectionEvents.push("cleanup-private");
      return true;
    },
    markReviewed: async (decision) => {
      rejectionEvents.push(`mark:${decision}`);
    },
  });
  assert.deepEqual(rejectionEvents, ["mark:rejected", "cleanup-private"]);
  assert.equal(rejectionResult.team, null);
  assert.equal(rejectionResult.cleanupPending, false);

  assert.throws(
    () =>
      assertTeamLogoCandidateOwnership("team-1", "candidate-1", {
        filePath: "teams/team-2/pending/logo.png",
        fileType: "team_logo_pending",
        id: "candidate-1",
        relatedId: "team-2",
        relatedType: "team_logo_candidate",
      }),
    TeamLogoApprovalError,
  );

  assert.equal(getManagedPublicObjectKeyFromUrl("/api/uploads/r2?key=teams%2Fteam-1%2Flogo-v1.png"), "teams/team-1/logo-v1.png");
  assert.equal(
    validateSameOriginRequest(new Request("https://bravo.example/api/admin/teams", { method: "POST" })),
    "A same-origin request is required.",
  );
  assert.equal(
    validateSameOriginRequest(
      new Request("https://bravo.example/api/admin/teams", {
        headers: { origin: "https://bravo.example", "sec-fetch-site": "same-origin" },
        method: "POST",
      }),
    ),
    null,
  );

  const routeOriginResponse = await teamLogoRoutePost(
    new Request("https://bravo.example/api/admin/teams/00000000-0000-4000-8000-000000000000/logo", {
      method: "POST",
    }),
    { params: Promise.resolve({ id: "00000000-0000-4000-8000-000000000000" }) },
  );
  assert.equal(routeOriginResponse.status, 403);
  assert.deepEqual(await routeOriginResponse.json(), {
    code: "invalid_origin",
    error: "A same-origin request is required.",
    success: false,
  });
  assert.equal(getManagedPublicObjectKeyFromUrl("https://attacker.invalid/api/uploads/r2?key=teams%2Fvictim.png"), null);

  const workspaceUploadRouteSource = await readFile(new URL("../app/api/team/upload/route.ts", import.meta.url), "utf8");
  assert.match(workspaceUploadRouteSource, /createPendingTeamLogoRequest/);
  assert.match(workspaceUploadRouteSource, /createTeamRosterRequest/);
  assert.match(workspaceUploadRouteSource, /uploadPrivateObjectAtKey/);
  assert.doesNotMatch(workspaceUploadRouteSource, /previousUrl/);
  assert.doesNotMatch(workspaceUploadRouteSource, /uploadPublicFile/);
  assert.doesNotMatch(workspaceUploadRouteSource, /updateCanonicalAdminTeam/);
  assert.doesNotMatch(workspaceUploadRouteSource, /uploadPublicObjectAtKey/);

  const adminReviewRouteSource = await readFile(new URL("../app/api/admin/team-requests/route.ts", import.meta.url), "utf8");
  assert.match(adminReviewRouteSource, /requirePlatformAdmin/);
  assert.match(adminReviewRouteSource, /replaceTeamLogoAtomically/);
  assert.match(adminReviewRouteSource, /assertTeamLogoCandidateOwnership/);
  assert.match(adminReviewRouteSource, /verifyPublicObjectDelivery/);
  assert.match(adminReviewRouteSource, /team_request_already_reviewed/);
  assert.match(adminReviewRouteSource, /adminLogoReviewClaim/);
  assert.match(adminReviewRouteSource, /readLogoReviewClaim/);
  assert.match(adminReviewRouteSource, /hasLogoReviewClaimPayload/);
  assert.match(adminReviewRouteSource, /isLogoReviewClaimFresh/);
  assert.match(adminReviewRouteSource, /LOGO_REVIEW_MAX_CLOCK_SKEW_MS/);
  assert.match(adminReviewRouteSource, /claimAgeMs >= -LOGO_REVIEW_MAX_CLOCK_SKEW_MS && claimAgeMs < LOGO_REVIEW_CLAIM_TTL_MS/);
  assert.match(adminReviewRouteSource, /originalStatus/);
  assert.match(adminReviewRouteSource, /withoutLogoReviewClaim/);
  assert.match(
    adminReviewRouteSource,
    /existingRequest\.status === "review_later"[\s\S]*status === "review_later"[\s\S]*already set aside for later review/,
  );
  assert.match(
    adminReviewRouteSource,
    /hasLogoReviewClaimPayload\(existingRequest\)[\s\S]*status !== "approved"[\s\S]*status !== "rejected"[\s\S]*request_in_progress/,
  );
  assert.doesNotMatch(adminReviewRouteSource, /\.then\(\(\) => undefined\)\s*\.catch/);

  const genericAdminUploadRouteSource = await readFile(new URL("../app/api/admin/uploads/r2/route.ts", import.meta.url), "utf8");
  assert.match(genericAdminUploadRouteSource, /prepareCanonicalPublicImageUpload/);
  assert.match(genericAdminUploadRouteSource, /verifyPublicObjectDelivery/);
  assert.match(genericAdminUploadRouteSource, /writeRequiredAuditLogFromRequest/);
  assert.doesNotMatch(genericAdminUploadRouteSource, /deleteFromStorageByUrl/);

  const canonicalTeamSource = await readFile(new URL("../lib/canonical-teams.ts", import.meta.url), "utf8");
  const genericTeamParser = canonicalTeamSource.match(/export function parseCanonicalTeamWriteInput[\s\S]+?^}/m)?.[0] ?? "";
  const genericTeamUpdate = canonicalTeamSource.match(/function buildTeamUpdate[\s\S]+?^}/m)?.[0] ?? "";
  assert.doesNotMatch(genericTeamParser, /logoUrl|logo_url/);
  assert.doesNotMatch(genericTeamUpdate, /logo_url/);
  assert.match(canonicalTeamSource, /replaceCanonicalTeamLogoWithCas/);
  assert.match(canonicalTeamSource, /\.eq\("updated_at", input\.expectedUpdatedAt\)/);
  const canonicalIdentityValidation =
    canonicalTeamSource.match(/async function assertCanonicalTeamIdentitiesAvailable[\s\S]+?^}/m)?.[0] ?? "";
  assert.match(canonicalIdentityValidation, /team\.name/);
  assert.match(canonicalIdentityValidation, /team\.tag/);
  assert.match(canonicalIdentityValidation, /team\.slug/);
  assert.match(canonicalIdentityValidation, /team\.aliases/);
  assert.doesNotMatch(canonicalIdentityValidation, /shortName|short_name/);

  const publicUploadRouteSource = await readFile(new URL("../app/api/uploads/r2/route.ts", import.meta.url), "utf8");
  assert.doesNotMatch(publicUploadRouteSource, /buildPublicAssetFallbackResponse/);
  assert.match(publicUploadRouteSource, /status: 404/);

  assert.match(workspaceUploadRouteSource, /pendingMossObjectPath/);
  assert.match(workspaceUploadRouteSource, /pendingMossUploadRecordId/);
  assert.match(workspaceUploadRouteSource, /verifyPrivateObject\(uploadResult\.path/);
  assert.match(workspaceUploadRouteSource, /deletePrivateObjectByKey\(pendingMossObjectPath\)/);

  const registrationLogoRouteSource = await readFile(new URL("../app/api/registrations/logo/route.ts", import.meta.url), "utf8");
  assert.match(registrationLogoRouteSource, /prepareCanonicalImage/);
  assert.doesNotMatch(registrationLogoRouteSource, /previousUrl/);

  const registrationApprovalRouteSource = await readFile(new URL("../app/api/registrations/route.ts", import.meta.url), "utf8");
  assert.match(registrationApprovalRouteSource, /requirePlatformAdmin/);
  assert.match(registrationApprovalRouteSource, /requireSameOrigin/);
  assert.match(registrationApprovalRouteSource, /approveCanonicalTeamRegistration/);
  assert.match(registrationApprovalRouteSource, /writeRequiredAuditLogFromRequest/);
  assert.doesNotMatch(registrationApprovalRouteSource, /\bgetTeam\b/);
  assert.doesNotMatch(registrationApprovalRouteSource, /\bsaveTeam\b/);
  assert.doesNotMatch(registrationApprovalRouteSource, /\buploadPublicFile\b/);
  assert.doesNotMatch(registrationApprovalRouteSource, /\bslugify\b/);

  const registrationApprovalSource = await readFile(new URL("../lib/registration-approval.ts", import.meta.url), "utf8");
  assert.match(registrationApprovalSource, /createCanonicalAdminTeam/);
  assert.match(registrationApprovalSource, /isCanonicalTeamId/);
  assert.match(registrationApprovalSource, /prepareCanonicalPublicImageUpload/);
  assert.match(registrationApprovalSource, /verifyPublicObjectDelivery/);
  assert.match(registrationApprovalSource, /replaceTeamLogoAtomically/);
  assert.match(registrationApprovalSource, /replaceCanonicalTeamLogoWithCas/);
  assert.match(registrationApprovalSource, /retain_registration_team_for_recovery/);
  assert.match(registrationApprovalSource, /writeRequiredAuditLogFromRequest/);
  assert.doesNotMatch(registrationApprovalSource, /deleteCreatedCanonicalTeam/);

  const directTeamLogoRouteSource = await readFile(new URL("../app/api/admin/teams/[id]/logo/route.ts", import.meta.url), "utf8");
  const directTeamLogoDelete = directTeamLogoRouteSource.match(/export async function DELETE[\s\S]+$/)?.[0] ?? "";
  assert.ok(
    directTeamLogoDelete.indexOf("revalidateTeamAssetPaths") < directTeamLogoDelete.indexOf("deleteFromStorageByUrl"),
    "Direct logo removal must revalidate before deleting the previous object.",
  );

  const competitionRelationalSource = await readFile(new URL("../lib/competition-relational.ts", import.meta.url), "utf8");
  assert.match(competitionRelationalSource, /\.eq\("is_active", true\)/);
  assert.match(competitionRelationalSource, /\.eq\("status", "active"\)/);
  assert.match(competitionRelationalSource, /\.is\("archived_at", null\)/);
  assert.match(competitionRelationalSource, /\.is\("merged_into_team_id", null\)/);
  assert.match(competitionRelationalSource, /row\.status\.trim\(\)\.toLowerCase\(\) === "active"/);

  const publicDataSource = await readFile(new URL("../lib/data.ts", import.meta.url), "utf8");
  assert.match(publicDataSource, /team\.deletedAt \|\| team\.status !== "active"/);

  const publicTeamRouteSource = await readFile(new URL("../app/api/teams/[id]/route.ts", import.meta.url), "utf8");
  const publicGetHandler = publicTeamRouteSource.match(/export async function GET[\s\S]+?(?=export async function PUT)/)?.[0] ?? "";
  assert.match(publicGetHandler, /getTeams/);
  assert.doesNotMatch(publicGetHandler, /getCanonicalAdminTeam/);
  assert.doesNotMatch(publicGetHandler, /sourceMetadata/);

  console.log("Canonical team-logo image, pending approval, rollback, ownership, proxy cleanup, and route-origin QA passed.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
