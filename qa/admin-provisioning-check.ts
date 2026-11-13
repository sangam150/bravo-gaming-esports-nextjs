import assert from "node:assert/strict";
import { createClient, type User } from "@supabase/supabase-js";
import type { Database } from "../types/database.types";
import { provisionAdmin, readAdminProvisionOptions } from "../scripts/provision-admin";

// Installed SDK, in-process responses only. No real project or credentials.
const projectRef = "aaaaaaaaaaaaaaaaaaaa";
const origin = `https://${projectRef}.supabase.co`;
const email = "temporary-owner-approved@example.invalid";
const authId = "00000000-0000-4000-8000-000000000031";
const profileId = "00000000-0000-4000-8000-000000000032";
const password = "Offline-fixture-password-only-123!";
const environment = { NEXT_PUBLIC_SUPABASE_URL: origin, SUPABASE_SECRET_KEY: "offline-server", ADMIN_PROVISION_PASSWORD: password };
const args = [`--email=${email}`, "--role=admin", `--project-ref=${projectRef}`, "--confirm=PROVISION"];
const user = {
  id: authId,
  email,
  email_confirmed_at: "2026-01-01T00:00:00Z",
  aud: "authenticated",
  role: "authenticated",
  created_at: "2026-01-01T00:00:00Z",
  app_metadata: {},
  user_metadata: { role: "super_admin", name: "Offline owner account" },
} as User;
type Profile = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "id" | "auth_user_id" | "email" | "role" | "role_source" | "is_active" | "display_name" | "updated_at"
>;
const viewer: Profile = {
  id: profileId,
  auth_user_id: authId,
  email,
  role: "viewer",
  role_source: "system",
  is_active: true,
  display_name: "Preserved name",
  updated_at: "2026-01-01T00:00:00Z",
};
type Scenario = {
  pages?: User[][];
  profile?: Profile | null;
  profileSchemaError?: boolean;
  auditSchemaError?: boolean;
  profileLookupError?: boolean;
  profileWriteError?: boolean;
  auditWriteError?: boolean;
  concurrentWrite?: boolean;
  concurrentAfterAuditFailure?: boolean;
  createError?: boolean;
  cleanupError?: boolean;
  triggerProfile?: boolean;
  wrongSavedRole?: boolean;
  unexpectedCreatedEmail?: boolean;
};

function fixture(scenario: Scenario = {}) {
  const pages = scenario.pages ?? [[user]];
  let profile = scenario.profile === undefined ? { ...viewer } : scenario.profile && { ...scenario.profile };
  const requests: Array<{ method: string; path: string; body: Record<string, unknown> | null }> = [];
  const requestedPages: number[] = [];
  const created: Array<Record<string, unknown>> = [];
  const deleted: string[] = [];
  const audit: Array<Record<string, unknown>> = [];
  const profileWrites: Array<Record<string, unknown>> = [];
  const failed = (code: string) => Response.json({ code, message: "Offline failure" }, { status: 400 });
  const fetcher: typeof fetch = async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    assert.equal(url.origin, origin, "Provisioning regression must never contact a live host");
    const method = init?.method || "GET";
    const body = typeof init?.body === "string" ? (JSON.parse(init.body) as Record<string, unknown>) : null;
    const singular = new Headers(init?.headers).get("accept")?.includes("object+json");
    const rows = (values: unknown[]) => Response.json(singular ? (values[0] ?? null) : values);
    requests.push({ method, path: url.pathname, body });
    if (url.pathname === "/auth/v1/admin/users" && method === "GET") {
      const page = Number(url.searchParams.get("page"));
      requestedPages.push(page);
      return Response.json(
        { users: pages[page - 1] || [], aud: "authenticated" },
        { headers: { "x-total-count": String(pages.flat().length), link: `<${origin}/auth/v1/admin/users?page=2>; rel="last"` } },
      );
    }
    if (url.pathname === "/auth/v1/admin/users" && method === "POST") {
      created.push(body!);
      if (scenario.createError) return failed("email_exists");
      if (scenario.triggerProfile) profile = { ...viewer };
      return Response.json(scenario.unexpectedCreatedEmail ? { ...user, email: "unrelated@example.invalid" } : user);
    }
    if (url.pathname === `/auth/v1/admin/users/${authId}` && method === "DELETE") {
      deleted.push(authId);
      if (scenario.cleanupError) return failed("cleanup_failed");
      profile = null;
      return Response.json(user);
    }
    if (url.pathname === "/rest/v1/profiles") {
      if (method === "GET") {
        if (url.searchParams.get("limit") === "0") return scenario.profileSchemaError ? failed("42703") : Response.json([]);
        if (scenario.profileLookupError) return failed("LOOKUP_FAILED");
        return rows(profile ? [profile] : []);
      }
      if (method === "POST" || method === "PATCH") {
        profileWrites.push(body!);
        if (scenario.profileWriteError) return failed("WRITE_FAILED");
        if (method === "PATCH" && (scenario.concurrentWrite || url.searchParams.get("updated_at") !== `eq.${profile?.updated_at}`))
          return rows([]);
        profile = { ...viewer, ...profile, ...body } as Profile;
        if (scenario.wrongSavedRole && body?.role === "admin") profile.role = "viewer";
        return rows([profile]);
      }
    }
    if (url.pathname === "/rest/v1/audit_logs") {
      if (method === "GET") return scenario.auditSchemaError ? failed("42703") : Response.json([]);
      if (method === "POST") {
        audit.push(body!);
        if (scenario.auditWriteError) {
          if (scenario.concurrentAfterAuditFailure && profile)
            profile = { ...profile, role: "organizer", updated_at: "2027-01-01T00:00:00Z" };
          return failed("AUDIT_FAILED");
        }
        return new Response(null, { status: 201 });
      }
    }
    throw new Error(`Unexpected offline provisioning request: ${method} ${url.pathname}`);
  };
  const client = createClient<Database>(origin, "offline-server", {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: fetcher },
  });
  return {
    client,
    requests,
    requestedPages,
    created,
    deleted,
    audit,
    profileWrites,
    get profile() {
      return profile;
    },
  };
}

