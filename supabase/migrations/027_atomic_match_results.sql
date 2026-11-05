begin;

-- An editor must submit the revision it read. Direct legacy updates also
-- invalidate revisions, so they cannot be silently overwritten by this RPC.
alter table public.matches add column if not exists revision bigint not null default 0;

-- Browser roles must not bypass the authorized API/RPC, revisions or required
-- audit by issuing independent REST writes. Keep all existing SELECT grants
-- and RLS policies, including their explicit public column allowlists.
do $$
declare
  scoring_table regclass;
  column_names text;
begin
  foreach scoring_table in array array[
    'public.matches'::regclass, 'public.match_team_results'::regclass,
    'public.match_player_results'::regclass, 'public.point_systems'::regclass
  ] loop
    execute format('revoke insert, update, delete, truncate, references, trigger on table %s from public, anon, authenticated', scoring_table);
    select string_agg(quote_ident(attname), ', ' order by attnum)
      into column_names from pg_attribute
      where attrelid = scoring_table and attnum > 0 and not attisdropped;
    -- Table REVOKE does not remove pre-existing column grants.
    execute format('revoke insert (%s), update (%s), references (%s) on table %s from public, anon, authenticated', column_names, column_names, column_names, scoring_table);
    execute format('grant all privileges on table %s to service_role', scoring_table);
  end loop;
end;
$$;

create or replace function public.bump_match_revision() returns trigger
language plpgsql set search_path = pg_catalog, public as $$
begin
  new.revision := old.revision + 1;
  new.updated_at := clock_timestamp();
  return new;
end;
$$;
drop trigger if exists matches_revision on public.matches;
create trigger matches_revision before update on public.matches
for each row execute function public.bump_match_revision();
revoke all on function public.bump_match_revision() from public, anon, authenticated;

create or replace function public.commit_competition_match(
  p_match jsonb, p_team_rows jsonb, p_player_rows jsonb,
  p_expected_revision bigint, p_publish boolean,
  p_action text default 'replace', p_actor_id uuid default null
) returns bigint
language plpgsql security invoker set search_path = pg_catalog, public set lock_timeout = '5s' as $$
declare
  incoming public.matches;
  previous public.matches;
  saved public.matches;
  old_teams jsonb;
  old_players jsonb;
  target_event uuid;
