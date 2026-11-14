-- TimiSight — Auth0 third-party-auth per-user model (mobile)
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → New query → paste → Run).
-- It is idempotent: safe to re-run; it only adds what is missing.
--
-- WHY A SEPARATE SET OF TABLES?
--   The web app authenticates with Supabase Auth, so its tables (schema.sql) key every
--   per-user row on a uuid -> auth.users via auth.uid(). The mobile app authenticates
--   with Auth0 via Supabase THIRD-PARTY AUTH: there is no auth.users row for a mobile
--   user, and auth.uid() is null. The stable mobile identity is the Auth0 `sub` (text,
--   e.g. 'auth0|abc123'), read from the verified JWT as auth.jwt()->>'sub'.
--
--   Rather than retype schema.sql's uuid columns (which would break the running web app),
--   this migration is PURELY ADDITIVE: new `*_a0` tables keyed on auth0_sub text, plus a
--   dedicated user_flowers collection table and sub-keyed RPCs/views. Web keeps working
--   untouched. Unifying web onto Auth0 is a separate, later task.
--
-- DESIGN INVARIANTS (owned by the DB, not the client):
--   * ONE append-only ledger (point_transactions_a0) holds BOTH earned (+ check-in) and
--     spent (- redeem) points. Balance = sum(amount). Earned == spendable by construction.
--   * No client can INSERT the ledger: only SECURITY DEFINER functions write it.
--   * "Each flower awards points once": user_flowers PK + the ledger's partial unique
--     index, both via ON CONFLICT DO NOTHING inside one transaction.
--   * Redemption is atomic & double-spend-safe (advisory lock + stock decrement + balance
--     check in one transaction).
--   * The caller's identity is NEVER a client parameter: checkin_flower / redeem_offer_a0
--     read the sub from auth.jwt() server-side, so a client cannot act as another user.
--
-- PREREQUISITE (dashboard, cannot be done in SQL): Auth0 must be registered as a
--   Third-Party Auth provider in Supabase, and the Auth0 Post-Login Action must inject a
--   bare `role: "authenticated"` claim on the ACCESS token. Without that claim Supabase
--   treats the request as `anon` and every per-user policy below rejects it.

-- ---------------------------------------------------------------------------
-- current_sub(): the one place the JWT sub expression lives. STABLE so the planner
-- can cache it within a statement. Returns null for an anon (no/standard) token.
-- ---------------------------------------------------------------------------
create or replace function current_sub() returns text
language sql stable set search_path = public as $$
  select auth.jwt() ->> 'sub'
$$;

-- ---------------------------------------------------------------------------
-- profiles_a0: public, per-user display name for the leaderboard, keyed on the
-- Auth0 sub. Written by checkin_flower (upsert from the JWT `name` claim) since
-- there is no auth.users trigger for third-party users.
-- ---------------------------------------------------------------------------
create table if not exists profiles_a0 (
  auth0_sub  text primary key,
  display_name text,
  created_at timestamptz default now()
);

alter table profiles_a0 enable row level security;

drop policy if exists "read profiles_a0" on profiles_a0;
create policy "read profiles_a0" on profiles_a0 for select using (true);

drop policy if exists "update own profile_a0" on profiles_a0;
create policy "update own profile_a0" on profiles_a0
  for update using (auth0_sub = current_sub()) with check (auth0_sub = current_sub());

drop policy if exists "insert own profile_a0" on profiles_a0;
create policy "insert own profile_a0" on profiles_a0
  for insert with check (auth0_sub = current_sub());

-- ---------------------------------------------------------------------------
-- point_transactions_a0: append-only points ledger (earned + spent), sub-keyed.
-- ---------------------------------------------------------------------------
create table if not exists point_transactions_a0 (
  id bigint generated always as identity primary key,
  auth0_sub text not null,
  amount int not null,               -- + earned, - spent
  reason text not null,              -- 'checkin:<flower_id>', 'redeem:<offer uuid>', 'badge:<id>'
  created_at timestamptz default now()
);

-- "Pays once" per (user, reason) for positive rows, mirroring schema.sql's one_reward_each.
create unique index if not exists one_reward_each_a0
  on point_transactions_a0 (auth0_sub, reason) where amount > 0;

