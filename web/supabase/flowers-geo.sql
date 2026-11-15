-- TimiSight — flower coordinates (location-based quests)
-- Run in the Supabase SQL editor (Dashboard → SQL Editor → New query → paste → Run).
-- Idempotent: safe to re-run.
--
-- Adds real-world coordinates to the `flowers` table so the mobile app can drive
-- the location-based quests feature:
--   * flower paths show hot/cold proximity hints toward the next uncollected stop
--     (expo-location),
--   * the daily quest shows a general map pin at the flower's location (expo-maps).
--
-- PREREQUISITE: flowers.sql has already been applied (this references flowers(id)).
--
-- Coordinates are nullable: a flower without coordinates simply gets no hot/cold
-- hint and no map pin — the rest of the app is unaffected.

alter table flowers add column if not exists lat double precision;
alter table flowers add column if not exists lng double precision;

-- ---------------------------------------------------------------------------
-- ⚠️ PLACEHOLDER COORDINATES — REPLACE WITH THE REAL LANDMARK POSITIONS.
--
-- These are rough points clustered around central Timișoara (~45.755 N, 21.228 E),
-- deliberately offset from each other by ~40–120 m so the hot/cold mini-game is
-- exercisable during development. For the real demo, set the actual positions:
--   * casa-muhle        → Casa Mühle (path start)
--   * opera-rose        → Opera House (Victory Square)
--   * miklosi-tulip     → Carol Miklósi Tram Museum (final, INDOOR stop)
--   * timisoreana-malt  → Timișoreana brewery (daily-quest flower)
-- The three path flowers are meant to sit around the EXTERIOR of one building so
-- outdoor GPS can separate them; the final stop is indoors (hot/cold degrades to a
-- "head inside and scan" hint near the building).
-- ---------------------------------------------------------------------------
update flowers set lat = 45.7628094, lng = 21.2458510 where id = 'casa-muhle';
update flowers set lat = 45.7629313, lng = 21.2467576 where id = 'opera-rose';
update flowers set lat = 45.7633394, lng = 21.2459084 where id = 'miklosi-tulip';
update flowers set lat = 45.7630403, lng = 21.2463197 where id = 'timisoreana-malt';
