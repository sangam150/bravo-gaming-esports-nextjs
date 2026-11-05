import assert from "node:assert/strict";
import pg from "pg";
import { getVerifiedDatabaseConnection } from "../scripts/lib/verified-database-connection.mjs";

const { Client } = pg;

const accountEmail = (process.env.AUTH_READINESS_EMAIL || process.env.QA_STAGING_ADMIN_EMAIL)?.trim().toLowerCase();
const expectedRole = process.env.AUTH_READINESS_ROLE?.trim();
const databaseUrl = process.env.DATABASE_URL?.trim() || process.env.DIRECT_URL?.trim();
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();

assert(accountEmail, "AUTH_READINESS_EMAIL is required.");
assert(databaseUrl, "DATABASE_URL or DIRECT_URL is required.");
assert(supabaseUrl, "NEXT_PUBLIC_SUPABASE_URL is required.");

const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
const connection = getVerifiedDatabaseConnection(databaseUrl, "Account-readiness database", projectRef);
const client = new Client({ connectionString: connection.connectionString, ssl: connection.ssl, connectionTimeoutMillis: 10_000 });

try {
  await client.connect();

  const userResult = await client.query(
    `
      select
        id,
        confirmed_at is not null as confirmed,
        email_confirmed_at is not null as email_confirmed,
        coalesce(length(encrypted_password), 0) > 0 as password_configured,
        last_sign_in_at
      from auth.users
      where lower(email) = lower($1)
    `,
    [accountEmail],
  );

  assert.equal(userResult.rowCount, 1, "The protected account must exist exactly once in Auth.");
  const account = userResult.rows[0];

  const [identityResult, profileResult] = await Promise.all([
    client.query("select provider from auth.identities where user_id = $1 order by provider", [account.id]),
    client.query(
      `
        select id, role, role_source, is_active
        from public.profiles
        where auth_user_id = $1
      `,
      [account.id],
    ),
  ]);

  const report = {
    authUserId: account.id,
    emailConfirmed: account.email_confirmed || account.confirmed,
    hasSignedIn: account.last_sign_in_at !== null,
    identityProviders: identityResult.rows.map((row) => row.provider),
    passwordConfigured: account.password_configured,
    profileId: profileResult.rows[0]?.id ?? null,
    profileRole: profileResult.rows[0]?.role ?? null,
    roleSource: profileResult.rows[0]?.role_source ?? null,
    projectRef,
  };
  console.log(JSON.stringify(report, null, 2));

  assert.equal(report.emailConfirmed, true, "The protected account email must be confirmed.");
  assert.equal(report.passwordConfigured, true, "The protected account must have a password configured.");
  assert.equal(profileResult.rowCount, 1, "The protected account must have exactly one profile.");
  if (expectedRole) assert.equal(profileResult.rows[0].role, expectedRole, `The protected account profile must remain ${expectedRole}.`);
  else
    assert.ok(
      ["super_admin", "admin", "moderator", "organizer"].includes(report.profileRole),
      "The designated account does not have an administrative role. Owner review is required; this check never changes roles.",
    );
  assert.equal(profileResult.rows[0].is_active, true, "The protected account profile must remain active.");
  assert.ok(
    report.roleSource !== "discord_sync" || process.env.DISCORD_RELATIONAL_TEAM_AUTH_ENABLED === "true",
    "Discord-derived access is disabled; an owner must review the profile's manual role assignment.",
  );
} finally {
  await client.end().catch(() => undefined);
}
