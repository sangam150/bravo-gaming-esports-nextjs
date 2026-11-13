import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

// Isolated PostgreSQL/WASM execution. This verifies real transactional SQL
// behavior without credentials, remote data, or applying a migration.
const db = new PGlite();
const uid = (number) => `00000000-0000-4000-8000-${String(number).padStart(12, "0")}`;
const now = "2026-11-13T00:00:00Z";
const future = "2026-12-31T00:00:00Z";
const earlier = "2026-11-01T00:00:00Z";
const later = "2026-12-01T00:00:00Z";

const registrationPayload = (id, eventId, name, discord) => ({
  id,
  tournamentId: eventId,
  teamName: name,
  teamTag: name.slice(0, 3).toUpperCase(),
  captainName: `${name} Captain`,
  captainDiscord: discord,
  playerNames: [`${name} Player 1`, `${name} Player 2`],
});

const createRegistration = (payload) => db.query("select public.create_event_registration($1::jsonb) as value", [payload]);
const claimRegistration = (id, token = `claim-${id}`) =>
  db.query(
    `update public.app_documents
    set data = data || jsonb_build_object('approvalClaimToken',$2::text,'approvalClaimedAt',$3::text,'approvalClaimedBy',$4::text), updated_at=clock_timestamp()
    where collection_name='registrations' and id=$1`,
    [id, token, now, uid(900)],
  );
const confirmRegistration = (registrationId, teamId, token = `claim-${registrationId}`, updates = {}) =>
  db.query("select public.confirm_event_registration($1,$2,$3,$4,$5::jsonb,null) as value", [
    registrationId,
    teamId,
    uid(900),
    token,
    updates,
  ]);
const insertEvent = (id, maxTeams = 4) =>
  db.query(
    `insert into public.events(
  id,title,name,slug,status,start_date,end_date,published,published_at,registration_status,
  registration_start,registration_end,lifecycle_status,max_teams,team_count
) values($1,$2,$2,$3,'draft',$4,$4,true,$5,'open',$6,$7,'scheduled',$8,0)`,
    [id, `QA Event ${id.slice(-2)}`, `qa-event-${id.slice(-2)}`, future, now, earlier, later, maxTeams],
  );
const insertTeam = (id, name) => db.query("insert into public.teams(id,name,status,is_active) values($1,$2,'active',true)", [id, name]);
const snapshotRegistration = async (id) =>
  (
    await db.query(
      `select jsonb_build_object(
  'registration',(select to_jsonb(r) from public.registrations r where id=$1),
  'document',(select data from public.app_documents where collection_name='registrations' and id=$1::text),
  'membership',(select to_jsonb(m) from public.event_teams m where registration_id=$1),
  'audit',(select count(*)::int from public.audit_logs where entity_id=$1::text)
) as value`,
      [id],
    )
  ).rows[0].value;

