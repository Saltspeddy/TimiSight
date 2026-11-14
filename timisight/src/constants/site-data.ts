// Shared copy for the TimiSight mobile app.
//
// Languages follow the communities that have shaped Timișoara for centuries: English for
// visitors, then Romanian, German, Hungarian and Serbian. Each language is listed by its
// own name so it is recognisable to the people who speak it. Serbian is written in
// Cyrillic, the script the Serbian community in Romania uses officially.
//
// To add a language: add it to LANGUAGES, then let TypeScript list every table that
// still needs it (T, OFFERS, badges, flowers, stories, and the small TXT tables).

export const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'ro', label: 'Română' },
  { code: 'de', label: 'Deutsch' },
  { code: 'hu', label: 'Magyar' },
  { code: 'sr', label: 'Српски' },
] as const;

export type Lang = (typeof LANGUAGES)[number]['code'];

/** All language codes, in display order. */
export const LANG_CODES: Lang[] = LANGUAGES.map((l) => l.code);

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
  // German. The city is "Temeswar" in German, as it has been for the Banat Swabians.
  de: {
    appName: 'TimiSight',
    tabs: { home: 'Start', places: 'Garten', shop: 'Shop', board: 'Rangliste', account: 'Konto' },
    heroTitle: 'Erblühe in Temeswar.',
    heroText:
      'Überall in der Stadt sind Blumen versteckt. Halte dein Handy an eine Blume, um sie zu sammeln, die Geschichte ihres Ortes zu erfahren und Abzeichen zu verdienen.',
    cta: 'Garten öffnen',
    stamp: ['Temeswar', 'Blüte', '2026'] as [string, string, string],
    howTitle: 'In drei Schritten zum vollen Garten',
    how: [
      ['Finden', 'Entdecke irgendwo in der Stadt eine Blume. Jede steht für einen Ort, ein Ereignis oder ein lokales Geschäft.'],
      ['Antippen', 'Halte dein Handy an ihren NFC-Tag. Die Blume kommt in deinen Garten und bringt dir Punkte.'],
      ['Erfahren', 'Lies ihre Geschichte, sammle Abzeichen und löse deine Punkte bei lokalen Partnern ein.'],
    ] as [string, string][],
    teamTitle: 'Das Team',
    teamText: 'Entstanden beim UniHack 2026.',
    back: 'Zurück',
    boardTitle: 'Rangliste',
    boardText: 'Sammle Blumen, verdiene Punkte und steige in der Rangliste auf.',
    points: 'Pkt.',
    shopTitle: 'Punkte-Shop',
    shopText: 'Gib die Punkte aus, die du beim Blumensammeln verdienst.',
    shopBalance: 'Dein Guthaben',
    shopRedeem: 'Einlösen',
    shopSoldOut: 'Ausverkauft',
    shopUnlimited: 'unbegrenzt',
    shopLeft: 'übrig',
    shopNotEnough: 'Nicht genug Punkte',
    shopActiveTitle: 'Aktive Vorteile',
    shopActiveEmpty: 'Noch keine aktiven Vorteile. Löse unten einen Pass ein.',
    shopActivate: 'Aktivieren',
    shopActive: 'Aktiv',
    shopDeactivate: 'Deaktivieren',
    shopClaim: 'Beanspruchen',
    shopClaimed: 'beansprucht',
    accountTitle: 'Dein Konto',
    accountText: 'Verfolge deine Punkte und sieh deinen Garten wachsen.',
    accountBalance: 'Punktestand',
    accountLifetime: 'Insgesamt verdient',
    accountRank: 'Platz in der Rangliste',
    accountLanguage: 'Sprache',
    loginTitle: 'Willkommen bei TimiSight',
    loginText: 'Melde dich an und sammle die Blumen von Temeswar.',
    authLogin: 'Mit Auth0 anmelden',
    authSigningIn: 'Anmeldung läuft …',
    authLogout: 'Abmelden',
    authLoading: 'Wird geladen …',
    authSignedOutHint: 'Melde dich an, um dein Konto zu synchronisieren.',
    footer: 'Gemacht in Temeswar für UniHack.',
  },
  // Hungarian. The city is "Temesvár" in Hungarian.
  hu: {
    appName: 'TimiSight',
    tabs: { home: 'Kezdőlap', places: 'Kert', shop: 'Bolt', board: 'Ranglista', account: 'Fiók' },
    heroTitle: 'Virágozz Temesváron.',
    heroText:
      'A városban mindenfelé virágok bújnak meg. Érintsd hozzá a telefonod, hogy összegyűjtsd, megismerd a helyének történetét, és jelvényeket szerezz.',
    cta: 'A kert megnyitása',
    stamp: ['Temesvár', 'Virág', '2026'] as [string, string, string],
    howTitle: 'Három lépés a teljes kertig',
    how: [
      ['Keresd meg', 'Fedezz fel egy virágot valahol a városban. Mindegyik egy helyet, eseményt vagy helyi vállalkozást képvisel.'],
      ['Érintsd meg', 'Tartsd a telefonod az NFC-címkéjéhez. A virág bekerül a kertedbe, és pontokat kapsz érte.'],
      ['Ismerd meg', 'Olvasd el a történetét, gyűjts jelvényeket, és váltsd be a pontjaidat helyi partnerek kedvezményeire.'],
    ] as [string, string][],
    teamTitle: 'A csapat',
    teamText: 'A UniHack 2026-on készült.',
    back: 'Vissza',
    boardTitle: 'Ranglista',
    boardText: 'Gyűjts virágokat, szerezz pontokat, és kapaszkodj följebb a ranglistán.',
    points: 'pont',
    shopTitle: 'Pontbolt',
    shopText: 'Költsd el a virággyűjtéssel szerzett pontjaidat.',
    shopBalance: 'Egyenleged',
    shopRedeem: 'Beváltás',
    shopSoldOut: 'Elfogyott',
    shopUnlimited: 'korlátlan',
    shopLeft: 'maradt',
    shopNotEnough: 'Nincs elég pontod',
    shopActiveTitle: 'Aktív kedvezmények',
    shopActiveEmpty: 'Még nincs aktív kedvezmény. Válts be egy bérletet lent.',
    shopActivate: 'Aktiválás',
    shopActive: 'Aktív',
    shopDeactivate: 'Deaktiválás',
    shopClaim: 'Igénylés',
    shopClaimed: 'igényelve',
    accountTitle: 'A fiókod',
    accountText: 'Kövesd a pontjaidat, és nézd, ahogy nő a kerted.',
    accountBalance: 'Pontegyenleg',
    accountLifetime: 'Összesen szerzett',
    accountRank: 'Helyezés a ranglistán',
    accountLanguage: 'Nyelv',
    loginTitle: 'Üdvözlünk a TimiSightban',
    loginText: 'Jelentkezz be, és kezdd el gyűjteni Temesvár virágait.',
    authLogin: 'Bejelentkezés Auth0-val',
    authSigningIn: 'Bejelentkezés…',
    authLogout: 'Kijelentkezés',
    authLoading: 'Betöltés…',
    authSignedOutHint: 'Jelentkezz be a fiókod szinkronizálásához.',
    footer: 'Temesváron készült a UniHack számára.',
  },
  // Serbian, in Cyrillic. The city is "Темишвар" in Serbian.
  sr: {
    appName: 'TimiSight',
    tabs: { home: 'Почетна', places: 'Врт', shop: 'Продавница', board: 'Ранг-листа', account: 'Налог' },
    heroTitle: 'Процвети у Темишвару.',
    heroText:
      'Цвеће је расуто по целом граду. Принеси телефон цвету да га сакупиш, сазнаш причу његовог места и освојиш значке.',
    cta: 'Отвори врт',
    stamp: ['Темишвар', 'Цвет', '2026'] as [string, string, string],
    howTitle: 'Три корака до пуног врта',
    how: [
      ['Пронађи', 'Угледај цвет негде у граду. Сваки представља место, догађај или локални бизнис.'],
      ['Додирни', 'Принеси телефон његовој NFC ознаци. Цвет улази у твој врт и доноси ти поене.'],
      ['Сазнај', 'Прочитај његову причу, сакупљај значке и потроши поене на погодности локалних партнера.'],
    ] as [string, string][],
    teamTitle: 'Тим',
    teamText: 'Направљено на UniHack 2026.',
    back: 'Назад',
    boardTitle: 'Ранг-листа',
    boardText: 'Сакупљај цвеће, зарађуј поене и пењи се на ранг-листи.',
    points: 'поена',
    shopTitle: 'Продавница поена',
    shopText: 'Потроши поене које зарадиш сакупљајући цвеће.',
    shopBalance: 'Твоје стање',
    shopRedeem: 'Искористи',
    shopSoldOut: 'Распродато',
    shopUnlimited: 'неограничено',
    shopLeft: 'преостало',
    shopNotEnough: 'Недовољно поена',
    shopActiveTitle: 'Активне погодности',
    shopActiveEmpty: 'Још нема активних погодности. Искористи пропусницу испод.',
    shopActivate: 'Активирај',
    shopActive: 'Активно',
    shopDeactivate: 'Деактивирај',
    shopClaim: 'Преузми',
    shopClaimed: 'преузето',
    accountTitle: 'Твој налог',
    accountText: 'Прати своје поене и гледај како твој врт расте.',
    accountBalance: 'Стање поена',
    accountLifetime: 'Укупно зарађено',
    accountRank: 'Место на ранг-листи',
    accountLanguage: 'Језик',
    loginTitle: 'Добродошли у TimiSight',
    loginText: 'Пријави се и почни да сакупљаш цвеће Темишвара.',
    authLogin: 'Пријава преко Auth0',
    authSigningIn: 'Пријављивање…',
    authLogout: 'Одјави се',
    authLoading: 'Учитавање…',
    authSignedOutHint: 'Пријави се да синхронизујеш налог.',
    footer: 'Направљено у Темишвару за UniHack.',
  },
} as const;

