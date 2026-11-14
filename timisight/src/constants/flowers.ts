import type { Lang } from '@/constants/site-data';

type L = Record<Lang, string>;
export type Reward = { id: string; partner: string; cost: number; title: L };
export type Flower = {
  id: string;
  color: string;
  points: number;
  image?: number;
  name: L;
  about: L;
  place: { name: L; text: L };
  rewards: Reward[];
};

// ✏️ EDIT HERE: placeholder rewards, partners and prices.
const REWARDS: Reward[] = [
  { id: 'coffee', partner: 'Partner café', cost: 120, title: { en: 'Free coffee', ro: 'Cafea gratuită' } },
  { id: 'museum', partner: 'Partner museum', cost: 300, title: { en: 'Museum entry', ro: 'Intrare la muzeu' } },
];

// ✏️ EDIT HERE: one entry per flower. Text in [brackets] is for you to fill in.
export const FLOWERS: Flower[] = [
  {
    id: 'violinist-rose',
    color: '#ff6a2b',
    points: 50,
    image: require('../../assets/images/violinist-rose.png'),
    name: { en: 'Violinist Rose', ro: 'Trandafirul violonist' },
    about: {
      en: 'A rose that plays the violin, a small monument to music in the city. [Add: sculptor, year, material.]',
      ro: 'Un trandafir care cântă la vioară, un mic monument al muzicii în oraș. [Adaugă: sculptor, an, material.]',
    },
    place: {
      name: { en: '[Location name]', ro: '[Numele locului]' },
      text: {
        en: '[Add: how this place connects to the flower and to the city’s story.]',
        ro: '[Adaugă: legătura dintre acest loc, floare și povestea orașului.]',
      },
    },
    rewards: REWARDS,
  },
  {
    id: 'hop-flower',
    color: '#9fd56b',
    points: 50,
    name: { en: 'Hop Flower', ro: 'Floarea de hamei' },
    about: {
      en: 'A hop flower, nodding to the city’s brewing story. [Add: sculptor, year, material.]',
      ro: 'O floare de hamei, un semn către istoria berii în oraș. [Adaugă: sculptor, an, material.]',
    },
    place: {
      name: { en: '[Location name]', ro: '[Numele locului]' },
      text: {
        en: '[Add: the brewery history and what hops meant for local work and daily life.]',
        ro: '[Adaugă: istoria fabricii de bere și ce a însemnat hameiul pentru localnici.]',
      },
    },
    rewards: REWARDS,
  },
];