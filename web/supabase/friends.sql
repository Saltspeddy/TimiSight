-- TimiSight: friends list + quest invitations with a shared bonus.
-- Run in the Supabase SQL editor, after auth0-migration.sql, roles-commissions.sql and
-- quests.sql. Safe to re-run (re-run it to pick up changes). Only adds new tables and
-- functions; nothing that already existed changes.
--
-- How it works
--   * Visitors only. Every function checks user_roles_a0.role = 'user' on the server.
--   * Each visitor has a short friend code. Typing someone's code sends them a request;
--     when they accept, you are friends.
--   * Quest invitations: a visitor invites a friend to a flower path they have both NOT yet
--     finished. The friend accepts or declines. When BOTH have completed the path, each
--     earns FRIEND_BONUS points. If only one finishes, nobody gets anything. They do the
--     path on their own, at their own pace.
--   * At most 3 invitations per person per path count (accepted ones, plus ones you sent
--     that are still waiting).
--   * Points go through award_points_a0, the same ledger as everything else, so the shop
--     and leaderboard need no changes. The ledger reason 'friend_bonus:<path>:<friend>' is
--     unique per user, so a bonus can never be paid twice.
--   * Identity is always current_sub() from the Auth0 token, never a value from the client.
--
-- Tuning: change FRIEND_BONUS in claim_friend_bonuses() below (25 points), and the 3 in
-- invite_friend_to_path() / accept_quest_invite() for the per-path limit.

-- ---------------------------------------------------------------------------
-- Tables. Nobody reads or writes them directly; the functions below are the only way in
-- (friendships can be read by the two people in them).
-- ---------------------------------------------------------------------------
create table if not exists friend_codes_a0 (
  auth0_sub  text primary key,
  code       text not null unique,
  created_at timestamptz not null default now()
);
alter table friend_codes_a0 enable row level security;
revoke all on friend_codes_a0 from anon, authenticated;

create table if not exists friendships_a0 (
  id            uuid primary key default gen_random_uuid(),
  requester_sub text not null,
  addressee_sub text not null,
  status        text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at    timestamptz not null default now(),
  accepted_at   timestamptz,
  check (requester_sub <> addressee_sub)
);

-- One row per pair of people, whichever of them asked first.
create unique index if not exists friendships_pair_a0
  on friendships_a0 (least(requester_sub, addressee_sub), greatest(requester_sub, addressee_sub));
create index if not exists friendships_addressee_a0 on friendships_a0 (addressee_sub);

alter table friendships_a0 enable row level security;
drop policy if exists "read own friendships" on friendships_a0;
create policy "read own friendships" on friendships_a0
  for select using (current_sub() in (requester_sub, addressee_sub));
