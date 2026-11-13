-- TimiSight — shop & badge/points schema
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → New query → paste → Run).
-- It is idempotent: safe to re-run; it only adds what is missing.
--
-- Design notes:
--   * Points live in an append-only ledger (point_transactions). A user's balance
--     is the SUM of their rows. Positive = earned, negative = spent.
--   * No client can INSERT into the ledger. Only SECURITY DEFINER functions can,
--     so points can never be minted from the browser.
--   * Spending goes through redeem_offer(), which locks per-user to stop a
--     double-tap from spending the same points twice.

-- ---------------------------------------------------------------------------
-- profiles: public, per-user row that mirrors the display name.
-- The leaderboard needs a readable name; auth.users is not exposed to clients,
-- so we keep a thin profiles table and fill display_name from the sign-up
-- metadata (options.data.full_name — see app/auth/actions.ts).
-- ---------------------------------------------------------------------------
create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text,
  created_at timestamptz default now()
);

alter table profiles enable row level security;

drop policy if exists "read profiles" on profiles;
create policy "read profiles" on profiles for select using (true);

drop policy if exists "update own profile" on profiles;
create policy "update own profile" on profiles for update using (auth.uid() = id);

create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, display_name)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', ''),
      split_part(new.email, '@', 1)
    )
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

insert into profiles (id, display_name)
select u.id,
       coalesce(
         nullif(u.raw_user_meta_data ->> 'full_name', ''),
         nullif(u.raw_user_meta_data ->> 'name', ''),
         split_part(u.email, '@', 1)
       )
from auth.users u
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- point_transactions: append-only points ledger.
-- ---------------------------------------------------------------------------
create table if not exists point_transactions (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users on delete cascade,
  amount int not null,               -- + earned, - spent
  reason text not null,              -- 'checkin:opera', 'badge:explorer', 'redeem:<offer id>'
  created_at timestamptz default now()
);

create unique index if not exists one_reward_each
  on point_transactions (user_id, reason) where amount > 0;

alter table point_transactions enable row level security;

drop policy if exists "read own points" on point_transactions;
create policy "read own points" on point_transactions
  for select using (auth.uid() = user_id);

create or replace view user_points with (security_invoker = true) as
select user_id,
       sum(amount) as balance,
       sum(amount) filter (where amount > 0) as lifetime
from point_transactions
group by user_id;

-- ---------------------------------------------------------------------------
-- award_points: the only way to ADD points. SECURITY DEFINER so it can write
-- to the ledger despite the lack of an insert policy.
-- ---------------------------------------------------------------------------
create or replace function award_points(p_user uuid, p_amount int, p_reason text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_amount <= 0 then
    raise exception 'award_points only adds positive amounts';
  end if;
  insert into point_transactions (user_id, amount, reason)
  values (p_user, p_amount, p_reason)
  on conflict (user_id, reason) where amount > 0 do nothing;
end $$;

revoke execute on function award_points(uuid, int, text) from public;

-- ---------------------------------------------------------------------------
-- offers: the shop catalogue.
-- ---------------------------------------------------------------------------
create table if not exists offers (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  partner text,
  kind text default 'voucher',       -- 'ticket' | 'discount' | 'event_promo'
  cost int not null check (cost > 0),
  stock int,                          -- null = unlimited
  active boolean default true
);

-- ---------------------------------------------------------------------------
-- redemptions: a claimed offer + its one-time code.
-- ---------------------------------------------------------------------------
create table if not exists redemptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  offer_id uuid not null references offers,
  code text not null default upper(substr(md5(random()::text), 1, 8)),
  used_at timestamptz,
  created_at timestamptz default now()
);

alter table offers enable row level security;
alter table redemptions enable row level security;

drop policy if exists "anyone reads active offers" on offers;
create policy "anyone reads active offers" on offers for select using (active);

drop policy if exists "read own redemptions" on redemptions;
create policy "read own redemptions" on redemptions
  for select using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- redeem_offer: spend points for an offer. Atomic & double-spend safe.
-- ---------------------------------------------------------------------------
create or replace function redeem_offer(p_offer uuid) returns text
language plpgsql security definer set search_path = public as $$
declare
  o offers;
  bal int;
  c text;
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;

  select * into o from offers where id = p_offer and active for update;
  if not found then
    raise exception 'offer not available';
  end if;

  perform pg_advisory_xact_lock(hashtext(auth.uid()::text));

  select coalesce(sum(amount), 0) into bal
  from point_transactions where user_id = auth.uid();
  if bal < o.cost then
    raise exception 'not enough points';
  end if;

  if o.stock is not null then
    if o.stock <= 0 then
      raise exception 'sold out';
    end if;
    update offers set stock = stock - 1 where id = o.id;
  end if;

  insert into point_transactions (user_id, amount, reason)
  values (auth.uid(), -o.cost, 'redeem:' || o.id);

  insert into redemptions (user_id, offer_id)
  values (auth.uid(), o.id)
  returning code into c;

  return c;
end $$;

revoke execute on function redeem_offer(uuid) from public;
grant execute on function redeem_offer(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- leaderboard: public ranking by lifetime points earned.
-- ---------------------------------------------------------------------------
create or replace view leaderboard as
select p.user_id,
       pr.display_name,
       coalesce(sum(p.amount) filter (where p.amount > 0), 0) as lifetime
from point_transactions p
join profiles pr on pr.id = p.user_id
group by p.user_id, pr.display_name;

grant select on leaderboard to authenticated;
