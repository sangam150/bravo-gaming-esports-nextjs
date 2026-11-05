import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

// Isolated, ephemeral PostgreSQL/WASM fixture. No env file, remote driver or
// network/database connection is used. The test tool is a pinned dev dependency.
const db = new PGlite();
const baseline = await fs.readFile("supabase/migrations/024_public_data_and_authorization_hardening.sql", "utf8");
const recovery = (await fs.readFile("supabase/migrations/002_readiness_recovery.sql", "utf8")).replaceAll("\r\n", "\n");
const view = (name, next) => baseline.slice(baseline.indexOf(`create or replace view public.${name}\n`), baseline.indexOf(next, baseline.indexOf(`create or replace view public.${name}\n`)));
try {
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create table seasons(id uuid primary key, status text, demo_seed_tag text);
    create table events(id uuid primary key, published boolean, published_at timestamptz, deleted_at timestamptz, demo_seed_tag text);
    create table matches(id uuid primary key, season_id uuid, day_id uuid, event_id uuid, match_date timestamptz, status text, published_at timestamptz, deleted_at timestamptz, demo_seed_tag text, raw_json jsonb);
    create table teams(id uuid primary key, name text, slot_number int, is_active boolean default true, status text default 'active', deleted_at timestamptz, demo_seed_tag text, archived_at timestamptz, merged_into_team_id uuid);
    create table players(id uuid primary key, display_name text, pubg_name text, is_active boolean default true, deleted_at timestamptz, demo_seed_tag text);
    create table match_team_results(match_id uuid, team_id uuid, team_name text, slot_number int, placement int, kills int, placement_points int default 0, kill_points numeric(10,2) default 0, total_points numeric(10,2) default 0, wwcd boolean default false, demo_seed_tag text);
    create table match_player_results(match_id uuid, player_id uuid, player_name text, team_id uuid, team_name text, slot_number int, kills int, damage numeric, assists int, knocks int, survival_time int, placement_points int default 0, total_points numeric(10,2), demo_seed_tag text);
    alter table matches enable row level security;
    create policy published_only on matches for select to anon, authenticated using (status = 'published' and published_at is not null and deleted_at is null and demo_seed_tag is null);
    alter table match_team_results enable row level security;
    create policy published_only on match_team_results for select to anon, authenticated using (exists(select 1 from matches where matches.id = match_id));
    alter table match_player_results enable row level security;
    create policy published_only on match_player_results for select to anon, authenticated using (exists(select 1 from matches where matches.id = match_id));
    grant select on seasons, events, teams, players, match_team_results, match_player_results to anon, authenticated;
    grant select(id, season_id, day_id, event_id, match_date, status, published_at, deleted_at, demo_seed_tag) on matches to anon, authenticated;
  `);
  await db.exec(view("team_leaderboard", "create or replace view public.player_leaderboard\n"));
  await db.exec(recovery.slice(recovery.indexOf("create or replace view public.season_standings"), recovery.indexOf("create or replace view public.player_season_stats")) + recovery.slice(recovery.indexOf("create or replace view public.alltime_standings")));
  await db.exec(view("mvp_rankings", "\ngrant select on table\n"));
  const policiesBefore = (await db.query("select tablename, policyname, qual from pg_policies order by tablename")).rows;
  await db.exec(await fs.readFile("supabase/migrations/026_versioned_scoring_decisions.sql", "utf8"));
  assert.deepEqual((await db.query("select tablename, policyname, qual from pg_policies order by tablename")).rows, policiesBefore, "Migration must preserve existing RLS policies");
  const uid = number => `00000000-0000-4000-8000-${String(number).padStart(12, "0")}`;
  await db.query("insert into seasons values($1,'active',null)", [uid(1)]);
  await db.query("insert into events values($1,true,now(),null,null)", [uid(2)]);
  for (let index = 0; index < 3; index++) await db.query("insert into matches(id,season_id,event_id,match_date,status,published_at,raw_json,scoring_rules) values($1,$2,$3,now(),$4,$5,$6,$7)", [uid(10 + index), uid(1), uid(2), index === 1 ? "pending" : "published", index === 1 ? null : "2026-11-05T00:00:00Z", { private: "PRIVATE_RAW" }, index === 0 ? { version: 2, awardCriteria: ["damage", "kills"] } : {}]);
  for (let index = 0; index < 2; index++) {
    await db.query("insert into teams(id,name,slot_number) values($1,$2,$3)", [uid(20 + index), `QA TEAM ${index}`, index + 1]);
    await db.query("insert into players(id,display_name,pubg_name) values($1,$2,$2)", [uid(30 + index), `QA PLAYER ${index}`]);
    for (const match of [10, 11, 12]) {
      await db.query("insert into match_team_results(match_id,team_id,team_name,slot_number,placement,kills,placement_points,kill_points,total_points,wwcd) values($1,$2,$3,$4,$4,$5,$6,$7,$8,$9)", [uid(match), uid(20 + index), `QA TEAM ${index}`, index + 1, index ? 2 : 10, match === 10 && !index ? 12.25 : 0, match === 10 && !index ? 2.5 : 0, match === 10 && !index ? 14.75 : 0, index === 0]);
      await db.query("insert into match_player_results(match_id,player_id,player_name,team_id,team_name,kills,damage,assists,knocks,survival_time,total_points) values($1,$2,$3,$4,$5,$6,$7,0,0,1200,0)", [uid(match), uid(30 + index), `QA PLAYER ${index}`, uid(20 + index), `QA TEAM ${index}`, index ? 2 : 10, index ? 500 : 100]);
    }
  }
  await db.exec("set role anon");
  assert.equal(Number((await db.query("select total_points from team_leaderboard where team_name='QA TEAM 0'")).rows[0].total_points), 14.75);
  assert.equal(Number((await db.query("select total_points from alltime_standings where team_name='QA TEAM 0'")).rows[0].total_points), 14.75);
  assert.equal((await db.query("select count(*)::int as count from matches")).rows[0].count, 2, "Draft match stays private");
  await db.exec("reset role");
  await db.query("update match_player_results set total_points=100 where match_id=$1 and player_id=$2", [uid(12), uid(31)]);
  await db.exec("set role anon");
  const awards = (await db.query("select player_name,mvp_awards from mvp_rankings order by player_name")).rows;
  assert.deepEqual(awards, [{ player_name: "QA PLAYER 0", mvp_awards: 0 }, { player_name: "QA PLAYER 1", mvp_awards: 2 }], "Legacy total-points-first awards must be preserved; new versions use configured criteria");
  await assert.rejects(db.query("select raw_json from matches"), /permission denied/);
  await db.exec("reset role");
  await assert.rejects(db.query("update match_team_results set adjustment_points=-5 where match_id=$1", [uid(10)]), /match_scoring_decision_valid/);
  await db.query("update match_team_results set disqualified=true, decision_reason='QA public ruling', placement_points=0,kill_points=0,total_points=0,wwcd=false where match_id=$1 and team_id=$2", [uid(10), uid(21)]);
  await db.exec("set role anon");
  assert.equal((await db.query("select mvp_awards from mvp_rankings where player_name='QA PLAYER 0'")).rows[0].mvp_awards, 1, "Disqualified players are not eligible for MVP; historical legacy awards remain unchanged");
  console.log("PASS: scoring migration executes in isolated PostgreSQL; compatibility views, fractional totals, configured/legacy MVP order, DQ, public rulings and preserved privacy/RLS verified. This is not staging acceptance.");
} finally { await db.close(); }
