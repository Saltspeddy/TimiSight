-- FIX — make leaderboard_a0 a true PUBLIC ranking (show every user, not just the caller).
-- Run in the Supabase SQL editor. Idempotent.
--
-- WHY: leaderboard_a0 was created with security_invoker = true, so it runs under the
-- caller's RLS. point_transactions_a0 has a "read own points" policy
-- (auth0_sub = current_sub()), so a signed-in user's leaderboard query was filtered to
-- only THEIR own ledger rows — the board showed just the current user. A leaderboard is
-- public by definition, so the aggregated view should see all users.
--
-- HOW: recreate the view as SECURITY DEFINER (invoker-RLS off). The view exposes ONLY
-- aggregated, non-sensitive data — each user's display name and their LIFETIME points
-- total — never individual ledger rows or balances. That is exactly what a public
-- ranking is meant to show, so no private data leaks. The per-user ledger itself stays
-- locked down (read-own-only) for every other query path.

create or replace view leaderboard_a0 with (security_invoker = false) as
select p.auth0_sub,
       coalesce(pr.display_name, 'Explorer') as display_name,
       coalesce(sum(p.amount) filter (where p.amount > 0), 0) as lifetime
from point_transactions_a0 p
left join profiles_a0 pr on pr.auth0_sub = p.auth0_sub
group by p.auth0_sub, pr.display_name;

grant select on leaderboard_a0 to authenticated, anon;

-- Verify: with the demo seed loaded, this should return every demo user (Ana/Radu/Ioana)
-- plus any real users, regardless of who is signed in.
select auth0_sub, display_name, lifetime from leaderboard_a0 order by lifetime desc;
