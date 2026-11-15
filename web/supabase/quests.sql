-- TimiSight — Quests (flower paths + daily quests) per-user model (mobile)
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → New query → paste → Run).
-- It is idempotent: safe to re-run; it only adds what is missing.
--
-- This file is PURELY ADDITIVE on top of auth0-migration.sql and flowers.sql. It does NOT
-- modify checkin_flower, award_points_a0, or any existing table/RPC. It mirrors the
-- auth0-migration.sql conventions EXACTLY:
--   * text auth0_sub keys; identity resolved server-side via current_sub() = auth.jwt()->>'sub',
--     never a client parameter.
--   * RLS read-own on user-state tables; catalogue tables are public-read.
--   * No client INSERT/UPDATE policy on user-state tables: they are written ONLY by the
--     SECURITY DEFINER RPCs below.
--   * Point grants reuse the existing positive-only, idempotent award_points_a0 (one payout
--     per (auth0_sub, reason) via the one_reward_each_a0 partial unique index).
--   * grant execute … to authenticated only on the three client-callable RPCs.
--
-- PREREQUISITE: auth0-migration.sql and flowers.sql have already been applied (this file
-- references flowers(id), current_sub(), award_points_a0, user_flowers).

-- ===========================================================================
-- CATALOGUE TABLES (static content; public read, like `flowers`)
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- flower_paths: a predetermined, ordered route of real flowers. A path
-- AUTO-ACTIVATES when the user checks in its start_flower_id. casa-muhle is the
-- fixed start flower for the demo path. completion_bonus is a one-time server-side
-- award granted when every stop is collected.
-- ---------------------------------------------------------------------------
create table if not exists flower_paths (
  id text primary key,
  name_en text not null,
  name_ro text not null,
  start_flower_id text not null references flowers(id),
  badge text,                                   -- client-derived badge id (see src/constants/badges.ts)
  completion_bonus int not null default 0 check (completion_bonus >= 0),
  sort_order int not null default 0,
  active boolean not null default true
);

alter table flower_paths enable row level security;

drop policy if exists "read active flower_paths" on flower_paths;
create policy "read active flower_paths" on flower_paths for select using (active);

-- ---------------------------------------------------------------------------
-- flower_path_stops: the ordered stops of a path. Stops are ordered by `position`
-- ascending. The unique (path_id, flower_id) prevents a flower appearing twice in
-- one path. Public read: ordering is catalogue content, not user-specific.
-- ---------------------------------------------------------------------------
create table if not exists flower_path_stops (
  path_id text not null references flower_paths(id),
  flower_id text not null references flowers(id),
  position int not null,
  primary key (path_id, position),
  unique (path_id, flower_id)
);

alter table flower_path_stops enable row level security;

drop policy if exists "read flower_path_stops" on flower_path_stops;
create policy "read flower_path_stops" on flower_path_stops for select using (true);

-- ---------------------------------------------------------------------------
-- daily_quest_pool: the set of flowers a daily quest can be drawn from. Public
-- read (active). Demo seeds exactly one row: timisoreana-malt.
-- ---------------------------------------------------------------------------
create table if not exists daily_quest_pool (
  flower_id text primary key references flowers(id),
  active boolean not null default true
);

alter table daily_quest_pool enable row level security;

drop policy if exists "read active daily_quest_pool" on daily_quest_pool;
create policy "read active daily_quest_pool" on daily_quest_pool for select using (active);

-- ===========================================================================
-- USER-STATE TABLES (RLS read-own; NO client INSERT/UPDATE — written only by the
-- SECURITY DEFINER RPCs below)
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- user_flower_paths: per-user activation + completion state for a path. PK
-- (auth0_sub, path_id). activated_at is set when the path auto-activates (start
-- flower checked in); completed_at is set once (and only once) when all stops are
-- collected. Mirrors user_flowers: read-own, no insert policy.
-- ---------------------------------------------------------------------------
create table if not exists user_flower_paths (
  auth0_sub text not null,
  path_id text not null references flower_paths(id),
  activated_at timestamptz not null default now(),
  completed_at timestamptz,
  primary key (auth0_sub, path_id)
);

