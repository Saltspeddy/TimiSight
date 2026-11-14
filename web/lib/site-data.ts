export const APP_URL = 'https://apps.apple.com/'

export type Lang = 'en' | 'ro'
type L = Record<Lang, string>

// All copy is placeholder: edit freely. Facts on flower pages should be verified before demo day.
export const T = {
  en: {
    appName: 'TimiSight',
    store: 'Download the app', getApp: 'Get the app',
    nav: ['How it works', 'Preview', 'Flowers', 'Team'],
    heroTitle: 'Discover Timișoara, one flower at a time.',
    heroText: 'Small flower statues are hidden around the city. Tap one with your phone, add it to your garden, learn the story of the place and earn points for real rewards.',
    cta: 'Meet the flowers', cta2: 'Meet the team',
    stampTop: 'City of flowers', stampBottom: 'flowers to find',
    howTitle: 'How it works',
    how: [
      ['Find a flower', 'Look for a small 3D-printed flower statue next to a place with a story.'],
      ['Tap it', 'Hold your phone to the flower. Its NFC tag adds it to your garden.'],
      ['Learn the story', 'A short animated story tells you about the place the flower stands for.'],
      ['Earn rewards', 'Each new flower pays points. Spend them on rewards from partner businesses.'],
    ] as [string, string][],
    prevTitle: 'A look inside the app', prevText: 'The app is in development. These screens show what we are building.',
    s1: 'Flower page', s2: 'Your garden', s3: 'Leaderboard',
    checked: 'Checked in', total: 'Total', findIt: 'Find it in the city',
    flowersTitle: 'Three flowers, three spots',
    flowersText: 'Each flower stands for a place in Timișoara. Read its story here, or go find it and tap it.',
    open: 'Open flower page', photoSoon: 'Photo coming soon',
    dlTitle: 'Ready to start your garden?', dlText: 'Download the app and tap your first flower.',
    teamTitle: 'The team', teamText: 'Built at UniHack, Museum track.',
    footer: 'Made in Timișoara for UniHack.',
    back: 'Go to the main page',
    theFlower: 'The flower', thePlace: 'The place', pts: 'pts',
    scanHint: 'Tap this flower’s NFC tag with the app to add it to your garden and earn points.',
    ranking: 'See the leaderboard', moreFlowers: 'More flowers',
    moreTitle: 'Ready to pick this flower?',
    moreText: 'Download the app, find the statue and tap it to add it to your garden.',
    signIn: 'Sign in', profile: 'Profile',
  },
  ro: {
    appName: 'TimiSight',
    store: 'Descarcă aplicația', getApp: 'Descarcă',
    nav: ['Cum funcționează', 'Previzualizare', 'Flori', 'Echipa'],
    heroTitle: 'Descoperă Timișoara, o floare la un loc.',
    heroText: 'Mici statui de flori sunt ascunse prin oraș. Atinge una cu telefonul, adaugă-o în grădina ta, află povestea locului și câștigă puncte pentru recompense reale.',
    cta: 'Cunoaște florile', cta2: 'Cunoaște echipa',
    stampTop: 'Orașul florilor', stampBottom: 'flori de găsit',
    howTitle: 'Cum funcționează',
    how: [
      ['Găsește o floare', 'Caută o mică statuie de floare printată 3D, lângă un loc cu poveste.'],
      ['Atinge-o', 'Apropie telefonul de floare. Eticheta NFC o adaugă în grădina ta.'],
      ['Află povestea', 'O poveste animată scurtă îți spune despre locul pe care îl reprezintă floarea.'],
      ['Câștigă recompense', 'Fiecare floare nouă aduce puncte. Cheltuiește-le la afaceri partenere.'],
    ] as [string, string][],
    prevTitle: 'O privire în aplicație', prevText: 'Aplicația este în lucru. Ecranele de mai jos arată ce construim.',
    s1: 'Pagina florii', s2: 'Grădina ta', s3: 'Clasament',
    checked: 'Check-in făcut', total: 'Total', findIt: 'Găsește-o în oraș',
    flowersTitle: 'Trei flori, trei locuri',
    flowersText: 'Fiecare floare reprezintă un loc din Timișoara. Citește povestea aici sau pornește în căutarea ei și atinge-o.',
    open: 'Deschide pagina florii', photoSoon: 'Poza vine în curând',
    dlTitle: 'Gata să-ți începi grădina?', dlText: 'Descarcă aplicația și atinge prima ta floare.',
    teamTitle: 'Echipa', teamText: 'Creat la UniHack, secțiunea Muzeu.',
    footer: 'Făcut în Timișoara pentru UniHack.',
    back: 'Mergi la pagina principală',
    theFlower: 'Floarea', thePlace: 'Locul', pts: 'puncte',
    scanHint: 'Atinge eticheta NFC a acestei flori cu aplicația ca s-o adaugi în grădina ta și să câștigi puncte.',
    ranking: 'Vezi clasamentul', moreFlowers: 'Alte flori',
    moreTitle: 'Gata să culegi această floare?',
    moreText: 'Descarcă aplicația, găsește statuia și atinge-o ca s-o adaugi în grădina ta.',
    signIn: 'Autentificare', profile: 'Profil',
  },
}

