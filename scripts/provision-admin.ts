import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { isLegacyProfileCompatibilityError } from "../lib/supabase/profile-identity";
import type { Database } from "../types/database.types";

const ADMIN_ROLES = new Set(["super_admin", "admin", "moderator", "organizer"]);
const PROFILE_FIELDS = "id,auth_user_id,email,role,role_source,is_active,display_name,updated_at" as const;
const LEGACY_PROFILE_FIELDS = "id,auth_user_id,email,role,status,display_name,updated_at" as const;
const AUDIT_FIELDS = "id,actor_id,action,entity_type,entity_id,old_data,new_data" as const;
const PAGE_SIZE = 1000;
const PRIVATE_PASSWORD_ENV_NAMES = new Set(["ADMIN_PROVISION_PASSWORD", "QA_STAGING_ADMIN_PASSWORD"]);
type ProfileSchema = "modern" | "legacy";
type Profile = Pick<Database["public"]["Tables"]["profiles"]["Row"], "id" | "auth_user_id" | "email" | "role" | "display_name" | "updated_at"> & {
  role_source: string;
  is_active: boolean;
  schema: ProfileSchema;
};
type Client = SupabaseClient<Database>;
type Environment = Record<string, string | undefined>;
class AdminProvisionError extends Error {}

function safeProvisionErrorDiagnostic(error: unknown) {
  const record = error && typeof error === "object" ? error as Record<string, unknown> : {};
  const code = typeof record.code === "string" && /^[A-Z0-9_]{1,24}$/i.test(record.code) ? record.code : "unknown";
  const text = [record.message, record.details, record.hint].filter((value): value is string => typeof value === "string").join(" ");
  const constraint = /constraint\s+["']([a-zA-Z0-9_]{1,80})["']/.exec(text)?.[1] ?? null;
  return constraint ? `${code}:${constraint}` : code;
}

export type AdminProvisionOptions = {
  email: string;
  role: Database["public"]["Enums"]["user_role"];
  projectRef: string;
  url: string;
  serverKey: string;
  createIfMissing: boolean;
  passwordEnv: string;
  allowExistingProfileChange: boolean;
};

export function readAdminProvisionOptions(argv: string[], environment: Environment = process.env): AdminProvisionOptions {
  const allowed = new Set([
    "email",
    "role",
    "project-ref",
    "confirm",
    "create-if-missing",
    "password-env",
    "allow-existing-profile-change",
  ]);
  const args = new Map<string, string>();
  for (const argument of argv) {
    const match = /^--([a-z-]+)=(.*)$/.exec(argument);
    if (!match || !allowed.has(match[1]) || args.has(match[1]))
      throw new AdminProvisionError("Use unique supported --name=value arguments; never pass passwords on the command line.");
    args.set(match[1], match[2]);
  }
  const email = (args.get("email") ?? "").trim().toLowerCase();
  const role = (args.get("role") ?? "").trim();
  const projectRef = (args.get("project-ref") ?? "").trim();
  const url = environment.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const serverKey = environment.SUPABASE_SECRET_KEY?.trim() || environment.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new AdminProvisionError("A valid --email is required.");
  if (!ADMIN_ROLES.has(role)) throw new AdminProvisionError("Unsupported administrative role.");
  if (!/^[a-z0-9]{20}$/.test(projectRef)) throw new AdminProvisionError("A valid explicit --project-ref is required.");
  let target: URL;
  try {
    target = new URL(url);
  } catch {
    throw new AdminProvisionError("Server-side Supabase URL is missing or invalid.");
  }
  if (
    target.protocol !== "https:" ||
    target.origin !== `https://${projectRef}.supabase.co` ||
    target.username ||
    target.password ||
    target.search ||
    target.hash ||
    !["", "/"].includes(target.pathname)
  ) {
    throw new AdminProvisionError("The explicit --project-ref does not match the configured HTTPS Supabase project.");
  }
  if (args.get("confirm") !== "PROVISION") throw new AdminProvisionError("Refusing to provision without --confirm=PROVISION.");
  if (!serverKey || serverKey.startsWith("sb_publishable_"))
    throw new AdminProvisionError("A private server-side Supabase key is required.");
  if (serverKey.startsWith("eyJ")) {
    let claims: { ref?: unknown; role?: unknown };
    try {
      claims = JSON.parse(Buffer.from(serverKey.split(".")[1] ?? "", "base64url").toString("utf8"));
    } catch {
      throw new AdminProvisionError("The configured legacy server key is invalid.");
    }
    if (claims.ref !== projectRef || claims.role !== "service_role")
      throw new AdminProvisionError("The legacy server key does not match the explicitly selected project and service role.");
  }
  if (args.has("create-if-missing") && args.get("create-if-missing") !== "CREATE")
    throw new AdminProvisionError("New Auth users require --create-if-missing=CREATE.");
  if (args.has("allow-existing-profile-change") && args.get("allow-existing-profile-change") !== "APPROVE")
    throw new AdminProvisionError("Existing profile changes require --allow-existing-profile-change=APPROVE.");
  const passwordEnv = args.get("password-env") || "ADMIN_PROVISION_PASSWORD";
  if (!PRIVATE_PASSWORD_ENV_NAMES.has(passwordEnv))
    throw new AdminProvisionError(
      "--password-env must name a supported private server password variable: ADMIN_PROVISION_PASSWORD or QA_STAGING_ADMIN_PASSWORD.",
    );
  return {
    email,
    role: role as AdminProvisionOptions["role"],
    projectRef,
    url: target.origin,
    serverKey,
    createIfMissing: args.get("create-if-missing") === "CREATE",
    passwordEnv,
    allowExistingProfileChange: args.get("allow-existing-profile-change") === "APPROVE",
  };
}

async function findAuthUser(client: Client, email: string): Promise<User | null> {
  let seen = 0;
  for (let page = 1; page <= 1000; page += 1) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage: PAGE_SIZE });
    if (error) throw new AdminProvisionError("Auth user lookup failed; no account changes were attempted.");
    const found = data.users.find((candidate) => candidate.email?.trim().toLowerCase() === email);
    if (found) return found;
    // Do not rely on the SDK's parsed next-page link when looking for an
    // existing account beyond the first page.
    seen += data.users.length;
    if (data.users.length === 0 || (data.total > 0 && seen >= data.total)) return null;
  }
  throw new AdminProvisionError("Auth user lookup exceeded its safe pagination limit; no user was created.");
}