alter table user_flower_paths enable row level security;

drop policy if exists "read own flower paths" on user_flower_paths;
create policy "read own flower paths" on user_flower_paths
  for select using (auth0_sub = current_sub());
-- No INSERT/UPDATE policy: written only by activate_paths_for_flower / complete_path_if_done.

-- ---------------------------------------------------------------------------
-- user_daily_quests: the daily quest assigned to a user for a given Europe/Bucharest
-- date. PK (auth0_sub, quest_date) → exactly one quest per user per day. quest_date is
-- the Bucharest date key, computed server-side so it never depends on device time.
-- Incomplete-yesterday is a no-op: nothing is rolled over (a new date simply gets a new
-- row). Read-own; no insert policy (written only by get_daily_quest).
-- ---------------------------------------------------------------------------
create table if not exists user_daily_quests (
  auth0_sub text not null,
  quest_date date not null,
  flower_id text not null references flowers(id),
  primary key (auth0_sub, quest_date)
);

alter table user_daily_quests enable row level security;

drop policy if exists "read own daily quests" on user_daily_quests;
create policy "read own daily quests" on user_daily_quests
  for select using (auth0_sub = current_sub());
-- No INSERT policy: written only by get_daily_quest (SECURITY DEFINER).

-- ===========================================================================
-- RPCs (all SECURITY DEFINER set search_path = public; identity via current_sub(),
-- never a client-supplied sub; revoke from public, grant only to authenticated)
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- activate_paths_for_flower(p_flower): activate every active path whose start flower
-- is p_flower, for the caller. Idempotent (on conflict do nothing).
--
-- WHY A SEPARATE RPC (not folded into checkin_flower): the locked design requires
-- checkin_flower's signature/return to stay UNTOUCHED (the scan UX and the collection
-- store depend on its exact {already, earned, total} contract). Path activation is a
-- distinct, additive concern, so the client calls this RPC right after a successful
-- check-in. Calling it on a repeat scan is harmless.
-- ---------------------------------------------------------------------------
create or replace function activate_paths_for_flower(p_flower text) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_sub text := current_sub();
begin
  if v_sub is null then
    raise exception 'not signed in';
  end if;

  insert into user_flower_paths (auth0_sub, path_id)
  select v_sub, fp.id
  from flower_paths fp
  where fp.start_flower_id = p_flower and fp.active
  on conflict (auth0_sub, path_id) do nothing;
end $$;

revoke execute on function activate_paths_for_flower(text) from public;
grant execute on function activate_paths_for_flower(text) to authenticated;