begin
  incoming := jsonb_populate_record(null::public.matches, p_match);
  if incoming.id is null or p_action not in ('replace', 'unpublish', 'delete') then
    raise exception 'Invalid match transaction input';
  end if;
  -- Serialize creates for the same identity, and all result operations on it.
  perform pg_advisory_xact_lock(hashtextextended(incoming.id::text, 0));
  select * into previous from public.matches where id = incoming.id for update;
  if found then
    if previous.deleted_at is not null or p_expected_revision is null or previous.revision <> p_expected_revision then
      raise exception using errcode = '40001', message = 'Match revision conflict. Reload the match before retrying.';
    end if;
    target_event := previous.event_id;
    if p_action = 'replace' and (incoming.event_id is distinct from previous.event_id or incoming.season_id is distinct from previous.season_id) then
      raise exception 'Moving a saved match to another event or season is not allowed';
    end if;
  else
    if p_expected_revision is not null or p_action <> 'replace' then
      raise exception using errcode = '40001', message = 'Match revision conflict. The match no longer exists.';
    end if;
    target_event := incoming.event_id;
  end if;
  -- Event row locking also serializes match-number checks and match_count.
  perform 1 from public.events where id = target_event and deleted_at is null for update;
  if not found then raise exception 'Event not found'; end if;
  select coalesce(jsonb_agg(to_jsonb(r)), '[]') into old_teams from public.match_team_results r where match_id = incoming.id;
  select coalesce(jsonb_agg(to_jsonb(r)), '[]') into old_players from public.match_player_results r where match_id = incoming.id;

  if p_action = 'delete' then
    if previous.status = 'published' or previous.published_at is not null then
      raise exception 'Published matches cannot be deleted. Unpublish the match first.';
    end if;
    update public.matches set deleted_at = clock_timestamp(), status = 'rejected', published_at = null where id = incoming.id returning * into saved;
  elsif p_action = 'unpublish' then
    update public.matches set status = 'pending', published_at = null where id = incoming.id returning * into saved;
  else
    if jsonb_typeof(p_team_rows) is distinct from 'array' or jsonb_typeof(p_player_rows) is distinct from 'array' then
      raise exception 'Result arrays are required';
    end if;
    if p_publish and jsonb_array_length(p_team_rows) = 0 then raise exception 'Published team results are required'; end if;
    if exists(select 1 from public.matches where event_id = target_event and match_number = incoming.match_number and deleted_at is null and id <> incoming.id) then
      raise exception using errcode = '23505', message = 'Duplicate match number already exists in this event';
    end if;
    if exists(select 1 from jsonb_array_elements(p_team_rows) r group by coalesce(nullif(r->>'team_id',''), lower(btrim(r->>'team_name'))) having count(*) > 1)
      or exists(select 1 from jsonb_array_elements(p_player_rows) r group by coalesce(nullif(r->>'player_id',''), nullif(r->>'pubg_account_id',''), lower(btrim(r->>'player_name'))) having count(*) > 1) then
      raise exception 'Duplicate result identity';
    end if;
    insert into public.matches(id, season_id, event_id, day_id, match_id, external_match_id, match_number, map, map_name,
      match_date, start_time, status, raw_json, point_system_id, scoring_rules, source_url, vod_url,
      scoreboard_image_url, result_image_url, screenshot_urls, published_at, created_at, updated_at, data_source)
    values(incoming.id, incoming.season_id, incoming.event_id, incoming.day_id, incoming.match_id, incoming.external_match_id,
      incoming.match_number, incoming.map, incoming.map_name, incoming.match_date, incoming.start_time, 'pending', incoming.raw_json,
      incoming.point_system_id, coalesce(incoming.scoring_rules,'{}'), incoming.source_url, incoming.vod_url,
      incoming.scoreboard_image_url, incoming.result_image_url, incoming.screenshot_urls, null,
      coalesce(incoming.created_at,clock_timestamp()), clock_timestamp(), incoming.data_source)
    on conflict(id) do update set
      match_id = excluded.match_id, external_match_id = excluded.external_match_id, match_number = excluded.match_number,
      map = excluded.map, map_name = excluded.map_name, match_date = excluded.match_date, start_time = excluded.start_time,
      status = 'pending', raw_json = excluded.raw_json, point_system_id = excluded.point_system_id,
      scoring_rules = excluded.scoring_rules, source_url = excluded.source_url, vod_url = excluded.vod_url,
      scoreboard_image_url = excluded.scoreboard_image_url, result_image_url = excluded.result_image_url,
      screenshot_urls = excluded.screenshot_urls, published_at = null;

    delete from public.match_player_results where match_id = incoming.id;
    delete from public.match_team_results where match_id = incoming.id;
    insert into public.match_team_results(match_id,team_id,team_name,slot_number,placement,kills,damage,placement_points,kill_points,total_points,wwcd,adjustment_points,decision_reason,disqualified)
    select incoming.id,r.team_id,r.team_name,r.slot_number,r.placement,r.kills,r.damage,r.placement_points,r.kill_points,r.total_points,r.wwcd,r.adjustment_points,r.decision_reason,r.disqualified
    from jsonb_to_recordset(p_team_rows) as r(team_id uuid,team_name text,slot_number int,placement int,kills int,damage numeric,placement_points numeric,kill_points numeric,total_points numeric,wwcd boolean,adjustment_points numeric,decision_reason text,disqualified boolean);
    insert into public.match_player_results(match_id,player_id,player_name,pubg_account_id,team_id,team_name,slot_number,placement,kills,assists,knocks,damage,survival_time,placement_points,total_points,link_eligibility)
    select incoming.id,r.player_id,r.player_name,r.pubg_account_id,r.team_id,r.team_name,r.slot_number,r.placement,r.kills,r.assists,r.knocks,r.damage,r.survival_time,r.placement_points,r.total_points,coalesce(r.link_eligibility,'eligible')
    from jsonb_to_recordset(p_player_rows) as r(player_id uuid,player_name text,pubg_account_id text,team_id uuid,team_name text,slot_number int,placement int,kills int,assists int,knocks int,damage numeric,survival_time int,placement_points numeric,total_points numeric,link_eligibility text);
    if p_publish then
      insert into public.event_teams(event_id,team_id,status)
      select distinct target_event,team_id,'approved' from public.match_team_results where match_id = incoming.id and team_id is not null
      on conflict(event_id,team_id) do nothing;
    end if;
    update public.matches set status = case when p_publish then 'published'::public.match_status else 'pending'::public.match_status end,
      published_at = case when p_publish then coalesce(previous.published_at,clock_timestamp()) else null end
      where id = incoming.id returning * into saved;
  end if;

  update public.events set match_count = (select count(*) from public.matches where event_id = target_event and status = 'published' and published_at is not null and deleted_at is null and demo_seed_tag is null), updated_at = clock_timestamp() where id = target_event;
  -- Required audit participates in exactly the same transaction as the scores.
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,old_data,new_data)
  values(p_actor_id,'match.' || p_action,'match_transaction',incoming.id::text,
    jsonb_build_object('match',to_jsonb(previous),'teamResults',old_teams,'playerResults',old_players),
    jsonb_build_object('match',to_jsonb(saved),'teamResults',case when p_action = 'replace' then p_team_rows else old_teams end,'playerResults',case when p_action = 'replace' then p_player_rows else old_players end));
  return saved.revision;
end;
$$;
revoke all on function public.commit_competition_match(jsonb,jsonb,jsonb,bigint,boolean,text,uuid) from public, anon, authenticated;
grant execute on function public.commit_competition_match(jsonb,jsonb,jsonb,bigint,boolean,text,uuid) to service_role;
-- Revision is operator metadata; do not widen public column grants.
notify pgrst, 'reload schema';
commit;
