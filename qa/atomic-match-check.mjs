import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

// Isolated SQL only; no credentials, environment files or remote connections.
const db = new PGlite();
const uid = n => `00000000-0000-4000-8000-${String(n).padStart(12,"0")}`;
try {
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create type match_status as enum ('pending','published','rejected');
    create table events(id uuid primary key, deleted_at timestamptz, match_count int default 0, updated_at timestamptz);
    create table matches(id uuid primary key,season_id uuid not null,event_id uuid references events(id),day_id uuid,match_id text unique,external_match_id text,match_number int,map text,map_name text,match_date timestamptz,start_time timestamptz,status match_status,raw_json jsonb,point_system_id uuid,scoring_rules jsonb,source_url text,vod_url text,scoreboard_image_url text,result_image_url text,screenshot_urls jsonb,published_at timestamptz,created_at timestamptz,updated_at timestamptz,data_source text,deleted_at timestamptz,demo_seed_tag text);
    create table match_team_results(id uuid primary key default gen_random_uuid(),match_id uuid references matches(id),team_id uuid,team_name text,slot_number int,placement int,kills int check(kills>=0),damage numeric,placement_points numeric,kill_points numeric,total_points numeric,wwcd boolean,adjustment_points numeric,decision_reason text,disqualified boolean);
    create table match_player_results(id uuid primary key default gen_random_uuid(),match_id uuid references matches(id),player_id uuid,player_name text,pubg_account_id text,team_id uuid,team_name text,slot_number int,placement int,kills int check(kills>=0),assists int,knocks int,damage numeric,survival_time int,placement_points numeric,total_points numeric,link_eligibility text);
    create table event_teams(event_id uuid references events(id),team_id uuid,status text,primary key(event_id,team_id));
    create table audit_logs(id uuid default gen_random_uuid(),actor_id uuid,action text,entity_type text,entity_id text,old_data jsonb,new_data jsonb);
    create table point_systems(id uuid primary key,name text);
    grant all on events,matches,match_team_results,match_player_results,event_teams,audit_logs to service_role;
    grant insert,update,delete,truncate,references,trigger on matches,match_team_results,match_player_results,point_systems to public,anon,authenticated;
    grant insert(id),update(status) on matches to public,anon,authenticated;
    grant insert(team_name),update(adjustment_points,decision_reason,disqualified) on match_team_results to public,anon,authenticated;
    grant insert(player_name),update(kills) on match_player_results to public,anon,authenticated;
    grant insert(name),update(name) on point_systems to public,anon,authenticated;
    grant select(id,status) on matches to anon,authenticated;
    grant select(id,adjustment_points,decision_reason) on match_team_results to anon,authenticated;
    grant select(id,kills) on match_player_results to anon,authenticated;
    grant select(id,name) on point_systems to anon,authenticated;
    alter table matches enable row level security;
    alter table match_team_results enable row level security;
    alter table match_player_results enable row level security;
    alter table point_systems enable row level security;
    create policy fixture_admin_manage on matches for all to authenticated using(true) with check(true);
    create policy fixture_admin_manage on match_team_results for all to authenticated using(true) with check(true);
    create policy fixture_admin_manage on match_player_results for all to authenticated using(true) with check(true);
    create policy fixture_admin_manage on point_systems for all to authenticated using(true) with check(true);
    create policy fixture_public_read on matches for select to anon using(true);
    create policy fixture_public_read on match_team_results for select to anon using(true);
    create policy fixture_public_read on match_player_results for select to anon using(true);
    create policy fixture_public_read on point_systems for select to anon using(true);
  `);
  assert.equal((await db.query("select has_table_privilege('authenticated','match_team_results','UPDATE') as allowed")).rows[0].allowed,true,"Fixture must reproduce inherited browser DML grants before migration");
  const policiesBefore=(await db.query("select tablename,policyname,cmd,qual,with_check from pg_policies order by tablename,policyname")).rows;
  await db.exec(await readFile("supabase/migrations/027_atomic_match_results.sql","utf8"));
  const preflightSource=await readFile("qa/migration-preflight.mjs","utf8");
  const preflightSql=preflightSource.match(/const atomicFunction =[\s\S]*?client\.query\(`([\s\S]*?)`\)\s*:\s*null;/)?.[1];
  assert.ok(preflightSql,"Extract the actual atomic-schema preflight SQL instead of duplicating its checks");
  const readyPreflight={present:true,revision_present:true,service_only:true,revision_trigger_enabled:true,browser_writes_blocked:true};
  assert.deepEqual((await db.query(preflightSql)).rows[0],readyPreflight,"Real preflight SQL must recognize migration 027's signature, trigger and privilege boundary");
  await db.exec("alter table public.matches disable trigger matches_revision; grant update(adjustment_points) on public.match_team_results to authenticated");
  const brokenPreflight=(await db.query(preflightSql)).rows[0];
  assert.equal(brokenPreflight.revision_trigger_enabled,false,"Preflight detects a disabled revision trigger");
  assert.equal(brokenPreflight.browser_writes_blocked,false,"Preflight detects a reintroduced browser column write grant");
  await db.exec("alter table public.matches enable trigger matches_revision; revoke update(adjustment_points) on public.match_team_results from authenticated");
  assert.deepEqual((await db.query(preflightSql)).rows[0],readyPreflight);
  assert.deepEqual((await db.query("select tablename,policyname,cmd,qual,with_check from pg_policies order by tablename,policyname")).rows,policiesBefore,"DML hardening must preserve all RLS policies");
  for(const role of ["anon","authenticated"]){
    for(const table of ["matches","match_team_results","match_player_results","point_systems"]){
      for(const privilege of ["INSERT","UPDATE","DELETE","TRUNCATE","REFERENCES","TRIGGER"])
        assert.equal((await db.query("select has_table_privilege($1,$2,$3) as allowed",[role,table,privilege])).rows[0].allowed,false,`${role} cannot bypass transactional writes on ${table}`);
      assert.equal((await db.query("select has_any_column_privilege($1,$2,'INSERT') or has_any_column_privilege($1,$2,'UPDATE') or has_any_column_privilege($1,$2,'REFERENCES') as allowed",[role,table])).rows[0].allowed,false,`${role} must not retain column-level write grants on ${table}`);
      assert.equal((await db.query("select has_column_privilege($1,$2,'id','SELECT') as allowed",[role,table])).rows[0].allowed,true,`${role} keeps explicit public SELECT grants on ${table}`);
    }
  }
  await db.query("insert into events(id) values($1)",[uid(1)]);
  const match = { id:uid(3),event_id:uid(1),season_id:uid(2),match_id:"QA-MANUAL",match_number:1,map:"Erangel",map_name:"Erangel",match_date:"2026-11-05T00:00:00Z",data_source:"manual",raw_json:{private:"QA"},point_system_id:uid(4),scoring_rules:{version:2,awardCriteria:["damage","kills"]} };
  const teams = [{team_id:uid(5),team_name:"QA TEAM",slot_number:1,placement:1,kills:5,damage:500,placement_points:12.25,kill_points:12.5,total_points:24.75,wwcd:true,adjustment_points:0,decision_reason:"",disqualified:false}];
  const players=[{player_id:uid(6),player_name:"QA PLAYER",team_id:uid(5),team_name:"QA TEAM",placement:1,kills:5,assists:0,knocks:5,damage:500,survival_time:1200,placement_points:12.25,total_points:24.75,link_eligibility:"eligible"}];
  const commit=(revision,teamRows=teams,playerRows=players,publish=true,action="replace",payload=match)=>db.query("select commit_competition_match($1,$2,$3,$4,$5,$6,null) as revision",[payload,JSON.stringify(teamRows),JSON.stringify(playerRows),revision,publish,action]);
  await db.exec("set role anon");
  await assert.rejects(commit(null),/permission denied/);
  await db.exec("reset role; set role service_role");
  let revision=(await commit(null)).rows[0].revision;
  await db.exec("reset role; set role authenticated");
  await assert.rejects(commit(revision),/permission denied/);
  await assert.rejects(db.query("update match_team_results set adjustment_points=-9,decision_reason='Bypass' where match_id=$1",[match.id]),/permission denied/);
  await assert.rejects(db.query("delete from match_player_results where match_id=$1",[match.id]),/permission denied/);
  await assert.rejects(db.query("update matches set status='published' where id=$1",[match.id]),/permission denied/);
  await assert.rejects(db.query("insert into point_systems(id,name) values($1,'Bypass')",[uid(99)]),/permission denied/);
  assert.equal((await db.query("select id,status from matches")).rows.length,1,"Existing authenticated SELECT policy/grants still work");
  await assert.rejects(db.query("select raw_json from matches"),/permission denied/);
  await db.exec("reset role; set role service_role");
  const snapshot=async()=> (await db.query("select jsonb_build_object('match',(select to_jsonb(m) from matches m where id=$1),'teams',(select jsonb_agg(t) from match_team_results t where match_id=$1),'players',(select jsonb_agg(p) from match_player_results p where match_id=$1),'audit',(select count(*) from audit_logs)) as value",[match.id])).rows[0].value;
  const before=await snapshot();
  await assert.rejects(commit(revision,teams,[{...players[0],kills:-1}]),/check constraint/);
  assert.deepEqual(await snapshot(),before,"Child insert failure rolls back parent, deletions, publication and audit");
  await assert.rejects(commit(revision,[...teams,...teams]),/Duplicate result identity/);
  assert.deepEqual(await snapshot(),before);
  // Two requests hold the same editor revision. Exactly one may commit; the
  // second must conflict, even when queued on PGlite's single SQL connection.
  const attempts=await Promise.allSettled([commit(revision),commit(revision)]);
  assert.equal(attempts.filter(result=>result.status==="fulfilled").length,1);
  assert.match(attempts.find(result=>result.status==="rejected").reason.message,/revision conflict/);
  revision=(await db.query("select revision from matches where id=$1",[match.id])).rows[0].revision;
  await assert.rejects(commit(revision-1,teams,players,true),/revision conflict/);
  const ruling=[{...teams[0],adjustment_points:-3,decision_reason:"QA correction",total_points:21.75}];
  revision=(await commit(revision,ruling,players,false)).rows[0].revision;
  assert.equal((await db.query("select status from matches where id=$1",[match.id])).rows[0].status,"pending");
  assert.equal(Number((await db.query("select total_points from match_team_results where match_id=$1",[match.id])).rows[0].total_points),21.75);
  const dq=[{...teams[0],disqualified:true,decision_reason:"QA DQ",wwcd:false,placement_points:0,kill_points:0,total_points:0}];
  revision=(await commit(revision,dq,players,false)).rows[0].revision;
  revision=(await commit(revision,dq,players,true)).rows[0].revision;
  assert.deepEqual((await db.query("select scoring_rules from matches where id=$1",[match.id])).rows[0].scoring_rules,match.scoring_rules);
  assert.equal((await db.query("select match_count from events where id=$1",[uid(1)])).rows[0].match_count,1);
  await assert.rejects(commit(revision,[],[],false,"delete"),/cannot be deleted/);
  revision=(await commit(revision,[],[],false,"unpublish")).rows[0].revision;
  assert.equal((await db.query("select match_count from events where id=$1",[uid(1)])).rows[0].match_count,0);
  const retry=await snapshot();
  await db.exec("reset role; create function reject_qa_audit() returns trigger language plpgsql as $$begin raise exception 'QA audit failure'; end$$; create trigger qa_audit before insert on audit_logs for each row execute function reject_qa_audit(); set role service_role;");
  await assert.rejects(commit(revision),/QA audit failure/);
  assert.deepEqual(await snapshot(),retry,"Audit failure rolls back scores and publication");
  await db.exec("reset role; drop trigger qa_audit on audit_logs; set role service_role");
  revision=(await commit(revision)).rows[0].revision;
  await assert.rejects(commit(null,teams,players,true,"replace",{...match,id:uid(7),match_id:"QA-OTHER"}),/Duplicate match number/);
  await assert.rejects(commit(revision-1),/revision conflict/);
  revision=(await commit(revision,[],[],false)).rows[0].revision;
  assert.equal((await db.query("select count(*)::int as count from match_team_results where match_id=$1",[match.id])).rows[0].count,0,"Maintenance reset clears rows only inside an audited draft transaction");
  assert.equal((await db.query("select status from matches where id=$1",[match.id])).rows[0].status,"pending");
  await assert.rejects(commit(revision-1),/revision conflict/);
  console.log("PASS: atomic SQL result replacement, partial/audit failure rollback, stale/concurrent revision rejection, retry, publication conflicts, correction decimals, DQ, scoring version retention, count consistency, RPC/direct-write restrictions, preserved SELECT grants and unchanged RLS. Multi-connection Supabase stress remains staging acceptance.");
} finally {await db.close();}
