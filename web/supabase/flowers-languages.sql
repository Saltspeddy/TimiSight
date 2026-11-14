-- TimiSight — flower text in German, Hungarian and Serbian
-- Run in the Supabase SQL editor AFTER flowers.sql. Idempotent: safe to re-run.
--
-- Additive only: it adds new columns to `flowers` and fills them in for the two seeded
-- flowers. It does not change, rename or remove any existing column or row content.
--
-- The app does not need this to run. For any language whose column is empty it shows the
-- English text instead, so you can add translations flower by flower.
--
-- Serbian is written in Cyrillic (the script the Serbian community in Romania uses
-- officially). Place names keep the official Romanian name in brackets where useful.
-- These translations are a first draft: please have a native speaker of each language
-- read them before they go in front of the community.
--
-- To add a flower in these languages later, fill name_/place_/character_ de, hu and sr
-- in the Table Editor, or copy the update statements below.

alter table flowers
  add column if not exists name_de text,
  add column if not exists name_hu text,
  add column if not exists name_sr text,
  add column if not exists place_de text,
  add column if not exists place_hu text,
  add column if not exists place_sr text,
  add column if not exists character_de text,
  add column if not exists character_hu text,
  add column if not exists character_sr text;

update flowers set
  name_de = 'Violinistenrose',
  name_hu = 'Hegedűs rózsa',
  name_sr = 'Ружа виолиниста',
  place_de = 'Piața Victoriei (Siegesplatz) bei der Oper – ein kleines Denkmal im Herzen der Stadt.',
  place_hu = 'Piața Victoriei (Győzelem tér), az Opera mellett – egy kis emlékmű a város szívében.',
  place_sr = 'Трг победе (Piața Victoriei), поред Опере – мали споменик у срцу града.',
  character_de = 'Eine Rose, die Geige spielt – eine Hommage an die Musik und an die Künstler der Stadt.',
  character_hu = 'Egy rózsa, amely hegedül – tisztelgés a zene és a város művészei előtt.',
  character_sr = 'Ружа која свира виолину – почаст музици и уметницима града.'
where id = 'violinist-rose';

update flowers set
  name_de = 'Hopfenblüte',
  name_hu = 'Komlóvirág',
  name_sr = 'Цвет хмеља',
  place_de = 'Beim alten Brauereiviertel – ein Gruß an die Braugeschichte der Stadt.',
  place_hu = 'A régi sörfőzdék negyedének közelében – főhajtás a város sörfőzési múltja előtt.',
  place_sr = 'Близу старог кварта пивара – наклон историји пиварства у граду.',
  character_de = 'Eine Hopfenblüte, die an die Brauereien und das Alltagsleben erinnert, das sie ernährten.',
  character_hu = 'Egy komlóvirág, amely a sörfőzdékre és az általuk fenntartott mindennapi életre emlékeztet.',
  character_sr = 'Цвет хмеља који подсећа на пиваре и свакодневни живот који су оне одржавале.'
where id = 'hop-flower';
