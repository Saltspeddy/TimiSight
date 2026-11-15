-- Link statues (rows of `flowers`) to the artist who made them.
-- Run once in the Supabase SQL editor, after roles-commissions.sql. Safe to re-run.
--
-- Purely additive: one nullable column. Existing rows, policies and grants are untouched,
-- so every flower stays exactly as it is until you link it. Reads already work: the
-- "anyone reads active flowers" policy covers the new column, and the app reads flowers
-- with select('*'). Artists cannot write flowers; you link them from here.

alter table flowers
  add column if not exists artist_sub text references artists_a0 (auth0_sub) on delete set null;

create index if not exists flowers_artist_sub_idx on flowers (artist_sub);

-- The organization a statue was made for (shown on that organization's "My flowers" tab).
alter table flowers
  add column if not exists org_sub text references user_roles_a0 (auth0_sub) on delete set null;

create index if not exists flowers_org_sub_idx on flowers (org_sub);

-- ---------------------------------------------------------------------------
-- How to link a statue to an artist
-- ---------------------------------------------------------------------------
-- 1. Find the artist's id (auth0_sub):
--      select auth0_sub, name from artists_a0 order by created_at desc;
-- 2. Link one or more flowers to them:
--      update flowers set artist_sub = '<auth0_sub>' where id in ('violinist-rose', 'hop-flower');
-- 3. Unlink:
--      update flowers set artist_sub = null where id = 'violinist-rose';
--
-- Same for the organization a statue was made for:
--      select auth0_sub, display_name from user_roles_a0 where role = 'organization';
--    Then put the real id from that list in place of REAL_ID_HERE (a literal placeholder is
--    rejected by the foreign key):
--      update flowers set org_sub = 'REAL_ID_HERE' where id = 'miklosi-tulip';
--    Or, with one organization account, no copy-paste:
--      update flowers set org_sub = (select auth0_sub from user_roles_a0
--        where role = 'organization' order by created_at desc limit 1) where id = 'miklosi-tulip';
