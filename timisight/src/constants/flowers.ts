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
  // Real-world coordinates (from the `flowers` table; see web/supabase/flowers-geo.sql).
  // Optional: a flower without coordinates gets no hot/cold hint and no map pin.
  lat?: number;
  lng?: number;
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
  // TODO: replace with real artwork
  'casa-muhle': require('../../assets/images/violinist-rose.png'),
  // TODO: replace with real artwork
  'opera-rose': require('../../assets/images/violinist-rose.png'),
  // TODO: replace with real artwork
  'miklosi-tulip': require('../../assets/images/violinist-rose.png'),
  // TODO: replace with real artwork
  'timisoreana-malt': require('../../assets/images/violinist-rose.png'),
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
  lat: number | null;
  lng: number | null;
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
    lat: r.lat ?? undefined,
    lng: r.lng ?? undefined,
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
  {
    id: 'casa-muhle',
    color: '#e86a8e',
    points: 50,
    image: FLOWER_IMAGES['casa-muhle'],
    name: { en: 'Casa Mühle', ro: 'Casa Mühle' },
    latinName: 'Rosa × hybrida',
    // ⚠️ PLACEHOLDER coords — keep in sync with web/supabase/flowers-geo.sql.
    lat: 45.7558,
    lng: 21.229,
    about: {
      en: 'A garden rose from the house that taught Timișoara to grow roses — where every flower path begins.',
      ro: 'Un trandafir de grădină din casa care a învățat Timișoara să cultive trandafiri — de unde începe fiecare traseu floral.',
    },
    place: {
      name: { en: '', ro: '' },
      text: {
        en: 'Casa Mühle — the historic Mühle house and flower shop, the starting point of the city’s flower routes.',
        ro: 'Casa Mühle — casa și florăria istorică Mühle, punctul de pornire al traseelor florale ale orașului.',
      },
    },
    rewards: REWARDS,
  },
  {
    id: 'opera-rose',
    color: '#c0392b',
    points: 50,
    image: FLOWER_IMAGES['opera-rose'],
    name: { en: 'Opera Rose', ro: 'Trandafirul Operei' },
    latinName: 'Rosa',
    // ⚠️ PLACEHOLDER coords — keep in sync with web/supabase/flowers-geo.sql.
    lat: 45.7561,
    lng: 21.2275,
    about: {
      en: 'A rose for the Opera House, carrying the music of the stage into the city’s gardens.',
      ro: 'Un trandafir pentru Operă, care poartă muzica scenei în grădinile orașului.',
    },
    place: {
      name: { en: '', ro: '' },
      text: {
        en: 'The Opera House — Romanian National Opera Timișoara, in Victory Square.',
        ro: 'Opera — Opera Națională Română Timișoara, în Piața Victoriei.',
      },
    },
    rewards: REWARDS,
  },
  {
    id: 'miklosi-tulip',
    color: '#f1c40f',
    points: 50,
    image: FLOWER_IMAGES['miklosi-tulip'],
    name: { en: 'Miklósi Tulip', ro: 'Laleaua Miklósi' },
    latinName: 'Tulipa',
    // ⚠️ PLACEHOLDER coords — keep in sync with web/supabase/flowers-geo.sql.
    // Final (indoor) stop: hot/cold degrades to a "head inside" hint near here.
    lat: 45.7549,
    lng: 21.2281,
    about: {
      en: 'A tulip for Carol Miklósi, who set the city’s first trams rolling through the streets.',
      ro: 'O lalea pentru Carol Miklósi, cel care a pus primele tramvaie ale orașului în mișcare pe străzi.',
    },
    place: {
      name: { en: '', ro: '' },
      text: {
        en: 'Carol Miklósi Tram Museum — the city’s tram museum, honouring its public transport pioneer.',
        ro: 'Muzeul Tramvaielor Carol Miklósi — muzeul tramvaielor orașului, în cinstea pionierului transportului public.',
      },
    },
    rewards: REWARDS,
  },
  {
    id: 'timisoreana-malt',
    color: '#d4a017',
    points: 50,
    image: FLOWER_IMAGES['timisoreana-malt'],
    name: { en: 'Timișoreana Malt', ro: 'Malțul Timișoreana' },
    latinName: 'Hordeum vulgare',
    // ⚠️ PLACEHOLDER coords — keep in sync with web/supabase/flowers-geo.sql.
    lat: 45.7603,
    lng: 21.2338,
    about: {
      en: 'A barley malt flower from the Timișoreana brewery, where the city’s oldest brewing tradition still ferments.',
      ro: 'O floare de malț de orz de la fabrica Timișoreana, unde cea mai veche tradiție a berii din oraș încă fermentează.',
    },
    place: {
      name: { en: '', ro: '' },
      text: {
        en: 'The Timișoreana brewery — the oldest brewery in Romania, rooted in Timișoara since 1718.',
        ro: 'Fabrica Timișoreana — cea mai veche fabrică de bere din România, în Timișoara din 1718.',
      },
    },
    rewards: REWARDS,
  },
];
