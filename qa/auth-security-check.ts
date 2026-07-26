import { createClient } from "@supabase/supabase-js";
import { randomBytes, randomUUID } from "node:crypto";
import { verifyAccessToken } from "../lib/supabase-auth-server";
import type { Database } from "../types/database.types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
const publicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";
if (!url || !publicKey || !serviceKey) throw new Error("Supabase test configuration is incomplete.");
if (new URL(url).hostname.split(".")[0] !== "hldppfhtkfgthainismr") {
  throw new Error("Refusing to run authentication integration tests against an unexpected project.");
}

const admin = createClient<Database>(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const createdUserIds: string[] = [];
const email = `codex-auth-qa-${randomUUID()}@example.invalid`;
const password = `Qa!${randomBytes(18).toString("base64url")}`;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main() {
  try {
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: "super_admin", display_name: "Auth QA" },
    });
    if (createError) throw createError;
    assert(created.user, "Auth user was not created.");
    createdUserIds.push(created.user.id);

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("id,auth_user_id,email,role,is_active")
      .eq("auth_user_id", created.user.id)
      .single();
    if (profileError) throw profileError;
    assert(profile.role === "viewer", "Auth metadata improperly escalated the default profile role.");
    assert(profile.is_active, "Provisioned profile is not active.");
    assert(profile.email === email, "Provisioned email was not normalized.");

    const browser = createClient<Database>(url, publicKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: login, error: loginError } = await browser.auth.signInWithPassword({ email, password });
    if (loginError) throw loginError;
    assert(login.session?.access_token, "Supabase did not create a password session.");

    const { error: escalationError } = await browser.from("profiles").update({ role: "super_admin" }).eq("auth_user_id", created.user.id);
    assert(escalationError, "A viewer was able to update their own role.");

    const resolvedViewer = await verifyAccessToken(login.session.access_token);
    assert(resolvedViewer.role === "viewer" && !resolvedViewer.isAdmin, "Viewer authorization resolved incorrectly.");

    const { error: roleError } = await admin.from("profiles").update({ role: "admin" }).eq("auth_user_id", created.user.id);
    if (roleError) throw roleError;
    const resolvedAdmin = await verifyAccessToken(login.session.access_token);
    assert(resolvedAdmin.role === "admin" && resolvedAdmin.isAdmin, "Trusted admin role did not take effect.");

    const { error: inactiveError } = await admin.from("profiles").update({ is_active: false }).eq("auth_user_id", created.user.id);
    if (inactiveError) throw inactiveError;
    let inactiveRejected = false;
    try {
      await verifyAccessToken(login.session.access_token);
    } catch (error) {
      inactiveRejected = error instanceof Error && /inactive/i.test(error.message);
    }
    assert(inactiveRejected, "Inactive account retained protected access.");

    console.log(
      "Authentication integration QA passed: provisioning, metadata spoofing, role resolution, self-escalation, and deactivation.",
    );
  } finally {
    for (const userId of createdUserIds) {
      await admin.auth.admin.deleteUser(userId).catch(() => undefined);
    }
  }
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Authentication QA failed.");
  process.exitCode = 1;
});
