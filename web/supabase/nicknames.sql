-- TimiSight: nicknames for visitors.
-- Run once in the Supabase SQL editor, after auth0-migration.sql and roles-commissions.sql.
-- Safe to re-run. Adds one function and one trigger; no existing function or table changes.
--
-- Why: accounts have no name, only an email, and check-in saves that email as the display
-- name shown on the leaderboard and in the friends list. A visitor now picks a nickname after
-- sign-up (organizations and artists already pick a name), and that nickname is what other
-- people see.
--
-- How it fits together
--   * set_my_nickname(name) saves the nickname in user_roles_a0.display_name (the person's
--     own row) and in profiles_a0.display_name (what the leaderboard and friends read).
--   * checkin_flower rewrites profiles_a0.display_name from the Auth0 token on every scan,
--     which would put the email back. The trigger below stops that: when a visitor has a
--     nickname, it always wins.
--   * Rules: 2 to 24 characters, no '@' (so an email can't be used), no control characters.

create or replace function set_my_nickname(p_name text) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_sub text := current_sub();
  v_name text := btrim(coalesce(p_name, ''));
begin
  if v_sub is null then
    raise exception 'not signed in';
  end if;
  if not exists (select 1 from user_roles_a0 where auth0_sub = v_sub and role = 'user') then
    raise exception 'nicknames are for visitor accounts';
  end if;
  if char_length(v_name) < 2 or char_length(v_name) > 24
     or position('@' in v_name) > 0
     or v_name ~ '[[:cntrl:]]' then
    raise exception 'a nickname of 2 to 24 characters, without @, is required';
  end if;

  update user_roles_a0 set display_name = v_name where auth0_sub = v_sub;

  -- The trigger below would do this too; being explicit keeps the row right even if the
  -- trigger is ever dropped.
  insert into profiles_a0 (auth0_sub, display_name) values (v_sub, v_name)
  on conflict (auth0_sub) do update set display_name = excluded.display_name;

  return v_name;
end $$;

revoke execute on function set_my_nickname(text) from public, anon;
grant execute on function set_my_nickname(text) to authenticated;

-- ---------------------------------------------------------------------------
-- A visitor's nickname always wins over whatever name the app tries to store.
-- ---------------------------------------------------------------------------
create or replace function keep_nickname_a0() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_nick text;
begin
  select display_name into v_nick
  from user_roles_a0
  where auth0_sub = new.auth0_sub and role = 'user' and display_name is not null;
  if v_nick is not null then
    new.display_name := v_nick;
  end if;
  return new;
end $$;

revoke execute on function keep_nickname_a0() from public, anon, authenticated;

drop trigger if exists keep_nickname_a0 on profiles_a0;
create trigger keep_nickname_a0
  before insert or update of display_name on profiles_a0
  for each row execute function keep_nickname_a0();