export type Tr = (typeof T)['en']

export type Flower = {
  id: string
  color: string // hex accent: the mat behind the flower, the dots, the card
  points: number
  image?: string // path under /public. Drop a PNG in public/flowers/ and set it here.
  latinName?: string
  name: L
  spot: L // short place name for cards
  about: L // the character / story behind the flower
  place: L // the place the flower stands for
}

// The first two flowers match the `flowers` table seed (supabase/flowers.sql).
// Keep ids identical to the app, because NFC tags point at /f/<id>.
export const FLOWERS: Flower[] = [
  {
    id: 'violinist-rose',
    color: '#ff6a2b',
    points: 50,
    image: '/flowers/violinist-rose.png',
    latinName: 'Rosa',
    name: { en: 'Violinist Rose', ro: 'Trandafirul violonist' },
    spot: { en: 'Victory Square, by the Opera', ro: 'Piața Victoriei, lângă Operă' },
    about: {
      en: 'A rose that plays the violin, a tribute to music and to the city’s artists. The Opera House is a few steps away, and the rose keeps a small concert going for anyone who stops to look.',
      ro: 'Un trandafir care cântă la vioară, un omagiu adus muzicii și artiștilor orașului. Opera e la câțiva pași, iar trandafirul ține un mic concert pentru oricine se oprește să-l privească.',
    },
    place: {
      en: 'Victory Square, near the Opera: a small monument in the heart of the city. The square is the main meeting place of Timișoara and the place where the December 1989 revolution gathered.',
      ro: 'Piața Victoriei, lângă Operă: un mic monument în inima orașului. Piața este principalul loc de întâlnire al Timișoarei și locul în care s-a adunat revoluția din decembrie 1989.',
    },
  },
  {
    id: 'hop-flower',
    color: '#9fd56b',
    points: 50,
    latinName: 'Humulus lupulus',
    name: { en: 'Hop Flower', ro: 'Floarea de hamei' },
    spot: { en: 'Curtea Berarilor', ro: 'Curtea Berarilor' },
    about: {
      en: 'A hop flower for the people who brewed and drank in Timișoara. Hops give beer its bitterness and its smell, and the city’s brewers have counted on them for generations.',
      ro: 'O floare de hamei pentru cei care au făcut și au băut bere în Timișoara. Hameiul dă berii amăreala și mirosul, iar berarii orașului s-au bazat pe el de generații.',
    },
    place: {
      en: 'Curtea Berarilor, the Brewers’ Courtyard: a nod to the long brewing history of Timișoara, a city that has been making beer since the 18th century.',
      ro: 'Curtea Berarilor: un semn către istoria îndelungată a berii în Timișoara, un oraș care face bere încă din secolul al XVIII-lea.',
    },
  },
  {
    id: 'tram-flower',
    color: '#6cb4e4',
    points: 50,
    name: { en: 'Tram Flower', ro: 'Floarea din tramvai' },
    spot: { en: 'Near the Miclosi museum', ro: 'Lângă muzeul Miclosi' },
    about: {
      en: 'One flower pushes another along on a tram, a small story about helping a friend along the way. Trams have run in Timișoara since 1869, the first horse-drawn line in the country, and they are still how many locals get around.',
      ro: 'O floare împinge o altă floare într-un tramvai, o mică poveste despre ajutorul dat unui prieten pe drum. Tramvaiele circulă în Timișoara din 1869, prima linie trasă de cai din țară, și sunt și azi felul în care se mișcă mulți localnici.',
    },
    place: {
      en: 'Placed near the Miclosi museum, where the city’s history is kept indoors and the tram flowers keep it moving outside.',
      ro: 'Amplasată lângă muzeul Miclosi, unde istoria orașului stă la adăpost înăuntru, iar florile din tramvai o țin în mișcare afară.',
    },
  },
]

export const TEAM = [ // replace with real names
  { name: 'Radu Daniel-George' }, { name: 'Mâțu Dragoș-Gabriel' },
  { name: 'Micea Christian-Andrei' }, { name: 'Orbulescu Andrei' },
]
