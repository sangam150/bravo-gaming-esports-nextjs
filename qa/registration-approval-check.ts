import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  buildRegistrationApprovalExpectation,
  classifyRegistrationApprovalReread,
  registrationApprovalStateMatches,
} from "../lib/registration-approval-state";
import {
  isDefinitiveRegistrationSubmissionRejection,
  registrationSubmissionMatchesExpectation,
} from "../lib/registration-submission-state";
import type { TeamRegistration } from "../lib/types";

const pendingRegistration: TeamRegistration = {
  captainDiscord: "bravo.owner",
  captainName: "Bravo Owner",
  createdAt: "2026-07-28T00:00:00.000Z",
  id: "registration-1",
  playerNames: [],
  status: "pending",
  teamName: "Bravo Alpha",
  tournamentId: "tournament-1",
  tournamentTitle: "Bravo Invitational",
};

const expected = buildRegistrationApprovalExpectation(pendingRegistration, {
  approvedTeamId: "00000000-0000-4000-8000-000000000001",
  logoPath: "teams/team-1/logo.png",
  logoUploadId: "upload-1",
  logoUrl: "https://assets.example.test/teams/team-1/logo.png",
  tournamentId: "tournament-1",
  tournamentTitle: "Bravo Invitational",
});
const expectedWithoutLogo = buildRegistrationApprovalExpectation(pendingRegistration, {
  approvedTeamId: "00000000-0000-4000-8000-000000000001",
  logoPath: undefined,
  logoUploadId: undefined,
  logoUrl: undefined,
  tournamentId: "tournament-1",
  tournamentTitle: "Bravo Invitational",
});

assert.equal(classifyRegistrationApprovalReread(pendingRegistration, expected, expected), "committed");
assert.equal(classifyRegistrationApprovalReread(pendingRegistration, expectedWithoutLogo, expectedWithoutLogo), "committed");
assert.equal(classifyRegistrationApprovalReread(pendingRegistration, expected, pendingRegistration), "unchanged");
assert.equal(classifyRegistrationApprovalReread(pendingRegistration, expected, null), "ambiguous");
assert.equal(registrationApprovalStateMatches(pendingRegistration, { ...pendingRegistration, captainName: "Updated owner" }), true);
assert.equal(registrationApprovalStateMatches(pendingRegistration, { ...pendingRegistration, id: "registration-2" }), false);
assert.equal(
  classifyRegistrationApprovalReread(pendingRegistration, expected, {
    ...expected,
    approvedTeamId: "00000000-0000-4000-8000-000000000002",
  }),
  "ambiguous",
);
assert.equal(
  classifyRegistrationApprovalReread(pendingRegistration, expected, {
    ...pendingRegistration,
    status: "rejected",
  }),
  "ambiguous",
);
assert.equal(
  classifyRegistrationApprovalReread(pendingRegistration, expected, {
    ...expected,
    approvedTeamId: ` ${expected.approvedTeamId} `,
  }),
  "committed",
);
assert.equal(
  registrationSubmissionMatchesExpectation(pendingRegistration, {
    ...pendingRegistration,
    approvedTeamId: undefined,
  }),
  true,
);
assert.equal(
  registrationSubmissionMatchesExpectation(
    {
      ...pendingRegistration,
      logoUploadId: "upload-2",
    },
    {
      ...pendingRegistration,
      approvedTeamId: undefined,
      logoUploadId: "upload-1",
    },
  ),
  false,
);
assert.equal(
  registrationSubmissionMatchesExpectation(
    {
      ...pendingRegistration,
      status: "approved",
    },
    {
      ...pendingRegistration,
      approvedTeamId: undefined,
    },
  ),
  false,
);
assert.equal(isDefinitiveRegistrationSubmissionRejection({ code: "23505" }), true);
assert.equal(isDefinitiveRegistrationSubmissionRejection({ code: "42501" }), true);
assert.equal(isDefinitiveRegistrationSubmissionRejection({ code: "PGRST204" }), true);
assert.equal(isDefinitiveRegistrationSubmissionRejection({ code: "08006" }), false);
assert.equal(isDefinitiveRegistrationSubmissionRejection({ code: "PGRST000" }), false);
assert.equal(isDefinitiveRegistrationSubmissionRejection({ code: "" }), false);
assert.equal(isDefinitiveRegistrationSubmissionRejection(new TypeError("fetch failed")), false);

