import { createClient, type User } from "@supabase/supabase-js";
import type { Database } from "../types/database.types";

const ADMIN_ROLES = new Set(["super_admin", "admin", "moderator", "organizer"]);
const args = new Map(
  process.argv.slice(2).map((argument) => {
    const [key, ...value] = argument.replace(/^--/, "").split("=");
    return [key, value.join("=")];
  }),
);

const email = (args.get("email") ?? "").trim().toLowerCase();
const role = (args.get("role") ?? "").trim();
const expectedProjectRef = (args.get("project-ref") ?? "").trim();
const confirmed = args.get("confirm") === "PROVISION";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";
const actualProjectRef = url ? new URL(url).hostname.split(".")[0] : "";

if (!email || !email.includes("@")) throw new Error("A valid --email is required.");
if (!ADMIN_ROLES.has(role)) throw new Error("Unsupported administrative role.");
const approvedRole = role as Database["public"]["Enums"]["user_role"];
if (!expectedProjectRef || expectedProjectRef !== actualProjectRef) {
  throw new Error("The explicit --project-ref does not match the configured Supabase project.");
}
if (!confirmed) throw new Error("Refusing to provision without --confirm=PROVISION.");
if (!url || !serviceRoleKey) throw new Error("Server-side Supabase configuration is incomplete.");

const client = createClient<Database>(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const { data: authUsers, error: listError } = await client.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (listError) throw listError;

  const authUser = (authUsers.users as User[]).find((candidate) => candidate.email?.trim().toLowerCase() === email);
  if (!authUser) {
    throw new Error("No matching Supabase Auth user exists. Invite or create the user first.");
  }

  const now = new Date().toISOString();
  const { data: previousProfile } = await client.from("profiles").select("id,role,is_active").eq("auth_user_id", authUser.id).maybeSingle();

  const { data: profile, error: profileError } = await client
    .from("profiles")
    .upsert(
      {
        auth_user_id: authUser.id,
        email,
        display_name: previousProfile?.id
          ? undefined
          : String(authUser.user_metadata?.display_name ?? authUser.user_metadata?.name ?? "").trim() || null,
        role: approvedRole,
        role_source: "manual",
        is_active: true,
        updated_at: now,
      },
      { onConflict: "auth_user_id" },
    )
    .select("id,role,is_active")
    .single();
  if (profileError) throw profileError;

  const { error: auditError } = await client.from("audit_logs").insert({
    actor_id: null,
    action: previousProfile ? "admin_role_changed" : "admin_profile_provisioned",
    entity_type: "profile",
    entity_id: profile.id,
    old_data: previousProfile ? { role: previousProfile.role, isActive: previousProfile.is_active } : null,
    new_data: {
      role: profile.role,
      isActive: profile.is_active,
      source: "owner_cli",
    },
  });
  if (auditError) throw auditError;

  console.log(`Provisioned ${email} as ${role} in Supabase project ${actualProjectRef}.`);
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Admin provisioning failed.");
  process.exitCode = 1;
});