async function main() {
  const options = readAdminProvisionOptions(args, environment);
  assert.equal(options.createIfMissing, false);
  assert.equal(options.allowExistingProfileChange, false);
  assert.throws(
    () =>
      readAdminProvisionOptions(
        args.filter((arg) => !arg.startsWith("--confirm=")),
        environment,
      ),
    /PROVISION/,
  );
  assert.throws(
    () => readAdminProvisionOptions(args, { ...environment, NEXT_PUBLIC_SUPABASE_URL: "https://bbbbbbbbbbbbbbbbbbbb.supabase.co" }),
    /does not match/,
  );
  assert.throws(
    () => readAdminProvisionOptions(args, { ...environment, NEXT_PUBLIC_SUPABASE_URL: origin.replace("https:", "http:") }),
    /HTTPS/,
  );
  assert.throws(() => readAdminProvisionOptions([...args, "--password=do-not-use-cli-passwords"], environment), /never pass passwords/);
  assert.throws(() => readAdminProvisionOptions([...args, "--password-env=NEXT_PUBLIC_PASSWORD"], environment), /private server/);
  for (const name of ["NODE_OPTIONS", "SUPABASE_SECRET_KEY", "DATABASE_URL"]) {
    assert.throws(() => readAdminProvisionOptions([...args, `--password-env=${name}`], environment), /private server password/);
  }
  const legacy = (ref: string, role: string) =>
    [
      Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url"),
      Buffer.from(JSON.stringify({ ref, role })).toString("base64url"),
      "offline-signature",
    ].join(".");
  assert.equal(
    readAdminProvisionOptions(args, { NEXT_PUBLIC_SUPABASE_URL: origin, SUPABASE_SERVICE_ROLE_KEY: legacy(projectRef, "service_role") })
      .projectRef,
    projectRef,
  );
  assert.throws(
    () =>
      readAdminProvisionOptions(args, {
        NEXT_PUBLIC_SUPABASE_URL: origin,
        SUPABASE_SERVICE_ROLE_KEY: legacy("bbbbbbbbbbbbbbbbbbbb", "service_role"),
      }),
    /selected project/,
  );
  assert.throws(
    () => readAdminProvisionOptions(args, { NEXT_PUBLIC_SUPABASE_URL: origin, SUPABASE_SERVICE_ROLE_KEY: legacy(projectRef, "anon") }),
    /service role/,
  );

  const approved: Profile = { ...viewer, role: "admin", role_source: "manual" };
  const existing = fixture({ profile: approved });
  assert.equal((await provisionAdmin(existing.client, options, environment)).status, "already_provisioned");
  assert.equal(
    existing.requests.some((request) => request.method !== "GET"),
    false,
  );

  const unapproved = fixture();
  await assert.rejects(provisionAdmin(unapproved.client, { ...options, createIfMissing: true }, environment), /separate owner approval/);
  assert.equal(
    unapproved.requests.some((request) => request.method !== "GET"),
    false,
  );
  assert.deepEqual(unapproved.profile, viewer);

  const grant = fixture();
  const granted = await provisionAdmin(grant.client, { ...options, allowExistingProfileChange: true }, environment);
  assert.equal(granted.authUserCreated, false);
  assert.equal(grant.profile?.role, "admin");
  assert.equal(grant.profile?.role_source, "manual");
  assert.equal(grant.profile?.is_active, true);
  assert.equal(grant.profile?.display_name, "Preserved name");
  assert.equal(grant.created.length, 0);
  assert.equal(grant.deleted.length, 0);
  assert.equal(grant.audit.length, 1);
  assert.equal(JSON.stringify(grant.audit).includes(password), false);
  assert.equal(
    grant.requests.some((request) => request.path.startsWith("/auth/") && request.method !== "GET"),
    false,
  );

  const unconfirmed = fixture({ pages: [[{ ...user, email_confirmed_at: undefined }]] });
  await assert.rejects(provisionAdmin(unconfirmed.client, { ...options, createIfMissing: true }, environment), /confirm their email/);
  assert.equal(
    unconfirmed.requests.some((request) => request.method !== "GET"),
    false,
  );

  const absent = fixture({ pages: [], profile: null });
  await assert.rejects(provisionAdmin(absent.client, options, environment), /No matching/);
  assert.equal(absent.created.length, 0);

  for (const schema of ["profileSchemaError", "auditSchemaError"] as const) {
    const missingSchema = fixture({ pages: [], profile: null, [schema]: true });
    await assert.rejects(provisionAdmin(missingSchema.client, { ...options, createIfMissing: true }, environment), /schema is unavailable/);
    assert.equal(
      missingSchema.requests.some((request) => request.method !== "GET"),
      false,
      "Schema preflight must precede Auth creation",
    );
  }

  const missingPassword = fixture({ pages: [], profile: null });
  await assert.rejects(
    provisionAdmin(missingPassword.client, { ...options, createIfMissing: true }, {}),
    /private ADMIN_PROVISION_PASSWORD/,
  );
  assert.equal(missingPassword.created.length, 0);

  const reusedServerKey = fixture({ pages: [], profile: null });
  const longServerKey = "offline-server-key-value-that-must-not-be-an-auth-password";
  await assert.rejects(
    provisionAdmin(
      reusedServerKey.client,
      { ...options, createIfMissing: true, serverKey: longServerKey },
      { ADMIN_PROVISION_PASSWORD: longServerKey },
    ),
    /must not reuse the Supabase server key/,
  );
  assert.equal(reusedServerKey.created.length, 0);

  const created = fixture({ pages: [], profile: null, triggerProfile: true });
  const createdResult = await provisionAdmin(created.client, { ...options, createIfMissing: true }, environment);
  assert.equal(createdResult.authUserCreated, true);
  assert.equal(created.created.length, 1);
  assert.deepEqual(Object.keys(created.created[0]).sort(), ["email", "email_confirm", "password"]);
  assert.equal(created.created[0].email, email);
  assert.equal(created.created[0].email_confirm, true);
  assert.equal(created.created[0].password, password);
  assert.equal(created.profile?.role, "admin");
  assert.equal(created.audit.length, 1);
  assert.equal(created.deleted.length, 0);

  const pagination = fixture({
    pages: [[{ ...user, id: "00000000-0000-4000-8000-000000000099", email: "other@example.invalid" }], [user]],
    profile: approved,
  });
  assert.equal((await provisionAdmin(pagination.client, { ...options, createIfMissing: true }, environment)).authUserCreated, false);
  assert.deepEqual(pagination.requestedPages, [1, 2], "A server page smaller than the requested size must not hide an existing user");
  assert.equal(pagination.created.length, 0);

  const creationRace = fixture({ pages: [], profile: null, createError: true });
  await assert.rejects(
    provisionAdmin(creationRace.client, { ...options, createIfMissing: true }, environment),
    /existing users were not reset/,
  );
  assert.equal(creationRace.profileWrites.length, 0);
  assert.equal(creationRace.deleted.length, 0, "A failed create never authorizes deleting the concurrently existing account");

  const lookup = fixture({ profileLookupError: true });
  await assert.rejects(
    provisionAdmin(lookup.client, { ...options, allowExistingProfileChange: true }, environment),
    /existing profile could not be verified/,
  );
  assert.equal(
    lookup.requests.some((request) => request.method !== "GET"),
    false,
  );

  const wrongLink = fixture({ profile: { ...viewer, auth_user_id: "00000000-0000-4000-8000-000000000099" } });
  await assert.rejects(
    provisionAdmin(wrongLink.client, { ...options, allowExistingProfileChange: true }, environment),
    /linkage does not match/,
  );
  assert.equal(
    wrongLink.requests.some((request) => request.method !== "GET"),
    false,
  );

  const unexpectedIdentity = fixture({ pages: [], profile: null, unexpectedCreatedEmail: true });
  await assert.rejects(
    provisionAdmin(unexpectedIdentity.client, { ...options, createIfMissing: true }, environment),
    /unexpected identity/,
  );
  assert.equal(unexpectedIdentity.profileWrites.length, 0);
  assert.equal(unexpectedIdentity.deleted.length, 0, "An unexpected Auth response never authorizes deleting an unrelated identity");

  const wrongSavedRole = fixture({ wrongSavedRole: true });
  await assert.rejects(
    provisionAdmin(wrongSavedRole.client, { ...options, allowExistingProfileChange: true }, environment),
    /did not verify/,
  );
  assert.deepEqual(wrongSavedRole.profile, viewer);
  assert.equal(wrongSavedRole.audit.length, 0);

  const failedNewProfile = fixture({ pages: [], profile: null, profileWriteError: true });
  await assert.rejects(
    provisionAdmin(failedNewProfile.client, { ...options, createIfMissing: true }, environment),
    /Profile provisioning failed/,
  );
  assert.equal(failedNewProfile.created.length, 1);
  assert.deepEqual(failedNewProfile.deleted, [authId], "Only the Auth user created by this failed run may be removed");

  const conflict = fixture({ concurrentWrite: true });
  await assert.rejects(provisionAdmin(conflict.client, { ...options, allowExistingProfileChange: true }, environment), /conflicted/);
  assert.deepEqual(conflict.profile, viewer);
  assert.equal(conflict.audit.length, 0);

  const auditFailure = fixture({ auditWriteError: true });
  await assert.rejects(provisionAdmin(auditFailure.client, { ...options, allowExistingProfileChange: true }, environment), /audit failed/);
  assert.deepEqual(auditFailure.profile, viewer, "Audit failure must compensate the role grant when its written version is unchanged");
  assert.equal(auditFailure.profileWrites.length, 2);
  assert.equal(auditFailure.deleted.length, 0);

  const changedAfterGrant = fixture({ auditWriteError: true, concurrentAfterAuditFailure: true });
  await assert.rejects(
    provisionAdmin(changedAfterGrant.client, { ...options, allowExistingProfileChange: true }, environment),
    /compensation could not be confirmed/,
  );
  assert.equal(changedAfterGrant.profile?.role, "organizer", "Compensation must preserve a later owner's edit");

  const newAccountChangedAfterGrant = fixture({
    pages: [],
    profile: null,
    triggerProfile: true,
    auditWriteError: true,
    concurrentAfterAuditFailure: true,
  });
  await assert.rejects(
    provisionAdmin(newAccountChangedAfterGrant.client, { ...options, createIfMissing: true }, environment),
    /compensation could not be confirmed/,
  );
  assert.equal(newAccountChangedAfterGrant.created.length, 1);
  assert.equal(newAccountChangedAfterGrant.profile?.role, "organizer");
  assert.equal(
    newAccountChangedAfterGrant.deleted.length,
    0,
    "A concurrent owner's profile edit must not be erased by deleting the new Auth identity",
  );

  const failedCleanup = fixture({ pages: [], profile: null, profileWriteError: true, cleanupError: true });
  await assert.rejects(provisionAdmin(failedCleanup.client, { ...options, createIfMissing: true }, environment), /Owner review/);
  console.log(
    "PASS: offline SDK provisioning guards, complete account lookup, existing-account preservation, private-password opt-in creation, schema-before-create, approved role/audit writes, conflicts and guarded compensation. No external requests or real account changes.",
  );
}

void main().catch(() => {
  // The fixture contains a test-only password; avoid dumping request bodies.
  console.error("Offline admin provisioning regression failed; inspect the failed assertion locally.");
  process.exitCode = 1;
});
