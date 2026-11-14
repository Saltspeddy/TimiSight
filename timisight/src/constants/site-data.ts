// Shared content for TimiSight, ported from the uniprep website (lib/site-data.ts).
// Keep this in sync with the web app so both show the same copy and places.

export type Lang = 'en' | 'ro';

export const T = {
  en: {
    appName: 'TimiSight',
    tabs: { home: 'Home', places: 'Places', shop: 'Shop', board: 'Leaderboard', account: 'Account' },
    heroTitle: 'Walk Timișoara. See it as it was.',
    heroText:
      'Visit real places in the city, check in to climb the leaderboard, and point your camera to see the past appear in AR.',
    cta: 'See the places',
    howTitle: 'Three steps through time',
    how: [
      ['Explore', 'Find landmarks and social events on the city map.'],
      ['Check in', 'Visit a place, scan it, and your name moves up the leaderboard.'],
      ['See the past', 'Open the camera and watch older versions of the place appear in AR.'],
    ] as [string, string][],
    teamTitle: 'The team',
    teamText: 'Built at UniHack, Museum track.',
    roles: ['Frontend', 'Backend', 'AR', 'Design'],
    placesTitle: 'Five places, five QR codes',
    placesText: 'Scan a code on site to open that place’s page. Two are live in this demo.',
    open: 'Open',
    soon: 'Coming soon',
    back: 'Back',
    history: 'Then and now',
    then: 'Then',
    now: 'Now',
    drag: 'Drag to compare',
    checkin: 'Check in here',
    checked: 'Checked in. +100 points (demo).',
    boardTitle: 'Leaderboard',
    boardText: 'Check in at places to earn points and climb the ranking.',
    points: 'pts',
    shopTitle: 'Points shop',
    shopText: 'Spend the points you earn exploring the city.',
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
    accountText: 'Track your points and climb the leaderboard.',
    accountBalance: 'Points balance',
    accountLifetime: 'Lifetime earned',
    accountRank: 'Leaderboard rank',
    accountLanguage: 'Language',
    footer: 'Made in Timișoara for UniHack.',
  },
  ro: {
    appName: 'TimiSight',
    tabs: { home: 'Acasă', places: 'Locuri', shop: 'Magazin', board: 'Clasament', account: 'Cont' },
    heroTitle: 'Plimbă-te prin Timișoara. Vezi-o așa cum a fost.',
    heroText:
      'Vizitează locuri reale din oraș, fă check-in ca să urci în clasament și îndreaptă camera spre trecut, în realitate augmentată.',
    cta: 'Vezi locurile',
    howTitle: 'Trei pași prin timp',
    how: [
      ['Explorează', 'Găsește repere și evenimente sociale pe harta orașului.'],
      ['Fă check-in', 'Vizitează un loc, scanează-l și urci în clasament.'],
      ['Vezi trecutul', 'Deschide camera și privește cum apar versiuni mai vechi ale locului în AR.'],
    ] as [string, string][],
    teamTitle: 'Echipa',
    teamText: 'Creat la UniHack, secțiunea Muzeu.',
    roles: ['Frontend', 'Backend', 'AR', 'Design'],
    placesTitle: 'Cinci locuri, cinci coduri QR',
    placesText:
      'Scanează un cod la fața locului ca să deschizi pagina acelui loc. Două sunt active în demo.',
    open: 'Deschide',
    soon: 'În curând',
    back: 'Înapoi',
    history: 'Atunci și acum',
    then: 'Atunci',
    now: 'Acum',
    drag: 'Trage pentru a compara',
    checkin: 'Fă check-in aici',
    checked: 'Check-in făcut. +100 puncte (demo).',
    boardTitle: 'Clasament',
    boardText: 'Fă check-in la locuri ca să câștigi puncte și să urci în clasament.',
    points: 'pct',
    shopTitle: 'Magazin de puncte',
    shopText: 'Cheltuie punctele câștigate explorând orașul.',
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
    accountText: 'Urmărește-ți punctele și urcă în clasament.',
    accountBalance: 'Sold puncte',
    accountLifetime: 'Total câștigat',
    accountRank: 'Loc în clasament',
    accountLanguage: 'Limbă',
    footer: 'Făcut în Timișoara pentru UniHack.',
  },
} as const;

// Translations object for a single language. Using the union of both languages
// keeps `t` usable regardless of which language is active.
export type Tr = (typeof T)[Lang];

export type Copy = { name: string; text?: string; era?: string };
export type Place = {
  id: string;
  live: boolean;
  year?: number;
  thenImg?: string;
  nowImg?: string;
  en: Copy;
  ro: Copy;
};

export const PLACES: Place[] = [
  {
    id: 'opera',
    live: true,
    year: 1989,
    thenImg: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Timisoara_Opera.jpg/640px-Timisoara_Opera.jpg',
    nowImg: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Timisoara_Opera.jpg/640px-Timisoara_Opera.jpg',
    en: {
      name: 'Opera House, Victory Square',
      era: 'December 1989',
      text: 'The steps of the Opera were a gathering point in December 1989, when Timișoara declared itself free of communism. Point your camera here in the app to see the square as it looked during those days.',
    },
    ro: {
      name: 'Opera, Piața Victoriei',
      era: 'Decembrie 1989',
      text: 'Treptele Operei au fost loc de adunare în decembrie 1989, când Timișoara s-a declarat liberă de comunism. În aplicație, îndreaptă camera aici ca să vezi piața așa cum arăta în acele zile.',
    },
  },
  {
    id: 'unirii',
    live: true,
    year: 1900,
    thenImg: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/95/Piata_Unirii_Timisoara.jpg/640px-Piata_Unirii_Timisoara.jpg',
    nowImg: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/95/Piata_Unirii_Timisoara.jpg/640px-Piata_Unirii_Timisoara.jpg',
    en: {
      name: 'Union Square',
      era: 'Early 1900s',
      text: 'A baroque square from the Habsburg era, framed by the Roman Catholic Dome and the Serbian Orthodox Cathedral. Scan it in the app to see earlier versions of the square.',
    },
    ro: {
      name: 'Piața Unirii',
      era: 'Începutul secolului XX',
      text: 'O piață barocă din perioada habsburgică, înconjurată de Domul Romano-Catolic și de Catedrala Ortodoxă Sârbă. Scaneaz-o în aplicație ca să vezi versiuni mai vechi ale pieței.',
    },
  },
  { id: 'p3', live: false, en: { name: 'Liberty Square' }, ro: { name: 'Piața Libertății' } },
  { id: 'p4', live: false, en: { name: 'Metropolitan Cathedral' }, ro: { name: 'Catedrala Mitropolitană' } },
  { id: 'p5', live: false, en: { name: 'Bastion' }, ro: { name: 'Bastionul' } },
];

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