// Translations object for a single language. Using the union of all languages
// keeps `t` usable regardless of which language is active, and TypeScript requires
// every language to define every key.
export type Tr = (typeof T)[Lang];

// Compile-time guard, no runtime effect: fails the typecheck if any language is missing a
// key that English has, even a key no screen reads yet.
type TranslationKeys = keyof (typeof T)['en'];
export const _everyLanguageIsComplete: { [L in Lang]: Record<TranslationKeys, unknown> } = T;

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

// NOTE: points, balance AND the leaderboard are now DB-backed (see
// src/constants/collection.ts and src/hooks/use-leaderboard.ts). `LEADERBOARD` here is
// unused leftover demo data; `ME.name` is still used only as a display-name fallback on
// the account screen when the Auth0 profile has no name/email.

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
    title: {
      en: 'Free coffee',
      ro: 'Cafea gratuită',
      de: 'Gratis-Kaffee',
      hu: 'Ingyenes kávé',
      sr: 'Бесплатна кафа',
    },
  },
  {
    id: 'museum',
    partner: 'National Museum',
    cost: 400,
    stock: 25,
    kind: 'active',
    title: {
      en: 'Museum day pass',
      ro: 'Bilet muzeu pe o zi',
      de: 'Museums-Tagesticket',
      hu: 'Egynapos múzeumjegy',
      sr: 'Дневна музејска карта',
    },
  },
  {
    id: 'tram',
    partner: 'STPT',
    cost: 2000,
    stock: 0,
    kind: 'active',
    title: {
      en: 'Monthly tram pass',
      ro: 'Abonament tramvai lunar',
      de: 'Straßenbahn-Monatskarte',
      hu: 'Havi villamosbérlet',
      sr: 'Месечна карта за трамвај',
    },
  },
];
