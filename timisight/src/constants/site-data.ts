// Shared copy for the TimiSight mobile app (English and Romanian).

export type Lang = 'en' | 'ro';

export const T = {
  en: {
    appName: 'TimiSight',
    tabs: { home: 'Home', places: 'Garden', shop: 'Shop', board: 'Leaderboard', account: 'Account' },
    heroTitle: 'Bloom in Timișoara.',
    heroText:
      'Flowers are scattered all over the city. Tap one with your phone to collect it, learn the story of its place and earn badges.',
    cta: 'Open the garden',
    stamp: ['Timișoara', 'Bloom', '2026'] as [string, string, string],
    howTitle: 'Three steps to a full garden',
    how: [
      ['Find', 'Spot a flower somewhere in the city. Each one stands for a place, an event or a local business.'],
      ['Tap', 'Hold your phone to its NFC tag. The flower joins your garden and earns you points.'],
      ['Learn', 'Read its story, collect badges and spend your points on perks from local partners.'],
    ] as [string, string][],
    teamTitle: 'The team',
    teamText: 'Built at UniHack 2026.',
    back: 'Back',
    boardTitle: 'Leaderboard',
    boardText: 'Collect flowers to earn points and climb the ranking.',
    points: 'pts',
    shopTitle: 'Points shop',
    shopText: 'Spend the points you earn collecting flowers.',
    shopBalance: 'Your balance',
    shopRedeem: 'Redeem',
    shopSoldOut: 'Sold out',
    shopUnlimited: 'unlimited',
    shopLeft: 'left',
    shopNotEnough: 'Not enough points',
    shopActiveTitle: 'Active perks',
    shopActiveEmpty: 'No active perks yet. Redeem a pass below.',
    shopActivate: 'Activate',
    shopActive: 'Active',
    shopDeactivate: 'Deactivate',
    shopClaim: 'Claim',
    shopClaimed: 'claimed',
    accountTitle: 'Your account',
    accountText: 'Track your points and watch your garden grow.',
    accountBalance: 'Points balance',
    accountLifetime: 'Lifetime earned',
    accountRank: 'Leaderboard rank',
    accountLanguage: 'Language',
    loginTitle: 'Welcome to TimiSight',
    loginText: 'Log in to start collecting the flowers of Timișoara.',
    authLogin: 'Log in with Auth0',
    authSigningIn: 'Signing in…',
    authLogout: 'Log out',
    authLoading: 'Loading…',
    authSignedOutHint: 'Sign in to sync your account.',
    footer: 'Made in Timișoara for UniHack.',
  },
  ro: {
    appName: 'TimiSight',
    tabs: { home: 'Acasă', places: 'Grădina', shop: 'Magazin', board: 'Clasament', account: 'Cont' },
    heroTitle: 'Înflorește în Timișoara.',
    heroText:
      'Flori ascunse peste tot în oraș. Atinge una cu telefonul ca s-o colecționezi, să afli povestea locului ei și să câștigi insigne.',
    cta: 'Deschide grădina',
    stamp: ['Timișoara', 'Floare', '2026'] as [string, string, string],
    howTitle: 'Trei pași până la grădina completă',
    how: [
      ['Găsește', 'Descoperă o floare undeva în oraș. Fiecare reprezintă un loc, un eveniment sau o afacere locală.'],
      ['Atinge', 'Apropie telefonul de eticheta ei NFC. Floarea intră în grădina ta și îți aduce puncte.'],
      ['Învață', 'Citește povestea ei, strânge insigne și cheltuiește punctele pe beneficii de la parteneri locali.'],
    ] as [string, string][],
    teamTitle: 'Echipa',
    teamText: 'Creat la UniHack 2026.',
    back: 'Înapoi',
    boardTitle: 'Clasament',
    boardText: 'Colecționează flori ca să câștigi puncte și să urci în clasament.',
    points: 'pct',
    shopTitle: 'Magazin de puncte',
    shopText: 'Cheltuiește punctele câștigate colecționând flori.',
    shopBalance: 'Soldul tău',
    shopRedeem: 'Revendică',
    shopSoldOut: 'Epuizat',
    shopUnlimited: 'nelimitat',
    shopLeft: 'rămase',
    shopNotEnough: 'Puncte insuficiente',
    shopActiveTitle: 'Beneficii active',
    shopActiveEmpty: 'Niciun beneficiu activ încă. Revendică un abonament mai jos.',
    shopActivate: 'Activează',
    shopActive: 'Activ',
    shopDeactivate: 'Dezactivează',
    shopClaim: 'Revendică',
    shopClaimed: 'revendicate',
    accountTitle: 'Contul tău',
    accountText: 'Urmărește-ți punctele și vezi cum crește grădina ta.',
    accountBalance: 'Sold puncte',
    accountLifetime: 'Total câștigat',
    accountRank: 'Loc în clasament',
    accountLanguage: 'Limbă',
    loginTitle: 'Bun venit la TimiSight',
    loginText: 'Conectează-te ca să începi să colecționezi florile Timișoarei.',
    authLogin: 'Conectare cu Auth0',
    authSigningIn: 'Se conectează…',
    authLogout: 'Deconectare',
    authLoading: 'Se încarcă…',
    authSignedOutHint: 'Conectează-te pentru a-ți sincroniza contul.',
    footer: 'Făcut în Timișoara pentru UniHack.',
  },
} as const;

// Translations object for a single language. Using the union of both languages
// keeps `t` usable regardless of which language is active.
export type Tr = (typeof T)[Lang];

export const TEAM = [
  { name: 'Radu Daniel-George' },
  { name: 'Mâțu Dragoș-Gabriel' },
  { name: 'Micea Christian-Andrei' },
  { name: 'Orbulescu Andrei' },
];

export const LEADERBOARD: { name: string; points: number }[] = [
  { name: 'Ana M.', points: 1240 },
  { name: 'Radu P.', points: 1180 },
  { name: 'You', points: 1020 },
  { name: 'Ioana T.', points: 940 },
];

// The signed-in player (demo). A real build would read this from auth + the
// points ledger. `points` matches the "You" row in LEADERBOARD above.
export const ME = {
  name: 'You',
  points: 1020,
  lifetime: 1020,
};

// The signed-in player's current points balance (demo). Matches the "You" row
// above; a real build would read this from the points ledger.
export const MY_POINTS = ME.points;

// A perk is either:
//   'repeatable' — claimable on demand any number of times (e.g. a free coffee);
//                  each claim spends points but never locks the offer.
//   'active'     — a pass you hold in an active/not-active state (e.g. a museum or
//                  transport pass); redeeming it spends points once and marks it
//                  ACTIVE until you deactivate it.
export type OfferKind = 'repeatable' | 'active';

export type Offer = {
  id: string;
  partner: string;
  cost: number; // price in points
  stock: number | null; // null = unlimited
  kind: OfferKind;
  title: Record<Lang, string>;
};

// Demo shop catalogue, mirroring the web app's offers table.
export const OFFERS: Offer[] = [
  {
    id: 'coffee',
    partner: 'Partner café',
    cost: 120,
    stock: null,
    kind: 'repeatable',
    title: { en: 'Free coffee', ro: 'Cafea gratuită' },
  },
  {
    id: 'museum',
    partner: 'National Museum',
    cost: 400,
    stock: 25,
    kind: 'active',
    title: { en: 'Museum day pass', ro: 'Bilet muzeu pe o zi' },
  },
  {
    id: 'tram',
    partner: 'STPT',
    cost: 2000,
    stock: 0,
    kind: 'active',
    title: { en: 'Monthly tram pass', ro: 'Abonament tramvai lunar' },
  },
];
