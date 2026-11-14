-- TimiSight — flowers catalogue
-- Run in the Supabase SQL editor (Dashboard → SQL Editor → New query → paste → Run).
-- Idempotent: safe to re-run.
--
-- Holds the editorial content for each collectible flower, in both languages.
-- Images stay bundled in the mobile app (keyed by `id`) because React Native
-- require() needs static asset paths; everything textual lives here.

create table if not exists flowers (
  -- Stable slug used as the flower's id across the app + NFC/QR links
  -- (e.g. 'violinist-rose'). Matches FLOWERS[].id in the mobile app.
  id text primary key,

  -- Display name of the flower
  name_en text not null,
  name_ro text not null,

  -- Latin (scientific) name of the flower. Language-neutral, but kept as one
  -- column; fill it with the botanical name.
  latin_name text,

  -- Description of the place where the flower / monument stands
  place_en text,
  place_ro text,

  -- Description of the character / story behind the flower
  character_en text,
  character_ro text,

  -- Presentation + gameplay fields the app relies on
  color text not null default '#9fd56b',   -- hex accent color for the card/mat
  points int not null default 50 check (points >= 0),

  sort_order int not null default 0,        -- controls display order
  active boolean not null default true,

  created_at timestamptz default now()
);

alter table flowers enable row level security;

-- Flowers are public catalogue content: anyone (even signed-out) can read the
-- active ones. No write policy — content is managed from the dashboard.
drop policy if exists "anyone reads active flowers" on flowers;
create policy "anyone reads active flowers" on flowers
  for select using (active);

-- ---------------------------------------------------------------------------
-- Seed the flowers (upsert, so re-running just refreshes content).
-- ---------------------------------------------------------------------------
insert into flowers (id, name_en, name_ro, latin_name, place_en, place_ro, character_en, character_ro, color, points, sort_order)
values
  (
    'violinist-rose',
    'Violinist Rose', 'Trandafirul violonist',
    'Rosa',
    'Victory Square, near the Opera — a small monument in the heart of the city.',
    'Piața Victoriei, lângă Operă — un mic monument în inima orașului.',
    'A rose that plays the violin, a tribute to music and to the city''s artists.',
    'Un trandafir care cântă la vioară, un omagiu muzicii și artiștilor orașului.',
    '#ff6a2b', 50, 1
  ),
  (
    'hop-flower',
    'Hop Flower', 'Floarea de hamei',
    'Humulus lupulus',
    'Near the old brewery quarter — a nod to the city''s brewing history.',
    'Lângă vechiul cartier al fabricii de bere — un semn către istoria berii în oraș.',
    'A hop flower that remembers the breweries and the daily life they supported.',
    'O floare de hamei care își amintește fabricile de bere și viața pe care o susțineau.',
    '#9fd56b', 50, 2
  ),
  (
    'tram-flower',
    'Tram Flower', 'Floarea din tramvai',
    null,
    'Placed near the Miclosi museum, where the city''s history is kept indoors and the tram flowers keep it moving outside.',
    'Amplasată lângă muzeul Miclosi, unde istoria orașului stă la adăpost înăuntru, iar florile din tramvai o țin în mișcare afară.',
    'One flower pushes another along on a tram, a small story about helping a friend along the way.',
    'O floare împinge o altă floare într-un tramvai, o mică poveste despre ajutorul dat unui prieten pe drum.',
    '#6cb4e4', 50, 3
  )
on conflict (id) do update set
  name_en = excluded.name_en,
  name_ro = excluded.name_ro,
  latin_name = excluded.latin_name,
  place_en = excluded.place_en,
  place_ro = excluded.place_ro,
  character_en = excluded.character_en,
  character_ro = excluded.character_ro,
  color = excluded.color,
  points = excluded.points,
  sort_order = excluded.sort_order;
