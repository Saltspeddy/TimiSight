-- TimiSight — account roles (visitor / organization / artist), the artist directory, and
-- statue commissions with a conversation between an organization and an artist.
-- Run in the Supabase SQL editor AFTER auth0-migration.sql (it defines current_sub()).
-- Idempotent: safe to re-run.
--
-- PURELY ADDITIVE. New tables and functions only. It does not touch Auth0 / Third-party
-- Auth settings, the `auth` schema, or any existing table, view or function.
--
-- IDENTITY: like auth0-migration.sql, every row is keyed on the Auth0 `sub` read from the
-- verified JWT (current_sub()). The caller's identity is never a client parameter.
--
-- HOW IT WORKS
--   * Everyone has one role: 'user' (visitor, the default), 'organization' or 'artist'.
--     It is chosen at first sign-in via set_my_role() and CANNOT be changed from the app.
--     To change someone's role, edit user_roles_a0 in the dashboard.
--   * Artists appear in artists_a0, which anyone can read (it is the public directory).
--     An artist can edit only their own profile.
--   * An organization sends a commission request (the "brief") to ONE artist. Until the
--     artist accepts it, nothing else can be sent: the brief is the only message. Once the
--     artist accepts, both can chat to pin down the requirements; the organization marks
--     them agreed. Either side can end it (artist: decline, organization: cancel).
--   * Only the two people involved can see a commission or its messages.
--
-- STATUS FLOW        requested --(artist)--> discussing --(organization)--> agreed
--                    requested/discussing --(artist)--> declined
--                    requested/discussing --(organization)--> cancelled

-- ---------------------------------------------------------------------------
-- user_roles_a0: one row per person, written only by set_my_role().
-- ---------------------------------------------------------------------------
create table if not exists user_roles_a0 (
  auth0_sub text primary key,
  role text not null default 'user' check (role in ('user', 'organization', 'artist')),
  display_name text,                       -- organization name / artist name, null for visitors
  created_at timestamptz not null default now()
);

alter table user_roles_a0 enable row level security;
drop policy if exists "read own role" on user_roles_a0;
create policy "read own role" on user_roles_a0 for select using (auth0_sub = current_sub());
revoke insert, update, delete on user_roles_a0 from anon, authenticated;

-- ---------------------------------------------------------------------------
-- artists_a0: the artist directory. Public to read; each artist edits only their own row.
-- ---------------------------------------------------------------------------
create table if not exists artists_a0 (
  auth0_sub text primary key,
  name text not null check (char_length(btrim(name)) between 2 and 120),
  headline text check (char_length(headline) <= 160),
  bio text check (char_length(bio) <= 2000),
  city text check (char_length(city) <= 80),
  specialties text[] not null default '{}' check (cardinality(specialties) <= 12),
  available boolean not null default true,
  is_sample boolean not null default false,  -- demo rows; real artists are always false
  created_at timestamptz not null default now()
);

alter table artists_a0 enable row level security;

drop policy if exists "artists are public" on artists_a0;
create policy "artists are public" on artists_a0 for select using (true);

drop policy if exists "artist edits own profile" on artists_a0;
create policy "artist edits own profile" on artists_a0
  for update using (auth0_sub = current_sub()) with check (auth0_sub = current_sub());

-- Artists may change only their profile fields (not their id, and not is_sample).
revoke insert, update, delete on artists_a0 from anon, authenticated;
grant update (name, headline, bio, city, specialties, available) on artists_a0 to authenticated;