alter table point_transactions_a0 enable row level security;

drop policy if exists "read own points_a0" on point_transactions_a0;
create policy "read own points_a0" on point_transactions_a0
  for select using (auth0_sub = current_sub());
-- No INSERT/UPDATE/DELETE policy: the ledger is writable only by SECURITY DEFINER fns.

create or replace view user_points_a0 with (security_invoker = true) as
select auth0_sub,
       sum(amount) as balance,
       sum(amount) filter (where amount > 0) as lifetime
from point_transactions_a0
group by auth0_sub;

-- ---------------------------------------------------------------------------
-- user_flowers: the authoritative per-user collection. Composite PK enforces
-- "each flower collected once per user".
-- ---------------------------------------------------------------------------
create table if not exists user_flowers (
  auth0_sub text not null,
  flower_id text not null references flowers(id),
  points_awarded int not null default 0,
  collected_at timestamptz default now(),
  primary key (auth0_sub, flower_id)
);

alter table user_flowers enable row level security;

drop policy if exists "read own flowers" on user_flowers;
create policy "read own flowers" on user_flowers
  for select using (auth0_sub = current_sub());
-- No INSERT policy: written only by checkin_flower (SECURITY DEFINER).

-- ---------------------------------------------------------------------------
-- redemptions_a0: a claimed offer + its one-time code, sub-keyed.
-- ---------------------------------------------------------------------------
create table if not exists redemptions_a0 (
  id uuid primary key default gen_random_uuid(),
  auth0_sub text not null,
  offer_id uuid not null references offers,
  code text not null default upper(substr(md5(random()::text), 1, 8)),
  used_at timestamptz,
  created_at timestamptz default now()
);

alter table redemptions_a0 enable row level security;

drop policy if exists "read own redemptions_a0" on redemptions_a0;
create policy "read own redemptions_a0" on redemptions_a0
  for select using (auth0_sub = current_sub());
-- No INSERT policy: written only by redeem_offer_a0 (SECURITY DEFINER).

