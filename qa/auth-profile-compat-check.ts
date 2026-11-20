import assert from "node:assert/strict";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAuthProfileIdentity } from "../lib/supabase/profile-identity";

type Result = { data: unknown; error: Record<string, unknown> | null };

function clientWith(results: Result[], selected: string[]) {
  let index = 0;
  return {
    from(table: string) {
      assert.equal(table, "profiles");
      return {
        select(fields: string) {
          selected.push(fields);
          return {
            eq(column: string, value: string) {
              assert.equal(column, "auth_user_id");
              assert.equal(value, "auth-user");
              return {
                async maybeSingle() {
                  const result = results[index++];
                  assert.ok(result, "Unexpected profile query.");
                  return result;
                },
              };
            },
          };
        },
      };
    },
  } as unknown as Pick<SupabaseClient, "from">;
}

async function main() {
  const modernSelected: string[] = [];
  const modern = await getAuthProfileIdentity(
    clientWith([{
      data: { id: "profile", role: "admin", role_source: "manual", team_id: null, player_id: null, display_name: "Owner", is_active: true },
      error: null,
    }], modernSelected),
    "auth-user",
  );
  assert.deepEqual(modern, {
    id: "profile", role: "admin", roleSource: "manual", teamId: null, playerId: null, displayName: "Owner", isActive: true, schema: "modern",
  });
  assert.equal(modernSelected.length, 1);

  for (const [status, active] of [["active", true], ["suspended", false]] as const) {
    const selected: string[] = [];
    const profile = await getAuthProfileIdentity(
      clientWith([
        { data: null, error: { code: "42703", message: "column profiles.role_source does not exist" } },
        { data: { id: "profile", role: "admin", team_id: null, player_id: null, display_name: "Owner", status }, error: null },
      ], selected),
      "auth-user",
    );
    assert.equal(profile?.schema, "legacy");
    assert.equal(profile?.roleSource, "legacy_schema");
    assert.equal(profile?.isActive, active);
    assert.match(selected[0], /role_source/);
    assert.match(selected[1], /status/);
  }

  const absent = await getAuthProfileIdentity(
    clientWith([
      { data: null, error: { code: "PGRST204", message: "Could not find the 'is_active' column" } },
      { data: null, error: null },
    ], []),
    "auth-user",
  );
  assert.equal(absent, null);

  await assert.rejects(
    () => getAuthProfileIdentity(clientWith([{ data: null, error: { code: "42501", message: "permission denied" } }], []), "auth-user"),
    (error: unknown) => (error as { code?: string }).code === "42501",
  );
  await assert.rejects(
    () => getAuthProfileIdentity(clientWith([{ data: null, error: { code: "42703", message: "column profiles.unrelated does not exist" } }], []), "auth-user"),
    (error: unknown) => (error as { code?: string }).code === "42703",
  );

  console.log("PASS: modern profile authorization and fail-closed legacy staging compatibility for active, suspended, absent and unrelated-error cases.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
