create table if not exists public.app_rate_limits (
  limiter_key text primary key,
  request_count integer not null default 0,
  window_started_at timestamptz not null default timezone('utc', now()),
  reset_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists app_rate_limits_reset_at_idx on public.app_rate_limits (reset_at);

create or replace function public.consume_rate_limit(
  p_key text,
  p_max_requests integer,
  p_window_ms integer
)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_now timestamptz := timezone('utc', now());
  v_window interval := (greatest(p_window_ms, 1000)::text || ' milliseconds')::interval;
  v_count integer;
  v_reset_at timestamptz;
  v_retry_after integer;
begin
  insert into public.app_rate_limits as rate_limit (
    limiter_key,
    request_count,
    window_started_at,
    reset_at,
    updated_at
  )
  values (
    p_key,
    1,
    v_now,
    v_now + v_window,
    v_now
  )
  on conflict (limiter_key) do update
  set
    request_count = case
      when rate_limit.reset_at <= v_now then 1
      else rate_limit.request_count + 1
    end,
    window_started_at = case
      when rate_limit.reset_at <= v_now then v_now
      else rate_limit.window_started_at
    end,
    reset_at = case
      when rate_limit.reset_at <= v_now then v_now + v_window
      else rate_limit.reset_at
    end,
    updated_at = v_now
  returning request_count, reset_at into v_count, v_reset_at;

  v_retry_after := case
    when v_count > p_max_requests then greatest(1, ceil(extract(epoch from (v_reset_at - v_now)))::integer)
    else 0
  end;

  return jsonb_build_object(
    'allowed', v_count <= p_max_requests,
    'remaining', greatest(p_max_requests - least(v_count, p_max_requests), 0),
    'retry_after_seconds', v_retry_after,
    'reset_at', v_reset_at
  );
end;
$$;