async function main() {
  const approvalSource = await readFile(new URL("../lib/registration-approval.ts", import.meta.url), "utf8");
  assert.match(approvalSource, /claimRegistrationForApproval/);
  assert.match(approvalSource, /registration_approval_in_progress/);
  assert.match(approvalSource, /updateRegistrationApprovalWithConfirmation/);
  assert.match(approvalSource, /rereadRegistrationForApproval/);
  assert.match(approvalSource, /if \(shouldPreserveUnconfirmedLogoArtifacts\(error\)\) throw error/);
  assert.match(approvalSource, /retain_registration_team_for_recovery/);
  assert.match(approvalSource, /releaseRegistrationApprovalClaim/);
  assert.match(approvalSource, /cleanupPendingRegistrationLogoCandidates/);
  assert.match(approvalSource, /listPendingRegistrationLogoUploadRecords/);
  assert.doesNotMatch(approvalSource, /deleteCreatedCanonicalTeam/);
  assert.doesNotMatch(approvalSource, /\.from\("teams"\)\s*\.delete\(\)/);
  assert.doesNotMatch(approvalSource, /\bsaveTeam\b/);

  const routeSource = await readFile(new URL("../app/api/registrations/route.ts", import.meta.url), "utf8");
  assert.match(routeSource, /requirePlatformAdmin/);
  assert.match(routeSource, /requireSameOrigin/);
  assert.match(routeSource, /export async function POST[\s\S]*?requireSameOrigin\(request\)/);
  assert.match(routeSource, /approveCanonicalTeamRegistration/);
  assert.match(routeSource, /isDefinitiveRegistrationSubmissionRejection/);
  assert.match(routeSource, /registrationSubmissionMatchesExpectation/);
  assert.match(routeSource, /registration_submission_recovery_required/);
  assert.match(routeSource, /requestedStatus === "approved" \? await cleanupPendingRegistrationLogoCandidates/);
  assert.match(
    routeSource,
    /confirmedRegistration[\s\S]*registrationSubmissionMatchesExpectation[\s\S]*else if \(confirmedRegistration\)[\s\S]*releaseUploadRecordEntityClaim/,
  );
  assert.match(routeSource, /!isDefinitiveRegistrationSubmissionRejection\(createError\)[\s\S]*releaseUploadRecordEntityClaim/);
  assert.match(routeSource, /registration_already_reviewed/);
  assert.match(routeSource, /registration_approval_in_progress/);
  assert.match(routeSource, /expectedRegistration: registration/);
  assert.doesNotMatch(routeSource, /\bsaveTeam\b/);

  const uploadRecordSource = await readFile(new URL("../lib/upload-records.ts", import.meta.url), "utf8");
  assert.match(uploadRecordSource, /listPendingRegistrationLogoUploadRecords/);
  assert.match(uploadRecordSource, /\.eq\("related_type", "team_registration"\)/);
  assert.match(uploadRecordSource, /\.eq\("related_id", relatedId\)/);
  assert.match(uploadRecordSource, /\.eq\("file_type", "team_logo_pending"\)/);

  const documentRuntimeSource = await readFile(new URL("../lib/supabase-document-runtime.ts", import.meta.url), "utf8");
  assert.match(documentRuntimeSource, /saveDocumentIfFieldsMatch/);
  assert.match(documentRuntimeSource, /\.eq\("updated_at", existingRow\.updated_at\)/);
  assert.match(documentRuntimeSource, /DocumentWriteConflictError/);

  console.log("Canonical registration approval QA passed");
}

void main();