async function requireProvisioningSchema(client: Client): Promise<ProfileSchema> {
  const [modernProfile, audit] = await Promise.all([
    client.from("profiles").select(PROFILE_FIELDS).limit(0),
    client.from("audit_logs").select(AUDIT_FIELDS).limit(0),
  ]);
  if (audit.error)
    throw new AdminProvisionError(
      "Required audit schema is unavailable; no Auth user was created. Review the target migration ledger first.",
    );
  if (!modernProfile.error) return "modern";
  if (isLegacyProfileCompatibilityError(modernProfile.error)) {
    const legacyProfile = await client.from("profiles").select(LEGACY_PROFILE_FIELDS as typeof PROFILE_FIELDS).limit(0);
    if (!legacyProfile.error) return "legacy";
  }
  throw new AdminProvisionError(
    "Required profile schema is unavailable; no Auth user was created. Review the target migration ledger first.",
  );
}

function normalizeProfile(data: unknown, schema: ProfileSchema): Profile | null {
  if (!data || typeof data !== "object") return null;
  const row = data as Record<string, unknown>;
  if (!["id", "auth_user_id", "email", "role", "updated_at"].every((name) => typeof row[name] === "string" && row[name])) {
    throw new AdminProvisionError("The returned profile is incomplete; provisioning was rejected.");
  }
  const active = schema === "modern" ? row.is_active === true : String(row.status ?? "").trim().toLowerCase() === "active";
  return {
    id: String(row.id),
    auth_user_id: String(row.auth_user_id),
    email: String(row.email),
    role: String(row.role) as Profile["role"],
    role_source: schema === "modern" ? String(row.role_source ?? "") : "legacy_schema",
    is_active: active,
    display_name: typeof row.display_name === "string" ? row.display_name : null,
    updated_at: String(row.updated_at),
    schema,
  };
}

