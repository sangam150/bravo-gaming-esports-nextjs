import assert from "node:assert/strict";
import { canonicalPlayerFields, validatePlayerProfileInput } from "../lib/player-profile-input";

async function main() {
  const originalFetch = globalThis.fetch;
  const environment = { ...process.env };
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://offline-data.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "offline-public";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "offline-public";
  process.env.SUPABASE_SECRET_KEY = "offline-server";
  const id = "00000000-0000-4000-8000-000000000011";
  const players = new Map<string, Record<string, unknown>>();
  const documents = new Map<string, Record<string, unknown>>();
  const writes: Array<{ table: string; method: string; body: Record<string, unknown> }> = [];
  let failPlayerWrite = false;
  globalThis.fetch = async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    assert.equal(url.origin, "https://offline-data.supabase.co", "Offline data checks must never contact real services");
    const table = url.pathname.split("/").at(-1)!;
    const method = init?.method ?? "GET";
    const headers = new Headers(init?.headers);
    const raw = typeof init?.body === "string" ? JSON.parse(init.body) : null;
    const body = (Array.isArray(raw) ? raw[0] : raw) as Record<string, unknown> | null;
    const singular = headers.get("accept")?.includes("object+json");
    const reply = (rows: Record<string, unknown>[]) => Response.json(singular ? rows[0] : rows);
    if (method === "HEAD") return new Response(null, { headers: { "content-range": table === "events" ? "0-0/1" : "*/0" } });
    if (table === "players") {
      if (method === "POST" || method === "PATCH") {
        if (failPlayerWrite) return Response.json({ message: "offline write rejected", code: "TEST_FAILURE" }, { status: 400 });
        writes.push({ table, method, body: body! });
        const target = method === "POST" ? id : url.searchParams.get("id")!.slice(3);
        const now = new Date().toISOString();
        const row = {
          id: target,
          created_at: now,
          updated_at: now,
          avatar_url: null,
          photo_url: null,
          deleted_at: null,
          ...players.get(target),
          ...body,
        };
        players.set(target, row);
        return singular ? Response.json(row) : new Response(null, { status: 204 });
      }
      return reply(
        [...players.values()].filter(
          (row) =>
            (!url.searchParams.has("id") || url.searchParams.get("id") === `eq.${row.id}`) &&
            (url.searchParams.get("deleted_at") !== "is.null" || !row.deleted_at),
        ),
      );
    }
    if (table === "app_documents") {
      if (method === "POST") {
        writes.push({ table, method, body: body! });
        documents.set(`${body!.collection_name}:${body!.id}`, body!);
        return new Response(null, { status: 201 });
      }
      const collection = url.searchParams.get("collection_name")?.slice(3);
      const exact = url.searchParams.get("id");
      return reply(
        [...documents.values()].filter(
          (row) =>
            row.collection_name === collection &&
            (!exact || exact === `eq.${row.id}` || exact === `in.("${row.id}")` || exact === `in.(${row.id})`),
        ),
      );
    }
    throw new Error(`Unexpected offline query: ${method} ${table}`);
  };
  try {
    const { savePlayer, getPlayer, getPlayers, deletePlayer, deleteSeason } = await import("../lib/data");
    const saved = await savePlayer(
      {
        name: "QA Player",
        inGameName: "QA_IGN",
        playerStatus: "active",
        kills: 99,
        damage: 9999,
        mvpCount: 99,
        phone: "private-contact",
      },
      undefined,
      { canonicalProfile: true },
    );
    assert.equal(saved.id, id, "New players must use canonical UUIDs");
    assert.equal(players.size, 1);
    const primary = writes.find((write) => write.table === "players")!.body;
    assert.equal(primary.pubg_name, "QA_IGN");
    for (const protectedField of ["kills", "damage", "mvpCount", "avatar_url", "photo_url"])
      assert.equal(protectedField in primary, false, "Profile changes must not overwrite computed results or R2 avatars");
    assert.equal((await getPlayer(id))?.id, id);
    assert.equal(
      (await getPlayers({ includeInternal: true })).some((player) => player.id === id),
      true,
      "A saved player must remain editable through the admin read path",
    );
    await savePlayer({ ...saved, name: "QA Player renamed", playerStatus: "inactive" }, id, { canonicalProfile: true });
    assert.equal(players.get(id)?.pubg_name, "QA_IGN", "Editing a display name must not rename the PUBG account");
    assert.equal(players.get(id)?.is_active, false);
    assert.equal((await getPlayers({ includeInternal: true }))[0].playerStatus, "inactive");
    const metadataWrites = writes.filter((write) => write.table === "app_documents").length;
    failPlayerWrite = true;
    await assert.rejects(savePlayer({ ...saved, name: "Rejected edit" }, id, { canonicalProfile: true }));
    assert.equal(
      writes.filter((write) => write.table === "app_documents").length,
      metadataWrites,
      "A failed primary mutation must not change compatibility records",
    );
    failPlayerWrite = false;
    await deletePlayer(id);
    assert.ok(players.get(id)?.deleted_at);
    assert.equal(players.get(id)?.is_active, false);
    await assert.rejects(deleteSeason(id), /Archive it/);
    assert.equal(
      writes.some((write) => write.method === "DELETE"),
      false,
      "Used seasons must retain competition history",
    );
    const fields = canonicalPlayerFields({ name: "name", kills: 10, damage: 20, avatarUrl: "/private" });
    assert.deepEqual(Object.keys(fields).sort(), ["current_team_id", "display_name", "is_active", "pubg_account_id", "pubg_name"]);
    assert.throws(() => canonicalPlayerFields({ name: " " }));
    assert.throws(() => canonicalPlayerFields({ name: "name", teamId: "not-a-canonical-id" }));
    assert.throws(() => validatePlayerProfileInput({ name: 123 }));
    assert.throws(() => validatePlayerProfileInput({ role: "super_admin" }));
    assert.throws(() => validatePlayerProfileInput({ playerStatus: "invalid" }));
    console.log(
      "Offline canonical player create/edit/archive, admin read-your-writes, immutable statistics/avatars and season-history protection passed.",
    );
  } finally {
    globalThis.fetch = originalFetch;
    for (const key of Object.keys(process.env)) if (!(key in environment)) delete process.env[key];
    Object.assign(process.env, environment);
  }
}
void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