-- ---------------------------------------------------------------------------
-- commissions_a0: a request for a statue, from one organization to one artist.
-- ---------------------------------------------------------------------------
create table if not exists commissions_a0 (
  id uuid primary key default gen_random_uuid(),
  org_sub text not null,
  org_name text not null,                    -- copied at creation so the artist can read it
  artist_sub text not null references artists_a0(auth0_sub) on delete cascade,
  title text not null check (char_length(btrim(title)) between 2 and 120),
  brief text not null check (char_length(btrim(brief)) between 10 and 2000),
  budget text check (char_length(budget) <= 80),
  deadline date,
  location text check (char_length(location) <= 120),
  status text not null default 'requested'
    check (status in ('requested', 'discussing', 'agreed', 'declined', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists commissions_a0_org_idx on commissions_a0 (org_sub, updated_at desc);
create index if not exists commissions_a0_artist_idx on commissions_a0 (artist_sub, updated_at desc);

alter table commissions_a0 enable row level security;
drop policy if exists "participants read commissions" on commissions_a0;
create policy "participants read commissions" on commissions_a0
  for select using (current_sub() in (org_sub, artist_sub));
revoke insert, update, delete on commissions_a0 from anon, authenticated;

-- ---------------------------------------------------------------------------
-- commission_messages_a0: the conversation. Clients may only INSERT (commission_id, body);
-- the sender is filled in from the token and can't be chosen.
-- ---------------------------------------------------------------------------
create table if not exists commission_messages_a0 (
  id bigint generated always as identity primary key,
  commission_id uuid not null references commissions_a0(id) on delete cascade,
  sender_sub text not null default current_sub(),
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists commission_messages_a0_thread_idx
  on commission_messages_a0 (commission_id, id);

alter table commission_messages_a0 enable row level security;

drop policy if exists "participants read messages" on commission_messages_a0;
create policy "participants read messages" on commission_messages_a0
  for select using (
    exists (
      select 1 from commissions_a0 c
       where c.id = commission_id and current_sub() in (c.org_sub, c.artist_sub)
    )
  );

-- You can post only in your own commission, and only once the artist has accepted it
-- (and not after it was declined or cancelled).
drop policy if exists "participants post messages" on commission_messages_a0;
create policy "participants post messages" on commission_messages_a0
  for insert with check (
    sender_sub = current_sub()
    and exists (
      select 1 from commissions_a0 c
       where c.id = commission_id
         and current_sub() in (c.org_sub, c.artist_sub)
         and c.status in ('discussing', 'agreed')
    )
  );

revoke insert, update, delete on commission_messages_a0 from anon, authenticated;
grant insert (commission_id, body) on commission_messages_a0 to authenticated;

-- A new message bumps the commission to the top of both inboxes.
create or replace function touch_commission() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update commissions_a0 set updated_at = now() where id = new.commission_id;
  return new;
end $$;

revoke execute on function touch_commission() from public, anon, authenticated;

drop trigger if exists commission_message_touch on commission_messages_a0;
create trigger commission_message_touch
  after insert on commission_messages_a0
  for each row execute function touch_commission();

-- ---------------------------------------------------------------------------
-- set_my_role(role, name): choose the role at first sign-in. A person who already has a
-- role keeps it (the call just returns it). Organizations and artists must give a name;
-- an artist also gets a directory row.
-- ---------------------------------------------------------------------------
create or replace function set_my_role(p_role text, p_name text default null) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_sub text := current_sub();
  v_name text := nullif(btrim(coalesce(p_name, '')), '');
  v_existing text;
begin
  if v_sub is null then
    raise exception 'not signed in';
  end if;

  select role into v_existing from user_roles_a0 where auth0_sub = v_sub;
  if v_existing is not null then
    return v_existing;
  end if;

  if p_role not in ('user', 'organization', 'artist') then
    raise exception 'invalid role';
  end if;
  if p_role <> 'user' and (v_name is null or char_length(v_name) < 2 or char_length(v_name) > 120) then
    raise exception 'a name of 2 to 120 characters is required';
  end if;

  insert into user_roles_a0 (auth0_sub, role, display_name)
  values (v_sub, p_role, case when p_role = 'user' then null else v_name end)
  on conflict (auth0_sub) do nothing;

  if p_role = 'artist' then
    insert into artists_a0 (auth0_sub, name) values (v_sub, v_name)
    on conflict (auth0_sub) do nothing;
  end if;

  return (select role from user_roles_a0 where auth0_sub = v_sub);
end $$;

revoke execute on function set_my_role(text, text) from public, anon;
grant execute on function set_my_role(text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- create_commission(...): an organization sends a request (the brief) to an artist.
-- Returns the new commission's id.
-- ---------------------------------------------------------------------------
create or replace function create_commission(
  p_artist text,
  p_title text,
  p_brief text,
  p_budget text default null,
  p_deadline date default null,
  p_location text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_sub text := current_sub();
  v_role text;
  v_org_name text;
  v_id uuid;
begin
  if v_sub is null then
    raise exception 'not signed in';
  end if;

  select role, display_name into v_role, v_org_name from user_roles_a0 where auth0_sub = v_sub;
  if v_role is distinct from 'organization' then
    raise exception 'only organizations can request a statue';
  end if;
  if not exists (select 1 from artists_a0 where auth0_sub = p_artist) then
    raise exception 'artist not found';
  end if;
  if not (select available from artists_a0 where auth0_sub = p_artist) then
    raise exception 'this artist is not taking requests right now';
  end if;
  if p_deadline is not null and p_deadline < current_date then
    raise exception 'the deadline is in the past';
  end if;
  -- Spam guard: an organization can have at most 10 requests waiting for an answer.
  if (select count(*) from commissions_a0 where org_sub = v_sub and status = 'requested') >= 10 then
    raise exception 'too many open requests: wait for artists to answer first';
  end if;

  insert into commissions_a0 (org_sub, org_name, artist_sub, title, brief, budget, deadline, location)
  values (
    v_sub,
    coalesce(v_org_name, 'Organization'),
    p_artist,
    btrim(p_title),
    btrim(p_brief),
    nullif(btrim(coalesce(p_budget, '')), ''),
    p_deadline,
    nullif(btrim(coalesce(p_location, '')), '')
  )
  returning id into v_id;

  return v_id;
end $$;

revoke execute on function create_commission(text, text, text, text, date, text) from public, anon;
grant execute on function create_commission(text, text, text, text, date, text) to authenticated;

-- ---------------------------------------------------------------------------
-- set_commission_status(id, status): move a commission along the allowed path (see top).
-- ---------------------------------------------------------------------------
create or replace function set_commission_status(p_id uuid, p_status text) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_sub text := current_sub();
  c commissions_a0;
  v_ok boolean;
begin
  if v_sub is null then
    raise exception 'not signed in';
  end if;

  select * into c from commissions_a0 where id = p_id for update;
  if not found or v_sub not in (c.org_sub, c.artist_sub) then
    raise exception 'commission not found';
  end if;

  v_ok := case
    when v_sub = c.artist_sub and c.status = 'requested'  and p_status in ('discussing', 'declined') then true
    when v_sub = c.artist_sub and c.status = 'discussing' and p_status = 'declined' then true
    when v_sub = c.org_sub    and c.status = 'requested'  and p_status = 'cancelled' then true
    when v_sub = c.org_sub    and c.status = 'discussing' and p_status in ('agreed', 'cancelled') then true
    else false
  end;
  if not v_ok then
    raise exception 'not allowed';
  end if;

  update commissions_a0 set status = p_status, updated_at = now() where id = p_id;
end $$;

revoke execute on function set_commission_status(uuid, text) from public, anon;
grant execute on function set_commission_status(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Sample artists so the directory isn't empty before real artists sign up. They are
-- flagged is_sample (the app labels them "Sample") and nobody answers for them.
-- Remove them any time:  delete from artists_a0 where is_sample;
-- ---------------------------------------------------------------------------
insert into artists_a0 (auth0_sub, name, headline, bio, city, specialties, available, is_sample) values
  ('seed|artist-bronze', 'Atelier Demo · Bronze', 'Bronze casting and public monuments',
   'A sample listing that shows how an artist profile looks. Real artists appear here when they sign up.',
   'Timișoara', array['bronze', 'public monuments'], true, true),
  ('seed|artist-stone', 'Atelier Demo · Stone', 'Stone carving and restoration',
   'A sample listing that shows how an artist profile looks. Real artists appear here when they sign up.',
   'Lugoj', array['stone', 'restoration'], true, true),
  ('seed|artist-metal', 'Atelier Demo · Metal', 'Forged and welded metal sculpture',
   'A sample listing that shows how an artist profile looks. Real artists appear here when they sign up.',
   'Arad', array['steel', 'kinetic pieces'], false, true)
on conflict (auth0_sub) do nothing;