revoke insert, update, delete on friendships_a0 from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Internal helper: is this person a visitor account? (A person with no role row yet has not
-- finished sign-up and counts as "no".) Not callable from the app.
-- ---------------------------------------------------------------------------
create or replace function is_visitor_a0(p_sub text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from user_roles_a0 where auth0_sub = p_sub and role = 'user')
$$;
revoke execute on function is_visitor_a0(text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- my_friend_code(): this visitor's code, created on first use. 8 characters from an alphabet
-- without look-alikes (no 0/O, 1/I/L), e.g. 'K7MQ2XPA'.
-- ---------------------------------------------------------------------------
create or replace function my_friend_code() returns text
language plpgsql security definer set search_path = public as $$
declare
  v_sub text := current_sub();
  v_alpha constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v_code text;
  i int;
  tries int := 0;
begin
  if v_sub is null then
    raise exception 'not signed in';
  end if;
  if not is_visitor_a0(v_sub) then
    raise exception 'friends are for visitor accounts';
  end if;

  select code into v_code from friend_codes_a0 where auth0_sub = v_sub;
  if found then
    return v_code;
  end if;

  loop
    v_code := '';
    for i in 1..8 loop
      v_code := v_code || substr(v_alpha, 1 + floor(random() * length(v_alpha))::int, 1);
    end loop;
    begin
      insert into friend_codes_a0 (auth0_sub, code) values (v_sub, v_code);
      return v_code;
    exception when unique_violation then
      -- Either the random code collided, or a parallel call just created this person's code.
      select code into v_code from friend_codes_a0 where auth0_sub = v_sub;
      if found then
        return v_code;
      end if;
      tries := tries + 1;
      if tries > 10 then
        raise exception 'could not create a friend code, try again';
      end if;
    end;
  end loop;
end $$;

revoke execute on function my_friend_code() from public, anon;
grant execute on function my_friend_code() to authenticated;

-- ---------------------------------------------------------------------------
-- send_friend_request(code): ask the owner of a code to be friends.
-- Returns 'sent', or 'accepted' when that person had already asked you.
-- A code that belongs to nobody, or to a non-visitor, gives the same "no one" answer.
-- ---------------------------------------------------------------------------
create or replace function send_friend_request(p_code text) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_sub text := current_sub();
  v_to text;
  v_clean text := regexp_replace(upper(coalesce(p_code, '')), '[^A-Z0-9]', '', 'g');
  f friendships_a0;
begin
  if v_sub is null then
    raise exception 'not signed in';
  end if;
  if not is_visitor_a0(v_sub) then
    raise exception 'friends are for visitor accounts';
  end if;
  if length(v_clean) <> 8 then
    raise exception 'no one has that code';
  end if;

  select auth0_sub into v_to from friend_codes_a0 where code = v_clean;
  if not found or not is_visitor_a0(v_to) then
    raise exception 'no one has that code';
  end if;
  if v_to = v_sub then
    raise exception 'that is your own code';
  end if;

  select * into f from friendships_a0
  where least(requester_sub, addressee_sub) = least(v_sub, v_to)
    and greatest(requester_sub, addressee_sub) = greatest(v_sub, v_to);
  if found then
    if f.status = 'accepted' then
      raise exception 'already friends';
    elsif f.requester_sub = v_sub then
      raise exception 'request already sent';
    else
      -- They had already asked you: asking back is the same as accepting.
      update friendships_a0 set status = 'accepted', accepted_at = now() where id = f.id;
      return 'accepted';
    end if;
  end if;

  -- Spam guard: at most 20 requests waiting for an answer.
  if (select count(*) from friendships_a0 where requester_sub = v_sub and status = 'pending') >= 20 then
    raise exception 'too many open requests: wait for answers first';
  end if;

  insert into friendships_a0 (requester_sub, addressee_sub) values (v_sub, v_to);
  return 'sent';
end $$;

revoke execute on function send_friend_request(text) from public, anon;
grant execute on function send_friend_request(text) to authenticated;

-- ---------------------------------------------------------------------------
-- accept_friend_request(id): only the person who was asked can accept.
-- ---------------------------------------------------------------------------
create or replace function accept_friend_request(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_sub text := current_sub();
begin
  if v_sub is null then
    raise exception 'not signed in';
  end if;
  if not is_visitor_a0(v_sub) then
    raise exception 'friends are for visitor accounts';
  end if;
  update friendships_a0 set status = 'accepted', accepted_at = now()
  where id = p_id and addressee_sub = v_sub and status = 'pending';
  if not found then
    raise exception 'request not found';
  end if;
end $$;

revoke execute on function accept_friend_request(uuid) from public, anon;
grant execute on function accept_friend_request(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- remove_friendship(id): decline a request, cancel one you sent, or unfriend.
-- Either person in the pair can do it.
-- ---------------------------------------------------------------------------
create or replace function remove_friendship(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_sub text := current_sub();
  f friendships_a0;
begin
  if v_sub is null then
    raise exception 'not signed in';
  end if;
  delete from friendships_a0
  where id = p_id and v_sub in (requester_sub, addressee_sub)
  returning * into f;
  if not found then
    raise exception 'friendship not found';
  end if;
  -- Quests shared with this person stop counting once you are no longer friends.
  delete from quest_invites_a0
  where least(inviter_sub, invitee_sub) = least(f.requester_sub, f.addressee_sub)
    and greatest(inviter_sub, invitee_sub) = greatest(f.requester_sub, f.addressee_sub);
end $$;

revoke execute on function remove_friendship(uuid) from public, anon;
grant execute on function remove_friendship(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- list_friends(): your friends and the requests waiting on you or on them, as JSON:
--   [{ id, status, outgoing, name, done_paths: [path ids] }]
-- Only accepted friends reveal which paths they have finished.
-- ---------------------------------------------------------------------------
create or replace function list_friends() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_sub text := current_sub();
begin
  if v_sub is null then
    raise exception 'not signed in';
  end if;
  return coalesce((
    select jsonb_agg(x.j order by x.sort_key)
    from (
      select
        jsonb_build_object(
          'id', f.id,
          'status', f.status,
          'outgoing', (f.requester_sub = v_sub),
          -- Accounts without a name use their email as the display name. Never show an email
          -- to another person: keep only the part before the '@'.
          'name', coalesce(nullif(btrim(
              case when position('@' in coalesce(pr.display_name, '')) > 1
                   then split_part(pr.display_name, '@', 1)
                   else pr.display_name end
            ), ''), 'Explorer'),
          'done_paths', case when f.status = 'accepted' then coalesce((
              select jsonb_agg(u.path_id order by u.path_id)
              from user_flower_paths u
              where u.auth0_sub = o.other and u.completed_at is not null
            ), '[]'::jsonb) else '[]'::jsonb end
        ) as j,
        -- Requests waiting on you first, then friends by name.
        (case when f.status = 'pending' and f.addressee_sub = v_sub then 0
              when f.status = 'pending' then 2 else 1 end)::text
          || lower(coalesce(pr.display_name, '')) as sort_key
      from friendships_a0 f
      cross join lateral (
        select case when f.requester_sub = v_sub then f.addressee_sub else f.requester_sub end as other
      ) o
      left join profiles_a0 pr on pr.auth0_sub = o.other
      where v_sub in (f.requester_sub, f.addressee_sub)
    ) x
  ), '[]'::jsonb);
end $$;

revoke execute on function list_friends() from public, anon;
grant execute on function list_friends() to authenticated;

-- ---------------------------------------------------------------------------
-- Quest invitations: "do this path together". One row per pair of friends per path.
-- ---------------------------------------------------------------------------
create table if not exists quest_invites_a0 (
  id          uuid primary key default gen_random_uuid(),
  path_id     text not null references flower_paths (id),
  inviter_sub text not null,
  invitee_sub text not null,
  status      text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at  timestamptz not null default now(),
  accepted_at timestamptz,
  check (inviter_sub <> invitee_sub)
);

-- One invitation per pair of people per path, whoever asked.
create unique index if not exists quest_invites_pair_a0
  on quest_invites_a0 (path_id, least(inviter_sub, invitee_sub), greatest(inviter_sub, invitee_sub));
create index if not exists quest_invites_invitee_a0 on quest_invites_a0 (invitee_sub);

alter table quest_invites_a0 enable row level security;
drop policy if exists "read own quest invites" on quest_invites_a0;
create policy "read own quest invites" on quest_invites_a0
  for select using (current_sub() in (inviter_sub, invitee_sub));
revoke insert, update, delete on quest_invites_a0 from anon, authenticated;

-- Internal helpers (not callable from the app).
create or replace function path_done_a0(p_sub text, p_path text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from user_flower_paths
    where auth0_sub = p_sub and path_id = p_path and completed_at is not null
  )
$$;
revoke execute on function path_done_a0(text, text) from public, anon, authenticated;

-- How many invitations of this path a person is tied up in: accepted ones, plus ones they
-- sent that are still waiting. This is what the 3-per-path limit counts.
create or replace function quest_commitments_a0(p_sub text, p_path text) returns int
language sql stable security definer set search_path = public as $$
  select count(*)::int from quest_invites_a0
  where path_id = p_path
    and ((status = 'accepted' and p_sub in (inviter_sub, invitee_sub))
      or (status = 'pending' and inviter_sub = p_sub))
$$;
revoke execute on function quest_commitments_a0(text, text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- invite_friend_to_path(path, friendship): ask one of your friends to do a path with you.
-- Neither of you may have finished it yet.
-- ---------------------------------------------------------------------------
create or replace function invite_friend_to_path(p_path text, p_friendship uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_sub text := current_sub();
  f friendships_a0;
  v_other text;
begin
  if v_sub is null then
    raise exception 'not signed in';
  end if;
  if not is_visitor_a0(v_sub) then
    raise exception 'friends are for visitor accounts';
  end if;

  select * into f from friendships_a0
  where id = p_friendship and status = 'accepted' and v_sub in (requester_sub, addressee_sub);
  if not found then
    raise exception 'friend not found';
  end if;
  v_other := case when f.requester_sub = v_sub then f.addressee_sub else f.requester_sub end;
  if not is_visitor_a0(v_other) then
    raise exception 'friend not found';
  end if;

  if not exists (select 1 from flower_paths where id = p_path and active) then
    raise exception 'unknown path';
  end if;
  if path_done_a0(v_sub, p_path) or path_done_a0(v_other, p_path) then
    raise exception 'already finished: invite someone to a path neither of you has finished';
  end if;
  if exists (
    select 1 from quest_invites_a0
    where path_id = p_path
      and least(inviter_sub, invitee_sub) = least(v_sub, v_other)
      and greatest(inviter_sub, invitee_sub) = greatest(v_sub, v_other)
  ) then
    raise exception 'already invited';
  end if;
  if quest_commitments_a0(v_sub, p_path) >= 3 then
    raise exception 'too many invitations for this path';
  end if;
  -- Spam guard: at most 20 invitations waiting for an answer.
  if (select count(*) from quest_invites_a0 where inviter_sub = v_sub and status = 'pending') >= 20 then
    raise exception 'too many open invitations: wait for answers first';
  end if;

  insert into quest_invites_a0 (path_id, inviter_sub, invitee_sub) values (p_path, v_sub, v_other);
end $$;

revoke execute on function invite_friend_to_path(text, uuid) from public, anon;
grant execute on function invite_friend_to_path(text, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- accept_quest_invite(id): only the invited person, and only if they have not finished the
-- path yet and are still friends with the inviter.
-- ---------------------------------------------------------------------------
create or replace function accept_quest_invite(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_sub text := current_sub();
  q quest_invites_a0;
begin
  if v_sub is null then
    raise exception 'not signed in';
  end if;
  if not is_visitor_a0(v_sub) then
    raise exception 'friends are for visitor accounts';
  end if;

  select * into q from quest_invites_a0
  where id = p_id and invitee_sub = v_sub and status = 'pending'
  for update;
  if not found then
    raise exception 'invitation not found';
  end if;
  if not exists (
    select 1 from friendships_a0
    where status = 'accepted'
      and least(requester_sub, addressee_sub) = least(q.inviter_sub, v_sub)
      and greatest(requester_sub, addressee_sub) = greatest(q.inviter_sub, v_sub)
  ) then
    raise exception 'invitation not found';
  end if;
  if path_done_a0(v_sub, q.path_id) then
    raise exception 'already finished: you have completed this path already';
  end if;
  if quest_commitments_a0(v_sub, q.path_id) >= 3 then
    raise exception 'too many invitations for this path';
  end if;

  update quest_invites_a0 set status = 'accepted', accepted_at = now() where id = q.id;
end $$;

revoke execute on function accept_quest_invite(uuid) from public, anon;
grant execute on function accept_quest_invite(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- cancel_quest_invite(id): decline an invitation, withdraw one you sent, or drop out of a
-- shared quest. Either person can. Not possible once both have finished (the bonus is due).
-- ---------------------------------------------------------------------------
create or replace function cancel_quest_invite(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_sub text := current_sub();
  q quest_invites_a0;
begin
  if v_sub is null then
    raise exception 'not signed in';
  end if;
  select * into q from quest_invites_a0
  where id = p_id and v_sub in (inviter_sub, invitee_sub)
  for update;
  if not found then
    raise exception 'invitation not found';
  end if;
  if q.status = 'accepted' and path_done_a0(q.inviter_sub, q.path_id) and path_done_a0(q.invitee_sub, q.path_id) then
    raise exception 'already finished: both of you completed this quest';
  end if;
  delete from quest_invites_a0 where id = q.id;
end $$;

revoke execute on function cancel_quest_invite(uuid) from public, anon;
grant execute on function cancel_quest_invite(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- list_quest_invites(): your invitations as JSON, newest first:
--   [{ id, path_id, status, outgoing, friend_name, me_done, friend_done, paid }]
-- friend_done is only revealed for accepted invitations. Invitations with someone you are no
-- longer friends with are not listed.
-- ---------------------------------------------------------------------------
create or replace function list_quest_invites() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_sub text := current_sub();
begin
  if v_sub is null then
    raise exception 'not signed in';
  end if;
  return coalesce((
    select jsonb_agg(x.j order by x.created_at desc)
    from (
      select
        q.created_at,
        jsonb_build_object(
          'id', q.id,
          'path_id', q.path_id,
          'status', q.status,
          'outgoing', (q.inviter_sub = v_sub),
          -- Never show an email: keep only the part before the '@' (see list_friends).
          'friend_name', coalesce(nullif(btrim(
              case when position('@' in coalesce(pr.display_name, '')) > 1
                   then split_part(pr.display_name, '@', 1)
                   else pr.display_name end
            ), ''), 'Explorer'),
          'me_done', path_done_a0(v_sub, q.path_id),
          'friend_done', (q.status = 'accepted' and path_done_a0(o.other, q.path_id)),
          'paid', exists (
            select 1 from point_transactions_a0 t
            where t.auth0_sub = v_sub and t.amount > 0
              and t.reason = 'friend_bonus:' || q.path_id || ':' || o.other)
        ) as j
      from quest_invites_a0 q
      cross join lateral (
        select case when q.inviter_sub = v_sub then q.invitee_sub else q.inviter_sub end as other
      ) o
      left join profiles_a0 pr on pr.auth0_sub = o.other
      where v_sub in (q.inviter_sub, q.invitee_sub)
        and exists (
          select 1 from friendships_a0 f
          where f.status = 'accepted'
            and least(f.requester_sub, f.addressee_sub) = least(v_sub, o.other)
            and greatest(f.requester_sub, f.addressee_sub) = greatest(v_sub, o.other))
    ) x
  ), '[]'::jsonb);
end $$;

revoke execute on function list_quest_invites() from public, anon;
grant execute on function list_quest_invites() to authenticated;

-- ---------------------------------------------------------------------------
-- claim_friend_bonuses(): pay whatever shared-quest bonuses the caller has earned and not yet
-- received: accepted invitations where BOTH people have completed the path and are still
-- friends. Safe to call as often as you like: each bonus is paid once.
-- Returns { awarded: points just paid, count: number of new bonuses }.
-- ---------------------------------------------------------------------------
create or replace function claim_friend_bonuses() returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_sub text := current_sub();
  FRIEND_BONUS constant int := 25;   -- points per shared quest
  q record;
  v_reason text;
  v_awarded int := 0;
  v_count int := 0;
begin
  if v_sub is null then
    raise exception 'not signed in';
  end if;
  if not is_visitor_a0(v_sub) then
    raise exception 'friends are for visitor accounts';
  end if;

  -- Two parallel calls from the same person run one after the other.
  perform pg_advisory_xact_lock(hashtext('friend_bonus:' || v_sub));

  for q in
    select i.path_id,
           case when i.inviter_sub = v_sub then i.invitee_sub else i.inviter_sub end as other
    from quest_invites_a0 i
    where i.status = 'accepted' and v_sub in (i.inviter_sub, i.invitee_sub)
    order by i.accepted_at, i.id
  loop
    -- Still friends, the friend is a visitor, and both of you have finished the path.
    continue when not exists (
      select 1 from friendships_a0 f
      where f.status = 'accepted'
        and least(f.requester_sub, f.addressee_sub) = least(v_sub, q.other)
        and greatest(f.requester_sub, f.addressee_sub) = greatest(v_sub, q.other));
    continue when not is_visitor_a0(q.other);
    continue when not path_done_a0(v_sub, q.path_id) or not path_done_a0(q.other, q.path_id);

    v_reason := 'friend_bonus:' || q.path_id || ':' || q.other;
    continue when exists (
      select 1 from point_transactions_a0
      where auth0_sub = v_sub and amount > 0 and reason = v_reason);

    perform award_points_a0(v_sub, FRIEND_BONUS, v_reason);
    v_awarded := v_awarded + FRIEND_BONUS;
    v_count := v_count + 1;
  end loop;

  return jsonb_build_object('awarded', v_awarded, 'count', v_count);
end $$;

revoke execute on function claim_friend_bonuses() from public, anon;
grant execute on function claim_friend_bonuses() to authenticated;