async function readProfile(client: Client, authUserId: string, schema: ProfileSchema): Promise<Profile | null> {
  const fields = schema === "modern" ? PROFILE_FIELDS : LEGACY_PROFILE_FIELDS;
  const { data, error } = await client.from("profiles").select(fields as typeof PROFILE_FIELDS).eq("auth_user_id", authUserId).maybeSingle();
  if (error) throw new AdminProvisionError("The existing profile could not be verified; no profile changes were attempted.");
  const profile = normalizeProfile(data, schema);
  if (profile && profile.auth_user_id !== authUserId)
    throw new AdminProvisionError("The returned profile linkage does not match the verified Auth user; no profile changes were attempted.");
  return profile;
}

export async function provisionAdmin(client: Client, options: AdminProvisionOptions, environment: Environment = process.env) {
  let authUser = await findAuthUser(client, options.email);
  if (!authUser && !options.createIfMissing)
    throw new AdminProvisionError(
      "No matching Supabase Auth user exists. Invite or create the user first, or explicitly approve --create-if-missing=CREATE.",
    );
  if (authUser && !authUser.email_confirmed_at)
    throw new AdminProvisionError(
      "The matching Supabase Auth user must confirm their email before administrative access can be provisioned.",
    );
  const profileSchema = await requireProvisioningSchema(client);

  let createdAuthUser = false;
  let writtenProfile: Profile | null = null;
  let previousProfile: Profile | null = null;
  try {
    if (!authUser) {
      const password = environment[options.passwordEnv];
      if (!password || password.length < 16 || password.length > 1024)
        throw new AdminProvisionError(
          `Configure a new secure password of at least 16 characters in private ${options.passwordEnv}; never put it in CLI arguments or logs.`,
        );
      if (password === options.serverKey) throw new AdminProvisionError("The Auth password must not reuse the Supabase server key.");
      const { data, error } = await client.auth.admin.createUser({ email: options.email, password, email_confirm: true });
      if (error || !data.user) throw new AdminProvisionError("Auth user creation failed; existing users were not reset or overwritten.");
      if (data.user.email?.trim().toLowerCase() !== options.email)
        throw new AdminProvisionError("Auth creation returned an unexpected identity. No role was granted; owner review is required.");
      authUser = data.user;
      createdAuthUser = true;
    }
    if (!authUser.email_confirmed_at)
      throw new AdminProvisionError(
        "The matching Supabase Auth user must confirm their email before administrative access can be provisioned.",
      );
    previousProfile = await readProfile(client, authUser.id, profileSchema);
    const alreadyApproved =
      previousProfile?.role === options.role &&
      previousProfile.is_active &&
      (profileSchema === "legacy" || previousProfile.role_source === "manual") &&
      previousProfile.email.toLowerCase() === options.email;
    if (alreadyApproved && !createdAuthUser)
      return {
        status: "already_provisioned" as const,
        email: options.email,
        role: options.role,
        projectRef: options.projectRef,
        authUserCreated: createdAuthUser,
      };
    if (previousProfile && !createdAuthUser && !options.allowExistingProfileChange)
      throw new AdminProvisionError(
        "The existing profile would change. Obtain separate owner approval and use --allow-existing-profile-change=APPROVE; the Auth account and password remain unchanged.",
      );

    const desired = {
      auth_user_id: authUser.id,
      email: options.email,
      display_name: previousProfile?.id
        ? undefined
        : String(authUser.user_metadata?.display_name ?? authUser.user_metadata?.name ?? "").trim() || null,
      role: options.role,
      ...(profileSchema === "modern"
        ? { role_source: "manual", is_active: true }
        : { status: "active", ...(previousProfile ? {} : { id: authUser.id }) }),
      updated_at: new Date().toISOString(),
    };
    // Never overwrite a profile concurrently created or changed after lookup.
    const mutation = previousProfile
      ? client.from("profiles").update(desired as unknown as Database["public"]["Tables"]["profiles"]["Update"]).eq("id", previousProfile.id).eq("updated_at", previousProfile.updated_at)
      : client.from("profiles").insert(desired as unknown as Database["public"]["Tables"]["profiles"]["Insert"]);
    const fields = profileSchema === "modern" ? PROFILE_FIELDS : LEGACY_PROFILE_FIELDS;
    const { data: savedProfile, error: profileError } = await mutation.select(fields as typeof PROFILE_FIELDS).maybeSingle();
    const profile = normalizeProfile(savedProfile, profileSchema);
    if (profileError || !profile)
      throw new AdminProvisionError(
        `Profile provisioning failed or conflicted with another change (${safeProvisionErrorDiagnostic(profileError)}); reload the account before retrying.`,
      );
    writtenProfile = profile;
    if (
      profile.auth_user_id !== authUser.id ||
      profile.email.toLowerCase() !== options.email ||
      profile.role !== options.role ||
      !profile.is_active ||
      (profileSchema === "modern" && profile.role_source !== "manual")
    ) {
      throw new AdminProvisionError("The saved profile did not verify as the approved active administrator; provisioning was rejected.");
    }

    const { error: auditError } = await client.from("audit_logs").insert({
      actor_id: null,
      action: previousProfile ? "admin_role_changed" : "admin_profile_provisioned",
      entity_type: "profile",
      entity_id: profile.id,
      old_data: previousProfile
        ? { role: previousProfile.role, roleSource: previousProfile.role_source, isActive: previousProfile.is_active }
        : null,
      new_data: {
        role: profile.role,
        roleSource: profile.role_source,
        profileSchema,
        isActive: profile.is_active,
        source: "owner_cli",
        authUserCreated: createdAuthUser,
      },
    });
    if (auditError) throw new AdminProvisionError("Required provisioning audit failed.");
    return {
      status: "provisioned" as const,
      email: options.email,
      role: options.role,
      projectRef: options.projectRef,
      authUserCreated: createdAuthUser,
    };
  } catch (error) {
    let cleanupFailed = false;
    if (writtenProfile) {
      // REST profile and audit writes are not a DB transaction. Compensate using
      // the written version; never overwrite a subsequent owner's profile edit.
      try {
        const restore = profileSchema === "modern"
          ? {
              email: previousProfile?.email ?? options.email,
              role: previousProfile?.role ?? "viewer",
              role_source: previousProfile?.role_source ?? "system",
              is_active: previousProfile?.is_active ?? false,
              updated_at: previousProfile?.updated_at ?? new Date().toISOString(),
            }
          : {
              email: previousProfile?.email ?? options.email,
              role: previousProfile?.role ?? "viewer",
              status: previousProfile?.is_active ? "active" : "inactive",
              updated_at: previousProfile?.updated_at ?? new Date().toISOString(),
            };
        const { data, error: restoreError } = await client
          .from("profiles")
          .update(restore as unknown as Database["public"]["Tables"]["profiles"]["Update"])
          .eq("id", writtenProfile.id)
          .eq("updated_at", writtenProfile.updated_at)
          .select("id")
          .maybeSingle();
        cleanupFailed = Boolean(restoreError || !data);
      } catch {
        cleanupFailed = true;
      }
    }
    // A failed version guard may represent a later owner's work. Preserve the
    // new identity as well as that profile instead of cascading it away.
    if (createdAuthUser && authUser && !cleanupFailed) {
      try {
        const { error: deleteError } = await client.auth.admin.deleteUser(authUser.id);
        cleanupFailed ||= Boolean(deleteError);
      } catch {
        cleanupFailed = true;
      }
    }
    if (cleanupFailed)
      throw new AdminProvisionError(
        "Provisioning failed and compensation could not be confirmed. Owner review of this exact account is required before retrying.",
      );
    throw error;
  }
}

async function main() {
  const options = readAdminProvisionOptions(process.argv.slice(2));
  const client = createClient<Database>(options.url, options.serverKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(10_000) }) },
  });
  const result = await provisionAdmin(client, options);
  console.log(
    `${result.status === "already_provisioned" ? "Already provisioned" : "Provisioned"} ${result.email} as ${result.role} in Supabase project ${result.projectRef}.`,
  );
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  void main().catch((error) => {
    // Only controlled errors are emitted; SDK response bodies and secrets are not logged.
    console.error(error instanceof AdminProvisionError ? error.message : "Admin provisioning failed.");
    process.exitCode = 1;
  });
}
