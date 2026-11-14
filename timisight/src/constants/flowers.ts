import { FLOWER_ICONS } from '@/constants/flower-icons';
import { LANG_CODES, type Lang } from '@/constants/site-data';

type L = Record<Lang, string>;
export type Reward = { id: string; partner: string; cost: number; title: L };
export type Flower = {
  id: string;
  color: string;
  points: number;
  image?: number; // photo of the real statue, shown big on the flower's page
  icon?: number; // illustrated icon for tiles and the bouquet (see flower-icons.ts)
  name: L;
  latinName?: string;
  about: L; // the character / story behind the flower
  place: { name: L; text: L };
  rewards: Reward[];
};

// ✏️ EDIT HERE: placeholder rewards, partners and prices.
const REWARDS: Reward[] = [
  {
    id: 'coffee', partner: 'Partner café', cost: 120,
    title: { en: 'Free coffee', ro: 'Cafea gratuită', de: 'Gratis-Kaffee', hu: 'Ingyenes kávé', sr: 'Бесплатна кафа' },
  },
  {
    id: 'museum', partner: 'Partner museum', cost: 300,
    title: { en: 'Museum entry', ro: 'Intrare la muzeu', de: 'Museumseintritt', hu: 'Múzeumbelépő', sr: 'Улаз у музеј' },
  },
];

// Flower images stay bundled in the app, keyed by flower id, because React
// Native's require() needs a static path (it can't take a URL from the DB).
// Add an entry here when you add a new flower with artwork.
export const FLOWER_IMAGES: Record<string, number> = {
  'violinist-rose': require('../../assets/images/violinist-rose.png'),
};

// Shape of a row from the `flowers` table (see web/supabase/flowers.sql and
// web/supabase/flowers-languages.sql). English and Romanian columns come from the first
// file; German, Hungarian and Serbian columns are added by the second, so they are
// optional here: the app keeps working before that migration has been run.
export type FlowerRow = {
  id: string;
  name_en: string;
  name_ro: string;
  latin_name: string | null;
  place_en: string | null;
  place_ro: string | null;
  character_en: string | null;
  character_ro: string | null;
  color: string;
  points: number;
} & Partial<Record<`${'name' | 'place' | 'character'}_${Exclude<Lang, 'en' | 'ro'>}`, string | null>>;

const BLANK: L = { en: '', ro: '', de: '', hu: '', sr: '' };

/**
 * One text field in every language. A language whose column is empty (or missing) falls
 * back to English, so a Hungarian reader sees English, not a blank, until it is translated.
 */
function localized(r: FlowerRow, field: 'name' | 'place' | 'character'): L {
  const row = r as unknown as Record<string, string | null | undefined>;
  const english = row[`${field}_en`] ?? '';
  const out = { ...BLANK };
  for (const code of LANG_CODES) out[code] = row[`${field}_${code}`] || english;
  return out;
}

// Map a DB row into the Flower shape the UI already uses. `place.name` is not a
// column (the place description lives in place_*); we leave it blank so the
// existing layout still renders without an extra DB field.
export function rowToFlower(r: FlowerRow): Flower {
  return {
    id: r.id,
    color: r.color,
    points: r.points,
    image: FLOWER_IMAGES[r.id],
    icon: FLOWER_ICONS[r.id],
    name: localized(r, 'name'),
    latinName: r.latin_name ?? undefined,
    about: localized(r, 'character'),
    place: { name: BLANK, text: localized(r, 'place') },
    rewards: REWARDS,
  };
}

// ✏️ FALLBACK DATA: used when the database is unreachable or the flowers table
// is empty, so the app still works offline / before the table is seeded. The
// live content comes from the `flowers` table via useFlowers().
export const FLOWERS: Flower[] = [
  {
    id: 'violinist-rose',
    color: '#ff6a2b',
    points: 50,
    image: FLOWER_IMAGES['violinist-rose'],
    icon: FLOWER_ICONS['violinist-rose'],
    name: {
      en: 'Violinist Rose',
      ro: 'Trandafirul violonist',
      de: 'Violinistenrose',
      hu: 'Hegedűs rózsa',
      sr: 'Ружа виолиниста',
    },
    latinName: 'Rosa',
    about: {
      en: 'A rose that plays the violin, a small monument to music in the city.',
      ro: 'Un trandafir care cântă la vioară, un mic monument al muzicii în oraș.',
      de: 'Eine Rose, die Geige spielt, ein kleines Denkmal für die Musik in der Stadt.',
      hu: 'Egy rózsa, amely hegedül – a zene kis emlékműve a városban.',
      sr: 'Ружа која свира виолину, мали споменик музици у граду.',
    },
    place: {
      name: BLANK,
      text: {
        en: 'Victory Square, near the Opera — a small monument in the heart of the city.',
        ro: 'Piața Victoriei, lângă Operă — un mic monument în inima orașului.',
        de: 'Piața Victoriei (Siegesplatz) bei der Oper – ein kleines Denkmal im Herzen der Stadt.',
        hu: 'Piața Victoriei (Győzelem tér), az Opera mellett – egy kis emlékmű a város szívében.',
        sr: 'Трг победе (Piața Victoriei), поред Опере – мали споменик у срцу града.',
      },
    },
    rewards: REWARDS,
  },
  {
    id: 'hop-flower',
    color: '#9fd56b',
    points: 50,
    icon: FLOWER_ICONS['hop-flower'],
    name: {
      en: 'Hop Flower',
      ro: 'Floarea de hamei',
      de: 'Hopfenblüte',
      hu: 'Komlóvirág',
      sr: 'Цвет хмеља',
    },
    latinName: 'Humulus lupulus',
    about: {
      en: 'A hop flower, nodding to the city’s brewing story.',
      ro: 'O floare de hamei, un semn către istoria berii în oraș.',
      de: 'Eine Hopfenblüte, ein Gruß an die Braugeschichte der Stadt.',
      hu: 'Egy komlóvirág, amely a város sörfőzési történetére utal.',
      sr: 'Цвет хмеља, посвећен причи о пиварству у граду.',
    },
    place: {
      name: BLANK,
      text: {
        en: 'Near the old brewery quarter — a nod to the city’s brewing history.',
        ro: 'Lângă vechiul cartier al fabricii de bere — un semn către istoria berii în oraș.',
        de: 'Beim alten Brauereiviertel – ein Gruß an die Braugeschichte der Stadt.',
        hu: 'A régi sörfőzdék negyedének közelében – főhajtás a város sörfőzési múltja előtt.',
        sr: 'Близу старог кварта пивара – наклон историји пиварства у граду.',
      },
    },
    rewards: REWARDS,
  },
];