try {
  await db.exec(`
    create role anon;
    create role authenticated;
    create role service_role bypassrls;
    create type public.event_status as enum ('draft','active','completed','archived');
    create table public.profiles(id uuid primary key);
    create table public.events(
      id uuid primary key, season_id uuid, title text not null, event_type text not null default 'scrim_day',
      game text not null default 'PUBG PC', status public.event_status not null default 'draft', description text,
      banner_url text, start_date timestamptz, end_date timestamptz, created_at timestamptz default now(),
      updated_at timestamptz default now(), name text, slug text unique, type text, mode text, perspective text,
      prize_pool text, rules text, region text, tier text, competition_status text default 'UPCOMING', server text,
      schedule text, map_rotation jsonb default '[]', max_teams integer default 32, team_count integer default 0,
      season_day_number integer, match_count integer default 0, source_url text, published boolean default false,
      published_at timestamptz, deleted_at timestamptz, demo_seed_tag text, registration_status text default 'closed',
      lifecycle_status text default 'draft', registration_start timestamptz, registration_end timestamptz
    );
    create table public.teams(
      id uuid primary key, name text not null, status text default 'active', is_active boolean default true,
      deleted_at timestamptz, demo_seed_tag text, archived_at timestamptz, merged_into_team_id uuid
    );
    create table public.uploads(id uuid primary key);
    create table public.registrations(
      id uuid primary key, event_id uuid references public.events(id), team_id uuid references public.teams(id),
      submitted_by uuid, team_name text not null, team_tag text, contact_name text not null, contact_email text,
      contact_discord text not null, player_igns jsonb not null default '[]', logo_upload_id uuid references public.uploads(id),
      status text not null default 'pending', reference_code text not null unique, review_note text,
      reviewed_by uuid references public.profiles(id), reviewed_at timestamptz, created_at timestamptz default now(),
      updated_at timestamptz default now(), deleted_at timestamptz, official_team_id uuid references public.teams(id),
      onboarding_status text not null default 'submitted', duplicate_candidates jsonb not null default '[]'
    );
    create unique index registrations_active_event_team_name_idx on public.registrations(event_id,lower(team_name))
      where deleted_at is null and status in ('pending','approved','changes_requested');
    create table public.app_documents(
      collection_name text not null, id text not null, data jsonb not null default '{}',
      created_at timestamptz default now(), updated_at timestamptz default now(), primary key(collection_name,id)
    );
    create table public.event_teams(
      id uuid primary key default gen_random_uuid(), event_id uuid not null references public.events(id),
      team_id uuid not null references public.teams(id), slot_number integer, status text default 'registered',
      created_at timestamptz default now(), updated_at timestamptz default now(), demo_seed_tag text,
      unique(event_id,team_id)
    );
    create table public.audit_logs(
      id uuid primary key default gen_random_uuid(), actor_id uuid references public.profiles(id), action text,
      entity_type text, entity_id text, old_data jsonb, new_data jsonb, created_at timestamptz default now()
    );
    insert into public.profiles(id) values('${uid(900)}');
    grant all on all tables in schema public to service_role;
    grant insert,update,delete,truncate,references,trigger on public.registrations,public.event_teams to anon,authenticated;
    grant insert(id),update(status) on public.registrations to authenticated;
    grant insert(team_id),update(slot_number) on public.event_teams to authenticated;
    grant select on public.registrations,public.event_teams to anon,authenticated;
  `);

  await db.exec(await readFile("supabase/migrations/028_atomic_event_registration.sql", "utf8"));
  for (const role of ["anon", "authenticated"]) {
    for (const table of ["registrations", "event_teams"]) {
      assert.equal(
        (await db.query("select has_table_privilege($1,$2,'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') as allowed", [role, table]))
          .rows[0].allowed,
        false,
      );
      assert.equal(
        (
          await db.query("select has_any_column_privilege($1,$2,'INSERT') or has_any_column_privilege($1,$2,'UPDATE') as allowed", [
            role,
            table,
          ])
        ).rows[0].allowed,
        false,
      );
      assert.equal((await db.query("select has_table_privilege($1,$2,'SELECT') as allowed", [role, table])).rows[0].allowed, true);
    }
  }
  for (const procedure of [
    "create_event_registration(jsonb)",
    "confirm_event_registration(uuid,uuid,uuid,text,jsonb,integer)",
    "set_event_registration_status(uuid,text,text,uuid,jsonb,uuid)",
    "commit_competition_event(jsonb,jsonb,uuid)",
  ]) {
    assert.equal(
      (await db.query("select has_function_privilege('authenticated','public.' || $1,'EXECUTE') as allowed", [procedure])).rows[0].allowed,
      false,
    );
    assert.equal(
      (await db.query("select has_function_privilege('service_role','public.' || $1,'EXECUTE') as allowed", [procedure])).rows[0].allowed,
      true,
    );
  }

  await db.exec("set role service_role");
  await insertTeam(uid(101), "Alpha Team");
  await insertTeam(uid(102), "Bravo Team");
  await insertTeam(uid(103), "Charlie Team");
  await insertTeam(uid(104), "Delta Team");
  await insertEvent(uid(1), 2);

  const firstId = uid(201);
  const firstPayload = registrationPayload(firstId, uid(1), "Alpha Team", "alpha.captain");
  assert.equal((await createRegistration(firstPayload)).rows[0].value.status, "pending");
  await assert.rejects(createRegistration(registrationPayload(uid(202), uid(1), "Alpha Team", "other.captain")), /duplicate/i);
  await assert.rejects(createRegistration(registrationPayload(uid(203), uid(1), "Different Team", "alpha.captain")), /duplicate/i);
  await claimRegistration(firstId);
  const confirmed = (await confirmRegistration(firstId, uid(101), undefined, { approvedTeamId: uid(101) })).rows[0].value;
  assert.equal(confirmed.status, "approved");
  assert.equal(confirmed.eventSlotNumber, 1);
  assert.equal(
    (
      await db.query("select count(*)::int as count from public.event_teams where event_id=$1 and team_id=$2 and registration_id=$3", [
        uid(1),
        uid(101),
        firstId,
      ])
    ).rows[0].count,
    1,
  );
  assert.equal((await db.query("select team_count from public.events where id=$1", [uid(1)])).rows[0].team_count, 1);
  const auditCountBeforeRetry = (await db.query("select count(*)::int as count from public.audit_logs where entity_id=$1", [firstId]))
    .rows[0].count;
  assert.equal((await confirmRegistration(firstId, uid(101))).rows[0].value.status, "approved", "Retry is idempotent");
  assert.equal(
    (await db.query("select count(*)::int as count from public.audit_logs where entity_id=$1", [firstId])).rows[0].count,
    auditCountBeforeRetry,
  );

  const duplicateTeamId = uid(204);
  await createRegistration(registrationPayload(duplicateTeamId, uid(1), "Alias Request", "alias.captain"));
  await claimRegistration(duplicateTeamId);
  const duplicateBefore = await snapshotRegistration(duplicateTeamId);
  await assert.rejects(confirmRegistration(duplicateTeamId, uid(101)), /duplicate/i);
  assert.deepEqual(await snapshotRegistration(duplicateTeamId), duplicateBefore, "Duplicate membership rejection has no partial writes");

  await insertEvent(uid(2), 2);
  const concurrentA = uid(205);
  const concurrentB = uid(206);
  await createRegistration(registrationPayload(concurrentA, uid(2), "Bravo Team", "bravo.captain"));
  await createRegistration(registrationPayload(concurrentB, uid(2), "Charlie Team", "charlie.captain"));
  await claimRegistration(concurrentA);
  await claimRegistration(concurrentB);
  await db.query("update public.events set max_teams=1 where id=$1", [uid(2)]);
  const concurrentResults = await Promise.allSettled([
    confirmRegistration(concurrentA, uid(102)),
    confirmRegistration(concurrentB, uid(103)),
  ]);
  assert.equal(concurrentResults.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal((await db.query("select count(*)::int as count from public.event_teams where event_id=$1", [uid(2)])).rows[0].count, 1);
  assert.equal((await db.query("select team_count from public.events where id=$1", [uid(2)])).rows[0].team_count, 1);

  const approvedConcurrentId = concurrentResults[0].status === "fulfilled" ? concurrentA : concurrentB;
  const approvedConcurrentTeam = concurrentResults[0].status === "fulfilled" ? uid(102) : uid(103);
  await db.query("select public.set_event_registration_status($1,'approved','pending',$2,$3::jsonb,$4)", [
    approvedConcurrentId,
    uid(900),
    { tournamentId: uid(2) },
    approvedConcurrentTeam,
  ]);
  assert.equal((await db.query("select count(*)::int as count from public.event_teams where event_id=$1", [uid(2)])).rows[0].count, 0);
  assert.equal((await db.query("select status from public.registrations where id=$1", [approvedConcurrentId])).rows[0].status, "pending");
  assert.equal((await db.query("select team_count from public.events where id=$1", [uid(2)])).rows[0].team_count, 0);

  await insertEvent(uid(3), 2);
  const rollbackId = uid(207);
  await createRegistration(registrationPayload(rollbackId, uid(3), "Delta Team", "delta.captain"));
  await claimRegistration(rollbackId);
  const rollbackBefore = await snapshotRegistration(rollbackId);
  await db.exec(
    "reset role; create function public.reject_registration_audit() returns trigger language plpgsql as $$begin raise exception 'QA audit failure'; end$$; create trigger reject_registration_audit before insert on public.audit_logs for each row execute function public.reject_registration_audit(); set role service_role",
  );
  await assert.rejects(confirmRegistration(rollbackId, uid(104)), /QA audit failure/);
  assert.deepEqual(
    await snapshotRegistration(rollbackId),
    rollbackBefore,
    "Required audit failure rolls approval, membership and counters back",
  );
  await db.exec("reset role; drop trigger reject_registration_audit on public.audit_logs; set role service_role");

  await db.query("update public.events set registration_status='closed' where id=$1", [uid(3)]);
  await assert.rejects(confirmRegistration(rollbackId, uid(104)), /registration_event_closed/);
  assert.deepEqual(await snapshotRegistration(rollbackId), rollbackBefore, "Closed-event approval has no partial writes");

  await insertEvent(uid(4), 2);
  const legacyId = uid(208);
  await db.query(`insert into public.app_documents(collection_name,id,data) values('registrations',$1,$2::jsonb)`, [
    legacyId,
    {
      ...registrationPayload(legacyId, uid(4), "Legacy Team", "legacy.captain"),
      status: "pending",
      createdAt: now,
      approvalClaimToken: `claim-${legacyId}`,
    },
  ]);
  await insertTeam(uid(105), "Legacy Team");
  assert.equal((await confirmRegistration(legacyId, uid(105))).rows[0].value.status, "approved");
  assert.equal(
    (await db.query("select count(*)::int as count from public.registrations where id=$1 and status='approved'", [legacyId])).rows[0].count,
    1,
  );
  assert.equal(
    (
      await db.query(
        "select count(*)::int as count from public.audit_logs where entity_id=$1 and action='registration.ledger_backfilled'",
        [legacyId],
      )
    ).rows[0].count,
    1,
  );

  await insertEvent(uid(5), 2);
  const eventPayload = {
    id: uid(5),
    title: "Atomic Event",
    name: "Atomic Event",
    slug: "atomic-event",
    event_type: "scrim_day",
    game: "PUBG PC",
    status: "draft",
    start_date: future,
    end_date: future,
    competition_status: "UPCOMING",
    map_rotation: [],
    max_teams: 2,
    match_count: 0,
    published: false,
  };
  await db.query("select public.commit_competition_event($1::jsonb,$2::jsonb,$3)", [eventPayload, [uid(101), uid(102)], uid(900)]);
  assert.deepEqual(
    (await db.query("select team_id,slot_number from public.event_teams where event_id=$1 order by slot_number", [uid(5)])).rows,
    [
      { team_id: uid(101), slot_number: 1 },
      { team_id: uid(102), slot_number: 2 },
    ],
  );
  await db.query(
    "insert into public.event_teams(event_id,team_id,status) values($1,$2,'approved') on conflict(event_id,team_id) do nothing",
    [uid(5), uid(101)],
  );
  assert.equal(
    (await db.query("select count(*)::int as count from public.event_teams where event_id=$1", [uid(5)])).rows[0]
      .count,
    2,
    "The match-publication insert pattern remains idempotent at capacity",
  );
  await assert.rejects(
    db.query("insert into public.event_teams(event_id,team_id,slot_number) values($1,$2,1)", [uid(5), uid(103)]),
    /capacity|duplicate/i,
  );

  const eventBefore = (
    await db.query(
      "select jsonb_build_object('event',(select to_jsonb(e) from public.events e where id=$1),'teams',(select jsonb_agg(to_jsonb(t) order by slot_number) from public.event_teams t where event_id=$1)) as value",
      [uid(5)],
    )
  ).rows[0].value;
  await db.exec(
    "reset role; create trigger reject_registration_audit before insert on public.audit_logs for each row execute function public.reject_registration_audit(); set role service_role",
  );
  await assert.rejects(
    db.query("select public.commit_competition_event($1::jsonb,$2::jsonb,$3)", [
      { ...eventPayload, title: "Should Roll Back" },
      [uid(102), uid(101)],
      uid(900),
    ]),
    /QA audit failure/,
  );
  assert.deepEqual(
    (
      await db.query(
        "select jsonb_build_object('event',(select to_jsonb(e) from public.events e where id=$1),'teams',(select jsonb_agg(to_jsonb(t) order by slot_number) from public.event_teams t where event_id=$1)) as value",
        [uid(5)],
      )
    ).rows[0].value,
    eventBefore,
  );
  await db.exec("reset role; drop trigger reject_registration_audit on public.audit_logs; set role service_role");

  await db.exec("reset role; set role authenticated");
  await assert.rejects(createRegistration(registrationPayload(uid(299), uid(1), "Browser Bypass", "browser.bypass")), /permission denied/);
  await assert.rejects(db.query("insert into public.event_teams(event_id,team_id) values($1,$2)", [uid(1), uid(104)]), /permission denied/);
  console.log(
    "PASS: migration 028 executed in isolated PostgreSQL; atomic submission/approval/rollback, legacy ledger bridge, capacity serialization, duplicate identity/team protection, idempotent retry, unique slots, roster persistence, required-audit rollback and service-only direct-write boundaries verified. Multi-connection staging stress remains acceptance work.",
  );
} finally {
  await db.close();
}
