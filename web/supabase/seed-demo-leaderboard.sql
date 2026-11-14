-- DEMO SEED — fake accounts for the leaderboard (presentation + multi-user RLS test).
-- Run in the Supabase SQL editor. Idempotent (safe to re-run). See the DELETE block at
-- the bottom to remove all demo data afterwards.
--
-- These are NOT real Auth0 users — they only exist as profiles_a0 + point_transactions_a0
-- rows keyed on `auth0|demo-*` subjects, which is all the leaderboard_a0 view needs. They
-- cannot sign in; they just populate the public ranking.
--
-- Points are written as real ledger rows so they aggregate in leaderboard_a0 /
-- user_points_a0 exactly like a genuine user's points.

-- 1) Display names (so the board shows readable names, not raw subs).
insert into profiles_a0 (auth0_sub, display_name) values
  ('auth0|demo-ana',   'Ana M.'),
  ('auth0|demo-radu',  'Radu P.'),
  ('auth0|demo-ioana', 'Ioana T.'),
  ('auth0|demo-paul',  'Paul (no points)')
on conflict (auth0_sub) do update set display_name = excluded.display_name;

-- 2) Ledger rows → lifetime totals.
--    - Ana:   2000  (the big leader)
--    - Radu:   850  (upper-middle)
--    - Ioana:  120  (low, but on the board)
--    - Paul:     0  (no rows → intentionally ABSENT from leaderboard_a0; proves the
--                    "zero users don't rank" behavior)
--    reason strings are unique per (sub, reason) so the one_reward_each_a0 partial unique
--    index + ON CONFLICT DO NOTHING make this re-runnable without stacking points.
insert into point_transactions_a0 (auth0_sub, amount, reason) values
  ('auth0|demo-ana',   2000, 'demo:seed'),
  ('auth0|demo-radu',   850, 'demo:seed'),
  ('auth0|demo-ioana',  120, 'demo:seed')
on conflict (auth0_sub, reason) where amount > 0 do nothing;

-- 3) Verify: the board should show Ana (2000) > Radu (850) > Ioana (120); Paul absent.
select auth0_sub, display_name, lifetime
from leaderboard_a0
order by lifetime desc;

-- ---------------------------------------------------------------------------
-- CLEANUP (run this block to remove all demo data when you're done):
--
--   delete from point_transactions_a0 where auth0_sub like 'auth0|demo-%';
--   delete from profiles_a0           where auth0_sub like 'auth0|demo-%';
-- ---------------------------------------------------------------------------
