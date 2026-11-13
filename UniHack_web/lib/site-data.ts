export const APP_URL = 'https://apps.apple.com/'
// All copy is placeholder: edit freely. Facts on place pages should be verified before demo day.
export const T = {
  en: {
    appName: 'TimeHunt',
    store: 'Download the app', getApp: 'Get the app',
    moreTitle: 'Want to experience more of Timișoara?',
    moreText: 'Download the app to check in at places, climb the leaderboard and see the city’s past in AR.',
    dlTitle: 'Ready to hunt through time?', dlText: 'Download the app and start your first check-in.', nav: ['How it works', 'Preview', 'Places', 'Team'],
    heroTitle: 'Walk Timișoara. See it as it was.',
    heroText: 'Visit real places in the city, check in to climb the leaderboard, and point your camera to see the past appear in AR.',
    cta: 'See the places', cta2: 'Meet the team',
    howTitle: 'Three steps through time',
    how: [['Explore', 'Find landmarks and social events on the city map.'], ['Check in', 'Visit a place, scan it, and your name moves up the leaderboard.'], ['See the past', 'Open the camera and watch older versions of the place appear in AR.']],
    prevTitle: 'A look inside the app', prevText: 'The app is in development. These screens show what we are building.',
    s1: 'City map', s2: 'Leaderboard', s3: 'AR view', arLabel: 'Scanning…', events: 'Events nearby',
    evs: ['Evening walk: Revolution trail', 'Student quiz at the Opera', 'Photo hunt in Piața Unirii'],
    placesTitle: 'Five places, five QR codes', placesText: 'Scan a code on site to open that place’s page. Two are live in this demo.',
    open: 'Open demo page', soon: 'Coming soon', teamTitle: 'The team', teamText: 'Built at UniHack, Museum track.',
    roles: ['Frontend', 'Backend', 'Backend', 'AR modelling'], footer: 'Made in Timișoara for UniHack.',
    back: 'Go to the main page', video: 'Video of the place', history: 'Then and now', drag: 'Drag to compare',
    then: 'Then', now: 'Now', checkin: 'Check in here', checked: 'Checked in. +100 points (demo).', videoNote: 'Add public/media/…mp4 to play the video.',
  },
  ro: {
    appName: 'TimeHunt',
    store: 'Descarcă aplicația', getApp: 'Descarcă',
    moreTitle: 'Vrei să descoperi mai mult din Timișoara?',
    moreText: 'Descarcă aplicația ca să faci check-in la locuri, să urci în clasament și să vezi trecutul orașului în AR.',
    dlTitle: 'Gata să vânezi prin timp?', dlText: 'Descarcă aplicația și fă primul tău check-in.',nav: ['Cum funcționează', 'Previzualizare', 'Locuri', 'Echipa'],
    heroTitle: 'Plimbă-te prin Timișoara. Vezi-o așa cum a fost.',
    heroText: 'Vizitează locuri reale din oraș, fă check-in ca să urci în clasament și îndreaptă camera spre trecut, în realitate augmentată.',
    cta: 'Vezi locurile', cta2: 'Cunoaște echipa',
    howTitle: 'Trei pași prin timp',
    how: [['Explorează', 'Găsește repere și evenimente sociale pe harta orașului.'], ['Fă check-in', 'Vizitează un loc, scanează-l și urci în clasament.'], ['Vezi trecutul', 'Deschide camera și privește cum apar versiuni mai vechi ale locului în AR.']],
    prevTitle: 'O privire în aplicație', prevText: 'Aplicația este în lucru. Ecranele de mai jos arată ce construim.',
    s1: 'Harta orașului', s2: 'Clasament', s3: 'Vizualizare AR', arLabel: 'Se scanează…', events: 'Evenimente în apropiere',
    evs: ['Plimbare de seară: traseul Revoluției', 'Quiz studențesc la Operă', 'Vânătoare de fotografii în Piața Unirii'],
    placesTitle: 'Cinci locuri, cinci coduri QR', placesText: 'Scanează un cod la fața locului ca să deschizi pagina acelui loc. Două sunt active în demo.',
    open: 'Deschide pagina demo', soon: 'În curând', teamTitle: 'Echipa', teamText: 'Creat la UniHack, secțiunea Muzeu.',
    roles: ['Frontend', 'Backend', 'Design', 'AR'], footer: 'Făcut în Timișoara pentru UniHack.',
    back: 'Mergi la pagina principală', video: 'Video cu locul', history: 'Atunci și acum', drag: 'Trage pentru a compara',
    then: 'Atunci', now: 'Acum', checkin: 'Fă check-in aici', checked: 'Check-in făcut. +100 puncte (demo).', videoNote: 'Adaugă public/media/…mp4 pentru a reda videoul.',
  },
}

export type Copy = { name: string; text?: string; era?: string }
export type Place = { id: string; live: boolean; year?: number; video?: string; thenImg?: string; nowImg?: string; en: Copy; ro: Copy }
export type Lang = 'en' | 'ro'
export type Tr = (typeof T)['en']

export const PLACES: Place[] = [
  { id: 'opera', live: true, year: 1989, video: '/media/opera.mp4', thenImg: '/media/opera-then.jpg', nowImg: '/media/opera-now.jpg',
    en: { name: 'Opera House, Victory Square', text: 'The steps of the Opera were a gathering point in December 1989, when Timișoara declared itself free of communism. Point your camera here in the app to see the square as it looked during those days.', era: 'December 1989' },
    ro: { name: 'Opera, Piața Victoriei', text: 'Treptele Operei au fost loc de adunare în decembrie 1989, când Timișoara s-a declarat liberă de comunism. În aplicație, îndreaptă camera aici ca să vezi piața așa cum arăta în acele zile.', era: 'Decembrie 1989' } },
  { id: 'unirii', live: true, year: 1900, video: '/media/unirii.mp4', thenImg: '/media/unirii-then.jpg', nowImg: '/media/unirii-now.jpg',
    en: { name: 'Union Square', text: 'A baroque square from the Habsburg era, framed by the Roman Catholic Dome and the Serbian Orthodox Cathedral. Scan it in the app to see earlier versions of the square.', era: 'Early 1900s' },
    ro: { name: 'Piața Unirii', text: 'O piață barocă din perioada habsburgică, înconjurată de Domul Romano-Catolic și de Catedrala Ortodoxă Sârbă. Scaneaz-o în aplicație ca să vezi versiuni mai vechi ale pieței.', era: 'Începutul secolului XX' } },
  { id: 'p3', live: false, en: { name: 'Liberty Square' }, ro: { name: 'Piața Libertății' } },
  { id: 'p4', live: false, en: { name: 'Metropolitan Cathedral' }, ro: { name: 'Catedrala Mitropolitană' } },
  { id: 'p5', live: false, en: { name: 'Bastion' }, ro: { name: 'Bastionul' } },
]

export const TEAM = [ // replace with real names
  { name: 'Radu Daniel-George' }, { name: 'Mâțu Dragoș-Gabriel' },
  { name: 'Micea Christian-Andrei' }, { name: 'Orbulescu Andrei' },
]