-- ---------------------------------------------------------------------------
-- complete_path_if_done(p_path): if the caller has collected EVERY stop of p_path and
-- the path is not already completed, set completed_at and award the one-time completion
-- bonus. Idempotent on two levels: the completed_at guard (fast path + the conditional
-- UPDATE) AND one_reward_each_a0 inside award_points_a0 (reason 'path_complete:<path>'
-- pays exactly once). Returns jsonb { completed, already, awarded }.
-- ---------------------------------------------------------------------------
create or replace function complete_path_if_done(p_path text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_sub text := current_sub();
  v_bonus int;
  v_stop_count int;
  v_done boolean;
  v_updated boolean := false;
begin
  if v_sub is null then
    raise exception 'not signed in';
  end if;

  -- Resolve the path + its bonus (also validates the id exists & is active).
  select completion_bonus into v_bonus
  from flower_paths where id = p_path and active;
  if not found then
    raise exception 'unknown path';
  end if;

  -- Fast idempotent path: already completed → nothing to do.
  if exists (
    select 1 from user_flower_paths
    where auth0_sub = v_sub and path_id = p_path and completed_at is not null
  ) then
    return jsonb_build_object('completed', false, 'already', true, 'awarded', 0);
  end if;

  -- The path must have at least one stop, and every stop must be in the caller's
  -- collection (user_flowers). Otherwise it is not yet complete.
  select count(*) into v_stop_count from flower_path_stops where path_id = p_path;
  v_done := v_stop_count > 0 and not exists (
    select 1 from flower_path_stops s
    where s.path_id = p_path
      and not exists (
        select 1 from user_flowers uf
        where uf.auth0_sub = v_sub and uf.flower_id = s.flower_id
      )
  );

  if not v_done then
    return jsonb_build_object('completed', false, 'already', false, 'awarded', 0);
  end if;

  -- Ensure an activation row exists (the start flower may have been collected before
  -- this feature shipped), then stamp completion exactly once.
  insert into user_flower_paths (auth0_sub, path_id)
  values (v_sub, p_path)
  on conflict (auth0_sub, path_id) do nothing;

  update user_flower_paths
  set completed_at = now()
  where auth0_sub = v_sub and path_id = p_path and completed_at is null;
  get diagnostics v_updated = row_count;  -- 1 the first time, 0 on a concurrent race

  -- Award the one-time bonus. award_points_a0 is positive-only and idempotent per reason,
  -- so even a concurrent double-call pays at most once.
  if v_bonus > 0 then
    perform award_points_a0(v_sub, v_bonus, 'path_complete:' || p_path);
  end if;

  return jsonb_build_object('completed', true, 'already', not v_updated, 'awarded', v_bonus);
end $$;

revoke execute on function complete_path_if_done(text) from public;
grant execute on function complete_path_if_done(text) to authenticated;

-- ---------------------------------------------------------------------------
-- get_daily_quest(): return today's daily quest for the caller, using the
-- Europe/Bucharest date key (so the quest refreshes at 00:00 Bucharest, independent of
-- device time). The pick is deterministic and STABLE per (sub, date): once assigned for
-- a date it is re-read from user_daily_quests, so changing the pool later does not swap
-- an already-assigned quest. For N pool rows the pick is pseudo-random but stable via
-- hashtext(sub || date); for the 1-row demo pool it is trivially timisoreana-malt.
--
-- No separate daily bonus for the demo: completing the daily quest earns the normal
-- checkin_flower points. The schema leaves room to add a bonus later (e.g. a column on
-- daily_quest_pool + a grant here). Incomplete-yesterday is a no-op (a new date = new row).
--
-- Returns jsonb { flower_id, quest_date, collected_today }.
-- ---------------------------------------------------------------------------
create or replace function get_daily_quest() returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_sub text := current_sub();
  v_date date := (now() at time zone 'Europe/Bucharest')::date;
  v_count int;
  v_offset int;
  v_pick text;
  v_day_start timestamptz := (v_date::timestamp at time zone 'Europe/Bucharest');
  v_collected boolean;
begin
  if v_sub is null then
    raise exception 'not signed in';
  end if;

  -- Deterministic, stable pick from the active pool for this (sub, date).
  select count(*) into v_count from daily_quest_pool where active;
  if v_count = 0 then
    return jsonb_build_object('flower_id', null, 'quest_date', v_date, 'collected_today', false);
  end if;

  v_offset := abs(hashtext(v_sub || v_date::text)) % v_count;
  select flower_id into v_pick
  from daily_quest_pool
  where active
  order by flower_id
  offset v_offset
  limit 1;

  -- Persist the assignment once; re-read so a once-assigned quest stays stable even if
  -- the pool changes later.
  insert into user_daily_quests (auth0_sub, quest_date, flower_id)
  values (v_sub, v_date, v_pick)
  on conflict (auth0_sub, quest_date) do nothing;

  select flower_id into v_pick
  from user_daily_quests
  where auth0_sub = v_sub and quest_date = v_date;

  -- Collected today = a user_flowers row for the quest flower collected on/after
  -- Bucharest midnight of the quest date.
  v_collected := exists (
    select 1 from user_flowers uf
    where uf.auth0_sub = v_sub
      and uf.flower_id = v_pick
      and uf.collected_at >= v_day_start
  );

  return jsonb_build_object(
    'flower_id', v_pick,
    'quest_date', v_date,
    'collected_today', v_collected
  );
end $$;

revoke execute on function get_daily_quest() from public;
grant execute on function get_daily_quest() to authenticated;

-- ---------------------------------------------------------------------------
-- complete_daily_if_done(): if the caller has collected TODAY'S daily-quest flower
-- (the one get_daily_quest assigned for the Europe/Bucharest date), award the one-time
-- daily completion bonus. Separate from the normal per-flower scan points: the flower's
-- own points are granted by checkin_flower; THIS adds a flat bonus for finishing the
-- daily. Idempotent per (sub, date) via reason 'daily_complete:<date>' and the
-- one_reward_each_a0 index inside award_points_a0, so it pays at most once per day.
--
-- The bonus is a demo-tunable constant (DAILY_BONUS below). It is safe to call after any
-- check-in: if the scanned flower is not today's daily, or it hasn't been collected yet,
-- it simply does nothing. Returns jsonb { completed, already, awarded }.
-- ---------------------------------------------------------------------------
create or replace function complete_daily_if_done() returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_sub text := current_sub();
  v_date date := (now() at time zone 'Europe/Bucharest')::date;
  v_day_start timestamptz := (v_date::timestamp at time zone 'Europe/Bucharest');
  v_flower text;
  v_bonus int := 100;  -- DAILY_BONUS: demo value. Flat daily-completion reward.
  v_reason text := 'daily_complete:' || v_date::text;
  v_collected boolean;
begin
  if v_sub is null then
    raise exception 'not signed in';
  end if;

  -- The daily quest assigned for today (if get_daily_quest has run for this user/date).
  select flower_id into v_flower
  from user_daily_quests
  where auth0_sub = v_sub and quest_date = v_date;
  if v_flower is null then
    return jsonb_build_object('completed', false, 'already', false, 'awarded', 0);
  end if;

  -- Must have collected that flower on/after Bucharest midnight of the quest date.
  v_collected := exists (
    select 1 from user_flowers uf
    where uf.auth0_sub = v_sub
      and uf.flower_id = v_flower
      and uf.collected_at >= v_day_start
  );
  if not v_collected then
    return jsonb_build_object('completed', false, 'already', false, 'awarded', 0);
  end if;

  -- Already paid today? (the ledger reason is unique per sub+day via one_reward_each_a0)
  if exists (
    select 1 from point_transactions_a0
    where auth0_sub = v_sub and reason = v_reason and amount > 0
  ) then
    return jsonb_build_object('completed', true, 'already', true, 'awarded', 0);
  end if;

  if v_bonus > 0 then
    perform award_points_a0(v_sub, v_bonus, v_reason);
  end if;

  return jsonb_build_object('completed', true, 'already', false, 'awarded', v_bonus);
end $$;

revoke execute on function complete_daily_if_done() from public;
grant execute on function complete_daily_if_done() to authenticated;

-- ===========================================================================
-- SEED (idempotent upserts, same style as flowers.sql)
-- ===========================================================================

-- The one demo path: Historic Timișoara, starting at casa-muhle, 100-point completion
-- bonus, badge id 'first_path' (matches the client-derived Pathfinder badge).
insert into flower_paths (id, name_en, name_ro, start_flower_id, badge, completion_bonus, sort_order, active)
values ('historic-timisoara', 'Historic Timișoara', 'Timișoara istorică', 'casa-muhle', 'first_path', 100, 1, true)
on conflict (id) do update set
  name_en = excluded.name_en,
  name_ro = excluded.name_ro,
  start_flower_id = excluded.start_flower_id,
  badge = excluded.badge,
  completion_bonus = excluded.completion_bonus,
  sort_order = excluded.sort_order,
  active = excluded.active;

-- Its three ordered stops: casa-muhle (1) → opera-rose (2) → miklosi-tulip (3).
insert into flower_path_stops (path_id, flower_id, position) values
  ('historic-timisoara', 'casa-muhle', 1),
  ('historic-timisoara', 'opera-rose', 2),
  ('historic-timisoara', 'miklosi-tulip', 3)
on conflict (path_id, position) do update set flower_id = excluded.flower_id;

-- The one demo daily-quest pool entry.
insert into daily_quest_pool (flower_id, active)
values ('timisoreana-malt', true)
on conflict (flower_id) do update set active = excluded.active;