-- ---------------------------------------------------------------------------
-- checkin_flower: record a scanned flower + award its points, idempotently.
-- SECURITY DEFINER so it can write the no-insert-policy tables. Identity comes
-- from the verified JWT, never from a parameter.
-- Returns jsonb: { "already": bool, "earned": int, "total": int }
-- ---------------------------------------------------------------------------
create or replace function checkin_flower(p_flower text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_sub text := current_sub();
  v_points int;
  v_inserted boolean := false;
  v_total int;
begin
  if v_sub is null then
    raise exception 'not signed in';
  end if;

  -- Resolve the flower's point value (also validates the id exists & is active).
  select points into v_points from flowers where id = p_flower and active;
  if not found then
    raise exception 'unknown flower';
  end if;

  -- Ensure a profile row with a readable name for the leaderboard (JWT name claim).
  insert into profiles_a0 (auth0_sub, display_name)
  values (
    v_sub,
    coalesce(
      nullif(auth.jwt() ->> 'name', ''),
      nullif(auth.jwt() ->> 'email', ''),
      'Explorer'
    )
  )
  on conflict (auth0_sub) do update set display_name = excluded.display_name;

  -- Record the collection row. If it already exists, this is a repeat scan.
  insert into user_flowers (auth0_sub, flower_id, points_awarded)
  values (v_sub, p_flower, v_points)
  on conflict (auth0_sub, flower_id) do nothing;
  get diagnostics v_inserted = row_count;  -- 1 on first insert, 0 on conflict

  -- Award points only on the first collection, into the shared ledger. The partial
  -- unique index is a second guard so the two tables can never diverge.
  if v_inserted then
    insert into point_transactions_a0 (auth0_sub, amount, reason)
    values (v_sub, v_points, 'checkin:' || p_flower)
    on conflict (auth0_sub, reason) where amount > 0 do nothing;
  end if;

  select coalesce(sum(amount), 0) into v_total
  from point_transactions_a0 where auth0_sub = v_sub;

  return jsonb_build_object(
    'already', not v_inserted,
    'earned', case when v_inserted then v_points else 0 end,
    'total', v_total
  );
end $$;

revoke execute on function checkin_flower(text) from public;
grant execute on function checkin_flower(text) to authenticated;

-- ---------------------------------------------------------------------------
-- redeem_offer_a0: spend points for an offer. Atomic & double-spend safe.
-- Sub-keyed twin of schema.sql's redeem_offer. Returns the one-time code.
-- ---------------------------------------------------------------------------
create or replace function redeem_offer_a0(p_offer uuid) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_sub text := current_sub();
  o offers;
  bal int;
  c text;
begin
  if v_sub is null then
    raise exception 'not signed in';
  end if;

  select * into o from offers where id = p_offer and active for update;
  if not found then
    raise exception 'offer not available';
  end if;

  -- Serialize concurrent redemptions for this user so the same points can't be
  -- spent twice by a double-tap.
  perform pg_advisory_xact_lock(hashtext(v_sub));

  select coalesce(sum(amount), 0) into bal
  from point_transactions_a0 where auth0_sub = v_sub;
  if bal < o.cost then
    raise exception 'not enough points';
  end if;

  if o.stock is not null then
    if o.stock <= 0 then
      raise exception 'sold out';
    end if;
    update offers set stock = stock - 1 where id = o.id;
  end if;

  insert into point_transactions_a0 (auth0_sub, amount, reason)
  values (v_sub, -o.cost, 'redeem:' || o.id);

  insert into redemptions_a0 (auth0_sub, offer_id)
  values (v_sub, o.id)
  returning code into c;

  return c;
end $$;

revoke execute on function redeem_offer_a0(uuid) from public;
grant execute on function redeem_offer_a0(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- award_points_a0: the sub-keyed mirror of award_points, for server/badge grants.
-- Positive-only. NOT client-callable (no grant). Intentionally unused this
-- milestone; kept for parity so a future badge/server path has a safe entry point.
-- ---------------------------------------------------------------------------
create or replace function award_points_a0(p_sub text, p_amount int, p_reason text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_amount <= 0 then
    raise exception 'award_points_a0 only adds positive amounts';
  end if;
  insert into point_transactions_a0 (auth0_sub, amount, reason)
  values (p_sub, p_amount, p_reason)
  on conflict (auth0_sub, reason) where amount > 0 do nothing;
end $$;

revoke execute on function award_points_a0(text, int, text) from public;

-- ---------------------------------------------------------------------------
-- leaderboard_a0: public ranking by lifetime points earned. LEFT JOIN so a
-- ledger-only user (no profile row yet) still ranks, with an 'Explorer' fallback.
-- ---------------------------------------------------------------------------
create or replace view leaderboard_a0 with (security_invoker = true) as
select p.auth0_sub,
       coalesce(pr.display_name, 'Explorer') as display_name,
       coalesce(sum(p.amount) filter (where p.amount > 0), 0) as lifetime
from point_transactions_a0 p
left join profiles_a0 pr on pr.auth0_sub = p.auth0_sub
group by p.auth0_sub, pr.display_name;

grant select on leaderboard_a0 to authenticated, anon;

-- ---------------------------------------------------------------------------
-- Seed the three mobile shop offers into the shared `offers` table with STABLE
-- UUIDs so the mobile client references real rows (and redeem decrements real
-- stock through redeem_offer_a0). `kind` carries the MOBILE vocabulary
-- ('repeatable' | 'active'); offers.kind is free-text so this needs no schema
-- change. Cost/stock match the current demo values so behavior is unchanged.
-- Idempotent via ON CONFLICT (id) DO NOTHING.
-- ---------------------------------------------------------------------------
insert into offers (id, title, partner, kind, cost, stock, active) values
  ('a0000000-0000-4000-8000-000000000001', 'Free coffee',        'Partner café',    'repeatable', 120,  null, true),
  ('a0000000-0000-4000-8000-000000000002', 'Museum day pass',    'National Museum', 'active',     400,  25,   true),
  ('a0000000-0000-4000-8000-000000000003', 'Monthly tram pass',  'STPT',            'active',     2000, 0,    true)
on conflict (id) do nothing;
