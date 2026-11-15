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
  -- -------------------------------------------------------------------------
  -- Quest flowers (flower paths + daily quests). Added in Phase 0.
  -- -------------------------------------------------------------------------
  (
    'casa-muhle',
    'Mühle Moss Rose', 'Trandafirul de mușchi Mühle',
    'Madame Louis Lévêque',
    'Casa Mühle — the historic Mühle house and flower shop, the starting point of the city''s flower routes.',
    'Casa Mühle — casa și florăria istorică Mühle, punctul de pornire al traseelor florale ale orașului.',
    'A garden rose from the house that taught Timișoara to grow roses — where every flower path begins.',
    'Un trandafir de grădină din casa care a învățat Timișoara să cultive trandafiri — de unde începe fiecare traseu floral.',
    '#e86a8e', 50, 3
  ),
  (
    'opera-rose',
    'Opera Rose', 'Trandafirul Operei',
    'Rosa',
    'The Opera House — Romanian National Opera Timișoara, in Victory Square.',
    'Opera — Opera Națională Română Timișoara, în Piața Victoriei.',
    'A rose for the Opera House, carrying the music of the stage into the city''s gardens.',
    'Un trandafir pentru Operă, care poartă muzica scenei în grădinile orașului.',
    '#c0392b', 50, 4
  ),
  (
    'miklosi-tulip',
    'Miklósi Tulip', 'Laleaua Miklósi',
    'Tulipa',
    'Carol Miklósi Tram Museum — the city''s tram museum, honouring its public transport pioneer.',
    'Muzeul Tramvaielor Carol Miklósi — muzeul tramvaielor orașului, în cinstea pionierului transportului public.',
    'A tulip for Carol Miklósi, who set the city''s first trams rolling through the streets.',
    'O lalea pentru Carol Miklósi, cel care a pus primele tramvaie ale orașului în mișcare pe străzi.',
    '#f1c40f', 50, 5
  ),
  (
    'timisoreana-malt',
    'Timișoreana Malt', 'Malțul Timișoreana',
    'Hordeum vulgare',
    'The Timișoreana brewery — the oldest brewery in Romania, rooted in Timișoara since 1718.',
    'Fabrica Timișoreana — cea mai veche fabrică de bere din România, în Timișoara din 1718.',
    'A barley malt flower from the Timișoreana brewery, where the city''s oldest brewing tradition still ferments.',
    'O floare de malț de orz de la fabrica Timișoreana, unde cea mai veche tradiție a berii din oraș încă fermentează.',
    '#d4a017', 50, 6
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
