import type { Lang } from '@/constants/site-data';

type L = Record<Lang, string>;
export type Reward = { id: string; partner: string; cost: number; title: L };
export type Flower = {
  id: string;
  color: string;
  points: number;
  image?: number;
  name: L;
  latinName?: string;
  about: L; // the character / story behind the flower
  place: { name: L; text: L };
  rewards: Reward[];
};

// ✏️ EDIT HERE: placeholder rewards, partners and prices.
const REWARDS: Reward[] = [
  { id: 'coffee', partner: 'Partner café', cost: 120, title: { en: 'Free coffee', ro: 'Cafea gratuită' } },
  { id: 'museum', partner: 'Partner museum', cost: 300, title: { en: 'Museum entry', ro: 'Intrare la muzeu' } },
];

// Flower images stay bundled in the app, keyed by flower id, because React
// Native's require() needs a static path (it can't take a URL from the DB).
// Add an entry here when you add a new flower with artwork.
export const FLOWER_IMAGES: Record<string, number> = {
  'violinist-rose': require('../../assets/images/violinist-rose.png'),
};

// Shape of a row from the `flowers` table (see web/supabase/flowers.sql).
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
};

// Map a DB row into the Flower shape the UI already uses. `place.name` is not a
// column (the place description lives in place_en/ro); we leave it blank so the
// existing layout still renders without an extra DB field.
export function rowToFlower(r: FlowerRow): Flower {
  return {
    id: r.id,
    color: r.color,
    points: r.points,
    image: FLOWER_IMAGES[r.id],
    name: { en: r.name_en, ro: r.name_ro },
    latinName: r.latin_name ?? undefined,
    about: { en: r.character_en ?? '', ro: r.character_ro ?? '' },
    place: {
      name: { en: '', ro: '' },
      text: { en: r.place_en ?? '', ro: r.place_ro ?? '' },
    },
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
    name: { en: 'Violinist Rose', ro: 'Trandafirul violonist' },
    latinName: 'Rosa',
    about: {
      en: 'A rose that plays the violin, a small monument to music in the city.',
      ro: 'Un trandafir care cântă la vioară, un mic monument al muzicii în oraș.',
    },
    place: {
      name: { en: '', ro: '' },
      text: {
        en: 'Victory Square, near the Opera — a small monument in the heart of the city.',
        ro: 'Piața Victoriei, lângă Operă — un mic monument în inima orașului.',
      },
    },
    rewards: REWARDS,
  },
  {
    id: 'hop-flower',
    color: '#9fd56b',
    points: 50,
    name: { en: 'Hop Flower', ro: 'Floarea de hamei' },
    latinName: 'Humulus lupulus',
    about: {
      en: 'A hop flower, nodding to the city’s brewing story.',
      ro: 'O floare de hamei, un semn către istoria berii în oraș.',
    },
    place: {
      name: { en: '', ro: '' },
      text: {
        en: 'Near the old brewery quarter — a nod to the city’s brewing history.',
        ro: 'Lângă vechiul cartier al fabricii de bere — un semn către istoria berii în oraș.',
      },
    },
    rewards: REWARDS,
  },
];
